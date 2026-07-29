# Email Guide

Telnyx Email API lets you send transactional email, receive inbound messages, manage sending domains, and handle suppressions — all through the same Telnyx v2 API you already use for messaging and voice.

## Overview

The Email API is organized into four product areas:

| Area | Skill | Description |
|------|-------|-------------|
| Outbound | `telnyx-email-curl` | Send single/batch/scheduled email, templates, events, validation |
| Inbound | `telnyx-email-inbound-curl` | Inboxes, messages, threads, filters, reply/forward |
| Domains | `telnyx-email-domains-curl` | Domain CRUD, DNS verification, health, domain webhooks |
| Suppressions | `telnyx-email-suppressions-curl` | Block lists, import/export, unsubscribe groups |

## Getting Started

### 1. Set up a sending domain

Before sending email, you need a verified sending domain:

```bash
# Create a domain
curl -X POST https://api.telnyx.com/v2/email_domains \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"domain": "mail.example.com"}'

# Get DNS records to publish
curl https://api.telnyx.com/v2/email_domains/$DOMAIN_ID/dns_records \
  -H "Authorization: Bearer $TELNYX_API_KEY"

# Verify DNS records after publishing
curl -X POST https://api.telnyx.com/v2/email_domains/$DOMAIN_ID/verify \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### 2. Send your first email

```bash
curl -X POST https://api.telnyx.com/v2/email_messages \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "sender@mail.example.com",
    "to": ["recipient@example.com"],
    "subject": "Hello from Telnyx",
    "html_body": "<h1>Welcome</h1><p>This is your first email.</p>",
    "text_body": "Welcome! This is your first email."
  }'
```

### 3. Receive inbound email

Create an inbox on your verified domain:

```bash
curl -X POST https://api.telnyx.com/v2/email_inboxes \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Support",
    "domain_id": "'$DOMAIN_ID'",
    "username": "support"
  }'
```

Configure a domain webhook to receive `email.received` events:

```bash
curl -X POST https://api.telnyx.com/v2/email_domains/$DOMAIN_ID/webhooks \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhooks/email",
    "events": ["email.received"]
  }'
```

### 4. Track delivery

```bash
# List delivery events for a message
curl "https://api.telnyx.com/v2/email_messages/$EMAIL_ID/events" \
  -H "Authorization: Bearer $TELNYX_API_KEY"

# Get account-wide event statistics
curl "https://api.telnyx.com/v2/email_events/stats" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

## Webhooks

Email webhooks are configured at the **domain level** (not per-message like Telnyx messaging). All webhook events for a domain are delivered to the URLs you configure via `POST /v2/email_domains/{id}/webhooks`.

### Verification

Every webhook request is signed with an Ed25519 signature:

1. Read the raw request body (do not parse JSON first)
2. Get the `telnyx-signature-ed25519` and `telnyx-timestamp` headers
3. Verify the signature against the raw body using your webhook signing secret
4. Reject requests where the timestamp is older than 5 minutes
5. Deduplicate by event ID — the same event may be delivered more than once
6. Return `2xx` within 10 seconds to acknowledge receipt
7. Telnyx retries on timeout or non-2xx responses — keep your endpoint idempotent

### Key webhook events

| Event | Description |
|-------|-------------|
| `email.queued` | Message accepted into the sending queue |
| `email.sending` | Message handed to the MTA for delivery |
| `email.sent` | Message accepted by the receiving MTA |
| `email.delivered` | Message successfully delivered to the recipient |
| `email.bounced` | Message bounced (hard or soft) |
| `email.failed` | Delivery failed permanently |
| `email.received` | Inbound message arrived in an inbox |
| `email.complained` | Recipient filed a spam complaint |
| `email.unsubscribed` | Recipient unsubscribed |

## Skill Reference

Install the skill for your agent:

```bash
# Core outbound (send, templates, events, validation)
npx skills add team-telnyx/ai --skill telnyx-email-curl --agent cursor

# Inbound (inboxes, messages, threads, reply/forward)
npx skills add team-telnyx/ai --skill telnyx-email-inbound-curl --agent cursor

# Domains (DNS, health, webhooks)
npx skills add team-telnyx/ai --skill telnyx-email-domains-curl --agent cursor

# Suppressions (blocks, unsubscribe groups)
npx skills add team-telnyx/ai --skill telnyx-email-suppressions-curl --agent cursor
```

For Claude Code plugins:

```bash
claude plugin add team-telnyx/ai --plugin telnyx-email
```

## Not Yet Available

The following operations exist in the API spec but are not yet routed through the gateway:

- **Drafts** (8 operations): Create, list, get, update, patch, delete, send, reply-draft
- **Labels** (4 operations): Add/remove labels on messages and threads
- **Message deletion** (2 operations): Delete by address, delete by ID

These will be available once gateway routes are deployed.
