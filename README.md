# Telnyx AI

This repo is the one-stop shop for AI Agents and AI-first developers building with Telnyx.

> [!NOTE]
> This repository is a work in progress under active development. We are continuously improving based on testing and feedback. Contributions and feedback encouraged!

## Table of contents

- [Agent Toolkit](#agent-toolkit) - integrate Telnyx APIs with popular agent frameworks including OpenAI's Agent SDK, LangChain, CrewAI, and Vercel's AI SDK through function calling — available in [Python](#python) and [TypeScript](#typescript).
  
- [Agent Skills](#agent-skills) - give AI coding assistants accurate, up-to-date context about Telnyx APIs and SDKs.
  
- [Agent CLI](#agent-cli) - provision and build on Telnyx infrastructure in a single command.

- [Telnyx Plugins](#plugins) - Install the Telnyx plugin for Claude Code, Cursor, or Gemini CLI to give your coding assistant Telnyx MCP server access and Telnyx Agent Skills.
 

## Agent Toolkit

Telnyx's Agent Toolkit enables popular agent frameworks including OpenAI's Agent SDK, LangChain, CrewAI, and Vercel's AI SDK to integrate with Telnyx APIs through function calling. The library includes support for Python and TypeScript, and is built directly on top of the Telnyx [Python][python-sdk] and [Node][node-sdk] SDKs.

Included below are basic instructions, but refer to [Python](/tools/python) and [TypeScript](/tools/typescript) packages for more information.

### Python

#### Installation

```sh
pip install telnyx-agent-toolkit
```

##### Requirements

- Python 3.11+

#### Usage

The library needs to be configured with your account's API key which is available in your [Telnyx Mission Control Portal][api-keys].

```python
from telnyx_agent_toolkit.openai.toolkit import TelnyxAgentToolkit

toolkit = TelnyxAgentToolkit(
    api_key="KEY_...",
    configuration={
        "actions": {
            "messaging": {"send_sms": True},
            "numbers": {"search_phone_numbers": True, "buy_phone_number": True}
        }
    }
)

tools = toolkit.get_openai_tools()
```

The toolkit works with OpenAI's Agent SDK, LangChain, and CrewAI and can be passed as a list of tools. For example:

```python
from agents import Agent

toolkit = TelnyxAgentToolkit(api_key="KEY_...")

agent = Agent(
    name="Telnyx Agent",
    instructions="You are an expert at integrating with Telnyx",
    tools=toolkit.get_openai_tools()
)
```

Examples for OpenAI's Agent SDK, LangChain, and CrewAI are included in [/examples](/tools/python/examples).

### TypeScript

#### Installation

```sh
npm install @telnyx/agent-toolkit
```

##### Requirements

- Node 18+

#### Usage

The library needs to be configured with your account's API key which is available in your [Telnyx Mission Control Portal][api-keys].

```typescript
import { TelnyxAgentToolkit } from "@telnyx/agent-toolkit/langchain";

const toolkit = new TelnyxAgentToolkit(process.env.TELNYX_API_KEY!, {
  configuration: {
    actions: {
      messaging: { send_sms: true },
      numbers: { search_phone_numbers: true, buy_phone_number: true },
    },
  },
});

const tools = toolkit.getLangChainTools();
```

The toolkit works with LangChain and Vercel's AI SDK and can be passed as a list of tools. For example:

```typescript
import { AgentExecutor, createStructuredChatAgent } from "langchain/agents";
import { TelnyxAgentToolkit } from "@telnyx/agent-toolkit/langchain";

const toolkit = new TelnyxAgentToolkit(process.env.TELNYX_API_KEY!);
const tools = toolkit.getLangChainTools();

const agent = await createStructuredChatAgent({
  llm,
  tools,
  prompt,
});

const agentExecutor = new AgentExecutor({
  agent,
  tools,
});
```

## Agent Skills

Install individual skills for your coding assistant via the [Skills CLI](https://github.com/vercel-labs/skills):

```sh
npx skills add team-telnyx/ai --skill <SKILL> --agent <AGENT>
```

> [!NOTE]
> See [Skills](/skills/README.md) for full install instrcuctions and comprehensive list of available skills

## Plugins

Install the Telnyx plugin to give your AI coding assistant MCP server access and 228 Agent Skills covering messaging, voice, numbers, AI, IoT, WebRTC, Twilio migration, and more.

### Claude Code

 ```sh
  /plugin marketplace add team-telnyx/ai
  /plugin install telnyx@telnyx
```
### Gemini CLI

 ```sh
  gemini extensions install team-telnyx/ai
```

### Cursor                                                

```sh
  /add-plugin telnyx
```
Note: Cursor marketplace listing is pending. In the meantime, install skills via the [Skills CLI](#agent-skills).

## Model Context Protocol (MCP)

Telnyx hosts a remote MCP server at `https://api.telnyx.com/v2/mcp`.

To run a local Telnyx MCP server using npx:

```sh
npx -y @telnyx/mcp --api-key=YOUR_TELNYX_API_KEY
```

See [MCP](/tools/mcp) for more details.

## Guides

Curl-first operational guides for common Telnyx workflows — SMS messaging, voice call control, AI assistants, phone numbers, verification, webhooks, 10DLC registration, WireGuard networking, and x402 payments.

See [Guides](/guides) for the full list.


## License

[MIT](LICENSE)
