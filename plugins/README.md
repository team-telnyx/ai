# Plugins

Coding-assistant plugins that wire Telnyx into AI IDEs and CLIs.

## Which plugin do I need?

Telnyx ships one Claude Code plugin per product area. Install only what your project uses — each plugin loads its own skills into your assistant's context, so smaller installs mean less token overhead and less room for confusion. Every skill lives in exactly one plugin, so plugins compose cleanly — install any combination and you'll never load duplicate skills or waste context.

| Plugin | Covers | Skills |
| --- | --- | --- |
| `telnyx-developer-kit` | Starter workflow — product navigation, architecture, quickstart, guardrails, debugging, Twilio switching | 6 |
| `telnyx-messaging` | SMS/MMS — send, schedule, group MMS, delivery webhooks, opt-out handling, messaging profiles | 18 |
| `telnyx-voice` | Voice API — call control, DTMF, recording, noise suppression, AMD, deepfake detection, number masking, SIPREC, streaming | 37 |
| `telnyx-whatsapp` | WhatsApp Business API — messages, templates, WABAs, phone numbers | 6 |
| `telnyx-email` | Email — transactional send, inboxes, sending domains, suppressions, unsubscribe groups | 4 |
| `telnyx-tts` | Text-to-speech via Telnyx and third-party voices | 1 |
| `telnyx-stt` | Speech-to-text transcription (OpenAI-compatible endpoint) | 1 |
| `telnyx-verify` | Phone verification via SMS, call, or flash call (2FA OTP) | 6 |
| `telnyx-numbers` | Phone numbers — search, buy, manage, 10DLC compliance, porting | 42 |
| `telnyx-webrtc` | WebRTC — video rooms and browser/mobile client SDKs | 17 |
| `telnyx-ai` | AI — LLM inference, chat completions, embeddings, AI assistants, Meeting Bot, conversation insights | 13 |
| `telnyx-platform` | Everything account-level and cross-product — account management, fax, IoT, networking, SIP, storage, TeXML, OAuth, Twilio migration | 92 |

Install with:

```bash
/plugin marketplace add team-telnyx/ai   # one-time
/plugin install <plugin>@telnyx
```

See the repo root [`README.md`](/README.md#plugins-and-extensions) for Cursor, Gemini CLI, and OpenCode install paths.

## Directory contents

- **`opencode/`** — OpenCode plugin, published as [`@telnyx/opencode`](https://www.npmjs.com/package/@telnyx/opencode). Adds Telnyx as a model provider with auth handling and a TUI for managing hosted models. Absorbed from the now-archived `team-telnyx/opencode-telnyx-auth` repo.

The Claude Code and Cursor plugin payloads live under `providers/claude/plugins/<plugin>/` and `providers/cursor/plugin/`, referenced from the root `.claude-plugin/marketplace.json` and `.cursor-plugin/marketplace.json` (consumed by `/plugin marketplace add team-telnyx/ai` and the Cursor marketplace).

Gemini CLI has no payload directory: its entire integration is the root `gemini-extension.json`, consumed by `gemini extensions install https://github.com/team-telnyx/ai`.
