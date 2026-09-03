# Contributing

Contributions of any kind are welcome! If you've found a bug or have a feature request, please feel free to [open an issue](/issues).

To make changes yourself, follow these steps:

1. [Fork](https://help.github.com/articles/fork-a-repo/) this repository and [clone](https://help.github.com/articles/cloning-a-repository/) it locally.
2. Make your changes
3. Test your changes (see below)
4. Submit a [pull request](https://help.github.com/articles/creating-a-pull-request-from-a-fork/)

## What's in this repo

| Directory | What it contains | How to test |
|-----------|-----------------|-------------|
| `tools/python/` | Python agent toolkit (PyPI) | `cd tools/python && pip install -e ".[dev]" && pytest` |
| `tools/typescript/` | TypeScript agent toolkit (npm) | `cd tools/typescript && npm ci && npm test` |
| `tools/mcp/` | MCP proxy server (npm) | `cd tools/mcp && npm ci && npm run build` |
| `cli/` | Agent CLI | `cd cli && npm ci && npm test` |
| `skills/` | Agent skills (SKILL.md files) | See "Skills" below |
| `guides/` | Operational guides | `npm run test:guides` |

## Skills

Skills in `skills/` are the canonical source. `scripts/sync-skills.sh` routes them into the product-specific trees under `providers/claude/plugins/*/skills/` and syncs the complete set to `providers/cursor/plugin/skills/`. After modifying skills, run:

```bash
./scripts/sync-skills.sh
```

You can verify sync locally with `./scripts/check-skills-sync.sh`.

### Auto-generated skills

Most skills are automatically generated from the official Telnyx OpenAPI specifications. You can tell them apart mechanically: a generated skill's `SKILL.md` frontmatter contains a `generated_by:` field; a hand-authored skill's does not.

Do not PR changes to generated skills — a daily automated update regenerates them from the specs and will overwrite your edit. If you find an error in one, [open an issue](https://github.com/team-telnyx/ai/issues) describing the problem; code-example errors are fixed upstream in the OpenAPI spec.

### Hand-authored skills

Skills without a `generated_by:` frontmatter field (the Twilio migration workflow, WebRTC client SDK skills, provider import skills, payment/signup skills, and others) are manually authored. PRs to improve these are welcome — run `./scripts/sync-skills.sh` after editing and commit the sync output.

Exception: embedded SDK reference files inside some hand-authored skills (`telnyx-twilio-migration/sdk-reference/`, `telnyx-twilio-migration/references/sdk-api-details/`, `telnyx-webrtc-client-*/references/webrtc-server-api.md`) are pipeline-managed and will be overwritten — treat those like generated content.

## Questions?

- For API questions, visit [support.telnyx.com](https://support.telnyx.com)
- For skill specification questions, see [agentskills.io](https://agentskills.io)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
