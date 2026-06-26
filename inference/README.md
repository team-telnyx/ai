# Inference

Telnyx-as-LLM-backend integrations for AI application frameworks.

Each subdirectory provides a provider/adapter that lets a framework route inference calls to Telnyx-hosted models. Planned entries include Vercel AI SDK, LangChain (Py + JS), LlamaIndex (Py + JS), LiteLLM, Haystack, Semantic Kernel, AutoGen, Dify, Flowise, and OpenRouter.

This directory is named `inference/` rather than `providers/` to avoid collision with the existing top-level `providers/` (which currently holds coding-assistant configs and will be consolidated under `plugins/` in a follow-up step).

See the repo root `README.md` for the full architecture.

## Current integration packets

- [`openrouter/`](./openrouter/) - OpenRouter provider-onboarding readiness packet, model manifest draft, and validation script.
