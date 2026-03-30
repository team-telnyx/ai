"""Core toolkit with tool execution engine."""

from __future__ import annotations

import json
import time
from typing import Any

from telnyx_agent_toolkit.shared.api_client import TelnyxAPIClient
from telnyx_agent_toolkit.shared.constants import TOOL_DEFINITIONS, ToolDefinition
from telnyx_agent_toolkit.shared.friction import FrictionReporter
from telnyx_agent_toolkit.shared.telemetry import TelemetryReporter


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
    ) -> None:
        self._client = client
        self._telemetry = telemetry or TelemetryReporter()
        self._friction = friction or FrictionReporter()

    @property
    def client(self) -> TelnyxAPIClient:
        return self._client

    async def run_tool_async(self, tool_name: str, arguments: dict[str, Any]) -> str:
        """Execute a tool by name with the given arguments. Returns JSON string."""
        tool_def = TOOL_DEFINITIONS.get(tool_name)
        if tool_def is None:
            return json.dumps({"error": f"Unknown tool: {tool_name}"})

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
        method = tool_def["method"]
        path = tool_def["path"]

        # Normalize from_ → from for API calls
        normalized = {}
        for k, v in args.items():
            if v is None:
                continue
            key = "from" if k == "from_" else k
            normalized[key] = v

        # Handle path interpolation (e.g. /number_lookup/{phone_number})
        if "{" in path:
            for key in list(normalized.keys()):
                placeholder = f"{{{key}}}"
                if placeholder in path:
                    path = path.replace(placeholder, str(normalized.pop(key)))

        if method == "GET":
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
