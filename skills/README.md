# Telnyx Agent Skills

Official Agent Skills for building on Telnyx and managing your Telnyx account.

These skills give agents structured, up-to-date context to generate correct, production-ready code — and to handle account management like signup and payments — without relying on pre-training or fragile doc retrieval.

They include accurate schemas, SDK patterns, workflows, and API references, so agents can build production-grade applications on Telnyx — with account management (signup, funding, payments) covered alongside.

Telnyx Agent Skills follow the [Agent Skills specification](https://agentskills.io/specification) and are compatible with coding agents like Claude Code, Cursor, Windsurf, and others.

> [!NOTE]
> This repository is a work in progress under active development. Skills are being continuously improved based on testing and feedback, and updated to reflect the latest APIs and SDK patterns. Contributions and feedback encouraged!

## Table of contents

- [Installation Quickstart](#installation-quickstart)
- [Skills CLI installation](#skills-cli-installation)
- [Claude Code plugins installation](#install-claude-code-plugins)
- [Telnyx API and SDKs](#available-skills)
- [Payments](#payments)
- [WebRTC client SDKs](#webrtc-client-sdks)
- [Twilio Migration](#twilio-migration)

## Installation Quickstart

Choose your setup:

- [Skills CLI (Codex, Cursor, etc.)](#skills-cli-installation)
- [Claude Code plugins](#install-claude-code-plugins)

### Skills CLI installation

Install a skill for your agent:

```bash
npx skills add team-telnyx/ai --skill <SKILL> --agent <AGENT>
```

**Example:**
```bash
npx skills add team-telnyx/ai --skill telnyx-voice-python --agent codex
```

A comprehensive list of available skills **(values for `<SKILL>`)** can be found in the [Available Skills](#available-skills) section.

A comprehensive list of supported agents **(values for `<AGENT>`)** can be found [here](https://github.com/vercel-labs/skills#supported-agents).

#### Codex
```bash
npx skills add team-telnyx/ai --skill <SKILL> --agent codex
```

#### Claude Code
```bash
npx skills add team-telnyx/ai --skill <SKILL> --agent claude-code
```

#### Cursor
```bash
npx skills add team-telnyx/ai --skill <SKILL> --agent cursor
```

#### OpenClaw
```bash
npx skills add team-telnyx/ai --skill <SKILL> --agent openclaw
```

#### Gemini CLI
```bash
npx skills add team-telnyx/ai --skill <SKILL> --agent gemini-cli
```

#### GitHub Copilot
```bash
npx skills add team-telnyx/ai --skill <SKILL> --agent github-copilot
```

#### OpenCode
```bash
npx skills add team-telnyx/ai --skill <SKILL> --agent opencode
```

### Other supported agents

Telnyx skills work with all agents supported by the Skills CLI.

[See full list of supported agents](https://github.com/vercel-labs/skills#supported-agents)

> Agents automatically use installed skills when generating code. No additional configuration required.

> [!IMPORTANT]
> Use only the skills your project actually needs. Loading too many skills wastes tokens, dilutes context, and makes it easier for an agent to confuse SDK patterns.

## Available Skills

Skills are organized by product and language. Each product skill is available in **Curl**, **JavaScript**, **Python**, **Go**, **Java**, and **Ruby** .

**(Values in the "Skill" column in the tables below can be used for `<SKILL>`)** in the install command. Append the language suffix to replace * , e.g. `telnyx-voice-go` : 

```bash
npx skills add team-telnyx/ai --skill <SKILL> --agent <AGENT>
```

Example:
```bash
npx skills add team-telnyx/ai --skill telnyx-messaging-python --agent cursor
```

<!-- BEGIN GENERATED SKILLS_TABLE -->
#### Messaging

| Skill | Description |
|-------|-------------|
| `telnyx-messaging-*` | Send/receive SMS/MMS, manage messaging numbers, handle opt-outs |
| `telnyx-messaging-profiles-*` | Messaging profiles, number pools, short codes |
| `telnyx-messaging-hosted-*` | Hosted SMS numbers, toll-free verification, RCS |
| `telnyx-10dlc-*` | 10DLC brand/campaign registration for A2P compliance |

#### Voice & Communications

| Skill | Description |
|-------|-------------|
| `telnyx-voice-*` | Call control: dial, answer, hangup, transfer, bridge |
| `telnyx-voice-media-*` | Audio playback, text-to-speech, call recording |
| `telnyx-voice-gather-*` | DTMF/speech input collection, AI-powered gather |
| `telnyx-voice-streaming-*` | Real-time audio streaming, forking, transcription |
| `telnyx-voice-conferencing-*` | Conference calls, queues, multi-party sessions |
| `telnyx-voice-advanced-*` | DTMF sending, SIPREC, noise suppression, supervisor |
| `telnyx-texml-*` | TeXML (TwiML-compatible) voice applications |
| `telnyx-sip-*` | SIP trunking connections, outbound voice profiles |
| `telnyx-sip-integrations-*` | Call recordings, media storage, Dialogflow integration |
| `telnyx-webrtc-*` | WebRTC credentials and push notification setup (server-side — see [Client SDKs](#webrtc-client-sdks) for the calling UI) |

#### Numbers

| Skill | Description |
|-------|-------------|
| `telnyx-numbers-*` | Search, order, and manage phone numbers |
| `telnyx-numbers-config-*` | Phone number configuration and settings |
| `telnyx-numbers-compliance-*` | Regulatory requirements, bundles, documents |
| `telnyx-numbers-services-*` | Voicemail, voice channels, E911 |
| `telnyx-porting-in-*` | Port numbers into Telnyx |
| `telnyx-porting-out-*` | Manage port-out requests |
| `telnyx-verify-*` | Phone verification, number lookup, 2FA |

#### AI

| Skill | Description |
|-------|-------------|
| `telnyx-ai-assistants-*` | AI voice assistants with knowledge bases |
| `telnyx-ai-inference-*` | LLM inference, embeddings, AI analytics |
| `telnyx-meeting-bot` | Join, observe, react in, transcribe, and summarize Zoom, Google Meet, Microsoft Teams, and Webex meetings |
| `telnyx-missions-*` | Automated AI-driven workflows and tasks |

#### IoT & Networking

| Skill | Description |
|-------|-------------|
| `telnyx-iot-*` | IoT SIM cards, eSIMs, data plans |
| `telnyx-networking-*` | Private networks, VPN gateways |

#### Other

| Skill | Description |
|-------|-------------|
| `telnyx-email-curl` | Send transactional email, batch sends, scheduled delivery, templates, validation |
| `telnyx-email-inbound-curl` | Manage inboxes, list/search messages, threads, reply/forward |
| `telnyx-email-domains-curl` | Manage sending domains, DNS verification, health, domain webhooks |
| `telnyx-email-suppressions-curl` | Suppression lists, import/export, unsubscribe groups |
| `telnyx-storage-*` | S3-compatible cloud storage |
| `telnyx-video-*` | Video rooms and conferencing |
| `telnyx-fax-*` | Programmable fax |
| `telnyx-oauth-*` | OAuth 2.0 authentication flows |

#### Account

| Skill | Description |
|-------|-------------|
| `telnyx-account-*` | Balance, payments, invoices, webhooks, audit logs |
| `telnyx-account-access-*` | Addresses, auth providers, IP access, billing groups |
| `telnyx-account-management-*` | Sub-account management (resellers) |
| `telnyx-account-notifications-*` | Notification channels and settings |
| `telnyx-account-reports-*` | Usage reports for billing and analytics |
<!-- END GENERATED SKILLS_TABLE -->

## Payments

Fund a Telnyx account programmatically — built for agentic payment flows where an AI agent adds account credit on your behalf. No account yet? Agents can sign up programmatically first via the [bot signup skill](https://telnyx.com/agent-signup.md).

Available payment skills:

| Skill | Description |
|-------|-------------|
| `telnyx-mpp-payment` | Add account credit via Machine Payment Protocol (HTTP 402) using Stripe Link or Tempo USDC, then verify the transaction and balance |
| `telnyx-x402-payment` | Fund an account with USDC on Base via the x402 protocol — quoting, EIP-712 signing, and settlement |

> **Note:** These payments move real funds. Both skills include verification steps and safe support-handoff guidance.

## WebRTC Client SDKs

The skills above cover **server-side** Telnyx APIs (REST calls from your backend). If you're building a **calling app** where users make or receive VoIP calls directly from a device, you also need the client-side WebRTC SDKs.

These are platform-specific native libraries — separate from the server-side language plugins:

| Skill | Platform | Language |
|-------|----------|----------|
| `telnyx-webrtc-client-js` | Browser | JavaScript |
| `telnyx-webrtc-client-ios` | iOS | Swift |
| `telnyx-webrtc-client-android` | Android | Kotlin |
| `telnyx-webrtc-client-flutter` | Flutter (Android/iOS/Web) | Dart |
| `telnyx-webrtc-client-react-native` | React Native (Android/iOS) | TypeScript |

Each skill covers authentication, making/receiving calls, call controls (hold, mute, transfer), push notifications, call quality metrics, and AI Agent integration.

> **Note:** Building a calling app typically requires multiple skills — a server-side plugin (e.g. `telnyx-voice-python`) to create WebRTC credentials and generate login tokens, and `telnyx-webrtc-client-X` for the client-side calling UI.

## Twilio Migration

A comprehensive 6-phase orchestrated agent workflow for moving apps from Twilio to Telnyx across all product areas.

#### Install command:
```bash
npx skills add team-telnyx/ai --skill telnyx-twilio-migration --agent <AGENT>
```

**What's covered:**

| Area | Description |
|------|-------------|
| Voice (TwiML → TeXML + Call Control) | Near drop-in XML compatibility (15 verbs, 8 nouns) plus Call Control API for real-time call manipulation |
| Messaging (SMS/MMS) | Parameter mapping, messaging profiles, 10DLC registration |
| WebRTC / Client SDKs | Architecture differences, endpoint migration, mobile SDK guides (iOS, Android, Flutter, React Native) |
| Number Porting | FastPort API for same-day US/Canada activation |
| Verify (2FA) | SMS, voice, flash calling, and PSD2 verification |
| SIP Trunking | Connection setup, credential auth, FQDN migration |
| Fax / IoT / Video | Product-specific migration guides with API mapping |
| Lookup | Number lookup and carrier data migration |
| Universal Changes | Auth (Basic → Bearer), webhook signatures (HMAC-SHA1 → Ed25519), `client.webhooks.unwrap()` verification |

**6-phase orchestrated workflow** — Discovery → Planning → Core Migration → Webhook/Auth → Testing → Validation → Cleanup — with automated scripts:

| Script | Purpose |
|--------|---------|
| `preflight-check.sh` | Pre-migration environment and dependency validation |
| `scan-twilio-usage.sh` | Detect all Twilio usage across the codebase |
| `lint-telnyx-correctness.sh` | Static analysis for common Telnyx SDK mistakes |
| `validate-migration.sh` | Post-migration validation (webhooks, env vars, API patterns) |
| `smoke-test.sh` | Runtime smoke tests against the live Telnyx API |
| `test-*.sh` | Product-specific integration tests (messaging, voice, verify, SIP, WebRTC, fax, lookup) |

Includes parameter-by-parameter mapping tables, multi-language code examples (Python, Node, Go, Java, Ruby, curl), error code mapping, and migration plan/report templates.

> **Note:** After migrating, install the product plugins you use (e.g. `telnyx-messaging@telnyx`, `telnyx-voice@telnyx`) for deeper SDK examples, and `telnyx-webrtc@telnyx` if building a calling app.

## Install Claude Code Plugin

Telnyx ships one plugin per product area, so you install only the skills your project needs (see the token-hygiene note above).

**Step 1.** Add the Telnyx marketplace (one-time setup):

```bash
/plugin marketplace add team-telnyx/ai
```

**Step 2.** Install the plugins you need — pick one or more:

```bash
/plugin install telnyx-developer-kit@telnyx  # Curated build workflow, hosted MCP access, and Twilio switching
/plugin install telnyx-messaging@telnyx  # SMS / MMS
/plugin install telnyx-voice@telnyx      # Voice API (call control, AMD, recording, etc.)
/plugin install telnyx-whatsapp@telnyx   # WhatsApp Business API
/plugin install telnyx-email@telnyx      # Email API
/plugin install telnyx-tts@telnyx        # Text-to-speech
/plugin install telnyx-stt@telnyx        # Speech-to-text
/plugin install telnyx-verify@telnyx     # Phone verification / 2FA
/plugin install telnyx-numbers@telnyx    # Number management, 10DLC, porting
/plugin install telnyx-webrtc@telnyx     # WebRTC and client SDKs
/plugin install telnyx-ai@telnyx         # AI inference, assistants, and Meeting Bot
/plugin install telnyx-platform@telnyx   # Account, fax, IoT, networking, SIP, storage, TeXML, OAuth, Twilio migration
```

Each plugin bundles that product's skills, and every skill lives in exactly one plugin — install any combination and you'll never load duplicates or waste context. Not sure which you need? See the ["Which plugin do I need?" table](/plugins/README.md#which-plugin-do-i-need). For direct Telnyx API access from your assistant, also add the hosted MCP server (`https://api.telnyx.com/v2/mcp`) — see the [MCP section](/README.md#model-context-protocol-mcp) of the root README.

## Skill Structure

Each skill contains a single `SKILL.md` file with YAML frontmatter, SDK installation instructions, client setup, code examples for every API operation, and webhook event reference tables where applicable. All code examples are generated from the official Telnyx OpenAPI specifications.

The canonical artifact format is:

- `SKILL.md`
- `references/api-details.md` when overflow API detail is needed

**Note:** Skill generation and publishing logic live in the separate internal repository. If you discover an error, please open an issue on this repo describing the problem.

#### Alternative (manual) skill installation - clone and copy specific skills

```bash

git clone https://github.com/team-telnyx/ai.git

# Copy the skill into your agent's skills directory
mkdir -p .github/skills

# Example:
cp -r ai/skills/telnyx-messaging-python .github/skills/
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](../.github/CONTRIBUTING.md) for guidelines — in particular the split between auto-generated skills (open an issue) and hand-authored skills (PRs welcome).

## Support

For issues with these skills, please [open an issue](https://github.com/team-telnyx/ai/issues) in this repository.

For Telnyx API support, visit [support.telnyx.com](https://support.telnyx.com).

## License

MIT License - see [LICENSE](LICENSE) for details.

Maintained by [@aisling404](https://github.com/aisling404) (Telnyx)
