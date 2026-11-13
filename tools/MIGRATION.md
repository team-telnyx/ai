# Toolkit migration notes (0.4.0 unreleased)

These changes apply to both the Python and TypeScript agent toolkits (AI-4013).
Refresh cached/generated tool schemas and update hand-written tool arguments.

## SIM data usage: rename the required argument

`get_sim_card_data_usage` now requires `filter_sim_card_id`, replacing
`sim_card_id`. This is a caller-facing rename, **not a backwards-compatible
alias**. The default REST query conversion emits `filter[sim_card_id]`, which
is the nested filter consumed by the Wireless service. A top-level
`sim_card_id` does not provide the promised SIM scoping.

```json
{"filter_sim_card_id": "your-sim-card-id"}
```

Do not keep sending the old key: the executor is not a general schema validator
and does not translate it into the corrected filter. Regenerate callers rather
than relying on a runtime validation error for the old argument.

## MDR reports: use arrays, not scalar enum strings

For `create_usage_report`, change `directions: "inbound"` to
`directions: ["inbound"]`, and `record_types: "completed"` to
`record_types: ["completed"]`. Both optional filters are now declared as arrays
of enum strings, matching the source DTO's collection shape.

```json
{
  "start_date": "2026-11-01T00:00:00Z",
  "end_date": "2026-11-02T00:00:00Z",
  "directions": ["inbound", "outbound"],
  "record_types": ["completed"]
}
```

Existing enum strings are unchanged. This correction does not establish deployed
enum-case coercion or guarantee how every API mapper handles legacy scalar values.
The service also imposes date/time and report-window constraints; these examples
are argument-shape examples, not executed report requests.

## Verify: delivery type now selects the channel route

The public `verify_phone` arguments remain `phone_number`, `verify_profile_id`,
optional `type`, and optional `timeout_secs`. Only `phone_number` and
`verify_profile_id` are required. No caller rename is needed.

| `type` argument | POST route (relative to `/v2`) |
| --- | --- |
| omitted or `"sms"` | `/verifications/sms` |
| `"call"` | `/verifications/call` |
| `"whatsapp"` | `/verifications/whatsapp` |

The deprecated collection POST `/verifications` ignores body `type` and always
selects SMS in the inspected service source. The toolkit no longer uses it.
`type` is a routing argument and is removed from the JSON body; the remaining
arguments are passed through without inserting optional body defaults.

```json
{
  "phone_number": "+15555550123",
  "verify_profile_id": "your-verify-profile-id",
  "type": "call",
  "timeout_secs": 120
}
```

This selects `/verifications/call` with only `phone_number`,
`verify_profile_id`, and `timeout_secs` in the request body. Omitting `type`
still selects SMS. Unsupported strings (including `flashcall`), incorrect case,
empty strings, and non-string values (including explicit null) return a local
JSON error with no HTTP request. In TypeScript, omit the property rather than
setting `type: undefined`.

## Verification boundaries and remaining API work

The Verify channel paths are present as concrete POST operations in public
OpenAPI revision `dd8c5a8cc5774423b57a64621af3605bd1a329ba`; tests check each
advertised route, not a permissive generic placeholder. The inspected service
requires phone/profile fields and E.164 handling, authenticates the caller,
checks account status, daily limits, destination restrictions, AIT controls and
rate limits, and uses a usable Verify profile to send. Valid channel dispatch
alone does not guarantee successful delivery. Optional API features such as
custom codes and call extensions are not newly exposed by this fix.

These are source-backed toolkit corrections with intercepted-client regression
tests, not authenticated/deployed API validation or API-owner sign-off. Five
method/path spec gaps remain tracked under AI-4013: `update_assistant`,
`list_portout_events`, `get_sim_card_data_usage`, `create_usage_report`, and
`get_usage_report`. Their request/response and deployment reconciliation remains
separate from these migrations. No API-contract completion or release approval
is implied.
