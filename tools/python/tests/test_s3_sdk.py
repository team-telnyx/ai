"""Real AWS SDK model/serialization tests with no remote requests."""

import io
import json
from unittest.mock import patch

import pytest

from telnyx_agent_toolkit import TelnyxAgentToolkit
from telnyx_agent_toolkit.shared.storage import StorageExecutor

pytest.importorskip("boto3", reason="SDK-enabled lane requires [storage]")
StreamingBody = pytest.importorskip("botocore.response").StreamingBody
Stubber = pytest.importorskip("botocore.stub").Stubber


def test_sdk_credentials_endpoint_and_five_commands():
    executor = StorageExecutor("test-key")
    client = executor._client("eu-central-1")
    credentials = client._request_signer._credentials
    assert credentials.access_key == credentials.secret_key == "test-key"
    assert not credentials.token
    assert client.meta.endpoint_url == "https://eu-central-1.telnyxcloudstorage.com"
    assert client.meta.config.s3["addressing_style"] == "path"
    toolkit = TelnyxAgentToolkit(api_key="test-key", storage=True)
    key = "a//ü ?#%2e/file"
    with (
        Stubber(client) as stub,
        patch.object(StorageExecutor, "_client", return_value=client),
    ):
        stub.add_response("list_buckets", {"Buckets": [{"Name": "my-bucket"}]}, {})
        stub.add_response("create_bucket", {}, {"Bucket": "my-bucket"})
        stub.add_response("delete_bucket", {}, {"Bucket": "my-bucket"})
        stub.add_response(
            "put_object",
            {"ETag": '"etag"'},
            {
                "Bucket": "my-bucket",
                "Key": key,
                "Body": b"\x00\xff",
                "ContentType": "application/octet-stream",
            },
        )
        stub.add_response(
            "get_object",
            {"Body": StreamingBody(io.BytesIO(b"\x00\xff"), 2), "ContentLength": 2},
            {"Bucket": "my-bucket", "Key": key},
        )
        calls = [
            ("list_storage_buckets", {}),
            ("create_storage_bucket", {"bucket_name": "my-bucket"}),
            ("delete_storage_bucket", {"bucket_name": "my-bucket"}),
            (
                "upload_storage_object",
                {
                    "bucket_name": "my-bucket",
                    "key": key,
                    "content": "AP8=",
                    "content_encoding": "base64",
                },
            ),
            ("get_storage_object", {"bucket_name": "my-bucket", "key": key}),
        ]
        for name, args in calls:
            result = json.loads(toolkit.core.run_tool(name, args))
            assert "error" not in result, result
        assert result["data"]["content"] == "AP8="
        stub.assert_no_pending_responses()


def test_sdk_serialization_preserves_literal_key_before_network():
    executor = StorageExecutor("test-key")
    client = executor._client("us-central-1")
    captured = []

    def before_send(request, **kwargs):
        captured.append(request)
        raise RuntimeError("captured before network")

    client.meta.events.register("before-send.s3.PutObject", before_send)
    toolkit = TelnyxAgentToolkit(api_key="test-key", storage=True)
    with patch.object(StorageExecutor, "_client", return_value=client):
        result = json.loads(
            toolkit.core.run_tool(
                "upload_storage_object",
                {
                    "bucket_name": "my-bucket",
                    "key": "a//ü ?#%2e/file",
                    "content": "hello",
                    "content_encoding": "utf-8",
                },
            )
        )
    assert result["error"] == "captured before network"
    assert len(captured) == 1
    assert (
        captured[0].url
        == "https://us-central-1.telnyxcloudstorage.com/my-bucket/a//%C3%BC%20%3F%23%252e/file"
    )
    assert b"Credential=test-key/" in captured[0].headers["Authorization"]
