---
name: 10dlc-registration
description: "Register for 10DLC as a sole proprietor or business to enable SMS messaging in the USA. Supports CUSTOMER_CARE, MARKETING, and MIXED campaign types. Interactive wizard or manual CLI commands."
author: "Telnyx AI FDE Team"
version: "1.1.0"
metadata: {"clawdbot":{"emoji":"📱","requires":{"bins":["telnyx"]},"primaryEnv":"TELNYX_API_KEY","notes":"Requires Telnyx CLI configured. Run 'telnyx auth setup' first."}}
---

# 10DLC Registration

Register for 10DLC (10-Digit Long Code) to enable A2P SMS in the USA.

> ✅ **AIFDE-5:** CLI documented, wrapper scripts ready

## Quick Start with Scripts

```bash
# Interactive registration wizard
./scripts/register.sh

# Check status of brands/campaigns
./scripts/status.sh

# Assign a phone number to a campaign
./scripts/assign.sh +15551234567 <campaign-id>
```

## Prerequisites

- Telnyx CLI installed: `npm install -g @telnyx/api-cli`
- API key configured: `telnyx auth setup`
- At least one US phone number

## Quick Start

Interactive wizard (easiest):

```bash
telnyx 10dlc wizard
```

## Manual Registration

### Step 1: Create Sole Proprietor Brand

```bash
telnyx 10dlc brand create --sole-prop \
  --display-name "Your Business Name" \
  --phone +15551234567 \
  --email you@example.com
```

### Step 2: Verify Brand (if required)

```bash
telnyx 10dlc brand get <brand-id>
telnyx 10dlc brand verify <brand-id> --pin 123456
```

### Step 3: Create Campaign

```bash
telnyx 10dlc campaign create \
  --brand-id <brand-id> \
  --usecase CUSTOMER_CARE \
  --description "Customer notifications and support" \
  --sample-message-1 "Your order #12345 has shipped." \
  --sample-message-2 "Reply STOP to opt out."
```

### Marketing Campaign

For SMS marketing campaigns (promotional, sales, discounts):

```bash
# Create MARKETING campaign via API (campaignBuilder endpoint)
curl -s -X POST "https://api.telnyx.com/v2/10dlc/campaignBuilder" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "'$BRAND_ID'",
    "usecase": "MARKETING",
    "description": "Promotional SMS including sales, coupons, and product launches.",
    "sample1": "Acme Summer Sale! 30% off all items. Shop: acme.com/sale. Reply STOP to opt out.",
    "sample2": "New at Acme: Spring collection just dropped! Browse: acme.com/new. Txt STOP to unsubscribe.",
    "messageFlow": "Customers opt in via unchecked checkbox at checkout. Up to 8 msgs/month. Reply STOP to cancel.",
    "helpMessage": "Support: Visit acme.com/help. Up to 8 msgs/mo. Reply STOP to cancel.",
    "helpKeywords": "HELP,INFO",
    "optinKeywords": "START,YES,SUBSCRIBE",
    "optoutKeywords": "STOP,UNSUBSCRIBE,CANCEL,END,QUIT",
    "embeddedLink": true,
    "numberPool": false,
    "ageGated": false,
    "directLending": false,
    "subscriberOptin": true,
    "subscriberOptout": true,
    "subscriberHelp": true,
    "termsAndConditions": true
  }' | jq .
```

> ⚠️ Campaign creation uses `POST /v2/10dlc/campaignBuilder` (not `/v2/10dlc/campaign`). This is a known API inconsistency.

### Step 4: Assign Phone Number

```bash
telnyx 10dlc assign +15551234567 <campaign-id>
```

### Step 5: Wait for Approval

```bash
telnyx 10dlc campaign get <campaign-id>
```

## Use Cases

| Use Case | Description |
|----------|-------------|
| `2FA` | Auth codes |
| `CUSTOMER_CARE` | Support messages |
| `ACCOUNT_NOTIFICATION` | Account alerts |
| `DELIVERY_NOTIFICATION` | Shipping updates |
| `MARKETING` | Promotional messages |
| `MIXED` | Multiple purposes |

List all: `telnyx 10dlc usecases`

- **Marketing SMS:** Promotional messages, sales, coupons (use `MARKETING` campaign type)
- **Mixed:** Both transactional and promotional (use `MIXED` campaign type)

## Status Commands

```bash
telnyx 10dlc brand list
telnyx 10dlc campaign list
telnyx 10dlc assignment status +15551234567
```

## Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Brand verification required` | Sole proprietor brands need phone verification | Check email/SMS for PIN, run `telnyx 10dlc brand verify <id> --pin <code>` |
| `Campaign rejected: insufficient description` | Description too vague | Be specific about message purpose, include business context |
| `Sample messages must include opt-out` | Missing STOP instructions | Add "Reply STOP to unsubscribe" to sample messages |
| `Phone number already assigned` | Number linked to another campaign | Run `telnyx 10dlc unassign +1...` first |
| `Brand pending` | Still under review (24-72h typical) | Wait and check status with `telnyx 10dlc brand get <id>` |
| `Invalid use case for sole proprietor` | Some use cases restricted | Sole prop limited to: 2FA, CUSTOMER_CARE, DELIVERY_NOTIFICATION, ACCOUNT_NOTIFICATION |
| `Rate limit exceeded` | Too many API calls | Wait 60s and retry |

### Debug Tips

```bash
# Verbose output for debugging
telnyx 10dlc brand get <id> --json

# Check number assignment status
telnyx 10dlc assignment status +15551234567

# List all campaigns with details
telnyx 10dlc campaign list --json | jq '.data[] | {id, status, usecase}'
```

### Timeline Expectations

| Step | Typical Time |
|------|--------------|
| Brand creation | Instant |
| Brand verification | 1-5 minutes (PIN via SMS/email) |
| Brand approval | 24-72 hours |
| Campaign review | 24-48 hours |
| Number assignment | Instant (after campaign approved) |

### Getting Help

- Telnyx docs: https://developers.telnyx.com/docs/messaging/10dlc
- Support portal: https://support.telnyx.com
- API status: https://status.telnyx.com

## Known Friction

Issues discovered during AIFDE-29 validation:

- **Campaign endpoint:** Use `POST /v2/10dlc/campaignBuilder` for creation (not `/campaign`). Use `/campaign/{id}` for GET/PUT/DELETE.
- **Response structure:** 10DLC endpoints return `.records` (not `.data`). Pagination uses `page`/`recordsPerPage` (not `page[number]`/`page[size]`).
- **No vetting webhook:** Brand vetting has no webhook notification. Must poll `GET /v2/10dlc/brand/{brandId}` and check `identityStatus`.
- **Brand deletion:** Brands with campaigns cannot be deleted. Delete campaigns first. Mock brands in pending state cannot be deleted at all.

## Pricing

Brand and campaign registration: **Free**
