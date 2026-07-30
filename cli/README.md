# @telnyx/agent-cli

Agent-friendly CLI for Telnyx API v2 — composite setup commands that reduce multi-step portal workflows to a single command.

## Quick Start

```bash
# Set your API key
export TELNYX_API_KEY="KEY_xxx"

# Check account status
npx tsx bin/telnyx-agent.ts status

# See all capabilities
npx tsx bin/telnyx-agent.ts capabilities
```

## Commands

### `telnyx-agent status`

Account health at a glance — balance, phone numbers, messaging profiles, voice connections, AI assistants.

```bash
telnyx-agent status          # Human-readable
telnyx-agent status --json   # Machine-readable
```

### `telnyx-agent capabilities`

Self-describing API surface — lists all available tools and composite commands.

```bash
telnyx-agent capabilities
telnyx-agent capabilities --json
```

### `telnyx-agent setup-sms`

**One command: zero to sending SMS.**

Creates a messaging profile, searches for a number with SMS capability, buys it, and assigns it to the profile.

```bash
telnyx-agent setup-sms                    # Default: US number
telnyx-agent setup-sms --country GB       # UK number
telnyx-agent setup-sms --json             # JSON output
telnyx-agent setup-sms --force            # Provision a NEW profile + number
```

Output: `{ profile_id, phone_number, ready: true, reused }`

**Idempotent by default.** If a previous `setup-sms` already created an
`Agent SMS Profile - …` with an assigned number, this command **reuses** it
instead of buying another (`reused: true`). Pass `--force` to always provision a
fresh profile and number (this buys a new ~$1/mo number).

### `telnyx-agent setup-voice`

**One command: zero to making/receiving calls.**

Creates a Call Control Application (with webhook URL + outbound voice profile), searches for a voice-capable number, buys it, and assigns it to the app. The output `connection_id` works directly with `call-dial`.

```bash
telnyx-agent setup-voice
telnyx-agent setup-voice --webhook https://example.com/calls
telnyx-agent setup-voice --outbound-voice-profile-id 2927726759434519857
telnyx-agent setup-voice --country US --json
telnyx-agent setup-voice --force   # Provision a NEW app + number
```

**Idempotent by default.** Reuses a previous `Agent Voice App - …` (and its
assigned number) when one exists (`reused: true`); pass `--force` to provision a
fresh Call Control App and number.

**Flags:**
- `--webhook-url` (or `--webhook`) — Webhook URL for call events (default: `https://example.com/webhook`)
- `--outbound-voice-profile-id` — Outbound voice profile ID (default: auto-detect first available)
- `--force` — Always provision a new app + number instead of reusing an existing agent-created one
- `--country` — ISO country code for number search (default: `US`)

Output: `{ connection_id, connection_name, phone_number, phone_number_id, webhook_url, outbound_voice_profile_id, ready }`

### `telnyx-agent setup-iot`

**One command: zero to connected SIM.**

Lists existing SIM cards, creates a SIM card group, activates the first available SIM, and assigns it to the group.

```bash
telnyx-agent setup-iot
telnyx-agent setup-iot --json
```

Output: `{ sim_id, group_id, status, apn_config }`

### `telnyx-agent setup-verify`

**One command: zero to phone verification.**

Creates a verify profile with SMS channel settings (default timeout 300s, code length 6, whitelisted destinations US), searches for an available number with SMS capability, buys it, and outputs everything you need to start sending verifications.

```bash
telnyx-agent setup-verify
telnyx-agent setup-verify --destinations US,GB,LK
telnyx-agent setup-verify --profile-name "My Verify Profile" --json
```

Output: `{ profile_id, profile_name, phone_number, phone_number_id, timeout_secs, test_command, ready }`

### `telnyx-agent setup-ai`

**One command: zero to AI assistant on a phone number.**

Creates an AI assistant, buys a voice-capable number, and wires them together.

```bash
telnyx-agent setup-ai
telnyx-agent setup-ai --instructions "You are a pizza ordering bot"
telnyx-agent setup-ai --name "Support Bot" --json
```

Output: `{ assistant_id, phone_number, test_command }`

### `telnyx-agent setup-whatsapp`

**One command: zero to WhatsApp.**

Lists your WhatsApp Business Accounts (WABAs), picks one (or use `--waba-id`), checks for existing WhatsApp phone numbers, buys an SMS-capable number if needed, initializes WhatsApp verification, and (optionally) verifies it and sets up the business profile.

```bash
telnyx-agent setup-whatsapp                                # Auto-pick WABA, buy number, init verification
telnyx-agent setup-whatsapp --waba-id waba_123 --json      # Use specific WABA
telnyx-agent setup-whatsapp --display-name "My Biz" --code 123456  # Verify + set profile
telnyx-agent setup-whatsapp --category RETAIL --about "We sell widgets"
```

**Flags:**

- `--waba-id <id>` — Use a specific WhatsApp Business Account (default: first available)
- `--display-name` — WhatsApp profile display name
- `--about` — WhatsApp profile about text
- `--category` — Business category (e.g. RETAIL, TECHNOLOGY)
- `--code` — Verification code to verify an initialized number
- `--country <code>` — Country for number search (default: US)

Output: `{ waba_id, phone_number, verified, profile_configured, ready }`

### `telnyx-agent whatsapp-send`

**Send a WhatsApp message (text or template).**

Constructs the WhatsApp message JSON from simple flags and sends via the Telnyx API.

```bash
telnyx-agent whatsapp-send --from +155****4567 --to +155****6543 --text "Hello!"
telnyx-agent whatsapp-send --from +155****4567 --to +155****6543 --template-name order_ready
telnyx-agent whatsapp-send --from +155****4567 --to +155****6543 --text "Hi" --messaging-profile-id msgprof_123
```

**Flags:**

- `--from` — Sender E.164 number (required)
- `--to` — Recipient E.164 number (required)
- `--text` — Text message body
- `--template-name` — Template name to send
- `--template-language` — Template language code (default: en_US)
- `--messaging-profile-id` — Messaging profile ID (required if `--from` is not SMS-enabled)

Output: `{ from, to, message_type, message_id, status }`

### `telnyx-agent whatsapp-templates`

**List or create WhatsApp message templates.**

```bash
telnyx-agent whatsapp-templates --waba-id waba_123                    # List templates
telnyx-agent whatsapp-templates --waba-id waba_123 --status APPROVED   # Filter by status
telnyx-agent whatsapp-templates --waba-id waba_123 --create \
  --name order_ready --language en_US --category UTILITY \
  --component '[{"type":"BODY","text":"Your order is ready"}]'
```

**Flags:**

- `--waba-id <id>` — WhatsApp Business Account ID (required)
- `--create` — Switch to create mode (default: list)
- `--name` — Template name (create mode, required)
- `--language` — Template language, default en_US (create mode)
- `--category` — UTILITY, MARKETING, or AUTHENTICATION (create mode, required)
- `--component` — Template components as JSON array string (create mode, required)
- `--status` — Filter by status: APPROVED, PENDING, REJECTED (list mode)

### Voice: `call-dial`, `call-control`, `call-status`

**Place and manage outbound calls via Call Control.** Use the `connection_id`
from `setup-voice`.

```bash
telnyx-agent call-dial --connection-id <id> --from +13125550000 --to +447700900123 --json
telnyx-agent call-status --call-control-id <id> --json
telnyx-agent call-control --call-control-id <id> --action hangup
```

- `call-dial` accepts any valid `+E.164` `--to` (posts directly to `POST /v2/calls`).
- `call-status` reports `active` / `ended`, derived from the live call's
  `is_alive` state.

### `telnyx-agent send-group-mms`

**Send one MMS to multiple recipients.**

```bash
telnyx-agent send-group-mms --from +13125550000 --to "+13125550001,+13125550002" --text "Hi team"
telnyx-agent send-group-mms --from +13125550000 --to "+1...,+1..." --media-url https://example.com/pic.jpg
```

⚠ **Delivery verification caveat:** the group MMS returns a *group-level*
message id that is **not** resolvable via `sms-status` / `GET /v2/messages/{id}`.
Confirm delivery via the per-recipient statuses in the response (`recipient_statuses`)
and/or message webhooks — not by polling the returned id.

### Edge Compute handoff commands

These are **thin executable bridges**, not native Edge lifecycle support.
They make Edge Compute usable from `telnyx-agent` while keeping real deploy/auth/secrets/bindings ownership in `telnyx-edge`. They now prefer API-key auth for agent use when the installed Edge CLI supports it.

```bash
telnyx-agent edge-doctor --json
telnyx-agent setup-edge-mcp --name my-mcp-server --json
telnyx-agent setup-edge-webhook --name my-webhook --json
```

What they do:
- validate that `telnyx-edge` is available
- check whether Edge auth is already configured
- prefer `telnyx-edge auth api-key set <your-api-key>` for agents when supported
- point you at a real Edge example
- give you the concrete next deploy command
- preserve an honest handoff instead of pretending `telnyx-agent` owns Edge lifecycle

### `telnyx-agent fund-account`

**Fund your Telnyx account with USDC on Base via x402 protocol.**

Requests a payment quote, signs EIP-712 typed data (transferWithAuthorization / EIP-3009), and submits the payment. Without a wallet key, outputs payment requirements for external signing.

```bash
telnyx-agent fund-account --amount 50.00                      # Get quote + payment requirements
telnyx-agent fund-account --amount 50.00 --wallet-key 0x...   # Sign and submit automatically
telnyx-agent fund-account --amount 50.00 --json              # JSON output
```

**Flags:**
| Flag | Description |
|------|-------------|
| `--amount <usd>` | Amount to fund in USD (required) |
| `--wallet-key <0x>` | Private key for EIP-712 signing (optional) |

**Output (with --wallet-key):**
```json
{
  "previous_balance": "-1.59",
  "funded_amount": "50.00",
  "quote_id": "quote_abc123",
  "transaction_id": "txn_xxx",
  "status": "settled",
  "new_balance": "48.41",
  "tx_hash": "0x..."
}
```

**Output (without --wallet-key):**
Returns `payment_requirements` JSON for external signing by agents or wallets.

### `telnyx-agent tts`

**Generate speech from text (text-to-speech).**

Supports multiple providers (telnyx, aws, azure, elevenlabs, minimax, resemble, rime, xai). Returns base64-encoded audio.

```bash
telnyx-agent tts --text "Hello world" --voice Telnyx.Bayan.Amanda
telnyx-agent tts --text "Bonjour" --voice Amy --provider aws --language fr
telnyx-agent tts --text "Hello" --provider elevenlabs --json
telnyx-agent tts --text "<speak>Hello</speak>" --text-type ssml
```

**Flags:**
- `--text` — Text to synthesize (required)
- `--voice` — Voice ID (e.g., `Telnyx.Bayan.Amanda`, `Amy`)
- `--provider` — TTS provider (default: `telnyx`)
- `--language` — Language code (default: `en`)
- `--output-type` — Output format: `base64` (default). `binary_output` is not supported by this wrapper.
- `--text-type` — `text` (default) or `ssml`
- `--disable-cache` — Skip TTS cache

Output: `{ text, voice, provider, output_type, audio_data, has_audio_data }`

### `telnyx-agent tts-voices`

**List available TTS voices, optionally filtered by provider.**

```bash
telnyx-agent tts-voices
telnyx-agent tts-voices --provider aws
telnyx-agent tts-voices --provider elevenlabs --json
```

**Flags:**
- `--provider` — Filter by provider (default: `telnyx`)

Output: `{ provider, count, voices: [...] }`

## Authentication

The CLI looks for an API key in this order:

1. `TELNYX_API_KEY` environment variable
2. `~/.config/telnyx/config.json` (same as `@telnyx/api-cli`)

## Global Flags

| Flag | Description |
|------|-------------|
| `--json` | Output structured JSON instead of human-readable text |
| `--country <code>` | ISO country code for number search (default: US) |

## Architecture

- **Hybrid execution** — wraps `telnyx-cli` where available, falls back to native `fetch()` for operations without CLI support
- **No CLI framework** — simple `process.argv` parsing for 17 commands
- **TypeScript + tsx** — direct execution, no build step
- **Error handling** — composite commands report what succeeded and what failed

## Development

```bash
cd cli
npm install

# Run directly
npx tsx bin/telnyx-agent.ts status

# Run tests
npm test

# Type check
npm run typecheck
```

## Testing

Integration tests cover read-only commands (`status`, `capabilities`) against the real API. Setup commands are tested for argument parsing but don't make real purchases.

```bash
TELNYX_API_KEY="KEY_xxx" npm test
```
