# OpenRouter Provider Application Packet

This packet prepares the Telnyx provider application for OpenRouter. It should be reviewed by Product, Billing/Finance, Legal, and the AI platform owner before the external OpenRouter form is submitted.

OpenRouter provider application: <https://openrouter.ai/providers/apply>

OpenRouter provider technical guide: <https://openrouter.ai/docs/guides/community/for-providers>

## Provider summary

Provider name: Telnyx

Provider website: <https://telnyx.com>

Provider type: OpenAI-compatible model inference provider

Primary API base URL:

```text
https://api.telnyx.com/v2/ai/openai
```

Primary chat endpoint:

```text
POST https://api.telnyx.com/v2/ai/openai/chat/completions
```

Primary model-list endpoint:

```text
GET https://api.telnyx.com/v2/ai/openai/models
```

Authentication:

```text
Authorization: Bearer <TELNYX_API_KEY>
```

## Current model candidates

Based on current public Telnyx model docs:

| Model ID | Context | Notes |
| --- | ---: | --- |
| `moonshotai/Kimi-K2.6` | 256K | Recommended high-intelligence chat model |
| `zai-org/GLM-5.2` | 1M | Coding, reasoning, long-context model |
| `zai-org/GLM-5.1-FP8` | 202K | Efficient reasoning and function calling |
| `MiniMaxAI/MiniMax-M3-MXFP8` | 1M | Cost-efficient high-intelligence model |
| `thenlper/gte-large` | n/a | 1024-dimensional text embedding model |

The OpenRouter first submission should likely start with chat models only. Embeddings can be added after confirming OpenRouter wants Telnyx embeddings in the same provider listing.

## Confirmed technical fit

- Telnyx exposes OpenAI-compatible chat completions.
- Telnyx exposes an OpenAI-compatible models endpoint.
- Model IDs follow the `{organization}/{model_name}` pattern.
- Telnyx model metadata includes context length, task, regions, and pricing metadata in the Telnyx API schema.

## Open questions before external submission

These are blockers for a production OpenRouter provider submission.

### Model metadata

- Confirm exact model set for launch.
- Confirm launch names and OpenRouter slugs.
- Confirm max output tokens per model.
- Confirm supported sampling parameters per model.
- Confirm supported feature flags per model:
  - tools
  - JSON mode
  - structured outputs
  - logprobs
  - reasoning
- Confirm whether Kimi thinking should be disabled by default for OpenRouter voice/latency-sensitive traffic.
- Confirm whether embeddings should be included in the initial provider listing.

### Pricing and billing

- Confirm per-token USD pricing that OpenRouter should display.
- Confirm whether pricing should be flat or tiered by context length.
- Confirm whether Telnyx wants a launch discount.
- Confirm whether OpenRouter will pay through auto top-up or invoicing.
- Confirm finance contact and billing owner.

### Capacity and operations

- Confirm per-model `capacity_tpm`.
- Confirm production datacenter country codes.
- Confirm rate limit policy and preferred 429 behavior.
- Confirm status page or escalation contact for provider incidents.
- Confirm whether OpenRouter should receive any provider-specific timeout guidance.

### Privacy and data retention

- Confirm public privacy-policy URL for OpenRouter-routed inference.
- Confirm whether prompts/completions are stored.
- Confirm retention period for logs, prompts, completions, and metadata.
- Confirm whether OpenRouter traffic may be used for model training, evaluation, or debugging.
- Confirm whether zero-data-retention routing is supported.

## Draft external response

Use this only after the open questions above are closed.

```text
Telnyx provides OpenAI-compatible LLM inference through Telnyx-hosted GPU infrastructure. Our API base URL is https://api.telnyx.com/v2/ai/openai, with chat completions available at /chat/completions and model discovery available at /models.

Initial launch models:
- moonshotai/Kimi-K2.6
- zai-org/GLM-5.2
- zai-org/GLM-5.1-FP8
- MiniMaxAI/MiniMax-M3-MXFP8

Authentication uses bearer tokens via Authorization: Bearer <TELNYX_API_KEY>.

We can provide OpenRouter-specific model metadata, pricing, regions, and capacity once the provider account is created.
```

## Internal next steps

1. Run live validation with a Telnyx API key:

   ```bash
   TELNYX_API_KEY=KEY... node inference/openrouter/validate-openrouter-readiness.mjs --live
   ```

2. Replace all `TODO_` fields in [`models.example.json`](./models.example.json).
3. Decide whether Telnyx needs a dedicated OpenRouter-facing model metadata endpoint or whether OpenRouter can transform `GET /v2/ai/openai/models`.
4. Submit the OpenRouter provider application only after Product/Billing/Legal approve the packet.
