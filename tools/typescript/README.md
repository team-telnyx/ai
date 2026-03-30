# @telnyx/agent-toolkit (TypeScript)

TypeScript toolkit for integrating Telnyx APIs with AI agent frameworks. Provides 18 pre-built tools for messaging, voice, AI, numbers, fax, IoT, and more.

## Features

- **Zero runtime dependencies** — core uses native `fetch()` (Node 18+)
- **18 Telnyx API tools** — messaging, voice, numbers, AI, fax, IoT, verification, lookup
- **Framework adapters** — OpenAI, Vercel AI SDK, LangChain.js
- **Permission filtering** — restrict which tools are available to the agent
- **TypeScript strict mode** — full type safety throughout

## Installation

```bash
npm install @telnyx/agent-toolkit

# Plus your framework of choice:
npm install openai                    # For OpenAI
npm install ai zod                    # For Vercel AI SDK
npm install @langchain/core zod       # For LangChain.js
```

## Quick Start

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
