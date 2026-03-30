# Phone Numbers

> Search, buy, configure, and manage phone numbers in 140+ countries.

## Prerequisites

- Telnyx API key ([get one free](https://telnyx.com/agent-signup.md))

## Quick Start

```bash
# Search for available numbers
curl "https://api.telnyx.com/v2/available_phone_numbers?filter[country_code]=US&filter[features]=sms" \
  -H "Authorization: Bearer $TELNYX_API_KEY"

# Buy a number
curl -X POST "https://api.telnyx.com/v2/number_orders" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phone_numbers": [{"phone_number": "+15551234567"}]}'

# List your numbers
curl "https://api.telnyx.com/v2/phone_numbers" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

## API Reference

### Search Available Numbers

**`GET /v2/available_phone_numbers`**

```bash
curl "https://api.telnyx.com/v2/available_phone_numbers?filter[country_code]=US&filter[limit]=10" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

**Common filters:**

| Filter | Description | Example |
|--------|-------------|---------|
| `filter[country_code]` | ISO country code | `US`, `GB`, `DE` |
| `filter[state]` | US state code | `CA`, `NY`, `TX` |
| `filter[features]` | Required features | `sms`, `voice`, `mms` |
| `filter[phone_number_type]` | Number type | `local`, `toll_free`, `mobile` |
| `filter[contains]` | Pattern match | `555`, `800` |
| `filter[limit]` | Max results | `10` (default), `50` max |

**Response:**

```json
{
  "data": [
    {
      "phone_number": "+15551234567",
      "country_code": "US",
      "phone_number_type": "local",
      "features": ["sms", "voice"],
      "cost": {
        "amount": "1.00",
        "currency": "USD"
      }
    }
  ]
}
```

### Buy Numbers

**`POST /v2/number_orders`**

```bash
curl -X POST "https://api.telnyx.com/v2/number_orders" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_numbers": [
      {"phone_number": "+15551234567"}
    ],
    "customer_reference": "order-123"
  }'
```

**Bulk purchase:**

```bash
curl -X POST "https://api.telnyx.com/v2/number_orders" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_numbers": [
      {"phone_number": "+15551234567"},
      {"phone_number": "+15559876543"}
    ]
  }'
```

### List Your Numbers

**`GET /v2/phone_numbers`**

```bash
curl "https://api.telnyx.com/v2/phone_numbers?page[size]=50" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

**Filter options:**

```bash
curl "https://api.telnyx.com/v2/phone_numbers?filter[connection_id]=conn-id" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### Get Number Details

**`GET /v2/phone_numbers/{id}`**

```bash
curl "https://api.telnyx.com/v2/phone_numbers/{id}" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### Update Number

**`PATCH /v2/phone_numbers/{id}`**

Assign to messaging profile or voice connection, set tags, update settings.

```bash
# Assign to messaging profile
curl -X PATCH "https://api.telnyx.com/v2/phone_numbers/{id}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_profile_id": "profile-id"
  }'

# Assign to voice connection
curl -X PATCH "https://api.telnyx.com/v2/phone_numbers/{id}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "connection_id": "connection-id"
  }'

# Set tags
curl -X PATCH "https://api.telnyx.com/v2/phone_numbers/{id}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tags": ["production", "customer-support"]
  }'
```

### Release Number

**`DELETE /v2/phone_numbers/{id}`**

```bash
curl -X DELETE "https://api.telnyx.com/v2/phone_numbers/{id}" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### List Assignments

**`GET /v2/phone_number_assignments`**

```bash
curl "https://api.telnyx.com/v2/phone_number_assignments" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

## Python Examples

```python
import requests

API_KEY = "KEY..."
BASE_URL = "https://api.telnyx.com/v2"
headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

# Search numbers
numbers = requests.get(
    f"{BASE_URL}/available_phone_numbers",
    headers=headers,
    params={"filter[country_code]": "US", "filter[features]": "sms", "filter[limit]": 10}
).json()

# Buy first available
phone = numbers["data"][0]["phone_number"]
order = requests.post(
    f"{BASE_URL}/number_orders",
    headers=headers,
    json={"phone_numbers": [{"phone_number": phone}]}
).json()
print(f"Purchased: {phone}")

# List owned numbers
owned = requests.get(f"{BASE_URL}/phone_numbers", headers=headers).json()
for num in owned["data"]:
    print(f"{num['phone_number']} - {num.get('status')}")

# Update number
number_id = owned["data"][0]["id"]
requests.patch(
    f"{BASE_URL}/phone_numbers/{number_id}",
    headers=headers,
    json={"tags": ["production"]}
)
```

## TypeScript Examples

```typescript
const API_KEY = process.env.TELNYX_API_KEY!;
const BASE_URL = "https://api.telnyx.com/v2";
const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

// Search available numbers
const searchRes = await fetch(
  `${BASE_URL}/available_phone_numbers?filter[country_code]=US&filter[features]=sms&filter[limit]=5`,
  { headers }
);
const { data: available } = await searchRes.json();
console.log(`Found ${available.length} numbers`);

// Buy first available
const phone = available[0].phone_number;
const orderRes = await fetch(`${BASE_URL}/number_orders`, {
  method: "POST",
  headers,
  body: JSON.stringify({ phone_numbers: [{ phone_number: phone }] }),
});
const { data: order } = await orderRes.json();
console.log(`Purchased: ${phone}`);

// List owned numbers
const listRes = await fetch(`${BASE_URL}/phone_numbers?page[size]=50`, { headers });
const { data: owned } = await listRes.json();
owned.forEach((n: any) => console.log(`${n.phone_number} - ${n.status}`));
```

## Agent Toolkit Examples

Use the `telnyx-agent-toolkit` Python package for simplified tool execution:

```python
from telnyx_agent_toolkit import TelnyxToolkit

toolkit = TelnyxToolkit(api_key="KEY...")

# Search for available numbers
available = toolkit.execute("search_phone_numbers", {
    "filter_country_code": "US",
    "filter_features": ["sms", "voice"],
    "limit": 5
})
for n in available["data"]:
    print(f"{n['phone_number']} ({n['phone_number_type']})")

# Buy a phone number
order = toolkit.execute("buy_phone_number", {
    "phone_numbers": [{"phone_number": "+15551234567"}]
})

# List owned numbers
owned = toolkit.execute("list_phone_numbers", {"page_size": 50})
for n in owned["data"]:
    print(f"{n['phone_number']} - {n.get('status')}")

# Update a number
toolkit.execute("update_phone_number", {
    "phone_number_id": "number-id",
    "tags": ["production", "support"]
})
```

## Common Patterns

### Find and Buy Specific Pattern

```python
def find_number_with_pattern(pattern: str) -> str:
    """Find a number containing a specific pattern."""
    response = requests.get(
        f"{BASE_URL}/available_phone_numbers",
        headers=headers,
        params={"filter[country_code]": "US", "filter[contains]": pattern}
    )
    numbers = response.json()["data"]
    if numbers:
        return numbers[0]["phone_number"]
    return None

# Find a number with "500" in it
number = find_number_with_pattern("500")
```

### Bulk Provision

```python
def provision_numbers(count: int, messaging_profile_id: str):
    """Buy and configure multiple numbers."""
    # Search
    numbers = requests.get(
        f"{BASE_URL}/available_phone_numbers",
        headers=headers,
        params={"filter[country_code]": "US", "filter[limit]": count}
    ).json()["data"]
    
    # Buy
    phone_numbers = [{"phone_number": n["phone_number"]} for n in numbers]
    order = requests.post(
        f"{BASE_URL}/number_orders",
        headers=headers,
        json={"phone_numbers": phone_numbers}
    ).json()
    
    # Configure each
    for num in order["data"]["phone_numbers"]:
        requests.patch(
            f"{BASE_URL}/phone_numbers/{num['id']}",
            headers=headers,
            json={"messaging_profile_id": messaging_profile_id}
        )
```

## Number Types

| Type | Description | Use Case |
|------|-------------|----------|
| `local` | Geographic numbers | Local presence |
| `toll_free` | 1-800 style | Customer service |
| `mobile` | Mobile numbers | A2P messaging |
| `national` | Non-geographic | National reach |
| `shared_cost` | Caller pays part | Premium services |

## Error Handling

| Error | HTTP Status | Resolution |
|-------|-------------|------------|
| `phone_number_not_found` | 404 | Number not available |
| `insufficient_funds` | 402 | Add balance to account |
| `phone_number_invalid` | 422 | Check E.164 format |
| `country_not_supported` | 400 | Check available countries |

## Pricing

- **Local US numbers:** ~$1/month
- **Toll-free US numbers:** ~$2/month
- **International:** Varies by country

## Resources

- [Phone Numbers API Reference](https://developers.telnyx.com/docs/api/v2/phone-numbers)
- [Number Ordering Guide](https://developers.telnyx.com/docs/numbers)
