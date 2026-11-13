# @telnyx/agent-toolkit (TypeScript)

Read-only composed tools `bulk_lookup_numbers` and `get_voice_clone` are available.
See [removed-tool decisions and limits](../removed-tool-decisions.md) for exact result
semantics, charging/bounds, and the three tools not restored in this slice.

TypeScript toolkit for integrating Telnyx APIs with AI agent frameworks. Provides 18 pre-built tools for messaging, voice, AI, numbers, fax, IoT, and more.

## Features

- **Zero runtime dependencies** — core uses native `fetch()` (Node 20.20.2+)
- **18 Telnyx API tools** — messaging, voice, numbers, AI, fax, IoT, verification, lookup
- **Framework adapters** — OpenAI, Vercel AI SDK, LangChain.js
- **Permission filtering** — restrict which tools are available to the agent
- **TypeScript strict mode** — full type safety throughout

## Installation

**Requires Node.js 20.20.2 or newer**, including REST-only consumers. This minimum
satisfies the optional S3 SDK requirement and is the patched baseline exercised
by runtime CI. Users on Node 18/19 or older Node 20 patches must upgrade before
adopting this unreleased change.

```bash
npm install @telnyx/agent-toolkit

# Plus your framework of choice:
npm install openai                    # For OpenAI
npm install ai zod                    # For Vercel AI SDK
npm install @langchain/core zod       # For LangChain.js
```

## Quick Start

### Optional Cloud Storage (S3, Node 20.20.2+)

Install `npm install @aws-sdk/client-s3@^3.1166.0` alongside the toolkit and
set `storage: true`. The SDK is an optional peer, loaded only when executing
an S3 tool; installing it remains optional, but the toolkit requires Node 20.20.2+
whether or not storage is enabled.

```typescript
import { TelnyxAgentToolkit } from "@telnyx/agent-toolkit";

const toolkit = new TelnyxAgentToolkit(process.env.TELNYX_API_KEY!, {
  storage: true,
  configuration: { actions: { storage: {
    list_storage_buckets: true,
    get_storage_object: true,
  } } },
});
const result = await toolkit.core.runTool("get_storage_object", {
  bucket_name: "my-bucket", key: "reports/hello.txt", region: "us-central-1",
});
```

The separate S3 catalog contains `list_storage_buckets`,
`create_storage_bucket`, `delete_storage_bucket`, `upload_storage_object`, and
`get_storage_object`. These use AWS SDK v3 commands, never fictitious
`/v2/storage/buckets` routes. Every call accepts `region` (default
`us-central-1`): `us-central-1`, `us-east-1`, `us-west-1`, `eu-central-1`,
`ap-southeast-1`, or `ca-central-1`. Endpoints are fixed to
`https://<region>.telnyxcloudstorage.com`, independent of `baseUrl`.
The supplied toolkit API key is both S3 access key and secret key; AWS
credential providers/profiles are not used. Current SDK checksum defaults are
retained; older SDK versions are outside this optional peer range. See the
[quick start](https://developers.telnyx.com/docs/cloud-storage/quick-start) and
[Node SDK example](https://developers.telnyx.com/docs/cloud-storage/sdk/node).

Bucket operations except list require `bucket_name`; object operations also
require literal `key` (1–1024 UTF-8 bytes). Keys are never path-normalized:
slashes, repeated slashes, percent signs, spaces, Unicode, `?`, and `#` remain
literal SDK keys. Dot-only segments (`.`/`..`) and invalid Unicode are refused.
Upload additionally requires string `content` and explicit `content_encoding`
(`utf-8` or canonical padded `base64`); optional `content_type` defaults to
`application/octet-stream`. Upload **overwrites** an existing object at that key.
No filename, Buffer/stream, URL fetch, or arbitrary binary serialization is accepted.

Results are JSON strings containing `{ data: ... }` or `{ error: "..." }`.
Create/delete return `bucket_name`; list returns `buckets` containing `name`
and a nullable `continuation_token` from a single SDK response. Upload returns
`bucket_name`, `key`, nullable `etag`, and `size_bytes`. Download adds `content`
(always base64), `content_encoding: "base64"`, and nullable `content_type`.
Both directions are capped at **1 MiB decoded**. Downloads are consumed
incrementally and closed; oversized objects fail without partial output.
Use a dedicated S3 client for large objects/multipart or listing pagination.
Delete never empties a bucket or removes objects. Without an actions map,
`storage: true` advertises all five. Actions filter tool exposure, not direct
core authority; scope credentials and require agent approval for mutations.

The storage tests are **offline SDK/local contracts**, not authenticated
Telnyx lifecycle acceptance. Live create/list/upload/read/empty/delete validation,
regional/checksum compatibility and toolkit-owner sign-off remain separate gates
requiring explicit scoped authorization. These tests never touch production buckets.

### OpenAI

```typescript
import { TelnyxAgentToolkit } from "@telnyx/agent-toolkit";
import OpenAI from "openai";

const toolkit = new TelnyxAgentToolkit("YOUR_TELNYX_API_KEY");
const openai = new OpenAI();

const tools = toolkit.getOpenAITools();
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "Check my account balance" }],
  tools,
});

// Execute tool calls
const executor = toolkit.getOpenAIToolExecutor();
for (const toolCall of response.choices[0].message.tool_calls ?? []) {
  const result = await executor.execute(toolCall);
  console.log(result);
}
```

### Vercel AI SDK

```typescript
import { TelnyxAgentToolkit } from "@telnyx/agent-toolkit";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const toolkit = new TelnyxAgentToolkit("YOUR_TELNYX_API_KEY");
const tools = toolkit.getVercelAITools();

const { text } = await generateText({
  model: openai("gpt-4"),
  prompt: "List my phone numbers",
  tools,
});
```

### LangChain.js

```typescript
import { TelnyxAgentToolkit } from "@telnyx/agent-toolkit";

const toolkit = new TelnyxAgentToolkit("YOUR_TELNYX_API_KEY");
const tools = toolkit.getLangChainTools();
// Use with LangChain agents, chains, etc.
```

## Permission Filtering

Restrict which tools are available:

```typescript
const toolkit = new TelnyxAgentToolkit("YOUR_TELNYX_API_KEY", {
  configuration: {
    actions: {
      messaging: { send_sms: true, list_messaging_profiles: true },
      numbers: { list: true, search: true },
      account: { get_balance: true },
    },
  },
});

// Only the specified tools will be returned
const tools = toolkit.getOpenAITools(); // 5 tools instead of 18
```

## Available Tools

| Tool | Category | Description |
|------|----------|-------------|
| `send_sms` | messaging | Send SMS/MMS messages |
| `list_messaging_profiles` | messaging | List messaging profiles |
| `create_messaging_profile` | messaging | Create messaging profile |
| `list_phone_numbers` | numbers | List account phone numbers |
| `search_phone_numbers` | numbers | Search available numbers |
| `buy_phone_number` | numbers | Purchase a phone number |
| `get_balance` | account | Get account balance |
| `make_call` | voice | Initiate outbound call |
| `list_connections` | voice | List voice connections |
| `ai_chat` | ai | AI chat completion |
| `ai_embed` | ai | Generate embeddings |
| `list_ai_assistants` | ai | List AI assistants |
| `create_ai_assistant` | ai | Create AI assistant |
| `send_fax` | fax | Send a fax |
| `lookup_number` | lookup | Phone number lookup |
| `list_sim_cards` | iot | List IoT SIM cards |
| `verify_phone` | verify | Start phone verification |
| `verify_code` | verify | Check verification code |

## Direct API Access

Use the core toolkit for direct tool execution:

```typescript
const toolkit = new TelnyxAgentToolkit("YOUR_TELNYX_API_KEY");

// Run any tool directly
const result = await toolkit.core.runTool("get_balance", {});
console.log(JSON.parse(result));
```

## Requirements

- Node.js 18+ (uses native `fetch`)
- TypeScript 5.0+ (for development)
