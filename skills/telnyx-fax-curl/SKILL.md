---
name: telnyx-fax-curl
description: "Send, receive, and track faxes programmatically via the Telnyx Fax API. Create and manage fax applications, send faxes from PDF or URL, check delivery status, and handle fax lifecycle webhooks. Use when sending faxes via API, receiving inbound faxes, managing fax-enabled phone numbers, or integrating fax capabilities into an application with curl."
metadata:
  author: telnyx
  product: fax
  language: curl
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Fax - curl

Send and receive faxes programmatically through the Telnyx REST API.

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
```

## Quick Start: Send a Fax

1. **Create a fax application** with a webhook URL
2. **Assign a phone number** to the fax application (via `/phone_numbers` endpoint)
3. **Send the fax** with the connection ID, from/to numbers, and a document
4. **Track delivery** via `fax.delivered` / `fax.failed` webhooks

## Important Notes

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code.
- **File limits**: max 50 MB file size, max 350 pages per fax.
- **Pagination**: List endpoints use `page[number]` and `page[size]` query parameters. Check `meta.total_pages` in the response.

## Fax Applications

### List Fax Applications

`GET /fax_applications`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/fax_applications?sort=application_name"
```

### Create a Fax Application

`POST /fax_applications` — Required: `application_name`, `webhook_event_url`

```bash
curl -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"application_name": "my-fax-app", "webhook_event_url": "https://example.com/webhooks/fax"}' \
  "https://api.telnyx.com/v2/fax_applications"
```

### Retrieve / Update / Delete a Fax Application

```bash
# Retrieve
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/fax_applications/{id}"

# Update
curl -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"application_name": "updated-name", "webhook_event_url": "https://example.com/webhooks/fax"}' \
  "https://api.telnyx.com/v2/fax_applications/{id}"

# Delete
curl -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/fax_applications/{id}"
```

See [references/api-details.md](references/api-details.md) for full response schemas and optional parameters.

## Send and Manage Faxes

### Send a Fax (file upload)

`POST /faxes` — Required: `connection_id`, `from`, `to`

```bash
curl -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -F "connection_id=234423" \
  -F "to=+13127367276" \
  -F "from=+13125790015" \
  -F "quality=high" \
  -F "contents=@/path/to/document.pdf" \
  "https://api.telnyx.com/v2/faxes"
```

### Send a Fax (media URL)

```bash
curl -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "connection_id": "234423",
    "to": "+13127367276",
    "from": "+13125790015",
    "media_url": "https://example.com/document.pdf",
    "quality": "high"
  }' \
  "https://api.telnyx.com/v2/faxes"
```

### List / View / Delete a Fax

```bash
# List all faxes
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/faxes"

# View a specific fax
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/faxes/{id}"

# Delete a fax
curl -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/faxes/{id}"
```

### Cancel / Refresh a Fax

```bash
# Cancel an outbound fax (must be queued, media.processed, originated, or sending)
curl -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/faxes/{id}/actions/cancel"

# Refresh an inbound fax media_url when expired
curl -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/faxes/{id}/actions/refresh"
```

---

## Webhooks

Telnyx signs webhooks with Ed25519. Each request includes `telnyx-signature-ed25519` and `telnyx-timestamp` headers. Use `client.webhooks.unwrap()` in your language SDK to verify. Your endpoint must return 2xx within 2 seconds.

| Event | Description |
|-------|-------------|
| `fax.queued` | Fax queued for sending |
| `fax.media.processed` | Fax media processed |
| `fax.sending.started` | Fax sending started |
| `fax.delivered` | Fax successfully delivered |
| `fax.failed` | Fax sending failed |

See [references/api-details.md](references/api-details.md) for full webhook payload field documentation.
