---
name: telnyx-seti-curl
description: "Query SETI (Space Exploration Telecommunications Infrastructure) black box test results and diagnostic data via the Telnyx REST API. Use when retrieving SETI test results, checking infrastructure diagnostics, or accessing space exploration telecommunications endpoints with curl."
metadata:
  author: telnyx
  product: seti
  language: curl
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx SETI - curl

Retrieve black box test results and diagnostic data from the Telnyx Space Exploration Telecommunications Infrastructure (SETI) API.

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
```

All examples below use `$TELNYX_API_KEY` for authentication.

## Retrieve Black Box Test Results

Returns the results of the various black box tests that validate SETI infrastructure status.

`GET /seti/black_box_test_results`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/seti/black_box_test_results"
```

Returns: `black_box_tests` (array[object]), `product` (string), `record_type` (string)

## Error Handling

```bash
response=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/seti/black_box_test_results")

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

case $http_code in
  2*) echo "Success: $body" ;;
  401) echo "Authentication failed — check TELNYX_API_KEY" ;;
  429) echo "Rate limited — retry after delay"; sleep 1 ;;
  *)   echo "Error $http_code: $body" ;;
esac
```
