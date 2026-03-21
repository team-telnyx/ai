---
name: telnyx-fax-python
description: >-
  Send and receive faxes programmatically. Manage fax apps and media.
metadata:
  author: telnyx
  product: fax
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Fax - Python

## Core Workflow

### Prerequisites

1. Buy or port a phone number with fax capability (see telnyx-numbers-python)
2. Create a Fax Application with webhook URLs for inbound fax events
3. Assign the phone number to the Fax Application

### Steps

1. **Send fax**: `client.faxes.create(connection_id=..., to=..., from_=..., media_url=...)`
2. **Check status**: `client.faxes.retrieve(id=...)`
3. **Receive inbound fax**: `Handle fax.received webhook — media_url in payload`

### Common mistakes

- media_url must be a publicly accessible URL to a PDF or TIFF file
- Fax delivery is not instant — monitor status via webhooks or polling

**Related skills**: telnyx-numbers-python

## Installation

```bash
pip install telnyx
```

## Setup

```python
import os
from telnyx import Telnyx

client = Telnyx(
    api_key=os.environ.get("TELNYX_API_KEY"),  # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```python
import telnyx

try:
    result = client.faxes.create(params)
except telnyx.APIConnectionError:
    print("Network error — check connectivity and retry")
except telnyx.RateLimitError:
    # 429: rate limited — wait and retry with exponential backoff
    import time
    time.sleep(1)  # Check Retry-After header for actual delay
except telnyx.APIStatusError as e:
    print(f"API error {e.status_code}: {e.message}")
    if e.status_code == 422:
        print("Validation error — check required fields and formats")
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List methods return an auto-paginating iterator. Use `for item in page_result:` to iterate through all pages automatically.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Send a fax

Send a fax. Files have size limits and page count limit validations. If a file is bigger than 50MB or has more than 350 pages it will fail with `file_size_limit_exceeded` and `page_count_limit_exceeded` respectively.

`client.faxes.create()` — `POST /faxes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection_id` | string (UUID) | Yes | The connection ID to send the fax with. |
| `to` | string (E.164) | Yes | The phone number, in E.164 format, the fax will be sent to o... |
| `from_` | string (E.164) | Yes | The phone number, in E.164 format, the fax will be sent from... |
| `webhook_url` | string (URL) | No | Use this field to override the URL to which Telnyx will send... |
| `client_state` | string | No | Use this field to add state to every subsequent webhook. |
| `quality` | enum (normal, high, very_high, ultra_light, ultra_dark) | No | The quality of the fax. |
| ... | | | +9 optional params in [references/api-details.md](references/api-details.md) |

```python
fax = client.faxes.create(
    connection_id="234423",
    from_="+13125790015",
    to="+13127367276",
    media_url="https://example.com/document.pdf",
)
print(fax.data)
```

Key response fields: `response.data.id, response.data.status, response.data.to`

## View a fax

`client.faxes.retrieve()` — `GET /faxes/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The unique identifier of a fax. |

```python
fax = client.faxes.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(fax.data)
```

Key response fields: `response.data.id, response.data.status, response.data.to`

## Delete a fax

`client.faxes.delete()` — `DELETE /faxes/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The unique identifier of a fax. |

```python
client.faxes.delete(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
```

## List all Fax Applications

This endpoint returns a list of your Fax Applications inside the 'data' attribute of the response. You can adjust which applications are listed by using filters. Fax Applications are used to configure how you send and receive faxes using the Programmable Fax API with Telnyx.

`client.fax_applications.list()` — `GET /fax_applications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | enum (created_at, application_name, active) | No | Specifies the sort order for results. |
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```python
page = client.fax_applications.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Creates a Fax Application

Creates a new Fax Application based on the parameters sent in the request. The application name and webhook URL are required. Once created, you can assign phone numbers to your application using the `/phone_numbers` endpoint.

`client.fax_applications.create()` — `POST /fax_applications`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `application_name` | string | Yes | A user-assigned name to help manage the application. |
| `webhook_event_url` | string (URL) | Yes | The URL where webhooks related to this connection will be se... |
| `tags` | array[string] | No | Tags associated with the Fax Application. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `active` | boolean | No | Specifies whether the connection can be used. |
| ... | | | +4 optional params in [references/api-details.md](references/api-details.md) |

```python
fax_application = client.fax_applications.create(
    application_name="fax-router",
    webhook_event_url="https://example.com",
)
print(fax_application.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Retrieve a Fax Application

Return the details of an existing Fax Application inside the 'data' attribute of the response.

`client.fax_applications.retrieve()` — `GET /fax_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
fax_application = client.fax_applications.retrieve(
    "1293384261075731499",
)
print(fax_application.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Update a Fax Application

Updates settings of an existing Fax Application based on the parameters of the request.

`client.fax_applications.update()` — `PATCH /fax_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `application_name` | string | Yes | A user-assigned name to help manage the application. |
| `webhook_event_url` | string (URL) | Yes | The URL where webhooks related to this connection will be se... |
| `id` | string (UUID) | Yes | Identifies the resource. |
| `tags` | array[string] | No | Tags associated with the Fax Application. |
| `anchorsite_override` | enum (Latency, Chicago, IL, Ashburn, VA, San Jose, CA, Sydney, Australia, ...) | No | `Latency` directs Telnyx to route media through the site wit... |
| `active` | boolean | No | Specifies whether the connection can be used. |
| ... | | | +5 optional params in [references/api-details.md](references/api-details.md) |

```python
fax_application = client.fax_applications.update(
    id="1293384261075731499",
    application_name="fax-router",
    webhook_event_url="https://example.com",
)
print(fax_application.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## Deletes a Fax Application

Permanently deletes a Fax Application. Deletion may be prevented if the application is in use by phone numbers.

`client.fax_applications.delete()` — `DELETE /fax_applications/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the resource. |

```python
fax_application = client.fax_applications.delete(
    "1293384261075731499",
)
print(fax_application.data)
```

Key response fields: `response.data.id, response.data.created_at, response.data.updated_at`

## View a list of faxes

`client.faxes.list()` — `GET /faxes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated pagination parameter (deepObject style). |

```python
page = client.faxes.list()
page = page.data[0]
print(page.id)
```

Key response fields: `response.data.id, response.data.status, response.data.to`

## Cancel a fax

Cancel the outbound fax that is in one of the following states: `queued`, `media.processed`, `originated` or `sending`

`client.faxes.actions.cancel()` — `POST /faxes/{id}/actions/cancel`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The unique identifier of a fax. |

```python
response = client.faxes.actions.cancel(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

Key response fields: `response.data.result`

## Refresh a fax

Refreshes the inbound fax's media_url when it has expired

`client.faxes.actions.refresh()` — `POST /faxes/{id}/actions/refresh`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The unique identifier of a fax. |

```python
response = client.faxes.actions.refresh(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

Key response fields: `response.data.result`

---

## Webhooks

### Webhook Verification

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519`
and `telnyx-timestamp` headers. Always verify signatures in production:

```python
# In your webhook handler (e.g., Flask — use raw body, not parsed JSON):
@app.route("/webhooks", methods=["POST"])
def handle_webhook():
    payload = request.get_data(as_text=True)  # raw body as string
    headers = dict(request.headers)
    try:
        event = client.webhooks.unwrap(payload, headers=headers)
    except Exception as e:
        print(f"Webhook verification failed: {e}")
        return "Invalid signature", 400
    # Signature valid — event is the parsed webhook payload
    print(f"Received event: {event.data.event_type}")
    return "OK", 200
```

The following webhook events are sent to your configured webhook URL.
All webhooks include `telnyx-timestamp` and `telnyx-signature-ed25519` headers for Ed25519 signature verification. Use `client.webhooks.unwrap()` to verify.

| Event | `data.event_type` | Description |
|-------|-------------------|-------------|
| `fax.delivered` | `fax.delivered` | Fax Delivered |
| `fax.failed` | `fax.failed` | Fax Failed |
| `fax.media.processed` | `fax.media.processed` | Fax Media Processed |
| `fax.queued` | `fax.queued` | Fax Queued |
| `fax.sending.started` | `fax.sending.started` | Fax Sending Started |

Webhook payload field definitions are in [references/api-details.md](references/api-details.md).

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
