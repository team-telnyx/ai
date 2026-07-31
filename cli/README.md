# @telnyx/agent-cli

Agent-friendly CLI for Telnyx API v2 — composite setup commands that reduce multi-step portal workflows to a single command.

## Quick Start

```bash
# Install
npm install -g @telnyx/agent-cli

# Set your API key
export TELNYX_API_KEY="KEY_xxx"

# Check account status
telnyx-agent status

# See all capabilities
telnyx-agent capabilities
```

> **Contributors / from-source:** run the CLI with `node bin/telnyx-agent.mjs <command>`
> (the published `bin`). The older `npx tsx bin/telnyx-agent.ts` form is dev-only and
> is **not** what an installed user runs.

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

### `telnyx-agent stt`

**Transcribe audio to text (speech-to-text).**

Transcription requires the audio at a **publicly reachable URL** — the command
cannot upload a local file. Host the audio (any public URL or a Telnyx storage
bucket) first, then pass it with `--audio-url`. Note: `tts` returns base64 audio
data, not a URL, so you cannot pipe `tts` straight into `stt` — host the audio in
between.

```bash
telnyx-agent stt --audio-url https://example.com/audio.wav
telnyx-agent stt --audio-url https://example.com/audio.mp3 --model openai/whisper-large-v3-turbo --language es --json
```

**Flags:**
- `--audio-url` — Public URL of the audio file to transcribe (required)
- `--model` — Transcription model (default: `distil-whisper/distil-large-v2`; also `openai/whisper-large-v3-turbo`, `deepgram/nova-3`)
- `--language` — Language hint (optional)
- `--response-format` — `json` or `verbose_json` (optional)

Output: `{ audio_url, model, transcription }`

### `telnyx-agent stt-providers`

**List available speech-to-text providers.**

```bash
telnyx-agent stt-providers
telnyx-agent stt-providers --provider telnyx --service-type transcription --json
```

Output: `{ providers: [...] }`

## Cookbook Copy Changes (for Denise)

> **Status:** proposed copy changes for the *Communication API Cookbook v2* (the
> "vibe-code your comms stack" PDF). Tested against the real CLI first, per Oliver's
> Jul 27 direction. **Please don't publish these until (a) the team confirms one full
> end-to-end re-test pass, and (b) the two "Needs a decision" items at the bottom are
> settled.** Send the review to Denise via **Slack** (not GitHub email). These reflect
> the fixes on branch `integration/agent-cli-fixes`.
>
> **How to read this:** the cookbook has 6 one-page scripts (Voice, SMS, WhatsApp,
> Verify, Text-to-Speech, Speech-to-Text). Below, each script lists the exact wording to
> change and why, in plain English. "✅ works now, just re-test" means the command was
> broken before and is fixed — no wording change, just run it once to confirm.

### Applies to every script

- **Two dashes on every flag.** Make sure flags always show two dashes — `--connection-id`,
  not `-connection-id`. There are ~40 of these; a few lost a dash to PDF line-wrapping. Put
  every command in a code block so it can't happen again.
- **Fix words that got glued together by line wraps:** `callcontrol-id` → `call-control-id`,
  `telnyxagent` → `telnyx-agent`, `verifycheck` → `verify-check`, `sendgroup-mms` →
  `send-group-mms`, `Text-toSpeech` → `Text-to-Speech`.
- **Add a cost note anywhere a script buys a phone number** (Voice, SMS, and — pending a
  decision — Verify): *"Buying a number is a small recurring monthly charge. If you run the
  setup again, it reuses the number it already bought instead of buying another."*
- **Mention the "run again safely" behaviour.** `setup-sms` and `setup-voice` are now safe to
  re-run: they reuse the number/profile they created before instead of buying a new one each
  time. If someone genuinely wants a brand-new number, add `--force`.
- **`--help` is safe.** Add a one-line reassurance (e.g. in the intro): running any command
  with `--help` only shows help — it never buys anything or sets anything up.

### Script 1 — Voice API (page 5)

- **Important wording fix:** Step 5 says setup-voice creates a *"SIP credential connection."*
  Change to *"**Call Control Application**"* — that's the correct type the calling example
  actually needs. (The old name is simply wrong.)
- **Webhook caveat:** the script tells the reader to pass `--webhook <url>`. Add: *"If you've
  already set Voice up before, re-running reuses your existing app and your `--webhook` is
  **not** re-applied to it. Add `--force` if you want a fresh app that uses your new webhook."*
- **Soften two promises:** answering-machine detection accuracy *"varies by carrier/route,"*
  and hiding your caller ID *"depends on the receiving carrier"* (it isn't guaranteed).
- **✅ works now, just re-test:** the outbound-call example and `call-status` (now correctly
  reports whether a call is active or ended).

### Script 2 — SMS & Messaging (page 6)

- **✅ works now, just re-test:** `schedule-sms` (scheduling a message for later) was pointing
  at the wrong place before; it's fixed. Keep the example, just re-run it.
- **Keep the group-MMS caveat — don't remove it:** the group-MMS *send* works, but the system
  genuinely **can't confirm** whether each person received it. Keep wording like: *"Group MMS
  sends, but delivery to each person can't be confirmed yet — treat a successful send as
  'accepted,' not 'delivered.'"* Don't promise the user will "see it land."
- **Add an international note:** a brand-new number can't text other countries by default.

### Script 3 — WhatsApp (page 7)

- **✅ works now, just re-test:** setup-whatsapp used to break for everyone at step 5; that's
  fixed. Un-hold the script and re-run it.
- **One wording fix:** Step 7 shows `telnyx-agent whatsapp-templates`. It needs an id —
  change it to `telnyx-agent whatsapp-templates --waba-id <id>`.
- **Add a warning:** Meta's "555" test numbers can't actually send messages — use a real
  WhatsApp-capable number for the send step.

### Script 4 — Verify API (page 8)  ⚠️ one line is on hold

- **✅ works now, just re-test:** setup-verify used to fail for everyone; the profile step is
  fixed.
- **On hold (see decision below):** Step 5 says it *"buys a number for it."* Right now that's
  **true** — it really does buy a number. Don't change that line until we decide whether the
  tool should keep buying a number or not (see "Needs a decision").
- **Nice extras to add:** the same international-SMS note as SMS, and mention the
  `--method call` option (Telnyx calls the phone and reads the code aloud) as a second way to
  verify.

### Script 5 — Text-to-Speech (page 9)  ⚠️ provider list is on hold

- **Fix the output description:** Step 6 says *"save the audio URL … and download the file."*
  That's not what happens — the command returns the audio **as encoded data in the output**
  (WAV format, not MP3), not a link and not a saved file. Change to something like: *"the
  command returns the audio as base64 data in its output — save it to a playable file, e.g.
  by piping it through `base64 -d > speech.wav`."*
- **Add a voice to the example:** the `tts` example should include a voice, e.g.
  `--voice Telnyx.Bayan.Amanda`.
- **On hold (see decision below):** the provider list shows *ElevenLabs*, but the live service
  didn't return ElevenLabs (and returned a few others the cookbook doesn't list). Don't
  publish the provider names until engineering confirms the final list.

### Script 6 — Speech-to-Text (page 10)

- **Fix the "chain them together" step:** Step 6 tells the reader to make audio with `tts` and
  feed it straight into `stt`. That can't work — `tts` gives back encoded data, and `stt`
  needs a **public web link** to the audio. Change it to: *"Put a sample audio file somewhere
  public first (any public URL or a Telnyx storage bucket), then run
  `telnyx-agent stt --audio-url <public_link>`."*
- **Set expectations:** the transcription providers are correct, but add that brand names and
  unusual words may come out slightly wrong.

### Needs a decision from us (not a wording fix)

1. **Should `setup-verify` buy a phone number?** It does today. Either engineering removes the
   number-buy (Verify can use a shared pool), or we keep it and add the cost note. This decides
   one line of the Verify script.
2. **Which TTS providers do we list?** The tool's list and the live service's list don't match
   (ElevenLabs is in the cookbook but wasn't returned live). Engineering should reconcile them
   before we print any provider names.

### For engineers (not for the cookbook)

The number/SMS/WhatsApp-send commands use a bundled Telnyx Go CLI installed to `vendor/` on
`npm install`. If a command reports `command …:… not found`, an incompatible `telnyx` was
found on `PATH` — re-run `npm install` (or `npm rebuild`) to restore `vendor/telnyx`.

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

- **Hybrid execution** — most commands call the Telnyx REST API v2 directly via native
  `fetch()`; a subset (number search/order, `send-sms`, `sms-status`, WhatsApp send)
  shell out to the bundled `telnyx` Go CLI (`@telnyx/telnyx-cli`, pinned by
  `scripts/postinstall.ts`). The Go CLI is installed into `vendor/` on `npm install`.
- **CLI dependency** — the shell-out path expects the pinned Go CLI in `vendor/`. If it
  is missing and an **incompatible** `telnyx` is found on `PATH`, those specific commands
  can fail with `command …:… not found`. Re-run `npm install` (or `npm rebuild`) to
  restore `vendor/telnyx`. (See the "Cookbook Copy Changes" section above.)
- **No CLI framework** — simple `process.argv` parsing.
- **Error handling** — composite commands report what succeeded and what failed.

## Development

```bash
cd cli
npm install

# Run directly (from source, dev mode)
npx tsx bin/telnyx-agent.ts status
# ...or drive the published launcher exactly as an installed user would:
node bin/telnyx-agent.mjs status

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
