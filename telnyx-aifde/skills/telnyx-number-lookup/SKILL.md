---
name: telnyx-number-lookup
description: "Look up phone number carrier info, line type, and portability data using Telnyx Number Lookup API. Use for pre-validation before sending OTP, fraud detection, carrier routing, or number intelligence."
author: "Ifthikar Razik (AI FDE)"
version: "1.0.0"
metadata:
  clawdbot:
    emoji: "🔍"
    requires:
      env: ["TELNYX_API_KEY"]
      bins: ["curl"]
---

# Telnyx Number Lookup

Look up carrier information, line type, caller name, and portability data for any phone number. Essential for pre-validating numbers before sending verification codes.

## Prerequisites

- `TELNYX_API_KEY` environment variable set
- `curl` installed
- `jq` recommended (for formatted output; works without it)

## Quick Start

```bash
# Basic lookup
./scripts/lookup.sh +13035551234

# Get verification routing recommendation
./scripts/lookup.sh +13035551234 --routing

# Raw JSON output
./scripts/lookup.sh +13035551234 --json

# Caller name lookup
./scripts/lookup.sh +13035551234 --type caller-name
```

## Usage

```
lookup.sh <phone_number> [--type carrier|caller-name] [--json] [--routing]
```

| Flag | Description |
|------|-------------|
| `--type` | Lookup type: `carrier` (default) or `caller-name` |
| `--json` | Output raw JSON response |
| `--routing` | Output verification channel recommendation |

## Output Modes

### Default Output
```
Phone: +13035551234
Carrier: T-Mobile USA, Inc.
Type: mobile
Country: US
```

### Routing Mode (`--routing`)

Recommends the best verification channel based on carrier type:

```
Phone: +13035551234
Carrier: T-Mobile USA, Inc.
Type: mobile
Country: US
Recommendation: SMS verification
```

For landlines:
```
Phone: +12125551234
Carrier: Verizon
Type: fixed line
Country: US
Recommendation: Voice call verification
```

For toll-free:
```
Phone: +18005551234
Type: toll free
Recommendation: REJECT — Cannot verify toll-free numbers
```

### Routing Logic

| Carrier Type | Recommendation | Reason |
|-------------|----------------|--------|
| `mobile` | SMS verification | Standard mobile, best deliverability |
| `voip` | SMS verification (elevated fraud risk) | Can receive SMS but higher fraud rate |
| `fixed line or mobile` | SMS verification | SMS-capable |
| `fixed line` | Voice call verification | Cannot receive SMS |
| `toll free` | REJECT | Not a real user number |
| `premium rate` | REJECT | Likely not a real user |
| `unknown` | SMS (fallback to voice) | Try SMS first |

## Integration with Verify Skill

Use lookup before sending verification to route to the correct channel:

```bash
# 1. Check number type
ROUTING=$(./scripts/lookup.sh +13035551234 --routing)
echo "$ROUTING"

# 2. Based on recommendation, send via appropriate channel
if echo "$ROUTING" | grep -q "SMS verification"; then
  ../telnyx-verify/scripts/verify.sh send-sms --phone "+13035551234" --profile-id "<uuid>"
elif echo "$ROUTING" | grep -q "Voice call"; then
  ../telnyx-verify/scripts/verify.sh send-call --phone "+13035551234" --profile-id "<uuid>"
elif echo "$ROUTING" | grep -q "REJECT"; then
  echo "Cannot verify this number type"
fi
```

## Response Fields

### Carrier Data
- `carrier.name` — Carrier name (e.g., "T-Mobile USA, Inc.")
- `carrier.type` — Line type (mobile, fixed line, voip, toll free, etc.)
- `carrier.mobile_country_code` — MCC
- `carrier.mobile_network_code` — MNC

### Portability Data (included in carrier lookup)
- `portability.ported_status` — `Y` (ported), `N` (not ported)
- `portability.ported_date` — Date number was ported
- `portability.line_type` — Line type from portability database
- `portability.spid_carrier_name` — Current carrier after porting
- `portability.city`, `portability.state` — Number location

### Caller Name (requires `--type caller-name`)
- `caller_name.caller_name` — CNAM (e.g., "JOHN SMITH")

## Cost

Number Lookup costs approximately **$0.01 per lookup**. Factor this into your per-verification cost calculation.

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `404 Not Found` | Invalid phone number | Ensure E.164 format with `+` prefix |
| `403 Forbidden` | Invalid API key | Check `TELNYX_API_KEY` |
| `carrier.type: unknown` | Number not in carrier database | Default to SMS, handle failure |
| Empty carrier data | Number not recognized | May be invalid or newly assigned |
