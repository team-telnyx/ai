"""Core toolkit with tool execution engine."""

from __future__ import annotations

import json
import time
from typing import Any
from urllib.parse import quote

from telnyx_agent_toolkit.shared.api_client import TelnyxAPIClient
from telnyx_agent_toolkit.shared.compositions import execute_composition
from telnyx_agent_toolkit.shared.constants import TOOL_DEFINITIONS, ToolDefinition
from telnyx_agent_toolkit.shared.friction import FrictionReporter
from telnyx_agent_toolkit.shared.storage import STORAGE_TOOL_DEFINITIONS, StorageExecutor
from telnyx_agent_toolkit.shared.telemetry import TelemetryReporter

# Characters left literal inside a path segment: the RFC 3986 `pchar` set
# (unreserved + sub-delims + ":" / "@") plus "/" so S3-style object keys
# ("reports/2026/a.pdf") pass through. Only characters that would terminate or
# corrupt the path ("?", "#", "%", space, non-ASCII, controls) are
# percent-encoded. Mirrors encodePathParam in the TypeScript core.
_PATH_SAFE = "/:@!$&'()*+,;="


def _encode_path_param(value: Any) -> str:
    text = str(value)
    # HTTP clients normalize these even when the dots are encoded as %2E.
    # Refuse instead of signing a different object than the caller requested.
    if any(segment in (".", "..") for segment in text.split("/")):
        raise ValueError("Path parameters containing dot-only path segments ('.' or '..') are not supported")
    return quote(text, safe=_PATH_SAFE)

class ToolkitCore:
    """Core toolkit that maps tool names to API calls.

    Handles parameter normalization, path interpolation,
    and dispatching to the API client.
    """

    def __init__(
        self,
        client: TelnyxAPIClient,
        telemetry: TelemetryReporter | None = None,
        friction: FrictionReporter | None = None,
        storage: bool = False,
    ) -> None:
        self._client = client
        self._telemetry = telemetry or TelemetryReporter()
        self._friction = friction or FrictionReporter()
        self._storage = StorageExecutor(client.api_key) if storage else None

    @property
    def client(self) -> TelnyxAPIClient:
        return self._client

    async def run_tool_async(self, tool_name: str, arguments: dict[str, Any]) -> str:
        """Execute a tool by name with the given arguments. Returns JSON string."""
        if self._storage is not None and tool_name in STORAGE_TOOL_DEFINITIONS:
            try:
                return json.dumps(await self._storage.execute(tool_name, arguments))
            except Exception as exc:
                # S3 failures must not be reported as fictitious REST routes.
                return json.dumps({"error": str(exc)})
        tool_def = TOOL_DEFINITIONS.get(tool_name)
        if tool_def is None:
            return json.dumps({"error": f"Unknown tool: {tool_name}"})

        # Reject routing input before telemetry/friction as well as API dispatch.
        if tool_name == "verify_phone":
            channel = arguments.get("type", "sms")
            if not isinstance(channel, str) or channel not in ("sms", "call", "whatsapp"):
                return json.dumps({"error": "verify_phone type must be one of: sms, call, whatsapp"})

        start = time.monotonic()
        try:
            result = await self._execute_tool(tool_def, arguments)
            duration_ms = int((time.monotonic() - start) * 1000)
            self._report_telemetry(
                tool_name=tool_name,
                tool_def=tool_def,
                status="success",
                duration_ms=duration_ms,
                http_status=200,
            )
            return json.dumps(result, default=str)
        except Exception as e:
            duration_ms = int((time.monotonic() - start) * 1000)
            http_status = getattr(e, "status_code", 500)
            self._report_telemetry(
                tool_name=tool_name,
                tool_def=tool_def,
                status="error",
                duration_ms=duration_ms,
                http_status=http_status,
                error_message=str(e),
            )
            self._report_friction(
                tool_name=tool_name,
                tool_def=tool_def,
                http_status=http_status,
                error_message=str(e),
            )
            return json.dumps({"error": str(e)})

    def run_tool(self, tool_name: str, arguments: dict[str, Any]) -> str:
        """Sync wrapper for run_tool_async."""
        from telnyx_agent_toolkit.shared.api_client import _run_sync

        return _run_sync(self.run_tool_async(tool_name, arguments))

    async def _execute_tool(self, tool_def: ToolDefinition, args: dict[str, Any]) -> dict[str, Any]:
        """Execute a single tool definition against the API."""
        if execution := tool_def.get("execution"):
            async def read_tool(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
                dependency = TOOL_DEFINITIONS[name]
                if dependency["method"] != "GET" or dependency.get("execution"):
                    raise ValueError("Compositions require atomic GET dependencies")
                return await self._execute_tool(dependency, arguments)

            return await execute_composition(execution, args, read_tool)

        method = tool_def["method"]
        path = tool_def["path"]

        # Normalize from_ → from for API calls
        normalized: dict[str, Any] = {}
        for k, v in args.items():
            if v is None:
                continue
            key = "from" if k == "from_" else k
            normalized[key] = v

        # The legacy collection POST ignores body type and always sends SMS.
        # run_tool_async validated the original input; only omission defaults.
        if tool_def["name"] == "verify_phone":
            normalized["type"] = args.get("type", "sms")

        # Handle path interpolation (e.g. /number_lookup/{phone_number})
        if "{" in path:
            for key in list(normalized.keys()):
                placeholder = f"{{{key}}}"
                if placeholder in path:
                    path = path.replace(placeholder, _encode_path_param(normalized.pop(key)))

        if method == "GET":
            if tool_def.get("query_mode") == "flat":
                # Endpoint uses literal query keys (e.g. page, page_size, recordsPerPage).
                return await self._client.get_async(path, params=normalized or None)
            # Convert nested params to query params with filter[] syntax
            params: dict[str, Any] = {}
            for k, v in normalized.items():
                if k.startswith("filter_"):
                    # filter_country_code → filter[country_code]
                    filter_key = f"filter[{k[7:]}]"
                    params[filter_key] = v
                elif k.startswith("page_"):
                    params[f"page[{k[5:]}]"] = v
                elif isinstance(v, list):
                    params[f"filter[{k}][]"] = v
                else:
                    params[k] = v
            return await self._client.get_async(path, params=params if params else None)
        elif method == "POST":
            return await self._client.post_async(path, json=normalized)
        elif method == "PATCH":
            return await self._client.patch_async(path, json=normalized)
        elif method == "DELETE":
            return await self._client.delete_async(path)
        else:
            return {"error": f"Unsupported HTTP method: {method}"}

    def _report_telemetry(
        self,
        *,
        tool_name: str,
        tool_def: ToolDefinition,
        status: str,
        duration_ms: int,
        http_status: int,
        error_message: str | None = None,
    ) -> None:
        """Fire telemetry if reporter is enabled. Never raises."""
        try:
            self._telemetry.report(
                tool=tool_name,
                status=status,
                duration_ms=duration_ms,
                http_status=http_status,
                http_method=tool_def["method"],
                api_path=tool_def["path"],
                error_message=error_message,
            )
        except Exception:
            pass

    def _report_friction(
        self,
        *,
        tool_name: str,
        tool_def: ToolDefinition,
        http_status: int,
        error_message: str,
    ) -> None:
        """Fire friction report on API errors. Never raises."""
        try:
            self._friction.report(
                tool=tool_name,
                http_status=http_status,
                http_method=tool_def["method"],
                api_path=tool_def["path"],
                error_message=error_message,
                api_key=self._client.api_key,
            )
        except Exception:
            pass
