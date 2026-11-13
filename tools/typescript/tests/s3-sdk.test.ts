import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { S3Client } from "@aws-sdk/client-s3";
import { TelnyxAgentToolkit } from "../src/index.js";

const toolkit = new TelnyxAgentToolkit("test-key", { storage: true });
const original = S3Client.prototype.send;
const requests: { name: string; input: any }[] = [];
let downloadSize = 2;
let declaredLength = true;
let body: Readable;
S3Client.prototype.send = async function(command: any): Promise<any> {
  requests.push({ name: command.constructor.name, input: command.input });
  const credentials = await this.config.credentials();
  assert.equal(credentials.accessKeyId, "test-key");
  assert.equal(credentials.secretAccessKey, "test-key");
  assert.equal(credentials.sessionToken, undefined);
  assert.equal(this.config.forcePathStyle, true);
  assert.equal((await this.config.endpoint!()).hostname, "eu-central-1.telnyxcloudstorage.com");
  if (command.constructor.name === "ListBucketsCommand") return { Buckets: [{ Name: "my-bucket" }] };
  if (command.constructor.name === "GetObjectCommand") {
    body = Readable.from([Buffer.alloc(downloadSize, 255)]);
    return { Body: body, ContentLength: declaredLength ? downloadSize : undefined, ContentType: "application/test", ETag: '"etag"' };
  }
  return { ETag: '"etag"' };
} as any;
try {
  const run = async (name: string, args = {}) => JSON.parse(await toolkit.core.runTool(name, { region: "eu-central-1", ...args }));
  assert.deepEqual(await run("list_storage_buckets"), { data: { buckets: [{ name: "my-bucket" }], continuation_token: null } });
  assert.deepEqual(JSON.parse(await toolkit.getOpenAIToolExecutor().execute({ function: { name: "list_storage_buckets", arguments: '{"region":"eu-central-1"}' } })), { data: { buckets: [{ name: "my-bucket" }], continuation_token: null } });
  for (const name of ["create_storage_bucket", "delete_storage_bucket"]) {
    assert.deepEqual(await run(name, { bucket_name: "my-bucket" }), { data: { bucket_name: "my-bucket" } });
  }
  const key = "a//ü ?#%2e/file";
  assert.deepEqual(await run("upload_storage_object", { bucket_name: "my-bucket", key, content: "AP8=", content_encoding: "base64" }), { data: { bucket_name: "my-bucket", key, etag: '"etag"', size_bytes: 2 } });
  assert.deepEqual(requests.at(-1), { name: "PutObjectCommand", input: { Bucket: "my-bucket", Key: key, Body: Buffer.from([0, 255]), ContentType: "application/octet-stream" } });
  const get = await run("get_storage_object", { bucket_name: "my-bucket", key });
  assert.deepEqual(get, { data: { bucket_name: "my-bucket", key, content: "//8=", content_encoding: "base64", content_type: "application/test", size_bytes: 2, etag: '"etag"' } });
  assert.ok(body!.destroyed);
  downloadSize = 1024 * 1024 + 1;
  assert.match((await run("get_storage_object", { bucket_name: "my-bucket", key })).error, /1 MiB/);
  assert.ok(body!.destroyed);
  declaredLength = false;
  assert.match((await run("get_storage_object", { bucket_name: "my-bucket", key })).error, /1 MiB/);
  assert.ok(body!.destroyed);
  downloadSize = 1024 * 1024;
  assert.equal((await run("get_storage_object", { bucket_name: "my-bucket", key })).data.size_bytes, downloadSize);
  assert.equal((await run("upload_storage_object", { bucket_name: "my-bucket", key, content: "héllo", content_encoding: "utf-8" })).data.size_bytes, 6);
  assert.equal((await run("upload_storage_object", { bucket_name: "my-bucket", key, content: "", content_encoding: "base64" })).data.size_bytes, 0);
} finally { S3Client.prototype.send = original; }
const wire: any[] = [];
S3Client.prototype.send = function(command: any, options: any): any {
  this.config.requestHandler = {
    handle: async (request: any) => { wire.push(request); throw new Error("captured before network"); },
    destroy() {},
  } as any;
  return original.call(this, command, options);
} as any;
try {
  const result = JSON.parse(await toolkit.core.runTool("upload_storage_object", { bucket_name: "my-bucket", key: "a//ü ?#%2e/file", content: "hello", content_encoding: "utf-8" }));
  assert.equal(result.error, "captured before network");
  assert.equal(wire.length, 1);
  assert.equal(wire[0].hostname, "us-central-1.telnyxcloudstorage.com");
  assert.equal(wire[0].path, "/my-bucket/a//%C3%BC%20%3F%23%252e/file");
  assert.match(wire[0].headers.authorization, /Credential=test-key\//);
} finally { S3Client.prototype.send = original; }
console.log("S3 SDK local dispatch and signed wire contracts passed (NOT authenticated lifecycle acceptance)");
