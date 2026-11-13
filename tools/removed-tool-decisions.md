# Removed-tool decisions (AI-3974)

This change restores **two of five** removed tools in both toolkits. It does not
complete the whole issue. Storage tools are separate (AI-3950). Only read-only
compositions are implemented; no production API calls were used for validation.
Number lookups can still incur charges.

## Contract evidence

Verified against the official `team-telnyx/openapi` source at commit
`dd8c5a8cc5774423b57a64621af3605bd1a329ba`, `openapi/spec3.json`:
[immutable source](https://github.com/team-telnyx/openapi/blob/dd8c5a8cc5774423b57a64621af3605bd1a329ba/openapi/spec3.json).
The downloaded spec SHA-256 is
`e369e587111d2ab9acd9de5e777f4bd97b955cdb6afe4aed97f4259f6fc0671c`.
Source verification proves the published contract, not authenticated deployment
availability or account permissions. A 401 alone is not contract evidence.

| Removed tool | Verified contract and decision | Acceptance / outstanding work |
| --- | --- | --- |
| `bulk_lookup_numbers` | **Restored composition.** `LookupNumber`: `GET /number_lookup/{phone_number}`. Fan out single lookups, never `POST /number_lookup`. | Tests cover ordered results, duplicates, per-item failures, bounded concurrency, strict preflight with zero requests, input snapshotting, action selection, adapter schema/execution and HTTP query behavior. Real account/billing checks remain unperformed. |
| `get_voice_clone` | **Restored composition.** `listVoiceClones`: `GET /voice_clones`, with `page[number]`, `page[size]`; list items contain clone objects with `id`. No documented id filter or direct `GET /voice_clones/{id}`. Scan pages and compare exact ids locally. | Tests cover later-page discovery, exact unchanged object, exhausted versus incomplete scans, pagination validation, transport errors, limits, action selection, adapter schemas/execution and query behavior. Not an atomic snapshot; concurrent listing changes can affect discovery. |
| `list_messages` | **Not restored.** `/messages` has POST only. `GET /detail_records` requires `filter[record_type]`; messaging detail records have fields such as `uuid`, `cli`, `cld`, billing/status attributes and `record_type=message_detail_record`, not the original Messaging resource contract. | Existing `list_detail_records` with `filter_record_type="messaging"` is an explicitly different reporting operation. Do not rename reporting records as messages or promise original message bodies. Messaging owner must define a true list contract or approve a separately named reporting abstraction. |
| `update_e911_address` | **Not restored.** `/dynamic_emergency_addresses/{id}` has GET and DELETE, no PATCH/PUT. | Delete+create is destructive, changes identity and is not an update; it can disrupt emergency routing. No automatic fallback, mutation, or test against production. Requires a supported update contract and owner-approved migration/association semantics. |
| `update_mission_step` | **Not restored in this read-only slice. Important correction:** the pinned spec now documents `PATCH /ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}`, operation `patch_public_missions_missions_mission_id_runs_run_id_plan_steps_step_id`, summary “Update step status”. Body has optional `status` (`pending`, `in_progress`, `completed`, `skipped`, `failed`) and `metadata` object. This is evidence of limited status/metadata mutability, not arbitrary plan rewriting. | The old “no route” statement is no longer accurate for this published spec. Reconcile actual deployed support with Missions owners, decide the status/metadata-only tool contract and add PATCH transport support/tests in a separately authorized mutation change. No speculative POST, mutation, or production probe here. |

## Composition contract

Both toolkits use an optional `ToolDefinition.execution` selector and a small
`shared/compositions` module. For compositions, the existing `method` and `path`
fields explicitly declare the **underlying REST dependency**, not a new endpoint.
The OpenAPI route guard therefore checks the real GET dependencies without an
allowlist or fake routes. Tests also bind those declarations to the atomic tool
definitions actually used. Unknown selectors fail closed; dependencies must be
atomic GET tools. Atomic REST dispatch and adapters remain shared and unchanged.
A composition is still one exposed tool and returns one JSON result. Telemetry
currently reports the overall invocation using the declared dependency template;
a bulk result with individual lookup errors is a successfully returned aggregate,
not a claim that every lookup succeeded. Inspect each row and the counts.

### `bulk_lookup_numbers`

Action: `lookup.bulk_lookup_numbers`.

- Required `phone_numbers`: 1–100 E.164-formatted strings; validated before any
  request. Duplicates intentionally produce separate requests and may be charged
  separately. No deduplication, implicit retries or normalization.
- Optional `type`: `carrier` or `caller-name` (the existing single-tool subset).
- Optional `concurrency`: integer 1–10, default 5. A fixed worker pool bounds both
  in-flight requests and worker tasks. Invalid/unknown arguments fail before I/O.
- Validated input is copied before network awaits; callers cannot append extra
  work during execution.
- Result: `{results: [{phone_number, response} | {phone_number, error}],
  succeeded, failed}` in input order. `response` is the unmodified single-lookup
  response envelope. Individual errors do not discard successful rows.

### `get_voice_clone`

Action: `voice.get_voice_clone`.

- Required `id`: exact nonempty clone identifier; it is never inserted into a
  request path or sent as an unsupported id filter.
- Optional `page_size`: integer 1–250, default 100.
- Optional `max_pages`: integer 1–100, default 20. Requests are sequential.
- Match: `{data: <unchanged clone object>}`. Exhausted valid pagination:
  `{data: null, status: "not_found", pages_scanned: N}`. This means not observed
  during this listing traversal, not an authoritative direct-resource 404.
- Scan budget exhausted with more pages:
  `{data: null, status: "incomplete", pages_scanned: N}`. **Do not treat this as
  not-found.** No silent truncation or continuation outside the caller's budget.
- Invalid/missing pagination metadata, malformed list data, and HTTP failures
  return the core's normal `{error: ...}` result, never a fabricated not-found.
  The next page is calculated locally; server-provided URLs are never followed.

## Verification boundary

Python tests: `cd tools/python && pytest tests/test_compositions.py`.
TypeScript tests: `cd tools/typescript && npx tsx tests/compositions.test.ts`.
Both are included in the package/CI unit-test entrypoints. The Python HTTP test
uses the real client with a controlled httpx transport; the TypeScript HTTP test
uses real native fetch against a loopback server. OpenAI adapters are exercised
through the public toolkit action configuration. Optional Python framework schema
builders and the shared TypeScript Zod builder are exercised without installing
LangChain/CrewAI/Vercel frameworks; this is not full live framework integration.
Authenticated API, production mutation, billing and independent review acceptance
are not claimed by these offline tests.
