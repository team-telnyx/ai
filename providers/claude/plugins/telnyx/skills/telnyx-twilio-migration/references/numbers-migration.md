# Phone Numbers Migration: Twilio to Telnyx

Migrate phone number management from Twilio to Telnyx Number Management API.

## Table of Contents

- [Overview](#overview)
- [Searching Available Numbers](#searching-available-numbers)
- [Purchasing Numbers](#purchasing-numbers)
- [Listing Owned Numbers](#listing-owned-numbers)
- [Configuring Numbers](#configuring-numbers)
- [Releasing Numbers](#releasing-numbers)
- [Concept Mapping](#concept-mapping)

## Overview

Key differences:
- Telnyx uses **Number Orders** for purchasing (async) vs Twilio's immediate `IncomingPhoneNumbers.create()`
- Numbers must be assigned to a **Connection** (voice) or **Messaging Profile** (messaging) before use
- Telnyx is a licensed carrier with direct number inventory in 140+ countries
- No "sub-resource" pattern — configuration is via PATCH on the number itself or via connections

## Searching Available Numbers

```python
# Twilio
numbers = client.available_phone_numbers('US') \
    .local.list(area_code='312', limit=5)

# Telnyx
from telnyx import Telnyx
client = Telnyx(api_key="YOUR_API_KEY")
numbers = client.available_phone_numbers.list(
    filter={"country_code": "US", "national_destination_code": "312", "limit": 5}
)
```

```javascript
// Twilio
const numbers = await client.availablePhoneNumbers('US')
  .local.list({ areaCode: '312', limit: 5 });

// Telnyx
const Telnyx = require('telnyx');
const client = new Telnyx({ apiKey: 'YOUR_API_KEY' });
const numbers = await client.availablePhoneNumbers.list({
  filter: { country_code: 'US', national_destination_code: '312', limit: 5 }
});
```

```bash
# Twilio
curl "https://api.twilio.com/2010-04-01/Accounts/$SID/AvailablePhoneNumbers/US/Local.json?AreaCode=312&PageSize=5" \
  -u "$SID:$AUTH_TOKEN"

# Telnyx
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/available_phone_numbers?filter[country_code]=US&filter[national_destination_code]=312&filter[limit]=5"
```

### Search Parameter Mapping

| Twilio | Telnyx | Notes |
|---|---|---|
| Country code (path) | `filter[country_code]` | ISO 3166-1 alpha-2 |
| `AreaCode` | `filter[national_destination_code]` | Area code / NDC |
| `Contains` | `filter[phone_number][contains]` | Pattern matching |
| `SmsEnabled` | `filter[features]` includes `sms` | Feature filter |
| `VoiceEnabled` | `filter[features]` includes `voice` | Feature filter |
| `InLocality` | `filter[locality]` | City name |
| `InRegion` | `filter[administrative_area]` | State/province |
| `PageSize` | `filter[limit]` | Results per page |

## Purchasing Numbers

Twilio purchases immediately. Telnyx uses a **Number Order** (async, usually completes in seconds).

```python
# Twilio — immediate
number = client.incoming_phone_numbers.create(phone_number='+13125551234')

# Telnyx — order-based
order = client.number_orders.create(
    phone_numbers=[{"phone_number": "+13125551234"}],
    connection_id="YOUR_CONNECTION_ID",  # optional: assign to voice connection
    messaging_profile_id="YOUR_PROFILE_ID"  # optional: assign to messaging
)
# order.id = order ID, check order.status
```

```javascript
// Twilio
const number = await client.incomingPhoneNumbers.create({
  phoneNumber: '+13125551234'
});

// Telnyx
const order = await client.numberOrders.create({
  phone_numbers: [{ phone_number: '+13125551234' }],
  connection_id: 'YOUR_CONNECTION_ID',
  messaging_profile_id: 'YOUR_PROFILE_ID'
});
```

```bash
# Twilio
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/$SID/IncomingPhoneNumbers.json" \
  -u "$SID:$AUTH_TOKEN" -d "PhoneNumber=+13125551234"

# Telnyx
curl -X POST "https://api.telnyx.com/v2/number_orders" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_numbers": [{"phone_number": "+13125551234"}],
    "connection_id": "YOUR_CONNECTION_ID",
    "messaging_profile_id": "YOUR_PROFILE_ID"
  }'
```

## Listing Owned Numbers

```python
# Twilio
numbers = client.incoming_phone_numbers.list()

# Telnyx
numbers = client.phone_numbers.list()
```

```javascript
// Twilio
const numbers = await client.incomingPhoneNumbers.list();

// Telnyx
const numbers = await client.phoneNumbers.list();
```

```bash
# Twilio
curl "https://api.twilio.com/2010-04-01/Accounts/$SID/IncomingPhoneNumbers.json" \
  -u "$SID:$AUTH_TOKEN"

# Telnyx
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/phone_numbers"
```

## Configuring Numbers

On Twilio, you set webhook URLs directly on the number. On Telnyx, you assign numbers to **Connections** (voice) and **Messaging Profiles** (messaging) which hold the webhook configuration.

```python
# Twilio — set webhooks on number
client.incoming_phone_numbers('PN...').update(
    voice_url='https://example.com/voice',
    sms_url='https://example.com/sms'
)

# Telnyx — update number's connection + messaging profile assignment
client.phone_numbers.update(
    "+13125551234",
    connection_id="YOUR_CONNECTION_ID",
    messaging_profile_id="YOUR_PROFILE_ID"
)
# Webhooks are configured on the Connection and Messaging Profile, not on the number
```

```bash
# Twilio
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/$SID/IncomingPhoneNumbers/PN123.json" \
  -u "$SID:$AUTH_TOKEN" \
  -d "VoiceUrl=https://example.com/voice" -d "SmsUrl=https://example.com/sms"

# Telnyx
curl -X PATCH "https://api.telnyx.com/v2/phone_numbers/+13125551234" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"connection_id": "YOUR_CONNECTION_ID", "messaging_profile_id": "YOUR_PROFILE_ID"}'
```

### Configuration Mapping

| Twilio Number Property | Telnyx Equivalent | Notes |
|---|---|---|
| `voice_url` | Set on Connection | Webhook URL on the voice connection |
| `sms_url` | Set on Messaging Profile | Webhook URL on the messaging profile |
| `voice_fallback_url` | Set on Connection | Failover URL |
| `status_callback` | Set on Connection | Call status events |
| `voice_method` | Always POST | Telnyx always uses POST |
| `friendly_name` | `tags` | Labels for organization |
| `trunk_sid` | `connection_id` | SIP trunk / voice connection |

## Releasing Numbers

```python
# Twilio
client.incoming_phone_numbers('PN...').delete()

# Telnyx
client.phone_numbers.delete("+13125551234")
```

```bash
# Twilio
curl -X DELETE "https://api.twilio.com/2010-04-01/Accounts/$SID/IncomingPhoneNumbers/PN123.json" \
  -u "$SID:$AUTH_TOKEN"

# Telnyx
curl -X DELETE "https://api.telnyx.com/v2/phone_numbers/+13125551234" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

## Concept Mapping

| Twilio Concept | Telnyx Concept |
|---|---|
| IncomingPhoneNumbers | Phone Numbers API (`/v2/phone_numbers`) |
| AvailablePhoneNumbers | Available Phone Numbers (`/v2/available_phone_numbers`) |
| Number SID (`PN...`) | Phone number in E.164 (or number ID) |
| `IncomingPhoneNumbers.create()` | Number Orders (`/v2/number_orders`) — async |
| Voice URL (on number) | Connection webhook URL |
| SMS URL (on number) | Messaging Profile webhook URL |
| Address SID (for compliance) | Regulatory Requirements + Number Bundles |
| Number Add-ons | Not applicable — use Number Lookup API separately |
