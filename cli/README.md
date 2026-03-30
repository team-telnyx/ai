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
```

Output: `{ profile_id, phone_number, ready: true }`

### `telnyx-agent setup-voice`

**One command: zero to making/receiving calls.**

Creates a SIP credential connection, searches for a voice-capable number, buys it, and assigns it to the connection.

```bash
telnyx-agent setup-voice
telnyx-agent setup-voice --webhook https://example.com/calls
telnyx-agent setup-voice --country US --json
```

Output: `{ connection_id, phone_number, sip_username, sip_password }`

### `telnyx-agent setup-iot`

**One command: zero to connected SIM.**

Lists existing SIM cards, creates a SIM card group, activates the first available SIM, and assigns it to the group.

```bash
telnyx-agent setup-iot
telnyx-agent setup-iot --json
```

Output: `{ sim_id, group_id, status, apn_config }`

### `telnyx-agent setup-ai`

**One command: zero to AI assistant on a phone number.**

Creates an AI assistant, buys a voice-capable number, and wires them together.

```bash
telnyx-agent setup-ai
telnyx-agent setup-ai --instructions "You are a pizza ordering bot"
telnyx-agent setup-ai --name "Support Bot" --json
```

Output: `{ assistant_id, phone_number, test_command }`

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

- **No external HTTP dependencies** — uses native `fetch()` (Node 18+)
- **No CLI framework** — simple `process.argv` parsing for 6 commands
- **TypeScript + tsx** — direct execution, no build step
- **Error handling** — composite commands report what succeeded and what failed

## Development

```bash
cd packages/cli
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
