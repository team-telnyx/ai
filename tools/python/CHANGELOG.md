# Changelog — telnyx-agent-toolkit (PyPI)

## 0.4.0 (unreleased)

### Fixed — tools that could never succeed

Forty-one tool definitions targeted REST routes that do not exist (the API returned 404 on every call). Each was verified against the public OpenAPI spec and the live API.

**Re-pointed to the real route, with parameters rewritten to the real contract (30):**

- **10DLC** — `list_10dlc_brands`, `create_10dlc_brand`, `get_10dlc_brand`, `list_10dlc_campaigns`, `get_10dlc_campaign`, `assign_10dlc_campaign` → `/10dlc/brand`, `/10dlc/campaign`, `/10dlc/phone_number_campaigns`. Parameters are now camelCase as the API requires (`displayName`, `entityType`, `brandId`…); lists paginate with `page`/`recordsPerPage` and return `records[]`.
- **Verify profiles** — `list_verify_profiles`, `create_verify_profile`, `get_verify_profile` → `/verify_profiles`.
- **E911** — `list_e911_addresses`, `create_e911_address`, `delete_e911_address` → `/dynamic_emergency_addresses`. Create now takes the real address fields (`house_number`, `street_name`, `locality`, `administrative_area`, `postal_code`, `country_code`).
- **Port-out** — `list_portout_orders`, `get_portout_order`, `list_portout_comments`, `create_portout_comment`, `list_portout_documents`, `upload_portout_document`, `list_portout_rejection_codes` → `/portouts/…`. Rejection codes are per order: `portout_id` is now required. Document upload takes `documents[]` of `{type, document_id}`.
- **Voice clones / designs** — `list_voice_clones`, `create_voice_clone`, `list_voice_designs`, `create_voice_design`, `get_voice_design` → `/voice_clones`, `/voice_designs`. Clone creation requires `voice_design_id`, `language`, `gender`; design creation requires `text` and `prompt`.
- **Toll-free verification** — `list_toll_free_verifications`, `create_toll_free_verification` → `/messaging_tollfree/verification/requests`. Body is camelCase; list requires `page` and `page_size`.
- **TTS** — `text_to_speech` → `/text-to-speech/speech`.
- **Reporting** — `list_detail_records` → `/detail_records`; `filter_record_type` is required.
- **WhatsApp** — `get_whatsapp_template` → `/whatsapp/message_templates/{id}`.
- **Networking** — `list_network_interfaces` → `/networks/{network_id}/network_interfaces`; `network_id` is required.
- **Storage** — `create_presigned_url` → `/storage/buckets/{bucket_name}/{key}/presigned_url` with `ttl` (seconds).

**Removed (11) — no REST equivalent exists:**

- Cloud Storage bucket/object tools (`list_storage_buckets`, `create_storage_bucket`, `delete_storage_bucket`, `upload_storage_object`, `get_storage_object`). Bucket and object management is S3-compatible; use an S3 client against `https://<region>.telnyxcloudstorage.com` with your Telnyx API key as both access and secret key.
- `list_messages`, `bulk_lookup_numbers`, `update_e911_address`, `get_voice_clone`, `update_mission_step`.

Tool count: 211 → 201.

### Changed

- Tool definitions may set `query_mode: "flat"` to send GET arguments as literal query keys. Used by 10DLC and toll-free verification, whose pagination is not JSON:API. Default behaviour (`page_*` → `page[*]`, `filter_*` → `filter[*]`) is unchanged.

### Breaking changes

- Removed tools above. None ever returned anything other than 404, so no working integration is affected.
- Parameter names changed on the re-pointed tools where the API contract differs (notably `create_10dlc_brand`, `create_e911_address`, `create_toll_free_verification`, `create_voice_clone`, `create_presigned_url`). Agents that read tool schemas at runtime pick up the new shapes automatically.

### Tests

- Every tool's method and path is now asserted against the public OpenAPI spec (`tests/test_openapi_parity.py`); new tools cannot target non-existent routes.
- Read-only integration tests no longer treat a route-level 404 as "feature not enabled".
