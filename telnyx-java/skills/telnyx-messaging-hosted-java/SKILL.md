---
name: telnyx-messaging-hosted-java
description: >-
  Set up hosted SMS numbers, toll-free verification, and RCS messaging. Use when
  migrating numbers or enabling rich messaging features. This skill provides
  Java SDK examples.
metadata:
  author: telnyx
  product: messaging-hosted
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Messaging Hosted - Java

## Installation

```text
// See https://github.com/team-telnyx/telnyx-java for Maven/Gradle setup
```

## Setup

```java
import com.telnyx.sdk.client.TelnyxClient;
import com.telnyx.sdk.client.okhttp.TelnyxOkHttpClient;

TelnyxClient client = TelnyxOkHttpClient.fromEnv();
```

All examples below assume `client` is already initialized as shown above.

## Send an RCS message

`POST /messages/rcs` — Required: `agent_id`, `to`, `messaging_profile_id`, `agent_message`

Optional: `mms_fallback` (object), `sms_fallback` (object), `type` (enum), `webhook_url` (url)

```java
import com.telnyx.sdk.models.messages.RcsAgentMessage;
import com.telnyx.sdk.models.messages.rcs.RcSendParams;
import com.telnyx.sdk.models.messages.rcs.RcSendResponse;

RcSendParams params = RcSendParams.builder()
    .agentId("Agent007")
    .agentMessage(RcsAgentMessage.builder().build())
    .messagingProfileId("messaging_profile_id")
    .to("+13125551234")
    .build();
RcSendResponse response = client.messages().rcs().send(params);
```

## Generate RCS deeplink

Generate a deeplink URL that can be used to start an RCS conversation with a specific agent.

`GET /messages/rcs/deeplinks/{agent_id}`

```java
import com.telnyx.sdk.models.messages.rcs.RcGenerateDeeplinkParams;
import com.telnyx.sdk.models.messages.rcs.RcGenerateDeeplinkResponse;

RcGenerateDeeplinkResponse response = client.messages().rcs().generateDeeplink("agent_id");
```

## List all RCS agents

`GET /messaging/rcs/agents`

```java
import com.telnyx.sdk.models.messaging.rcs.agents.AgentListPage;
import com.telnyx.sdk.models.messaging.rcs.agents.AgentListParams;

AgentListPage page = client.messaging().rcs().agents().list();
```

## Retrieve an RCS agent

`GET /messaging/rcs/agents/{id}`

```java
import com.telnyx.sdk.models.messaging.rcs.agents.AgentRetrieveParams;
import com.telnyx.sdk.models.rcsagents.RcsAgentResponse;

RcsAgentResponse rcsAgentResponse = client.messaging().rcs().agents().retrieve("id");
```

## Modify an RCS agent

`PATCH /messaging/rcs/agents/{id}`

Optional: `profile_id` (uuid), `webhook_failover_url` (url), `webhook_url` (url)

```java
import com.telnyx.sdk.models.messaging.rcs.agents.AgentUpdateParams;
import com.telnyx.sdk.models.rcsagents.RcsAgentResponse;

RcsAgentResponse rcsAgentResponse = client.messaging().rcs().agents().update("id");
```

## Check RCS capabilities (batch)

`POST /messaging/rcs/bulk_capabilities` — Required: `agent_id`, `phone_numbers`

```java
import com.telnyx.sdk.models.messaging.rcs.RcListBulkCapabilitiesParams;
import com.telnyx.sdk.models.messaging.rcs.RcListBulkCapabilitiesResponse;

RcListBulkCapabilitiesParams params = RcListBulkCapabilitiesParams.builder()
    .agentId("TestAgent")
    .addPhoneNumber("+13125551234")
    .build();
RcListBulkCapabilitiesResponse response = client.messaging().rcs().listBulkCapabilities(params);
```

## Check RCS capabilities

`GET /messaging/rcs/capabilities/{agent_id}/{phone_number}`

```java
import com.telnyx.sdk.models.messaging.rcs.RcRetrieveCapabilitiesParams;
import com.telnyx.sdk.models.messaging.rcs.RcRetrieveCapabilitiesResponse;

RcRetrieveCapabilitiesParams params = RcRetrieveCapabilitiesParams.builder()
    .agentId("agent_id")
    .phoneNumber("phone_number")
    .build();
RcRetrieveCapabilitiesResponse response = client.messaging().rcs().retrieveCapabilities(params);
```

## Add RCS test number

Adds a test phone number to an RCS agent for testing purposes.

`PUT /messaging/rcs/test_number_invite/{id}/{phone_number}`

```java
import com.telnyx.sdk.models.messaging.rcs.RcInviteTestNumberParams;
import com.telnyx.sdk.models.messaging.rcs.RcInviteTestNumberResponse;

RcInviteTestNumberParams params = RcInviteTestNumberParams.builder()
    .id("id")
    .phoneNumber("phone_number")
    .build();
RcInviteTestNumberResponse response = client.messaging().rcs().inviteTestNumber(params);
```

## List messaging hosted number orders

`GET /messaging_hosted_number_orders`

```java
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderListPage;
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderListParams;

MessagingHostedNumberOrderListPage page = client.messagingHostedNumberOrders().list();
```

## Create a messaging hosted number order

`POST /messaging_hosted_number_orders`

Optional: `messaging_profile_id` (string), `phone_numbers` (array[string])

```java
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderCreateParams;
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderCreateResponse;

MessagingHostedNumberOrderCreateResponse messagingHostedNumberOrder = client.messagingHostedNumberOrders().create();
```

## Check hosted messaging eligibility

`POST /messaging_hosted_number_orders/eligibility_numbers_check` — Required: `phone_numbers`

```java
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderCheckEligibilityParams;
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderCheckEligibilityResponse;

MessagingHostedNumberOrderCheckEligibilityParams params = MessagingHostedNumberOrderCheckEligibilityParams.builder()
    .addPhoneNumber("string")
    .build();
MessagingHostedNumberOrderCheckEligibilityResponse response = client.messagingHostedNumberOrders().checkEligibility(params);
```

## Retrieve a messaging hosted number order

`GET /messaging_hosted_number_orders/{id}`

```java
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderRetrieveParams;
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderRetrieveResponse;

MessagingHostedNumberOrderRetrieveResponse messagingHostedNumberOrder = client.messagingHostedNumberOrders().retrieve("id");
```

## Delete a messaging hosted number order

Delete a messaging hosted number order and all associated phone numbers.

`DELETE /messaging_hosted_number_orders/{id}`

```java
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderDeleteParams;
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderDeleteResponse;

MessagingHostedNumberOrderDeleteResponse messagingHostedNumberOrder = client.messagingHostedNumberOrders().delete("id");
```

## Upload hosted number document

`POST /messaging_hosted_number_orders/{id}/actions/file_upload`

```java
import com.telnyx.sdk.models.messaginghostednumberorders.actions.ActionUploadFileParams;
import com.telnyx.sdk.models.messaginghostednumberorders.actions.ActionUploadFileResponse;

ActionUploadFileResponse response = client.messagingHostedNumberOrders().actions().uploadFile("id");
```

## Validate hosted number codes

Validate the verification codes sent to the numbers of the hosted order.

`POST /messaging_hosted_number_orders/{id}/validation_codes` — Required: `verification_codes`

```java
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderValidateCodesParams;
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderValidateCodesResponse;

MessagingHostedNumberOrderValidateCodesParams params = MessagingHostedNumberOrderValidateCodesParams.builder()
    .id("id")
    .addVerificationCode(MessagingHostedNumberOrderValidateCodesParams.VerificationCode.builder()
        .code("code")
        .phoneNumber("phone_number")
        .build())
    .build();
MessagingHostedNumberOrderValidateCodesResponse response = client.messagingHostedNumberOrders().validateCodes(params);
```

## Create hosted number verification codes

Create verification codes to validate numbers of the hosted order.

`POST /messaging_hosted_number_orders/{id}/verification_codes` — Required: `phone_numbers`, `verification_method`

```java
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderCreateVerificationCodesParams;
import com.telnyx.sdk.models.messaginghostednumberorders.MessagingHostedNumberOrderCreateVerificationCodesResponse;

MessagingHostedNumberOrderCreateVerificationCodesParams params = MessagingHostedNumberOrderCreateVerificationCodesParams.builder()
    .id("id")
    .addPhoneNumber("string")
    .verificationMethod(MessagingHostedNumberOrderCreateVerificationCodesParams.VerificationMethod.SMS)
    .build();
MessagingHostedNumberOrderCreateVerificationCodesResponse response = client.messagingHostedNumberOrders().createVerificationCodes(params);
```

## Delete a messaging hosted number

`DELETE /messaging_hosted_numbers/{id}`

```java
import com.telnyx.sdk.models.messaginghostednumbers.MessagingHostedNumberDeleteParams;
import com.telnyx.sdk.models.messaginghostednumbers.MessagingHostedNumberDeleteResponse;

MessagingHostedNumberDeleteResponse messagingHostedNumber = client.messagingHostedNumbers().delete("id");
```

## List Verification Requests

Get a list of previously-submitted tollfree verification requests

`GET /messaging_tollfree/verification/requests`

```java
import com.telnyx.sdk.models.messagingtollfree.verification.requests.RequestListPage;
import com.telnyx.sdk.models.messagingtollfree.verification.requests.RequestListParams;

RequestListParams params = RequestListParams.builder()
    .page(1L)
    .pageSize(1L)
    .build();
RequestListPage page = client.messagingTollfree().verification().requests().list(params);
```

## Submit Verification Request

Submit a new tollfree verification request

`POST /messaging_tollfree/verification/requests` — Required: `businessName`, `corporateWebsite`, `businessAddr1`, `businessCity`, `businessState`, `businessZip`, `businessContactFirstName`, `businessContactLastName`, `businessContactEmail`, `businessContactPhone`, `messageVolume`, `phoneNumbers`, `useCase`, `useCaseSummary`, `productionMessageContent`, `optInWorkflow`, `optInWorkflowImageURLs`, `additionalInformation`

Optional: `ageGatedContent` (boolean), `businessAddr2` (string), `businessRegistrationCountry` (['string', 'null']), `businessRegistrationNumber` (['string', 'null']), `businessRegistrationType` (['string', 'null']), `campaignVerifyAuthorizationToken` (['string', 'null']), `doingBusinessAs` (['string', 'null']), `entityType` (object), `helpMessageResponse` (['string', 'null']), `isvReseller` (['string', 'null']), `optInConfirmationResponse` (['string', 'null']), `optInKeywords` (['string', 'null']), `privacyPolicyURL` (['string', 'null']), `termsAndConditionURL` (['string', 'null']), `webhookUrl` (string)

```java
import com.telnyx.sdk.models.messagingtollfree.verification.requests.RequestCreateParams;
import com.telnyx.sdk.models.messagingtollfree.verification.requests.TfPhoneNumber;
import com.telnyx.sdk.models.messagingtollfree.verification.requests.TfVerificationRequest;
import com.telnyx.sdk.models.messagingtollfree.verification.requests.Url;
import com.telnyx.sdk.models.messagingtollfree.verification.requests.UseCaseCategories;
import com.telnyx.sdk.models.messagingtollfree.verification.requests.VerificationRequestEgress;
import com.telnyx.sdk.models.messagingtollfree.verification.requests.Volume;

TfVerificationRequest params = TfVerificationRequest.builder()
    .additionalInformation("additionalInformation")
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

## Get Verification Request

Get a single verification request by its ID.

`GET /messaging_tollfree/verification/requests/{id}`

```java
import com.telnyx.sdk.models.messagingtollfree.verification.requests.RequestRetrieveParams;
import com.telnyx.sdk.models.messagingtollfree.verification.requests.VerificationRequestStatus;

VerificationRequestStatus verificationRequestStatus = client.messagingTollfree().verification().requests().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## Update Verification Request

Update an existing tollfree verification request.

`PATCH /messaging_tollfree/verification/requests/{id}` — Required: `businessName`, `corporateWebsite`, `businessAddr1`, `businessCity`, `businessState`, `businessZip`, `businessContactFirstName`, `businessContactLastName`, `businessContactEmail`, `businessContactPhone`, `messageVolume`, `phoneNumbers`, `useCase`, `useCaseSummary`, `productionMessageContent`, `optInWorkflow`, `optInWorkflowImageURLs`, `additionalInformation`

Optional: `ageGatedContent` (boolean), `businessAddr2` (string), `businessRegistrationCountry` (['string', 'null']), `businessRegistrationNumber` (['string', 'null']), `businessRegistrationType` (['string', 'null']), `campaignVerifyAuthorizationToken` (['string', 'null']), `doingBusinessAs` (['string', 'null']), `entityType` (object), `helpMessageResponse` (['string', 'null']), `isvReseller` (['string', 'null']), `optInConfirmationResponse` (['string', 'null']), `optInKeywords` (['string', 'null']), `privacyPolicyURL` (['string', 'null']), `termsAndConditionURL` (['string', 'null']), `webhookUrl` (string)

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
        .additionalInformation("additionalInformation")
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

## Delete Verification Request

Delete a verification request

A request may only be deleted when when the request is in the "rejected" state.

`DELETE /messaging_tollfree/verification/requests/{id}`

```java
import com.telnyx.sdk.models.messagingtollfree.verification.requests.RequestDeleteParams;

client.messagingTollfree().verification().requests().delete("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## Get Verification Request Status History

Get the history of status changes for a verification request.

`GET /messaging_tollfree/verification/requests/{id}/status_history`

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

## List messaging URL domains

`GET /messaging_url_domains`

```java
import com.telnyx.sdk.models.messagingurldomains.MessagingUrlDomainListPage;
import com.telnyx.sdk.models.messagingurldomains.MessagingUrlDomainListParams;

MessagingUrlDomainListPage page = client.messagingUrlDomains().list();
```
