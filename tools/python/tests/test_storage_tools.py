"""Storage tool definitions must match the real Telnyx API.

Cloud Storage bucket/object management is S3-compatible and has no
``/v2/storage/buckets`` REST collection; the only bucket-scoped REST routes are
sub-resources (presigned URL, SSL certificate, usage). These tests pin that.
"""

from telnyx_agent_toolkit.shared.constants import TOOL_DEFINITIONS

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
