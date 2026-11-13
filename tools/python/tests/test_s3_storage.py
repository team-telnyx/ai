"""Optional S3 tools: local contracts, never authenticated lifecycle acceptance."""

import base64
import io
import json
from unittest.mock import MagicMock, patch

import pytest

from telnyx_agent_toolkit import TelnyxAgentToolkit
from telnyx_agent_toolkit.shared.schema import build_pydantic_args_schema
from telnyx_agent_toolkit.shared.storage import STORAGE_TOOL_DEFINITIONS


def test_readmes_and_manifest_describe_the_optional_contract():
    from pathlib import Path

    from telnyx_agent_toolkit.shared.storage import REGIONS

    root = Path(__file__).resolve().parents[3]
    for language in ("python", "typescript"):
        readme = (root / "tools" / language / "README.md").read_text()
        for name in STORAGE_TOOL_DEFINITIONS:
            assert name in readme
        for region in REGIONS:
            assert region in readme
        for term in ("content_encoding", "base64", "utf-8", "1 MiB", "sign-off"):
            assert term in readme
    capability = next(
        c
        for c in json.loads((root / "agent.json").read_text())["capabilities"]
        if c["id"] == "storage"
    )
    assert "optional" in capability["description"]
    assert "S3-compatible API" in capability["api"]


def test_missing_optional_dependency_is_actionable():
    import builtins

    original = builtins.__import__

    def without_sdk(name, *args, **kwargs):
        if name == "boto3":
            raise ImportError("intentionally absent")
        return original(name, *args, **kwargs)

    with patch("builtins.__import__", side_effect=without_sdk):
        result = json.loads(
            TelnyxAgentToolkit(api_key="test-key", storage=True).core.run_tool(
                "list_storage_buckets", {}
            )
        )
    assert "telnyx-agent-toolkit[storage]" in result["error"]


def test_openai_executor_and_shared_adapter_schemas():
    toolkit = TelnyxAgentToolkit(
        api_key="test-key",
        storage=True,
        configuration={"actions": {"storage": {"list_storage_buckets": True}}},
    )
    client = MagicMock()
    client.list_buckets.return_value = {"Buckets": []}
    with patch(
        "telnyx_agent_toolkit.shared.storage.StorageExecutor._client",
        return_value=client,
    ):
        result = toolkit.get_openai_tool_executor().execute(
            {"function": {"name": "list_storage_buckets", "arguments": "{}"}}
        )
    assert json.loads(result)["data"]["buckets"] == []
    for definition in STORAGE_TOOL_DEFINITIONS.values():
        schema = build_pydantic_args_schema(definition)
        if definition["parameters"]["required"]:
            with pytest.raises(ValueError):
                schema()
        else:
            assert schema().region == "us-central-1"


def test_sdk_failure_is_json_error_and_client_is_closed():
    client = MagicMock()
    client.list_buckets.side_effect = RuntimeError("AccessDenied")
    with patch(
        "telnyx_agent_toolkit.shared.storage.StorageExecutor._client",
        return_value=client,
    ):
        result = json.loads(
            TelnyxAgentToolkit(api_key="test-key", storage=True).core.run_tool(
                "list_storage_buckets", {}
            )
        )
    assert result == {"error": "AccessDenied"}
    client.close.assert_called_once()


@pytest.mark.parametrize(
    "content,encoding,expected",
    [
        ("héllo", "utf-8", "héllo".encode()),
        ("AP8=", "base64", b"\x00\xff"),
        ("", "base64", b""),
    ],
)
def test_object_round_trip_contract(content, encoding, expected):
    client = MagicMock()
    client.put_object.return_value = {"ETag": '"etag"'}
    body = io.BytesIO(expected)
    client.get_object.return_value = {
        "Body": body,
        "ContentLength": len(expected),
        "ContentType": "application/test",
        "ETag": '"etag"',
    }
    toolkit = TelnyxAgentToolkit(api_key="test-key", storage=True)
    key = "a//ü ?#%2e/file"
    with patch(
        "telnyx_agent_toolkit.shared.storage.StorageExecutor._client",
        return_value=client,
    ):
        put = json.loads(
            toolkit.core.run_tool(
                "upload_storage_object",
                {
                    "bucket_name": "my-bucket",
                    "key": key,
                    "content": content,
                    "content_encoding": encoding,
                    "content_type": "application/test",
                },
            )
        )
        assert put == {
            "data": {
                "bucket_name": "my-bucket",
                "key": key,
                "etag": '"etag"',
                "size_bytes": len(expected),
            }
        }
        client.put_object.assert_called_once_with(
            Bucket="my-bucket", Key=key, Body=expected, ContentType="application/test"
        )
        get = json.loads(
            toolkit.core.run_tool(
                "get_storage_object", {"bucket_name": "my-bucket", "key": key}
            )
        )
        assert get == {
            "data": {
                "bucket_name": "my-bucket",
                "key": key,
                "content": base64.b64encode(expected).decode(),
                "content_encoding": "base64",
                "content_type": "application/test",
                "size_bytes": len(expected),
                "etag": '"etag"',
            }
        }
        assert body.closed


@pytest.mark.parametrize(
    "overrides",
    [
        {"key": "a/../b"},
        {"key": ""},
        {"content_encoding": "gzip"},
        {"content": "!!!!", "content_encoding": "base64"},
        {"content": "x" * (1024 * 1024 + 1)},
        {"region": "https://example.com"},
        {"bucket_name": "https://x"},
        {"extra": "x"},
        {"content_type": 3},
    ],
)
def test_invalid_upload_rejected_before_sdk(overrides):
    toolkit = TelnyxAgentToolkit(api_key="test-key", storage=True)
    args = {
        "bucket_name": "my-bucket",
        "key": "key",
        "content": "hello",
        "content_encoding": "utf-8",
        **overrides,
    }
    with patch("telnyx_agent_toolkit.shared.storage.StorageExecutor._client") as client:
        assert "error" in json.loads(
            toolkit.core.run_tool("upload_storage_object", args)
        )
        client.assert_not_called()


@pytest.mark.parametrize("declared", [None, 1024 * 1024 + 1])
def test_oversize_download_closed_and_rejected(declared):
    client = MagicMock()
    body = io.BytesIO(b"x" * (1024 * 1024 + 1))
    client.get_object.return_value = {"Body": body, "ContentLength": declared}
    toolkit = TelnyxAgentToolkit(api_key="test-key", storage=True)
    with patch(
        "telnyx_agent_toolkit.shared.storage.StorageExecutor._client",
        return_value=client,
    ):
        result = json.loads(
            toolkit.core.run_tool(
                "get_storage_object", {"bucket_name": "my-bucket", "key": "key"}
            )
        )
        assert "1 MiB" in result.get("error", "")
        assert body.closed


def test_bucket_sdk_dispatch_and_projection():
    client = MagicMock()
    client.list_buckets.return_value = {
        "Buckets": [{"Name": "my-bucket"}],
        "ResponseMetadata": {"not_json": object()},
    }
    client.create_bucket.return_value = {}
    client.delete_bucket.return_value = {}
    toolkit = TelnyxAgentToolkit(api_key="test-key", storage=True)
    with patch(
        "telnyx_agent_toolkit.shared.storage.StorageExecutor._client",
        return_value=client,
        create=True,
    ) as factory:
        result = json.loads(
            toolkit.core.run_tool("list_storage_buckets", {"region": "eu-central-1"})
        )
        assert result == {
            "data": {"buckets": [{"name": "my-bucket"}], "continuation_token": None}
        }
        assert factory.call_args.args == ("eu-central-1",)
        for name, operation in [
            ("create_storage_bucket", "create_bucket"),
            ("delete_storage_bucket", "delete_bucket"),
        ]:
            assert json.loads(
                toolkit.core.run_tool(name, {"bucket_name": "my-bucket"})
            ) == {"data": {"bucket_name": "my-bucket"}}
            getattr(client, operation).assert_called_once_with(Bucket="my-bucket")


NAMES = {
    "list_storage_buckets",
    "create_storage_bucket",
    "delete_storage_bucket",
    "upload_storage_object",
    "get_storage_object",
}


def test_storage_opt_in_and_action_selection():
    assert not NAMES.intersection(
        t["name"] for t in TelnyxAgentToolkit(api_key="test-key").enabled_tools
    )
    toolkit = TelnyxAgentToolkit(
        api_key="test-key",
        storage=True,
        configuration={"actions": {"storage": {n: True for n in NAMES}}},
    )
    assert {t["name"] for t in toolkit.enabled_tools} == NAMES
    assert {t["function"]["name"] for t in toolkit.get_openai_tools()} == NAMES


def test_disabled_storage_never_falls_through_to_rest():
    result = json.loads(
        TelnyxAgentToolkit(api_key="test-key").core.run_tool("list_storage_buckets", {})
    )
    assert "error" in result
