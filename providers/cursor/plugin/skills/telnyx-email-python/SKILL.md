---
name: telnyx-email-python
description: >-
  Send transactional email with the Telnyx Python SDK: single and batch sends,
  templates, scheduling, sandbox test sends, delivery status, and sending-domain
  setup. Use for welcome emails, password resets, receipts, notifications, and
  other app email from Python.
metadata:
  author: telnyx
  product: email
  language: python
---

# Telnyx Email - Python

## Installation

```bash
pip install telnyx
```

Method names below are from the SDK source (`client.email_messages`,
`client.email_domains`).

## Setup

```python
import os
from telnyx import Telnyx

client = Telnyx(
    api_key=os.environ.get("TELNYX_API_KEY"),
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors
(400 or 422), or authentication errors (401). Keep the error body: the Telnyx
error code and detail tell you what to fix.

```python
import telnyx

try:
    response = client.email_messages.create(
        from_={"email": "orders@example.com", "name": "Example Orders"},
        to=["customer@example.net"],
        subject="Order received",
        text_body="Thanks for your order.",
    )
    print(response.data.id, response.data.status)
except telnyx.AuthenticationError:
    print("Invalid API key")
except telnyx.PermissionDeniedError as e:
    print(f"403: {e.message}")  # sender domain not ready, or account level (see below)
except telnyx.UnprocessableEntityError as e:
    print(f"422: {e.message}")  # validation or template rendering
except telnyx.RateLimitError as e:
    print(f"429: {e.message}")  # read the code before retrying (see below)
except telnyx.APIStatusError as e:
    print(f"API error {e.status_code}: {e.message}")
except telnyx.APIConnectionError:
    print("Network error")
```

Common errors: `401` invalid credentials, `403` sender-domain eligibility or
verification failure, `404` not found, `413` body larger than 8,000,000 bytes,
and `422` validation or template-rendering failure.

- **403 with code `10007` on a Trial account:** the email quickstart says Trial
  accounts can send only to the account owner's verified email address, even
  with a custom domain. Tell the user to upgrade the account at
  https://telnyx.com/upgrade to send to other recipients.
- **429 is not always "slow down":** it can be a reputation suspension or a
  daily policy limit. Read the error code and detail before retrying.

## Important Notes

- **`from_`, not `from`:** `from` is a Python keyword, so `create` takes
  `from_=`. Inside a batch, each message is a dict, so there the key is
  `"from"`.
- **Sender domain:** the domain in `from_` must be added and verified first
  (see "Set up a sending domain"). Without a custom domain, sends from the
  shared Telnyx domain can go only to the account owner's verified address.
- **Accepted is not delivered:** a successful `create` means queued, scheduled,
  or sandbox-created. Use events or webhooks for delivery.
- **Address input:** `from_`, `reply_to`, and each `to`/`cc`/`bcc` item accept a
  string or `{"email": ..., "name": ...}`. Recipients must be unique across
  `to`, `cc`, and `bcc` (case-insensitive).
- **Body or template:** `subject` is required unless `template_id` is set. With
  `template_id`, do not also send `subject`, `html_body`, or `text_body`; pass
  values in `template_variables`.
- **Pagination:** list methods auto-paginate when iterated:
  `for message in client.email_messages.list(): ...`.

## Operational Caveats

- **Scheduling is fail-open:** if `scheduled_at` is invalid or in the past, the
  API sends immediately. Check that the response `status` is `"scheduled"`.
- **Batch returns 207 Multi-Status** even when every item succeeds. Read
  `errors` for per-item failures.
- **Batch size:** the SDK (from the API spec of Nov 2026) documents up to 1,000
  messages per batch. The older curl Email skill states 1–50. If a large batch
  is rejected, split it and retry the parts.
- **Idempotency:** pass `idempotency_key=` on `create` and `batch` for safe
  retries. Reuse a key only for the identical request.
- **Sandbox:** `sandbox_mode=True` delivers nothing and is not billed, but still
  records the message and emits a sandbox event. Use it in tests.
- **Body size:** the whole request, including Base64 attachments, is limited to
  8,000,000 bytes.

## Core Tasks

### Send an email

`POST /v2/email_messages` via `client.email_messages.create`.

```python
response = client.email_messages.create(
    from_={"email": "orders@example.com", "name": "Example Orders"},
    to=[{"email": "customer@example.net", "name": "Customer"}],
    subject="Order received",
    html_body="<p>Thanks for your order.</p>",
    text_body="Thanks for your order.",
    tags=["order-confirmation"],
    idempotency_key="order-1042-confirmation",
)
print(response.data.id, response.data.status)  # e.g. "queued"
```

### Send with a template

```python
client.email_messages.create(
    from_="hello@example.com",
    to=["new.user@example.net"],
    template_id="YOUR_TEMPLATE_ID",
    template_variables={"first_name": "Ana", "plan": "Pro"},
)
```

### Send an attachment

```python
import base64
from pathlib import Path

pdf = Path("invoice-1042.pdf").read_bytes()

client.email_messages.create(
    from_="billing@example.com",
    to=["customer@example.net"],
    subject="Your invoice",
    text_body="Your invoice is attached.",
    attachments=[
        {
            "filename": "invoice-1042.pdf",
            "content_type": "application/pdf",
            "content": base64.b64encode(pdf).decode("ascii"),
        }
    ],
)
```

### Schedule, reschedule, or cancel

```python
response = client.email_messages.create(
    from_="reminders@example.com",
    to=["customer@example.net"],
    subject="Your appointment is tomorrow",
    text_body="See you at 10:00.",
    scheduled_at="2030-01-15T09:00:00Z",
)
if response.data.status != "scheduled":
    raise RuntimeError(f"Expected a scheduled email, got {response.data.status}")  # past times send at once

client.email_messages.update_schedule(response.data.id, scheduled_at="2030-01-15T10:00:00Z")
client.email_messages.delete_schedule(response.data.id)  # status becomes "cancelled"
```

### Send a batch

```python
users = [
    {"email": "ana@example.net", "name": "Ana"},
    {"email": "bo@example.net", "name": "Bo"},
]

result = client.email_messages.batch(
    messages=[
        {
            "from": "news@example.com",
            "to": [u["email"]],
            "subject": f"Hi {u['name']}, your weekly summary",
            "text_body": "Here is what happened this week.",
        }
        for u in users
    ],
    idempotency_key="weekly-summary-2030-01-15",
)

# 207 Multi-Status: check per-item errors even when the call succeeds.
for err in result.errors:
    print(err.index, err.code)
```

### Test without sending

```python
response = client.email_messages.create(
    from_="orders@example.com",
    to=["delivered@test.telnyx.com"],  # reserved test address
    subject="Sandbox test",
    text_body="Not delivered, not billed.",
    sandbox_mode=True,
)
print(response.data.status)  # "sandbox"
```

### Check status and events

```python
message = client.email_messages.retrieve(message_id)
print(message.data.status)

for event in client.email_messages.retrieve_events(message_id):
    print(event.occurred_at, event.event_type)
```

### Set up a sending domain

```python
domain = client.email_domains.create(domain="mail.example.com").data

# Publish these records at your DNS provider, then verify.
for record in domain.dns_records:
    print(record)
# Later, to re-read them: client.email_domains.retrieve_dns_records(domain.id)

checked = client.email_domains.verify(domain.id).data
print(checked.status, checked.usable_for_sending)  # send only when usable_for_sending is True
```

## Reference

Do not invent parameters, enums, response fields, or webhook fields. For every
field of the Email API (inbound mail, suppressions, unsubscribe groups,
validations, webhooks), read the curl Email skills in this plugin
(`telnyx-email-curl`, `telnyx-email-domains-curl`, `telnyx-email-inbound-curl`,
`telnyx-email-suppressions-curl`) and their `references/api-details.md`, and
the quickstart: https://developers.telnyx.com/docs/messaging/email/quickstart
