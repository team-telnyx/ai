# Twilio → Telnyx Error Code Mapping

## Telnyx Error Response Format

All Telnyx API errors return JSON in this structure:

```json
{
  "errors": [
    {
      "code": "10009",
      "title": "Authentication failed",
      "detail": "The API key looks malformed. Check that you copied it correctly.",
      "source": { "pointer": "/field_name" },
      "meta": { "url": "https://developers.telnyx.com/docs/overview/errors/10009" }
    }
  ]
}
```

**Key difference from Twilio**: Twilio returns `{ "code": 21211, "message": "..." }` with numeric codes. Telnyx returns `{ "errors": [{ "code": "10009", ... }] }` with string codes in an array.

---

## Authentication Errors

| Twilio Code | Twilio Meaning | Telnyx Code | Telnyx Meaning | HTTP |
|---|---|---|---|---|
| 20003 | Authentication error | 10009 | Authentication failed — malformed or invalid API key | 401 |
| 20008 | Account not active | 10009 | Authentication failed — credentials not found | 401 |
| 20403 | Forbidden | 10009 | Authentication failed (single code for all auth errors) | 401 |

**Migration note**: Twilio uses Basic Auth (`AccountSID:AuthToken`), Telnyx uses Bearer Token (`Authorization: Bearer $TELNYX_API_KEY`). Missing auth header returns `10005` (404) — Telnyx treats unauthenticated requests as route-not-found.

---

## Common API Errors

| Twilio Code | Twilio Meaning | Telnyx Code | Telnyx Meaning | HTTP |
|---|---|---|---|---|
| 20404 | Resource not found | 10005 | Resource not found | 404 |
| 20429 | Too many requests | 10011 | Too many requests | 429 |
| — | — | 10000 | Invalid parameter (generic validation) | 400 |
| — | — | 10004 | Missing required parameter | 400 |
| — | — | 10027 | Unprocessable entity | 422 |

---

## Messaging Errors — API Response (Synchronous)

These appear in the immediate API response when sending a message.

| Twilio Code | Twilio Meaning | Telnyx Code | Telnyx Meaning | HTTP |
|---|---|---|---|---|
| 21211 | Invalid 'To' number | 40310 | Invalid 'to' address | 400 |
| 21606 | 'From' number not provisioned | 40305 | Invalid 'from' address — number not on messaging profile | 400 |
| 21408 | Permission not allowed for region | 40309 | Invalid destination region — not in whitelisted_destinations | 400 |
| 21603 | Max body length exceeded | 10015 | Bad request — message too long | 422 |
| 21612 | Messaging Service has no numbers | 40321 | No usable numbers on messaging profile | 400 |
| 21610 | Message undeliverable (opt-out) | — | See delivery errors below (40008) | — |

**Migration note**: Twilio's `MessagingServiceSid` → Telnyx's `messaging_profile_id`. Always include `messaging_profile_id` — messages without a profile will fail.

## Messaging Errors — Delivery Webhook (Asynchronous)

These appear in `data.payload.errors[0].code` in `message.finalized` webhook events when delivery fails. They are NOT in the synchronous API response.

| Twilio Code | Twilio Meaning | Telnyx Code | Telnyx Meaning |
|---|---|---|---|
| 30003 | Unreachable destination | 40001 | Not routable — landline or non-routable number |
| 30007 | Message filtered (carrier) | 40300 | Carrier rejected |
| 30008 | Unknown/general error | 40300 | Carrier rejected (general) |
| 30006 | Landline destination | 40001 | Not routable |
| 21610 | Unsubscribed recipient | 40008 | Number opted out (STOP) |

**Migration note**: Twilio sends `MessageStatus` callbacks with flat params. Telnyx sends `message.finalized` webhooks with nested JSON under `data.payload`. Check `data.payload.to[0].status` for delivery status (`delivered`, `sending_failed`, `delivery_failed`).

---

## Voice Errors

| Twilio Code | Twilio Meaning | Telnyx Code | Telnyx Meaning | HTTP |
|---|---|---|---|---|
| 13223 | Invalid 'To' phone number | 10016 | Phone number must be in +E.164 format | 422 |
| 13224 | Invalid 'From' phone number | 10016 | Phone number must be in +E.164 format | 422 |
| 21220 | Invalid Call SID | 90015 | Invalid Call Control ID | 422 |
| 13227 | Forbidden — number not owned | 10015 | Invalid value — number/connection issue | 422 |
| 20404 | Call not found | 10005 | Resource not found | 404 |

### Call Hangup Causes (Voice Events)

Telnyx provides `hangup_cause` in call events (replaces Twilio's `CallStatus` + `SipResponseCode`):

| Twilio CallStatus / SIP | Telnyx hangup_cause | Meaning |
|---|---|---|
| `busy` / 486 | `user_busy` | Callee busy |
| `no-answer` / 408 | `timeout` | No answer timeout |
| `canceled` | `originator_cancel` | Caller hung up before answer |
| `completed` | `normal_clearing` | Normal call end |
| `failed` / 503 | `call_rejected` | Call rejected by carrier/callee |
| — | `time_limit` | Call exceeded max duration |

**Migration note**: Telnyx also provides `sip_hangup_cause` with the raw SIP response code (e.g., `486`, `408`, `503`) for more granular debugging.

---

## Verify Errors

| Twilio Code | Twilio Meaning | Telnyx Code | Telnyx Meaning | HTTP |
|---|---|---|---|---|
| 60200 | Invalid parameter | 10002 | Invalid phone number | 400 |
| 60200 | Invalid parameter | 10015 | Bad request — profile config issue | 400 |
| 60202 | Max send attempts reached | 10011 | Too many requests | 429 |
| 60205 | Not permitted to destination | 40309 | Invalid destination region | 400 |
| 20404 | Service not found | 10005 | Verify profile not found | 404 |

### Verification Status Mapping

| Twilio Status | Telnyx Status | Meaning |
|---|---|---|
| `approved` | `accepted` | Code correct |
| `pending` | `pending` | Awaiting verification |
| `canceled` | — | Manually canceled |
| — | `rejected` | Code incorrect or expired |

**Migration note**: Always include `verify_profile_id` in every Telnyx verify request — it is required, not optional. Check `response_code` field in the verification check response.

---

## Error Handling Code Migration

### Before (Twilio — Python)
```python
from twilio.base.exceptions import TwilioRestException

try:
    message = client.messages.create(body="Hello", to="+1555...", from_="+1555...")
except TwilioRestException as e:
    if e.code == 21211:
        print("Invalid phone number")
    elif e.code == 20003:
        print("Auth failed")
    elif e.status == 429:
        time.sleep(e.retry_after or 1)
```

### After (Telnyx — Python)
```python
import os
from telnyx import Telnyx

client = Telnyx(api_key=os.environ.get("TELNYX_API_KEY"))

try:
    message = client.messages.send(text="Hello", to="+1555...", from_="+1555...", messaging_profile_id="...")
except Exception as e:
    # Telnyx errors have status_code and a JSON body with errors array
    if hasattr(e, 'status_code'):
        if e.status_code == 401:
            print("Auth failed — check TELNYX_API_KEY")
        elif e.status_code == 429:
            print("Rate limited — implement exponential backoff")
        else:
            error_code = None
            if hasattr(e, 'body') and e.body and 'errors' in e.body:
                error_code = e.body['errors'][0].get('code')
            if error_code == "40310":
                print("Invalid phone number")
            elif error_code == "40305":
                print("From number not on messaging profile")
            else:
                print(f"API error {error_code}: {e}")
    else:
        raise
```

### Before (Twilio — JavaScript)
```javascript
try {
  const message = await client.messages.create({ body: "Hello", to: "+1555...", from: "+1555..." });
} catch (err) {
  if (err.code === 21211) console.error("Invalid phone number");
  else if (err.code === 20003) console.error("Auth failed");
  else if (err.status === 429) await sleep(1000);
}
```

### After (Telnyx — JavaScript)
```javascript
const Telnyx = require('telnyx');
const client = new Telnyx({ apiKey: process.env.TELNYX_API_KEY });

try {
  const { data: message } = await client.messages.create({
    text: "Hello", to: "+1555...", from: "+1555...", messaging_profile_id: "..."
  });
} catch (err) {
  const code = err.rawErrors?.[0]?.code;
  else if (code === "10009") console.error("Auth failed — check TELNYX_API_KEY");
  else if (err.statusCode === 429) await sleep(1000); // exponential backoff
  else console.error(`API error ${code}: ${err.message}`);
}
```
