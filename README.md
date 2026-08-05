# Telnyx AI

This repo is the one-stop shop for AI Agents and AI-first developers building with Telnyx — everything an agent needs to build production-grade applications and manage its account, from signup to funding.

> [!NOTE]
> This repository is a work in progress under active development. We are continuously improving based on testing and feedback. Contributions and feedback encouraged!

## Table of contents

- [Telnyx Plugins](#plugins) - Install the Telnyx plugin for Claude Code, Cursor, or Gemini CLI to give your coding assistant Telnyx MCP server access and Telnyx Agent Skills.

- [Agent Toolkit](#agent-toolkit) - integrate Telnyx APIs with popular agent frameworks including OpenAI's Agent SDK, LangChain, CrewAI, and Vercel's AI SDK through function calling — available in [Python](#python) and [TypeScript](#typescript).
  
- [Agent Skills](#agent-skills) - give AI agents accurate, up-to-date context about Telnyx APIs and SDKs, plus account-management skills for signup and payments (MPP and x402 account funding).
  
- [Agent CLI](#agent-cli) - provision and build on Telnyx infrastructure in a single command.

- [Model Context Protocol (MCP)](#model-context-protocol-mcp) - use Telnyx's generic API MCP proxy or app-layer MCP Apps.

- [Guides](#guides) - step-by-step tutorials for common workflows
 

## Plugins and Extensions

Install the Telnyx plugins you need to give your AI coding assistant Telnyx Agent Skills covering messaging, voice, numbers, AI, IoT, WebRTC, Twilio migration, account management (signup, MPP/x402 payments), and more. Plugins are split by product area so you only load the skills your project uses — see the ["Which plugin do I need?" table](/plugins/README.md#which-plugin-do-i-need). For direct Telnyx API access from your assistant, also add the hosted MCP server — see [MCP](#model-context-protocol-mcp).

Empowers agents to generate correct, production-ready code — and to manage their own accounts — without relying on pre-training or fragile doc retrieval.

### Claude Code Plugin

**Step 1.** Add the Telnyx marketplace (one-time setup):

```bash
/plugin marketplace add team-telnyx/ai
```

**Step 2.** Install the plugins you need — pick one or more:

```bash
/plugin install telnyx-messaging@telnyx  # SMS / MMS
/plugin install telnyx-voice@telnyx      # Voice API (call control, AMD, recording, etc.)
/plugin install telnyx-whatsapp@telnyx   # WhatsApp Business API
/plugin install telnyx-email@telnyx      # Email API
/plugin install telnyx-tts@telnyx        # Text-to-speech
/plugin install telnyx-stt@telnyx        # Speech-to-text
/plugin install telnyx-verify@telnyx     # Phone verification / 2FA
/plugin install telnyx-numbers@telnyx    # Number management, 10DLC, porting
/plugin install telnyx-webrtc@telnyx     # WebRTC and client SDKs
/plugin install telnyx-ai@telnyx         # AI inference and assistants
/plugin install telnyx-platform@telnyx   # Account, fax, IoT, networking, SIP, storage, TeXML, OAuth, Twilio migration
```

### Gemini CLI extension

 ```sh
  gemini extensions install https://github.com/team-telnyx/ai
```

### OpenCode

Install the Telnyx plugin for [OpenCode](https://opencode.ai) to add Telnyx as a model provider with automatic auth and a TUI for managing hosted models.

```sh
# Local (current project only)
opencode plugin @telnyx/opencode

# Global (all projects)
opencode plugin -g @telnyx/opencode
```

See [`plugins/opencode/README.md`](/plugins/opencode/README.md) for full setup and configuration.

### Cursor                                                

> [!NOTE]
> Note: Our Cursor Marketplace listing is pending. 

In the meantime, install skills via the [Skills CLI](#agent-skills).

Add the Telnyx MCP server to your project's `.cursor/mcp.json`:                                                                                                
```json       
  {                                                         
    "mcpServers": {
      "telnyx": {
        "type": "http",
        "url": "https://api.telnyx.com/v2/mcp"
      }
    }
  }
```

### Harnesses

Finalized Telnyx harness plugin repositories for OpenClaw and Hermes integrations:

**OpenClaw**

| Name | Description | Link |
| --- | --- | --- |
| Voice Call | Telnyx-first Voice Call provider plugin for OpenClaw realtime voice agents | [Repository](https://github.com/team-telnyx/telnyx-openclaw-voice-call) |
| Text-to-Speech | Telnyx TTS speech provider for OpenClaw — carrier-grade voice synthesis | [Repository](https://github.com/team-telnyx/telnyx-openclaw-tts) |
| Speech-to-Text | Telnyx STT provider for OpenClaw audio transcription | [Repository](https://github.com/team-telnyx/telnyx-openclaw-stt) |
| Embeddings | Telnyx embedding provider for OpenClaw memory search | [Repository](https://github.com/team-telnyx/telnyx-openclaw-embeddings) |
| Intelligence | Telnyx AI text-inference provider plugin for OpenClaw | [Repository](https://github.com/team-telnyx/telnyx-openclaw-intelligence) |
| SMS Channel | OpenClaw channel plugin for SMS/MMS via Telnyx Messaging API | [Repository](https://github.com/team-telnyx/telnyx-openclaw-sms-channel) |

**Hermes**

| Name | Description | Link |
| --- | --- | --- |
| Intelligence | Telnyx AI text-inference provider plugin for Hermes | [Repository](https://github.com/team-telnyx/telnyx-hermes-intelligence) |
| Text-to-Speech | Telnyx TTS speech-provider plugin for Hermes — WebSocket streaming, NaturalHD, and KokoroTTS voices | [Repository](https://github.com/team-telnyx/telnyx-hermes-tts) |
| Speech-to-Text | Telnyx STT transcription-provider plugin for Hermes — streaming speech recognition | [Repository](https://github.com/team-telnyx/telnyx-hermes-stt) |
| SMS | Telnyx SMS/MMS platform adapter for Hermes Agent | [Repository](https://github.com/team-telnyx/telnyx-hermes-sms) |

Hermes voice-call support is in progress and will be added once finalized.

## Agent Toolkit

Integrate Telnyx APIs with popular agent frameworks through function calling — available in [Python](/tools/python) and [TypeScript](/tools/typescript).

### Python

```sh
pip install telnyx-agent-toolkit
```

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

Works with OpenAI's Agent SDK, LangChain, and CrewAI. See [Python docs](/tools/python) for full usage and [examples](/tools/python/examples).

### TypeScript

```sh
npm install @telnyx/agent-toolkit
```

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

Works with LangChain and Vercel's AI SDK. See [TypeScript docs](/tools/typescript) for full usage.
 for the full list of commands and options.

## Agent Skills

Install individual skills for your coding assistant via the [Skills CLI](https://github.com/vercel-labs/skills):

```sh
npx skills add team-telnyx/ai --skill <SKILL> --agent <AGENT>
```

Skills cover two areas: **building with Telnyx** (messaging, voice, numbers, AI inference, WebRTC, Twilio migration, and more) and **account management** (programmatic [signup](https://telnyx.com/agent-signup.md), plus funding an account via MPP or x402 payments).

Skills are also published on telnyx.com for runtime discovery at [`/.well-known/agent-skills/index.json`](https://telnyx.com/.well-known/agent-skills/index.json).

> [!NOTE]
> See [Skills](/skills/README.md) for full install instructions and a comprehensive list of available skills


## Agent CLI

Composite commands that reduce multi-step Telnyx workflows to a single command. Built for AI agents and developers who want to provision infrastructure without orchestrating multiple API calls.

```sh
telnyx-agent setup-sms        # Buy number + create messaging profile + assign
telnyx-agent setup-voice       # Create SIP connection + buy number + assign
telnyx-agent setup-ai          # Create AI assistant + buy number + wire together
telnyx-agent setup-porting     # Check portability + create porting order + submit
telnyx-agent status            # Account health overview
```

Every command supports `--json` for machine-readable output.

See [Agent CLI](/cli)


## Model Context Protocol (MCP)

Telnyx hosts a remote MCP server at `https://api.telnyx.com/v2/mcp`.

To run a local Telnyx MCP server using npx:

```sh
npx -y @telnyx/mcp --api-key=YOUR_TELNYX_API_KEY
```

See [MCP](/tools/mcp) for more details about the generic API MCP proxy.

### MCP Apps

[`tools/mcp-apps`](/tools/mcp-apps) contains app-layer MCP servers with MCP Apps UI resources for focused Telnyx workflows. These are separate from the generic `@telnyx/mcp` proxy above.

Current apps:

- Number Intelligence (`tools/mcp-apps/apps/number-intelligence`)
- Usage & Cost Explorer (`tools/mcp-apps/apps/usage-cost-explorer`)
- Voice Monitor (`tools/mcp-apps/apps/voice-monitor`)

From `tools/mcp-apps`, use `npm install`, `npm run typecheck`, `npm run build`, and `npm test`.

## Guides

Curl-first operational guides for common Telnyx workflows — SMS messaging, voice call control, AI assistants, phone numbers, porting, verification, webhooks, 10DLC registration, WireGuard networking, MPP and x402 account payments, and Edge Compute handoff patterns.

For Edge Compute specifically, the goal is to make the handoff testable fast: start from a real `telnyx-edge` example, deploy it, and let `team-telnyx/ai` orchestrate against that live endpoint.

See [Guides](/guides) for the full list.

## Edge Compute

`team-telnyx/ai` does not currently own native Edge Compute lifecycle support.

Instead, this repo should be treated as the orchestration/discoverability layer, while the actual function lifecycle lives in the separate `team-telnyx/edge-compute` repo and the `telnyx-edge` CLI.

In practice:
- use `team-telnyx/ai` for agent workflows, capability discovery, and AI-oriented integration patterns
- use `team-telnyx/edge-compute` + `telnyx-edge` for function creation, deployment, secrets, bindings, and lifecycle management

The intended end state is a clean bridge:
- `ai` = orchestrates and explains
- Edge Compute = deploys and runs (prefer API-key auth for agent flows)
- the boundary between them is a documented HTTP/MCP/function contract

See [Edge Compute guide](/guides/edge-compute.md).


## License

[MIT](LICENSE)
