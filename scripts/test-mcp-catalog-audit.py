#!/usr/bin/env python3
"""Release-gate regressions. Fixtures never contact Telnyx or use credentials."""

import importlib.util
import copy
import io
import json
from pathlib import Path
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location(
    "mcp_audit", Path(__file__).with_name("check-telnyx-mcp-catalog.py")
)
audit = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(audit)


class Response(io.BytesIO):
    def __init__(self, body, sse=False):
        payload = json.dumps(body).encode()
        super().__init__(b"data: " + payload + b"\n\n" if sse else payload)
        self.headers = {"Content-Type": "text/event-stream" if sse else "application/json"}

    def set_audit_read_timeout(self, timeout):
        pass


class ResponseContractTests(unittest.TestCase):
    def test_strict_json_across_json_sse_and_metadata(self):
        invalid = [
            b'{"jsonrpc":"2.0","id":1,"result":{"x":NaN}}',
            b'{"jsonrpc":"2.0","id":1,"result":{"x":Infinity}}',
            b'{"jsonrpc":"2.0","id":1,"result":{"x":-Infinity}}',
            b'{"jsonrpc":"2.0","id":1,"result":{"x":1e999}}',
            b'{"jsonrpc":"2.0","id":1,"result":{},"result":{}}',
            b'{"jsonrpc":"2.0","id":1,"result":{"x":1,"x":2}}',
            b'{"jsonrpc":"2.0","id":1,"result":{"x":1,"\\u0078":2}}',
            b'{"jsonrpc":"2.0","id":1,"result":{"x":"\xff"}}',
        ]
        for payload in invalid:
            with self.subTest(payload=payload), self.assertRaises(audit.AuditError):
                audit.parse_body("application/json", payload)
            for sse in (False, True):
                response = Response({}, sse)
                response.seek(0)
                response.truncate()
                response.write(b"data: " + payload + b"\n\n" if sse else payload)
                response.seek(0)
                with self.subTest(payload=payload, sse=sse), self.assertRaises(audit.AuditError):
                    audit.read_rpc_response(response, 1)

    def test_valid_success_and_error_in_both_transports(self):
        for sse in (False, True):
            for fields in ({"result": {}},
                           {"result": {"rows": [{"x": 1}, {"x": 2}], "text": "NaN Infinity",
                                       "finite": 1.25e20}},
                           {"error": {"code": -32601, "message": "Unsupported"}}):
                body = {"jsonrpc": "2.0", "id": 1, **fields}
                with self.subTest(sse=sse, fields=fields):
                    self.assertEqual(audit.read_rpc_response(Response(body, sse), 1), body)

    def test_ambiguous_sse_notification_is_not_skipped(self):
        response = Response({}, True)
        response.seek(0)
        response.truncate()
        response.write(b'data: {"jsonrpc":"2.0","method":"notifications/message",'
                       b'"params":{"level":"info","level":"error"}}\n\n'
                       b'data: {"jsonrpc":"2.0","id":1,"result":{}}\n\n')
        response.seek(0)
        with self.assertRaisesRegex(audit.AuditError, "duplicate"):
            audit.read_rpc_response(response, 1)

    def test_invalid_envelopes_in_both_transports(self):
        valid = {"jsonrpc": "2.0", "id": 1, "result": {}}
        invalid = [
            {"id": 1, "result": {}},
            *[{**valid, "jsonrpc": version} for version in (None, 2, "1.0", "2.0 ")],
            *[{**valid, "id": identity} for identity in (True, 1.0, "1", None, 2)],
            {"jsonrpc": "2.0", "id": 1},
            {**valid, "error": {"code": -1, "message": "bad"}},
            {**valid, "method": "tools/list"},
            *[{"jsonrpc": "2.0", "id": 1, "error": error} for error in (
                None, "bad", {}, {"code": True, "message": "bad"},
                {"code": -1, "message": None}, {"code": -1.0, "message": "bad"},
            )],
        ]
        for sse in (False, True):
            for body in invalid:
                with self.subTest(sse=sse, body=body), self.assertRaises(audit.AuditError):
                    audit.read_rpc_response(Response(body, sse), 1)


class MetadataContractTests(unittest.TestCase):
    def test_environment_issuer_matrix(self):
        for url, issuer in audit.EXPECTED_ISSUERS.items():
            metadata = {"resource": url, "scopes_supported": ["admin"]}
            invalid = [None, [], [None], [1], [{}], issuer, [issuer, issuer],
                       [issuer + "/"], [issuer + "/oauth"], ["https://wrong.example"]]
            invalid += [[other] for other in audit.EXPECTED_ISSUERS.values() if other != issuer]
            for servers in invalid:
                with self.subTest(url=url, servers=servers), \
                     patch.object(audit, "fetch_json", return_value=(200, {}, {
                         **metadata, "authorization_servers": servers,
                     })), patch.object(audit, "audit_protocol_version") as protocol:
                    with self.assertRaises(audit.AuditError):
                        audit.run_audit(url, "fixture")
                    protocol.assert_not_called()
            with patch.object(audit, "fetch_json", return_value=(200, {}, {
                **metadata, "authorization_servers": [issuer],
            })), patch.object(audit, "audit_protocol_version") as protocol:
                audit.run_audit(url, "fixture")
                self.assertEqual(protocol.call_count, 2)

    def test_unapproved_destination_rejected_before_io(self):
        for url in ("http://api.telnyx.com/v2/ai/mcp", "https://wrong.example/v2/ai/mcp",
                    audit.DEFAULT_URL + "?debug=true", audit.DEFAULT_URL + "/"):
            with self.subTest(url=url), patch.object(audit, "fetch_json") as fetch:
                with self.assertRaises(audit.AuditError):
                    audit.run_audit(url, "fixture")
                fetch.assert_not_called()


class CapabilitiesContractTests(unittest.TestCase):
    def test_security_scheme_matrix_for_every_tool_and_mirror(self):
        contract = json.loads(audit.CONTRACT_PATH.read_text())
        schemas = {tool["name"]: tool["inputSchema"] for tool in contract["tools"] if "inputSchema" in tool}
        schemas.update({entry["executionTool"]: entry["inputSchema"] for entry in contract["endpoints"]})
        expected = [{"type": "oauth2", "scopes": ["admin"]}]
        tools = [{**tool, "inputSchema": schemas[tool["name"]],
                  "securitySchemes": copy.deepcopy(expected),
                  "_meta": {"securitySchemes": copy.deepcopy(expected)}} for tool in contract["tools"]]
        audit.validate_tool_catalog(tools, contract)
        for index in range(len(tools)):
            for mirror in (False, True):
                for value in (None, [], [{"type": "noauth"}], [{"type": "oauth2", "scopes": []}],
                              [{"type": "oauth2", "scopes": ["other"]}], expected * 2):
                    changed = copy.deepcopy(tools)
                    target = changed[index]["_meta"] if mirror else changed[index]
                    if value is None:
                        target.pop("securitySchemes")
                    else:
                        target["securitySchemes"] = value
                    with self.subTest(tool=tools[index]["name"], mirror=mirror, value=value), \
                         self.assertRaises(audit.AuditError):
                        audit.validate_tool_catalog(changed, contract)

    def test_resource_capabilities_rejected_in_both_protocol_eras(self):
        contract = json.loads(audit.CONTRACT_PATH.read_text())
        for version in contract["protocolVersions"]:
            result = {
                "supportedVersions": [v for v in contract["protocolVersions"] if v.startswith("2026-")],
                "protocolVersion": version,
                "serverInfo": {"version": contract["version"]},
                "_meta": {"io.modelcontextprotocol/serverInfo": {"version": contract["version"]}},
            }
            for capabilities in (None, [], "tools", {"tools": {}, "resources": {}},
                                 {"resources": False}, {"resources": None},
                                 {"resources": {"subscribe": True}}):
                response = {"jsonrpc": "2.0", "id": 10,
                            "result": {**result, "capabilities": capabilities}}
                with self.subTest(version=version, capabilities=capabilities), \
                     patch.object(audit, "rpc", return_value=(response, None)), \
                     patch.object(audit, "list_all_tools") as list_tools, \
                     self.assertRaises(audit.AuditError):
                    audit.audit_protocol_version(audit.DEFAULT_URL, "fixture", contract, version, 10)
                list_tools.assert_not_called()


if __name__ == "__main__":
    unittest.main()
