# @telnyx/opencode

`@telnyx/opencode` adds Telnyx as an OpenCode provider, integrates with `opencode auth login`, auto-registers supported Telnyx-hosted models, exposes a `/telnyx` model manager in the TUI, and works around Telnyx's `max_completion_tokens` + tools incompatibility.

## Install

```bash
opencode plugin @telnyx/opencode
```

This auto-detects both the server and TUI targets and adds the plugin to `opencode.json` (server) and `tui.json` (TUI) automatically.

For global install (all projects):

```bash
opencode plugin -g @telnyx/opencode
```

## What it does

- registers a `telnyx` provider via `@ai-sdk/openai-compatible`
- adds `telnyx` to `opencode auth login`
- reads the Telnyx API key from either `TELNYX_API_KEY` or OpenCode's stored `auth.json` credential
- fetches available models from `https://api.telnyx.com/v2/ai/models` at startup
- registers only Telnyx-hosted text models from the API response
- enables these five recommended models by default:
  - `moonshotai/Kimi-K2.6`
  - `zai-org/GLM-5.2`
  - `zai-org/GLM-5.1-FP8`
  - `MiniMaxAI/MiniMax-M3-MXFP8`
  - `MiniMaxAI/MiniMax-M2.7`
- persists the enabled-model allowlist in `~/.config/opencode/telnyx-models.json`
- lets users enable additional Telnyx-hosted models through the `/telnyx` TUI command
- registers thinking-capable models with `reasoning: true` and two variants: `thinking` (default, `enable_thinking: true`) and `no-thinking` (`enable_thinking: false`)
- strips `maxOutputTokens` before requests so Telnyx accepts tool-enabled runs

## Authenticate

Log in with your Telnyx API key:

```bash
opencode auth login --provider telnyx --method "API Key"
```

During login the plugin also asks which Telnyx model preset to enable:

- **Recommended 5 (default)**
- **All hosted Telnyx models**
- **Keep existing config**

You can also supply the key directly with an environment variable:

```bash
export TELNYX_API_KEY="YOUR_KEY"
```

Verify the credential is present:

```bash
opencode auth list
```

## Run a model

```bash
opencode run --model 'telnyx/moonshotai/Kimi-K2.6' 'Say hello in one sentence.'
```

## Thinking variants

Telnyx-hosted reasoning models (all 5 default models) are registered with `reasoning: true` and two OpenCode variants:

- `thinking` (default) — sends `enable_thinking: true` to the Telnyx API; reasoning content is surfaced in OpenCode
- `no-thinking` — sends `enable_thinking: false`; skips the reasoning step for lower latency

```bash
# Thinking on (default)
opencode run --model 'telnyx/zai-org/GLM-5.2' 'What is 2+2?'

# Thinking off
opencode run --model 'telnyx/zai-org/GLM-5.2' --variant no-thinking 'What is 2+2?'
```

Non-reasoning Telnyx models (e.g. Llama, Qwen) are registered without thinking config — the Telnyx API rejects `enable_thinking` for non-reasoner models (error 10015). Only models in the `THINKING_CAPABLE_MODELS` set get thinking variants.

## How auth works

Auth precedence is:

1. `TELNYX_API_KEY`
2. Stored `telnyx` API credential in `~/.local/share/opencode/auth.json`

`opencode auth login` stores the key in OpenCode's normal auth store, so this behaves like a native provider instead of relying on hardcoded config.

## Model registration

At startup the plugin calls `GET https://api.telnyx.com/v2/ai/models` and registers only Telnyx-hosted text-generation models whose IDs are present in the persisted allowlist file.

Default allowlist:

- `moonshotai/Kimi-K2.6`
- `zai-org/GLM-5.2`
- `zai-org/GLM-5.1-FP8`
- `MiniMaxAI/MiniMax-M3-MXFP8`
- `MiniMaxAI/MiniMax-M2.7`

Allowlist file:

```json
{
  "version": 1,
  "enabledModels": [
    "moonshotai/Kimi-K2.6",
    "zai-org/GLM-5.2",
    "zai-org/GLM-5.1-FP8",
    "MiniMaxAI/MiniMax-M3-MXFP8",
    "MiniMaxAI/MiniMax-M2.7"
  ]
}
```

Path:

- `~/.config/opencode/telnyx-models.json`
- override with `OPENCODE_TELNYX_MODELS_PATH`

## TUI model manager

The package also registers a `/telnyx` command (alias: `/telnyx-models`) that opens an interactive model manager in the OpenCode TUI.

- the dialog starts from the default 5-model allowlist
- selecting a model toggles it on or off
- changes are persisted to `~/.config/opencode/telnyx-models.json`
- updated provider model availability is applied without manually editing config files

This command manages which Telnyx-hosted models are available under the `telnyx` provider. It does not change OpenCode core model-selection behavior outside this plugin.

This plugin does not currently create or manage Telnyx `api_key_ref` integration secrets for external providers such as Groq, OpenAI, Anthropic, Google, or xAI.

## Why the plugin exists

Telnyx rejects requests that include both function tools and `max_completion_tokens` / `max_tokens`. OpenCode normally sends tools and an output token cap together. This plugin fixes that by unsetting `maxOutputTokens` for the `telnyx` provider before the SDK builds the request.

## Develop locally

```bash
npm install
npm run typecheck
npm run build
```

## Live regression harness

The repo includes a live regression harness that:

- fetches the current Telnyx model list from `https://api.telnyx.com/v2/ai/models`
- applies the same text-model + Telnyx-hosted filtering as the plugin
- runs a simple prompt against every model
- runs a tool-calling prompt against every model using OpenCode's `read` tool
- reports excluded external-key models separately so you can see which Telnyx-listed models are passthrough-only

Create a `.env` file in `plugins/opencode/` or export `TELNYX_API_KEY`, then run:

```bash
npm test
```

Useful optional filters:

```bash
TELNYX_TEST_MODEL_MATCH=Llama-3.3-70B-Instruct npm test
TELNYX_TEST_LIMIT=1 npm test
TELNYX_TEST_AGENT=sisyphus npm test
TELNYX_TEST_VARIANT=max npm test
TELNYX_TEST_INCLUDE_EXTERNAL=1 npm test
```

Artifacts are written to `test/.artifacts/`, including raw per-model outputs and a `results.json` summary. External-provider models are reported separately and, if included explicitly, marked as skipped because the plugin intentionally does not register them without provider-specific key support.

## Troubleshooting

### `Unknown provider "telnyx"`

The package is not loaded. Check that `@telnyx/opencode` is listed in `opencode.json`, then restart OpenCode.

### No Telnyx models show up

The API key is missing or invalid. Run:

```bash
opencode auth list
```

or set `TELNYX_API_KEY` and retry.

### A small-context model fails while larger models work

Some smaller models cannot fit OpenCode's full tool list and system prompt into their effective prompt budget. This is model-specific, not a plugin auth issue.

### `/telnyx` does not appear

The TUI plugin requires a `tui.json` entry. Run `opencode plugin @telnyx/opencode` which configures both `opencode.json` and `tui.json` automatically. If you added the plugin manually to `opencode.json`, you also need `tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["@telnyx/opencode"]
}
```

Then restart OpenCode.
