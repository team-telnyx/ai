# Storage (curl) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** Get Bucket SSL Certificate, Add SSL Certificate, Remove SSL Certificate

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `id` | string |
| `issued_by` | object |
| `issued_to` | object |
| `valid_from` | date-time |
| `valid_to` | date-time |

**Returned by:** Get API Usage

| Field | Type |
|-------|------|
| `categories` | array[object] |
| `timestamp` | date-time |
| `total` | object |

**Returned by:** Get Bucket Usage

| Field | Type |
|-------|------|
| `num_objects` | integer |
| `size` | integer |
| `size_kb` | integer |
| `timestamp` | date-time |

**Returned by:** Create Presigned Object URL

| Field | Type |
|-------|------|
| `content` | object |

## Optional Parameters

### Create Presigned Object URL

| Parameter | Type | Description |
|-----------|------|-------------|
| `ttl` | integer | The time to live of the token in seconds |
