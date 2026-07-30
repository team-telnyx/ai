# Email

> Send transactional email, receive inbound messages, manage sending domains, and handle suppressions — all through the Telnyx v2 API.

## Prerequisites

- Telnyx API key ([get one free](https://telnyx.com/agent-signup.md))
- `jq` (for extracting IDs from responses in the examples below)
- A verified sending domain (see [Domain Setup](#set-up-a-sending-domain) below)

Export your API key once — every example below uses it:

```bash
export TELNYX_API_KEY="KEY_your_api_key_here"
```

## Quick Start

```bash
# Send your first email (from an address on your verified domain)
curl -X POST "https://api.telnyx.com/v2/email_messages" \
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

## API Reference

### Set Up a Sending Domain

Before sending email, verify a domain. Set `inbound_enabled: true` if you also want to receive email on this domain:

```bash
# Create a domain (capture the ID for later steps)
DOMAIN_ID=$(curl -s -X POST "https://api.telnyx.com/v2/email_domains" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"domain": "mail.example.com", "inbound_enabled": true}' \
  | jq -r '.data.id')

# Get DNS records to publish
curl "https://api.telnyx.com/v2/email_domains/$DOMAIN_ID/dns_records" \
  -H "Authorization: Bearer $TELNYX_API_KEY"

# Verify DNS after publishing the records with your DNS provider
curl -X POST "https://api.telnyx.com/v2/email_domains/$DOMAIN_ID/verify" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### Send Email

**`POST /v2/email_messages`**

```bash
# Capture the message ID for use in tracking and cancellation examples below
EMAIL_ID=$(curl -s -X POST "https://api.telnyx.com/v2/email_messages" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "sender@mail.example.com",
    "to": ["recipient@example.com"],
    "subject": "Your verification code",
    "html_body": "<p>Your code is <strong>123456</strong></p>",
    "text_body": "Your code is 123456"
  }' | jq -r '.data.id')
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string | Yes | Sender email address (must be on a verified domain) |
| `to` | array | Yes | Recipient email addresses |
| `subject` | string | Yes | Email subject line |
| `html_body` | string | No | HTML body content |
| `text_body` | string | No | Plain text body content |
| `cc` | array | No | CC recipients |
| `bcc` | array | No | BCC recipients |
| `reply_to` | string | No | Reply-to address |
| `scheduled_at` | string | No | ISO 8601 datetime for scheduled send (must be in the future — past values send immediately) |
| `tags` | array | No | Billing/reporting tags (immutable) |
| `attachments` | array | No | Base64-encoded attachments |

**Response** (addresses are returned as objects with `email` and optional `name`):

```json
{
  "data": {
    "id": "uuid-here",
    "record_type": "email_message",
    "status": "queued",
    "from": { "email": "sender@mail.example.com" },
    "to": [{ "email": "recipient@example.com" }],
    "subject": "Your verification code"
  }
}
```

### Batch Send

**`POST /v2/email_messages/batch`**

```bash
curl -X POST "https://api.telnyx.com/v2/email_messages/batch" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "from": "sender@mail.example.com",
        "to": ["user1@example.com"],
        "subject": "Welcome",
        "text_body": "Welcome!"
      },
      {
        "from": "sender@mail.example.com",
        "to": ["user2@example.com"],
        "subject": "Welcome",
        "text_body": "Welcome!"
      }
    ]
  }'
```

Batch always returns `207 Multi-Status`. Max 50 messages per request.

### Receive Inbound Email

Requires a domain created with `inbound_enabled: true` (see [domain setup](#set-up-a-sending-domain) above). Create an inbox and configure a webhook:

```bash
# Create an inbox (address will be support@mail.example.com)
curl -X POST "https://api.telnyx.com/v2/email_inboxes" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "domain_id": "'$DOMAIN_ID'",
    "username": "support"
  }'

# Configure webhook for inbound events
curl -X POST "https://api.telnyx.com/v2/email_domains/$DOMAIN_ID/webhooks" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhooks/email",
    "events": ["email.received"]
  }'
```

### Track Delivery Events

```bash
# List events for a specific message
curl "https://api.telnyx.com/v2/email_messages/$EMAIL_ID/events" \
  -H "Authorization: Bearer $TELNYX_API_KEY"

# Get account-wide event statistics
curl "https://api.telnyx.com/v2/email_events/stats" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### Python

```bash
pip install httpx
```

```python
import os
import httpx

client = httpx.Client(
    base_url="https://api.telnyx.com/v2",
    headers={"Authorization": f"Bearer {os.environ['TELNYX_API_KEY']}"}
)

# Send an email
response = client.post("/email_messages", json={
    "from": "sender@mail.example.com",
    "to": ["recipient@example.com"],
    "subject": "Hello from Python",
    "text_body": "Sent via Telnyx Email API"
})
print(response.json())
```

### TypeScript

```typescript
const apiKey = process.env.TELNYX_API_KEY;

const response = await fetch("https://api.telnyx.com/v2/email_messages", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: "sender@mail.example.com",
    to: ["recipient@example.com"],
    subject: "Hello from TypeScript",
    text_body: "Sent via Telnyx Email API",
  }),
});

const data = await response.json();
console.log(data);
```

## Webhooks

Email webhooks are configured at the **domain level** via `POST /v2/email_domains/{id}/webhooks` (not per-message).

### Verification

Every webhook request is signed with an Ed25519 signature. Verification is asymmetric — you verify with the **Telnyx public key** (from the [portal webhook settings](https://portal.telnyx.com)), not a shared secret:

1. Read the raw request body (do not parse or re-serialize JSON first)
2. Get the `telnyx-signature-ed25519` and `telnyx-timestamp` headers
3. Verify the signature over `{timestamp}|{raw_body}` using the Telnyx Ed25519 **public key**
4. Reject requests where the timestamp is older than 5 minutes
5. Deduplicate by event ID — the same event may be delivered more than once
6. Return `2xx` within 10 seconds to acknowledge receipt
7. Telnyx retries on timeout or non-2xx — keep your endpoint idempotent

### Key Events

| Event | Description |
|-------|-------------|
| `email.queued` | Message accepted into the sending queue |
| `email.sending` | Message handed to the MTA |
| `email.sent` | Message accepted by the receiving MTA |
| `email.delivered` | Message delivered to recipient |
| `email.bounced` | Message bounced |
| `email.failed` | Delivery failed permanently |
| `email.received` | Inbound message arrived in an inbox |
| `email.complained` | Recipient filed a spam complaint |
| `email.unsubscribed` | Recipient unsubscribed |

## Available Skills

| Skill | Description |
|------|-------------|
| `telnyx-email-curl` | Send, batch, schedule, templates, events, validation |
| `telnyx-email-inbound-curl` | Inboxes, messages, threads, filters, reply/forward |
| `telnyx-email-domains-curl` | Domain CRUD, DNS verification, health, domain webhooks |
| `telnyx-email-suppressions-curl` | Blocks, import/export, unsubscribe groups |

Install with:

```bash
npx skills add team-telnyx/ai --skill telnyx-email-curl --agent cursor
```

For _XqCCod (the `telnyx-email` plugin bundles all four skills):

```bash
/plugin install telnyx-email@telnyx
```

## Not Yet Available

The following operations exist in the API spec but are not yet routed through the gateway:

- **Drafts** (8 operations): Create, list, get, update, patch, delete, send, reply-draft
- **Labels** (4 operations): Add/remove labels on messages and threads
- **Message deletion** (2 operations): Delete by address, delete by ID
