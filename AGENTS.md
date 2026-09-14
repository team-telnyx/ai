# AGENTS.md

Operating instructions for AI coding agents working **on** this repo, and for runtime agents **consuming** it.

This file is a complement to `README.md` (human-facing) and `.github/CONTRIBUTING.md` (contribution flow). When in doubt, prefer the commands here.

---

## What this repo is

The one-stop shop for AI agents and AI-first developers building with Telnyx. It contains agent toolkits (Python/TypeScript), an agent CLI, per-product plugins for Claude Code / Cursor / Gemini CLI / OpenCode, an MCP proxy, <!-- SKILL_COUNT -->241<!-- /SKILL_COUNT --> Agent Skills, and operational guides.

---

## Working on this repo

### Setup

This is an npm-based monorepo, but the workspaces are independent — install per-package, not at the root.

```bash
# Root tooling (only for `npm run test:guides*`)
npm ci

# Per-package
cd cli && npm ci
cd tools/typescript && npm ci
cd tools/mcp && npm ci
cd tools/mcp-apps && npm ci
cd tools/python && pip install -e ".[dev]"
```

### Test / build / lint

| Package          | Command                            |
| ---------------- | ---------------------------------- |
| `cli/`           | `cd cli && npm test`               |
| `tools/python/`  | `cd tools/python && pytest`        |
| `tools/typescript/` | `cd tools/typescript && npm test` |
| `tools/mcp/`     | `cd tools/mcp && npm run build`    |
| `tools/mcp-apps/`| `cd tools/mcp-apps && npm run typecheck && npm run build && npm test` |
| `guides/`        | `npm run test:guides` (from root)  |
| Guides API tests | `npm run test:guides-api` (root)   |

Run the relevant package's test suite before declaring a task done. Don't run all of them — pick the one you touched.

### Where things live

| Path                    | What it contains                                                          |
| ----------------------- | ------------------------------------------------------------------------- |
| `skills/`               | Canonical agent skills (SKILL.md files). <!-- SKILL_COUNT -->241<!-- /SKILL_COUNT --> skills covering messaging, voice, numbers, AI, IoT, WebRTC, Twilio migration. |
| `providers/claude/`     | Claude Code plugin packaging — synced from `skills/` via `scripts/sync-skills.sh`. Don't edit by hand. |
| `providers/cursor/`     | Cursor plugin packaging — synced from `skills/` via `scripts/sync-skills.sh`. Don't edit by hand. |
| `plugins/telnyx-developer-kit/` | Codex CLI plugin; its four-skill payload is synced from canonical `skills/`. |
| `.agents/`              | Agent-client marketplace metadata mapping the Telnyx Developer Kit to its local plugin source. |
| `submission/`           | Reviewer-facing submission handoff material kept outside distributable plugin archives. |
| `plugins/opencode/`     | OpenCode plugin (auth + TUI for Telnyx-hosted models).                    |
| `tools/python/`         | Python agent toolkit (PyPI: `telnyx-agent-toolkit`).                      |
| `tools/typescript/`     | TypeScript agent toolkit (npm).                                           |
| `tools/mcp/`            | MCP proxy server for the generic Telnyx API MCP endpoint.                |
| `tools/mcp-apps/`       | Focused app-layer MCP servers with MCP Apps UI resources.                |
| `tools/ffl-cli/`        | Filling-from-life CLI tooling.                                            |
| `cli/`                  | Agent CLI for provisioning Telnyx infrastructure.                         |
| `inference/`            | Documentation for Telnyx-hosted inference.                                |
| `guides/`               | Step-by-step operational guides.                                          |
| `scripts/sync-skills.sh`| Syncs canonical skills to modular Claude, flat Cursor, and scoped Codex plugin trees. |
| `agent.json`            | Top-level agent manifest (capabilities, auth, endpoints).                 |
| `plugin.json`, `mcp.json` | Agent Plugins (agent-plugins.org) manifest bundling `skills/` + the hosted MCP server. |
| `.claude-plugin/`       | Claude Code marketplace metadata.                                         |
| `.cursor-plugin/`       | Cursor marketplace metadata.                                              |
| `gemini-extension.json` | Gemini CLI extension manifest.                                            |

### Editing skills

`skills/` is the canonical source **within this repo** — the `providers/` copies derive from it. But not every skill is editable here. Check the skill's `SKILL.md` frontmatter first:

- **Has a `generated_by:` field** (~90% of skills): the skill is regenerated from the official Telnyx OpenAPI specifications by an automated pipeline, and a daily auto-update PR will overwrite any direct edit. Don't PR changes to these — open an issue describing the problem instead; code-example errors are fixed upstream in the spec.
- **No `generated_by:` field**: the skill is hand-authored. PRs welcome. After editing, run:

```bash
./scripts/sync-skills.sh
```

This propagates changes to the modular `providers/claude/plugins/` tree,
`providers/cursor/plugin/`, and the four-skill Codex Developer Kit where
applicable. Commit the sync output alongside your skill edits.

One exception inside hand-authored skills: embedded SDK reference files (`telnyx-twilio-migration/sdk-reference/`, `telnyx-twilio-migration/references/sdk-api-details/`, and `telnyx-webrtc-client-*/references/webrtc-server-api.md`) are pipeline-managed and will also be overwritten — treat those like generated content.

### Editing `agent.json`

The capability list in `agent.json` is the source of truth for what Telnyx surfaces to runtime agents. When adding a capability, also add the corresponding skill under `skills/` and the guide under `guides/` referenced by the `guide` field.

### Code style

- TypeScript: ES2020+, strict mode, ESM where the package supports it.
- Python: 3.10+, PEP 8, type hints required for public functions.
- Markdown: GitHub-flavored. Use ATX headings (`#`, not underlines).
- One change per PR — don't bundle skill edits with toolkit refactors.

### Commit and PR conventions

- Conventional Commits prefix in the title (`feat:`, `fix:`, `chore:`, `docs:`).
- Sign commits (the maintainers' setup expects verified signatures).
- One concern per PR. Keep skill regenerations (`scripts/sync-skills.sh`) in the same PR as the skill source change.
- Reference the issue number in the PR description if one exists.

### Don'ts

- Don't edit files under `providers/claude/plugins/<plugin-name>/skills/`,
  `providers/cursor/plugin/skills/`, or
  `plugins/telnyx-developer-kit/skills/` directly — they are generated. Edit
  the source under `skills/` and run `./scripts/sync-skills.sh`.
- Don't introduce a root-level test runner — each package has its own.
- Don't commit credentials, API keys, or `.env` files. Use the patterns in existing `.env.example` files.
- Don't `npm install` at the root and expect it to install workspace deps — each package has its own `package.json` and `node_modules/`.
- Don't add new top-level directories without updating this file and `README.md`'s table of contents.

---

## Consuming this repo as a runtime agent

If you are an AI agent **using** Telnyx (not modifying this repo), the entry points are:

| You want to…                                              | Start here                                                              |
| --------------------------------------------------------- | ----------------------------------------------------------------------- |
| Discover Telnyx capabilities                              | `/agent.json` (this repo) or `https://telnyx.com/agents/start`          |
| Generate Telnyx code with a coding assistant              | Install the plugin: `team-telnyx/ai` marketplace (Claude / Cursor / Gemini / OpenCode) — see `README.md` |
| Use Telnyx APIs from an agent framework (OpenAI Agents SDK, LangChain, CrewAI, Vercel AI SDK) | `tools/python/` or `tools/typescript/`                                   |
| Talk to Telnyx via MCP                                    | `https://api.telnyx.com/v2/mcp` (Bearer auth) — proxy in `tools/mcp/`   |
| Provision Telnyx infrastructure programmatically          | `cli/` — `npm install -g @telnyx/cli`                                   |
| Get an API key as an agent                                | `https://telnyx.com/agent-signup.md` (bot challenge signup, including email handling)   |

### Auth (for runtime consumers)

- **API keys**: Bearer token, `Authorization: Bearer <key>`. Get one via the portal or programmatically via `https://telnyx.com/agent-signup.md`.
- **OAuth**: Metadata at `https://telnyx.com/.well-known/oauth-authorization-server`.
- **MCP**: Bearer auth against `https://api.telnyx.com/v2/mcp`. Card at `https://telnyx.com/.well-known/mcp/server-card.json`.

See `agent.json` (`auth` block) for the canonical auth contract.

### Discovery surfaces

| Surface                                          | URL                                                       |
| ------------------------------------------------ | --------------------------------------------------------- |
| Agent fast path (entry point)                    | `https://telnyx.com/agents/start`                         |
| Agent manifest                                   | `https://telnyx.com/.well-known/agent-card.json`          |
| Agent access (signup contract)                   | `https://telnyx.com/.well-known/agent-access.json`        |
| Agent skills index                               | `https://telnyx.com/.well-known/agent-skills/index.json`  |
| MCP server card                                  | `https://telnyx.com/.well-known/mcp/server-card.json`     |
| OpenAPI spec                                     | `https://telnyx.com/.well-known/openapi.json`             |
| llms.txt                                         | `https://telnyx.com/llms.txt`                             |
| Capability index                                 | `https://telnyx.com/ai/capabilities.json`                 |
| Pricing                                          | `https://telnyx.com/ai/pricing.json`                      |

---

## Reporting issues

- **Bugs / feature requests**: open an issue.
- **Security issues**: see `.github/SECURITY.md` — do not file public issues for vulnerabilities.

---

_Last reviewed: 2026-05-07_
