# WebRTC (Go) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** List mobile push credentials, Creates a new mobile push credential, Retrieves a mobile push credential

| Field | Type |
|-------|------|
| `alias` | string |
| `certificate` | string |
| `created_at` | date-time |
| `id` | string |
| `private_key` | string |
| `project_account_json_file` | object |
| `record_type` | string |
| `type` | string |
| `updated_at` | date-time |

**Returned by:** List all credentials, Create a credential, Get a credential, Update a credential, Delete a credential

| Field | Type |
|-------|------|
| `created_at` | string |
| `expired` | boolean |
| `expires_at` | string |
| `id` | string |
| `name` | string |
| `record_type` | string |
| `resource_id` | string |
| `sip_password` | string |
| `sip_username` | string |
| `updated_at` | string |
| `user_id` | string |

## Optional Parameters

### Create a credential — `client.TelephonyCredentials.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Name` | string |  |
| `Tag` | string | Tags a credential. |
| `ExpiresAt` | string | ISO-8601 formatted date indicating when the credential will expire. |

### Update a credential — `client.TelephonyCredentials.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Name` | string |  |
| `Tag` | string | Tags a credential. |
| `ConnectionId` | string (UUID) | Identifies the Credential Connection this credential is associated with. |
| `ExpiresAt` | string | ISO-8601 formatted date indicating when the credential will expire. |
