---
name: telnyx-messaging-hosted-java
description: >-
  Hosted SMS numbers, toll-free verification, and RCS messaging. Use when
  migrating numbers or enabling rich messaging.
metadata:
  author: telnyx
  product: messaging-hosted
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Messaging Hosted - Java

## Core Workflow

### Prerequisites

1. Host phone numbers on Telnyx by completing the hosted number order process
2. For toll-free: submit toll-free verification request

### Steps

1. **Create hosted number order**: `client.hostedNumberOrders().create(params)`
2. **Upload LOA**: `Provide Letter of Authorization for the numbers`
3. **Monitor status**: `client.hostedNumberOrders().retrieve(params)`

### Common mistakes

- Hosted numbers remain with the original carrier — Telnyx routes messaging only
- Toll-free verification is required before sending A2P traffic on toll-free numbers

**Related skills**: telnyx-messaging-java, telnyx-messaging-profiles-java

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
    var result = client.hostedNumberOrders().create(params);
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

- **Phone numbers** must be in E.164 format (e.g., `+13125550001`). Include the `+` prefix and country code. No spaces, dashes, or parentheses.
- **Pagination:** List methods return a page. Use `.autoPager()` for automatic iteration: `for (var item : page.autoPager()) { ... }`. For manual control, use `.hasNextPage()` and `.nextPage()`.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Send an RCS message

`client.messages().rcs().send()` — `POST /messages/rcs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentId` | string (UUID) | Yes | RCS Agent ID |
| `to` | string (E.164) | Yes | Phone number in +E.164 format |
| `messagingProfileId` | string (UUID) | Yes | A valid messaging profile ID |
| `agentMessage` | object | Yes |  |
| `type` | enum (RCS) | No | Message type - must be set to "RCS" |
| `webhookUrl` | string (URL) | No | The URL where webhooks related to this message will be sent. |
| `smsFallback` | object | No |  |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.messages.RcsAgentMessage;
import com.telnyx.sdk.models.messages.rcs.RcSendParams;
import com.telnyx.sdk.models.messages.rcs.RcSendResponse;

RcSendParams params = RcSendParams.builder()
    .agentId("Agent007")
    .agentMessage(RcsAgentMessage.builder().build())
    .messagingProfileId("550e8400-e29b-41d4-a716-446655440000")
    .to("+13125551234")
    .build();
RcSendResponse response = client.messages().rcs().send(params);
```

Key response fields: `response.data.id, response.data.to, response.data.from`

## Generate RCS deeplink

Generate a deeplink URL that can be used to start an RCS conversation with a specific agent.

`client.messages().rcs().generateDeeplink()` — `GET /messages/rcs/deeplinks/{agent_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentId` | string (UUID) | Yes | RCS agent ID |
| `phoneNumber` | string (E.164) | No | Phone number in E164 format (URL encoded) |
| `body` | string | No | Pre-filled message body (URL encoded) |

```java
import com.telnyx.sdk.models.messages.rcs.RcGenerateDeeplinkParams;
import com.telnyx.sdk.models.messages.rcs.RcGenerateDeeplinkResponse;

RcGenerateDeeplinkResponse response = client.messages().rcs().generateDeeplink("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.url`

## List all RCS agents

`client.messaging().rcs().agents().list()` — `GET /messaging/rcs/agents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.messaging.rcs.agents.AgentListPage;
import com.telnyx.sdk.models.messaging.rcs.agents.AgentListParams;

AgentListPage page = client.messaging().rcs().agents().list();
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.agent_id`

## Retrieve an RCS agent

`client.messaging().rcs().agents().retrieve()` — `GET /messaging/rcs/agents/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | RCS agent ID |

```java
import com.telnyx.sdk.models.messaging.rcs.agents.AgentRetrieveParams;
import com.telnyx.sdk.models.rcsagents.RcsAgentResponse;

RcsAgentResponse rcsAgentResponse = client.messaging().rcs().agents().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.agent_id`

## Modify an RCS agent

`client.messaging().rcs().agents().update()` — `PATCH /messaging/rcs/agents/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | RCS agent ID |
| `webhookUrl` | string (URL) | No | URL to receive RCS events |
| `webhookFailoverUrl` | string (URL) | No | Failover URL to receive RCS events |
| `profileId` | string (UUID) | No | Messaging profile ID associated with the RCS Agent |

```java
import com.telnyx.sdk.models.messaging.rcs.agents.AgentUpdateParams;
import com.telnyx.sdk.models.rcsagents.RcsAgentResponse;

RcsAgentResponse rcsAgentResponse = client.messaging().rcs().agents().update("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.created_at, response.data.updated_at, response.data.agent_id`

## Check RCS capabilities (batch)

`client.messaging().rcs().listBulkCapabilities()` — `POST /messaging/rcs/bulk_capabilities`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentId` | string (UUID) | Yes | RCS Agent ID |
| `phoneNumbers` | array[string] | Yes | List of phone numbers to check |

```java
import com.telnyx.sdk.models.messaging.rcs.RcListBulkCapabilitiesParams;
import com.telnyx.sdk.models.messaging.rcs.RcListBulkCapabilitiesResponse;

RcListBulkCapabilitiesParams params = RcListBulkCapabilitiesParams.builder()
    .agentId("TestAgent")
    .addPhoneNumber("+13125551234")
    .build();
RcListBulkCapabilitiesResponse response = client.messaging().rcs().listBulkCapabilities(params);
```

Key response fields: `response.data.phone_number, response.data.agent_id, response.data.agent_name`

## Check RCS capabilities

`client.messaging().rcs().retrieveCapabilities()` — `GET /messaging/rcs/capabilities/{agent_id}/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentId` | string (UUID) | Yes | RCS agent ID |
| `phoneNumber` | string (E.164) | Yes | Phone number in E164 format |

```java
import com.telnyx.sdk.models.messaging.rcs.RcRetrieveCapabilitiesParams;
import com.telnyx.sdk.models.messaging.rcs.RcRetrieveCapabilitiesResponse;

RcRetrieveCapabilitiesParams params = RcRetrieveCapabilitiesParams.builder()
    .agentId("550e8400-e29b-41d4-a716-446655440000")
    .phoneNumber("+13125550001")
    .build();
RcRetrieveCapabilitiesResponse response = client.messaging().rcs().retrieveCapabilities(params);
```

Key response fields: `response.data.phone_number, response.data.agent_id, response.data.agent_name`

## Add RCS test number

Adds a test phone number to an RCS agent for testing purposes.

`client.messaging().rcs().inviteTestNumber()` — `PUT /messaging/rcs/test_number_invite/{id}/{phone_number}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | RCS agent ID |
| `phoneNumber` | string (E.164) | Yes | Phone number in E164 format to invite for testing |

```java
import com.telnyx.sdk.models.messaging.rcs.RcInviteTestNumberParams;
import com.telnyx.sdk.models.messaging.rcs.RcInviteTestNumberResponse;

RcInviteTestNumberParams params = RcInviteTestNumberParams.builder()
    .id("550e8400-e29b-41d4-a716-446655440000")
    .phoneNumber("+13125550001")
    .build();
RcInviteTestNumberResponse response = client.messaging().rcs().inviteTestNumber(params);
```

Key response fields: `response.data.status, response.data.phone_number, response.data.agent_id`

## List messaging hosted number orders

`client.messagingHostedNumberOrders().list()` — `GET /messaging_hosted_number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderListPage;
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderListParams;

MessagingHostedNumberOrderListPage page = client.messagingHostedNumberOrders().list();
```

Key response fields: `response.data.id, response.data.status, response.data.messaging_profile_id`

## Create a messaging hosted number order

`client.messagingHostedNumberOrders().create()` — `POST /messaging_hosted_number_orders`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messagingProfileId` | string (UUID) | No | Automatically associate the number with this messaging profi... |
| `phoneNumbers` | array[string] | No | Phone numbers to be used for hosted messaging. |

```java
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderCreateParams;
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderCreateResponse;

MessagingHostedNumberOrderCreateResponse messagingHostedNumberOrder = client.messagingHostedNumberOrders().create();
```

Key response fields: `response.data.id, response.data.status, response.data.messaging_profile_id`

## Check hosted messaging eligibility

`client.messagingHostedNumberOrders().checkEligibility()` — `POST /messaging_hosted_number_orders/eligibility_numbers_check`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumbers` | array[string] | Yes | List of phone numbers to check eligibility |

```java
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderCheckEligibilityParams;
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderCheckEligibilityResponse;

MessagingHostedNumberOrderCheckEligibilityParams params = MessagingHostedNumberOrderCheckEligibilityParams.builder()
    .addPhoneNumber("string")
    .build();
MessagingHostedNumberOrderCheckEligibilityResponse response = client.messagingHostedNumberOrders().checkEligibility(params);
```

Key response fields: `response.data.phone_numbers`

## Retrieve a messaging hosted number order

`client.messagingHostedNumberOrders().retrieve()` — `GET /messaging_hosted_number_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```java
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderRetrieveParams;
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderRetrieveResponse;

MessagingHostedNumberOrderRetrieveResponse messagingHostedNumberOrder = client.messagingHostedNumberOrders().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.messaging_profile_id`

## Delete a messaging hosted number order

Delete a messaging hosted number order and all associated phone numbers.

`client.messagingHostedNumberOrders().delete()` — `DELETE /messaging_hosted_number_orders/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the messaging hosted number order to delete. |

```java
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderDeleteParams;
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderDeleteResponse;

MessagingHostedNumberOrderDeleteResponse messagingHostedNumberOrder = client.messagingHostedNumberOrders().delete("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.messaging_profile_id`

## Upload hosted number document

`client.messagingHostedNumberOrders().actions().uploadFile()` — `POST /messaging_hosted_number_orders/{id}/actions/file_upload`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```java
import com.telnyx.sdk.models.messaginghostednumberorders.actions.ActionUploadFileParams;
import com.telnyx.sdk.models.messaginghostednumberorders.actions.ActionUploadFileResponse;

ActionUploadFileResponse response = client.messagingHostedNumberOrders().actions().uploadFile("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.messaging_profile_id`

## Validate hosted number codes

Validate the verification codes sent to the numbers of the hosted order. The verification codes must be created in the verification codes endpoint.

`client.messagingHostedNumberOrders().validateCodes()` — `POST /messaging_hosted_number_orders/{id}/validation_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `verificationCodes` | array[object] | Yes |  |
| `id` | string (UUID) | Yes | Order ID related to the validation codes. |

```java
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderValidateCodesParams;
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderValidateCodesResponse;

MessagingHostedNumberOrderValidateCodesParams params = MessagingHostedNumberOrderValidateCodesParams.builder()
    .id("550e8400-e29b-41d4-a716-446655440000")
    .addVerificationCode(MessagingHostedNumberOrderValidateCodesParams.VerificationCode.builder()
        .code("code")
        .phoneNumber("+13125550001")
        .build())
    .build();
MessagingHostedNumberOrderValidateCodesResponse response = client.messagingHostedNumberOrders().validateCodes(params);
```

Key response fields: `response.data.order_id, response.data.phone_numbers`

## Create hosted number verification codes

Create verification codes to validate numbers of the hosted order. The verification codes will be sent to the numbers of the hosted order.

`client.messagingHostedNumberOrders().createVerificationCodes()` — `POST /messaging_hosted_number_orders/{id}/verification_codes`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumbers` | array[string] | Yes |  |
| `verificationMethod` | enum (sms, call) | Yes |  |
| `id` | string (UUID) | Yes | Order ID to have a verification code created. |

```java
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderCreateVerificationCodesParams;
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderCreateVerificationCodesResponse;

MessagingHostedNumberOrderCreateVerificationCodesParams params = MessagingHostedNumberOrderCreateVerificationCodesParams.builder()
    .id("550e8400-e29b-41d4-a716-446655440000")
    .addPhoneNumber("string")
    .verificationMethod(MessagingHostedNumberOrderCreateVerificationCodesParams.VerificationMethod.SMS)
    .build();
MessagingHostedNumberOrderCreateVerificationCodesResponse response = client.messagingHostedNumberOrders().createVerificationCodes(params);
```

Key response fields: `response.data.phone_number, response.data.type, response.data.error`

## Delete a messaging hosted number

`client.messagingHostedNumbers().delete()` — `DELETE /messaging_hosted_numbers/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Identifies the type of resource. |

```java
import com.telnyx.sdk.models.messaginghostednumbers.MessagingHostedNumberDeleteParams;
import com.telnyx.sdk.models.messaginghostednumbers.MessagingHostedNumberDeleteResponse;

MessagingHostedNumberDeleteResponse messagingHostedNumber = client.messagingHostedNumbers().delete("550e8400-e29b-41d4-a716-446655440000");
```

Key response fields: `response.data.id, response.data.status, response.data.messaging_profile_id`

## List Verification Requests

Get a list of previously-submitted tollfree verification requests

`client.messagingTollfree().verification().requests().list()` — `GET /messaging_tollfree/verification/requests`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | enum (Verified, Rejected, Waiting For Vendor, Waiting For Customer, Waiting For Telnyx, ...) | No | Tollfree verification status |
| `dateStart` | string (date-time) | No |  |
| `dateEnd` | string (date-time) | No |  |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.messagingtollfree.verification.requests.RequestListPage;
import com.telnyx.sdk.models.messagingtollfree.verification.requests.RequestListParams;

RequestListParams params = RequestListParams.builder()
    .page(1L)
    .pageSize(1L)
    .build();
RequestListPage page = client.messagingTollfree().verification().requests().list(params);
```

Key response fields: `response.data.records, response.data.total_records`

## Submit Verification Request

Submit a new tollfree verification request

`client.messagingTollfree().verification().requests().create()` — `POST /messaging_tollfree/verification/requests`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `businessName` | string | Yes | Name of the business; there are no specific formatting requi... |
| `corporateWebsite` | string | Yes | A URL, including the scheme, pointing to the corporate websi... |
| `businessAddr1` | string | Yes | Line 1 of the business address |
| `businessCity` | string | Yes | The city of the business address; the first letter should be... |
| `businessState` | string | Yes | The full name of the state (not the 2 letter code) of the bu... |
| `businessZip` | string | Yes | The ZIP code of the business address |
| `businessContactFirstName` | string | Yes | First name of the business contact; there are no specific re... |
| `businessContactLastName` | string | Yes | Last name of the business contact; there are no specific req... |
| `businessContactEmail` | string | Yes | The email address of the business contact |
| `businessContactPhone` | string | Yes | The phone number of the business contact in E.164 format |
| `messageVolume` | object | Yes | Estimated monthly volume of messages from the given phone nu... |
| `phoneNumbers` | array[object] | Yes | The phone numbers to request the verification of |
| `useCase` | object | Yes | Machine-readable use-case for the phone numbers |
| `useCaseSummary` | string | Yes | Human-readable summary of the desired use-case |
| `productionMessageContent` | string | Yes | An example of a message that will be sent from the given pho... |
| `optInWorkflow` | string | Yes | Human-readable description of how end users will opt into re... |
| `optInWorkflowImageURLs` | array[object] | Yes | Images showing the opt-in workflow |
| `additionalInformation` | string | Yes | Any additional information |
| `businessAddr2` | string | No | Line 2 of the business address |
| `isvReseller` | string | No | ISV name |
| `webhookUrl` | string | No | URL that should receive webhooks relating to this verificati... |
| ... | | | +12 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.messagingtollfree.verification.requests.RequestCreateParams;
import com.telnyx.sdk.models.messagingtollfree.verification.requests.TfPhoneNumber;
import com.telnyx.sdk.models.messagingtollfree.verification.requests.TfVerificationRequest;
import com.telnyx.sdk.models.messagingtollfree.verification.requests.Url;
import com.telnyx.sdk.models.messagingtollfree.verification.requests.UseCaseCategories;
import com.telnyx.sdk.models.messagingtollfree.verification.requests.VerificationRequestEgress;
import com.telnyx.sdk.models.messagingtollfree.verification.requests.Volume;

TfVerificationRequest params = TfVerificationRequest.builder()
    .additionalInformation("Additional context for this request.")
    .businessAddr1("600 Congress Avenue")
    .businessCity("Austin")
    .businessContactEmail("email@example.com")
    .businessContactFirstName("John")
    .businessContactLastName("Doe")
    .businessContactPhone("+18005550100")
    .businessName("Telnyx LLC")
    .businessState("Texas")
    .businessZip("78701")
    .corporateWebsite("http://example.com")
    .messageVolume(Volume.V_100000)
    .optInWorkflow("User signs into the Telnyx portal, enters a number and is prompted to select whether they want to use 2FA verification for security purposes. If they've opted in a confirmation message is sent out to the handset")
    .addOptInWorkflowImageUrl(Url.builder()
        .url("https://telnyx.com/sign-up")
        .build())
    .addOptInWorkflowImageUrl(Url.builder()
        .url("https://telnyx.com/company/data-privacy")
        .build())
    .addPhoneNumber(TfPhoneNumber.builder()
        .phoneNumber("+18773554398")
        .build())
    .addPhoneNumber(TfPhoneNumber.builder()
        .phoneNumber("+18773554399")
        .build())
    .productionMessageContent("Your Telnyx OTP is XXXX")
    .useCase(UseCaseCategories.TWO_FA)
    .useCaseSummary("This is a use case where Telnyx sends out 2FA codes to portal users to verify their identity in order to sign into the portal")
    .build();
VerificationRequestEgress verificationRequestEgress = client.messagingTollfree().verification().requests().create(params);
```

Key response fields: `response.data.id, response.data.additionalInformation, response.data.ageGatedContent`

## Get Verification Request

Get a single verification request by its ID.

`client.messagingTollfree().verification().requests().retrieve()` — `GET /messaging_tollfree/verification/requests/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.messagingtollfree.verification.requests.RequestRetrieveParams;
import com.telnyx.sdk.models.messagingtollfree.verification.requests.VerificationRequestStatus;

VerificationRequestStatus verificationRequestStatus = client.messagingTollfree().verification().requests().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.id, response.data.additionalInformation, response.data.ageGatedContent`

## Update Verification Request

Update an existing tollfree verification request. This is particularly useful when there are pending customer actions to be taken.

`client.messagingTollfree().verification().requests().update()` — `PATCH /messaging_tollfree/verification/requests/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `businessName` | string | Yes | Name of the business; there are no specific formatting requi... |
| `corporateWebsite` | string | Yes | A URL, including the scheme, pointing to the corporate websi... |
| `businessAddr1` | string | Yes | Line 1 of the business address |
| `businessCity` | string | Yes | The city of the business address; the first letter should be... |
| `businessState` | string | Yes | The full name of the state (not the 2 letter code) of the bu... |
| `businessZip` | string | Yes | The ZIP code of the business address |
| `businessContactFirstName` | string | Yes | First name of the business contact; there are no specific re... |
| `businessContactLastName` | string | Yes | Last name of the business contact; there are no specific req... |
| `businessContactEmail` | string | Yes | The email address of the business contact |
| `businessContactPhone` | string | Yes | The phone number of the business contact in E.164 format |
| `messageVolume` | object | Yes | Estimated monthly volume of messages from the given phone nu... |
| `phoneNumbers` | array[object] | Yes | The phone numbers to request the verification of |
| `useCase` | object | Yes | Machine-readable use-case for the phone numbers |
| `useCaseSummary` | string | Yes | Human-readable summary of the desired use-case |
| `productionMessageContent` | string | Yes | An example of a message that will be sent from the given pho... |
| `optInWorkflow` | string | Yes | Human-readable description of how end users will opt into re... |
| `optInWorkflowImageURLs` | array[object] | Yes | Images showing the opt-in workflow |
| `additionalInformation` | string | Yes | Any additional information |
| `id` | string (UUID) | Yes |  |
| `businessAddr2` | string | No | Line 2 of the business address |
| `isvReseller` | string | No | ISV name |
| `webhookUrl` | string | No | URL that should receive webhooks relating to this verificati... |
| ... | | | +12 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.messagingtollfree.verification.requests.RequestUpdateParams;
import com.telnyx.sdk.models.messagingtollfree.verification.requests.TfPhoneNumber;
import com.telnyx.sdk.models.messagingtollfree.verification.requests.TfVerificationRequest;
import com.telnyx.sdk.models.messagingtollfree.verification.requests.Url;
import com.telnyx.sdk.models.messagingtollfree.verification.requests.UseCaseCategories;
import com.telnyx.sdk.models.messagingtollfree.verification.requests.VerificationRequestEgress;
import com.telnyx.sdk.models.messagingtollfree.verification.requests.Volume;

RequestUpdateParams params = RequestUpdateParams.builder()
    .id("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .tfVerificationRequest(TfVerificationRequest.builder()
        .additionalInformation("Additional context for this request.")
        .businessAddr1("600 Congress Avenue")
        .businessCity("Austin")
        .businessContactEmail("email@example.com")
        .businessContactFirstName("John")
        .businessContactLastName("Doe")
        .businessContactPhone("+18005550100")
        .businessName("Telnyx LLC")
        .businessState("Texas")
        .businessZip("78701")
        .corporateWebsite("http://example.com")
        .messageVolume(Volume.V_100000)
        .optInWorkflow("User signs into the Telnyx portal, enters a number and is prompted to select whether they want to use 2FA verification for security purposes. If they've opted in a confirmation message is sent out to the handset")
        .addOptInWorkflowImageUrl(Url.builder()
            .url("https://telnyx.com/sign-up")
            .build())
        .addOptInWorkflowImageUrl(Url.builder()
            .url("https://telnyx.com/company/data-privacy")
            .build())
        .addPhoneNumber(TfPhoneNumber.builder()
            .phoneNumber("+18773554398")
            .build())
        .addPhoneNumber(TfPhoneNumber.builder()
            .phoneNumber("+18773554399")
            .build())
        .productionMessageContent("Your Telnyx OTP is XXXX")
        .useCase(UseCaseCategories.TWO_FA)
        .useCaseSummary("This is a use case where Telnyx sends out 2FA codes to portal users to verify their identity in order to sign into the portal")
        .build())
    .build();
VerificationRequestEgress verificationRequestEgress = client.messagingTollfree().verification().requests().update(params);
```

Key response fields: `response.data.id, response.data.additionalInformation, response.data.ageGatedContent`

## Delete Verification Request

Delete a verification request

A request may only be deleted when when the request is in the "rejected" state. * `HTTP 200`: request successfully deleted
* `HTTP 400`: request exists but can't be deleted (i.e. not rejected)
* `HTTP 404`: request unknown or already deleted

`client.messagingTollfree().verification().requests().delete()` — `DELETE /messaging_tollfree/verification/requests/{id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.messagingtollfree.verification.requests.RequestDeleteParams;

client.messagingTollfree().verification().requests().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## Get Verification Request Status History

Get the history of status changes for a verification request. Returns a paginated list of historical status changes including the reason for each change and when it occurred.

`client.messagingTollfree().verification().requests().retrieveStatusHistory()` — `GET /messaging_tollfree/verification/requests/{id}/status_history`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.messagingtollfree.verification.requests.RequestRetrieveStatusHistoryParams;
import com.telnyx.sdk.models.messagingtollfree.verification.requests.RequestRetrieveStatusHistoryResponse;

RequestRetrieveStatusHistoryParams params = RequestRetrieveStatusHistoryParams.builder()
    .id("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .pageNumber(1L)
    .pageSize(1L)
    .build();
RequestRetrieveStatusHistoryResponse response = client.messagingTollfree().verification().requests().retrieveStatusHistory(params);
```

Key response fields: `response.data.records, response.data.total_records`

## List messaging URL domains

`client.messagingUrlDomains().list()` — `GET /messaging_url_domains`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | object | No | Consolidated page parameter (deepObject style). |

```java
import com.telnyx.sdk.models.messagingurldomains.MessagingUrlDomainListPage;
import com.telnyx.sdk.models.messagingurldomains.MessagingUrlDomainListParams;

MessagingUrlDomainListPage page = client.messagingUrlDomains().list();
```

Key response fields: `response.data.id, response.data.record_type, response.data.url_domain`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
