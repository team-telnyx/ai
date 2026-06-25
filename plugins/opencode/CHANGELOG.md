# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Added `zai-org/GLM-5.2` and `MiniMaxAI/MiniMax-M3-MXFP8` to the default enabled-models allowlist (now 5 models). Both are Telnyx-hosted text-generation models with 1M context windows, auto-registered from `GET https://api.telnyx.com/v2/ai/models`.
- Updated `opencode auth login` model preset label from "Recommended 3" to "Recommended 5" and refreshed the hint text to list the new lineup.
- Added thinking on/off variants for reasoning models. Thinking-capable models are registered with `reasoning: true` and two variants: `thinking` (default, `enable_thinking: true`) and `no-thinking` (`enable_thinking: false`). A `chat.message` + `chat.params` hook pair propagates the selected variant to the Telnyx API request body.
- Added `THINKING_CAPABLE_MODELS` set to `models-config.ts` listing the 5 known reasoner model IDs. Non-reasoners are not sent `enable_thinking` (Telnyx API rejects it with error 10015).

### Fixed

- Fixed TUI `/telnyx` model toggle re-registering models with hardcoded `output: 16384` instead of the API's `max_output_length`. The TUI now honors the per-model output limit (e.g. 131072 for GLM-5.2), matching the server-side registration.
- Removed unused `DEFAULT_ENABLED_MODELS` import from `tui.tsx`.

## [0.1.4] - 2026-05-19

### Fixed

- Added `limit.output` (16384 fallback) to TUI `providerModels()` — fixes `/telnyx` model toggles not appearing in `/models`

## [0.1.3] - 2026-05-19

### Fixed

- Fixed README install instructions to use `opencode plugin @telnyx/opencode` (there is no `install` subcommand)
- Added `limit.output` (with 16384 fallback) to model config — fixes `config.get: Missing key` crash on opencode 1.14.44+ when `max_output_length` is null in the Telnyx API response

## [0.1.2] - 2026-04-24

### Added

- Added `oc-plugin` field declaring both server and TUI targets for `opencode plugin` compatibility

### Fixed

- Fixed README install instructions to use `opencode plugin` (the standard method that auto-configures both `opencode.json` and `tui.json`)

## [0.1.1] - 2026-04-24

### Fixed

- Simplified `./tui` export to plain string format, matching the convention used by all other opencode TUI plugins

## [0.1.0] - 2026-04-23

### Added

- initial Telnyx auth and provider plugin for OpenCode
- Telnyx model discovery via `GET https://api.telnyx.com/v2/ai/models`
- API key resolution from `TELNYX_API_KEY` or OpenCode's stored `auth.json` credential
- compatibility fix for Telnyx requests that reject tool use with output token caps
- 3-model default allowlist (`Kimi-K2.6`, `GLM-5.1-FP8`, `MiniMax-M2.7`) for safer initial setup
- interactive `/telnyx` TUI model manager for enabling additional Telnyx-hosted models
- allowlist persistence in `~/.config/opencode/telnyx-models.json`
- login-time model preset selection during `opencode auth login`
- live regression harness via `npm test`
