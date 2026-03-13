# Platform Distribution

`telnyx-skills` is distributed in a backwards-compatible way across multiple agent ecosystems.

## Current Channels

- Claude
  - consumes `.claude-plugin/marketplace.json`
  - installs plugin directories such as `telnyx-python`, `telnyx-go`, and `telnyx-curl`
- Codex
  - consumes repo-based skill folders or manual copies into agent skill directories
- Cursor
  - consumes repo-based skill folders or manual copies
- OpenClaw
  - consumes repo-based skill folders or manual copies
- Copilot
  - consumes repo/manual skill folders
- direct GitHub users
  - browse and copy the skill folders directly
- `npx skills add`
  - can install from the GitHub repo

## Canonical Shapes

- human/agent-readable:
  - `SKILL.md`
  - `references/api-details.md`
- Claude/plugin-readable:
  - `.claude-plugin/marketplace.json`
- repo/tool-readable:
  - `skills-index.json`

## Minimum Viable Distribution Plan

The current supported baseline is:

- GitHub repo as the canonical public artifact source
- Claude plugin marketplace metadata
- manual installation
- `npx skills add`

## Long-Term Direction

Future wrappers such as npm and pip should package or install from this repo's tagged artifact state instead of becoming separate sources of truth.

That avoids version drift across:

- GitHub
- Claude plugin distribution
- `npx`
- future `pip`
