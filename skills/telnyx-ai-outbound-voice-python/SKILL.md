---
name: telnyx-ai-outbound-voice-python
description: >-
  End-to-end setup for making a Telnyx AI assistant call a phone number.
  Covers provisioning a phone number, creating a TeXML application, assigning
  the number, configuring telephony settings, whitelisting destination
  countries, and triggering outbound calls via scheduled events. Use this
  skill (not telnyx-ai-assistants-python) when the task involves an AI
  assistant placing, making, or triggering an outbound phone call to a user.
metadata:
  author: telnyx
  product: ai-assistants
  language: python
---

# Telnyx AI Outbound Voice Calls - Python

Make an AI assistant call any phone number. This skill covers the complete
setup from purchasing a number to triggering the call.

## Installation

```bash
pip install telnyx requests
```

## Setup

```python
import os
from telnyx import Telnyx

client = Telnyx(api_key=os.environ.get("TELNYX_API_KEY"))
```

## Prerequisites

Outbound voice calls require **all** of the following. Missing any one produces
a specific error — see [Troubleshooting](#troubleshooting).

1. A purchased Telnyx phone number
2. A TeXML application
3. The phone number assigned to the TeXML application
4. An outbound voice profile with destination countries whitelisted
5. An AI assistant with `telephony_settings.default_texml_app_id` set to the TeXML app

## Model availability

Model availability varies by account. If `client.ai.assistants.create()` returns
422 "not available for inference", discover working models from existing assistants:

```python
for a in client.ai.assistants.list().data:
    print(a.model)
```

Commonly available: `openai/gpt-4o`, `Qwen/Qwen3-235B-A22B`.

## Step 1: Purchase a phone number

```python
import time

available = client.available_phone_numbers.list()
phone = available.data[0].phone_number

number_order = client.number_orders.create(
    phone_numbers=[{"phone_number": phone}],
)
time.sleep(3)

order = client.number_orders.retrieve(number_order.data.id)
assert order.data.status == "success"
print(f"Purchased: {phone}")
```

## Step 2: Create a TeXML application

The `voice_url` is required by the API but is not used for outbound AI assistant calls.
The TeXML app ID is also used as the `connection_id` when assigning phone numbers.

```python
texml_app = client.texml_applications.create(
    friendly_name="My AI Assistant App",
    voice_url="https://example.com/placeholder",
)
app_id = texml_app.data.id  # This is also the connection_id for phone number assignment
```

## Step 3: Assign the phone number to the TeXML application

A phone number cannot make calls until it is assigned to a connection.

```python
import requests

requests.patch(
    f"https://api.telnyx.com/v2/phone_numbers/{phone}",
    headers={
        "Authorization": f"Bearer {os.environ['TELNYX_API_KEY']}",
        "Content-Type": "application/json",
    },
    json={"connection_id": app_id},
)
```

## Step 4: Whitelist destination countries

By default only US and CA are whitelisted. Calling any other country without
whitelisting it first returns 403 error code D13.

```python
import requests

headers = {
    "Authorization": f"Bearer {os.environ['TELNYX_API_KEY']}",
    "Content-Type": "application/json",
}

# Find the outbound voice profile
r = requests.get(
    "https://api.telnyx.com/v2/outbound_voice_profiles", headers=headers
)
ovp_id = r.json()["data"][0]["id"]

# Add destination countries (ISO 3166-1 alpha-2 codes)
requests.patch(
    f"https://api.telnyx.com/v2/outbound_voice_profiles/{ovp_id}",
    headers=headers,
    json={"whitelisted_destinations": ["US", "CA", "IE", "GB"]},
)

# Assign the profile to the TeXML app
requests.patch(
    f"https://api.telnyx.com/v2/texml_applications/{app_id}",
    headers=headers,
    json={
        "friendly_name": "My AI Assistant App",
        "voice_url": "https://example.com/placeholder",
        "outbound": {"outbound_voice_profile_id": ovp_id},
    },
)
```

## Step 5: Create the AI assistant with telephony settings

`telephony_settings` with `default_texml_app_id` is **required** for outbound
calls. Without it, `scheduled_events.create()` returns 400 "Assistant does not
have telephony settings configured".

```python
assistant = client.ai.assistants.create(
    name="My Voice Assistant",
    model="openai/gpt-4o",
    instructions=(
        "You are a helpful phone assistant. "
        "Keep your answers concise and conversational since this is a phone call."
    ),
    greeting="Hello! How can I help you today?",
    telephony_settings={"default_texml_app_id": app_id},
)
```

To add telephony to an existing assistant:

```python
client.ai.assistants.update(
    assistant_id="your-assistant-id",
    telephony_settings={"default_texml_app_id": app_id},
)
```

## Step 6: Trigger an outbound call

Use `scheduled_events.create()` with a time a few seconds in the future for
an immediate call.

```python
from datetime import datetime, timezone, timedelta

event = client.ai.assistants.scheduled_events.create(
    assistant_id=assistant.id,
    telnyx_conversation_channel="phone_call",
    telnyx_end_user_target="+13125550001",  # Number to call (recipient)
    telnyx_agent_target=phone,               # Your Telnyx number (caller ID)
    scheduled_at_fixed_datetime=(
        datetime.now(timezone.utc) + timedelta(seconds=5)
    ).isoformat(),
)
print(f"Status: {event.status}")  # "pending"
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `assistant_id` | string (UUID) | Yes | The AI assistant that handles the call. |
| `telnyx_conversation_channel` | string | Yes | Must be `"phone_call"`. |
| `telnyx_end_user_target` | string (E.164) | Yes | Phone number to call (recipient). |
| `telnyx_agent_target` | string (E.164) | Yes | Your Telnyx number (caller ID). Must be assigned to the TeXML app. |
| `scheduled_at_fixed_datetime` | string (ISO 8601) | Yes | When to place the call. ~5s in the future for immediate. |
| `dynamic_variables` | object | No | Variables to pass to the assistant. |
| `conversation_metadata` | object | No | Metadata to attach to the conversation. |

## Complete minimal example

```python
import os, time
from datetime import datetime, timezone, timedelta
from telnyx import Telnyx
import requests

api_key = os.environ["TELNYX_API_KEY"]
client = Telnyx(api_key=api_key)
headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

# 1. Buy a number
available = client.available_phone_numbers.list()
phone = available.data[0].phone_number
order = client.number_orders.create(phone_numbers=[{"phone_number": phone}])
time.sleep(3)

# 2. Create TeXML app
app = client.texml_applications.create(
    friendly_name="AI Outbound App",
    voice_url="https://example.com/placeholder",
)
app_id = app.data.id

# 3. Assign number
requests.patch(
    f"https://api.telnyx.com/v2/phone_numbers/{phone}",
    headers=headers,
    json={"connection_id": app_id},
)

# 4. Configure outbound profile
ovp = requests.get("https://api.telnyx.com/v2/outbound_voice_profiles", headers=headers).json()["data"][0]
requests.patch(
    f"https://api.telnyx.com/v2/outbound_voice_profiles/{ovp['id']}",
    headers=headers,
    json={"whitelisted_destinations": ["US", "CA"]},
)
requests.patch(
    f"https://api.telnyx.com/v2/texml_applications/{app_id}",
    headers=headers,
    json={
        "friendly_name": "AI Outbound App",
        "voice_url": "https://example.com/placeholder",
        "outbound": {"outbound_voice_profile_id": ovp["id"]},
    },
)

# 5. Create assistant with telephony
assistant = client.ai.assistants.create(
    name="Outbound Bot",
    model="openai/gpt-4o",
    instructions="You are a helpful phone assistant.",
    telephony_settings={"default_texml_app_id": app_id},
)

# 6. Trigger call
client.ai.assistants.scheduled_events.create(
    assistant_id=assistant.id,
    telnyx_conversation_channel="phone_call",
    telnyx_end_user_target="+13125550001",
    telnyx_agent_target=phone,
    scheduled_at_fixed_datetime=(datetime.now(timezone.utc) + timedelta(seconds=5)).isoformat(),
)
```

## Troubleshooting

### 400: "Assistant does not have telephony settings configured"

The assistant is missing:

```python
telephony_settings={"default_texml_app_id": app_id}
```

Fix by updating the assistant with `default_texml_app_id`.

### 400: "Cannot make outbound call with no outbound voice profile"

The TeXML application does not have an outbound voice profile assigned.

Fix Step 4 above: patch the TeXML app with:

```python
"outbound": {"outbound_voice_profile_id": ovp_id}
```

### 403 with `detail.code == "D13"`

The destination country is not whitelisted on the outbound voice profile.

Fix Step 4 above: add the destination country ISO code to `whitelisted_destinations`.

### Call never starts / remains pending

Check:

1. `scheduled_at_fixed_datetime` is in the future and in UTC
2. `telnyx_agent_target` is your purchased Telnyx number
3. `telnyx_end_user_target` is the recipient number
4. The purchased number is assigned to the TeXML app

### 422 "not available for inference"

The selected model is not enabled for your account.

List existing assistants to discover working models:

```python
for a in client.ai.assistants.list().data:
    print(a.model)
```
