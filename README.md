# Telnyx AI

This repo is the one-stop shop for building AI-powered products and businesses on top of Telnyx.

It contains a collection of SDKs to help you integrate Telnyx with LLMs and agent frameworks, including:

* [`telnyx-agent-toolkit`](/tools/python) - for integrating Telnyx APIs with popular agent frameworks through function calling — available in [Python](/tools/python) and [TypeScript](/tools/typescript).
* [Agent Skills](/skills) - for giving coding assistants accurate, up-to-date context about Telnyx APIs and SDKs.
* [Agent CLI](/cli) - for provisioning Telnyx infrastructure in a single command.

## Model Context Protocol (MCP)

Telnyx hosts a remote MCP server at `https://api.telnyx.com/v2/mcp`.

To run a local Telnyx MCP server using npx:

```sh
npx -y @telnyx/mcp --api-key=YOUR_TELNYX_API_KEY
```

See [MCP](/tools/mcp) for more details.

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
npx skills add team-telnyx/ai --skill telnyx-messaging-python --agent cursor
```

Or install the full Telnyx plugin via Claude Code:

```sh
/plugin marketplace add team-telnyx/ai
/plugin install telnyx@telnyx
```

See [Skills](/skills) for the full list of available skills.

[python-sdk]: https://github.com/team-telnyx/telnyx-python
[node-sdk]: https://github.com/team-telnyx/telnyx-node
[api-keys]: https://portal.telnyx.com/#/app/api-keys

## License

[MIT](LICENSE)
