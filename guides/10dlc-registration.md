# 10DLC Registration

> Register brands and campaigns for A2P (application-to-person) SMS messaging in the USA.

## Prerequisites

- Telnyx API key ([get one free](https://telnyx.com/agent-signup.md))
- At least one US phone number
- Business information (or personal for sole proprietor)

## Quick Start

```bash
# Using the Telnyx CLI (recommended)
telnyx 10dlc wizard

# Or via API:
# 1. Create brand
curl -X POST "https://api.telnyx.com/v2/10dlc/brand" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"entity_type": "SOLE_PROP", "display_name": "My Business"}'

# 2. Create campaign
curl -X POST "https://api.telnyx.com/v2/10dlc/campaignBuilder" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"brandId": "brand-id", "usecase": "CUSTOMER_CARE"}'

# 3. Assign phone number
curl -X POST "https://api.telnyx.com/v2/10dlc/assignments" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+15551234567", "campaignId": "campaign-id"}'
```

## API Reference

### Create Brand (Sole Proprietor)

**`POST /v2/10dlc/brand`**

```bash
curl -X POST "https://api.telnyx.com/v2/10dlc/brand" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "SOLE_PROP",
    "display_name": "My Business",
    "company_name": "My Business LLC",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+15551234567",
    "email": "john@example.com",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postal_code": "10001",
    "country": "US"
  }'
```

### List Brands

**`GET /v2/10dlc/brand`**

```bash
curl "https://api.telnyx.com/v2/10dlc/brand" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### Get Brand Status

**`GET /v2/10dlc/brand/{brand_id}`**

```bash
curl "https://api.telnyx.com/v2/10dlc/brand/{brand_id}" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

**Status values:** `PENDING`, `VERIFIED`, `FAILED`

### Create Campaign

**`POST /v2/10dlc/campaignBuilder`**

> Note: Use `campaignBuilder` endpoint for creation, not `/campaign`.

```bash
curl -X POST "https://api.telnyx.com/v2/10dlc/campaignBuilder" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "brand-id",
    "usecase": "CUSTOMER_CARE",
    "description": "Customer support notifications",
    "sample1": "Your order #12345 has shipped. Reply STOP to opt out.",
    "sample2": "Your appointment is confirmed for tomorrow at 2pm.",
    "optinKeywords": "START,YES",
    "optoutKeywords": "STOP,UNSUBSCRIBE",
    "subscriberOptin": true,
    "subscriberOptout": true,
    "subscriberHelp": true
  }'
```

**Common use cases:**

| Use Case | Description |
|----------|-------------|
| `2FA` | Authentication codes |
| `CUSTOMER_CARE` | Support messages |
| `ACCOUNT_NOTIFICATION` | Account alerts |
| `DELIVERY_NOTIFICATION` | Shipping updates |
| `MARKETING` | Promotional messages |
| `MIXED` | Multiple purposes |

### Marketing Campaign Example

```bash
curl -X POST "https://api.telnyx.com/v2/10dlc/campaignBuilder" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "'$BRAND_ID'",
    "usecase": "MARKETING",
    "description": "Promotional SMS including sales and coupons.",
    "sample1": "Summer Sale! 30% off. Shop: example.com. Reply STOP to opt out.",
    "sample2": "New arrivals just dropped! Browse: example.com. Txt STOP to unsubscribe.",
    "embeddedLink": true,
    "subscriberOptin": true,
    "subscriberOptout": true,
    "subscriberHelp": true
  }'
```

### List Campaigns

**`GET /v2/10dlc/campaign`**

```bash
curl "https://api.telnyx.com/v2/10dlc/campaign" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### Assign Phone Number

**`POST /v2/10dlc/assignments`**

```bash
curl -X POST "https://api.telnyx.com/v2/10dlc/assignments" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+15551234567",
    "campaignId": "campaign-id"
  }'
```

### Check Assignment Status

**`GET /v2/10dlc/assignments/{phone_number}`**

```bash
curl "https://api.telnyx.com/v2/10dlc/assignments/%2B15551234567" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

## Python Examples

```python
import requests

API_KEY = "KEY..."
BASE_URL = "https://api.telnyx.com/v2"
headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

# Create brand
brand = requests.post(
    f"{BASE_URL}/10dlc/brand",
    headers=headers,
    json={
        "entity_type": "SOLE_PROP",
        "display_name": "My Business",
        "phone": "+15551234567",
        "email": "owner@example.com"
    }
).json()
brand_id = brand["data"]["id"]

# Create campaign
campaign = requests.post(
    f"{BASE_URL}/10dlc/campaignBuilder",
    headers=headers,
    json={
        "brandId": brand_id,
        "usecase": "CUSTOMER_CARE",
        "description": "Customer support notifications",
        "sample1": "Your order has shipped. Reply STOP to opt out.",
        "sample2": "Appointment confirmed for tomorrow.",
        "subscriberOptout": True
    }
).json()
campaign_id = campaign["data"]["id"]

# Assign number
requests.post(
    f"{BASE_URL}/10dlc/assignments",
    headers=headers,
    json={"phoneNumber": "+15551234567", "campaignId": campaign_id}
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

// Create brand
const brandRes = await fetch(`${BASE_URL}/10dlc/brand`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    entity_type: "SOLE_PROP",
    display_name: "My Business",
    phone: "+15551234567",
    email: "owner@example.com",
  }),
});
const { data: brand } = await brandRes.json();

// Create campaign
const campaignRes = await fetch(`${BASE_URL}/10dlc/campaignBuilder`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    brandId: brand.id,
    usecase: "CUSTOMER_CARE",
    description: "Customer support notifications",
    sample1: "Your order has shipped. Reply STOP to opt out.",
    sample2: "Appointment confirmed for tomorrow.",
    subscriberOptout: true,
  }),
});
const { data: campaign } = await campaignRes.json();

// Assign number
await fetch(`${BASE_URL}/10dlc/assignments`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    phoneNumber: "+15551234567",
    campaignId: campaign.id,
  }),
});
```

## Timeline Expectations

| Step | Typical Time |
|------|--------------|
| Brand creation | Instant |
| Brand verification | 1-5 minutes (PIN via SMS/email) |
| Brand approval | 24-72 hours |
| Campaign review | 24-48 hours |
| Number assignment | Instant (after campaign approved) |

## Error Handling

| Error | HTTP Status | Resolution |
|-------|-------------|------------|
| `Brand verification required` | 400 | Check SMS/email for PIN, verify brand |
| `Campaign rejected: insufficient description` | 400 | Be more specific about message purpose |
| `Sample messages must include opt-out` | 400 | Add "Reply STOP to opt out" |
| `Phone number already assigned` | 400 | Unassign first or use different number |
| `Invalid use case for sole proprietor` | 400 | Sole prop limited to: 2FA, CUSTOMER_CARE, DELIVERY_NOTIFICATION, ACCOUNT_NOTIFICATION |

## Sole Proprietor Restrictions

Sole proprietor brands can only use these campaign types:
- `2FA`
- `CUSTOMER_CARE`
- `DELIVERY_NOTIFICATION`
- `ACCOUNT_NOTIFICATION`

For `MARKETING` or `MIXED`, register as a business entity.

## Pricing

- **Brand registration:** Free
- **Campaign registration:** Free
- **SMS messaging:** Pay per message

## Resources

- [10DLC Documentation](https://developers.telnyx.com/docs/messaging/10dlc)
- [10DLC API Reference](https://developers.telnyx.com/docs/api/v2/10dlc)
- [SMS Messaging Guide](/guides/sms-messaging.md)
