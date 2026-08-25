# Code Examples — First Outbound Call

## SDK Examples

### Python

```python
import os
from telnyx import Telnyx

client = Telnyx(api_key=os.environ["TELNYX_API_KEY"])

# Make an outbound call
response = client.calls.dial(
    connection_id=os.environ["CALL_CONTROL_APP_ID"],
    to="+1XXXXXXXXXX",       # Destination phone number
    from_=os.environ["MY_NUMBER"],  # Your Telnyx number
)

call = response.data

print(f"Call initiated!")
print(f"  Call Control ID: {call.call_control_id}")
print(f"  Call Session ID: {call.call_session_id}")
print(f"  Is Alive: {call.is_alive}")
```

**Install the SDK:**
```bash
pip install telnyx
```

### Node.js

```javascript
const Telnyx = require('telnyx');
const client = new Telnyx(process.env.TELNYX_API_KEY);

async function makeCall() {
  try {
    const response = await client.calls.dial({
      connection_id: process.env.CALL_CONTROL_APP_ID,
      to: '+1XXXXXXXXXX',         // Destination phone number
      from: process.env.MY_NUMBER, // Your Telnyx number
    });

    const call = response.data;

    console.log('Call initiated!');
    console.log(`  Call Control ID: ${call.call_control_id}`);
    console.log(`  Call Session ID: ${call.call_session_id}`);
    console.log(`  Is Alive: ${call.is_alive}`);
  } catch (error) {
    console.error('Call failed:', error.message);

    // Common errors and what they mean
    if (error.raw?.errors?.[0]?.code === '40003') {
      console.error('→ Connection ID is invalid. Check your CALL_CONTROL_APP_ID.');
    } else if (error.raw?.errors?.[0]?.code === '40001') {
      console.error('→ Authentication failed. Check your TELNYX_API_KEY.');
    }
  }
}

makeCall();
```

**Install the SDK:**
```bash
npm install telnyx
```

### Ruby

```ruby
require 'telnyx'

client = Telnyx::Client.new(api_key: ENV['TELNYX_API_KEY'])

response = client.calls.dial(
  connection_id: ENV['CALL_CONTROL_APP_ID'],
  to: '+1XXXXXXXXXX',
  from: ENV['MY_NUMBER']
)

call = response

puts "Call initiated!"
puts "  Call Control ID: #{call.call_control_id}"
puts "  Call Session ID: #{call.call_session_id}"
puts "  Is Alive: #{call.is_alive}"
```

**Install the SDK:**
```bash
gem install telnyx
```

### PHP

```php
<?php
require 'vendor/autoload.php';

$client = new \Telnyx\Client(getenv('TELNYX_API_KEY'));

$response = $client->calls->dial([
  'connection_id' => getenv('CALL_CONTROL_APP_ID'),
  'to' => '+1XXXXXXXXXX',
  'from' => getenv('MY_NUMBER'),
]);

$call = $response;

echo "Call initiated!\n";
echo "  Call Control ID: " . $call->call_control_id . "\n";
```

**Install the SDK:**
```bash
composer require telnyx/telnyx-php
```

### Java

```java
import com.telnyx.sdk.ApiClient;
import com.telnyx.sdk.api.CallsApi;
import com.telnyx.sdk.model.CallDialRequest;
import com.telnyx.sdk.model.CallDialResponse;

ApiClient client = new ApiClient();
client.setApiKey(System.getenv("TELNYX_API_KEY"));

CallsApi callsApi = new CallsApi(client);

CallDialRequest request = new CallDialRequest()
    .connectionId(System.getenv("CALL_CONTROL_APP_ID"))
    .to("+1XXXXXXXXXX")
    .from(System.getenv("MY_NUMBER"));

CallDialResponse response = callsApi.dial(request);
System.out.println("Call initiated!");
System.out.println("  Call Control ID: " + response.getCallControlId());
```

### Go

```go
package main

import (
    "context"
    "fmt"
    "os"

    "github.com/team-telnyx/telnyx-go"
)

func main() {
    client := telnyx.NewClient(os.Getenv("TELNYX_API_KEY"))

    response, err := client.Calls.Dial(context.Background(), telnyx.CallDialParams{
        ConnectionID: os.Getenv("CALL_CONTROL_APP_ID"),
        From:         os.Getenv("MY_NUMBER"),
        To: telnyx.CallDialParamsToUnion{
            OfString: telnyx.String("+1XXXXXXXXXX"),
        },
    })
    if err != nil {
        panic(err)
    }

    fmt.Println("Call initiated!")
    fmt.Printf("  Call Control ID: %s\n", response.CallControlID)
}
```

### Complete curl Example (All Steps)

```bash
#!/bin/bash
set -euo pipefail

# ============================================
# CONFIG — Replace these values
# ============================================
export TELNYX_API_KEY="KEY_YOUR_API_KEY_HERE"
export TO_NUMBER="+1XXXXXXXXXX"   # Phone number you want to call

# ============================================
# Step 1: Create Call Control Application
# ============================================
echo "=== Step 1: Creating Call Control Application ==="
APP_RESPONSE=$(curl -s -X POST https://api.telnyx.com/v2/call_control_applications \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"application_name\":\"My First Call Control App\",\"webhook_event_url\":\"${WEBHOOK_URL:?Set WEBHOOK_URL to your public webhook endpoint}\",\"webhook_api_version\":\"2\",\"active\":true}")
export APP_ID=$(echo "$APP_RESPONSE" | jq -r '.data.id')
echo "Call Control App ID: $APP_ID"

# ============================================
# Step 2: Create outbound voice profile + link to app
# ============================================
echo "=== Step 2: Creating outbound voice profile ==="
OVP_RESPONSE=$(curl -s -X POST https://api.telnyx.com/v2/outbound_voice_profiles \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Outbound Profile",
    "traffic_type": "conversational",
    "service_plan": "global",
    "concurrent_call_limit": 10,
    "enabled": true,
    "whitelisted_destinations": ["US", "CA"]
  }')
export OVP_ID=$(echo "$OVP_RESPONSE" | jq -r '.data.id')
echo "OVP ID: $OVP_ID"

curl -s -X PATCH "https://api.telnyx.com/v2/call_control_applications/$APP_ID" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"outbound\": {\"outbound_voice_profile_id\": \"$OVP_ID\"}}" | jq .

# ============================================
# Step 3: Buy a phone number
# ============================================
echo "=== Step 3: Searching for a phone number ==="
AVAILABLE=$(curl -s -G "https://api.telnyx.com/v2/available_phone_numbers" \
  --data-urlencode "filter[country_code]=US" \
  --data-urlencode "filter[features][]=voice" \
  --data-urlencode "filter[phone_number_type]=local" \
  --data-urlencode "filter[limit]=1" \
  -H "Authorization: Bearer $TELNYX_API_KEY")
export MY_NUMBER=$(echo "$AVAILABLE" | jq -r '.data[0].phone_number')
echo "Purchasing: $MY_NUMBER"

curl -s -X POST https://api.telnyx.com/v2/number_orders \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"phone_numbers\": [{\"phone_number\": \"$MY_NUMBER\"}]}" | jq .

sleep 3

# ============================================
# Step 4: Assign number to app
# ============================================
echo "=== Step 4: Assigning number to app ==="
export PHONE_NUMBER_ID=$(curl -s -G "https://api.telnyx.com/v2/phone_numbers" \
  --data-urlencode "filter[phone_number]=$MY_NUMBER" \
  -H "Authorization: Bearer $TELNYX_API_KEY" | jq -r '.data[0].id')

curl -s -X PATCH "https://api.telnyx.com/v2/phone_numbers/$PHONE_NUMBER_ID/voice" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"connection_id\": \"$APP_ID\"}" | jq .

# ============================================
# Step 5: Make the call!
# ============================================
echo "=== Step 5: Making the call ==="
curl -s -X POST https://api.telnyx.com/v2/calls \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"connection_id\": \"$APP_ID\",
    \"to\": \"$TO_NUMBER\",
    \"from\": \"$MY_NUMBER\",
    \"from_display_name\": \"Telnyx Test\"
  }" | jq .

echo "=== Done! Check your phone ==="
```

## Webhook Handler Examples

### Node.js (Express)

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/webhooks/telnyx', async (req, res) => {
  const { event_type, payload } = req.body.data;
  const callControlId = payload?.call_control_id;
  res.sendStatus(200);

  if (!callControlId) return;

  if (event_type === 'call.answered') {
    // Speak a message then hang up
    await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/speak`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: 'Hello from Telnyx! Your first call is working.', voice: 'female', language: 'en-US' })
    });
  }

  if (event_type === 'call.speak.ended') {
    await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/hangup`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`, 'Content-Type': 'application/json' }
    });
  }
});

app.listen(3000, () => console.log('Webhook server running on port 3000'));
```

### Python (Flask)

```python
from flask import Flask, request, jsonify
import os
import requests

app = Flask(__name__)
TELNYX_API_KEY = os.environ['TELNYX_API_KEY']

@app.route('/webhooks/telnyx', methods=['POST'])
def webhook():
    data = request.json.get('data', {})
    event_type = data.get('event_type')
    payload = data.get('payload', {})
    call_control_id = payload.get('call_control_id')

    if not call_control_id:
        return jsonify({'ok': True})

    if event_type == 'call.answered':
        requests.post(
            f'https://api.telnyx.com/v2/calls/{call_control_id}/actions/speak',
            headers={'Authorization': f'Bearer {TELNYX_API_KEY}', 'Content-Type': 'application/json'},
            json={'payload': 'Hello from Telnyx! Your first call is working.', 'voice': 'female', 'language': 'en-US'}
        )

    if event_type == 'call.speak.ended':
        requests.post(
            f'https://api.telnyx.com/v2/calls/{call_control_id}/actions/hangup',
            headers={'Authorization': f'Bearer {TELNYX_API_KEY}', 'Content-Type': 'application/json'}
        )

    return jsonify({'ok': True})

if __name__ == '__main__':
    app.run(port=3000)
```

### Python (FastAPI)

```python
from fastapi import FastAPI, Request
import os
import httpx

app = FastAPI()
TELNYX_API_KEY = os.environ['TELNYX_API_KEY']

@app.post('/webhooks/telnyx')
async def webhook(request: Request):
    body = await request.json()
    data = body.get('data', {})
    event_type = data.get('event_type')
    payload = data.get('payload', {})
    call_control_id = payload.get('call_control_id')

    if not call_control_id:
        return {'ok': True}

    if event_type == 'call.answered':
        async with httpx.AsyncClient() as client:
            await client.post(
                f'https://api.telnyx.com/v2/calls/{call_control_id}/actions/speak',
                headers={'Authorization': f'Bearer {TELNYX_API_KEY}', 'Content-Type': 'application/json'},
                json={'payload': 'Hello from Telnyx! Your first call is working.', 'voice': 'female', 'language': 'en-US'}
            )

    if event_type == 'call.speak.ended':
        async with httpx.AsyncClient() as client:
            await client.post(
                f'https://api.telnyx.com/v2/calls/{call_control_id}/actions/hangup',
                headers={'Authorization': f'Bearer {TELNYX_API_KEY}', 'Content-Type': 'application/json'}
            )

    return {'ok': True}
```

## E2E Smoke Test

```bash
#!/bin/bash
# Quick end-to-end test: create app → create OVP → link → buy number → assign → call
set -euo pipefail

export TELNYX_API_KEY="${TELNYX_API_KEY:?TELNYX_API_KEY not set}"
TO_NUMBER="${1:?Usage: $0 <to_number>}"

echo "1/5 Creating Call Control Application..."
APP_ID=$(curl -sf -X POST https://api.telnyx.com/v2/call_control_applications \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"application_name\":\"E2E Test\",\"webhook_event_url\":\"${WEBHOOK_URL:?Set WEBHOOK_URL}\",\"webhook_api_version\":\"2\",\"active\":true}" \
  | jq -r '.data.id')

echo "2/5 Creating OVP..."
OVP_ID=$(curl -sf -X POST https://api.telnyx.com/v2/outbound_voice_profiles \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"E2E Test","traffic_type":"conversational","service_plan":"global","enabled":true,"whitelisted_destinations":["US","CA"]}' \
  | jq -r '.data.id')

curl -sf -X PATCH "https://api.telnyx.com/v2/call_control_applications/$APP_ID" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"outbound\":{\"outbound_voice_profile_id\":\"$OVP_ID\"}}" > /dev/null

echo "3/5 Buying number..."
MY_NUMBER=$(curl -sf -G "https://api.telnyx.com/v2/available_phone_numbers" \
  --data-urlencode "filter[country_code]=US" --data-urlencode "filter[features][]=voice" --data-urlencode "filter[limit]=1" \
  -H "Authorization: Bearer $TELNYX_API_KEY" | jq -r '.data[0].phone_number')
curl -sf -X POST https://api.telnyx.com/v2/number_orders \
  -H "Authorization: Bearer $TELNYX_API_KEY" -H "Content-Type: application/json" \
  -d "{\"phone_numbers\":[{\"phone_number\":\"$MY_NUMBER\"}]}" > /dev/null
sleep 3

echo "4/5 Assigning number..."
PHONE_NUMBER_ID=$(curl -sf -G "https://api.telnyx.com/v2/phone_numbers" \
  --data-urlencode "filter[phone_number]=$MY_NUMBER" \
  -H "Authorization: Bearer $TELNYX_API_KEY" | jq -r '.data[0].id')
curl -sf -X PATCH "https://api.telnyx.com/v2/phone_numbers/$PHONE_NUMBER_ID/voice" \
  -H "Authorization: Bearer $TELNYX_API_KEY" -H "Content-Type: application/json" \
  -d "{\"connection_id\":\"$APP_ID\"}" > /dev/null

echo "5/5 Making call to $TO_NUMBER..."
CALL=$(curl -sf -X POST https://api.telnyx.com/v2/calls \
  -H "Authorization: Bearer $TELNYX_API_KEY" -H "Content-Type: application/json" \
  -d "{\"connection_id\":\"$APP_ID\",\"to\":\"$TO_NUMBER\",\"from\":\"$MY_NUMBER\",\"from_display_name\":\"E2E Test\"}")
CALL_ID=$(echo "$CALL" | jq -r '.data.call_control_id')
echo "✅ Call initiated: $CALL_ID"
echo "   From: $MY_NUMBER → To: $TO_NUMBER"
```
