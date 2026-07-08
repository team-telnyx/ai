# Fax Migration: Twilio Fax to Telnyx Programmable Fax

Migrate from Twilio Fax (deprecated 2021, shut down December 2022) to Telnyx Programmable Fax.

## Table of Contents

- [Overview](#overview)
- [Key Differences](#key-differences)
- [Concept Mapping](#concept-mapping)
- [Step 1: Create a Fax Application](#step-1-create-a-fax-application)
- [Step 2: Send a Fax](#step-2-send-a-fax)
- [Step 3: Receive Faxes (Webhooks)](#step-3-receive-faxes-webhooks)
- [Step 4: Manage Faxes](#step-4-manage-faxes)
- [T.38 Support](#t38-support)
- [Media Handling](#media-handling)
- [Webhook Events](#webhook-events)
- [API Endpoint Mapping](#api-endpoint-mapping)
- [Common Pitfalls](#common-pitfalls)

## Overview

Twilio deprecated its Fax API in 2021 and fully shut it down in December 2022. If you are migrating from a Twilio-based fax solution (or a third-party replacement you adopted after the shutdown), Telnyx Programmable Fax is a fully supported, actively maintained alternative.

Telnyx Programmable Fax provides:
- Send and receive faxes over the PSTN via API
- Native T.38 fax protocol support
- PDF and TIFF delivery formats
- Webhook-driven status events
- Fax Application resource for routing and configuration

## Key Differences

1. **Telnyx Fax is actively supported** — Twilio Fax was shut down in December 2022. Telnyx Programmable Fax is a current, maintained product.
2. **Fax Application model** — Telnyx uses a dedicated Fax Application resource (similar to a TeXML Application) for inbound routing, webhooks, and AnchorSite settings.
3. **T.38 native support** — Telnyx supports on-net T.38 fax protocol negotiation. Twilio used T.38 internally but did not expose configuration options.
4. **Quality settings** — Telnyx offers `normal`, `high`, `ultra_light` (best for images), and `ultra_dark` (best for text) quality modes.
5. **Authentication** — Twilio used Basic Auth (SID:Token). Telnyx uses Bearer Token. Webhook signatures use Ed25519.
6. **Delivery format** — Telnyx delivers received faxes as PDF or TIFF (configurable per application).

## Concept Mapping

| Twilio Concept | Telnyx Equivalent | Notes |
|---|---|---|
| Fax Resource | Fax Resource | Similar object model |
| Fax Media (sub-resource) | `media_url` on Fax object | No separate media sub-resource |
| SID (Fax identifier) | `id` (UUID) | Different ID format |
| Account SID + Auth Token | API Key v2 (Bearer Token) | Single credential |
| Fax-enabled number | Number assigned to Fax Application | Must be assigned to a Fax Application |
| Status callbacks | Webhook events on Fax Application | `fax.queued`, `fax.delivered`, etc. |
| `Quality` parameter | `quality` parameter | Different value names |

## Step 1: Create a Fax Application

A Fax Application is required to receive inbound faxes and to route outbound faxes. Create one in the Mission Control Portal or via API:

```bash
curl -X POST https://api.telnyx.com/v2/fax_applications \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "application_name": "my-fax-app",
    "webhook_event_url": "https://example.com/fax-webhooks",
    "webhook_event_failover_url": "https://backup.example.com/fax-webhooks",
    "active": true
  }'
```

Then assign phone numbers to the Fax Application in the portal or via the number update API.

Configuration options on a Fax Application:

| Setting | Description |
|---|---|
| `webhook_event_url` | URL to receive fax event webhooks |
| `webhook_event_failover_url` | Backup webhook URL |
| `webhook_timeout_secs` | Custom webhook timeout |
| `anchorsite_override` | Regional media PoP selection (Latency or specific site) |
| Inbound delivery format | PDF or TIFF |
| Inbound channel limit | Max concurrent inbound faxes |
| Outbound Voice Profile | Controls outbound fax routing and billing |

## Step 2: Send a Fax

### curl

```bash
# Twilio (no longer available)
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_SID/Faxes.json" \
  -u "$TWILIO_SID:$TWILIO_AUTH_TOKEN" \
  -d "To=+15559876543" \
  -d "From=+15551234567" \
  -d "MediaUrl=https://example.com/document.pdf"

# Telnyx
curl -X POST https://api.telnyx.com/v2/faxes \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "connection_id": "YOUR_FAX_APP_ID",
    "to": "+15559876543",
    "from": "+15551234567",
    "media_url": "https://example.com/document.pdf"
  }'
```

### Python

```python
# Twilio (no longer available)
from twilio.rest import Client
client = Client(account_sid, auth_token)
fax = client.fax.faxes.create(
    to="+15559876543",
    from_="+15551234567",
    media_url="https://example.com/document.pdf"
)

# Telnyx
from telnyx import Telnyx
client = Telnyx(api_key="YOUR_TELNYX_API_KEY")

fax = client.faxes.create(
    connection_id="YOUR_FAX_APP_ID",
    to="+15559876543",
    from_="+15551234567",
    media_url="https://example.com/document.pdf"
)
print(fax.id)
```

### JavaScript

```javascript
// Twilio (no longer available)
const twilio = require('twilio');
const client = twilio(accountSid, authToken);
const fax = await client.fax.faxes.create({
  to: '+15559876543',
  from: '+15551234567',
  mediaUrl: 'https://example.com/document.pdf'
});

// Telnyx
const Telnyx = require('telnyx');
const client = new Telnyx({ apiKey: 'YOUR_TELNYX_API_KEY' });

const fax = await client.faxes.create({
  connection_id: 'YOUR_FAX_APP_ID',
  to: '+15559876543',
  from: '+15551234567',
  media_url: 'https://example.com/document.pdf'
});
console.log(fax.data.id);
```

**Send fax parameters:**

| Parameter | Required | Description |
|---|---|---|
| `connection_id` | Yes | The Fax Application ID or connection ID |
| `to` | Yes | Destination fax number (E.164) or SIP URI |
| `from` | Yes | Your Telnyx fax-enabled number (E.164) |
| `media_url` | Yes | URL to the PDF document to fax |
| `quality` | No | Fax quality: `normal`, `high`, `ultra_light`, `ultra_dark` |
| `t38_enabled` | No | Enable T.38 protocol for this fax (boolean) |
| `monochrome` | No | Force monochrome transmission (boolean) |
| `webhook_url` | No | Override webhook URL for this specific fax |

A successful send returns **HTTP 202** with a fax object containing a unique `id` for tracking.

## Step 3: Receive Faxes (Webhooks)

Inbound faxes are delivered to your Fax Application's webhook URL. When a fax arrives at one of your assigned numbers, Telnyx sends webhook events with the fax data.

```python
# Flask example for receiving fax webhooks
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/fax-webhooks', methods=['POST'])
def fax_webhook():
    event = request.json
    event_type = event['data']['event_type']
    payload = event['data']['payload']

    if event_type == 'fax.received':
        fax_id = payload['fax_id']
        from_number = payload['from']
        media_url = payload['media_url']
        page_count = payload['page_count']
        print(f"Received fax {fax_id} from {from_number}: {page_count} pages")
        # Download the fax PDF from media_url

    return jsonify({"status": "ok"}), 200
```

```javascript
// Express example for receiving fax webhooks
const express = require('express');
const app = express();
app.use(express.json());

app.post('/fax-webhooks', (req, res) => {
  const event = req.body;
  const eventType = event.data.event_type;
  const payload = event.data.payload;

  if (eventType === 'fax.received') {
    console.log(`Received fax ${payload.fax_id} from ${payload.from}`);
    console.log(`Pages: ${payload.page_count}, URL: ${payload.media_url}`);
    // Download the fax PDF from payload.media_url
  }

  res.status(200).json({ status: 'ok' });
});
```

## Step 4: Manage Faxes

### List Faxes

```bash
curl -X GET "https://api.telnyx.com/v2/faxes?page[size]=20" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### View a Single Fax

```bash
curl -X GET "https://api.telnyx.com/v2/faxes/$FAX_ID" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### Delete a Fax

```bash
curl -X DELETE "https://api.telnyx.com/v2/faxes/$FAX_ID" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### Refresh a Fax (regenerate media URL)

```bash
curl -X POST "https://api.telnyx.com/v2/faxes/$FAX_ID/actions/refresh" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

## T.38 Support

Telnyx provides native T.38 fax protocol support, which improves fax reliability over IP networks by using real-time error correction instead of audio-based transmission.

- **On-net T.38** — When both endpoints support T.38, Telnyx negotiates T.38 directly. Enable T.38 passthrough on your SIP Connection to allow sender and receiver to negotiate directly.
- **T.38 fallback** — If T.38 negotiation fails, Telnyx falls back to G.711 audio-based fax transmission.
- **Per-fax control** — Set `t38_enabled` on individual send requests to control T.38 usage.

Twilio used T.38 internally but did not expose T.38 configuration to customers. Telnyx gives you direct control.

## Media Handling

**Supported formats:**
- **Send:** PDF files via URL. Maximum file size: 50MB. Maximum page count: 350 pages.
- **Receive:** PDF or TIFF (configurable per Fax Application in inbound settings).

**Media URL behavior:**
- When sending, `media_url` must point to a publicly accessible PDF.
- When receiving, the webhook `media_url` field contains a temporary URL to download the received fax.
- Use the Refresh endpoint to regenerate expired media URLs.

**Twilio vs Telnyx media comparison:**

| Aspect | Twilio (was) | Telnyx |
|---|---|---|
| Send format | PDF via URL | PDF via URL |
| Receive format | PDF (MediaResource) | PDF or TIFF (configurable) |
| Max file size | 20MB | 50MB |
| Max pages | Not documented | 350 pages |
| Media URL persistence | Persistent until deleted | Temporary (use Refresh endpoint) |

## Webhook Events

Telnyx sends these webhook events during fax lifecycle:

| Event | Description |
|---|---|
| `fax.queued` | Fax has been queued for sending |
| `fax.media.processed` | Media file has been processed and validated |
| `fax.sending.started` | Fax transmission has begun |
| `fax.delivered` | Fax was successfully delivered |
| `fax.failed` | Fax transmission failed |
| `fax.received` | An inbound fax was received |

**Twilio vs Telnyx status mapping:**

| Twilio Status | Telnyx Event |
|---|---|
| `queued` | `fax.queued` |
| `processing` | `fax.media.processed` |
| `sending` | `fax.sending.started` |
| `delivered` | `fax.delivered` |
| `failed` / `no-answer` / `busy` | `fax.failed` (with error details in payload) |
| `received` | `fax.received` |
| `canceled` | N/A (use Cancel endpoint before sending starts) |

## API Endpoint Mapping

| Operation | Twilio Endpoint (was) | Telnyx Endpoint |
|---|---|---|
| Send a fax | `POST /Faxes.json` | `POST /v2/faxes` |
| List faxes | `GET /Faxes.json` | `GET /v2/faxes` |
| Get fax details | `GET /Faxes/{SID}.json` | `GET /v2/faxes/{id}` |
| Delete a fax | `DELETE /Faxes/{SID}.json` | `DELETE /v2/faxes/{id}` |
| Get fax media | `GET /Faxes/{SID}/Media.json` | `media_url` field on fax object |
| Cancel a fax | `POST /Faxes/{SID}.json` (Status=canceled) | `POST /v2/faxes/{id}/actions/cancel` |
| Refresh media URL | N/A | `POST /v2/faxes/{id}/actions/refresh` |
| List fax applications | N/A | `GET /v2/fax_applications` |
| Create fax application | N/A | `POST /v2/fax_applications` |

## Common Pitfalls

1. **No Fax Application assigned** — Inbound faxes will not be delivered unless the receiving number is assigned to a Fax Application with a configured webhook URL.

2. **Media URL must be publicly accessible** — The `media_url` for sending must be reachable from Telnyx servers. Localhost, private IPs, and authenticated URLs will fail.

3. **PDF format required** — Telnyx only accepts PDF files for sending. If your existing workflow sends TIFF or image files, convert to PDF first.

4. **File size limits differ** — Telnyx allows up to 50MB and 350 pages. If your faxes approach these limits, you will receive `file_size_limit_exceeded` or `page_count_limit_exceeded` errors.

5. **Media URLs are temporary** — Unlike Twilio where fax media persisted until deletion, Telnyx media URLs expire. Download received faxes promptly or use the Refresh endpoint to regenerate the URL.

6. **Webhook event structure differs** — Telnyx webhooks use a nested JSON structure (`event.data.event_type`, `event.data.payload`) vs Twilio's flat form-encoded parameters. Update your webhook handler accordingly.

7. **Quality setting names differ** — Twilio used `fine`/`superfine`. Telnyx uses `normal`, `high`, `ultra_light` (images), `ultra_dark` (text).
