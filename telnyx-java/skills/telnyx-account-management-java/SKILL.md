---
name: telnyx-account-management-java
description: >-
  Manage sub-accounts for reseller and enterprise scenarios. This skill provides
  Java SDK examples.
metadata:
  author: telnyx
  product: account-management
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Account Management - Java

## Installation

```text
<!-- Maven -->
<dependency>
    <groupId>com.telnyx.sdk</groupId>
    <artifactId>telnyx</artifactId>
    <version>6.36.0</version>
</dependency>

// Gradle
implementation("com.telnyx.sdk:telnyx:6.36.0")
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
    var result = client.messages().send(params);
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

## Lists accounts managed by the current user.

Lists the accounts managed by the current user. Users need to be explictly approved by Telnyx in order to become manager accounts.

`GET /managed_accounts`

```java
import com.telnyx.sdk.models.managedaccounts.ManagedAccountListPage;
import com.telnyx.sdk.models.managedaccounts.ManagedAccountListParams;

ManagedAccountListPage page = client.managedAccounts().list();
```

Returns: `api_user` (string), `created_at` (string), `email` (email), `id` (uuid), `managed_account_allow_custom_pricing` (boolean), `manager_account_id` (string), `organization_name` (string), `record_type` (enum: managed_account), `rollup_billing` (boolean), `updated_at` (string)

## Create a new managed account.

Create a new managed account owned by the authenticated user. You need to be explictly approved by Telnyx in order to become a manager account.

`POST /managed_accounts` — Required: `business_name`

Optional: `email` (string), `managed_account_allow_custom_pricing` (boolean), `password` (string), `rollup_billing` (boolean)

```java
import com.telnyx.sdk.models.managedaccounts.ManagedAccountCreateParams;
import com.telnyx.sdk.models.managedaccounts.ManagedAccountCreateResponse;

ManagedAccountCreateParams params = ManagedAccountCreateParams.builder()
    .businessName("Larry's Cat Food Inc")
    .build();
ManagedAccountCreateResponse managedAccount = client.managedAccounts().create(params);
```

Returns: `api_key` (string), `api_token` (string), `api_user` (string), `balance` (object), `created_at` (string), `email` (email), `id` (uuid), `managed_account_allow_custom_pricing` (boolean), `manager_account_id` (string), `organization_name` (string), `record_type` (enum: managed_account), `rollup_billing` (boolean), `updated_at` (string)

## Display information about allocatable global outbound channels for the current user.

Display information about allocatable global outbound channels for the current user. Only usable by account managers.

`GET /managed_accounts/allocatable_global_outbound_channels`

```java
import com.telnyx.sdk.models.managedaccounts.ManagedAccountGetAllocatableGlobalOutboundChannelsParams;
import com.telnyx.sdk.models.managedaccounts.ManagedAccountGetAllocatableGlobalOutboundChannelsResponse;

ManagedAccountGetAllocatableGlobalOutboundChannelsResponse response = client.managedAccounts().getAllocatableGlobalOutboundChannels();
```

Returns: `allocatable_global_outbound_channels` (integer), `managed_account_allow_custom_pricing` (boolean), `record_type` (string), `total_global_channels_allocated` (integer)

## Retrieve a managed account

Retrieves the details of a single managed account.

`GET /managed_accounts/{id}`

```java
import com.telnyx.sdk.models.managedaccounts.ManagedAccountRetrieveParams;
import com.telnyx.sdk.models.managedaccounts.ManagedAccountRetrieveResponse;

ManagedAccountRetrieveResponse managedAccount = client.managedAccounts().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Returns: `api_key` (string), `api_token` (string), `api_user` (string), `balance` (object), `created_at` (string), `email` (email), `id` (uuid), `managed_account_allow_custom_pricing` (boolean), `manager_account_id` (string), `organization_name` (string), `record_type` (enum: managed_account), `rollup_billing` (boolean), `updated_at` (string)

## Update a managed account

Update a single managed account.

`PATCH /managed_accounts/{id}`

Optional: `managed_account_allow_custom_pricing` (boolean)

```java
import com.telnyx.sdk.models.managedaccounts.ManagedAccountUpdateParams;
import com.telnyx.sdk.models.managedaccounts.ManagedAccountUpdateResponse;

ManagedAccountUpdateResponse managedAccount = client.managedAccounts().update("550e8400-e29b-41d4-a716-446655440000");
```

Returns: `api_key` (string), `api_token` (string), `api_user` (string), `balance` (object), `created_at` (string), `email` (email), `id` (uuid), `managed_account_allow_custom_pricing` (boolean), `manager_account_id` (string), `organization_name` (string), `record_type` (enum: managed_account), `rollup_billing` (boolean), `updated_at` (string)

## Disables a managed account

Disables a managed account, forbidding it to use Telnyx services, including sending or receiving phone calls and SMS messages. Ongoing phone calls will not be affected. The managed account and its sub-users will no longer be able to log in via the mission control portal.

`POST /managed_accounts/{id}/actions/disable`

```java
import com.telnyx.sdk.models.managedaccounts.actions.ActionDisableParams;
import com.telnyx.sdk.models.managedaccounts.actions.ActionDisableResponse;

ActionDisableResponse response = client.managedAccounts().actions().disable("550e8400-e29b-41d4-a716-446655440000");
```

Returns: `api_key` (string), `api_token` (string), `api_user` (string), `balance` (object), `created_at` (string), `email` (email), `id` (uuid), `managed_account_allow_custom_pricing` (boolean), `manager_account_id` (string), `organization_name` (string), `record_type` (enum: managed_account), `rollup_billing` (boolean), `updated_at` (string)

## Enables a managed account

Enables a managed account and its sub-users to use Telnyx services.

`POST /managed_accounts/{id}/actions/enable`

Optional: `reenable_all_connections` (boolean)

```java
import com.telnyx.sdk.models.managedaccounts.actions.ActionEnableParams;
import com.telnyx.sdk.models.managedaccounts.actions.ActionEnableResponse;

ActionEnableResponse response = client.managedAccounts().actions().enable("550e8400-e29b-41d4-a716-446655440000");
```

Returns: `api_key` (string), `api_token` (string), `api_user` (string), `balance` (object), `created_at` (string), `email` (email), `id` (uuid), `managed_account_allow_custom_pricing` (boolean), `manager_account_id` (string), `organization_name` (string), `record_type` (enum: managed_account), `rollup_billing` (boolean), `updated_at` (string)

## Update the amount of allocatable global outbound channels allocated to a specific managed account.

`PATCH /managed_accounts/{id}/update_global_channel_limit`

Optional: `channel_limit` (integer)

```java
import com.telnyx.sdk.models.managedaccounts.ManagedAccountUpdateGlobalChannelLimitParams;
import com.telnyx.sdk.models.managedaccounts.ManagedAccountUpdateGlobalChannelLimitResponse;

ManagedAccountUpdateGlobalChannelLimitResponse response = client.managedAccounts().updateGlobalChannelLimit("550e8400-e29b-41d4-a716-446655440000");
```

Returns: `channel_limit` (integer), `email` (string), `id` (string), `manager_account_id` (string), `record_type` (string)

## List organization users

Returns a list of the users in your organization.

`GET /organizations/users`

```java
import com.telnyx.sdk.models.organizations.users.UserListPage;
import com.telnyx.sdk.models.organizations.users.UserListParams;

UserListPage page = client.organizations().users().list();
```

Returns: `created_at` (string), `email` (email), `groups` (array[object]), `id` (string), `last_sign_in_at` (string | null), `organization_user_bypasses_sso` (boolean), `record_type` (string), `user_status` (enum: enabled, disabled, blocked)

## Get organization users groups report

Returns a report of all users in your organization with their group memberships. This endpoint returns all users without pagination and always includes group information. The report can be retrieved in JSON or CSV format by sending specific content-type headers.

`GET /organizations/users/users_groups_report`

```java
import com.telnyx.sdk.models.organizations.users.UserGetGroupsReportParams;
import com.telnyx.sdk.models.organizations.users.UserGetGroupsReportResponse;

UserGetGroupsReportResponse response = client.organizations().users().getGroupsReport();
```

Returns: `created_at` (string), `email` (email), `groups` (array[object]), `id` (string), `last_sign_in_at` (string | null), `organization_user_bypasses_sso` (boolean), `record_type` (string), `user_status` (enum: enabled, disabled, blocked)

## Get organization user

Returns a user in your organization.

`GET /organizations/users/{id}`

```java
import com.telnyx.sdk.models.organizations.users.UserRetrieveParams;
import com.telnyx.sdk.models.organizations.users.UserRetrieveResponse;

UserRetrieveResponse user = client.organizations().users().retrieve("550e8400-e29b-41d4-a716-446655440000");
```

Returns: `created_at` (string), `email` (email), `groups` (array[object]), `id` (string), `last_sign_in_at` (string | null), `organization_user_bypasses_sso` (boolean), `record_type` (string), `user_status` (enum: enabled, disabled, blocked)

## Delete organization user

Deletes a user in your organization.

`POST /organizations/users/{id}/actions/remove`

```java
import com.telnyx.sdk.models.organizations.users.actions.ActionRemoveParams;
import com.telnyx.sdk.models.organizations.users.actions.ActionRemoveResponse;

ActionRemoveResponse action = client.organizations().users().actions().remove("550e8400-e29b-41d4-a716-446655440000");
```

Returns: `created_at` (string), `email` (email), `groups` (array[object]), `id` (string), `last_sign_in_at` (string | null), `organization_user_bypasses_sso` (boolean), `record_type` (string), `user_status` (enum: enabled, disabled, blocked)
