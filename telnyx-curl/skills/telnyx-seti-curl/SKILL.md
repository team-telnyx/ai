---
name: telnyx-seti-curl
description: >-
  SETI (Space Exploration Telecommunications Infrastructure) APIs.
metadata:
  author: telnyx
  product: seti
  language: curl
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Seti - curl

## Installation

```text
# curl is pre-installed on macOS, Linux, and Windows 10+
```

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
```

All examples below use `$TELNYX_API_KEY` for authentication.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```bash
# Check HTTP status code in response
response=$(curl -s -w "\n%{http_code}" \
  -X POST "https://api.telnyx.com/v2/messages" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to": "+13125550001", "from": "+13125550002", "text": "Hello"}')

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

case $http_code in
  2*) echo "Success: $body" ;;
  422) echo "Validation error — check required fields and formats" ;;
  429) echo "Rate limited — retry after delay"; sleep 1 ;;
  401) echo "Authentication failed — check TELNYX_API_KEY" ;;
  *)   echo "Error $http_code: $body" ;;
esac
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## Get Enum

`GET /10dlc/enum/{endpoint}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `endpoint` | enum (mno, optionalAttributes, usecase, vertical, altBusinessIdType, ...) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/10dlc/enum/{endpoint}"
```

## Retrieve Black Box Test Results

Returns the results of the various black box tests

`GET /seti/black_box_test_results`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | object | No | Consolidated filter parameter (deepObject style). |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/seti/black_box_test_results"
```

Key response fields: `.data.black_box_tests, .data.product, .data.record_type`

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
