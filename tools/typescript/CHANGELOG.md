# Changelog — @telnyx/agent-toolkit (npm)

## 0.4.0 (unreleased)

### Fixed — Python/TypeScript definition parity (AI-3977)

- Reconciled all 11 divergent definitions, including pagination defaults, plan-step item schemas and nested Conversation Relay descriptions. CI now compares every definition field across languages rather than only tool names.
- `result_payload`, mission-event `payload`, insight `json_schema` and scheduled-call `dynamic_variables` now consistently expose objects. **TypeScript callers must pass objects, not JSON strings.** The insight API also supports a string form, but both toolkits deliberately expose the object form.
- Added minimal PATCH dispatch/client support so `update_mission_run` actually reaches HTTP. Offline regressions cover the four object fields through real OpenAI adapters/cores/clients and shared Pydantic/Zod validation. See `../TOOL_DEFINITION_PARITY.md` for contract boundaries and known pre-existing scheduled-event limitations.

### Added — read-only compositions (AI-3974 subset)

- Restore `bulk_lookup_numbers` using bounded single-number GET lookups; ordered
  per-item success/error results, duplicate preservation and preflight limits.
- Restore `get_voice_clone` as a bounded paginated exact-id search, distinguishing
  exhausted from incomplete scans; no unsupported GET-by-id or id filter.
- Keep `list_messages`, E911 update and mission step mutation unavailable in this
  read-only slice. See [contract decisions](../removed-tool-decisions.md), including
  the newly documented Missions status/metadata PATCH contract. No versions bumped.

### AI-4013 — source-backed contract corrections and migration

- **Verify dispatch:** `verify_phone` preserves its existing arguments and omitted-type SMS default, but now selects POST `/verifications/sms`, `/verifications/call`, or `/verifications/whatsapp`. Routing-only `type` is not sent in the body. Invalid/unsupported types return a local JSON error without HTTP; no flashcall option was added. The deprecated collection POST silently selected SMS even when callers requested another channel.
- **Breaking SIM argument rename:** `get_sim_card_data_usage` now requires `filter_sim_card_id` instead of `sim_card_id` so the request sends `filter[sim_card_id]`. There is no legacy-key alias.
- **MDR schema migration:** `create_usage_report` declares arrays for `directions` and `record_types`, e.g. `["inbound"]` and `["completed"]`, instead of scalar strings. Existing enum strings are unchanged; deployed enum casing/scalar coercion is not qualified.
- **MDR adapter validation:** the shared Zod converter preserves string-array `items.enum`, so Vercel AI and LangChain schemas reject invalid direction/record-type entries while retaining optional filters and valid arrays.
- See [migration notes](../MIGRATION.md) for before/after arguments and Verify behavior. These corrections are backed by inspected service source, pinned public OpenAPI and intercepted-client tests, **not** authenticated API execution or owner sign-off. Five other method/path spec gaps remain tracked under AI-4013; full API-contract reconciliation and release approval are still outstanding.

### Breaking — minimum Node runtime

- Raised `engines.node` from `>=18.0.0` to `>=20.20.2` for the entire TypeScript toolkit, including REST-only use, to satisfy the optional S3 SDK requirement and use a tested patched baseline. Consumers below Node 20.20.2 must upgrade before adopting this unreleased change; no registry release or version bump is included.
- Added minimum-runtime installation, packed-consumer and offline S3 checks. Optional dependency installation and `storage: true` remain separate opt-ins.

### Added — optional S3 storage tools (AI-3950)

- Opt-in `storage: true` adds the five bucket/object tools via optional `@aws-sdk/client-s3` (Node 20.20.2+), not the REST catalog. Regional endpoints and credentials follow the Telnyx S3 contract.
- Upload accepts explicit UTF-8 or canonical base64; downloads return base64. Inline objects are limited to 1 MiB, streams are closed, and dot-only key segments are refused without normalization.
- Offline SDK contracts are tested; authenticated bucket lifecycle validation and toolkit-owner sign-off remain separate release gates.

### Removed — retired fine-tuning job management (AI-4102)

- Removed `list_fine_tuning_jobs`, `create_fine_tuning_job` and `get_fine_tuning_job`, and their action mappings where present. These target the retired public `/ai/fine_tuning/jobs` API, whose reference was removed in `team-telnyx/developer-docs-mintlify#2146` (AI-3934). The current public OpenAPI spec no longer publishes these operations.
- **Migration / breaking change:** remove these job-management keys from agent action configuration and saved tool-call plans; there is no supported public job-management replacement. Explicit stale action keys no longer enable a tool, and direct calls return the existing `Unknown tool` error without an HTTP request. Default agents no longer advertise these tools.
- This is not removal of fine-tuned model serving, inference/chat, assistant APIs, or model discovery. Those surfaces are unchanged; discovering a model is not a replacement for creating a training job.
- Catalog count for this change: **201 → 198**, matching in Python and TypeScript. Removed the corresponding obsolete live-route probes; added offline absence/configuration/zero-dispatch regressions. The public-spec parity guard and its allowlists are unchanged.
- Package manifests remain `0.3.0`; `0.4.0` is still unreleased. No registry publication is included.

### Fixed — tools that could never succeed

Forty-one tool definitions targeted REST routes that do not exist (the API returned 404 on every call). Each was verified against the public OpenAPI spec and the live API.

**Re-pointed to the real route, with parameters rewritten to the real contract (30):**

- **10DLC** — `list_10dlc_brands`, `create_10dlc_brand`, `get_10dlc_brand`, `list_10dlc_campaigns`, `get_10dlc_campaign`, `assign_10dlc_campaign` → `/10dlc/brand`, `/10dlc/campaign`, `/10dlc/phone_number_campaigns`. Parameters are now camelCase as the API requires (`displayName`, `entityType`, `brandId`…); lists paginate with `page`/`recordsPerPage` and return `records[]`.
- **Verify profiles** — `list_verify_profiles`, `create_verify_profile`, `get_verify_profile` → `/verify_profiles`.
- **E911** — `list_e911_addresses`, `create_e911_address`, `delete_e911_address` → `/dynamic_emergency_addresses`. Create now takes the real address fields (`house_number`, `street_name`, `locality`, `administrative_area`, `postal_code`, `country_code`).
- **Port-out** — `list_portout_orders`, `get_portout_order`, `list_portout_comments`, `create_portout_comment`, `list_portout_documents`, `upload_portout_document`, `list_portout_rejection_codes` → `/portouts/…`. Rejection codes are per order: `portout_id` is now required. Document upload takes `documents[]` of `{type, document_id}`.
- **Voice clones / designs** — `list_voice_clones`, `create_voice_clone`, `list_voice_designs`, `create_voice_design`, `get_voice_design` → `/voice_clones`, `/voice_designs`. Clone creation requires `voice_design_id`, `language`, `gender`; design creation requires `text` and `prompt`.
- **Toll-free verification** — `list_toll_free_verifications`, `create_toll_free_verification` → `/messaging_tollfree/verification/requests`. Body is camelCase; list requires `page` and `page_size`.
- **TTS** — `text_to_speech` → `/text-to-speech/speech`. `output_type` is now required and must be `base64_output` (the API's binary default cannot be returned through a tool call); the `provider` enum is removed so newer providers (`xai`, `humain`, `soniox`) are accepted.
- **Reporting** — `list_detail_records` → `/detail_records`; `filter_record_type` is required.
- **WhatsApp** — `get_whatsapp_template` → `/whatsapp/message_templates/{id}`.
- **Networking** — `list_network_interfaces` → `/networks/{network_id}/network_interfaces`; `network_id` is required.
- **Storage** — `create_presigned_url` → `/storage/buckets/{bucket_name}/{key}/presigned_url` with `ttl` (seconds).

**Previously removed phantom REST definitions (10):**

- Cloud Storage bucket/object tools (`list_storage_buckets`, `create_storage_bucket`, `delete_storage_bucket`, `upload_storage_object`, `get_storage_object`). Bucket and object management is S3-compatible; use an S3 client against `https://<region>.telnyxcloudstorage.com` with your Telnyx API key as both access and secret key.
- `list_messages`, `bulk_lookup_numbers`, `update_e911_address`, `get_voice_clone`, `update_mission_step`.

Prior route fixes reduced the tool count from 211 to 201, and retirement of
fine-tuning job management reduced it to 198. The two read-only compositions
above bring the current count to 200; their former phantom REST
routes remain removed. The other three non-storage names remain unavailable
in this slice; see the contract decisions above for the newer Missions PATCH evidence.

### Changed

- Tool definitions may set `query_mode: "flat"` to send GET arguments as literal query keys. Used by 10DLC and toll-free verification, whose pagination is not JSON:API. Default behaviour (`page_*` → `page[*]`, `filter_*` → `filter[*]`) is unchanged.

### Breaking changes

- The former REST definitions above are removed. The two restored names now use
  the explicitly documented composition contracts, not their former REST routes.

- Removed phantom-route tools in the route-repair section above. Those routes returned 404; the separately retired fine-tuning job-management tools and their migration are documented in their own section.
- Parameter names changed on the re-pointed tools where the API contract differs (notably `create_10dlc_brand`, `create_e911_address`, `create_toll_free_verification`, `create_voice_clone`, `create_presigned_url`). Agents that read tool schemas at runtime pick up the new shapes automatically.

### Tests

- Every tool's method and path is now asserted against the public OpenAPI spec (see `tools/python/tests/test_openapi_parity.py`; definitions are kept identical across both toolkits); new tools cannot target non-existent routes.
- Read-only integration tests no longer treat a route-level 404 as "feature not enabled".
