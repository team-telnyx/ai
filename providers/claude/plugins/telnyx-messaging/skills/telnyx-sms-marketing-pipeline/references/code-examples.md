# Code Examples

SDK examples for key steps in the SMS Marketing Pipeline. Each section shows Python and Node.js as primary languages, with curl as reference.

## Validation Coverage

| Language | Status | Notes |
|----------|--------|-------|
| **curl** | ✅ Validated | All steps tested end-to-end against live API |
| **Python** | ✅ Validated | Verified against live API during audit |
| **Node.js** | ✅ Validated | Verified against live API during audit |
| **Ruby** | ⚠️ Best-effort | Based on SDK docs and API patterns, not live-tested |
| **PHP** | ⚠️ Best-effort | Based on SDK docs and API patterns, not live-tested |
| **Java** | ⚠️ Best-effort | Based on SDK docs and API patterns, not live-tested |
| **Go** | ⚠️ Best-effort | Based on SDK docs and API patterns, not live-tested |

> Ruby, PHP, Java, and Go examples follow the same API contracts as the curl/Python/Node.js examples. The request/response shapes are identical — only the SDK wrapper syntax differs.

## Custom Auto-Response Configuration

Configure custom auto-response text for opt-out keywords on your messaging profile:

```bash
curl -s -X POST "https://api.telnyx.com/v2/messaging_profiles/$MESSAGING_PROFILE_ID/autoresp_configs" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "op": "stop",
    "keywords": ["STOP", "QUIT", "CANCEL", "END", "UNSUBSCRIBE"],
    "resp_text": "You have been unsubscribed from Acme promotions. Reply START to resubscribe.",
    "country_code": "US"
  }' | jq .
```

---

## Scheduling Messages for Future Delivery

```bash
curl -s -X POST https://api.telnyx.com/v2/messages \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+19705550001",
    "to": "+15559876543",
    "text": "Acme Weekend Sale starts tomorrow! Get 40% off sitewide. Shop: acme.com/sale. Reply STOP to opt out.",
    "send_at": "'"$(date -u -v+1H '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -d '+1 hour' '+%Y-%m-%dT%H:%M:%SZ')"'"
  }' | jq .
```

> **Note:** `send_at` must be between 5 minutes and 5 days in the future at the time of the API call. The example above derives it dynamically (1 hour from now). Replace `+1H` / `+1 hour` with the user's requested offset.

Scheduling constraints: 5 minutes to 5 days in the future, up to 1 million scheduled messages.

---

## Webhook Payload Examples

### `message.sent` — carrier accepted the message:

```json
{
  "data": {
    "event_type": "message.sent",
    "payload": {
      "id": "msg-uuid-here",
      "to": [{"phone_number": "+15559876543", "status": "sent"}],
      "sent_at": "2026-03-06T14:30:01Z",
      "cost": {"amount": "0.0051", "currency": "USD"}
    }
  }
}
```

### `message.finalized` — terminal delivery state (the DLR):

```json
{
  "data": {
    "event_type": "message.finalized",
    "payload": {
      "id": "msg-uuid-here",
      "to": [{"phone_number": "+15559876543", "status": "delivered"}],
      "completed_at": "2026-03-06T14:30:02Z",
      "cost": {"amount": "0.0051", "currency": "USD"},
      "errors": []
    }
  }
}
```

### Webhook Handler Best Practices

1. **Return `200` immediately** — process asynchronously via a background queue
2. **Use `data.id` as idempotency key** (webhook event ID, not `payload.id` which is the message ID)
3. **Handle out-of-order delivery** — `message.finalized` can arrive before `message.sent`
4. **Verify Ed25519 signatures** in production (headers: `telnyx-signature-ed25519`, `telnyx-timestamp`)

---

## How to Use This File

SKILL.md contains **curl examples only** for each step — concise and agent-friendly. This file provides the **SDK equivalents** organized by key operation. Each section shows Python and Node.js first, with additional languages where helpful. Operations are grouped by function rather than setup step to avoid repetition.

---

## Send a Message (SMS)

The core operation of the pipeline. No batch endpoint exists — messages are sent one at a time via `POST /v2/messages`.

### Python

```python
import os
from telnyx import Telnyx

client = Telnyx(api_key=os.environ["TELNYX_API_KEY"])

# Simple send
response = client.messages.send(
    from_="+15551234567",
    to="+15559876543",
    text="Acme Summer Sale! 30% off all items this weekend. Shop: acme.com/sale. Reply STOP to opt out.",
    webhook_url="https://your-app.example.com/webhooks/messaging",
)
print(f"Message ID: {response.data.id}")
print(f"Status: {response.data.to[0].status}")  # "queued"
print(f"Segments: {response.data.parts}")
print(f"Encoding: {response.data.encoding}")  # "GSM-7" or "UCS-2"
print(f"Cost: ${response.data.cost.amount}")
```

### Node.js

```javascript
import Telnyx from 'telnyx';

const client = new Telnyx({ apiKey: process.env.TELNYX_API_KEY });

const response = await client.messages.send({
  from: '+15551234567',
  to: '+15559876543',
  text: 'Acme Summer Sale! 30% off all items this weekend. Shop: acme.com/sale. Reply STOP to opt out.',
  webhook_url: 'https://your-app.example.com/webhooks/messaging',
});

console.log(`Message ID: ${response.data.id}`);
console.log(`Status: ${response.data.to[0].status}`);
console.log(`Segments: ${response.data.parts}`);
console.log(`Cost: $${response.data.cost.amount}`);
```

### Ruby

```ruby
require 'telnyx'

Telnyx.api_key = ENV['TELNYX_API_KEY']

response = Telnyx::Message.create(
  from: '+15551234567',
  to: '+15559876543',
  text: 'Acme Summer Sale! 30% off all items this weekend. Shop: acme.com/sale. Reply STOP to opt out.',
  webhook_url: 'https://your-app.example.com/webhooks/messaging'
)
puts "Message ID: #{response.id}"
puts "Status: #{response.to[0]['status']}"
puts "Cost: $#{response.cost['amount']}"
```

### PHP

```php
require_once 'vendor/autoload.php';

\Telnyx\Telnyx::setApiKey(getenv('TELNYX_API_KEY'));

$response = \Telnyx\Message::create([
    'from' => '+15551234567',
    'to'   => '+15559876543',
    'text'  => 'Acme Summer Sale! 30% off all items this weekend. Shop: acme.com/sale. Reply STOP to opt out.',
    'webhook_url' => 'https://your-app.example.com/webhooks/messaging',
]);
echo "Message ID: " . $response->id . "\n";
echo "Status: " . $response->to[0]->status . "\n";
echo "Cost: $" . $response->cost->amount . "\n";
```

### Java

```java
import com.telnyx.sdk.*;
import com.telnyx.sdk.api.MessagesApi;
import com.telnyx.sdk.model.*;

ApiClient client = Configuration.getDefaultApiClient();
client.addDefaultHeader("Authorization", "Bearer " + System.getenv("TELNYX_API_KEY"));

MessagesApi api = new MessagesApi(client);
CreateMessageRequest req = new CreateMessageRequest()
    .from("+15551234567")
    .to("+15559876543")
    .text("Acme Summer Sale! 30% off all items this weekend. Shop: acme.com/sale. Reply STOP to opt out.")
    .webhookUrl("https://your-app.example.com/webhooks/messaging");

MessageResponse resp = api.createMessage(req);
System.out.println("Message ID: " + resp.getData().getId());
System.out.println("Status: " + resp.getData().getTo().get(0).getStatus());
```

### Go

```go
package main

import (
	"context"
	"fmt"
	"os"

	telnyx "github.com/telnyx/telnyx-go"
)

func main() {
	cfg := telnyx.NewConfiguration()
	cfg.AddDefaultHeader("Authorization", "Bearer "+os.Getenv("TELNYX_API_KEY"))
	client := telnyx.NewAPIClient(cfg)

	req := *telnyx.NewCreateMessageRequest("+15559876543", "Acme Summer Sale! 30% off. Shop: acme.com/sale. Reply STOP to opt out.")
	req.SetFrom("+15551234567")
	req.SetWebhookUrl("https://your-app.example.com/webhooks/messaging")

	resp, _, err := client.MessagesApi.CreateMessage(context.Background()).CreateMessageRequest(req).Execute()
	if err != nil {
		panic(err)
	}
	fmt.Printf("Message ID: %s\nStatus: %s\n", resp.Data.GetId(), resp.Data.GetTo()[0].GetStatus())
}
```

### Send via Number Pool (No `from` needed)

```python
# Python — Telnyx auto-selects from numbers in the messaging profile
response = client.messages.send(
    messaging_profile_id="YOUR_MESSAGING_PROFILE_ID",
    to="+15559876543",
    text="Acme: Your exclusive 20% off code is VIP20. Shop: acme.com. Reply STOP to opt out.",
)
```

```javascript
// Node.js
const response = await client.messages.send({
  messaging_profile_id: 'YOUR_MESSAGING_PROFILE_ID',
  to: '+15559876543',
  text: 'Acme: Your exclusive 20% off code is VIP20. Shop: acme.com. Reply STOP to opt out.',
});
```

### Schedule a Message (5 min to 5 day window)

```python
# Python — derive send_at from user's requested delivery time
from datetime import datetime, timedelta, timezone

# Example: schedule 1 hour from now (adjust to user's requested time)
send_at = (datetime.now(timezone.utc) + timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%SZ")

response = client.messages.send(
    from_="+15551234567",
    to="+15559876543",
    text="Acme: Flash sale starts NOW! 40% off for the next 4 hours. Shop: acme.com/flash. Reply STOP to opt out.",
    send_at=send_at,  # ISO 8601, must be 5 min to 5 days in the future
)
print(f"Status: {response.data.to[0].status}")  # "scheduled"
```

```javascript
// Node.js — derive send_at from user's requested delivery time
// Example: schedule 1 hour from now (adjust to user's requested time)
const sendAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

const response = await client.messages.send({
  from: '+15551234567',
  to: '+15559876543',
  text: 'Acme: Flash sale starts NOW! 40% off for the next 4 hours. Shop: acme.com/flash. Reply STOP to opt out.',
  send_at: sendAt, // must be 5 min to 5 days in the future
});
console.log(`Status: ${response.data.to[0].status}`); // "scheduled"
```

---

## Number Lookup (Batch Validation)

Single-number API — no native bulk endpoint. Implement batch processing with rate limiting.

### Python (Batch with Rate Limiting)

```python
import asyncio
import aiohttp
import os
import time

API_KEY = os.environ["TELNYX_API_KEY"]
BASE_URL = "https://api.telnyx.com/v2/number_lookup"
MAX_REQUESTS_PER_SEC = 60  # Global rate cap


class RateLimiter:
    """Token-bucket rate limiter shared across all concurrent workers."""
    def __init__(self, rate: float):
        self._interval = 1.0 / rate
        self._lock = asyncio.Lock()
        self._next_allowed = 0.0

    async def acquire(self):
        async with self._lock:
            now = asyncio.get_event_loop().time()
            if now < self._next_allowed:
                await asyncio.sleep(self._next_allowed - now)
            self._next_allowed = max(now, self._next_allowed) + self._interval


async def lookup_number(session, phone_number, rate_limiter):
    """Look up a single number. Returns carrier type and details."""
    await rate_limiter.acquire()
    url = f"{BASE_URL}/{phone_number}"
    headers = {"Authorization": f"Bearer {API_KEY}"}

    async with session.get(url, headers=headers) as resp:
        if resp.status == 200:
            data = await resp.json()
            carrier = data["data"].get("carrier", {})
            return {
                "phone": phone_number,
                "carrier_type": carrier.get("type", "unknown"),
                "carrier_name": carrier.get("name"),
                "sendable": carrier.get("type") in ("mobile", "voip", "fixed line or mobile"),
            }
        elif resp.status == 429:
            await asyncio.sleep(2)  # Rate limited — back off and retry
            return await lookup_number(session, phone_number, rate_limiter)
        else:
            # Non-200 does NOT mean the number is unsendable — the lookup
            # failed (network error, server error, etc.). Flag for review
            # instead of silently dropping.
            return {"phone": phone_number, "carrier_type": "lookup_failed", "sendable": True, "lookup_failed": True}


async def validate_batch(numbers, concurrency=50, max_rps=MAX_REQUESTS_PER_SEC):
    """Validate a batch of numbers with shared global rate limiting."""
    semaphore = asyncio.Semaphore(concurrency)
    rate_limiter = RateLimiter(max_rps)

    async def limited_lookup(session, number):
        async with semaphore:
            return await lookup_number(session, number, rate_limiter)

    async with aiohttp.ClientSession() as session:
        tasks = [limited_lookup(session, num) for num in numbers]
        results = await asyncio.gather(*tasks)

    # Segment results
    sendable = [r for r in results if r["sendable"]]
    excluded = [r for r in results if not r["sendable"]]
    needs_review = [r for r in results if r.get("lookup_failed")]

    print(f"✅ Sendable: {len(sendable)} | ❌ Excluded: {len(excluded)} | ⚠️ Lookup failed (included): {len(needs_review)}")
    return sendable, excluded


# Usage
numbers = ["+12025551234", "+14155559876", "+13125550001"]
sendable, excluded = asyncio.run(validate_batch(numbers))
```

### Node.js (Batch with Rate Limiting)

```javascript
import Telnyx from 'telnyx';

const client = new Telnyx({ apiKey: process.env.TELNYX_API_KEY });
const MAX_RPS = 60; // Global rate cap

/**
 * Shared rate limiter — controls request start times globally.
 * A per-worker sleep does NOT limit aggregate throughput when many
 * workers run concurrently.
 */
class RateLimiter {
  constructor(rps) {
    this.interval = 1000 / rps;
    this.nextAllowed = 0;
    this.queue = Promise.resolve();
  }
  acquire() {
    this.queue = this.queue.then(
      () =>
        new Promise((resolve) => {
          const now = Date.now();
          const wait = Math.max(0, this.nextAllowed - now);
          this.nextAllowed = Math.max(now, this.nextAllowed) + this.interval;
          setTimeout(resolve, wait);
        })
    );
    return this.queue;
  }
}

async function validateBatch(numbers, { concurrency = 50, maxRps = MAX_RPS } = {}) {
  const limiter = new RateLimiter(maxRps);
  let completed = 0;

  // Concurrency is capped by the rate limiter; semaphore limits in-flight.
  const semaphore = { active: 0, waiters: [] };
  const acquireSem = () =>
    semaphore.active < concurrency
      ? (semaphore.active++, Promise.resolve())
      : new Promise((r) => semaphore.waiters.push(r)).then(() => { semaphore.active++; });
  const releaseSem = () => {
    semaphore.active--;
    if (semaphore.waiters.length) semaphore.waiters.shift()();
  };

  const tasks = numbers.map(async (number) => {
    await acquireSem();
    await limiter.acquire();
    try {
      const { data } = await client.numberLookup.retrieve(number);
      completed++;
      if (completed % 100 === 0) console.log(`Progress: ${completed}/${numbers.length}`);

      const carrierType = data.carrier?.type || 'unknown';
      return {
        phone: number,
        carrierType,
        carrierName: data.carrier?.normalized_carrier || data.carrier?.name,
        sendable: ['mobile', 'voip', 'fixed line or mobile'].includes(carrierType),
      };
    } catch (err) {
      // Lookup failure does NOT mean the number is unsendable. Flag for
      // review instead of silently dropping valid recipients.
      return { phone: number, carrierType: 'lookup_failed', sendable: true, lookupFailed: true };
    } finally {
      releaseSem();
    }
  });

  const results = await Promise.all(tasks);
  const sendable = results.filter((r) => r.sendable);
  const excluded = results.filter((r) => !r.sendable);
  const needsReview = results.filter((r) => r.lookupFailed);

  console.log(`✅ Sendable: ${sendable.length} | ❌ Excluded: ${excluded.length} | ⚠️ Lookup failed (included): ${needsReview.length}`);
  return { sendable, excluded };
}

// Usage
const numbers = ['+12025551234', '+14155559876', '+13125550001'];
const { sendable, excluded } = await validateBatch(numbers);
```

### Ruby (Single Lookup)

```ruby
require 'telnyx'

Telnyx.api_key = ENV['TELNYX_API_KEY']

def lookup_number(phone)
  result = Telnyx::NumberLookup.retrieve(phone)
  carrier = result.carrier || {}
  sendable = %w[mobile voip].include?(carrier['type'])
  { phone: phone, carrier_type: carrier['type'], sendable: sendable }
rescue Telnyx::TelnyxError => e
  { phone: phone, carrier_type: 'error', sendable: false }
end

numbers = ['+12025551234', '+14155559876']
results = numbers.map { |n| lookup_number(n) }
puts "Sendable: #{results.count { |r| r[:sendable] }}"
```

### PHP (Single Lookup)

```php
require_once 'vendor/autoload.php';

\Telnyx\Telnyx::setApiKey(getenv('TELNYX_API_KEY'));

function lookupNumber(string $phone): array {
    try {
        $result = \Telnyx\NumberLookup::retrieve($phone);
        $type = $result->carrier->type ?? 'unknown';
        return ['phone' => $phone, 'carrier_type' => $type, 'sendable' => in_array($type, ['mobile', 'voip'])];
    } catch (\Telnyx\Exception\TelnyxException $e) {
        return ['phone' => $phone, 'carrier_type' => 'error', 'sendable' => false];
    }
}

$numbers = ['+12025551234', '+14155559876'];
$results = array_map('lookupNumber', $numbers);
$sendable = array_filter($results, fn($r) => $r['sendable']);
echo "Sendable: " . count($sendable) . "\n";
```

### Java (Single Lookup)

```java
import com.telnyx.sdk.*;
import com.telnyx.sdk.api.NumberLookupApi;
import com.telnyx.sdk.model.*;
import java.util.*;

ApiClient client = Configuration.getDefaultApiClient();
client.addDefaultHeader("Authorization", "Bearer " + System.getenv("TELNYX_API_KEY"));
NumberLookupApi api = new NumberLookupApi(client);

List<String> numbers = List.of("+12025551234", "+14155559876");
int sendable = 0;
for (String phone : numbers) {
    try {
        NumberLookupResponse result = api.numberLookup(phone);
        String type = result.getData().getCarrier().getType();
        boolean ok = Set.of("mobile", "voip").contains(type);
        if (ok) sendable++;
        System.out.printf("%s: %s (%s)%n", phone, type, ok ? "sendable" : "excluded");
    } catch (ApiException e) {
        System.out.printf("%s: error%n", phone);
    }
}
System.out.println("Sendable: " + sendable);
```

### Go (Single Lookup)

```go
package main

import (
	"context"
	"fmt"
	"os"

	telnyx "github.com/telnyx/telnyx-go"
)

func main() {
	cfg := telnyx.NewConfiguration()
	cfg.AddDefaultHeader("Authorization", "Bearer "+os.Getenv("TELNYX_API_KEY"))
	client := telnyx.NewAPIClient(cfg)

	numbers := []string{"+12025551234", "+14155559876"}
	sendable := 0
	for _, phone := range numbers {
		resp, _, err := client.NumberLookupApi.NumberLookup(context.Background(), phone).Execute()
		if err != nil {
			fmt.Printf("%s: error\n", phone)
			continue
		}
		cType := resp.Data.Carrier.GetType()
		ok := cType == "mobile" || cType == "voip"
		if ok { sendable++ }
		fmt.Printf("%s: %s (%v)\n", phone, cType, ok)
	}
	fmt.Printf("Sendable: %d\n", sendable)
}
```

---

## Webhook Handler (Delivery Receipts + Opt-Out)

Handle `message.sent`, `message.finalized`, and `message.received` events.

### Python (Flask)

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhooks/messaging', methods=['POST'])
def messaging_webhook():
    event = request.json
    event_type = event.get('data', {}).get('event_type', '')
    event_id = event.get('data', {}).get('id')  # Use as idempotency key
    payload = event.get('data', {}).get('payload', {})
    
    if event_type == 'message.finalized':
        # Delivery receipt (DLR) — terminal status
        msg_id = payload.get('id')
        recipient = payload['to'][0]
        status = recipient.get('status')  # delivered, delivery_failed, sending_failed, etc.
        cost = payload.get('cost', {}).get('amount', '0')
        errors = payload.get('errors', [])
        
        if status == 'delivered':
            print(f"✅ Delivered to {recipient['phone_number']} (${cost})")
        elif status in ('delivery_failed', 'sending_failed'):
            error_code = errors[0]['code'] if errors else 'unknown'
            print(f"❌ Failed to {recipient['phone_number']}: {error_code}")
            # Handle permanent failures: remove from list if 40301 (opted out) or 40302 (invalid)
        elif status == 'delivery_unconfirmed':
            print(f"⚠️ Unconfirmed to {recipient['phone_number']} — carrier didn't provide DLR")
        elif status == 'expired':
            print(f"⏰ Expired for {recipient['phone_number']} — exceeded valid_until")
    
    elif event_type == 'message.sent':
        # Intermediate status — carrier accepted
        msg_id = payload.get('id')
        print(f"📤 Sent to carrier: {msg_id}")
    
    elif event_type == 'message.received':
        # Inbound message — check for opt-out keywords
        from_number = payload.get('from', {}).get('phone_number')
        text = payload.get('text', '').strip().upper()
        autoresponse = payload.get('autoresponse_type')
        
        if autoresponse == 'STOP':
            print(f"🚫 Opt-out from {from_number} — adding to suppression list")
            # Add to your application's suppression list
            # Telnyx also auto-blocks at platform level
        elif autoresponse == 'START':
            print(f"✅ Re-opt-in from {from_number}")
            # Remove from suppression list
        elif autoresponse == 'HELP':
            print(f"ℹ️ Help request from {from_number}")
    
    return jsonify({"status": "ok"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

### Node.js (Express)

```javascript
import express from 'express';

const app = express();
app.use(express.json());

app.post('/webhooks/messaging', (req, res) => {
  const event = req.body;
  const eventType = event?.data?.event_type || '';
  const eventId = event?.data?.id; // Idempotency key
  const payload = event?.data?.payload || {};

  if (eventType === 'message.finalized') {
    const msgId = payload.id;
    const recipient = payload.to?.[0] || {};
    const status = recipient.status;
    const cost = payload.cost?.amount || '0';
    const errors = payload.errors || [];

    if (status === 'delivered') {
      console.log(`✅ Delivered to ${recipient.phone_number} ($${cost})`);
    } else if (['delivery_failed', 'sending_failed'].includes(status)) {
      const errorCode = errors[0]?.code || 'unknown';
      console.log(`❌ Failed to ${recipient.phone_number}: ${errorCode}`);
    } else if (status === 'delivery_unconfirmed') {
      console.log(`⚠️ Unconfirmed to ${recipient.phone_number}`);
    } else if (status === 'expired') {
      console.log(`⏰ Expired for ${recipient.phone_number}`);
    }
  } else if (eventType === 'message.sent') {
    console.log(`📤 Sent to carrier: ${payload.id}`);
  } else if (eventType === 'message.received') {
    const fromNumber = payload.from?.phone_number;
    const autoresponse = payload.autoresponse_type;

    if (autoresponse === 'STOP') {
      console.log(`🚫 Opt-out from ${fromNumber}`);
      // Add to suppression list
    } else if (autoresponse === 'START') {
      console.log(`✅ Re-opt-in from ${fromNumber}`);
      // Remove from suppression list
    }
  }

  res.json({ status: 'ok' });
});

app.listen(8080, () => console.log('Webhook server on :8080'));
```

### Ruby (Sinatra)

```ruby
require 'sinatra'
require 'json'

post '/webhooks/messaging' do
  event = JSON.parse(request.body.read)
  event_type = event.dig('data', 'event_type') || ''
  payload = event.dig('data', 'payload') || {}

  case event_type
  when 'message.finalized'
    status = payload.dig('to', 0, 'status')
    phone = payload.dig('to', 0, 'phone_number')
    puts status == 'delivered' ? "✅ Delivered to #{phone}" : "❌ #{status} for #{phone}"
  when 'message.received'
    autoresponse = payload['autoresponse_type']
    from = payload.dig('from', 'phone_number')
    puts "🚫 Opt-out from #{from}" if autoresponse == 'STOP'
  end

  content_type :json
  { status: 'ok' }.to_json
end
```

### PHP (Slim)

```php
require_once 'vendor/autoload.php';

use Slim\Factory\AppFactory;

$app = AppFactory::create();
$app->addBodyParsingMiddleware();

$app->post('/webhooks/messaging', function ($request, $response) {
    $event = $request->getParsedBody();
    $eventType = $event['data']['event_type'] ?? '';
    $payload = $event['data']['payload'] ?? [];

    if ($eventType === 'message.finalized') {
        $status = $payload['to'][0]['status'] ?? '';
        $phone = $payload['to'][0]['phone_number'] ?? '';
        echo $status === 'delivered' ? "✅ Delivered to $phone\n" : "❌ $status for $phone\n";
    } elseif ($eventType === 'message.received') {
        if (($payload['autoresponse_type'] ?? '') === 'STOP') {
            echo "🚫 Opt-out from " . ($payload['from']['phone_number'] ?? '') . "\n";
        }
    }

    $response->getBody()->write(json_encode(['status' => 'ok']));
    return $response->withHeader('Content-Type', 'application/json');
});

$app->run();
```

### Java (Spring Boot)

```java
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
public class WebhookController {
    @PostMapping("/webhooks/messaging")
    public Map<String, String> handleWebhook(@RequestBody Map<String, Object> event) {
        Map<String, Object> data = (Map<String, Object>) event.getOrDefault("data", Map.of());
        String eventType = (String) data.getOrDefault("event_type", "");
        Map<String, Object> payload = (Map<String, Object>) data.getOrDefault("payload", Map.of());

        if ("message.finalized".equals(eventType)) {
            List<Map<String, Object>> to = (List<Map<String, Object>>) payload.getOrDefault("to", List.of());
            String status = (String) to.get(0).getOrDefault("status", "");
            String phone = (String) to.get(0).getOrDefault("phone_number", "");
            System.out.printf("%s %s for %s%n",
                "delivered".equals(status) ? "✅ Delivered to" : "❌ " + status, phone, phone);
        } else if ("message.received".equals(eventType)) {
            Map<String, Object> from = (Map<String, Object>) payload.getOrDefault("from", Map.of());
            if ("STOP".equals(payload.get("autoresponse_type"))) {
                System.out.printf("🚫 Opt-out from %s%n", from.get("phone_number"));
            }
        }
        return Map.of("status", "ok");
    }
}
```

### Go (net/http)

```go
package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

func webhookHandler(w http.ResponseWriter, r *http.Request) {
	var event map[string]interface{}
	json.NewDecoder(r.Body).Decode(&event)

	data, _ := event["data"].(map[string]interface{})
	eventType, _ := data["event_type"].(string)
	payload, _ := data["payload"].(map[string]interface{})

	switch eventType {
	case "message.finalized":
		to := payload["to"].([]interface{})[0].(map[string]interface{})
		status := to["status"].(string)
		phone := to["phone_number"].(string)
		if status == "delivered" {
			fmt.Printf("✅ Delivered to %s\n", phone)
		} else {
			fmt.Printf("❌ %s for %s\n", status, phone)
		}
	case "message.received":
		if payload["autoresponse_type"] == "STOP" {
			from := payload["from"].(map[string]interface{})
			fmt.Printf("🚫 Opt-out from %s\n", from["phone_number"])
		}
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}

func main() {
	http.HandleFunc("/webhooks/messaging", webhookHandler)
	fmt.Println("Webhook server on :8080")
	http.ListenAndServe(":8080", nil)
}
```

---

## Opt-Out Management API

Query and manage the platform-level opt-out list.

### Python

```python
import requests
import os

headers = {
    "Authorization": f"Bearer {os.environ['TELNYX_API_KEY']}",
    "Content-Type": "application/json"
}

# List opt-outs for a messaging profile
response = requests.get(
    "https://api.telnyx.com/v2/messaging_optouts",
    headers=headers,
    params={
        "filter[messaging_profile_id]": "YOUR_PROFILE_ID",
        "page[size]": 100,
    }
)
optouts = response.json()

for record in optouts.get("data", []):
    print(f"  {record['to']} opted out via '{record['keyword']}' at {record['created_at']}")

total = optouts.get("meta", {}).get("total_results", 0)
print(f"\nTotal opt-outs: {total}")
```

### Node.js

```javascript
const headers = {
  'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
  'Content-Type': 'application/json'
};

// List opt-outs
const response = await fetch(
  'https://api.telnyx.com/v2/messaging_optouts?' + new URLSearchParams({
    'filter[messaging_profile_id]': 'YOUR_PROFILE_ID',
    'page[size]': '100',
  }),
  { headers }
);
const optouts = await response.json();

for (const record of optouts.data || []) {
  console.log(`  ${record.to} opted out via '${record.keyword}' at ${record.created_at}`);
}
console.log(`\nTotal opt-outs: ${optouts.meta?.total_results || 0}`);
```

### Configure Custom Auto-Response

```python
# Customize STOP response for your messaging profile
response = requests.post(
    f"https://api.telnyx.com/v2/messaging_profiles/YOUR_PROFILE_ID/autoresp_configs",
    headers=headers,
    json={
        "op": "stop",
        "keywords": ["STOP", "QUIT", "CANCEL", "END", "UNSUBSCRIBE"],
        "resp_text": "You have been unsubscribed from Acme promotions. Reply START to resubscribe.",
        "country_code": "US"
    }
)
print(f"Auto-response configured: {response.json()}")
```

### Ruby

```ruby
require 'net/http'
require 'json'

headers = { 'Authorization' => "Bearer #{ENV['TELNYX_API_KEY']}", 'Content-Type' => 'application/json' }

uri = URI('https://api.telnyx.com/v2/messaging_optouts')
uri.query = URI.encode_www_form('filter[messaging_profile_id]' => 'YOUR_PROFILE_ID', 'page[size]' => 100)
response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) do |http|
  http.get(uri, headers)
end
optouts = JSON.parse(response.body)

optouts['data']&.each do |record|
  puts "  #{record['to']} opted out via '#{record['keyword']}' at #{record['created_at']}"
end
puts "Total opt-outs: #{optouts.dig('meta', 'total_results') || 0}"
```

### PHP

```php
$headers = ['Authorization: Bearer ' . getenv('TELNYX_API_KEY'), 'Content-Type: application/json'];

$query = http_build_query(['filter[messaging_profile_id]' => 'YOUR_PROFILE_ID', 'page[size]' => 100]);
$ch = curl_init("https://api.telnyx.com/v2/messaging_optouts?$query");
curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => $headers]);
$optouts = json_decode(curl_exec($ch), true);
curl_close($ch);

foreach ($optouts['data'] ?? [] as $record) {
    echo "  {$record['to']} opted out via '{$record['keyword']}' at {$record['created_at']}\n";
}
echo "Total opt-outs: " . ($optouts['meta']['total_results'] ?? 0) . "\n";
```

### Java

```java
import java.net.http.*;
import java.net.URI;
import com.google.gson.*;

HttpClient httpClient = HttpClient.newHttpClient();
String apiKey = System.getenv("TELNYX_API_KEY");

HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.telnyx.com/v2/messaging_optouts?filter[messaging_profile_id]=YOUR_PROFILE_ID&page[size]=100"))
    .header("Authorization", "Bearer " + apiKey)
    .GET().build();

HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
JsonObject optouts = JsonParser.parseString(response.body()).getAsJsonObject();

for (JsonElement el : optouts.getAsJsonArray("data")) {
    JsonObject rec = el.getAsJsonObject();
    System.out.printf("  %s opted out via '%s' at %s%n",
        rec.get("to").getAsString(), rec.get("keyword").getAsString(), rec.get("created_at").getAsString());
}
System.out.println("Total: " + optouts.getAsJsonObject("meta").get("total_results").getAsInt());
```

### Go

```go
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	req, _ := http.NewRequest("GET",
		"https://api.telnyx.com/v2/messaging_optouts?filter[messaging_profile_id]=YOUR_PROFILE_ID&page[size]=100", nil)
	req.Header.Set("Authorization", "Bearer "+os.Getenv("TELNYX_API_KEY"))

	resp, err := http.DefaultClient.Do(req)
	if err != nil { panic(err) }
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(body, &result)

	for _, item := range result["data"].([]interface{}) {
		rec := item.(map[string]interface{})
		fmt.Printf("  %s opted out via '%s' at %s\n", rec["to"], rec["keyword"], rec["created_at"])
	}
	meta := result["meta"].(map[string]interface{})
	fmt.Printf("Total opt-outs: %.0f\n", meta["total_results"])
}
```

---

## Batch Send with Rate Limiting (Token Bucket)

### Python

```python
import time
import threading
import os
from telnyx import Telnyx

class RateLimiter:
    """Token bucket rate limiter for SMS sending."""
    def __init__(self, rate: float, burst: int = None):
        self.rate = rate
        self.burst = burst or max(1, int(rate))
        self.tokens = self.burst
        self.last_refill = time.monotonic()
        self.lock = threading.Lock()

    def acquire(self, timeout: float = 30.0) -> bool:
        deadline = time.monotonic() + timeout
        while True:
            with self.lock:
                self._refill()
                if self.tokens >= 1:
                    self.tokens -= 1
                    return True
            wait_time = min(1.0 / self.rate, deadline - time.monotonic())
            if wait_time <= 0:
                return False
            time.sleep(wait_time)

    def _refill(self):
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.burst, self.tokens + elapsed * self.rate)
        self.last_refill = now


client = Telnyx(api_key=os.environ["TELNYX_API_KEY"])
limiter = RateLimiter(rate=16)  # 80% of toll-free 20 MPS = 16 MPS

def send_campaign(recipients, message_text, from_number):
    """Send campaign with rate limiting and error handling."""
    results = {"sent": 0, "failed": 0, "opted_out": 0}
    
    for recipient in recipients:
        if not limiter.acquire(timeout=60):
            print(f"⚠️ Rate limit timeout for {recipient}")
            results["failed"] += 1
            continue
        
        try:
            response = client.messages.send(
                from_=from_number,
                to=recipient,
                text=message_text,
            )
            results["sent"] += 1
        except Exception as e:
            error_code = getattr(e, 'code', 'unknown')
            if str(error_code) == '40300':
                # Opted out — suppress
                results["opted_out"] += 1
            elif str(error_code) == '40318':
                # Queue full — pause and retry
                time.sleep(30)
                results["failed"] += 1
            else:
                results["failed"] += 1
    
    print(f"📊 Campaign results: {results}")
    return results
```

### Node.js

```javascript
class RateLimiter {
  constructor(rate, burst) {
    this.rate = rate;
    this.burst = burst || Math.max(1, Math.floor(rate));
    this.tokens = this.burst;
    this.lastRefill = Date.now();
  }

  async acquire(timeoutMs = 30000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      this._refill();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return true;
      }
      const waitMs = Math.min(1000 / this.rate, deadline - Date.now());
      if (waitMs <= 0) break;
      await new Promise((r) => setTimeout(r, waitMs));
    }
    return false;
  }

  _refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.burst, this.tokens + elapsed * this.rate);
    this.lastRefill = now;
  }
}

import Telnyx from 'telnyx';

const client = new Telnyx({ apiKey: process.env.TELNYX_API_KEY });
const limiter = new RateLimiter(16); // 80% of 20 MPS

async function sendCampaign(recipients, messageText, fromNumber) {
  const results = { sent: 0, failed: 0, optedOut: 0 };

  for (const recipient of recipients) {
    if (!(await limiter.acquire(60000))) {
      console.log(`⚠️ Rate limit timeout for ${recipient}`);
      results.failed++;
      continue;
    }

    try {
      await client.messages.send({
        from: fromNumber,
        to: recipient,
        text: messageText,
      });
      results.sent++;
    } catch (err) {
      const code = err?.rawResponse?.errors?.[0]?.code;
      if (code === '40300') {
        results.optedOut++;
      } else if (code === '40318') {
        await new Promise((r) => setTimeout(r, 30000));
        results.failed++;
      } else {
        results.failed++;
      }
    }
  }

  console.log('📊 Campaign results:', results);
  return results;
}
```

### Ruby

```ruby
require 'telnyx'

Telnyx.api_key = ENV['TELNYX_API_KEY']

class TokenBucket
  def initialize(rate, burst = nil)
    @rate = rate.to_f
    @burst = burst || [1, rate.to_i].max
    @tokens = @burst
    @last_refill = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    @mutex = Mutex.new
  end

  def acquire(timeout: 30)
    deadline = Process.clock_gettime(Process::CLOCK_MONOTONIC) + timeout
    loop do
      @mutex.synchronize { refill; if @tokens >= 1; @tokens -= 1; return true; end }
      wait = [1.0 / @rate, deadline - Process.clock_gettime(Process::CLOCK_MONOTONIC)].min
      return false if wait <= 0
      sleep(wait)
    end
  end

  private def refill
    now = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    @tokens = [@burst, @tokens + (now - @last_refill) * @rate].min
    @last_refill = now
  end
end

limiter = TokenBucket.new(16)

def send_campaign(recipients, message_text, from_number, limiter)
  results = { sent: 0, failed: 0, opted_out: 0 }
  recipients.each do |to|
    next results[:failed] += 1 unless limiter.acquire(timeout: 60)
    begin
      Telnyx::Message.create(from: from_number, to: to, text: message_text)
      results[:sent] += 1
    rescue Telnyx::TelnyxError => e
      e.code == '40300' ? results[:opted_out] += 1 : results[:failed] += 1
    end
  end
  puts "📊 Campaign results: #{results}"
  results
end
```

### PHP

```php
require_once 'vendor/autoload.php';
\Telnyx\Telnyx::setApiKey(getenv('TELNYX_API_KEY'));

class TokenBucket {
    private float $rate, $tokens, $lastRefill;
    private int $burst;

    public function __construct(float $rate, ?int $burst = null) {
        $this->rate = $rate;
        $this->burst = $burst ?? max(1, (int)$rate);
        $this->tokens = $this->burst;
        $this->lastRefill = microtime(true);
    }

    public function acquire(float $timeout = 30.0): bool {
        $deadline = microtime(true) + $timeout;
        while (true) {
            $this->refill();
            if ($this->tokens >= 1) { $this->tokens--; return true; }
            $wait = min(1.0 / $this->rate, $deadline - microtime(true));
            if ($wait <= 0) return false;
            usleep((int)($wait * 1e6));
        }
    }

    private function refill(): void {
        $now = microtime(true);
        $this->tokens = min($this->burst, $this->tokens + ($now - $this->lastRefill) * $this->rate);
        $this->lastRefill = $now;
    }
}

$limiter = new TokenBucket(16);

function sendCampaign(array $recipients, string $text, string $from, TokenBucket $limiter): array {
    $results = ['sent' => 0, 'failed' => 0, 'opted_out' => 0];
    foreach ($recipients as $to) {
        if (!$limiter->acquire(60.0)) { $results['failed']++; continue; }
        try {
            \Telnyx\Message::create(['from' => $from, 'to' => $to, 'text' => $text]);
            $results['sent']++;
        } catch (\Telnyx\Exception\TelnyxException $e) {
            str_contains($e->getMessage(), '40300') ? $results['opted_out']++ : $results['failed']++;
        }
    }
    echo "📊 Campaign results: " . json_encode($results) . "\n";
    return $results;
}
```

### Java

```java
import com.telnyx.sdk.*;
import com.telnyx.sdk.api.MessagesApi;
import com.telnyx.sdk.model.*;
import java.util.concurrent.atomic.*;

class TokenBucket {
    private final double rate;
    private final int burst;
    private double tokens;
    private long lastRefillNanos;

    TokenBucket(double rate) {
        this.rate = rate;
        this.burst = Math.max(1, (int) rate);
        this.tokens = this.burst;
        this.lastRefillNanos = System.nanoTime();
    }

    synchronized boolean acquire(long timeoutMs) throws InterruptedException {
        long deadline = System.nanoTime() + timeoutMs * 1_000_000L;
        while (true) {
            refill();
            if (tokens >= 1) { tokens--; return true; }
            long waitNs = Math.min((long)(1e9 / rate), deadline - System.nanoTime());
            if (waitNs <= 0) return false;
            Thread.sleep(waitNs / 1_000_000, (int)(waitNs % 1_000_000));
        }
    }

    private void refill() {
        long now = System.nanoTime();
        tokens = Math.min(burst, tokens + (now - lastRefillNanos) / 1e9 * rate);
        lastRefillNanos = now;
    }
}

// Usage
ApiClient client = Configuration.getDefaultApiClient();
client.addDefaultHeader("Authorization", "Bearer " + System.getenv("TELNYX_API_KEY"));
MessagesApi api = new MessagesApi(client);
TokenBucket limiter = new TokenBucket(16);

AtomicInteger sent = new AtomicInteger(), failed = new AtomicInteger();
for (String recipient : recipients) {
    if (!limiter.acquire(60000)) { failed.incrementAndGet(); continue; }
    try {
        api.createMessage(new CreateMessageRequest().from(fromNumber).to(recipient).text(messageText));
        sent.incrementAndGet();
    } catch (ApiException e) { failed.incrementAndGet(); }
}
System.out.printf("📊 Sent: %d, Failed: %d%n", sent.get(), failed.get());
```

### Go

```go
package main

import (
	"context"
	"fmt"
	"os"
	"sync"
	"time"

	telnyx "github.com/telnyx/telnyx-go"
)

type TokenBucket struct {
	rate, tokens float64
	burst        int
	lastRefill   time.Time
	mu           sync.Mutex
}

func NewTokenBucket(rate float64) *TokenBucket {
	b := max(1, int(rate))
	return &TokenBucket{rate: rate, burst: b, tokens: float64(b), lastRefill: time.Now()}
}

func (tb *TokenBucket) Acquire(timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)
	for {
		tb.mu.Lock()
		elapsed := time.Since(tb.lastRefill).Seconds()
		tb.tokens = min(float64(tb.burst), tb.tokens+elapsed*tb.rate)
		tb.lastRefill = time.Now()
		if tb.tokens >= 1 {
			tb.tokens--
			tb.mu.Unlock()
			return true
		}
		tb.mu.Unlock()
		wait := time.Duration(float64(time.Second) / tb.rate)
		if time.Now().Add(wait).After(deadline) { return false }
		time.Sleep(wait)
	}
}

func main() {
	cfg := telnyx.NewConfiguration()
	cfg.AddDefaultHeader("Authorization", "Bearer "+os.Getenv("TELNYX_API_KEY"))
	client := telnyx.NewAPIClient(cfg)
	limiter := NewTokenBucket(16)

	recipients := []string{"+15559876543", "+15559876544"}
	sent, failed := 0, 0
	for _, to := range recipients {
		if !limiter.Acquire(60 * time.Second) { failed++; continue }
		req := *telnyx.NewCreateMessageRequest(to, "Acme Sale! 30% off. Reply STOP to opt out.")
		req.SetFrom("+15551234567")
		_, _, err := client.MessagesApi.CreateMessage(context.Background()).CreateMessageRequest(req).Execute()
		if err != nil { failed++ } else { sent++ }
	}
	fmt.Printf("📊 Sent: %d, Failed: %d\n", sent, failed)
}
```

---

## Webhook Signature Verification (Ed25519)

### Python

```python
import telnyx
from flask import Flask, request

app = Flask(__name__)
telnyx.api_key = "YOUR_API_KEY"
telnyx.public_key = "YOUR_PUBLIC_KEY"  # From Mission Control Portal > Keys & Credentials

@app.route('/webhooks/messaging', methods=['POST'])
def verified_webhook():
    payload = request.data
    signature = request.headers.get('telnyx-signature-ed25519')
    timestamp = request.headers.get('telnyx-timestamp')
    
    try:
        event = telnyx.Webhook.construct_event(payload, signature, timestamp)
        print(f"Verified event: {event['data']['event_type']}")
        # Process event...
        return '', 200
    except telnyx.error.SignatureVerificationError:
        return 'Invalid signature', 403
```

### Node.js

```javascript
import express from 'express';
import Telnyx from 'telnyx';

const app = express();
const telnyx = new Telnyx({ apiKey: process.env.TELNYX_API_KEY });

// IMPORTANT: Use express.raw() to get the exact bytes the signature was computed
// over. express.json() parses and re-serializing with JSON.stringify() can alter
// whitespace/escaping, breaking Ed25519 verification.
app.post('/webhooks/messaging', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['telnyx-signature-ed25519'];
  const timestamp = req.headers['telnyx-timestamp'];
  const rawBody = req.body; // Buffer — exact bytes from the wire

  try {
    const event = telnyx.webhooks.constructEvent(
      rawBody, signature, timestamp,
      process.env.TELNYX_PUBLIC_KEY
    );
    console.log('Verified event:', event.data.event_type);
    res.sendStatus(200);
  } catch (err) {
    console.error('Signature verification failed:', err.message);
    res.sendStatus(403);
  }
});
```

### Ruby (Sinatra + Ed25519)

```ruby
require 'sinatra'
require 'ed25519'
require 'base64'
require 'json'

PUBLIC_KEY = Ed25519::VerifyKey.new(Base64.decode64(ENV['TELNYX_PUBLIC_KEY']))

post '/webhooks/messaging' do
  payload = request.body.read
  signature = Base64.decode64(request.env['HTTP_TELNYX_SIGNATURE_ED25519'] || '')
  timestamp = request.env['HTTP_TELNYX_TIMESTAMP'] || ''
  signed_payload = "#{timestamp}|#{payload}"

  begin
    PUBLIC_KEY.verify(signature, signed_payload)
    event = JSON.parse(payload)
    puts "Verified event: #{event.dig('data', 'event_type')}"
    status 200
    { status: 'ok' }.to_json
  rescue Ed25519::VerifyError
    halt 403, 'Invalid signature'
  end
end
```

### PHP (Ed25519)

```php
<?php
$publicKeyHex = base64_decode(getenv('TELNYX_PUBLIC_KEY'));

$payload = file_get_contents('php://input');
$signature = base64_decode($_SERVER['HTTP_TELNYX_SIGNATURE_ED25519'] ?? '');
$timestamp = $_SERVER['HTTP_TELNYX_TIMESTAMP'] ?? '';
$signedPayload = $timestamp . '|' . $payload;

if (sodium_crypto_sign_verify_detached($signature, $signedPayload, $publicKeyHex)) {
    $event = json_decode($payload, true);
    echo "Verified event: " . $event['data']['event_type'] . "\n";
    http_response_code(200);
    echo json_encode(['status' => 'ok']);
} else {
    http_response_code(403);
    echo 'Invalid signature';
}
```

### Java (Ed25519)

```java
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import java.security.*;
import java.security.spec.*;
import java.util.Base64;

@RestController
public class VerifiedWebhookController {
    private final PublicKey publicKey;

    public VerifiedWebhookController() throws Exception {
        byte[] keyBytes = Base64.getDecoder().decode(System.getenv("TELNYX_PUBLIC_KEY"));
        this.publicKey = KeyFactory.getInstance("Ed25519")
            .generatePublic(new EdECPublicKeySpec(NamedParameterSpec.ED25519,
                new EdECPoint(keyBytes[31] < 0, new java.math.BigInteger(1, reverse(keyBytes)))));
    }

    @PostMapping("/webhooks/messaging")
    public ResponseEntity<String> handleWebhook(@RequestBody String payload, HttpServletRequest req) throws Exception {
        String signature = req.getHeader("telnyx-signature-ed25519");
        String timestamp = req.getHeader("telnyx-timestamp");
        Signature sig = Signature.getInstance("Ed25519");
        sig.initVerify(publicKey);
        sig.update((timestamp + "|" + payload).getBytes());
        if (!sig.verify(Base64.getDecoder().decode(signature))) {
            return ResponseEntity.status(403).body("Forbidden");
        }
        System.out.println("Verified event");
        return ResponseEntity.ok("{\"status\":\"ok\"}");
    }

    private static byte[] reverse(byte[] arr) {
        byte[] r = new byte[arr.length];
        for (int i = 0; i < arr.length; i++) r[i] = arr[arr.length - 1 - i];
        return r;
    }
}
```

### Go (Ed25519)

```go
package main

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	pubKeyBytes, _ := base64.StdEncoding.DecodeString(os.Getenv("TELNYX_PUBLIC_KEY"))
	publicKey := ed25519.PublicKey(pubKeyBytes)

	http.HandleFunc("/webhooks/messaging", func(w http.ResponseWriter, r *http.Request) {
		payload, _ := io.ReadAll(r.Body)
		signature, _ := base64.StdEncoding.DecodeString(r.Header.Get("telnyx-signature-ed25519"))
		timestamp := r.Header.Get("telnyx-timestamp")
		signedPayload := []byte(timestamp + "|" + string(payload))

		if !ed25519.Verify(publicKey, signedPayload, signature) {
			http.Error(w, "Invalid signature", http.StatusForbidden)
			return
		}
		var event map[string]interface{}
		json.Unmarshal(payload, &event)
		fmt.Printf("Verified event: %v\n", event["data"].(map[string]interface{})["event_type"])
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})
	http.ListenAndServe(":8080", nil)
}
```

---

## 10DLC Marketing Campaign Registration

> **Note:** 10DLC endpoints are not wrapped in most Telnyx SDKs. Use raw HTTP requests.

### Python (Brand + Marketing Campaign + Assignment)

```python
import requests
import os

headers = {
    "Authorization": f"Bearer {os.environ['TELNYX_API_KEY']}",
    "Content-Type": "application/json"
}

# Register brand
brand = requests.post("https://api.telnyx.com/v2/10dlc/brand", headers=headers, json={
    "entityType": "PRIVATE_PROFIT", "displayName": "Acme Corp",
    "companyName": "Acme Corporation Inc.", "ein": "123456789",
    "country": "US", "email": "marketing@acme.com", "phone": "+12025551234",
    "street": "123 Main St", "city": "Denver", "state": "CO",
    "postalCode": "80202", "website": "https://acme.com",
    "vertical": "RETAIL", "isReseller": False
}).json()
print(f"Brand ID: {brand['brandId']}, Status: {brand['identityStatus']}")

# NOTE: 10DLC endpoints return .records, NOT .data (FRIC-004)
# Wait for brand vetting (1-7 business days) — must poll, no webhook (FRIC-006)

# Create MARKETING campaign (after brand VERIFIED)
campaign = requests.post("https://api.telnyx.com/v2/10dlc/campaignBuilder", headers=headers, json={
    "brandId": brand["brandId"],
    "usecase": "MARKETING",  # or "MIXED" for transactional + promotional
    "description": "Promotional SMS including sales, discount codes, new product launches, and loyalty rewards.",
    "sample1": "Acme Summer Sale! 30% off all items this weekend. Use code SUMMER30. Shop: acme.com/sale. Reply STOP to opt out.",
    "sample2": "New at Acme: Spring collection just dropped! 50+ styles from $19.99. Browse: acme.com/new. Txt STOP to unsubscribe.",
    "sample3": "Acme: Exclusive 20% off for loyal customers! Use code VIP20 by March 31. Shop: acme.com. Reply STOP to cancel.",
    "messageFlow": "Customers opt in by checking a separate, unchecked consent checkbox at acme.com/checkout. Checkbox reads: I agree to receive promotional SMS from Acme Corp. Msg frequency varies (up to 8/month). Msg & data rates may apply. Consent not required for purchase. Reply STOP to cancel.",
    "helpMessage": "Acme support: Visit acme.com/help or call +15551234567. Up to 8 msgs/mo. Msg & data rates apply. Reply STOP to cancel.",
    "helpKeywords": "HELP,INFO",
    "optinKeywords": "START,YES,SUBSCRIBE",
    "optoutKeywords": "STOP,UNSUBSCRIBE,CANCEL,END,QUIT",
    "optinMessage": "Welcome to Acme texts! You'll receive up to 8 msgs/month with deals & updates. Reply HELP for help, STOP to opt out.",
    "optoutMessage": "You have been unsubscribed from Acme promotions. No more messages will be sent. Reply START to resubscribe.",
    "embeddedLink": True,
    "numberPool": False,
    "ageGated": False,
    "directLending": False,
    "subscriberOptin": True,
    "subscriberOptout": True,
    "subscriberHelp": True,
    "termsAndConditions": True
}).json()
print(f"Campaign ID: {campaign['campaignId']}, Status: {campaign.get('campaignStatus')}")

# Assign phone number to campaign
assignment = requests.post("https://api.telnyx.com/v2/10dlc/phone_number_campaigns",
    headers=headers, json={"phoneNumber": "+19705551234", "campaignId": campaign["campaignId"]}
).json()
print(f"Assignment status: {assignment.get('assignmentStatus')}")
```

### Node.js (Brand + Marketing Campaign + Assignment)

```javascript
const headers = {
  'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
  'Content-Type': 'application/json'
};

// Register brand
const brand = await (await fetch('https://api.telnyx.com/v2/10dlc/brand', {
  method: 'POST', headers,
  body: JSON.stringify({
    entityType: 'PRIVATE_PROFIT', displayName: 'Acme Corp',
    companyName: 'Acme Corporation Inc.', ein: '123456789',
    country: 'US', email: 'marketing@acme.com', phone: '+12025551234',
    street: '123 Main St', city: 'Denver', state: 'CO',
    postalCode: '80202', website: 'https://acme.com',
    vertical: 'RETAIL', isReseller: false
  })
})).json();
console.log(`Brand ID: ${brand.brandId}, Status: ${brand.identityStatus}`);

// Create MARKETING campaign (after brand VERIFIED)
const campaign = await (await fetch('https://api.telnyx.com/v2/10dlc/campaignBuilder', {
  method: 'POST', headers,
  body: JSON.stringify({
    brandId: brand.brandId,
    usecase: 'MARKETING',
    description: 'Promotional SMS including sales, discount codes, new product launches, and loyalty rewards.',
    sample1: 'Acme Summer Sale! 30% off all items this weekend. Use code SUMMER30. Shop: acme.com/sale. Reply STOP to opt out.',
    sample2: 'New at Acme: Spring collection just dropped! 50+ styles from $19.99. Browse: acme.com/new. Txt STOP to unsubscribe.',
    sample3: 'Acme: Exclusive 20% off for loyal customers! Use code VIP20 by March 31. Shop: acme.com. Reply STOP to cancel.',
    messageFlow: 'Customers opt in by checking a separate, unchecked consent checkbox at acme.com/checkout.',
    helpMessage: 'Acme support: Visit acme.com/help. Up to 8 msgs/mo. Reply STOP to cancel.',
    helpKeywords: 'HELP,INFO',
    optinKeywords: 'START,YES,SUBSCRIBE',
    optoutKeywords: 'STOP,UNSUBSCRIBE,CANCEL,END,QUIT',
    optoutMessage: 'You have been unsubscribed from Acme messages. No more messages will be sent. Reply START to re-subscribe.',
    embeddedLink: true, numberPool: false, ageGated: false,
    directLending: false, subscriberOptin: true,
    subscriberOptout: true, subscriberHelp: true, termsAndConditions: true
  })
})).json();
console.log(`Campaign ID: ${campaign.campaignId}`);

// Assign number to campaign
const assignment = await (await fetch('https://api.telnyx.com/v2/10dlc/phone_number_campaigns', {
  method: 'POST', headers,
  body: JSON.stringify({ phoneNumber: '+19705551234', campaignId: campaign.campaignId })
})).json();
console.log(`Assignment: ${assignment.assignmentStatus}`);
```

### Ruby (Brand + Campaign + Assignment)

```ruby
require 'net/http'
require 'json'
require 'uri'

HEADERS = { 'Authorization' => "Bearer #{ENV['TELNYX_API_KEY']}", 'Content-Type' => 'application/json' }

def post_10dlc(path, body)
  uri = URI("https://api.telnyx.com/v2/10dlc/#{path}")
  req = Net::HTTP::Post.new(uri, HEADERS)
  req.body = body.to_json
  JSON.parse(Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) { |http| http.request(req) }.body)
end

brand = post_10dlc('brand', {
  entityType: 'PRIVATE_PROFIT', displayName: 'Acme Corp', companyName: 'Acme Corporation Inc.',
  ein: '123456789', country: 'US', email: 'marketing@acme.com', phone: '+12025551234',
  street: '123 Main St', city: 'Denver', state: 'CO', postalCode: '80202',
  website: 'https://acme.com', vertical: 'RETAIL', isReseller: false
})
puts "Brand: #{brand['brandId']} (#{brand['identityStatus']})"

campaign = post_10dlc('campaignBuilder', {
  brandId: brand['brandId'], usecase: 'MARKETING',
  description: 'Promotional SMS including sales and discount codes.',
  sample1: 'Acme Sale! 30% off this weekend. Shop: acme.com/sale. Reply STOP to opt out.',
  messageFlow: 'Opt-in via checkbox at acme.com/checkout.',
  helpKeywords: 'HELP', optoutKeywords: 'STOP,CANCEL,END',
  optoutMessage: 'You have been unsubscribed from Acme messages. No more messages will be sent. Reply START to re-subscribe.',
  subscriberOptin: true, subscriberOptout: true, subscriberHelp: true
})
puts "Campaign: #{campaign['campaignId']}"
```

### PHP (Brand + Campaign + Assignment)

```php
$apiKey = getenv('TELNYX_API_KEY');
$headers = ['Authorization: Bearer ' . $apiKey, 'Content-Type: application/json'];

function post10dlc(string $path, array $body): array {
    global $headers;
    $ch = curl_init("https://api.telnyx.com/v2/10dlc/$path");
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers, CURLOPT_POSTFIELDS => json_encode($body),
    ]);
    $result = json_decode(curl_exec($ch), true);
    curl_close($ch);
    return $result;
}

$brand = post10dlc('brand', [
    'entityType' => 'PRIVATE_PROFIT', 'displayName' => 'Acme Corp',
    'companyName' => 'Acme Corporation Inc.', 'ein' => '123456789',
    'country' => 'US', 'email' => 'marketing@acme.com', 'phone' => '+12025551234',
    'street' => '123 Main St', 'city' => 'Denver', 'state' => 'CO',
    'postalCode' => '80202', 'website' => 'https://acme.com', 'vertical' => 'RETAIL',
]);
echo "Brand: {$brand['brandId']} ({$brand['identityStatus']})\n";

$campaign = post10dlc('campaignBuilder', [
    'brandId' => $brand['brandId'], 'usecase' => 'MARKETING',
    'description' => 'Promotional SMS including sales and discount codes.',
    'sample1' => 'Acme Sale! 30% off this weekend. Shop: acme.com/sale. Reply STOP to opt out.',
    'messageFlow' => 'Opt-in via checkbox at acme.com/checkout.',
    'helpKeywords' => 'HELP', 'optoutKeywords' => 'STOP,CANCEL,END',
    'optoutMessage' => 'You have been unsubscribed from Acme messages. No more messages will be sent. Reply START to re-subscribe.',
    'subscriberOptin' => true, 'subscriberOptout' => true, 'subscriberHelp' => true,
]);
echo "Campaign: {$campaign['campaignId']}\n";
```

### Java (Brand + Campaign + Assignment)

```java
import java.net.http.*;
import java.net.URI;
import com.google.gson.*;

HttpClient httpClient = HttpClient.newHttpClient();
String apiKey = System.getenv("TELNYX_API_KEY");

String postJson(String path, String body) throws Exception {
    HttpRequest req = HttpRequest.newBuilder()
        .uri(URI.create("https://api.telnyx.com/v2/10dlc/" + path))
        .header("Authorization", "Bearer " + apiKey)
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(body)).build();
    return httpClient.send(req, HttpResponse.BodyHandlers.ofString()).body();
}

// Register brand
JsonObject brand = JsonParser.parseString(postJson("brand",
    "{\"entityType\":\"PRIVATE_PROFIT\",\"displayName\":\"Acme Corp\"," +
    "\"companyName\":\"Acme Corporation Inc.\",\"ein\":\"123456789\"," +
    "\"country\":\"US\",\"email\":\"marketing@acme.com\",\"phone\":\"+12025551234\"," +
    "\"street\":\"123 Main St\",\"city\":\"Denver\",\"state\":\"CO\"," +
    "\"postalCode\":\"80202\",\"website\":\"https://acme.com\",\"vertical\":\"RETAIL\"}"
)).getAsJsonObject();
System.out.printf("Brand: %s (%s)%n", brand.get("brandId").getAsString(), brand.get("identityStatus").getAsString());

// Create campaign (after brand VERIFIED)
JsonObject campaign = JsonParser.parseString(postJson("campaignBuilder",
    "{\"brandId\":\"" + brand.get("brandId").getAsString() + "\"," +
    "\"usecase\":\"MARKETING\",\"description\":\"Promotional SMS for sales.\"," +
    "\"sample1\":\"Acme Sale! 30% off. Shop: acme.com/sale. Reply STOP to opt out.\"," +
    "\"messageFlow\":\"Opt-in via checkbox at acme.com/checkout.\"," +
    "\"helpKeywords\":\"HELP\",\"optoutKeywords\":\"STOP,CANCEL,END\"," +
    "\"optoutMessage\":\"You have been unsubscribed from Acme messages. No more messages will be sent. Reply START to re-subscribe.\"," +
    "\"subscriberOptin\":true,\"subscriberOptout\":true,\"subscriberHelp\":true}"
)).getAsJsonObject();
System.out.printf("Campaign: %s%n", campaign.get("campaignId").getAsString());
```

### Go (Brand + Campaign + Assignment)

```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

func post10dlc(path string, body map[string]interface{}) map[string]interface{} {
	jsonBody, _ := json.Marshal(body)
	req, _ := http.NewRequest("POST", "https://api.telnyx.com/v2/10dlc/"+path, bytes.NewReader(jsonBody))
	req.Header.Set("Authorization", "Bearer "+os.Getenv("TELNYX_API_KEY"))
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil { panic(err) }
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(data, &result)
	return result
}

func main() {
	brand := post10dlc("brand", map[string]interface{}{
		"entityType": "PRIVATE_PROFIT", "displayName": "Acme Corp",
		"companyName": "Acme Corporation Inc.", "ein": "123456789",
		"country": "US", "email": "marketing@acme.com", "phone": "+12025551234",
		"street": "123 Main St", "city": "Denver", "state": "CO",
		"postalCode": "80202", "website": "https://acme.com", "vertical": "RETAIL",
	})
	fmt.Printf("Brand: %s (%s)\n", brand["brandId"], brand["identityStatus"])

	campaign := post10dlc("campaignBuilder", map[string]interface{}{
		"brandId": brand["brandId"], "usecase": "MARKETING",
		"description": "Promotional SMS for sales and discounts.",
		"sample1": "Acme Sale! 30% off. Shop: acme.com/sale. Reply STOP to opt out.",
		"messageFlow": "Opt-in via checkbox at acme.com/checkout.",
		"helpKeywords": "HELP", "optoutKeywords": "STOP,CANCEL,END",
		"optoutMessage": "You have been unsubscribed from Acme messages. No more messages will be sent. Reply START to re-subscribe.",
		"subscriberOptin": true, "subscriberOptout": true, "subscriberHelp": true,
	})
	fmt.Printf("Campaign: %s\n", campaign["campaignId"])

	assign := post10dlc("phone_number_campaigns", map[string]interface{}{
		"phoneNumber": "+19705551234", "campaignId": campaign["campaignId"],
	})
	fmt.Printf("Assignment: %s\n", assign["assignmentStatus"])
}
```

---

## Brand Vetting Status Poll

No webhook exists for brand vetting completion (FRIC-006). You must poll.

### Python

```python
import time
import requests
import os

def wait_for_brand_verification(brand_id, poll_interval=3600, max_days=10):
    """Poll brand status until verified. Default: check every hour, up to 10 days."""
    headers = {"Authorization": f"Bearer {os.environ['TELNYX_API_KEY']}"}
    max_attempts = (max_days * 24 * 3600) // poll_interval
    
    for attempt in range(max_attempts):
        brand = requests.get(
            f"https://api.telnyx.com/v2/10dlc/brand/{brand_id}",
            headers=headers
        ).json()
        status = brand.get("identityStatus", "UNKNOWN")
        print(f"[Attempt {attempt + 1}] Brand status: {status}")
        
        if status in ("VERIFIED", "VETTED_VERIFIED"):
            print("✅ Brand verified! Ready to create campaigns.")
            return brand
        if status == "REGISTRATION_FAILED":
            print(f"❌ Registration failed: {brand.get('failureReasons')}")
            return None
        
        time.sleep(poll_interval)
    
    print("⏰ Timed out waiting for brand verification")
    return None
```

### Node.js

```javascript
async function waitForBrandVerification(brandId, pollIntervalMs = 3600000, maxDays = 10) {
  const headers = { 'Authorization': `Bearer ${process.env.TELNYX_API_KEY}` };
  const maxAttempts = Math.floor((maxDays * 24 * 3600000) / pollIntervalMs);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const resp = await fetch(`https://api.telnyx.com/v2/10dlc/brand/${brandId}`, { headers });
    const brand = await resp.json();
    const status = brand.identityStatus || 'UNKNOWN';
    console.log(`[Attempt ${attempt + 1}] Brand status: ${status}`);

    if (['VERIFIED', 'VETTED_VERIFIED'].includes(status)) {
      console.log('✅ Brand verified!');
      return brand;
    }
    if (status === 'REGISTRATION_FAILED') {
      console.log(`❌ Failed: ${brand.failureReasons}`);
      return null;
    }
    await new Promise(r => setTimeout(r, pollIntervalMs));
  }
  console.log('⏰ Timed out');
  return null;
}
```

### Ruby

```ruby
require 'net/http'
require 'json'

def wait_for_brand_verification(brand_id, poll_interval: 3600, max_days: 10)
  headers = { 'Authorization' => "Bearer #{ENV['TELNYX_API_KEY']}" }
  max_attempts = (max_days * 24 * 3600) / poll_interval

  max_attempts.to_i.times do |attempt|
    uri = URI("https://api.telnyx.com/v2/10dlc/brand/#{brand_id}")
    response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) { |http| http.get(uri, headers) }
    brand = JSON.parse(response.body)
    status = brand['identityStatus'] || 'UNKNOWN'
    puts "[Attempt #{attempt + 1}] Brand status: #{status}"

    return brand if %w[VERIFIED VETTED_VERIFIED].include?(status)
    if status == 'REGISTRATION_FAILED'
      puts "❌ Failed: #{brand['failureReasons']}"
      return nil
    end
    sleep(poll_interval)
  end
  puts '⏰ Timed out'
  nil
end
```

### PHP

```php
function waitForBrandVerification(string $brandId, int $pollInterval = 3600, int $maxDays = 10): ?array {
    $headers = ['Authorization: Bearer ' . getenv('TELNYX_API_KEY')];
    $maxAttempts = ($maxDays * 24 * 3600) / $pollInterval;

    for ($i = 0; $i < $maxAttempts; $i++) {
        $ch = curl_init("https://api.telnyx.com/v2/10dlc/brand/$brandId");
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => $headers]);
        $brand = json_decode(curl_exec($ch), true);
        curl_close($ch);
        $status = $brand['identityStatus'] ?? 'UNKNOWN';
        echo "[Attempt " . ($i + 1) . "] Brand status: $status\n";

        if (in_array($status, ['VERIFIED', 'VETTED_VERIFIED'])) {
            echo "✅ Brand verified!\n";
            return $brand;
        }
        if ($status === 'REGISTRATION_FAILED') {
            echo "❌ Failed: " . ($brand['failureReasons'] ?? '') . "\n";
            return null;
        }
        sleep($pollInterval);
    }
    echo "⏰ Timed out\n";
    return null;
}
```

### Java

```java
import java.net.http.*;
import java.net.URI;
import com.google.gson.*;

String apiKey = System.getenv("TELNYX_API_KEY");
HttpClient httpClient = HttpClient.newHttpClient();

JsonObject waitForBrand(String brandId, int pollSecs, int maxDays) throws Exception {
    int maxAttempts = (maxDays * 24 * 3600) / pollSecs;
    for (int i = 0; i < maxAttempts; i++) {
        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create("https://api.telnyx.com/v2/10dlc/brand/" + brandId))
            .header("Authorization", "Bearer " + apiKey).GET().build();
        String body = httpClient.send(req, HttpResponse.BodyHandlers.ofString()).body();
        JsonObject brand = JsonParser.parseString(body).getAsJsonObject();
        String status = brand.has("identityStatus") ? brand.get("identityStatus").getAsString() : "UNKNOWN";
        System.out.printf("[Attempt %d] Brand status: %s%n", i + 1, status);

        if ("VERIFIED".equals(status) || "VETTED_VERIFIED".equals(status)) {
            System.out.println("✅ Brand verified!");
            return brand;
        }
        if ("REGISTRATION_FAILED".equals(status)) return null;
        Thread.sleep(pollSecs * 1000L);
    }
    return null;
}
```

### Go

```go
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

func waitForBrand(brandID string, pollInterval time.Duration, maxDays int) map[string]interface{} {
	maxAttempts := int(time.Duration(maxDays) * 24 * time.Hour / pollInterval)
	for i := 0; i < maxAttempts; i++ {
		req, _ := http.NewRequest("GET",
			"https://api.telnyx.com/v2/10dlc/brand/"+brandID, nil)
		req.Header.Set("Authorization", "Bearer "+os.Getenv("TELNYX_API_KEY"))
		resp, err := http.DefaultClient.Do(req)
		if err != nil { time.Sleep(pollInterval); continue }
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		var brand map[string]interface{}
		json.Unmarshal(body, &brand)
		status, _ := brand["identityStatus"].(string)
		fmt.Printf("[Attempt %d] Brand status: %s\n", i+1, status)

		if status == "VERIFIED" || status == "VETTED_VERIFIED" {
			fmt.Println("✅ Brand verified!")
			return brand
		}
		if status == "REGISTRATION_FAILED" { return nil }
		time.Sleep(pollInterval)
	}
	fmt.Println("⏰ Timed out")
	return nil
}
```

---

## Link Click Tracking

### Telnyx Built-In URL Shortener

Telnyx offers URL shortening directly in Messaging Profiles. When enabled, links in messages are automatically shortened and clicks are tracked via webhooks.

> **⚠️ Important distinction:** Telnyx's built-in URL shortener uses your messaging profile's tracking domain — this is NOT the same as using generic shorteners (bit.ly, tinyurl) which carriers actively block. However, test delivery rates with shortening enabled vs disabled, as some carriers still filter aggressively.

### Custom URL Tracking (Recommended for Marketing)

For full control over analytics, implement your own redirect service with a branded domain:

#### Python

```python
import hashlib
import time

def create_tracked_url(campaign_id: str, recipient_id: str, destination: str, base_domain: str = "links.yourbrand.com") -> str:
    """Generate a unique tracked URL for click-through measurement."""
    token = hashlib.sha256(f"{campaign_id}:{recipient_id}:{time.time()}".encode()).hexdigest()[:12]
    # Store mapping in your database: token → (campaign_id, recipient_id, destination, created_at)
    db.store_click_tracking(token, campaign_id, recipient_id, destination)
    return f"https://{base_domain}/{token}"

# Usage in campaign message
tracked_url = create_tracked_url("camp_spring2026", "recip_12345", "https://acme.com/sale")
message = f"Acme Spring Sale! 30% off everything today: {tracked_url}. Reply STOP to opt out."
```

#### Node.js

```javascript
import crypto from 'crypto';

function createTrackedUrl(campaignId, recipientId, destination, baseDomain = 'links.yourbrand.com') {
  const token = crypto.createHash('sha256')
    .update(`${campaignId}:${recipientId}:${Date.now()}`)
    .digest('hex')
    .slice(0, 12);
  // Store in DB: token → { campaignId, recipientId, destination, createdAt }
  db.storeClickTracking(token, campaignId, recipientId, destination);
  return `https://${baseDomain}/${token}`;
}

// Usage
const url = createTrackedUrl('camp_spring2026', 'recip_12345', 'https://acme.com/sale');
const message = `Acme Spring Sale! 30% off everything today: ${url}. Reply STOP to opt out.`;
```

#### Ruby

```ruby
require 'digest'

def create_tracked_url(campaign_id, recipient_id, destination, base_domain: 'links.yourbrand.com')
  token = Digest::SHA256.hexdigest("#{campaign_id}:#{recipient_id}:#{Time.now.to_f}")[0, 12]
  # Store mapping in DB: token → { campaign_id, recipient_id, destination }
  db.store_click_tracking(token, campaign_id, recipient_id, destination)
  "https://#{base_domain}/#{token}"
end

url = create_tracked_url('camp_spring2026', 'recip_12345', 'https://acme.com/sale')
message = "Acme Spring Sale! 30% off everything today: #{url}. Reply STOP to opt out."
```

#### PHP

```php
function createTrackedUrl(string $campaignId, string $recipientId, string $dest, string $domain = 'links.yourbrand.com'): string {
    $token = substr(hash('sha256', "$campaignId:$recipientId:" . microtime(true)), 0, 12);
    // Store in DB: $token → [$campaignId, $recipientId, $dest]
    $db->storeClickTracking($token, $campaignId, $recipientId, $dest);
    return "https://$domain/$token";
}

$url = createTrackedUrl('camp_spring2026', 'recip_12345', 'https://acme.com/sale');
$message = "Acme Spring Sale! 30% off everything today: $url. Reply STOP to opt out.";
```

#### Java

```java
import java.security.MessageDigest;
import java.time.Instant;

public static String createTrackedUrl(String campaignId, String recipientId, String destination) throws Exception {
    String input = campaignId + ":" + recipientId + ":" + Instant.now().toEpochMilli();
    byte[] hash = MessageDigest.getInstance("SHA-256").digest(input.getBytes());
    StringBuilder hex = new StringBuilder();
    for (byte b : hash) hex.append(String.format("%02x", b));
    String token = hex.substring(0, 12);
    // Store in DB: token → { campaignId, recipientId, destination }
    db.storeClickTracking(token, campaignId, recipientId, destination);
    return "https://links.yourbrand.com/" + token;
}

String url = createTrackedUrl("camp_spring2026", "recip_12345", "https://acme.com/sale");
String message = "Acme Spring Sale! 30% off today: " + url + ". Reply STOP to opt out.";
```

#### Go

```go
package main

import (
	"crypto/sha256"
	"fmt"
	"time"
)

func createTrackedURL(campaignID, recipientID, destination string) string {
	input := fmt.Sprintf("%s:%s:%d", campaignID, recipientID, time.Now().UnixNano())
	hash := sha256.Sum256([]byte(input))
	token := fmt.Sprintf("%x", hash[:6]) // 12 hex chars
	// Store in DB: token → {campaignID, recipientID, destination}
	db.StoreClickTracking(token, campaignID, recipientID, destination)
	return fmt.Sprintf("https://links.yourbrand.com/%s", token)
}

// Usage
url := createTrackedURL("camp_spring2026", "recip_12345", "https://acme.com/sale")
message := fmt.Sprintf("Acme Spring Sale! 30%% off today: %s. Reply STOP to opt out.", url)
```

---

## A/B Testing Campaign Variants

Split your recipient list across message variants to optimize engagement. Use deterministic assignment so the same recipient always gets the same variant.

### Python

```python
import hashlib

VARIANTS = {
    'A': {
        'text': '🔥 Acme Flash Sale! 30% off everything today. Shop: {url}. Reply STOP to opt out.',
        'weight': 50,
    },
    'B': {
        'text': 'Hi {name}, enjoy 30% off your next Acme order. Use code SAVE30: {url}. Reply STOP to opt out.',
        'weight': 50,
    },
}

def select_variant(recipient_id: str) -> str:
    """Deterministic variant assignment — same recipient always gets same variant."""
    hash_val = int(hashlib.md5(recipient_id.encode()).hexdigest(), 16) % 100
    cumulative = 0
    for variant_id, variant in VARIANTS.items():
        cumulative += variant['weight']
        if hash_val < cumulative:
            return variant_id
    return list(VARIANTS.keys())[-1]

def send_ab_campaign(recipients, campaign_id, from_number):
    """Send campaign with A/B variant tracking."""
    stats = {v: {'sent': 0, 'delivered': 0, 'failed': 0, 'optout': 0} for v in VARIANTS}

    for recipient in recipients:
        variant = select_variant(recipient['id'])
        text = VARIANTS[variant]['text'].format(
            name=recipient.get('name', 'there'),
            url=create_tracked_url(campaign_id, recipient['id'], 'https://acme.com/sale')
        )
        # Send message, track variant in DB for later analysis
        # Compare per-variant: delivery rate, CTR, opt-out rate
```

### Node.js

```javascript
import crypto from 'crypto';

const VARIANTS = {
  A: {
    text: '🔥 Acme Flash Sale! 30% off everything today. Shop: {url}. Reply STOP to opt out.',
    weight: 50,
  },
  B: {
    text: 'Hi {name}, enjoy 30% off your next Acme order. Use code SAVE30: {url}. Reply STOP to opt out.',
    weight: 50,
  },
};

function selectVariant(recipientId) {
  const hash = crypto.createHash('md5').update(recipientId).digest('hex');
  const val = parseInt(hash.slice(0, 8), 16) % 100;
  let cumulative = 0;
  for (const [id, variant] of Object.entries(VARIANTS)) {
    cumulative += variant.weight;
    if (val < cumulative) return id;
  }
  return Object.keys(VARIANTS).at(-1);
}
```

**Key metrics to compare per variant:**
- Delivery rate (delivered / sent)
- Click-through rate (clicks / delivered) — requires tracked URLs
- Opt-out rate (STOP / delivered) — flag if >2%
- Conversion rate (purchases / clicks) — requires backend integration

### Ruby

```ruby
require 'digest'

VARIANTS = {
  'A' => { text: '🔥 Acme Flash Sale! 30% off everything today. Shop: %{url}. Reply STOP to opt out.', weight: 50 },
  'B' => { text: 'Hi %{name}, enjoy 30% off your next Acme order. Use code SAVE30: %{url}. Reply STOP to opt out.', weight: 50 },
}

def select_variant(recipient_id)
  hash_val = Digest::MD5.hexdigest(recipient_id).to_i(16) % 100
  cumulative = 0
  VARIANTS.each do |id, v|
    cumulative += v[:weight]
    return id if hash_val < cumulative
  end
  VARIANTS.keys.last
end

# Usage: variant = select_variant(recipient_id)
# text = VARIANTS[variant][:text] % { name: name, url: tracked_url }
```

### PHP

```php
$variants = [
    'A' => ['text' => '🔥 Acme Flash Sale! 30%% off today. Shop: %s. Reply STOP to opt out.', 'weight' => 50],
    'B' => ['text' => 'Hi %s, enjoy 30%% off your next Acme order. Code SAVE30: %s. Reply STOP to opt out.', 'weight' => 50],
];

function selectVariant(string $recipientId, array $variants): string {
    $hashVal = hexdec(substr(md5($recipientId), 0, 8)) % 100;
    $cumulative = 0;
    foreach ($variants as $id => $v) {
        $cumulative += $v['weight'];
        if ($hashVal < $cumulative) return $id;
    }
    return array_key_last($variants);
}

// Usage: $variant = selectVariant($recipientId, $variants);
```

### Java

```java
import java.security.MessageDigest;
import java.util.*;

// Use a LinkedHashMap (or List) to guarantee stable iteration order.
// Map.of / HashMap do not guarantee entrySet() order, which would make
// cumulative-weight selection non-deterministic across JVM runs.
LinkedHashMap<String, Map<String, Object>> variants = new LinkedHashMap<>();
variants.put("A", Map.of("text", "🔥 Acme Flash Sale! 30%% off today. Shop: %s. Reply STOP to opt out.", "weight", 50));
variants.put("B", Map.of("text", "Hi %s, enjoy 30%% off. Code SAVE30: %s. Reply STOP to opt out.", "weight", 50));

String selectVariant(String recipientId) throws Exception {
    byte[] hash = MessageDigest.getInstance("MD5").digest(recipientId.getBytes());
    int val = (java.nio.ByteBuffer.wrap(hash, 0, 4).getInt() & 0x7FFFFFFF) % 100;
    int cumulative = 0;
    for (var entry : variants.entrySet()) {
        cumulative += (int) entry.getValue().get("weight");
        if (val < cumulative) return entry.getKey();
    }
    return variants.lastEntry().getKey();
}
```

### Go

```go
package main

import (
	"crypto/md5"
	"encoding/binary"
)

type Variant struct {
	ID     string
	Text   string
	Weight int
}

// Use an ordered slice — ranging over a map does not guarantee iteration
// order, which would make cumulative-weight selection non-deterministic.
var variants = []Variant{
	{ID: "A", Text: "🔥 Acme Flash Sale! 30%% off today. Shop: %s. Reply STOP to opt out.", Weight: 50},
	{ID: "B", Text: "Hi %s, enjoy 30%% off. Code SAVE30: %s. Reply STOP to opt out.", Weight: 50},
}

func selectVariant(recipientID string) string {
	hash := md5.Sum([]byte(recipientID))
	val := int(binary.BigEndian.Uint32(hash[:4])>>1) % 100 // unsigned shift avoids negative
	cumulative := 0
	for _, v := range variants {
		cumulative += v.Weight
		if val < cumulative {
			return v.ID
		}
	}
	return variants[len(variants)-1].ID
}
```

---

## Message Detail Record (MDR) Lookup

For batch campaign analysis or debugging individual message delivery, query the Messages API directly:

### curl

```bash
# Get a specific message's delivery status and cost
curl -s "https://api.telnyx.com/v2/messages/$MESSAGE_ID" \
  -H "Authorization: Bearer $TELNYX_API_KEY" | jq '{
    id: .data.id,
    to: .data.to[0].phone_number,
    status: .data.to[0].status,
    cost: .data.cost,
    parts: .data.parts,
    encoding: .data.encoding,
    errors: .data.errors
  }'
```

### Python

```python
import requests
import os

headers = {"Authorization": f"Bearer {os.environ['TELNYX_API_KEY']}"}

def get_message_status(message_id: str) -> dict:
    """Retrieve delivery status and cost for a single message."""
    response = requests.get(
        f"https://api.telnyx.com/v2/messages/{message_id}",
        headers=headers
    )
    data = response.json().get("data", {})
    return {
        "id": data.get("id"),
        "to": data.get("to", [{}])[0].get("phone_number"),
        "status": data.get("to", [{}])[0].get("status"),
        "cost": data.get("cost"),
        "parts": data.get("parts"),
        "errors": data.get("errors", []),
    }

# Usage: audit a batch of messages from your campaign log
message_ids = ["msg-uuid-1", "msg-uuid-2", "msg-uuid-3"]
for mid in message_ids:
    result = get_message_status(mid)
    print(f"  {result['to']}: {result['status']} (${result['cost'].get('amount', '?')})")
```

### Node.js

```javascript
const headers = { 'Authorization': `Bearer ${process.env.TELNYX_API_KEY}` };

async function getMessageStatus(messageId) {
  const resp = await fetch(`https://api.telnyx.com/v2/messages/${messageId}`, { headers });
  const { data } = await resp.json();
  return {
    id: data.id,
    to: data.to?.[0]?.phone_number,
    status: data.to?.[0]?.status,
    cost: data.cost,
    parts: data.parts,
    errors: data.errors || [],
  };
}

// Usage
const ids = ['msg-uuid-1', 'msg-uuid-2'];
for (const id of ids) {
  const r = await getMessageStatus(id);
  console.log(`  ${r.to}: ${r.status} ($${r.cost?.amount || '?'})`);
}
```

### Ruby

```ruby
require 'net/http'
require 'json'

def get_message_status(message_id)
  uri = URI("https://api.telnyx.com/v2/messages/#{message_id}")
  headers = { 'Authorization' => "Bearer #{ENV['TELNYX_API_KEY']}" }
  response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) { |http| http.get(uri, headers) }
  data = JSON.parse(response.body)['data'] || {}
  {
    id: data['id'], to: data.dig('to', 0, 'phone_number'),
    status: data.dig('to', 0, 'status'), cost: data['cost'],
    parts: data['parts'], errors: data['errors'] || []
  }
end

# Usage
%w[msg-uuid-1 msg-uuid-2].each do |mid|
  r = get_message_status(mid)
  puts "  #{r[:to]}: #{r[:status]} ($#{r.dig(:cost, 'amount') || '?'})"
end
```

### PHP

```php
function getMessageStatus(string $messageId): array {
    $ch = curl_init("https://api.telnyx.com/v2/messages/$messageId");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . getenv('TELNYX_API_KEY')],
    ]);
    $data = json_decode(curl_exec($ch), true)['data'] ?? [];
    curl_close($ch);
    return [
        'id' => $data['id'] ?? null, 'to' => $data['to'][0]['phone_number'] ?? null,
        'status' => $data['to'][0]['status'] ?? null, 'cost' => $data['cost'] ?? null,
        'parts' => $data['parts'] ?? null, 'errors' => $data['errors'] ?? [],
    ];
}

// Usage
foreach (['msg-uuid-1', 'msg-uuid-2'] as $mid) {
    $r = getMessageStatus($mid);
    echo "  {$r['to']}: {$r['status']} (\${$r['cost']['amount']})\n";
}
```

### Java

```java
import java.net.http.*;
import java.net.URI;
import com.google.gson.*;

HttpClient httpClient = HttpClient.newHttpClient();
String apiKey = System.getenv("TELNYX_API_KEY");

JsonObject getMessageStatus(String messageId) throws Exception {
    HttpRequest req = HttpRequest.newBuilder()
        .uri(URI.create("https://api.telnyx.com/v2/messages/" + messageId))
        .header("Authorization", "Bearer " + apiKey).GET().build();
    String body = httpClient.send(req, HttpResponse.BodyHandlers.ofString()).body();
    return JsonParser.parseString(body).getAsJsonObject().getAsJsonObject("data");
}

// Usage
for (String mid : List.of("msg-uuid-1", "msg-uuid-2")) {
    JsonObject data = getMessageStatus(mid);
    String to = data.getAsJsonArray("to").get(0).getAsJsonObject().get("phone_number").getAsString();
    String status = data.getAsJsonArray("to").get(0).getAsJsonObject().get("status").getAsString();
    String cost = data.getAsJsonObject("cost").get("amount").getAsString();
    System.out.printf("  %s: %s ($%s)%n", to, status, cost);
}
```

### Go

```go
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

func getMessageStatus(messageID string) map[string]interface{} {
	req, _ := http.NewRequest("GET", "https://api.telnyx.com/v2/messages/"+messageID, nil)
	req.Header.Set("Authorization", "Bearer "+os.Getenv("TELNYX_API_KEY"))
	resp, err := http.DefaultClient.Do(req)
	if err != nil { return nil }
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(body, &result)
	data, _ := result["data"].(map[string]interface{})
	return data
}

func main() {
	for _, mid := range []string{"msg-uuid-1", "msg-uuid-2"} {
		data := getMessageStatus(mid)
		to := data["to"].([]interface{})[0].(map[string]interface{})
		cost := data["cost"].(map[string]interface{})
		fmt.Printf("  %s: %s ($%s)\n", to["phone_number"], to["status"], cost["amount"])
	}
}
```

Use this for post-campaign auditing when webhook data is incomplete or for spot-checking delivery of specific messages.
