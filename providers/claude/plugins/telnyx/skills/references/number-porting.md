# Number Porting: Move Numbers from Twilio to Telnyx

Programmatic guide for porting phone numbers from Twilio (or any carrier) to Telnyx, including FastPort for same-day activation.

## Table of Contents

- [Overview](#overview)
- [Before You Start](#before-you-start)
- [Step 1: Check Portability](#step-1-check-portability)
- [Step 2: Create a Porting Order](#step-2-create-a-porting-order)
- [Step 3: Fulfill Requirements](#step-3-fulfill-requirements)
- [Step 4: Submit the Order](#step-4-submit-the-order)
- [Step 5: Monitor and Activate](#step-5-monitor-and-activate)
- [FastPort: Same-Day Activation](#fastport-same-day-activation)
- [Bulk Porting](#bulk-porting)
- [Troubleshooting](#troubleshooting)

## Overview

Telnyx supports programmatic number porting via REST API. The flow:

1. **Portability check** — verify numbers can be ported and check FastPort eligibility
2. **Create porting order** — submit the list of numbers
3. **Fulfill requirements** — upload LOA, provide account holder info
4. **Submit** — initiate the port with the losing carrier
5. **Activate** — numbers go live on Telnyx (automatic or on-demand with FastPort)

No port-in fees for US and Canadian numbers.

## Before You Start

Gather this information from your Twilio account:

- **Account holder name** — the name on your Twilio account (must match exactly)
- **Service address** — the address associated with the numbers in Twilio
- **Account number or SID** — your Twilio Account SID
- **Recent invoice** — download from Twilio Console → Billing
- **PIN/password** — if you set a porting PIN in Twilio (Settings → General → Porting)
- **List of numbers** — in E.164 format (+1XXXXXXXXXX)

You will also need a **Letter of Authorization (LOA)** — Telnyx provides a template during the porting process.

## Step 1: Check Portability

```bash
curl -X POST https://api.telnyx.com/v2/portability_checks \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_numbers": ["+15551234567", "+15559876543"]
  }'
```

Response includes per-number results:

```json
{
  "data": [
    {
      "phone_number": "+15551234567",
      "portable": true,
      "fast_port_eligible": true,
      "messaging_capable": true
    },
    {
      "phone_number": "+15559876543",
      "portable": true,
      "fast_port_eligible": false,
      "messaging_capable": true
    }
  ]
}
```

Key fields:
- `portable` — whether the number can be ported to Telnyx
- `fast_port_eligible` — whether FastPort (same-day activation) is available
- `messaging_capable` — whether SMS/MMS will work after porting

## Step 2: Create a Porting Order

```bash
curl -X POST https://api.telnyx.com/v2/porting_orders \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_numbers": [
      {"phone_number": "+15551234567"},
      {"phone_number": "+15559876543"}
    ]
  }'
```

The API may **auto-split** the order into multiple sub-orders based on:
- Country boundaries
- Number type (local, toll-free, mobile)
- Carrier/SPID variations
- FastPort eligibility

Each sub-order must be managed independently. Check the response for multiple order IDs.

## Step 3: Fulfill Requirements

Upload supporting documents and provide account holder information.

### Upload Documents

```bash
# Upload LOA
curl -X POST https://api.telnyx.com/v2/documents \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -F "file=@/path/to/loa.pdf"

# Response: {"data": {"id": "doc_uuid_1"}}

# Upload recent invoice
curl -X POST https://api.telnyx.com/v2/documents \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -F "file=@/path/to/invoice.pdf"

# Response: {"data": {"id": "doc_uuid_2"}}
```

### Update the Porting Order

```bash
curl -X PATCH "https://api.telnyx.com/v2/porting_orders/$ORDER_ID" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "end_user": {
      "admin": {
        "account_number": "YOUR_TWILIO_SID",
        "auth_person_name": "Jane Smith",
        "billing_phone_number": "+15551234567"
      },
      "location": {
        "street_address": "123 Main St",
        "city": "Chicago",
        "state": "IL",
        "zip": "60601"
      }
    },
    "documents": ["doc_uuid_1", "doc_uuid_2"],
    "activation_settings": {
      "activation_type": "on-demand"
    }
  }'
```

Set `activation_type` to `"on-demand"` for FastPort (choose when numbers go live) or omit for automatic activation on the FOC date.

## Step 4: Submit the Order

```bash
curl -X POST "https://api.telnyx.com/v2/porting_orders/$ORDER_ID/actions/submit" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

The order transitions from draft to in-process. Telnyx begins coordination with the losing carrier (Twilio's underlying carrier).

## Step 5: Monitor and Activate

### Poll for Status

```bash
curl "https://api.telnyx.com/v2/porting_orders/$ORDER_ID" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### Order Status Flow

```
draft → in-process → foc-date-confirmed → ported (or) exception
```

| Status | Meaning |
|---|---|
| `draft` | Order created, requirements not yet fulfilled |
| `in-process` | Submitted, awaiting carrier response |
| `foc-date-confirmed` | Firm Order Commitment date set — numbers will port on this date |
| `ported` | Numbers are live on Telnyx |
| `exception` | Issue with the order — check comments for details |

### Webhooks

Configure webhook URL in the portal to receive:
- `porting_order.status_changed` — order status transitions
- `porting_order.new_comment` — messages from Telnyx Porting Operations

### Add Comments (if needed)

```bash
curl -X POST "https://api.telnyx.com/v2/porting_orders/$ORDER_ID/comments" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"body": "Updated LOA with corrected address."}'
```

## FastPort: Same-Day Activation

FastPort is available for eligible US and Canadian numbers. It provides two key advantages:

### 1. Real-Time LOA Validation

Standard porting: submit LOA, wait days for carrier to accept or reject, resubmit if rejected.

FastPort: validates your LOA information **in real-time** against the losing carrier's records. Errors are caught immediately before submission, eliminating round-trip delays.

### 2. On-Demand Activation

Standard porting: numbers activate automatically whenever the losing carrier processes the FOC date. You have no control over the exact moment.

FastPort: once the FOC date is confirmed, you choose exactly when numbers go live:

**Activation Windows:**

| Country | Window | Hours (Central Time) |
|---|---|---|
| US | 14 hours | 6:00 AM – 8:00 PM |
| Canada | 7 hours | 8:00 AM – 3:00 PM |

### Trigger On-Demand Activation

Once the order reaches `foc-date-confirmed`:

```bash
# Check activation window
curl "https://api.telnyx.com/v2/porting_orders/$ORDER_ID/activation_jobs" \
  -H "Authorization: Bearer $TELNYX_API_KEY"

# Activate now
curl -X POST "https://api.telnyx.com/v2/porting_orders/$ORDER_ID/actions/activate" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

If you do not manually activate within the window, numbers auto-activate at the end of the window (fail-safe).

## Bulk Porting

For large number migrations, submit multiple numbers in a single porting order. The API auto-splits by carrier and type.

Tips for bulk ports from Twilio:
- Export your number list from Twilio Console → Phone Numbers → Active Numbers
- Format all numbers in E.164 (+1XXXXXXXXXX)
- Group by type if possible (local vs toll-free) to simplify document requirements
- Toll-free numbers may require separate LOA forms

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| Order stuck in `exception` | LOA info doesn't match carrier records | Check comments, update LOA with exact name/address from Twilio account |
| `fast_port_eligible: false` | Losing carrier doesn't support real-time validation | Use standard porting (still works, just slower) |
| Split into many sub-orders | Numbers on different underlying carriers | Normal behavior — manage each sub-order independently |
| Rejected by losing carrier | Account holder mismatch or missing PIN | Verify exact account name, check if Twilio has a porting PIN set |
| Numbers not receiving calls after port | Not assigned to a connection | Assign numbers to a SIP Connection or TeXML Application in Mission Control |
| SMS not working after port | Not assigned to a Messaging Profile | Assign numbers to a Messaging Profile in Mission Control |
