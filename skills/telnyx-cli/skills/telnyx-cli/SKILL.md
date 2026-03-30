---
name: telnyx-cli
description: >-
  Use the Telnyx CLI to manage phone numbers, send messages, make calls,
  and access all Telnyx APIs from the terminal. 946 commands auto-generated
  from the OpenAPI spec — every API endpoint is a CLI command.
metadata:
  author: telnyx
  product: cli
  requires:
    bins:
      - telnyx
    env:
      - TELNYX_API_KEY
---

# Telnyx CLI

The Telnyx CLI provides command-line access to the entire Telnyx API. Every API endpoint maps to a CLI command — 946 commands covering messaging, voice, numbers, IoT, AI, and more.

## Installation

```bash
# Homebrew (macOS/Linux)
brew install telnyx/tap/telnyx

# Go install
go install github.com/team-telnyx/telnyx-go/cmd/telnyx@latest

# Or download a binary from GitHub releases:
# https://github.com/team-telnyx/telnyx-go/releases
```

## Authentication

```bash
export TELNYX_API_KEY="KEY..."
```

The CLI reads `TELNYX_API_KEY` from your environment. Set it once in your shell profile.

## Command Discovery

The CLI is fully self-documenting. Use `--help` at any level to explore:

```bash
# Top-level resource list
telnyx --help

# Commands for a specific resource
telnyx messages --help

# Full usage for a specific command
telnyx messages create --help
```

## Command Structure

Commands follow a consistent pattern:

```text
telnyx <resource> <action> [--flag value ...]
```

Resources match API paths. Actions are `list`, `create`, `get`, `update`, `delete`, and resource-specific verbs.

## Common Operations

### Send an SMS

```bash
telnyx messages create \
  --from +15551234567 \
  --to +15559876543 \
  --text "Hello from the CLI"
```

### List phone numbers

```bash
telnyx phone-numbers list --page-size 25
```

### Search for available numbers

```bash
telnyx available-phone-numbers list \
  --country-code US \
  --state CA \
  --features sms
```

### Order a phone number

```bash
telnyx number-orders create \
  --phone-numbers +15551234567
```

### Make an outbound call

```bash
telnyx calls create \
  --connection-id 1234567890 \
  --from +15551234567 \
  --to +15559876543
```

### List SIM cards

```bash
telnyx sim-cards list --page-size 10
```

### Create an AI assistant

```bash
telnyx assistants create \
  --name "Support Agent" \
  --model telnyx_ai
```

### Check account balance

```bash
telnyx balance get
```

## Output Formats

```bash
# Default: human-readable table
telnyx phone-numbers list

# JSON output for scripting
telnyx phone-numbers list --format json

# Pipe to jq for filtering
telnyx phone-numbers list --format json | jq '.data[].phone_number'
```

## When to Use CLI vs SDK

| Use case | Recommended |
|----------|-------------|
| Quick one-off operations | CLI |
| Shell scripts and automation | CLI |
| Application code | SDK (Python, JS, Go, Java, Ruby) |
| Interactive exploration | CLI |
| CI/CD pipelines | CLI or SDK |
| Complex business logic | SDK |
