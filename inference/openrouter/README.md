# Telnyx on OpenRouter

This directory tracks the readiness packet for listing Telnyx as a model provider on OpenRouter.

OpenRouter provider onboarding is application-based, not a normal upstream pull request. The current public provider guide asks providers to expose an OpenAI-compatible chat endpoint, a provider model-list endpoint with OpenRouter-specific metadata, automated payment or invoicing, privacy and data-retention terms, and enough uptime/performance quality for OpenRouter routing.

Do not submit the OpenRouter provider application until the business and product fields in [`provider-application.md`](./provider-application.md) are confirmed.

## Current status

- Linear: `AIF-156`
- Owner branch: `ifthikar/aif-156-list-telnyx-as-a-provider-on-openrouter`
- OpenRouter public providers API currently has no `telnyx` provider entry.
- Telnyx has the required OpenAI-compatible chat surface.
- The remaining work is provider-onboarding readiness: model metadata, pricing, capacity, datacenter, billing, and data-retention details.

## OpenRouter requirements

Reference: <https://openrouter.ai/docs/guides/community/for-providers>

OpenRouter expects:

- A provider application submission.
- A list-models endpoint that returns all models OpenRouter should serve.
- Model metadata including:
  - `id`
  - `hugging_face_id` when applicable
  - `name`
  - `created`
  - `input_modalities`
  - `output_modalities`
  - `quantization`
  - `context_length`
  - `max_output_length`
  - token pricing in USD strings
  - supported sampling parameters
  - supported features
  - optional launch/capacity fields such as `is_ready`, `discount_to_user`, and `capacity_tpm`
  - datacenter country codes
- Automatic payment, top-up, or invoicing.
- Uptime, latency, throughput, streaming, and tool-call reliability suitable for routed production traffic.

## Telnyx endpoints

Telnyx Inference exposes an OpenAI-compatible base URL:

```text
https://api.telnyx.com/v2/ai/openai
```

Relevant endpoints:

```text
GET  /v2/ai/openai/models
POST /v2/ai/openai/chat/completions
```

References:

- Telnyx OpenAI-compatible chat completions: <https://developers.telnyx.com/api-reference/openai-chat/create-a-chat-completion-openai-compatible>
- Telnyx OpenAI-compatible models endpoint: <https://developers.telnyx.com/api-reference/openai-chat/get-available-models-openai-compatible>
- Telnyx available model list: <https://developers.telnyx.com/docs/inference/models>

## Files

- [`provider-application.md`](./provider-application.md) - Copy-ready application packet with confirmed fields and open blockers.
- [`models.example.json`](./models.example.json) - OpenRouter-shaped draft manifest based on current public Telnyx model docs. It intentionally contains `TODO_` placeholders and is not ready to serve as a production endpoint.
- [`validate-openrouter-readiness.mjs`](./validate-openrouter-readiness.mjs) - Local validation script for static manifest shape and live Telnyx endpoint behavior.

## Validation

Static validation does not require credentials:

```bash
node inference/openrouter/validate-openrouter-readiness.mjs
```

Live validation is opt-in:

```bash
export TELNYX_API_KEY=KEY...
node inference/openrouter/validate-openrouter-readiness.mjs --live
```

Optional model override:

```bash
TELNYX_OPENROUTER_TEST_MODEL="moonshotai/Kimi-K2.6" \
TELNYX_API_KEY=KEY... \
node inference/openrouter/validate-openrouter-readiness.mjs --live
```

The live check exercises:

1. `GET /v2/ai/openai/models`
2. non-streaming chat completion
3. streaming chat completion
4. invalid-model error behavior

## Readiness checklist

- [x] Confirm Telnyx has an OpenAI-compatible chat endpoint.
- [x] Confirm Telnyx has a discoverable models endpoint.
- [x] Draft OpenRouter-shaped model metadata.
- [ ] Replace placeholder pricing with product-approved USD-per-token values.
- [ ] Confirm max output length per model.
- [ ] Confirm supported sampling parameters per model.
- [ ] Confirm tool-calling, JSON mode, structured output, and reasoning support per model.
- [ ] Confirm production datacenter country codes and capacity TPM per model.
- [ ] Confirm automated payment, invoicing, or OpenRouter billing arrangement.
- [ ] Confirm privacy and data-retention terms for routed OpenRouter traffic.
- [ ] Submit OpenRouter provider application after the items above are confirmed.
