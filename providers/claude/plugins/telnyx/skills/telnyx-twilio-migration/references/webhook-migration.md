# Webhook Migration: Twilio to Telnyx

Comprehensive guide for migrating webhook handlers from Twilio's flat form-encoded payloads to Telnyx's nested JSON event structure.

## Payload Structure

**Twilio** sends flat form-encoded key-value pairs (`application/x-www-form-urlencoded`):
```
MessageSid=SM123&From=%2B15551234567&To=%2B15559876543&Body=Hello
```

**Telnyx** sends nested JSON (`application/json`):
```json
{
  "data": {
    "event_type": "message.received",
    "id": "evt_abc123",
    "occurred_at": "2026-01-15T12:00:00Z",
    "payload": {
      "id": "msg_xyz789",
      "from": {"phone_number": "+15551234567"},
      "to": [{"phone_number": "+15559876543"}],
      "text": "Hello"
    }
  }
}
```

**Key change**: Your webhook handler must parse JSON body instead of form data, and access fields via `data.payload.*` instead of flat keys.

## Messaging Webhook Field Mapping

### Inbound Message (`message.received`)

| Twilio Field | Telnyx Field | Access Path |
|---|---|---|
| `MessageSid` | `id` | `data.payload.id` |
| `From` | `from.phone_number` | `data.payload.from.phone_number` |
| `To` | `to[0].phone_number` | `data.payload.to[0].phone_number` |
| `Body` | `text` | `data.payload.text` |
| `NumMedia` | `media.length` | `data.payload.media` (array length) |
| `MediaUrl0` | `media[0].url` | `data.payload.media[0].url` |
| `MediaContentType0` | `media[0].content_type` | `data.payload.media[0].content_type` |
| `AccountSid` | N/A | Not included |
| `ApiVersion` | N/A | Not included |

### Delivery Status (`message.sent`, `message.delivered`, `message.failed`)

| Twilio Field | Telnyx Field | Access Path |
|---|---|---|
| `MessageStatus` | `event_type` suffix | `data.event_type` (e.g., `message.delivered`) |
| `MessageSid` | `id` | `data.payload.id` |
| `ErrorCode` | `errors[0].code` | `data.payload.errors[0].code` |
| `ErrorMessage` | `errors[0].title` | `data.payload.errors[0].title` |

### Messaging Status Value Mapping

| Twilio Status | Telnyx Event Type | Notes |
|---|---|---|
| `queued` | `message.queued` | Message accepted |
| `sent` | `message.sent` | Sent to carrier |
| `delivered` | `message.delivered` | Carrier confirmed delivery |
| `undelivered` | `message.failed` | Delivery failed (check `errors`) |
| `failed` | `message.failed` | Send failed |
| `received` | `message.received` | Inbound message |

## Voice Webhook Field Mapping

### TeXML Callbacks (form-encoded, similar to Twilio)

TeXML callbacks use form-encoded params similar to Twilio, so the migration is simpler:

| Twilio Field | Telnyx Field | Notes |
|---|---|---|
| `CallSid` | `CallSid` | Telnyx call control ID |
| `AccountSid` | `AccountSid` | Telnyx connection ID |
| `From` | `From` | Caller number |
| `To` | `To` | Called number |
| `CallStatus` | `CallStatus` | Same values: `initiated`, `ringing`, `answered`, `completed` |
| `Direction` | `Direction` | `inbound` or `outbound` |
| `RecordingUrl` | `RecordingUrl` | **Expires after 10 minutes** — download promptly |

### Call Control Webhooks (JSON)

| Twilio Field | Telnyx Event | Access Path |
|---|---|---|
| `CallSid` | `call_control_id` | `data.payload.call_control_id` |
| `From` | `from` | `data.payload.from` |
| `To` | `to` | `data.payload.to` |
| `CallStatus=initiated` | `call.initiated` | `data.event_type` |
| `CallStatus=ringing` | `call.ringing` | `data.event_type` |
| `CallStatus=answered` | `call.answered` | `data.event_type` |
| `CallStatus=completed` | `call.hangup` | `data.event_type` |

### Voice Status Value Mapping

| Twilio CallStatus | Telnyx Event | Notes |
|---|---|---|
| `initiated` | `call.initiated` | Call created |
| `ringing` | `call.ringing` | Remote party ringing |
| `in-progress` / `answered` | `call.answered` | Call connected |
| `completed` | `call.hangup` | Call ended normally |
| `busy` | `call.hangup` (cause: `BUSY`) | Remote busy |
| `no-answer` | `call.hangup` (cause: `TIMEOUT`) | No answer |
| `failed` | `call.hangup` (cause: varies) | Call failed |
| `canceled` | `call.hangup` (cause: `ORIGINATOR_CANCEL`) | Caller hung up |

## Signature Verification

### Twilio (HMAC-SHA1) — Remove This

```python
from twilio.request_validator import RequestValidator
validator = RequestValidator(auth_token)
is_valid = validator.validate(url, params, request.headers.get('X-Twilio-Signature'))
```

### Telnyx (Ed25519) — Add This

**Python:**
```python
from telnyx import Telnyx
client = Telnyx(api_key="YOUR_API_KEY", public_key="YOUR_PUBLIC_KEY")

# Verify + parse webhook in one step — raises TelnyxWebhookVerificationError on failure
event = client.webhooks.unwrap(
    request.data.decode("utf-8"),
    headers=request.headers,  # must contain telnyx-signature-ed25519 and telnyx-timestamp
)
```

**Node.js:**
```javascript
const Telnyx = require('telnyx');
const client = new Telnyx({ apiKey: 'YOUR_API_KEY' });

// Verify + parse webhook — throws on invalid signature
const event = await client.webhooks.unwrap(
  req.rawBody,  // Must be original bytes — see Express example below for rawBody setup
  { headers: req.headers, key: 'YOUR_PUBLIC_KEY' }
);
```

**Go (manual Ed25519):**
```go
import (
    "crypto/ed25519"
    "encoding/base64"
)

func verifyWebhook(payload, signature, timestamp, publicKeyBase64 string) bool {
    pubKey, _ := base64.StdEncoding.DecodeString(publicKeyBase64)
    sig, _ := base64.StdEncoding.DecodeString(signature)
    message := []byte(timestamp + "|" + payload)
    return ed25519.Verify(ed25519.PublicKey(pubKey), message, sig)
}
```

**Ruby:**
```ruby
require 'telnyx'
client = Telnyx::Client.new(api_key: 'YOUR_API_KEY')
Telnyx::Webhook.construct_event(payload, signature, timestamp, public_key: 'YOUR_PUBLIC_KEY')
```

## Framework-Specific Examples

### Flask (Python)

```python
from flask import Flask, request, jsonify
from telnyx import Telnyx

app = Flask(__name__)
client = Telnyx(api_key="YOUR_API_KEY", public_key="YOUR_PUBLIC_KEY")

@app.route('/webhooks/messaging', methods=['POST'])
def messaging_webhook():
    # Verify signature + parse event in one step
    try:
        event = client.webhooks.unwrap(
            request.data.decode("utf-8"),
            headers=request.headers,
        )
    except Exception:
        return "Forbidden", 403

    event_data = request.json['data']
    event_type = event_data['event_type']
    payload = event_data['payload']

    if event_type == 'message.received':
        from_number = payload['from']['phone_number']
        text = payload['text']
        # Process inbound message...
    elif event_type == 'message.delivered':
        msg_id = payload['id']
        # Handle delivery confirmation...
    elif event_type == 'message.failed':
        errors = payload.get('errors', [])
        # Handle failure...

    return jsonify({"status": "ok"}), 200
```

### Express (Node.js)

**Important**: Signature verification requires the raw request body (original bytes), not re-serialized JSON. Use the `verify` callback on `express.json()` to capture raw bytes.

```javascript
const express = require('express');
const Telnyx = require('telnyx');
const client = new Telnyx({ apiKey: 'YOUR_API_KEY' });
const app = express();

// Capture raw body for webhook signature verification
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf.toString('utf-8'); }
}));

app.post('/webhooks/messaging', async (req, res) => {
  // Verify signature + parse event using raw body (NOT JSON.stringify(req.body))
  try {
    const event = await client.webhooks.unwrap(
      req.rawBody,  // Must be the original bytes, not re-serialized
      { headers: req.headers, key: 'YOUR_PUBLIC_KEY' }
    );
  } catch (e) {
    return res.status(403).send('Forbidden');
  }

  const { event_type, payload } = req.body.data;

  if (event_type === 'message.received') {
    const from = payload.from.phone_number;
    const text = payload.text;
    // Process inbound message...
  } else if (event_type === 'message.delivered') {
    // Handle delivery confirmation...
  } else if (event_type === 'message.failed') {
    const errors = payload.errors || [];
    // Handle failure...
  }

  res.sendStatus(200);
});
```

### Sinatra (Ruby)

```ruby
require 'sinatra'
require 'json'
require 'telnyx'

set :port, 5000

post '/webhooks/messaging' do
  payload = request.body.read

  # Verify signature
  begin
    Telnyx::Webhook.construct_event(
      payload,
      request.env['HTTP_TELNYX_SIGNATURE_ED25519'],
      request.env['HTTP_TELNYX_TIMESTAMP'],
      public_key: ENV['TELNYX_PUBLIC_KEY']
    )
  rescue StandardError
    halt 403, 'Forbidden'
  end

  event = JSON.parse(payload)
  event_type = event.dig('data', 'event_type')
  data = event.dig('data', 'payload')

  case event_type
  when 'message.received'
    from_number = data.dig('from', 'phone_number')
    text = data['text']
    # Process inbound message...
  when 'message.delivered'
    # Handle delivery confirmation...
  when 'message.failed'
    errors = data['errors'] || []
    # Handle failure...
  end

  content_type :json
  { status: 'ok' }.to_json
end
```

### Rails (Ruby on Rails)

**Important**: Rails controllers need `skip_before_action :verify_authenticity_token` since Telnyx webhooks don't include CSRF tokens. If the original code used `twilio.webhook()` or Twilio's `RequestValidator` in a `before_action`, replace it with Ed25519 verification — do NOT just remove it.

```ruby
# app/controllers/webhooks_controller.rb
class WebhooksController < ApplicationController
  skip_before_action :verify_authenticity_token

  before_action :verify_telnyx_signature

  def messaging
    event_type = params.dig('data', 'event_type')
    payload = params.dig('data', 'payload')

    case event_type
    when 'message.received'
      from_number = payload.dig('from', 'phone_number')
      text = payload['text']
      # Process inbound message...
    when 'message.delivered'
      # Handle delivery confirmation...
    when 'message.failed'
      errors = payload['errors'] || []
      # Handle failure...
    end

    render json: { status: 'ok' }
  end

  def voice
    event_type = params.dig('data', 'event_type')
    payload = params.dig('data', 'payload')

    case event_type
    when 'call.initiated'
      call_control_id = payload['call_control_id']
      # Handle call event...
    when 'call.answered'
      # Handle answered...
    when 'call.hangup'
      # Handle hangup...
    end

    render json: { status: 'ok' }
  end

  private

  def verify_telnyx_signature
    payload = request.body.read
    signature = request.headers['HTTP_TELNYX_SIGNATURE_ED25519'] ||
                request.headers['telnyx-signature-ed25519']
    timestamp = request.headers['HTTP_TELNYX_TIMESTAMP'] ||
                request.headers['telnyx-timestamp']

    begin
      Telnyx::Webhook.construct_event(
        payload,
        signature,
        timestamp,
        public_key: ENV['TELNYX_PUBLIC_KEY']
      )
    rescue StandardError => e
      Rails.logger.warn "Webhook signature verification failed: #{e.message}"
      head :forbidden
    end
  end
end
```

```ruby
# config/routes.rb
Rails.application.routes.draw do
  post '/webhooks/messaging', to: 'webhooks#messaging'
  post '/webhooks/voice', to: 'webhooks#voice'
end
```

**Rails note**: Use `request.body.read` for signature verification (raw bytes), not `params` (which is parsed). Access Telnyx webhook headers via `request.headers` — Rails may prefix with `HTTP_` and uppercase them (`HTTP_TELNYX_SIGNATURE_ED25519`), so check both forms.

### Go (net/http)

```go
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type TelnyxEvent struct {
	Data struct {
		EventType string `json:"event_type"`
		Payload   struct {
			ID   string `json:"id"`
			From struct {
				PhoneNumber string `json:"phone_number"`
			} `json:"from"`
			To []struct {
				PhoneNumber string `json:"phone_number"`
			} `json:"to"`
			Text   string `json:"text"`
			Errors []struct {
				Code  string `json:"code"`
				Title string `json:"title"`
			} `json:"errors"`
		} `json:"payload"`
	} `json:"data"`
}

func messagingWebhook(w http.ResponseWriter, r *http.Request) {
	body, _ := io.ReadAll(r.Body)

	// Verify Ed25519 signature (see Signature Verification section above)

	var event TelnyxEvent
	if err := json.Unmarshal(body, &event); err != nil {
		http.Error(w, "Bad request", 400)
		return
	}

	switch event.Data.EventType {
	case "message.received":
		from := event.Data.Payload.From.PhoneNumber
		text := event.Data.Payload.Text
		fmt.Printf("SMS from %s: %s\n", from, text)
	case "message.delivered":
		// Handle delivery confirmation...
	case "message.failed":
		// Handle failure...
	}

	w.WriteHeader(200)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func main() {
	http.HandleFunc("/webhooks/messaging", messagingWebhook)
	http.ListenAndServe(":5000", nil)
}
```

## Common Webhook Migration Mistakes

1. **Still parsing form data** — Telnyx sends JSON, not form-encoded. Use `request.json` (Flask) or `req.body` with JSON middleware (Express), not `request.form`.

2. **Missing `data` wrapper** — Telnyx nests everything under `data`. The event type is at `data.event_type`, not at the top level.

3. **Flat vs nested `from`** — Twilio: `From` is a string. Telnyx: `from` is an object with `phone_number` (and optionally `carrier`, `line_type`).

4. **`to` is an array** — Telnyx `to` is always an array (supports group messaging). Use `to[0].phone_number` for the primary recipient.

5. **No `200 OK` response** — Telnyx expects a `200` response within the timeout. If your handler doesn't respond, Telnyx retries (up to the configured retry count).

6. **Signature header names** — Twilio: `X-Twilio-Signature`. Telnyx: `telnyx-signature-ed25519` + `telnyx-timestamp` (two headers).

7. **Recording URLs expire** — Telnyx voice recording URLs expire after 10 minutes. Download or store them immediately in the webhook handler.

8. **Express raw body for signature verification** — Do NOT use `JSON.stringify(req.body)` — re-serialization changes key order/whitespace and breaks signature verification. Capture the raw body via `express.json({ verify: (req, res, buf) => { req.rawBody = buf.toString('utf-8'); } })` and pass `req.rawBody` to the verification function.

## Django Webhook Handler

Django requires `@csrf_exempt` since Telnyx webhooks won't include CSRF tokens.

```python
# views.py
import json
from telnyx import Telnyx
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.conf import settings

client = Telnyx(api_key=settings.TELNYX_API_KEY, public_key=settings.TELNYX_PUBLIC_KEY)

@csrf_exempt
@require_POST
def telnyx_webhook(request):
    # Verify signature + parse event
    try:
        client.webhooks.unwrap(
            request.body.decode('utf-8'),  # raw body string
            headers={
                'telnyx-signature-ed25519': request.META.get('HTTP_TELNYX_SIGNATURE_ED25519', ''),
                'telnyx-timestamp': request.META.get('HTTP_TELNYX_TIMESTAMP', ''),
            },
        )
    except Exception:
        return JsonResponse({'error': 'Invalid signature'}, status=403)

    data = json.loads(request.body)
    event_type = data['data']['event_type']
    payload = data['data']['payload']

    if event_type == 'message.received':
        from_number = payload['from']['phone_number']
        text = payload.get('text', '')
        # Handle inbound message
    elif event_type == 'call.initiated':
        call_control_id = payload['call_control_id']
        # Handle call event

    return JsonResponse({'status': 'ok'})
```

```python
# urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('webhooks/telnyx/', views.telnyx_webhook, name='telnyx_webhook'),
]
```

**Django note**: Use `request.body` (bytes) for signature verification — not `request.POST` which is form-parsed. Telnyx webhook headers arrive as `HTTP_TELNYX_SIGNATURE_ED25519` in Django's `request.META` (Django uppercases and prefixes `HTTP_`).
