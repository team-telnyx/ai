"""Opt-in S3 tool catalog, separate from the Telnyx REST catalog."""

from __future__ import annotations

from typing import Any

from telnyx_agent_toolkit.shared.constants import ToolDefinition

REGIONS = [
    "us-central-1",
    "us-east-1",
    "us-west-1",
    "eu-central-1",
    "ap-southeast-1",
    "ca-central-1",
]
MAX_OBJECT_BYTES = 1024 * 1024


def _definition(
    name: str, operation: str, properties: dict[str, Any], required: list[str]
) -> ToolDefinition:
    return {
        "name": name,
        "description": (
            f"S3 {operation} on Telnyx Cloud Storage. Requires optional storage "
            "support. Inline objects are limited to 1 MiB; delete only accepts "
            "empty buckets."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "region": {
                    "type": "string",
                    "description": "Regional endpoint (default us-central-1).",
                    "enum": REGIONS,
                    "default": "us-central-1",
                },
                **properties,
            },
            "required": required,
        },
        # Adapter metadata only, never routed through the REST client.
        "method": {
            "CreateBucket": "PUT",
            "DeleteBucket": "DELETE",
            "PutObject": "PUT",
        }.get(operation, "GET"),
        "path": f"s3:{operation}",
        "category": "storage",
    }


_BUCKET = {"bucket_name": {"type": "string", "description": "Bucket name (not a URL)."}}
_KEY = {
    **_BUCKET,
    "key": {
        "type": "string",
        "description": (
            "Literal UTF-8 object key. Dot-only segments are refused; no normalization."
        ),
    },
}
STORAGE_TOOL_DEFINITIONS = {
    "list_storage_buckets": _definition("list_storage_buckets", "ListBuckets", {}, []),
    "create_storage_bucket": _definition(
        "create_storage_bucket", "CreateBucket", _BUCKET, ["bucket_name"]
    ),
    "delete_storage_bucket": _definition(
        "delete_storage_bucket", "DeleteBucket", _BUCKET, ["bucket_name"]
    ),
    "upload_storage_object": _definition(
        "upload_storage_object",
        "PutObject",
        {
            **_KEY,
            "content": {
                "type": "string",
                "description": (
                    "Inline content, at most 1 MiB decoded; no filenames/streams."
                ),
            },
            "content_encoding": {
                "type": "string",
                "description": "Encoding of content (not HTTP Content-Encoding).",
                "enum": ["utf-8", "base64"],
            },
            "content_type": {
                "type": "string",
                "description": "Object MIME type; default application/octet-stream.",
            },
        },
        ["bucket_name", "key", "content", "content_encoding"],
    ),
    "get_storage_object": _definition(
        "get_storage_object", "GetObject", _KEY, ["bucket_name", "key"]
    ),
}


class StorageExecutor:
    def __init__(self, api_key: str) -> None:
        self.api_key = api_key

    def _client(self, region: str) -> Any:
        try:
            import boto3
            from botocore.config import Config
        except ImportError as exc:
            raise ValueError(
                "Install telnyx-agent-toolkit[storage] to execute S3 tools"
            ) from exc
        return boto3.client(
            "s3",
            endpoint_url=f"https://{region}.telnyxcloudstorage.com",
            region_name=region,
            aws_access_key_id=self.api_key,
            aws_secret_access_key=self.api_key,
            aws_session_token="",
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "path"},
                connect_timeout=10,
                read_timeout=30,
                retries={"total_max_attempts": 1},
            ),
        )

    async def execute(self, name: str, args: dict[str, Any]) -> dict[str, Any]:
        import asyncio

        return await asyncio.to_thread(self._execute, name, args)

    def _execute(self, name: str, args: dict[str, Any]) -> dict[str, Any]:
        import base64
        import re

        definition = STORAGE_TOOL_DEFINITIONS[name]
        if set(args) - set(definition["parameters"]["properties"]):
            raise ValueError("Unknown S3 arguments")
        for required in definition["parameters"]["required"]:
            if not isinstance(args.get(required), str):
                raise ValueError(f"{required} must be a string")
        for key, value in args.items():
            if not isinstance(value, str):
                raise ValueError(f"{key} must be a string")
        region = args.get("region", "us-central-1")
        if region not in REGIONS:
            raise ValueError("Unsupported storage region")
        bucket = args.get("bucket_name")
        if bucket is not None and (
            not re.fullmatch(r"[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]", bucket)
            or any(s in bucket for s in ("..", ".-", "-."))
            or re.fullmatch(r"\d+\.\d+\.\d+\.\d+", bucket)
        ):
            raise ValueError("Invalid bucket_name")
        key = args.get("key")
        if key is not None:
            if not 1 <= len(key.encode("utf-8")) <= 1024:
                raise ValueError("key must contain 1..1024 UTF-8 bytes")
            if any(segment in (".", "..") for segment in key.split("/")):
                raise ValueError(
                    "Keys containing dot-only path segments are not supported"
                )
        content_type = args.get("content_type", "application/octet-stream")
        if (
            not content_type
            or len(content_type) > 255
            or any(ord(c) < 32 or ord(c) > 126 for c in content_type)
        ):
            raise ValueError("Invalid content_type")
        payload = b""
        if name == "upload_storage_object":
            content = args["content"]
            encoding = args["content_encoding"]
            if len(content) > 4 * ((MAX_OBJECT_BYTES + 2) // 3):
                raise ValueError("Inline objects are limited to 1 MiB")
            if encoding == "utf-8":
                payload = content.encode("utf-8")
            elif encoding == "base64":
                try:
                    payload = base64.b64decode(content, validate=True)
                except (ValueError, UnicodeError) as exc:
                    raise ValueError("content must be canonical base64") from exc
                if base64.b64encode(payload).decode("ascii") != content:
                    raise ValueError("content must be canonical base64")
            else:
                raise ValueError("content_encoding must be utf-8 or base64")
            if len(payload) > MAX_OBJECT_BYTES:
                raise ValueError("Inline objects are limited to 1 MiB")
        client = self._client(region)
        try:
            if name == "list_storage_buckets":
                response = client.list_buckets()
                data = {
                    "buckets": [
                        {"name": b["Name"]} for b in response.get("Buckets", [])
                    ],
                    "continuation_token": response.get("ContinuationToken"),
                }
            elif name == "create_storage_bucket":
                client.create_bucket(Bucket=bucket)
                data = {"bucket_name": bucket}
            elif name == "delete_storage_bucket":
                client.delete_bucket(Bucket=bucket)
                data = {"bucket_name": bucket}
            elif name == "upload_storage_object":
                response = client.put_object(
                    Bucket=bucket, Key=key, Body=payload, ContentType=content_type
                )
                data = {
                    "bucket_name": bucket,
                    "key": key,
                    "etag": response.get("ETag"),
                    "size_bytes": len(payload),
                }
            else:
                response = client.get_object(Bucket=bucket, Key=key)
                body = response["Body"]
                try:
                    if (response.get("ContentLength") or 0) > MAX_OBJECT_BYTES:
                        raise ValueError("Inline objects are limited to 1 MiB")
                    chunks: list[bytes] = []
                    size = 0
                    while True:
                        chunk = body.read(min(65536, MAX_OBJECT_BYTES + 1 - size))
                        if not chunk:
                            break
                        chunks.append(chunk)
                        size += len(chunk)
                        if size > MAX_OBJECT_BYTES:
                            raise ValueError("Inline objects are limited to 1 MiB")
                    payload = b"".join(chunks)
                finally:
                    body.close()
                data = {
                    "bucket_name": bucket,
                    "key": key,
                    "content": base64.b64encode(payload).decode("ascii"),
                    "content_encoding": "base64",
                    "size_bytes": len(payload),
                    "content_type": response.get("ContentType"),
                    "etag": response.get("ETag"),
                }
            return {"data": data}
        finally:
            client.close()
