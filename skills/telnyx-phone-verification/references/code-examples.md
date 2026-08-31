# Code Examples

SDK examples for every step in the Phone Verification Flow. Each section shows Python and Node.js as primary, with Ruby, PHP, Java, and Go as additional options.

## Validation Coverage

| Language | Status | Notes |
|----------|--------|-------|
| **curl** | ✅ Validated | All steps tested end-to-end against live API |
| **Python** | ✅ Validated | Tested with `telnyx` SDK + raw `requests` for 10DLC |
| **Node.js** | ✅ Validated | Tested with `telnyx` SDK + `fetch` for 10DLC |
| **Ruby** | ⚠️ Best-effort | Based on SDK docs and API patterns, not live-tested |
| **PHP** | ⚠️ Best-effort | Based on SDK docs and API patterns, not live-tested |
| **Java** | ⚠️ Best-effort | Based on SDK docs and API patterns, not live-tested |
| **Go** | ⚠️ Best-effort | Based on SDK docs and API patterns, not live-tested |

> Ruby, PHP, Java, and Go examples follow the same API contracts as the validated curl/Python/Node.js examples. The request/response shapes are identical — only the SDK wrapper syntax differs.

## How to Use This File

SKILL.md contains **curl examples only** for each step — concise and agent-friendly. This file provides the **SDK equivalents** organized by step. Each step shows Python and Node.js first (validated), then additional languages. To avoid repetition, the runtime verification flow (Steps 8a-8c) is shown as a **single combined flow** per language rather than repeating individual steps.

## Step 1: Search and Purchase Phone Number

### Python

```python
import telnyx
import os

telnyx.api_key = os.environ["TELNYX_API_KEY"]

# Search
available = telnyx.AvailablePhoneNumber.list(
    filter={
        "country_code": "US",
        "features": ["sms"],
        "phone_number_type": "local",
        "limit": 5
    }
)
for number in available.data:
    cost = number.cost_information
    print(f"{number.phone_number} — ${cost.monthly_cost}/mo (upfront: ${cost.upfront_cost})")

# Purchase
order = telnyx.NumberOrder.create(
    phone_numbers=[{"phone_number": available.data[0].phone_number}],
    customer_reference="phone-verification-blueprint"
)
print(f"Order ID: {order.data.id}, Status: {order.data.status}")
```

### Node.js

```javascript
const Telnyx = require('telnyx');
const client = new Telnyx({ apiKey: process.env.TELNYX_API_KEY });

// Search
const { data } = await client.availablePhoneNumbers.list({
  filter: { country_code: 'US', features: ['sms'], phone_number_type: 'local', limit: 5 }
});
data.forEach(num => console.log(`${num.phone_number} — $${num.cost_information.monthly_cost}/mo`));

// Purchase
const order = await client.numberOrders.create({
  phone_numbers: [{ phone_number: data[0].phone_number }],
  customer_reference: 'phone-verification-blueprint'
});
console.log(`Order ID: ${order.data.id}, Status: ${order.data.status}`);
```

### Ruby

```ruby
require 'telnyx'
Telnyx.api_key = 'YOUR_API_KEY'

available = Telnyx::AvailablePhoneNumber.list(
  filter: { country_code: 'US', features: ['sms'], phone_number_type: 'local', limit: 5 }
)
available.data.each { |n| puts "#{n.phone_number} — $#{n.cost_information.monthly_cost}/mo" }

order = Telnyx::NumberOrder.create(
  phone_numbers: [{ phone_number: available.data.first.phone_number }],
  customer_reference: 'phone-verification-blueprint'
)
puts "Order ID: #{order.data.id}, Status: #{order.data.status}"
```

### PHP

```php
<?php
require 'vendor/autoload.php';
\Telnyx\Telnyx::setApiKey('YOUR_API_KEY');

$available = \Telnyx\AvailablePhoneNumber::all([
    'filter' => ['country_code' => 'US', 'features' => ['sms'],
                 'phone_number_type' => 'local', 'limit' => 5]
]);
foreach ($available->data as $num)
    echo $num->phone_number . " — $" . $num->cost_information->monthly_cost . "/mo\n";

$order = \Telnyx\NumberOrder::create([
    'phone_numbers' => [['phone_number' => $available->data[0]->phone_number]],
    'customer_reference' => 'phone-verification-blueprint'
]);
echo "Order ID: " . $order->data->id . ", Status: " . $order->data->status . "\n";
```

### Java

```java
import com.telnyx.Telnyx;
import com.telnyx.model.*;
import java.util.*;

Telnyx.apiKey = "YOUR_API_KEY";

Map<String, Object> filter = Map.of("country_code", "US", "features[]", "sms",
    "phone_number_type", "local", "limit", 5);
var available = AvailablePhoneNumber.list(Map.of("filter", filter));
for (var num : available.getData())
    System.out.printf("%s — $%s/mo%n", num.getPhoneNumber(),
        num.getCostInformation().getMonthlyCost());

var order = NumberOrder.create(Map.of(
    "phone_numbers", List.of(Map.of("phone_number", "+19705555098")),
    "customer_reference", "phone-verification-blueprint"));
System.out.println("Order ID: " + order.getId() + ", Status: " + order.getStatus());
```

### Go

```go
client := telnyx.NewClient("YOUR_API_KEY")

available, _ := client.AvailablePhoneNumbers.List(&telnyx.AvailablePhoneNumberListParams{
    Filter: &telnyx.AvailablePhoneNumberFilter{
        CountryCode: "US", Features: []string{"sms"},
        PhoneNumberType: "local", Limit: 5,
    },
})
for _, num := range available.Data {
    fmt.Printf("%s — $%s/mo\n", num.PhoneNumber, num.CostInformation.MonthlyCost)
}

order, _ := client.NumberOrders.Create(&telnyx.NumberOrderParams{
    PhoneNumbers:      []telnyx.PhoneNumberParam{{PhoneNumber: "+19705555098"}},
    CustomerReference: "phone-verification-blueprint",
})
fmt.Printf("Order ID: %s, Status: %s\n", order.Data.ID, order.Data.Status)
```

## Step 2: Create Messaging Profile

### Python

```python
profile = telnyx.MessagingProfile.create(
    name="Phone Verification",
    whitelisted_destinations=["US", "CA"],
    webhook_url="https://your-app.example.com/webhooks/messaging",
    webhook_api_version="2"
)
print(f"Messaging Profile ID: {profile.data.id}")
```

### Node.js

```javascript
const profile = await client.messagingProfiles.create({
  name: 'Phone Verification',
  whitelisted_destinations: ['US', 'CA'],
  webhook_url: 'https://your-app.example.com/webhooks/messaging',
  webhook_api_version: '2'
});
console.log(`Messaging Profile ID: ${profile.data.id}`);
```

### Ruby

```ruby
profile = Telnyx::MessagingProfile.create(
  name: 'Phone Verification', whitelisted_destinations: ['US', 'CA'],
  webhook_url: 'https://your-app.example.com/webhooks/messaging', webhook_api_version: '2'
)
puts "Messaging Profile ID: #{profile.data.id}"
```

### PHP

```php
$profile = \Telnyx\MessagingProfile::create([
    'name' => 'Phone Verification', 'whitelisted_destinations' => ['US', 'CA'],
    'webhook_url' => 'https://your-app.example.com/webhooks/messaging', 'webhook_api_version' => '2'
]);
echo "Messaging Profile ID: " . $profile->data->id . "\n";
```

## Step 3: Assign Number to Messaging Profile

### Python

```python
numbers = telnyx.PhoneNumber.list(filter={"phone_number": "+19705555098"})
phone_number_id = numbers.data[0].id

result = telnyx.PhoneNumberMessaging.update(
    phone_number_id, messaging_profile_id="YOUR_MESSAGING_PROFILE_ID"
)
print(f"Assigned to profile: {result.data.messaging_profile_id}")
```

### Node.js

```javascript
const numbers = await client.phoneNumbers.list({ filter: { phone_number: '+19705555098' } });
const phoneNumberId = numbers.data[0].id;

await client.phoneNumbers.updateMessagingSettings(phoneNumberId, {
  messaging_profile_id: 'YOUR_MESSAGING_PROFILE_ID'
});
console.log('Phone number assigned to messaging profile');
```

## Steps 4-6: 10DLC Registration

> **Note:** 10DLC endpoints are not wrapped in most Telnyx SDKs. Use raw HTTP requests.

### Python (Brand + Campaign + Assignment)

```python
import requests, os

headers = {
    "Authorization": f"Bearer {os.environ['TELNYX_API_KEY']}",
    "Content-Type": "application/json"
}

# Step 4: Register brand
brand = requests.post("https://api.telnyx.com/v2/10dlc/brand", headers=headers, json={
    "entityType": "PRIVATE_PROFIT", "displayName": "Acme Corp",
    "companyName": "Acme Corporation Inc.", "ein": "123456789",
    "country": "US", "email": "support@acme.com", "phone": "+12025551234",
    "street": "123 Main St", "city": "Denver", "state": "CO",
    "postalCode": "80202", "website": "https://acme.com",
    "vertical": "TECHNOLOGY", "isReseller": False
}).json()
print(f"Brand ID: {brand['brandId']}, Status: {brand['identityStatus']}")

# Step 5: Create campaign (after brand is VERIFIED)
campaign = requests.post("https://api.telnyx.com/v2/10dlc/campaignBuilder", headers=headers, json={
    "brandId": brand["brandId"], "usecase": "2FA",
    "description": "Sending one-time passcodes for account verification and 2FA",
    "sample1": "Your verification code is 123456. It expires in 5 minutes.",
    "sample2": "Your Acme login code is 789012. Do not share this code.",
    "messageFlow": "Users provide phone number during registration. They receive a code via SMS.",
    "helpMessage": "Reply HELP for support.", "helpKeywords": "HELP,INFO",
    "optinMessage": "Opted in to receive verification codes. Reply STOP to opt out.",
    "optinKeywords": "START,YES",
    "optoutMessage": "You have been opted out.",
    "optoutKeywords": "STOP,UNSUBSCRIBE,CANCEL,END,QUIT",
    "subscriberOptin": True, "subscriberOptout": True, "subscriberHelp": True,
    "embeddedLink": False, "embeddedPhone": False, "numberPool": False,
    "ageGated": False, "directLending": False, "termsAndConditions": True
}).json()
print(f"Campaign ID: {campaign['campaignId']}, Status: {campaign.get('campaignStatus')}")

# Step 6: Assign number to campaign
assignment = requests.post("https://api.telnyx.com/v2/10dlc/phone_number_campaigns",
    headers=headers, json={"phoneNumber": "+19705555098", "campaignId": campaign["campaignId"]}
).json()
print(f"Assignment status: {assignment.get('assignmentStatus')}")
```

### Node.js (Brand + Campaign + Assignment)

```javascript
const headers = {
  'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
  'Content-Type': 'application/json'
};

// Step 4: Register brand
const brand = await (await fetch('https://api.telnyx.com/v2/10dlc/brand', {
  method: 'POST', headers,
  body: JSON.stringify({
    entityType: 'PRIVATE_PROFIT', displayName: 'Acme Corp',
    companyName: 'Acme Corporation Inc.', ein: '123456789',
    country: 'US', email: 'support@acme.com', phone: '+12025551234',
    street: '123 Main St', city: 'Denver', state: 'CO',
    postalCode: '80202', website: 'https://acme.com',
    vertical: 'TECHNOLOGY', isReseller: false
  })
})).json();
console.log(`Brand ID: ${brand.brandId}, Status: ${brand.identityStatus}`);

// Step 5: Create campaign (after brand VERIFIED)
const campaign = await (await fetch('https://api.telnyx.com/v2/10dlc/campaignBuilder', {
  method: 'POST', headers,
  body: JSON.stringify({
    brandId: brand.brandId, usecase: '2FA',
    description: 'Sending one-time passcodes for account verification and 2FA',
    sample1: 'Your verification code is 123456. It expires in 5 minutes.',
    sample2: 'Your Acme login code is 789012. Do not share this code.',
    messageFlow: 'Users provide phone number during registration. They receive a code via SMS.',
    helpMessage: 'Reply HELP for support.', helpKeywords: 'HELP,INFO',
    optinMessage: 'Opted in to receive verification codes. Reply STOP to opt out.',
    optinKeywords: 'START,YES', optoutMessage: 'You have been opted out.',
    optoutKeywords: 'STOP,UNSUBSCRIBE,CANCEL,END,QUIT',
    subscriberOptin: true, subscriberOptout: true, subscriberHelp: true,
    embeddedLink: false, embeddedPhone: false, numberPool: false,
    ageGated: false, directLending: false, termsAndConditions: true
  })
})).json();
console.log(`Campaign ID: ${campaign.campaignId}`);

// Step 6: Assign number to campaign
const assignment = await (await fetch('https://api.telnyx.com/v2/10dlc/phone_number_campaigns', {
  method: 'POST', headers,
  body: JSON.stringify({ phoneNumber: '+19705555098', campaignId: campaign.campaignId })
})).json();
console.log(`Assignment status: ${assignment.assignmentStatus}`);
```

## Step 7: Create Verify Profile

### Python

```python
profile = telnyx.VerifyProfile.create(
    name="Acme Phone Verification",
    webhook_url="https://your-app.example.com/webhooks/verify",
    sms={"app_name": "Acme", "code_length": 6,
         "whitelisted_destinations": ["US", "CA"],
         "default_verification_timeout_secs": 300},
    call={"app_name": "Acme", "code_length": 6,
          "whitelisted_destinations": ["US", "CA"],
          "default_verification_timeout_secs": 300},
    language="en-US"
)
print(f"Verify Profile ID: {profile.data.id}")
```

### Node.js

```javascript
const verifyProfile = await client.verifyProfiles.create({
  name: 'Acme Phone Verification',
  webhook_url: 'https://your-app.example.com/webhooks/verify',
  sms: { app_name: 'Acme', code_length: 6, whitelisted_destinations: ['US', 'CA'],
         default_verification_timeout_secs: 300 },
  call: { app_name: 'Acme', code_length: 6, whitelisted_destinations: ['US', 'CA'],
          default_verification_timeout_secs: 300 },
  language: 'en-US'
});
console.log(`Verify Profile ID: ${verifyProfile.data.id}`);
```

### Ruby

```ruby
profile = Telnyx::VerifyProfile.create(
  name: 'Acme Phone Verification',
  webhook_url: 'https://your-app.example.com/webhooks/verify',
  sms: { app_name: 'Acme', code_length: 6, whitelisted_destinations: ['US', 'CA'],
         default_verification_timeout_secs: 300 },
  call: { app_name: 'Acme', code_length: 6, whitelisted_destinations: ['US', 'CA'],
         default_verification_timeout_secs: 300 },
  language: 'en-US'
)
puts "Verify Profile ID: #{profile.data.id}"
```

### PHP

```php
$profile = \Telnyx\VerifyProfile::create([
    'name' => 'Acme Phone Verification',
    'webhook_url' => 'https://your-app.example.com/webhooks/verify',
    'sms' => ['app_name' => 'Acme', 'code_length' => 6,
              'whitelisted_destinations' => ['US', 'CA'],
              'default_verification_timeout_secs' => 300],
    'call' => ['app_name' => 'Acme', 'code_length' => 6,
               'whitelisted_destinations' => ['US', 'CA'],
               'default_verification_timeout_secs' => 300],
    'language' => 'en-US'
]);
echo "Verify Profile ID: " . $profile->data->id . "\n";
```

## Steps 8a-8c: Runtime Verification

### Python (Full flow with routing)

```python
from telnyx import Telnyx
import os

client = Telnyx(api_key=os.environ["TELNYX_API_KEY"])

# 8a: Lookup
result = client.number_lookup.retrieve("+13035551234")
carrier_type = result.data.carrier.type if result.data.carrier else "unknown"
channel = "call" if carrier_type == "fixed line" else "sms"
print(f"Type: {carrier_type}, Channel: {channel}")

# 8b: Send verification
if channel == "sms":
    verification = client.verifications.trigger_sms(
        phone_number="+13035551234", verify_profile_id="YOUR_VERIFY_PROFILE_ID")
else:
    verification = client.verifications.trigger_call(
        phone_number="+13035551234", verify_profile_id="YOUR_VERIFY_PROFILE_ID")
print(f"Verification ID: {verification.data.id}, Status: {verification.data.status}")

# 8c: Verify code
result = client.verifications.actions.verify(
    verification_id=verification.data.id,
    code="123456")
print("✅ Verified!" if result.data.response_code == "accepted" else "❌ Invalid code")
```

### Node.js (Full flow with routing)

```javascript
// 8a: Lookup
const lookup = await client.numberLookup.retrieve('+13035551234');
const carrierType = lookup.data.carrier?.type || 'unknown';
const channel = carrierType === 'fixed line' ? 'call' : 'sms';
console.log(`Type: ${carrierType}, Channel: ${channel}`);

// 8b: Send verification
const verification = channel === 'sms'
  ? await client.verifications.triggerSMS({
      phone_number: '+13035551234',
      verify_profile_id: 'YOUR_VERIFY_PROFILE_ID'
    })
  : await client.verifications.triggerCall({
      phone_number: '+13035551234',
      verify_profile_id: 'YOUR_VERIFY_PROFILE_ID'
    });
console.log(`Verification ID: ${verification.data.id}`);

// 8c: Verify code
const result = await client.verifications.actions.verify(verification.data.id, { code: '123456' });
console.log(result.data.response_code === 'accepted' ? '✅ Verified!' : '❌ Invalid code');
```

### Ruby

```ruby
# 8a
result = Telnyx::NumberLookup.retrieve('+13035551234')
carrier_type = result.data.carrier&.type || 'unknown'
channel = carrier_type == 'fixed line' ? :call : :sms

# 8b
verification = channel == :sms ?
  client.verifications.trigger_sms(phone_number: '+13035551234', verify_profile_id: 'YOUR_ID') :
  client.verifications.trigger_call(phone_number: '+13035551234', verify_profile_id: 'YOUR_ID')

# 8c
result = client.verifications.actions.verify(verification.data.id, code: '123456')
puts result.data.response_code == 'accepted' ? '✅ Verified!' : '❌ Invalid code'
```

### PHP

```php
// 8a
$result = \Telnyx\NumberLookup::retrieve('+13035551234');
$type = $result->data->carrier->type ?? 'unknown';

// 8b
$verification = $type === 'fixed line'
    ? \Telnyx\Verification::call(['phone_number' => '+13035551234', 'verify_profile_id' => 'YOUR_ID'])
    : \Telnyx\Verification::sms(['phone_number' => '+13035551234', 'verify_profile_id' => 'YOUR_ID']);

// 8c
$check = \Telnyx\Verification::verify($verification->data->id, ['code' => '123456']);
echo $check->data->response_code === 'accepted' ? "✅ Verified!\n" : "❌ Invalid\n";
```

## E2E Smoke Test Script

```python
#!/usr/bin/env python3
"""
End-to-end smoke test for Phone Verification Blueprint.
Tests the runtime flow (assumes infrastructure is already set up).

Usage:
  export TELNYX_API_KEY="your-key"
  python3 e2e_test.py --verify-profile-id <uuid> --phone <+1XXXXXXXXXX>
"""

import argparse, os, sys
from telnyx import Telnyx

def main():
    parser = argparse.ArgumentParser(description="Phone Verification E2E Test")
    parser.add_argument("--verify-profile-id", required=True)
    parser.add_argument("--phone", required=True, help="Phone number (E.164)")
    args = parser.parse_args()
    
    api_key = os.environ.get("TELNYX_API_KEY")
    if not api_key:
        print("❌ TELNYX_API_KEY not set"); sys.exit(1)
    client = Telnyx(api_key=api_key)
    
    print(f"Testing phone verification for {args.phone}\n{'='*50}")
    
    # Step 1: Number Lookup
    print("\n[1/3] Number Lookup...")
    lookup = client.number_lookup.retrieve(args.phone)
    carrier_type = lookup.data.carrier.type if lookup.data.carrier else "unknown"
    print(f"  ✅ Type: {carrier_type}, Carrier: {lookup.data.carrier.name if lookup.data.carrier else 'unknown'}")
    
    # Step 2: Send Verification
    channel = "call" if carrier_type == "fixed line" else "sms"
    print(f"\n[2/3] Sending {channel.upper()} verification...")
    trigger = client.verifications.trigger_call if channel == "call" else client.verifications.trigger_sms
    v = trigger(phone_number=args.phone, verify_profile_id=args.verify_profile_id)
    print(f"  ✅ ID: {v.data.id}, Status: {v.data.status}, Timeout: {v.data.timeout_secs}s")
    
    # Step 3: Verify Code
    code = input(f"\n[3/3] Enter code received on {args.phone}: ").strip()
    result = client.verifications.actions.verify(verification_id=v.data.id, code=code)
    
    if result.data.response_code == "accepted":
        print("  ✅ VERIFIED — Phone number confirmed!")
    else:
        print("  ❌ REJECTED — Code incorrect or expired")

if __name__ == "__main__":
    main()
```

## Brand Vetting Poll Script

```python
import time, requests, os

def wait_for_brand_verification(brand_id, poll_interval=3600, max_days=10):
    headers = {"Authorization": f"Bearer {os.environ['TELNYX_API_KEY']}"}
    max_attempts = (max_days * 24 * 3600) // poll_interval
    
    for attempt in range(max_attempts):
        brand = requests.get(f"https://api.telnyx.com/v2/10dlc/brand/{brand_id}",
                            headers=headers).json()
        status = brand.get("identityStatus", "UNKNOWN")
        print(f"Attempt {attempt + 1}: {status}")
        
        if status in ("VERIFIED", "VETTED_VERIFIED"):
            print("✅ Brand verified!"); return brand
        if status == "REGISTRATION_FAILED":
            print(f"❌ Failed: {brand.get('failureReasons')}"); return None
        
        time.sleep(poll_interval)
    
    print("⏰ Timed out"); return None
```
