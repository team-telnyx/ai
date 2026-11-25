---
name: telnyx-email-javascript
description: >-
  Send transactional email with the Telnyx Node.js SDK: single and batch sends,
  templates, scheduling, sandbox test sends, delivery status, and sending-domain
  setup. Use for welcome emails, password resets, receipts, notifications, and
  other app email from JavaScript or TypeScript.
metadata:
  author: telnyx
  product: email
  language: javascript
---

# Telnyx Email - JavaScript

## Installation

```bash
npm install telnyx
```

The Email API is available from `telnyx` 7.x. Method names below are from the
SDK source (`client.emailMessages`, `client.emailDomains`).

## Setup

```javascript
import Telnyx from 'telnyx';

const client = new Telnyx({ apiKey: process.env['TELNYX_API_KEY'] });
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors
(400 or 422), or authentication errors (401). Keep the error body: the Telnyx
error code and detail tell you what to fix.

```javascript
try {
  const { data } = await client.emailMessages.create({
    from: { email: 'orders@example.com', name: 'Example Orders' },
    to: ['customer@example.net'],
    subject: 'Order received',
    text_body: 'Thanks for your order.',
  });
  console.log(data.id, data.status);
} catch (error) {
  if (error instanceof Telnyx.AuthenticationError) {
    console.log('Invalid API key');
  } else if (error instanceof Telnyx.PermissionDeniedError) {
    console.log(`403: ${error.message}`); // sender domain not ready, or account level (see below)
  } else if (error instanceof Telnyx.UnprocessableEntityError) {
    console.log(`422: ${error.message}`); // validation or template rendering
  } else if (error instanceof Telnyx.RateLimitError) {
    console.log(`429: ${error.message}`); // read the code before retrying (see below)
  } else if (error instanceof Telnyx.APIError) {
    console.log(`API error ${error.status}: ${error.message}`);
  } else {
    throw error;
  }
}
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

- **Sender domain:** the domain in `from` must be added and verified first (see
  "Set up a sending domain"). Without a custom domain, sends from the shared
  Telnyx domain can go only to the account owner's verified address.
- **Accepted is not delivered:** a successful `create` means queued, scheduled,
  or sandbox-created. Use events or webhooks for delivery.
- **Address input:** `from`, `reply_to`, and each `to`/`cc`/`bcc` item accept a
  string or `{ email, name }`. Recipients must be unique across `to`, `cc`,
  and `bcc` (case-insensitive).
- **Body or template:** `subject` is required unless `template_id` is set. With
  `template_id`, do not also send `subject`, `html_body`, or `text_body`; pass
  values in `template_variables`.
- **Field names are snake_case** (`text_body`, `html_body`, `scheduled_at`),
  exactly as the API uses them.
- **Pagination:** list methods return async iterables:
  `for await (const item of client.emailMessages.list()) { ... }`.

## Operational Caveats

- **Scheduling is fail-open:** if `scheduled_at` is invalid or in the past, the
  API sends immediately. Check that the response `status` is `scheduled`.
- **Batch returns 207 Multi-Status** even when every item succeeds. Read
  `errors` for per-item failures.
- **Batch size:** the SDK (7.31, from the API spec of Nov 2026) documents up to
  1,000 messages per batch. The older curl Email skill states 1–50. If a large
  batch is rejected, split it and retry the parts.
- **Idempotency:** pass `'Idempotency-Key'` on `create` and `batch` for safe
  retries. Reuse a key only for the identical request.
- **Sandbox:** `sandbox_mode: true` delivers nothing and is not billed, but still
  records the message and emits a sandbox event. Use it in tests.
- **Body size:** the whole request, including Base64 attachments, is limited to
  8,000,000 bytes.

## Core Tasks

### Send an email

`POST /v2/email_messages` via `client.emailMessages.create`.

```javascript
const { data } = await client.emailMessages.create({
  from: { email: 'orders@example.com', name: 'Example Orders' },
  to: [{ email: 'customer@example.net', name: 'Customer' }],
  subject: 'Order received',
  html_body: '<p>Thanks for your order.</p>',
  text_body: 'Thanks for your order.',
  tags: ['order-confirmation'],
  'Idempotency-Key': 'order-1042-confirmation',
});

console.log(data.id, data.status); // e.g. "queued"
```

### Send with a template

```javascript
const { data } = await client.emailMessages.create({
  from: 'hello@example.com',
  to: ['new.user@example.net'],
  template_id: 'YOUR_TEMPLATE_ID',
  template_variables: { first_name: 'Ana', plan: 'Pro' },
});
```

### Send an attachment

```javascript
import { readFile } from 'node:fs/promises';

const pdf = await readFile('./invoice-1042.pdf');

await client.emailMessages.create({
  from: 'billing@example.com',
  to: ['customer@example.net'],
  subject: 'Your invoice',
  text_body: 'Your invoice is attached.',
  attachments: [
    {
      filename: 'invoice-1042.pdf',
      content_type: 'application/pdf',
      content: pdf.toString('base64'),
    },
  ],
});
```

### Schedule, reschedule, or cancel

```javascript
const { data } = await client.emailMessages.create({
  from: 'reminders@example.com',
  to: ['customer@example.net'],
  subject: 'Your appointment is tomorrow',
  text_body: 'See you at 10:00.',
  scheduled_at: '2030-01-15T09:00:00Z',
});
if (data.status !== 'scheduled') {
  throw new Error(`Expected a scheduled email, got ${data.status}`); // past times send at once
}

await client.emailMessages.updateSchedule(data.id, { scheduled_at: '2030-01-15T10:00:00Z' });
await client.emailMessages.deleteSchedule(data.id); // status becomes "cancelled"
```

### Send a batch

```javascript
const users = [
  { email: 'ana@example.net', name: 'Ana' },
  { email: 'bo@example.net', name: 'Bo' },
];

const result = await client.emailMessages.batch({
  messages: users.map((u) => ({
    from: 'news@example.com',
    to: [u.email],
    subject: `Hi ${u.name}, your weekly summary`,
    text_body: 'Here is what happened this week.',
  })),
  'Idempotency-Key': 'weekly-summary-2030-01-15',
});

// 207 Multi-Status: check per-item errors even when the call succeeds.
for (const err of result.errors) console.log(err.index, err.code);
```

### Test without sending

```javascript
const { data } = await client.emailMessages.create({
  from: 'orders@example.com',
  to: ['delivered@test.telnyx.com'], // reserved test address
  subject: 'Sandbox test',
  text_body: 'Not delivered, not billed.',
  sandbox_mode: true,
});
console.log(data.status); // "sandbox"
```

### Check status and events

```javascript
const { data: message } = await client.emailMessages.retrieve(messageId);
console.log(message.status);

for await (const event of client.emailMessages.retrieveEvents(messageId)) {
  console.log(event.occurred_at, event.event_type);
}
```

### Set up a sending domain

```javascript
const { data: domain } = await client.emailDomains.create({ domain: 'mail.example.com' });

// Publish these records at your DNS provider, then verify.
console.log(JSON.stringify(domain.dns_records, null, 2));
// Later, to re-read them: await client.emailDomains.retrieveDNSRecords(domain.id)

const { data: checked } = await client.emailDomains.verify(domain.id);
console.log(checked.status, checked.usable_for_sending); // send only when usable_for_sending is true
```

## Reference

Do not invent parameters, enums, response fields, or webhook fields. For every
field of the Email API (inbound mail, suppressions, unsubscribe groups,
validations, webhooks), read the curl Email skills in this plugin
(`telnyx-email-curl`, `telnyx-email-domains-curl`, `telnyx-email-inbound-curl`,
`telnyx-email-suppressions-curl`) and their `references/api-details.md`, and
the quickstart: https://developers.telnyx.com/docs/messaging/email/quickstart
