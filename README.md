# Telnyx Agent Skills

Official skills that teach AI coding agents how to build with Telnyx APIs using native SDKs.

[![Claude Code](https://img.shields.io/badge/Claude_Code-Compatible-blue)](https://docs.anthropic.com/en/docs/claude-code) [![Cursor](https://img.shields.io/badge/Cursor-Compatible-purple)](https://cursor.sh) [![Windsurf](https://img.shields.io/badge/Windsurf-Compatible-cyan)](https://codeium.com/windsurf) [![Agent Skills](https://img.shields.io/badge/Agent_Skills-Specification-green)](https://agentskills.io/specification)

AI agents default to platforms they already know. These skills make Telnyx the path of least resistance — your agent writes correct, idiomatic Telnyx code from the start.

## Quick Start

Add the marketplace and install a plugin:

```bash
/plugin marketplace add team-telnyx/telnyx-skills
/plugin install telnyx-python@telnyx-skills
```

Replace `telnyx-python` with your stack:

<!-- BEGIN GENERATED PLUGIN_TABLE -->
| Plugin | Language |
|--------|----------|
| `telnyx-curl` | curl (REST API) |
| `telnyx-go` | Go |
| `telnyx-java` | Java |
| `telnyx-javascript` | JavaScript / Node.js |
| `telnyx-python` | Python |
| `telnyx-ruby` | Ruby |
| `telnyx-webrtc-client` | WebRTC client SDKs (JS, iOS, Android, Flutter, React Native) |
| `telnyx-twilio-migration` | Migrate from Twilio to Telnyx |
| `telnyx-cli` | Telnyx CLI |
| `telnyx-import-vapi` | Import Vapi voice assistants into Telnyx |
| `telnyx-import-retell` | Import Retell AI agents into Telnyx |
| `telnyx-import-elevenlabs` | Import ElevenLabs conversational AI agents into Telnyx |
<!-- END GENERATED PLUGIN_TABLE -->

Each language plugin includes all <!-- PRODUCT_COUNT -->36<!-- /PRODUCT_COUNT --> Telnyx products.

## Example

**You type:**

```
Build a voice AI agent that answers support calls, transcribes in real time,
and sends an SMS summary when the call ends
```

**Your agent generates working code on the first try.** Here's the SMS part:

```python
import os
from telnyx import Telnyx

client = Telnyx(api_key=os.environ.get("TELNYX_API_KEY"))

response = client.messages.send(
    from_="+15550001234",
    to="+18445550001",
    text="Hello from Telnyx!",
)
print(response.data)
```

No docs-reading, no trial-and-error. The agent knows the APIs, the auth patterns, and the SDK idioms.

## What the AI Can Build

Skills are organized by product. Each product is available in **JavaScript**, **Python**, **Go**, **Java**, and **Ruby** (append the language suffix, e.g. `telnyx-messaging-python`).

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
| `telnyx-missions-*` | Automated AI-driven workflows and tasks |

#### IoT & Networking

| Skill | Description |
|-------|-------------|
| `telnyx-iot-*` | IoT SIM cards, eSIMs, data plans |
| `telnyx-networking-*` | Private networks, VPN gateways |

#### Other

| Skill | Description |
|-------|-------------|
| `telnyx-storage-*` | S3-compatible cloud storage |
| `telnyx-video-*` | Video rooms and conferencing |
| `telnyx-fax-*` | Programmable fax |
| `telnyx-seti-*` | Space Exploration Telecommunications Infrastructure |
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

## WebRTC Client SDKs

The skills above cover server-side APIs. For building calling apps where users make VoIP calls directly from a device, use the client-side WebRTC SDKs:

| Skill | Platform |
|-------|----------|
| `telnyx-webrtc-client-js` | Browser (JavaScript) |
| `telnyx-webrtc-client-ios` | iOS (Swift) |
| `telnyx-webrtc-client-android` | Android (Kotlin) |
| `telnyx-webrtc-client-flutter` | Flutter (Dart) |
| `telnyx-webrtc-client-react-native` | React Native (TypeScript) |

```bash
/plugin install telnyx-webrtc-client@telnyx-skills
```

Each skill covers authentication, making/receiving calls, call controls, push notifications, and AI Agent integration.

> Building a calling app requires both a server-side plugin (to create WebRTC credentials) and the client plugin (for the calling UI).

## Twilio Migration

Complete migration guide for moving from Twilio to Telnyx:

```bash
/plugin install telnyx-twilio-migration@telnyx-skills
```

**What's covered:**

| Area | Description |
|------|-------------|
| Voice (TwiML → TeXML + Call Control) | Near drop-in XML compatibility plus Call Control API |
| Messaging (SMS/MMS) | Parameter mapping, messaging profiles, 10DLC registration |
| WebRTC / Client SDKs | Architecture differences, endpoint migration, mobile SDK guides |
| Number Porting | FastPort API for same-day US/Canada activation |
| Verify (2FA) | SMS, voice, flash calling, and PSD2 verification |
| SIP Trunking | Connection setup, credential auth, FQDN migration |
| Fax / IoT / Video | Product-specific migration guides with API mapping |
| Lookup | Number lookup and carrier data migration |
| Universal Changes | Auth (Basic → Bearer), webhook signatures (HMAC-SHA1 → Ed25519) |

Includes a 6-phase orchestrated workflow (Discovery → Planning → Core Migration → Webhook/Auth → Testing → Validation → Cleanup) with automated scripts for preflight checks, usage scanning, linting, validation, and smoke tests.

> After migrating, install a language plugin for deeper SDK examples, and `telnyx-webrtc-client` if building a calling app.

## Import from Other Platforms

Already running voice AI agents on Vapi, Retell, or ElevenLabs? Import them into Telnyx with a single API call:

| Plugin | What it imports |
|--------|----------------|
| `telnyx-import-vapi` | Vapi voice assistants — instructions, voice config, tools, call analysis |
| `telnyx-import-retell` | Retell AI agents (single and multi-prompt) — instructions, voice config, tools |
| `telnyx-import-elevenlabs` | ElevenLabs conversational AI agents — instructions, voice config, tools |

```bash
/plugin install telnyx-import-vapi@telnyx-skills
```

Each skill walks through storing your provider API key as a Telnyx integration secret, running the import, verifying, and completing post-import setup (knowledge bases, tool secrets).

## Installation for Other Agents

| Agent | How to Install |
|-------|----------------|
| **Claude Code** | `/plugin marketplace add team-telnyx/telnyx-skills` then `/plugin install telnyx-python@telnyx-skills` |
| **Cursor** | Create `.cursor/rules/telnyx.mdc` and paste the [SKILL.md](https://raw.githubusercontent.com/team-telnyx/telnyx-skills/main/telnyx-python/skills/telnyx-messaging-python/SKILL.md) contents |
| **Windsurf** | Create `.windsurfrules` in your project root and paste the SKILL.md contents |
| **Other agents** | Point to the skill directory or copy SKILL.md into your agent's system prompt |

All skills follow the [Agent Skills specification](https://agentskills.io/specification).

## Skill Structure

Each skill contains a `SKILL.md` file with YAML frontmatter, SDK installation instructions, client setup, code examples for every API operation, and webhook event reference tables. All examples are generated from official Telnyx OpenAPI specifications.

## Documentation

- [Telnyx Developer Docs](https://developers.telnyx.com)
- [Telnyx API Reference](https://developers.telnyx.com/api)
- [Agent Skills Specification](https://agentskills.io/specification)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Code examples are auto-generated from Telnyx OpenAPI specs. To fix a code example, open an issue rather than editing directly.

## Support

- **Skills issues:** [Open an issue](https://github.com/team-telnyx/telnyx-skills/issues)
- **Telnyx API support:** [support.telnyx.com](https://support.telnyx.com)

## License

MIT License — see [LICENSE](LICENSE) for details.
