# Telnyx Agent Skills

Official skills for AI coding agents to integrate Telnyx APIs using the native SDKs.

These skills follow the [Agent Skills specification](https://agentskills.io/specification) and can be installed in AI coding assistants like Claude Code, Cursor, Windsurf, and other compatible agents.

> [!NOTE]
> This repository is under active development. Skills are being expanded, updated to reflect current SDK patterns, and reviewed to reduce incorrect or hallucinated API usage by coding agents.

## Quick Start

### Any Agent

Install skills in any compatible agent that supports the `skills` installer, including Claude Code, Cursor, Copilot, Codex, Windsurf, Roo Code, and other compatible tools:

```bash
npx skills add team-telnyx/telnyx-skills
```

This opens an interactive picker to select the skills you need. Only selected skills are loaded into context.

To update installed skills:

```bash
npx skills update
```

If your agent does not support `npx skills`, copy the skill folder directly from this repo:

1. Find the skill you need, for example:
   - `telnyx-python/skills/telnyx-messaging-python/`
   - `telnyx-javascript/skills/telnyx-voice-javascript/`
2. Copy the whole skill folder, including `SKILL.md` and `references/` if present, into your tool's skills directory.

If your tool does not support `npx skills`, copy the skill folder into that tool's configured skills directory. If your tool does not support folder-based skills, paste the contents of `SKILL.md` into the tool's instructions or rules file and keep the linked references available alongside it.

Verified manual install locations from current tool docs:

- GitHub Copilot: `.github/skills/` or `~/.copilot/skills/`
- Windsurf: `.windsurf/skills/` or `~/.codeium/windsurf/skills/`

Other agents vary by tool and version. Use the tool's own skills documentation for the exact manual path.

For Git-based/manual workflows, you can also clone this repo and copy a specific skill folder:

```bash
# Example: copy one skill into the directory your tool documents for skills
git clone https://github.com/team-telnyx/telnyx-skills.git
cp -r telnyx-skills/telnyx-python/skills/telnyx-messaging-python /path/to/your-tool-skills-dir/
```

Use this approach only after confirming the destination path your tool expects from that tool's own documentation.

> [!IMPORTANT]
> Install only the skills your project actually needs. Loading too many skills at once dilutes context and makes it easier for an agent to mix unrelated API patterns.

### Claude Code

**Step 1.** Add the Telnyx skills marketplace (one-time setup):

```bash
/plugin marketplace add team-telnyx/telnyx-skills
```

**Step 2.** Install a plugin — pick a plugin from table below:

```bash
/plugin install <PLUGIN>@telnyx-skills
```
Replace `<PLUGIN>` with the plugin from the table below e.g `/plugin install telnyx-python@telnyx-skills` or `/plugin install telnyx-twilio-migration@telnyx-skills`

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

> **Note:** After migrating, install a language plugin (e.g. `telnyx-python`) for deeper SDK examples, and `telnyx-webrtc-client` if building a calling app.

## Skill Structure

Each skill contains a single `SKILL.md` file with YAML frontmatter, SDK installation instructions, client setup, code examples for every API operation, and webhook event reference tables where applicable. All code examples are generated from the official Telnyx OpenAPI specifications.

The canonical artifact format is:

- `SKILL.md`
- `references/api-details.md` when overflow API detail is needed

Machine-readable discovery currently lives in:

- [.claude-plugin/marketplace.json](.claude-plugin/marketplace.json)
- [skills-index.json](skills-index.json)

Skill generation and publishing logic live in the separate `telnyx-ext-skills-generator` repository. For platform-specific usage guidance, see [Platform Distribution](docs/platform-distribution.md).

## Documentation

- [Telnyx Developer Docs](https://developers.telnyx.com)
- [Telnyx API Reference](https://developers.telnyx.com/api)
- [Agent Skills Specification](https://agentskills.io/specification)

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Note:** Code examples are auto-generated from Telnyx OpenAPI specs. To fix a code example, please open an issue describing the problem rather than editing the code directly.

For generated skill changes:

- use the generator repository as the source of truth
- keep scoped V2 pilot PRs within the documented safety boundary
- do not remove or overwrite unrelated existing skills

## Support

For issues with these skills, please [open an issue](https://github.com/team-telnyx/telnyx-skills/issues) in this repository.

For Telnyx API support, visit [support.telnyx.com](https://support.telnyx.com).

## License

MIT License - see [LICENSE](LICENSE) for details.
