#!/usr/bin/env python3
"""Metadata-only audit for the deployed Telnyx AI MCP connector."""

from __future__ import annotations

import argparse
import http.server
import json
import math
import os
import sys
import threading
import time
import urllib.error
import urllib.request
from collections.abc import Iterator
from pathlib import Path
from typing import Any, Callable
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent.parent
CONTRACT_PATH = ROOT / "submission" / "telnyx-developer-kit" / "connector-contract.json"
DEFAULT_URL = "https://api.telnyx.com/v2/ai/mcp"
EXPECTED_ISSUERS = {
    DEFAULT_URL: "https://api.telnyx.com",
    "https://apidev.telnyx.com/v2/ai/mcp": "https://apidev.telnyx.com",
}
MAX_RESPONSE_BYTES = 1024 * 1024
MAX_TOOL_LIST_PAGES = 100
JSON_SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema"
CLIENT_INFO = {
    "name": "telnyx-codex-release-audit",
    "version": "1",
}


def protocol_meta(protocol_version: str) -> dict[str, Any]:
    return {
        "io.modelcontextprotocol/protocolVersion": protocol_version,
        "io.modelcontextprotocol/clientInfo": CLIENT_INFO,
        "io.modelcontextprotocol/clientCapabilities": {},
    }


LEGACY_INITIALIZE_PARAMS = {
    "capabilities": {},
    "clientInfo": CLIENT_INFO,
}


class AuditError(RuntimeError):
    pass


class NoAuthenticatedRedirects(urllib.request.HTTPRedirectHandler):
    """Never forward an OAuth token through an HTTP redirect."""

    def redirect_request(
        self,
        req: urllib.request.Request,
        fp: Any,
        code: int,
        msg: str,
        headers: Any,
        newurl: str,
    ) -> None:
        return None


AUTHENTICATED_OPENER = urllib.request.build_opener(NoAuthenticatedRedirects)


def read_limited(response: Any) -> bytes:
    payload = response.read(MAX_RESPONSE_BYTES + 1)
    if len(payload) > MAX_RESPONSE_BYTES:
        raise AuditError(f"response exceeded {MAX_RESPONSE_BYTES} bytes")
    return payload


def strict_json(text: str) -> Any:
    """Reject ambiguous objects and non-finite values throughout remote JSON."""
    def unique(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key, value in pairs:
            if key in result:
                raise AuditError("JSON contains duplicate object keys")
            result[key] = value
        return result

    def reject_constant(value: str) -> Any:
        raise AuditError("JSON contains a non-finite numeric constant")

    def finite_float(value: str) -> float:
        number = float(value)
        if not math.isfinite(number):
            raise AuditError("JSON number exceeds finite numeric range")
        return number

    try:
        return json.loads(text, object_pairs_hook=unique, parse_constant=reject_constant,
                          parse_float=finite_float)
    except (ValueError, RecursionError) as error:
        raise AuditError("response is not valid bounded JSON") from error


def parse_body(content_type: str, payload: bytes) -> dict[str, Any]:
    try:
        text = payload.decode("utf-8")
    except UnicodeDecodeError as error:
        raise AuditError("response is not valid UTF-8") from error
    if "text/event-stream" in content_type.lower():
        data = [line[5:].strip() for line in text.splitlines() if line.startswith("data:")]
        if len(data) != 1:
            raise AuditError(f"expected one SSE data event, received {len(data)}")
        text = data[0]
    body = strict_json(text)
    if not isinstance(body, dict):
        raise AuditError("JSON-RPC response must be an object")
    return body


def iter_sse_data(
    response: Any,
    max_event_bytes: int = MAX_RESPONSE_BYTES,
    deadline: float | None = None,
    clock: Callable[[], float] = time.monotonic,
) -> Iterator[str]:
    data_lines: list[str] = []
    event_size = 0
    while True:
        if deadline is not None:
            remaining = deadline - clock()
            if remaining <= 0:
                raise AuditError("SSE response exceeded its wall-clock deadline")
            set_response_read_timeout(response, remaining)
        raw_line = response.readline(max_event_bytes + 1)
        if deadline is not None and clock() >= deadline:
            raise AuditError("SSE response exceeded its wall-clock deadline")
        if not raw_line:
            break
        if len(raw_line) > max_event_bytes:
            raise AuditError(f"SSE line exceeded {max_event_bytes} bytes")
        try:
            line = raw_line.decode("utf-8").rstrip("\r\n")
        except UnicodeDecodeError as error:
            raise AuditError("SSE response is not valid UTF-8") from error
        if not line:
            if data_lines:
                yield "\n".join(data_lines)
                data_lines = []
                event_size = 0
            continue
        if line.startswith(":"):
            continue
        field, separator, value = line.partition(":")
        if field != "data":
            continue
        if separator and value.startswith(" "):
            value = value[1:]
        event_size += len(value.encode("utf-8")) + (1 if data_lines else 0)
        if event_size > max_event_bytes:
            raise AuditError(f"SSE event exceeded {max_event_bytes} bytes")
        data_lines.append(value)
    if data_lines:
        yield "\n".join(data_lines)


def set_response_read_timeout(response: Any, timeout: float) -> None:
    test_setter = getattr(response, "set_audit_read_timeout", None)
    if callable(test_setter):
        test_setter(timeout)
        return
    try:
        settimeout = response.fp.raw._sock.settimeout
    except AttributeError as error:
        raise AuditError("cannot enforce the SSE wall-clock deadline") from error
    settimeout(max(timeout, 0.001))


def read_rpc_response(
    response: Any, expected_id: int, timeout_seconds: float = 30
) -> dict[str, Any]:
    content_type = response.headers.get("Content-Type", "")
    if "text/event-stream" not in content_type.lower():
        body = parse_body(content_type, read_limited(response))
        validate_rpc_response(body, expected_id)
        return body

    deadline = time.monotonic() + timeout_seconds
    for data in iter_sse_data(response, deadline=deadline):
        body = strict_json(data)
        if not isinstance(body, dict):
            raise AuditError("SSE JSON-RPC response must be an object")
        # Notifications may precede the response, but cannot masquerade as one.
        if "method" in body and "id" not in body:
            require(
                body.get("jsonrpc") == "2.0"
                and isinstance(body["method"], str) and bool(body["method"])
                and "result" not in body and "error" not in body,
                "invalid JSON-RPC notification",
            )
            continue
        validate_rpc_response(body, expected_id)
        return body
    raise AuditError(f"SSE stream ended before JSON-RPC id {expected_id}")


def validate_rpc_response(body: dict[str, Any], expected_id: int) -> None:
    require(body.get("jsonrpc") == "2.0", "expected JSON-RPC version 2.0")
    require(type(body.get("id")) is int and body["id"] == expected_id,
            f"expected JSON-RPC integer id {expected_id}")
    require("method" not in body and (("result" in body) != ("error" in body)),
            "expected exactly one JSON-RPC result or error")
    if "error" in body:
        error = body["error"]
        require(isinstance(error, dict) and type(error.get("code")) is int
                and isinstance(error.get("message"), str),
                "invalid JSON-RPC error object")


def open_authenticated(request: urllib.request.Request, timeout: int) -> Any:
    try:
        return AUTHENTICATED_OPENER.open(request, timeout=timeout)
    except urllib.error.HTTPError as error:
        if error.code in {301, 302, 303, 307, 308}:
            raise AuditError(
                f"authenticated request refused HTTP redirect {error.code}"
            ) from error
        raise


def error_detail(error: urllib.error.HTTPError) -> str:
    return error.read(501).decode("utf-8", errors="replace")[:500]


def metadata_url(connector_url: str) -> str:
    parsed = urlsplit(connector_url)
    return f"{parsed.scheme}://{parsed.netloc}/.well-known/oauth-protected-resource{parsed.path}"


def fetch_json(url: str) -> tuple[int, dict[str, str], dict[str, Any]]:
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        response = urllib.request.urlopen(request, timeout=15)
    except urllib.error.HTTPError as error:
        return error.code, dict(error.headers.items()), parse_body(
            error.headers.get("Content-Type", ""), read_limited(error)
        )
    with response:
        return response.status, dict(response.headers.items()), parse_body(
            response.headers.get("Content-Type", ""), read_limited(response)
        )


def rpc(
    url: str,
    payload: dict[str, Any],
    token: str,
    protocol_version: str,
    session: str | None = None,
) -> tuple[dict[str, Any], str | None]:
    method = payload.get("method")
    require(isinstance(method, str), "JSON-RPC audit requests require a method")
    headers = {
        "Accept": "application/json, text/event-stream",
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    modern = protocol_version.startswith("2026-")
    if modern or method != "initialize":
        headers["MCP-Protocol-Version"] = protocol_version
    if modern:
        headers["MCP-Method"] = method
    if session:
        headers["Mcp-Session-Id"] = session
    request = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers, method="POST")
    try:
        response = open_authenticated(request, timeout=30)
    except urllib.error.HTTPError as error:
        detail = error_detail(error)
        raise AuditError(f"JSON-RPC request returned HTTP {error.code}: {detail}") from error
    with response:
        request_id = payload.get("id")
        require(isinstance(request_id, int), "JSON-RPC audit requests require an integer id")
        body = read_rpc_response(response, request_id)
        response_session = response.headers.get("Mcp-Session-Id")
        require(
            not (session and response_session and response_session != session),
            "server changed the MCP session during the audit",
        )
        return body, response_session or session


def notify_initialized(
    url: str,
    token: str,
    protocol_version: str,
    session: str | None,
) -> None:
    headers = {
        "Accept": "application/json, text/event-stream",
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "MCP-Protocol-Version": protocol_version,
    }
    if session:
        headers["Mcp-Session-Id"] = session
    request = urllib.request.Request(
        url,
        data=json.dumps(
            {
                "jsonrpc": "2.0",
                "method": "notifications/initialized",
                "params": {},
            }
        ).encode(),
        headers=headers,
        method="POST",
    )
    try:
        response = open_authenticated(request, timeout=30)
    except urllib.error.HTTPError as error:
        detail = error_detail(error)
        raise AuditError(
            f"initialized notification returned HTTP {error.code}: {detail}"
        ) from error
    with response:
        require(
            response.status in {202, 204},
            f"initialized notification returned HTTP {response.status}",
        )


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AuditError(message)


def canonical_validation_schema(value: Any) -> Any:
    """Remove only non-behavioral JSON Schema serializer differences."""
    if isinstance(value, list):
        return [canonical_validation_schema(item) for item in value]
    if not isinstance(value, dict):
        return value
    normalized = {
        key: canonical_validation_schema(item)
        for key, item in value.items()
        if key not in {"$schema", "description"}
    }
    const_type = {
        bool: "boolean",
        int: "integer",
        float: "number",
        str: "string",
    }.get(type(normalized.get("const")))
    if const_type and normalized.get("type") == const_type:
        normalized.pop("type")
    if normalized.get("required") == []:
        normalized.pop("required")
    return normalized


def validate_schema_dialects(value: Any, tool_name: str) -> None:
    if isinstance(value, list):
        for item in value:
            validate_schema_dialects(item, tool_name)
        return
    if not isinstance(value, dict):
        return
    dialect = value.get("$schema")
    require(
        dialect in {None, JSON_SCHEMA_DIALECT},
        f"unsupported JSON Schema dialect for {tool_name}: {dialect}",
    )
    for item in value.values():
        validate_schema_dialects(item, tool_name)


def validate_tool_catalog(received: Any, contract: dict[str, Any]) -> None:
    require(isinstance(received, list), "tools/list result must contain a tool array")
    require(all(isinstance(tool, dict) for tool in received), "every tool must be an object")
    names = [tool.get("name") for tool in received]
    require(all(isinstance(name, str) for name in names), "every tool must have a string name")
    require(len(set(names)) == len(names), "tools/list contains duplicate tool names")

    expected = {tool["name"]: tool for tool in contract["tools"]}
    by_name = {tool["name"]: tool for tool in received}
    require(set(by_name) == set(expected), f"tool set drifted: {sorted(by_name)}")
    input_schemas = {
        tool["name"]: tool["inputSchema"]
        for tool in contract["tools"]
        if "inputSchema" in tool
    }
    endpoint_schemas = {
        endpoint["executionTool"]: endpoint["inputSchema"]
        for endpoint in contract["endpoints"]
    }
    require(
        not (set(input_schemas) & set(endpoint_schemas)),
        "contract defines more than one input schema for a tool",
    )
    input_schemas.update(endpoint_schemas)
    require(
        set(input_schemas) == set(expected),
        "contract must pin exactly one input schema for every tool",
    )
    for name, contract_tool in expected.items():
        # Public catalog data still sits behind the same OAuth POST boundary.
        # Check both the canonical field and OpenAI's compatibility mirror.
        security = [{"type": "oauth2", "scopes": ["admin"]}]
        require(by_name[name].get("securitySchemes") == security,
                f"OAuth security schemes drifted for {name}")
        meta = by_name[name].get("_meta")
        require(isinstance(meta, dict) and meta.get("securitySchemes") == security,
                f"OAuth security scheme mirror drifted for {name}")
        require(by_name[name].get("title") == contract_tool["title"], f"title drifted for {name}")
        require(
            by_name[name].get("annotations") == contract_tool["annotations"],
            f"annotations drifted for {name}",
        )
        schema = by_name[name].get("inputSchema")
        require(isinstance(schema, dict), f"{name} has no input schema")
        validate_schema_dialects(schema, name)
        require(
            canonical_validation_schema(schema)
            == canonical_validation_schema(input_schemas[name]),
            f"input schema drifted for {name}",
        )


def list_all_tools(
    url: str,
    token: str,
    protocol_version: str,
    session: str | None,
    first_request_id: int,
) -> list[dict[str, Any]]:
    received: list[dict[str, Any]] = []
    cursor: str | None = None
    seen_cursors: set[str] = set()
    modern = protocol_version.startswith("2026-")

    for page_index in range(MAX_TOOL_LIST_PAGES):
        params: dict[str, Any] = (
            {"_meta": protocol_meta(protocol_version)} if modern else {}
        )
        if cursor is not None:
            params["cursor"] = cursor
        request_id = first_request_id + page_index
        response, session = rpc(
            url,
            {
                "jsonrpc": "2.0",
                "id": request_id,
                "method": "tools/list",
                "params": params,
            },
            token,
            protocol_version,
            session,
        )
        require(
            response.get("id") == request_id and isinstance(response.get("result"), dict),
            "tools/list failed",
        )
        result = response["result"]
        page = result.get("tools")
        require(isinstance(page, list), "tools/list result must contain a tool array")
        received.extend(page)

        next_cursor = result.get("nextCursor")
        if next_cursor is None:
            return received
        require(
            isinstance(next_cursor, str) and bool(next_cursor),
            "tools/list nextCursor must be a non-empty string",
        )
        require(
            next_cursor not in seen_cursors,
            f"tools/list repeated cursor {next_cursor!r}",
        )
        seen_cursors.add(next_cursor)
        cursor = next_cursor

    raise AuditError(f"tools/list exceeded {MAX_TOOL_LIST_PAGES} pages")


def audit_protocol_version(
    url: str,
    token: str,
    contract: dict[str, Any],
    protocol_version: str,
    request_id_base: int,
) -> None:
    session: str | None = None
    modern = protocol_version.startswith("2026-")
    if modern:
        handshake_method = "server/discover"
        handshake_params: dict[str, Any] = {"_meta": protocol_meta(protocol_version)}
    else:
        handshake_method = "initialize"
        handshake_params = {
            **LEGACY_INITIALIZE_PARAMS,
            "protocolVersion": protocol_version,
        }

    handshake, session = rpc(
        url,
        {
            "jsonrpc": "2.0",
            "id": request_id_base,
            "method": handshake_method,
            "params": handshake_params,
        },
        token,
        protocol_version,
    )
    require(
        handshake.get("id") == request_id_base
        and isinstance(handshake.get("result"), dict),
        f"{handshake_method} failed for {protocol_version}",
    )
    result = handshake["result"]
    capabilities = result.get("capabilities")
    require(isinstance(capabilities, dict), "server capabilities must be an object")
    # This isolated server has no resources or resource templates. Reject the
    # capability itself, even an empty/false/null value, in both protocol eras.
    require("resources" not in capabilities,
            "isolated connector must not advertise resource capabilities")
    if modern:
        expected_modern = [
            version
            for version in contract["protocolVersions"]
            if version.startswith("2026-")
        ]
        require(
            result.get("supportedVersions") == expected_modern,
            f"modern protocol versions drifted for {protocol_version}",
        )
        server_version = (
            result.get("_meta", {})
            .get("io.modelcontextprotocol/serverInfo", {})
            .get("version")
        )
    else:
        require(
            result.get("protocolVersion") == protocol_version,
            f"legacy protocol negotiation drifted for {protocol_version}",
        )
        server_version = result.get("serverInfo", {}).get("version")
    require(
        server_version == contract["version"],
        f"deployed connector version drifted for {protocol_version}",
    )
    if not modern:
        notify_initialized(url, token, protocol_version, session)

    received = list_all_tools(
        url,
        token,
        protocol_version,
        session,
        request_id_base + 1,
    )
    validate_tool_catalog(received, contract)


def run_audit(url: str, token: str) -> None:
    expected_issuer = EXPECTED_ISSUERS.get(url)
    require(expected_issuer is not None, "audit URL must be an approved Telnyx connector")
    contract = json.loads(CONTRACT_PATH.read_text())
    protocol_versions = contract.get("protocolVersions")
    require(
        isinstance(protocol_versions, list)
        and bool(protocol_versions)
        and all(isinstance(version, str) and version for version in protocol_versions),
        "contract protocolVersions must be a non-empty string array",
    )

    status, _, metadata = fetch_json(metadata_url(url))
    require(status == 200, f"protected-resource metadata returned HTTP {status}")
    require(metadata.get("resource") == url, "OAuth resource metadata does not bind the exact connector URL")
    require(metadata.get("scopes_supported") == ["admin"], "OAuth metadata scopes changed")
    servers = metadata.get("authorization_servers")
    require(servers == [expected_issuer], "OAuth authorization server must match the connector environment")

    for index, protocol_version in enumerate(protocol_versions):
        audit_protocol_version(
            url,
            token,
            contract,
            protocol_version,
            (index + 1) * 1_000,
        )
    print(
        "Hosted five-tool OAuth metadata audit: OK "
        f"({len(protocol_versions)} protocol versions; no tools were called)"
    )


def self_test() -> None:
    assert metadata_url(DEFAULT_URL) == "https://api.telnyx.com/.well-known/oauth-protected-resource/v2/ai/mcp"
    assert parse_body("application/json", b'{"jsonrpc":"2.0","id":1,"result":{}}')["id"] == 1

    class StreamingResponse:
        headers = {"Content-Type": "text/event-stream"}
        lines = iter([
            b': keepalive\n',
            b'data: {"jsonrpc":"2.0","method":"notifications/progress"}\n',
            b'\n',
            b'data: {"jsonrpc":"2.0","id":2,\n',
            b'data: "result":{}}\n',
            b'\n',
        ])

        def readline(self, _: int) -> bytes:
            try:
                return next(self.lines)
            except StopIteration as error:
                raise AssertionError(
                    "reader must stop at the matching response without waiting for EOF"
                ) from error

        def set_audit_read_timeout(self, _: float) -> None:
            return

    assert read_rpc_response(StreamingResponse(), 2)["id"] == 2

    class OversizedMultilineEvent:
        lines = iter([b"data:\n"] * 12 + [b"\n"])

        def readline(self, _: int) -> bytes:
            return next(self.lines, b"")

    try:
        next(iter_sse_data(OversizedMultilineEvent(), max_event_bytes=10))
    except AuditError as error:
        assert str(error) == "SSE event exceeded 10 bytes"
    else:
        raise AssertionError("joined SSE data-line separators must count toward the size limit")

    class NeverCompletesEvent:
        lines = iter([b"data: {}\n"])
        timeouts: list[float] = []

        def readline(self, _: int) -> bytes:
            return next(self.lines, b"")

        def set_audit_read_timeout(self, timeout: float) -> None:
            self.timeouts.append(timeout)

    ticks = iter([0.0, 5.0, 11.0])
    incomplete = NeverCompletesEvent()
    try:
        next(iter_sse_data(incomplete, deadline=10.0, clock=lambda: next(ticks)))
    except AuditError as error:
        assert str(error) == "SSE response exceeded its wall-clock deadline"
    else:
        raise AssertionError("an unfinished SSE event must not extend the absolute deadline")
    assert incomplete.timeouts == [10.0]

    contract = json.loads(CONTRACT_PATH.read_text())
    observed: list[tuple[str, str, str | None]] = []
    input_schemas = {
        tool["name"]: tool["inputSchema"]
        for tool in contract["tools"]
        if "inputSchema" in tool
    }
    input_schemas.update({
        endpoint["executionTool"]: endpoint["inputSchema"]
        for endpoint in contract["endpoints"]
    })
    served_tools = [
        {
            "name": item["name"],
            "title": item["title"],
            "annotations": item["annotations"],
            "inputSchema": input_schemas[item["name"]],
            "securitySchemes": [{"type": "oauth2", "scopes": ["admin"]}],
            "_meta": {"securitySchemes": [{"type": "oauth2", "scopes": ["admin"]}]},
        }
        for item in contract["tools"]
    ]

    class Handler(http.server.BaseHTTPRequestHandler):
        pagination_mode = "normal"
        initialized_sessions: set[str] = set()

        def log_message(self, *_: Any) -> None:
            return

        def send_json(
            self,
            status: int,
            body: dict[str, Any],
            session: str | None = None,
        ) -> None:
            payload = json.dumps(body).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            if session:
                self.send_header("Mcp-Session-Id", session)
            self.end_headers()
            self.wfile.write(payload)

        def send_sse(self, events: list[dict[str, Any]], session: str) -> None:
            payload = "".join(
                f"event: message\ndata: {json.dumps(event)}\n\n" for event in events
            ).encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Mcp-Session-Id", session)
            self.end_headers()
            self.wfile.write(payload)

        def do_GET(self) -> None:
            expected = "/.well-known/oauth-protected-resource/v2/ai/mcp"
            if self.path != expected:
                self.send_json(404, {"error": "not found"})
                return
            self.send_json(200, {
                "resource": test_url,
                "authorization_servers": ["https://apidev.telnyx.com"],
                "scopes_supported": ["admin"],
            })

        def do_POST(self) -> None:
            if self.headers.get("Authorization") != "Bearer test-token":
                self.send_json(401, {"error": "invalid_token"})
                return
            length = int(self.headers.get("Content-Length", "0"))
            request = json.loads(self.rfile.read(length))
            method = request.get("method", "")
            params = request.get("params", {})
            protocol_header = self.headers.get("MCP-Protocol-Version")
            protocol_version = (
                params.get("protocolVersion")
                if method == "initialize" and protocol_header is None
                else protocol_header
            )
            modern = isinstance(protocol_version, str) and protocol_version.startswith("2026-")
            if protocol_version not in contract["protocolVersions"]:
                self.send_json(400, {"error": "unsupported protocol version"})
                return
            method_header = self.headers.get("MCP-Method")
            if (modern and method_header != method) or (not modern and method_header):
                self.send_json(400, {"error": "invalid MCP method header"})
                return
            if not modern and (
                (method == "initialize" and protocol_header is not None)
                or (method != "initialize" and protocol_header is None)
            ):
                self.send_json(400, {"error": "invalid legacy protocol header"})
                return
            if modern and params.get("_meta") != protocol_meta(protocol_version):
                self.send_json(400, {"error": "invalid modern MCP envelope"})
                return
            session = f"audit-{contract['protocolVersions'].index(protocol_version)}"
            cursor = params.get("cursor")
            observed.append((protocol_version, method, cursor))
            if method == "server/discover":
                self.send_json(
                    200,
                    {
                        "jsonrpc": "2.0",
                        "id": request["id"],
                        "result": {
                            "supportedVersions": [
                                version
                                for version in contract["protocolVersions"]
                                if version.startswith("2026-")
                            ],
                            "capabilities": {"tools": {"listChanged": True}},
                            "_meta": {
                                "io.modelcontextprotocol/serverInfo": {
                                    "name": "test",
                                    "version": contract["version"],
                                }
                            },
                        },
                    },
                    session,
                )
            elif method == "initialize":
                expected = {
                    **LEGACY_INITIALIZE_PARAMS,
                    "protocolVersion": protocol_version,
                }
                if modern or params != expected:
                    self.send_json(400, {"error": "invalid legacy MCP initialize"})
                    return
                self.send_json(
                    200,
                    {
                        "jsonrpc": "2.0",
                        "id": request["id"],
                        "result": {
                            "protocolVersion": protocol_version,
                            "capabilities": {"tools": {"listChanged": True}},
                            "serverInfo": {
                                "name": "test",
                                "version": contract["version"],
                            },
                        },
                    },
                    session,
                )
            elif method == "notifications/initialized":
                if modern or self.headers.get("Mcp-Session-Id") != session:
                    self.send_json(400, {"error": "invalid initialized notification"})
                    return
                type(self).initialized_sessions.add(session)
                self.send_response(202)
                self.end_headers()
            elif method == "tools/list":
                if self.headers.get("Mcp-Session-Id") != session:
                    self.send_json(400, {"error": "wrong MCP session"})
                    return
                if not modern and session not in type(self).initialized_sessions:
                    self.send_json(409, {"error": "client is not initialized"})
                    return
                if cursor is None:
                    result = {"tools": served_tools[:3], "nextCursor": "page-2"}
                elif cursor == "page-2":
                    result = {"tools": served_tools[3:]}
                    if type(self).pagination_mode == "repeat":
                        result["nextCursor"] = "page-2"
                else:
                    self.send_json(400, {"error": "unexpected cursor"})
                    return
                self.send_sse([
                    {"jsonrpc": "2.0", "method": "notifications/progress"},
                    {"jsonrpc": "2.0", "id": request["id"], "result": result},
                ], session)
            else:
                self.send_json(400, {"error": "unexpected method"})

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    test_url = f"http://127.0.0.1:{server.server_port}/v2/ai/mcp"
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    EXPECTED_ISSUERS[test_url] = "https://apidev.telnyx.com"
    try:
        run_audit(test_url, "test-token")
        assert observed == [
            ("2026-07-28", "server/discover", None),
            ("2026-07-28", "tools/list", None),
            ("2026-07-28", "tools/list", "page-2"),
            ("2025-11-25", "initialize", None),
            ("2025-11-25", "notifications/initialized", None),
            ("2025-11-25", "tools/list", None),
            ("2025-11-25", "tools/list", "page-2"),
        ]
        Handler.pagination_mode = "repeat"
        Handler.initialized_sessions.clear()
        try:
            run_audit(test_url, "test-token")
        except AuditError as error:
            assert str(error) == "tools/list repeated cursor 'page-2'"
        else:
            raise AssertionError("a repeated tools/list cursor must fail closed")
    finally:
        EXPECTED_ISSUERS.pop(test_url, None)
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)

    valid_tools = served_tools
    serializer_variant = json.loads(json.dumps(valid_tools))
    list_tool = next(
        tool for tool in serializer_variant if tool["name"] == "list_api_endpoints"
    )
    list_tool["inputSchema"].pop("required")
    validate_tool_catalog(serializer_variant, contract)

    duplicate_schema_contract = json.loads(json.dumps(contract))
    duplicate_tool = next(
        tool
        for tool in duplicate_schema_contract["tools"]
        if tool["name"] == "get_call_status"
    )
    duplicate_endpoint = next(
        endpoint
        for endpoint in duplicate_schema_contract["endpoints"]
        if endpoint["executionTool"] == "get_call_status"
    )
    duplicate_tool["inputSchema"] = duplicate_endpoint["inputSchema"]
    try:
        validate_tool_catalog(valid_tools, duplicate_schema_contract)
    except AuditError as error:
        assert str(error) == "contract defines more than one input schema for a tool"
    else:
        raise AssertionError("duplicate input-schema ownership must fail the release audit")

    missing_schema_contract = json.loads(json.dumps(contract))
    missing_schema_tool = next(
        tool
        for tool in missing_schema_contract["tools"]
        if tool["name"] == "list_api_endpoints"
    )
    missing_schema_tool.pop("inputSchema")
    try:
        validate_tool_catalog(valid_tools, missing_schema_contract)
    except AuditError as error:
        assert str(error) == "contract must pin exactly one input schema for every tool"
    else:
        raise AssertionError("missing input-schema ownership must fail the release audit")

    drifted_tools = json.loads(json.dumps(valid_tools))
    lookup = next(tool for tool in drifted_tools if tool["name"] == "get_call_status")
    lookup["inputSchema"]["required"].remove("call_control_id")
    try:
        validate_tool_catalog(drifted_tools, contract)
    except AuditError as error:
        assert str(error) == "input schema drifted for get_call_status"
    else:
        raise AssertionError("execution-tool schema drift must fail the release audit")

    discovery_drift = json.loads(json.dumps(valid_tools))
    discovery = next(
        tool for tool in discovery_drift if tool["name"] == "list_api_endpoints"
    )
    discovery["inputSchema"]["properties"]["limit"]["maximum"] = 500
    try:
        validate_tool_catalog(discovery_drift, contract)
    except AuditError as error:
        assert str(error) == "input schema drifted for list_api_endpoints"
    else:
        raise AssertionError("discovery-tool schema drift must fail the release audit")

    dialect_drift = json.loads(json.dumps(valid_tools))
    lookup = next(tool for tool in dialect_drift if tool["name"] == "get_call_status")
    lookup["inputSchema"]["$schema"] = "http://json-schema.org/draft-04/schema#"
    try:
        validate_tool_catalog(dialect_drift, contract)
    except AuditError as error:
        assert str(error).startswith("unsupported JSON Schema dialect for get_call_status")
    else:
        raise AssertionError("behavior-changing JSON Schema dialect drift must fail the audit")

    redirect_hits: list[str | None] = []

    class RedirectTarget(http.server.BaseHTTPRequestHandler):
        def log_message(self, *_: Any) -> None:
            return

        def record(self) -> None:
            redirect_hits.append(self.headers.get("Authorization"))
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"jsonrpc":"2.0","id":7,"result":{}}')

        do_GET = record
        do_POST = record

    target = http.server.ThreadingHTTPServer(("127.0.0.1", 0), RedirectTarget)
    target_url = f"http://127.0.0.1:{target.server_port}/capture"

    class RedirectSource(http.server.BaseHTTPRequestHandler):
        def log_message(self, *_: Any) -> None:
            return

        def do_POST(self) -> None:
            self.send_response(302)
            self.send_header("Location", target_url)
            self.end_headers()

    source = http.server.ThreadingHTTPServer(("127.0.0.1", 0), RedirectSource)
    target_thread = threading.Thread(target=target.serve_forever, daemon=True)
    source_thread = threading.Thread(target=source.serve_forever, daemon=True)
    target_thread.start()
    source_thread.start()
    try:
        try:
            rpc(
                f"http://127.0.0.1:{source.server_port}/redirect",
                {"jsonrpc": "2.0", "id": 7, "method": "tools/list", "params": {}},
                "redirect-secret",
                "2026-07-28",
            )
        except AuditError as error:
            assert "refused HTTP redirect 302" in str(error)
        else:
            raise AssertionError("authenticated redirects must fail closed")
    finally:
        source.shutdown()
        target.shutdown()
        source.server_close()
        target.server_close()
        source_thread.join(timeout=5)
        target_thread.join(timeout=5)
    assert redirect_hits == []
    print("Hosted MCP audit self-test: OK")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--url")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    if not args.url:
        print("--url is required for a hosted audit", file=sys.stderr)
        return 2
    token = os.environ.get("TELNYX_MCP_OAUTH_TOKEN", "")
    if not token:
        print("TELNYX_MCP_OAUTH_TOKEN is required", file=sys.stderr)
        return 2
    try:
        run_audit(args.url, token)
    except AuditError as error:
        print(f"Hosted MCP audit failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
