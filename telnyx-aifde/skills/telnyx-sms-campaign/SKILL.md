---
name: telnyx-sms-campaign
description: "Orchestrate SMS marketing campaigns with Telnyx. Send bulk promotional SMS with rate limiting, list hygiene (Number Lookup), delivery tracking via webhooks, and opt-out compliance. Use when building marketing campaigns, promotional blasts, or any bulk SMS sending with Telnyx APIs."
author: "Ifthikar Razik (AI FDE)"
version: "1.0.0"
---

# Telnyx SMS Campaign

Orchestrate end-to-end SMS marketing campaigns: validate recipients, send with rate limiting, and track delivery.

## Prerequisites

- **TELNYX_API_KEY** — v2 API key from portal.telnyx.com
- **curl** and **jq** installed
- Phone number purchased and assigned to a messaging profile
- Messaging profile with `whitelisted_destinations` configured (e.g., `["US"]`)
- **10DLC campaign approved** (required for US A2P messaging — see `references/compliance.md`)

## Quick Start

```bash
# 1. Export your API key
export TELNYX_API_KEY="KEY0123456789..."

# 2. Validate your recipient list (filters out landlines)
bash scripts/validate-list.sh recipients.csv > validated.csv

# 3. Send the campaign
bash scripts/send-campaign.sh \
  --from "+19705550001" \
  --profile-id "4001170e-cdcb-..." \
  --message "Acme Sale! 25% off today. Shop: acme.com/sale. Reply STOP to opt out." \
  --recipients validated.csv \
  --rate 15

# 4. Check delivery status
bash scripts/check-delivery.sh --campaign-log campaign-*.json
```

## Usage — List Hygiene

Use Number Lookup to verify carrier type before sending. Landlines can't receive SMS — sending to them wastes money and hurts delivery metrics.

```bash
# Validate recipients (reads phone_number column from CSV)
bash scripts/validate-list.sh recipients.csv > validated.csv
```

**Input CSV format:**
```csv
phone_number,name
+12025551234,Alice
+12025555678,Bob
```

The script calls `GET /v2/number_lookup/{number}?type=carrier` for each number and filters out:
- Landlines (`carrier.type == "landline"`)
- VoIP numbers (optional, with `--strict` flag)
- Invalid/unroutable numbers

Stats are printed to stderr so you can pipe stdout to a file:
```
[validate] Total: 500 | Mobile: 423 | Landline: 61 | VoIP: 12 | Invalid: 4
```

> **Tip:** For large lists (1000+), the script rate-limits lookups to 10/sec to stay within API limits.

## Usage — Send Campaign

Send validated recipients a campaign message with built-in rate limiting.

```bash
bash scripts/send-campaign.sh \
  --from "+19705550001" \
  --profile-id "YOUR_PROFILE_ID" \
  --message "Acme Sale! 25% off today. Shop: acme.com/sale. Reply STOP to opt out." \
  --recipients validated.csv \
  --rate 15
```

**Parameters:**

| Flag | Required | Description |
|------|----------|-------------|
| `--from` | Yes | Sending phone number (E.164) |
| `--profile-id` | Yes | Messaging profile ID |
| `--message` | Yes | Message body (must include opt-out language) |
| `--recipients` | Yes | CSV file with `phone_number` column |
| `--rate` | No | Messages per second (default: 10, max recommended: 50) |
| `--dry-run` | No | Print what would be sent without actually sending |

**Rate Limiting:**
The script uses a token-bucket algorithm at 80% of the specified rate to avoid hitting API limits. For example, `--rate 15` sends ~12 msg/sec with bursts up to 15.

**Output:**
Results are logged to `campaign-YYYY-MM-DD-HHMMSS.json`:
```json
[
  {"message_id": "abc-123", "to": "+12025551234", "status": "queued", "timestamp": "2026-03-07T14:30:00Z"},
  {"message_id": "def-456", "to": "+12025555678", "status": "queued", "timestamp": "2026-03-07T14:30:00Z"}
]
```

**Error Handling:**
- **422 errors** (invalid number, unsubscribed) — skipped, logged as `"status": "skipped"`
- **429 errors** (rate limited) — exponential backoff, up to 3 retries
- **5xx errors** — retry up to 3 times with backoff

## Usage — Track Delivery

Check delivery status of a sent campaign:

```bash
bash scripts/check-delivery.sh --campaign-log campaign-2026-03-07-143000.json
```

The script queries `GET /v2/messages/{id}` for each message and reports:

```
[delivery] Campaign: campaign-2026-03-07-143000.json
[delivery] Total: 423 | Delivered: 401 | Failed: 12 | Pending: 8 | Unknown: 2
[delivery] Delivery rate: 94.8%
[delivery] Failed numbers written to: failed-2026-03-07-143000.csv
```

Use `--wait` to poll pending messages (checks every 30s, up to 5 min):
```bash
bash scripts/check-delivery.sh --campaign-log campaign-*.json --wait
```

## Webhook Setup

Configure your messaging profile to receive delivery receipts and opt-out messages.

### 1. Set webhook URL on messaging profile

```bash
curl -s -X PATCH "https://api.telnyx.com/v2/messaging_profiles/YOUR_PROFILE_ID" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_url": "https://your-server.com/webhooks/telnyx",
    "webhook_api_version": "2"
  }'
```

### 2. Handle delivery receipts

Telnyx sends `message.finalized` events with delivery status:

```json
{
  "data": {
    "event_type": "message.finalized",
    "payload": {
      "id": "abc-123",
      "to": [{"phone_number": "+12025551234", "status": "delivered"}],
      "completed_at": "2026-03-07T14:30:05Z"
    }
  }
}
```

Statuses: `delivered`, `sending_failed`, `sent` (no DLR from carrier).

### 3. Handle opt-outs

When a recipient replies STOP, Telnyx sends `message.received`:

```json
{
  "data": {
    "event_type": "message.received",
    "payload": {
      "from": {"phone_number": "+12025551234"},
      "text": "STOP",
      "autoresponse_type": "opt_out"
    }
  }
}
```

Telnyx auto-responds with an opt-out confirmation if `autoresponse_type` is set. You must also add the number to your internal suppression list.

**Opt-out keywords handled automatically:** STOP, CANCEL, UNSUBSCRIBE, END, QUIT.

## Compliance Checklist

Before sending any campaign:

- [ ] 10DLC campaign registered and approved (US A2P)
- [ ] Messaging profile has `whitelisted_destinations` set
- [ ] Every message includes brand name and opt-out language ("Reply STOP to opt out")
- [ ] Sending only during TCPA-compliant hours (8 AM–9 PM recipient local time)
- [ ] Recipient list is consent-verified (express written consent for marketing)
- [ ] No URL shorteners in message body (AT&T blocks bit.ly, tinyurl, etc.)
- [ ] Suppression list is up to date (opt-outs removed)

See `references/compliance.md` for detailed carrier rules, TCPA requirements, and 10DLC guidance.

## Known Friction

> Reference: AIFDE-29 friction log

**`whitelisted_destinations` required:**
Messaging profiles must have `whitelisted_destinations` set (e.g., `["US"]`) or sends will fail with 422. This is not obvious from error messages.

```bash
curl -s -X PATCH "https://api.telnyx.com/v2/messaging_profiles/YOUR_PROFILE_ID" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"whitelisted_destinations": ["US"]}'
```

**`smart_encoding` field name:**
The API field is `smart_encoding`, not `enabled_smart_encoding`. Smart encoding converts special characters to GSM-compatible equivalents to avoid multi-segment messages.

**Filter params need URL encoding:**
When filtering messages via the API, use `--data-urlencode` for query params:
```bash
curl -s -G "https://api.telnyx.com/v2/messages" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  --data-urlencode "filter[from]=+19705550001" \
  --data-urlencode "filter[created_at][gte]=2026-03-07T00:00:00Z"
```

## Telnyx API Reference

- [Messages API](https://developers.telnyx.com/api/messaging/send-message)
- [Number Lookup API](https://developers.telnyx.com/api/number-lookup/lookup-number)
- [Messaging Profiles](https://developers.telnyx.com/api/messaging/messaging-profiles)
- [Webhooks](https://developers.telnyx.com/docs/messaging/webhooks)
