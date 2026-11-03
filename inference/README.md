# Inference

Telnyx-as-LLM-backend integrations for AI application frameworks.

Each subdirectory provides a provider/adapter that lets a framework route inference calls to Telnyx-hosted models. Planned entries include Vercel AI SDK, LangChain (Py + JS), LlamaIndex (Py + JS), LiteLLM, Haystack, Semantic Kernel, AutoGen, Dify, and Flowise.

This directory is named `inference/` rather than `providers/` to avoid collision with the existing top-level `providers/` (which currently holds coding-assistant configs and will be consolidated under `plugins/` in a follow-up step).

See the repo root `README.md` for the full architecture.

## Check the agent inference journey

The [journey checker](../tools/typescript/scripts/inference-journey.mjs) tests
model discovery, a streamed function call, correlation of its tool result, and
the final streamed answer. Its only tool is a local verification-code fixture;
it cannot provision resources or execute model-generated code.

Run from a source checkout with Node 18+ and `TELNYX_API_KEY` supplied through
your secret manager or environment. Choose a model ID from
`GET https://api.telnyx.com/v2/ai/openai/models` that supports function calling.
The checker deliberately has no pinned model default.

```bash
RUN_INFERENCE_JOURNEY=true TELNYX_INFERENCE_MODEL='<model-id>' \
  node tools/typescript/scripts/inference-journey.mjs > inference-journey.json
```

This is an opt-in, billable check: one model lookup and at most two completion
requests, each capped at 1,024 output tokens (including reasoning), 60 seconds,
and 1 MiB of response data. It follows no redirects and performs no retries.
The prompt and tool response are synthetic; no customer content is used.

The JSON report includes `schema_version`, `status`, per-stage elapsed time,
HTTP status/request IDs, and completion usage when the server supplies it.
Exit codes are `0` passed, `1` failed, and `2` skipped without opt-in. A missing
key/model, HTTP error, missing streamed terminator, malformed tool call,
exhausted token budget, or wrong final answer fails the check. Missing usage is
reported as `null`, not zero cost. Raw prompts, responses, reasoning traces,
and credentials are not included in the report.

Offline parser and journey regressions run in normal CI:

```bash
cd tools/typescript
npm run test:inference-journey
```

Live checks are manual and are not added to the read-only CI job. This is a
functional contract probe for one selected model and the service's default
routing; it does not establish all-model compatibility, regional or tier
coverage, latency percentiles, task quality, or Voice AI/PSTN readiness.
See the official [function calling](https://developers.telnyx.com/docs/inference/functions)
and [streaming](https://developers.telnyx.com/docs/inference/streaming-functions)
contracts.
