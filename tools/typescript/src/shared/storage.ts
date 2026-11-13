import type { ToolDefinition } from "./constants.js";

export const MAX_OBJECT_BYTES = 1024 * 1024;
export const STORAGE_TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  "list_storage_buckets": {
    "name": "list_storage_buckets",
    "description": "S3 ListBuckets on Telnyx Cloud Storage. Requires optional storage support. Inline objects are limited to 1 MiB; delete only accepts empty buckets.",
    "parameters": {
      "type": "object",
      "properties": {
        "region": {
          "type": "string",
          "description": "Regional endpoint (default us-central-1).",
          "enum": [
            "us-central-1",
            "us-east-1",
            "us-west-1",
            "eu-central-1",
            "ap-southeast-1",
            "ca-central-1"
          ],
          "default": "us-central-1"
        }
      },
      "required": []
    },
    "method": "GET",
    "path": "s3:ListBuckets",
    "category": "storage"
  },
  "create_storage_bucket": {
    "name": "create_storage_bucket",
    "description": "S3 CreateBucket on Telnyx Cloud Storage. Requires optional storage support. Inline objects are limited to 1 MiB; delete only accepts empty buckets.",
    "parameters": {
      "type": "object",
      "properties": {
        "region": {
          "type": "string",
          "description": "Regional endpoint (default us-central-1).",
          "enum": [
            "us-central-1",
            "us-east-1",
            "us-west-1",
            "eu-central-1",
            "ap-southeast-1",
            "ca-central-1"
          ],
          "default": "us-central-1"
        },
        "bucket_name": {
          "type": "string",
          "description": "Bucket name (not a URL)."
        }
      },
      "required": [
        "bucket_name"
      ]
    },
    "method": "PUT",
    "path": "s3:CreateBucket",
    "category": "storage"
  },
  "delete_storage_bucket": {
    "name": "delete_storage_bucket",
    "description": "S3 DeleteBucket on Telnyx Cloud Storage. Requires optional storage support. Inline objects are limited to 1 MiB; delete only accepts empty buckets.",
    "parameters": {
      "type": "object",
      "properties": {
        "region": {
          "type": "string",
          "description": "Regional endpoint (default us-central-1).",
          "enum": [
            "us-central-1",
            "us-east-1",
            "us-west-1",
            "eu-central-1",
            "ap-southeast-1",
            "ca-central-1"
          ],
          "default": "us-central-1"
        },
        "bucket_name": {
          "type": "string",
          "description": "Bucket name (not a URL)."
        }
      },
      "required": [
        "bucket_name"
      ]
    },
    "method": "DELETE",
    "path": "s3:DeleteBucket",
    "category": "storage"
  },
  "upload_storage_object": {
    "name": "upload_storage_object",
    "description": "S3 PutObject on Telnyx Cloud Storage. Requires optional storage support. Inline objects are limited to 1 MiB; delete only accepts empty buckets.",
    "parameters": {
      "type": "object",
      "properties": {
        "region": {
          "type": "string",
          "description": "Regional endpoint (default us-central-1).",
          "enum": [
            "us-central-1",
            "us-east-1",
            "us-west-1",
            "eu-central-1",
            "ap-southeast-1",
            "ca-central-1"
          ],
          "default": "us-central-1"
        },
        "bucket_name": {
          "type": "string",
          "description": "Bucket name (not a URL)."
        },
        "key": {
          "type": "string",
          "description": "Literal UTF-8 object key. Dot-only segments are refused; no normalization."
        },
        "content": {
          "type": "string",
          "description": "Inline content, at most 1 MiB decoded; no filenames/streams."
        },
        "content_encoding": {
          "type": "string",
          "description": "Encoding of content (not HTTP Content-Encoding).",
          "enum": [
            "utf-8",
            "base64"
          ]
        },
        "content_type": {
          "type": "string",
          "description": "Object MIME type; default application/octet-stream."
        }
      },
      "required": [
        "bucket_name",
        "key",
        "content",
        "content_encoding"
      ]
    },
    "method": "PUT",
    "path": "s3:PutObject",
    "category": "storage"
  },
  "get_storage_object": {
    "name": "get_storage_object",
    "description": "S3 GetObject on Telnyx Cloud Storage. Requires optional storage support. Inline objects are limited to 1 MiB; delete only accepts empty buckets.",
    "parameters": {
      "type": "object",
      "properties": {
        "region": {
          "type": "string",
          "description": "Regional endpoint (default us-central-1).",
          "enum": [
            "us-central-1",
            "us-east-1",
            "us-west-1",
            "eu-central-1",
            "ap-southeast-1",
            "ca-central-1"
          ],
          "default": "us-central-1"
        },
        "bucket_name": {
          "type": "string",
          "description": "Bucket name (not a URL)."
        },
        "key": {
          "type": "string",
          "description": "Literal UTF-8 object key. Dot-only segments are refused; no normalization."
        }
      },
      "required": [
        "bucket_name",
        "key"
      ]
    },
    "method": "GET",
    "path": "s3:GetObject",
    "category": "storage"
  }
};

export class StorageExecutor {
  constructor(private readonly apiKey: string) {}

  async execute(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const definition = STORAGE_TOOL_DEFINITIONS[name];
    for (const key of Object.keys(args)) {
      if (!Object.hasOwn(definition.parameters.properties, key)) throw new Error("Unknown S3 arguments");
      if (typeof args[key] !== "string") throw new Error(`${key} must be a string`);
    }
    for (const required of definition.parameters.required) {
      if (typeof args[required] !== "string") throw new Error(`${required} must be a string`);
    }
    const region = (args.region ?? "us-central-1") as string;
    if (!definition.parameters.properties.region.enum!.includes(region)) throw new Error("Unsupported storage region");
    const bucket = args.bucket_name as string | undefined;
    if (bucket !== undefined && (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket) || /\.\.|\.-|-\.|^\d+\.\d+\.\d+\.\d+$/.test(bucket))) throw new Error("Invalid bucket_name");
    const key = args.key as string | undefined;
    if (key !== undefined) {
      // Reject unpaired surrogates rather than silently replacing them with U+FFFD.
      if (Buffer.from(key, "utf8").toString("utf8") !== key) throw new Error("key must be valid UTF-8");
      if (Buffer.byteLength(key) < 1 || Buffer.byteLength(key) > 1024) throw new Error("key must contain 1..1024 UTF-8 bytes");
      if (key.split("/").some(s => s === "." || s === "..")) throw new Error("Keys containing dot-only path segments are not supported");
    }
    const contentType = (args.content_type ?? "application/octet-stream") as string;
    if (!/^[\x20-\x7e]{1,255}$/.test(contentType)) throw new Error("Invalid content_type");
    let payload = Buffer.alloc(0);
    if (name === "upload_storage_object") {
      const content = args.content as string;
      if (content.length > 4 * Math.ceil(MAX_OBJECT_BYTES / 3)) throw new Error("Inline objects are limited to 1 MiB");
      if (args.content_encoding === "utf-8") {
        payload = Buffer.from(content, "utf8");
        if (payload.toString("utf8") !== content) throw new Error("content must be valid UTF-8");
      } else if (args.content_encoding === "base64") {
        payload = Buffer.from(content, "base64");
        if (payload.toString("base64") !== content) throw new Error("content must be canonical base64");
      } else throw new Error("content_encoding must be utf-8 or base64");
      if (payload.length > MAX_OBJECT_BYTES) throw new Error("Inline objects are limited to 1 MiB");
    }
    let sdk: typeof import("@aws-sdk/client-s3");
    try { sdk = await import("@aws-sdk/client-s3"); }
    catch { throw new Error("Install @aws-sdk/client-s3 to execute S3 tools"); }
    const client = new sdk.S3Client({
      endpoint: `https://${region}.telnyxcloudstorage.com`, region, forcePathStyle: true,
      credentials: { accessKeyId: this.apiKey, secretAccessKey: this.apiKey },
      maxAttempts: 1,
    });
    const options = { abortSignal: AbortSignal.timeout(30000) };
    try {
      if (name === "list_storage_buckets") {
        const result = await client.send(new sdk.ListBucketsCommand({}), options);
        return { data: { buckets: (result.Buckets ?? []).map(b => ({ name: b.Name })), continuation_token: result.ContinuationToken ?? null } };
      }
      if (name === "create_storage_bucket") {
        await client.send(new sdk.CreateBucketCommand({ Bucket: bucket }), options);
        return { data: { bucket_name: bucket } };
      }
      if (name === "delete_storage_bucket") {
        await client.send(new sdk.DeleteBucketCommand({ Bucket: bucket }), options);
        return { data: { bucket_name: bucket } };
      }
      if (name === "upload_storage_object") {
        const result = await client.send(new sdk.PutObjectCommand({ Bucket: bucket, Key: key, Body: payload, ContentType: contentType }), options);
        return { data: { bucket_name: bucket, key, etag: result.ETag ?? null, size_bytes: payload.length } };
      }
      const result = await client.send(new sdk.GetObjectCommand({ Bucket: bucket, Key: key }), options);
      // Node runtime only: consume incrementally; never stringify the SDK stream.
      const body = result.Body as import("node:stream").Readable | undefined;
      if (!body) throw new Error("S3 response has no body");
      try {
        if ((result.ContentLength ?? 0) > MAX_OBJECT_BYTES) throw new Error("Inline objects are limited to 1 MiB");
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of body) {
          const bytes = Buffer.from(chunk);
          size += bytes.length;
          if (size > MAX_OBJECT_BYTES) throw new Error("Inline objects are limited to 1 MiB");
          chunks.push(bytes);
        }
        return { data: { bucket_name: bucket, key, content: Buffer.concat(chunks).toString("base64"), content_encoding: "base64", content_type: result.ContentType ?? null, size_bytes: size, etag: result.ETag ?? null } };
      } finally { body.destroy(); }
    } finally { client.destroy(); }
  }
}
