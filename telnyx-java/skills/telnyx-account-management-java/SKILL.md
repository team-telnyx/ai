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
// See https://github.com/team-telnyx/telnyx-java for Maven/Gradle setup
```

## Setup

```java
import com.telnyx.sdk.client.TelnyxClient;
import com.telnyx.sdk.client.okhttp.TelnyxOkHttpClient;

TelnyxClient client = TelnyxOkHttpClient.fromEnv();
```

All examples below assume `client` is already initialized as shown above.

## Lists accounts managed by the current user.

Lists the accounts managed by the current user.

`GET /managed_accounts`

```java
import com.telnyx.sdk.models.managedaccounts.ManagedAccountListPage;
import com.telnyx.sdk.models.managedaccounts.ManagedAccountListParams;

ManagedAccountListPage page = client.managedAccounts().list();
```

## Create a new managed account.

Create a new managed account owned by the authenticated user.

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

## Display information about allocatable global outbound channels for the current user.

`GET /managed_accounts/allocatable_global_outbound_channels`

```java
import com.telnyx.sdk.models.managedaccounts.ManagedAccountGetAllocatableGlobalOutboundChannelsParams;
import com.telnyx.sdk.models.managedaccounts.ManagedAccountGetAllocatableGlobalOutboundChannelsResponse;

ManagedAccountGetAllocatableGlobalOutboundChannelsResponse response = client.managedAccounts().getAllocatableGlobalOutboundChannels();
```

## Retrieve a managed account

Retrieves the details of a single managed account.

`GET /managed_accounts/{id}`

```java
import com.telnyx.sdk.models.managedaccounts.ManagedAccountRetrieveParams;
import com.telnyx.sdk.models.managedaccounts.ManagedAccountRetrieveResponse;

ManagedAccountRetrieveResponse managedAccount = client.managedAccounts().retrieve("id");
```

## Update a managed account

Update a single managed account.

`PATCH /managed_accounts/{id}`

Optional: `managed_account_allow_custom_pricing` (boolean)

```java
import com.telnyx.sdk.models.managedaccounts.ManagedAccountUpdateParams;
import com.telnyx.sdk.models.managedaccounts.ManagedAccountUpdateResponse;

ManagedAccountUpdateResponse managedAccount = client.managedAccounts().update("id");
```

## Disables a managed account

Disables a managed account, forbidding it to use Telnyx services, including sending or receiving phone calls and SMS messages.

`POST /managed_accounts/{id}/actions/disable`

```java
import com.telnyx.sdk.models.managedaccounts.actions.ActionDisableParams;
import com.telnyx.sdk.models.managedaccounts.actions.ActionDisableResponse;

ActionDisableResponse response = client.managedAccounts().actions().disable("id");
```

## Enables a managed account

Enables a managed account and its sub-users to use Telnyx services.

`POST /managed_accounts/{id}/actions/enable`

Optional: `reenable_all_connections` (boolean)

```java
import com.telnyx.sdk.models.managedaccounts.actions.ActionEnableParams;
import com.telnyx.sdk.models.managedaccounts.actions.ActionEnableResponse;

ActionEnableResponse response = client.managedAccounts().actions().enable("id");
```

## Update the amount of allocatable global outbound channels allocated to a specific managed account.

`PATCH /managed_accounts/{id}/update_global_channel_limit`

Optional: `channel_limit` (integer)

```java
import com.telnyx.sdk.models.managedaccounts.ManagedAccountUpdateGlobalChannelLimitParams;
import com.telnyx.sdk.models.managedaccounts.ManagedAccountUpdateGlobalChannelLimitResponse;

ManagedAccountUpdateGlobalChannelLimitResponse response = client.managedAccounts().updateGlobalChannelLimit("id");
```

## List organization users

Returns a list of the users in your organization.

`GET /organizations/users`

```java
import com.telnyx.sdk.models.organizations.users.UserListPage;
import com.telnyx.sdk.models.organizations.users.UserListParams;

UserListPage page = client.organizations().users().list();
```

## Get organization users groups report

Returns a report of all users in your organization with their group memberships.

`GET /organizations/users/users_groups_report`

```java
import com.telnyx.sdk.models.organizations.users.UserGetGroupsReportParams;
import com.telnyx.sdk.models.organizations.users.UserGetGroupsReportResponse;

UserGetGroupsReportResponse response = client.organizations().users().getGroupsReport();
```

## Get organization user

Returns a user in your organization.

`GET /organizations/users/{id}`

```java
import com.telnyx.sdk.models.organizations.users.UserRetrieveParams;
import com.telnyx.sdk.models.organizations.users.UserRetrieveResponse;

UserRetrieveResponse user = client.organizations().users().retrieve("id");
```

## Delete organization user

Deletes a user in your organization.

`POST /organizations/users/{id}/actions/remove`

```java
import com.telnyx.sdk.models.organizations.users.actions.ActionRemoveParams;
import com.telnyx.sdk.models.organizations.users.actions.ActionRemoveResponse;

ActionRemoveResponse action = client.organizations().users().actions().remove("id");
```
