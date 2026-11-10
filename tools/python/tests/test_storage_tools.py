"""Storage tool definitions must match the real Telnyx API.

Cloud Storage bucket/object management is S3-compatible and has no
``/v2/storage/buckets`` REST collection; the only bucket-scoped REST routes are
sub-resources (presigned URL, SSL certificate, usage). These tests pin that.
"""

import json
from urllib.parse import quote

import httpx
import pytest
import respx

from telnyx_agent_toolkit.shared.api_client import TelnyxAPIClient
from telnyx_agent_toolkit.shared.constants import TOOL_DEFINITIONS
from telnyx_agent_toolkit.shared.toolkit_core import ToolkitCore, _encode_path_param

# Tools removed because their routes never existed (AI-3949). Keeping the names
# here makes an accidental re-introduction fail loudly.
REMOVED_STORAGE_TOOLS = [
    "list_storage_buckets",
    "create_storage_bucket",
    "delete_storage_bucket",
    "upload_storage_object",
    "get_storage_object",
]


def test_phantom_storage_tools_are_not_defined() -> None:
    present = [name for name in REMOVED_STORAGE_TOOLS if name in TOOL_DEFINITIONS]
    assert present == [], (
        f"{present} target /v2/storage/buckets routes that do not exist; "
        "bucket/object operations are S3-only (see AI-3949 / AI-3950)"
    )


def test_create_presigned_url_matches_openapi_contract() -> None:
    tool = TOOL_DEFINITIONS["create_presigned_url"]
    assert tool["method"] == "POST"
    assert tool["path"] == "/storage/buckets/{bucket_name}/{key}/presigned_url"
    assert tool["category"] == "storage"

    props = tool["parameters"]["properties"]
    assert set(tool["parameters"]["required"]) == {"bucket_name", "key"}
    # The API takes only `ttl` (seconds, 1..604800). The old definition sent
    # `method` and `expires_in`, which the API ignores.
    assert "ttl" in props
    assert props["ttl"]["type"] == "integer"
    assert "604800" in props["ttl"]["description"]  # documented API maximum
    for stale in ("method", "expires_in"):
        assert stale not in props, f"stale parameter {stale!r} is not accepted by the API"


def test_storage_category_contains_only_real_routes() -> None:
    storage_tools = {n for n, t in TOOL_DEFINITIONS.items() if t["category"] == "storage"}
    assert storage_tools == {"create_presigned_url"}


class TestPathParamEncoding:
    """Path placeholders are percent-encoded so a value containing "?", "#", "%"
    or whitespace cannot terminate or corrupt the route (Codex review on #590)."""

    @pytest.mark.asyncio
    @respx.mock
    async def test_object_key_with_reserved_chars_reaches_presigned_route(self) -> None:
        core = ToolkitCore(client=TelnyxAPIClient(api_key="test-key"))
        route = respx.post(
            "https://api.telnyx.com/v2/storage/buckets/my-bucket/reports/2026/why%3F%231.pdf/presigned_url"
        ).mock(return_value=httpx.Response(200, json={"data": {"presigned_url": "https://x"}}))
        await core.run_tool_async(
            "create_presigned_url", {"bucket_name": "my-bucket", "key": "reports/2026/why?#1.pdf", "ttl": 60}
        )
        assert route.called
        req = route.calls.last.request
        assert req.url.query == b"" and req.url.fragment == ""
        assert json.loads(req.content) == {"ttl": 60}

    def test_encoding_keeps_rfc3986_pchar_literal(self) -> None:
        # unreserved, sub-delims, ":" "@" and "/" pass through unchanged
        assert _encode_path_param("+15551234567") == "+15551234567"
        assert _encode_path_param("a:b@c!d$e&f'g(h)i*j+k,l;m=n/o-p_q.r~s") == "a:b@c!d$e&f'g(h)i*j+k,l;m=n/o-p_q.r~s"
        # path terminators / corrupters are encoded
        assert _encode_path_param("a/b c#d?e%f") == "a/b%20c%23d%3Fe%25f"
        assert _encode_path_param("ü[1]") == "%C3%BC%5B1%5D"

    @pytest.mark.parametrize("key", [".", "..", "./a", "../a", "a/.", "a/..", "reports/../invoice.pdf", "reports/./invoice.pdf"])
    @pytest.mark.asyncio
    @respx.mock
    async def test_dot_segments_are_rejected_before_http(self, key: str) -> None:
        core = ToolkitCore(client=TelnyxAPIClient(api_key="test-key"))
        result = json.loads(await core.run_tool_async(
            "create_presigned_url", {"bucket_name": "my-bucket", "key": key}
        ))
        assert "dot-only path segments" in result.get("error", "")
        assert len(respx.calls) == 0

    @pytest.mark.parametrize("key", ["a..b.pdf", ".hidden", "...", "a//b", "reports/%2e%2e/invoice.pdf"])
    def test_non_dot_segments_remain_supported(self, key: str) -> None:
        assert _encode_path_param(key) == quote(key, safe="/:@!$&'()*+,;=")
