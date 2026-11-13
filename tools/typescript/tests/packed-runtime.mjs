// Run against an installed tarball, never the source checkout.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { TelnyxAgentToolkit } from "@telnyx/agent-toolkit";
import { Readable } from "node:stream";

const require = createRequire(import.meta.url);
const plain = new TelnyxAgentToolkit("synthetic-offline-key");
assert.equal(plain.enabledTools.length, 200);
assert.ok(!plain.enabledTools.some(tool => tool.name === "list_storage_buckets"));
assert.deepEqual(JSON.parse(await plain.core.runTool("list_storage_buckets", {})), {
  error: "Unknown tool: list_storage_buckets",
});

if (process.argv[3] === "storage") {
  const { S3Client } = await import("@aws-sdk/client-s3");
  const calls = [];
  const original = S3Client.prototype.send;
  S3Client.prototype.send = async function (command) {
    calls.push(command.constructor.name);
    if (command.constructor.name === "ListBucketsCommand") return { Buckets: [{ Name: "offline-bucket" }] };
    if (command.constructor.name === "GetObjectCommand") return { Body: Readable.from([Buffer.from("hello")]), ContentLength: 5 };
    return { ETag: '"offline-etag"' };
  };
  try {
    const toolkit = new TelnyxAgentToolkit("synthetic-offline-key", { storage: true });
    assert.equal(toolkit.enabledTools.length, 205);
    const operations = [
      ["list_storage_buckets", {}],
      ["create_storage_bucket", { bucket_name: "offline-bucket" }],
      ["upload_storage_object", { bucket_name: "offline-bucket", key: "hello.txt", content: "hello", content_encoding: "utf-8" }],
      ["get_storage_object", { bucket_name: "offline-bucket", key: "hello.txt" }],
      ["delete_storage_bucket", { bucket_name: "offline-bucket" }],
    ];
    for (const [name, args] of operations) {
      const result = JSON.parse(await toolkit.core.runTool(name, args));
      assert.ok(result.data, `${name}: ${JSON.stringify(result)}`);
      if (name === "get_storage_object") assert.equal(result.data.content, "aGVsbG8=");
    }
    assert.deepEqual(calls, ["ListBucketsCommand", "CreateBucketCommand", "PutObjectCommand", "GetObjectCommand", "DeleteBucketCommand"]);
  } finally {
    S3Client.prototype.send = original;
  }
} else {
  assert.throws(() => require.resolve("@aws-sdk/client-s3"), { code: "MODULE_NOT_FOUND" });
}
console.log(`Packed consumer passed on ${process.version} (${process.argv[3] ?? "no optional peers"}; offline, no service access)`);
