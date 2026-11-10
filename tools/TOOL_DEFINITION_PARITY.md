# Toolkit definition parity (AI-3977)

Python and TypeScript publish the same tool inventory and parameter schemas.
The CI unit job runs `npm run test:parity` in `tools/typescript` after installing
both packages. Locally this needs Node dependencies (`npm ci`) and Python >=3.11;
set `PYTHON=/path/to/python` if `python3` is older. The test evaluates the actual
Python table and imports the actual TypeScript table, then compares every field
of every tool, including nested schemas, defaults, descriptions, paths, methods,
and query modes. It fails rather than skips on missing sources or interpreters.

## Object-valued arguments

The four previously conflicting fields expose JSON **objects**, not serialized
JSON strings. Callers should pass objects directly; only the outer OpenAI
`function.arguments` envelope is JSON-encoded. No executor-side JSON parsing or
legacy string coercion is added.

The public `team-telnyx/openapi` `openapi/spec3.json` contract supports this choice:

| Tool.field | Request schema | Contract |
| --- | --- | --- |
| `update_mission_run.result_payload` | `UpdateMissionRunRequest` | Object, arbitrary properties |
| `log_mission_event.payload` | `CreateEventRequest` | Object, arbitrary properties |
| `create_insight.json_schema` | `InsightTemplateCreateReq` | String **or** object; the toolkit consistently exposes the object form |
| `schedule_call.dynamic_variables` | `CreateScheduledEventRequest` | Object mapping variable names to string values |

This is a TypeScript input-schema correction: callers that stringify these fields
must instead supply objects. The insight API's alternate string form is not
exposed by either toolkit schema; no claim is made that the API rejects it.

The OpenAI adapters preserve free-form object schemas and do not enable strict
structured outputs. Strict modes that require closed objects are not qualified
by this change. Python's shared Pydantic conversion uses `dict[str, Any]`;
TypeScript's shared Zod conversion uses `z.record(z.string(), z.unknown())`.
Consequently arbitrary nested object content is retained rather than stripped.
The object-payload regression suites exercise those real conversion helpers and
real OpenAI adapters, executors and HTTP clients, with only HTTP intercepted.
They reject serialized strings, arrays and null at the framework-schema boundary
and retain optional omission. Direct executor calls remain unvalidated, as before.
These are offline contract regressions, not live model/framework-provider tests.

`update_mission_run` also needs PATCH dispatch. Both cores previously returned
`Unsupported HTTP method: PATCH`, so the minimal PATCH client/dispatch support
is included and tested through the same connected regression. PUT dispatch and
unrelated executor behavior are outside this change.

## Scope limits

Definition equality does not prove complete API correctness. In particular the
pre-existing scheduled-call body uses `to`/`from_` (normalized to `from`) and lacks
`telnyx_conversation_channel`, whereas the public scheduled-event schema requires
`telnyx_end_user_target`, `telnyx_agent_target` and the channel. This change fixes
only its `dynamic_variables` object conflict; it does **not** qualify a successful
live scheduled call. Its generic dictionary validation also does not enforce
string-only dynamic-variable values. Defaults are schema metadata; executors do
not inject them. The plan-steps item schema and relay nested descriptions are
restored for parity without promising new recursive adapter validation.
