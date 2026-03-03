# Telnyx Agent Skills

Official skills for AI coding agents to integrate Telnyx APIs using the native SDKs.

These skills follow the [Agent Skills specification](https://agentskills.io/specification) and can be installed in AI coding assistants like [Claude Code](https://docs.anthropic.com/en/docs/claude-code), Cursor, Windsurf, and other compatible agents.

## Quick Start (Claude Code)

**Step 1.** Add the Telnyx skills marketplace (one-time setup):

```bash
/plugin marketplace add team-telnyx/telnyx-skills
```

**Step 2.** Install a plugin — pick your language, or the WebRTC client-side plugin:

```bash
/plugin install telnyx-python@telnyx-skills
```

Replace `telnyx-python` with the plugin for your stack:

<!-- BEGIN GENERATED PLUGIN_TABLE -->
| Plugin | Language |
|--------|----------|
| `telnyx-go` | Go |
| `telnyx-java` | Java |
| `telnyx-javascript` | JavaScript / Node.js |
| `telnyx-python` | Python |
| `telnyx-ruby` | Ruby |
| `telnyx-webrtc-client` | WebRTC client SDKs (JS, iOS, Android, Flutter, React Native) |
| `telnyx-twilio-migration` | Migrate from Twilio to Telnyx |
<!-- END GENERATED PLUGIN_TABLE -->

Each language plugin includes all <!-- PRODUCT_COUNT -->36<!-- /PRODUCT_COUNT --> Telnyx products (messaging, voice, numbers, IoT, AI, and more).

The WebRTC client plugin covers building VoIP calling apps — see [WebRTC Client SDKs](#webrtc-client-sdks) for details.

## Example

After installing, your AI agent knows how to write correct Telnyx SDK code:

```python
import os
from telnyx import Telnyx

client = Telnyx(api_key=os.environ.get("TELNYX_API_KEY"))

# Send an SMS
response = client.messages.send(
    from_="+15550001234",
    to="+18445550001",
    text="Hello from Telnyx!",
)
print(response.data)
```

## Available Skills

Skills are organized by product and language. Each product is available in **JavaScript**, **Python**, **Go**, **Java**, and **Ruby** (append the language suffix, e.g. `telnyx-messaging-python`).

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

```bash
/plugin install telnyx-webrtc-client@telnyx-skills
```

> **Note:** Building a calling app typically requires both plugins — a server-side plugin (e.g. `telnyx-python`) to create WebRTC credentials and generate login tokens, and `telnyx-webrtc-client` for the client-side calling UI.

## Twilio Migration

A comprehensive migration guide for moving from Twilio to Telnyx across all product areas.

```bash
/plugin install telnyx-twilio-migration@telnyx-skills
```

**What's covered:**

| Area | Description |
|------|-------------|
| Voice (TwiML → TeXML) | Near drop-in XML compatibility with complete verb reference (15 verbs, 8 nouns) |
| Messaging (SMS/MMS) | Parameter mapping, messaging profiles, 10DLC registration |
| WebRTC / Client SDKs | Architecture differences, endpoint migration decision trees |
| Number Porting | FastPort API for same-day US/Canada activation |
| Verify (2FA) | SMS, voice, flash calling, and PSD2 verification |
| Universal Changes | Auth (Basic → Bearer), webhook signatures (HMAC-SHA1 → Ed25519), payload structure |

Includes utility scripts for environment validation (`preflight-check.sh`) and TwiML/TeXML compatibility checking (`validate-texml.sh`), plus parameter-by-parameter mapping tables and multi-language code examples.

> **Note:** After migrating, install a language plugin (e.g. `telnyx-python`) for deeper SDK examples, and `telnyx-webrtc-client` if building a calling app.

## Installation for Other Agents

### Cursor

1. Open **Cursor Settings > Rules > Project Rules**
2. Create a rule file (e.g., `.cursor/rules/telnyx.mdc`)
3. Paste the contents of the `SKILL.md` for the product and language you need

You can find skill files in this repo under `telnyx-{language}/skills/telnyx-{product}-{language}/SKILL.md`, or fetch them directly:

```
https://raw.githubusercontent.com/team-telnyx/telnyx-skills/main/telnyx-python/skills/telnyx-messaging-python/SKILL.md
```

### Windsurf

1. Create a `.windsurfrules` file in your project root
2. Paste the contents of the desired `SKILL.md` file(s) into it

### Other Agents

For any agent that supports the [Agent Skills specification](https://agentskills.io/specification), point it to the skill directory or `SKILL.md` file. For agents without native skill support, copy the contents of the relevant `SKILL.md` into your agent's system prompt or rules file.

## Skill Structure

Each skill contains a single `SKILL.md` file with YAML frontmatter, SDK installation instructions, client setup, code examples for every API operation, and webhook event reference tables where applicable. All code examples are generated from the official Telnyx OpenAPI specifications.

## Documentation

- [Telnyx Developer Docs](https://developers.telnyx.com)
- [Telnyx API Reference](https://developers.telnyx.com/api)
- [Agent Skills Specification](https://agentskills.io/specification)

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Note:** Code examples are auto-generated from Telnyx OpenAPI specs. To fix a code example, please open an issue describing the problem rather than editing the code directly.

## Support

For issues with these skills, please [open an issue](https://github.com/team-telnyx/telnyx-skills/issues) in this repository.

For Telnyx API support, visit [support.telnyx.com](https://support.telnyx.com).

## License

MIT License - see [LICENSE](LICENSE) for details.
