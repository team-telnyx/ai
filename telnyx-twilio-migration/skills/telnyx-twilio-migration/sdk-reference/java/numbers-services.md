<!-- SDK reference: telnyx-numbers-services-java -->

# Telnyx Numbers Services - Java

## Core Workflow

### Prerequisites

1. Phone number must be ordered first (see telnyx-numbers-java)

### Steps

1. **Set up voicemail**: `client.voicemail().create(params)`
2. **Configure E911**: `client.dynamicEmergencyEndpoints().create(params)`

### Common mistakes

- E911 addresses must be validated — invalid addresses will cause regulatory issues

**Related skills**: telnyx-numbers-java, telnyx-numbers-config-java

## Installation

```text
<!-- Maven -->
<dependency>
    <groupId>com.telnyx.sdk</groupId>
    <artifactId>telnyx-java</artifactId>
    <version>5.2.1</version>
</dependency>

// Gradle
implementation("com.telnyx.sdk:telnyx-java:5.2.1")
```

## Setup

```java
import com.telnyx.sdk.client.TelnyxClient;
import com.telnyx.sdk.client.okhttp.TelnyxOkHttpClient;

TelnyxClient client = TelnyxOkHttpClient.fromEnv();
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```java
import com.telnyx.sdk.errors.TelnyxServiceException;

try {
    var result = client.voicemail().create(params);
} catch (TelnyxServiceException e) {
    System.err.println("API error " + e.statusCode() + ": " + e.getMessage());
    if (e.statusCode() == 422) {
        System.err.println("Validation error — check required fields and formats");
    } else if (e.statusCode() == 429) {
        // Rate limited — wait and retry with exponential backoff
        Thread.sleep(1000);
    }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return a page. Use `.autoPager()` for automatic iteration: `for (var item : page.autoPager()) { ... }`. For manual control, use `.hasNextPage()` and `.nextPage()`.

**Complete response schemas, all optional parameters, and webhook payload fields are in the API Details section at the end of this file.**
## List your voice channels for non-US zones

Returns the non-US voice channels for your account. voice channels allow you to use Channel Billing for calls to your Telnyx phone numbers. Please check the Telnyx Support Articles section for full information and examples of how to utilize Channel Billing.

`client.channelZones().list()` — `GET /channel_zones`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.channelzones.ChannelZoneListPage;
import com.telnyx.sdk.models.channelzones.ChannelZoneListParams;

ChannelZoneListPage page = client.channelZones().list();
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## Update voice channels for non-US Zones

Update the number of Voice Channels for the Non-US Zones. This allows your account to handle multiple simultaneous inbound calls to Non-US numbers. Use this endpoint to increase or decrease your capacity based on expected call volume.

`client.channelZones().update()` — `PUT /channel_zones/{channel_zone_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channels` | integer | Yes | The number of reserved channels |

```java
import com.telnyx.sdk.models.channelzones.ChannelZoneUpdateParams;
import com.telnyx.sdk.models.channelzones.ChannelZoneUpdateResponse;

ChannelZoneUpdateParams params = ChannelZoneUpdateParams.builder()
    .channelZoneId("550e8400-e29b-41d4-a716-446655440000")
    .channels(0L)
    .build();
ChannelZoneUpdateResponse channelZone = client.channelZones().update(params);
```

Key response fields: `response.data.id, response.data.name, response.data.created_at`

## List dynamic emergency addresses

Returns the dynamic emergency addresses according to filters

`client.dynamicEmergencyAddresses().list()` — `GET /dynamic_emergency_addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.dynamicemergencyaddresses.DynamicEmergencyAddressListPage;
import com.telnyx.sdk.models.dynamicemergencyaddresses.DynamicEmergencyAddressListParams;

DynamicEmergencyAddressListPage page = client.dynamicEmergencyAddresses().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a dynamic emergency address.

Creates a dynamic emergency address.

`client.dynamicEmergencyAddresses().create()` — `POST /dynamic_emergency_addresses`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `houseNumber` | string | Yes |  |
| `streetName` | string | Yes |  |
| `locality` | string | Yes |  |
| `administrativeArea` | string | Yes |  |
| `postalCode` | string | Yes |  |
| `countryCode` | enum (US, CA, PR) | Yes |  |
| `sipGeolocationId` | string (UUID) | No | Unique location reference string to be used in SIP INVITE fr... |
| `status` | enum (pending, activated, rejected) | No | Status of dynamic emergency address |
| `id` | string (UUID) | No |  |
| ... | | | +8 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.dynamicemergencyaddresses.DynamicEmergencyAddress;
import com.telnyx.sdk.models.dynamicemergencyaddresses.DynamicEmergencyAddressCreateParams;
import com.telnyx.sdk.models.dynamicemergencyaddresses.DynamicEmergencyAddressCreateResponse;

DynamicEmergencyAddress params = DynamicEmergencyAddress.builder()
    .administrativeArea("TX")
    .countryCode(DynamicEmergencyAddress.CountryCode.US)
    .houseNumber("600")
    .locality("Austin")
    .postalCode("78701")
    .streetName("Congress")
    .build();
DynamicEmergencyAddressCreateResponse dynamicEmergencyAddress = client.dynamicEmergencyAddresses().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a dynamic emergency address

Returns the dynamic emergency address based on the ID provided

`client.dynamicEmergencyAddresses().retrieve()` — `GET /dynamic_emergency_addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Dynamic Emergency Address id |

```java
import com.telnyx.sdk.models.dynamicemergencyaddresses.DynamicEmergencyAddressRetrieveParams;
import com.telnyx.sdk.models.dynamicemergencyaddresses.DynamicEmergencyAddressRetrieveResponse;

DynamicEmergencyAddressRetrieveResponse dynamicEmergencyAddress = client.dynamicEmergencyAddresses().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a dynamic emergency address

Deletes the dynamic emergency address based on the ID provided

`client.dynamicEmergencyAddresses().delete()` — `DELETE /dynamic_emergency_addresses/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Dynamic Emergency Address id |

```java
import com.telnyx.sdk.models.dynamicemergencyaddresses.DynamicEmergencyAddressDeleteParams;
import com.telnyx.sdk.models.dynamicemergencyaddresses.DynamicEmergencyAddressDeleteResponse;

DynamicEmergencyAddressDeleteResponse dynamicEmergencyAddress = client.dynamicEmergencyAddresses().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List dynamic emergency endpoints

Returns the dynamic emergency endpoints according to filters

`client.dynamicEmergencyEndpoints().list()` — `GET /dynamic_emergency_endpoints`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```java
import com.telnyx.sdk.models.dynamicemergencyendpoints.DynamicEmergencyEndpointListPage;
import com.telnyx.sdk.models.dynamicemergencyendpoints.DynamicEmergencyEndpointListParams;

DynamicEmergencyEndpointListPage page = client.dynamicEmergencyEndpoints().list();
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Create a dynamic emergency endpoint.

Creates a dynamic emergency endpoints.

`client.dynamicEmergencyEndpoints().create()` — `POST /dynamic_emergency_endpoints`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dynamicEmergencyAddressId` | string (UUID) | Yes | An id of a currently active dynamic emergency location. |
| `callbackNumber` | string | Yes |  |
| `callerName` | string | Yes |  |
| `status` | enum (pending, activated, rejected) | No | Status of dynamic emergency address |
| `sipFromId` | string (UUID) | No |  |
| `id` | string (UUID) | No |  |
| ... | | | +3 optional params in the API Details section below |

```java
import com.telnyx.sdk.models.dynamicemergencyendpoints.DynamicEmergencyEndpoint;
import com.telnyx.sdk.models.dynamicemergencyendpoints.DynamicEmergencyEndpointCreateParams;
import com.telnyx.sdk.models.dynamicemergencyendpoints.DynamicEmergencyEndpointCreateResponse;

DynamicEmergencyEndpoint params = DynamicEmergencyEndpoint.builder()
    .callbackNumber("+13125550000")
    .callerName("Jane Doe Desk Phone")
    .dynamicEmergencyAddressId("0ccc7b54-4df3-4bca-a65a-3da1ecc777f0")
    .build();
DynamicEmergencyEndpointCreateResponse dynamicEmergencyEndpoint = client.dynamicEmergencyEndpoints().create(params);
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Get a dynamic emergency endpoint

Returns the dynamic emergency endpoint based on the ID provided

`client.dynamicEmergencyEndpoints().retrieve()` — `GET /dynamic_emergency_endpoints/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Dynamic Emergency Endpoint id |

```java
import com.telnyx.sdk.models.dynamicemergencyendpoints.DynamicEmergencyEndpointRetrieveParams;
import com.telnyx.sdk.models.dynamicemergencyendpoints.DynamicEmergencyEndpointRetrieveResponse;

DynamicEmergencyEndpointRetrieveResponse dynamicEmergencyEndpoint = client.dynamicEmergencyEndpoints().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## Delete a dynamic emergency endpoint

Deletes the dynamic emergency endpoint based on the ID provided

`client.dynamicEmergencyEndpoints().delete()` — `DELETE /dynamic_emergency_endpoints/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Dynamic Emergency Endpoint id |

```java
import com.telnyx.sdk.models.dynamicemergencyendpoints.DynamicEmergencyEndpointDeleteParams;
import com.telnyx.sdk.models.dynamicemergencyendpoints.DynamicEmergencyEndpointDeleteResponse;

DynamicEmergencyEndpointDeleteResponse dynamicEmergencyEndpoint = client.dynamicEmergencyEndpoints().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.status, response.data.created_at`

## List your voice channels for US Zone

Returns the US Zone voice channels for your account. voice channels allows you to use Channel Billing for calls to your Telnyx phone numbers. Please check the Telnyx Support Articles section for full information and examples of how to utilize Channel Billing.

`client.inboundChannels().list()` — `GET /inbound_channels`

```java
import com.telnyx.sdk.models.inboundchannels.InboundChannelListParams;
import com.telnyx.sdk.models.inboundchannels.InboundChannelListResponse;

InboundChannelListResponse inboundChannels = client.inboundChannels().list();
```

Key response fields: `response.data.channels, response.data.record_type`

## Update voice channels for US Zone

Update the number of Voice Channels for the US Zone. This allows your account to handle multiple simultaneous inbound calls to US numbers. Use this endpoint to increase or decrease your capacity based on expected call volume.

`client.inboundChannels().update()` — `PATCH /inbound_channels`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channels` | integer | Yes | The new number of concurrent channels for the account |

```java
import com.telnyx.sdk.models.inboundchannels.InboundChannelUpdateParams;
import com.telnyx.sdk.models.inboundchannels.InboundChannelUpdateResponse;

InboundChannelUpdateParams params = InboundChannelUpdateParams.builder()
    .channels(7L)
    .build();
InboundChannelUpdateResponse inboundChannel = client.inboundChannels().update(params);
```

Key response fields: `response.data.channels, response.data.record_type`

## List All Numbers using Channel Billing

Retrieve a list of all phone numbers using Channel Billing, grouped by Zone.

`client.list().retrieveAll()` — `GET /list`

```java
import com.telnyx.sdk.models.list.ListRetrieveAllParams;
import com.telnyx.sdk.models.list.ListRetrieveAllResponse;

ListRetrieveAllResponse response = client.list().retrieveAll();
```

Key response fields: `response.data.number_of_channels, response.data.numbers, response.data.zone_id`

## List Numbers using Channel Billing for a specific Zone

Retrieve a list of phone numbers using Channel Billing for a specific Zone.

`client.list().retrieveByZone()` — `GET /list/{channel_zone_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channelZoneId` | string (UUID) | Yes | Channel zone identifier |

```java
import com.telnyx.sdk.models.list.ListRetrieveByZoneParams;
import com.telnyx.sdk.models.list.ListRetrieveByZoneResponse;

ListRetrieveByZoneResponse response = client.list().retrieveByZone("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.number_of_channels, response.data.numbers, response.data.zone_id`

## Get voicemail

Returns the voicemail settings for a phone number

`client.phoneNumbers().voicemail().retrieve()` — `GET /phone_numbers/{phone_number_id}/voicemail`

```java
import com.telnyx.sdk.models.phonenumbers.voicemail.VoicemailRetrieveParams;
import com.telnyx.sdk.models.phonenumbers.voicemail.VoicemailRetrieveResponse;

VoicemailRetrieveResponse voicemail = client.phoneNumbers().voicemail().retrieve("123455678900");
```

Key response fields: `response.data.enabled, response.data.pin`

## Create voicemail

Create voicemail settings for a phone number

`client.phoneNumbers().voicemail().create()` — `POST /phone_numbers/{phone_number_id}/voicemail`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pin` | string | No | The pin used for voicemail |
| `enabled` | boolean | No | Whether voicemail is enabled. |

```java
import com.telnyx.sdk.models.phonenumbers.voicemail.VoicemailCreateParams;
import com.telnyx.sdk.models.phonenumbers.voicemail.VoicemailCreateResponse;
import com.telnyx.sdk.models.phonenumbers.voicemail.VoicemailRequest;

VoicemailCreateParams params = VoicemailCreateParams.builder()
    .phoneNumberId("123455678900")
    .voicemailRequest(VoicemailRequest.builder().build())
    .build();
VoicemailCreateResponse voicemail = client.phoneNumbers().voicemail().create(params);
```

Key response fields: `response.data.enabled, response.data.pin`

## Update voicemail

Update voicemail settings for a phone number

`client.phoneNumbers().voicemail().update()` — `PATCH /phone_numbers/{phone_number_id}/voicemail`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pin` | string | No | The pin used for voicemail |
| `enabled` | boolean | No | Whether voicemail is enabled. |

```java
import com.telnyx.sdk.models.phonenumbers.voicemail.VoicemailRequest;
import com.telnyx.sdk.models.phonenumbers.voicemail.VoicemailUpdateParams;
import com.telnyx.sdk.models.phonenumbers.voicemail.VoicemailUpdateResponse;

VoicemailUpdateParams params = VoicemailUpdateParams.builder()
    .phoneNumberId("123455678900")
    .voicemailRequest(VoicemailRequest.builder().build())
    .build();
VoicemailUpdateResponse voicemail = client.phoneNumbers().voicemail().update(params);
```

Key response fields: `response.data.enabled, response.data.pin`

---

# Numbers Services (Java) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** List your voice channels for non-US zones, Update voice channels for non-US Zones

| Field | Type |
|-------|------|
| `channels` | int64 |
| `countries` | array[string] |
| `created_at` | string |
| `id` | string |
| `name` | string |
| `record_type` | enum: channel_zone |
| `updated_at` | string |

**Returned by:** List dynamic emergency addresses, Create a dynamic emergency address., Get a dynamic emergency address, Delete a dynamic emergency address

| Field | Type |
|-------|------|
| `administrative_area` | string |
| `country_code` | enum: US, CA, PR |
| `created_at` | string |
| `extended_address` | string |
| `house_number` | string |
| `house_suffix` | string |
| `id` | string |
| `locality` | string |
| `postal_code` | string |
| `record_type` | string |
| `sip_geolocation_id` | string |
| `status` | enum: pending, activated, rejected |
| `street_name` | string |
| `street_post_directional` | string |
| `street_pre_directional` | string |
| `street_suffix` | string |
| `updated_at` | string |

**Returned by:** List dynamic emergency endpoints, Create a dynamic emergency endpoint., Get a dynamic emergency endpoint, Delete a dynamic emergency endpoint

| Field | Type |
|-------|------|
| `callback_number` | string |
| `caller_name` | string |
| `created_at` | string |
| `dynamic_emergency_address_id` | string |
| `id` | string |
| `record_type` | string |
| `sip_from_id` | string |
| `status` | enum: pending, activated, rejected |
| `updated_at` | string |

**Returned by:** List your voice channels for US Zone, Update voice channels for US Zone

| Field | Type |
|-------|------|
| `channels` | integer |
| `record_type` | string |

**Returned by:** List All Numbers using Channel Billing, List Numbers using Channel Billing for a specific Zone

| Field | Type |
|-------|------|
| `number_of_channels` | integer |
| `numbers` | array[object] |
| `zone_id` | string |
| `zone_name` | string |

**Returned by:** Get voicemail, Create voicemail, Update voicemail

| Field | Type |
|-------|------|
| `enabled` | boolean |
| `pin` | string |

## Optional Parameters

### Create a dynamic emergency address. — `client.dynamicEmergencyAddresses().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) |  |
| `recordType` | string | Identifies the type of the resource. |
| `sipGeolocationId` | string (UUID) | Unique location reference string to be used in SIP INVITE from / p-asserted h... |
| `status` | enum (pending, activated, rejected) | Status of dynamic emergency address |
| `houseSuffix` | string |  |
| `streetPreDirectional` | string |  |
| `streetSuffix` | string |  |
| `streetPostDirectional` | string |  |
| `extendedAddress` | string |  |
| `createdAt` | string | ISO 8601 formatted date of when the resource was created |
| `updatedAt` | string | ISO 8601 formatted date of when the resource was last updated |

### Create a dynamic emergency endpoint. — `client.dynamicEmergencyEndpoints().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) |  |
| `recordType` | string | Identifies the type of the resource. |
| `status` | enum (pending, activated, rejected) | Status of dynamic emergency address |
| `sipFromId` | string (UUID) |  |
| `createdAt` | string | ISO 8601 formatted date of when the resource was created |
| `updatedAt` | string | ISO 8601 formatted date of when the resource was last updated |

### Create voicemail — `client.phoneNumbers().voicemail().create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `pin` | string | The pin used for voicemail |
| `enabled` | boolean | Whether voicemail is enabled. |

### Update voicemail — `client.phoneNumbers().voicemail().update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `pin` | string | The pin used for voicemail |
| `enabled` | boolean | Whether voicemail is enabled. |
