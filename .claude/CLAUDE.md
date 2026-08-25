# CLAUDE.md — team-telnyx/ai

Project rules for Claude Code (and other Claude-family coding agents)
working in this repo. The canonical source of truth is `AGENTS.md` at
the repo root — keep this file in sync with it.

## What this repo is

Telnyx AI — agent toolkits (Python, TypeScript), agent CLI, plugins for
Claude Code / Cursor / Gemini CLI / OpenCode, an MCP proxy, 235+ Agent
Skills, and operational guides.

## Hard rules (must follow)

- **Generated files** under `providers/claude/plugin/skills/` and
  `providers/cursor/plugin/skills/` are produced by
  `./scripts/sync-skills.sh` from `skills/`. **Never hand-edit them.**
  Edit the source under `skills/` and run the sync script.
- **Per-package installs**: each package owns its own `package.json` /
  `node_modules`. Don't run `npm install` at the repo root and don't
  introduce a root-level test runner.
- **No secrets in commits**: never add `.env` files, API keys, or
  credentials. Use the existing `.env.example` patterns.
- **Conventional Commits**: title prefix required (`feat:`, `fix:`,
  `chore:`, `docs:`).
- **Signed commits**: maintainer setup expects verified signatures.

## Setup

Per-package, not root:

```bash
cd cli && npm ci
cd tools/typescript && npm ci
cd tools/mcp && npm ci
cd tools/python && pip install -e ".[dev]"
```

Root-level: `npm ci` covers only the guides test scripts.

## Testing

Run only the package you touched.

| Package | Command |
| --- | --- |
| `cli/` | `cd cli && npm test` |
| `tools/python/` | `cd tools/python && pytest` |
| `tools/typescript/` | `cd tools/typescript && npm test` |
| `tools/mcp/` | `cd tools/mcp && npm run build` |
| `guides/` | `npm run test:guides` (root) |
| Guides API | `npm run test:guides-api` (root) |

## Editing agent skills

Skills are written as `SKILL.md` files under `skills/<skill-name>/`.
After editing any skill, run:

```bash
./scripts/sync-skills.sh
```

Commit the sync output alongside the skill change — don't leave them
out of sync. CI will catch drift.

## Code style

- TypeScript: ES2020+, strict mode, ESM where supported.
- Python: 3.10+, PEP 8, type hints on public functions.
- Markdown: GitHub-flavored, ATX headings only.
- One concern per PR — skill regen + skill source go together; toolkit
  refactors stay separate.

## Where things live

- `skills/` — canonical SKILL.md files (the source of truth)
- `providers/{claude,cursor}/` — generated plugin packaging (don't edit)
- `plugins/opencode/` — OpenCode plugin (auth + TUI for Telnyx-hosted models)
- `tools/python/` — Python agent toolkit (PyPI)
- `tools/typescript/` — TypeScript agent toolkit (npm)
- `tools/mcp/` — MCP proxy server
- `tools/ffl-cli/` — Filling-from-life CLI
- `cli/` — agent CLI for provisioning Telnyx infrastructure
- `inference/` — Telnyx inference docs
- `guides/` — operational guides
- `agent.json` — top-level agent manifest
- `plugin.json` / `mcp.json` — Agent Plugins (agent-plugins.org) manifest: bundles `skills/` + hosted MCP
- `.claude-plugin/` — Claude Code marketplace metadata
- `.cursor-plugin/` — Cursor marketplace metadata
- `gemini-extension.json` — Gemini CLI extension manifest

For runtime-agent (consumer) guidance, see `AGENTS.md` §"Consuming this
repo as a runtime agent".
