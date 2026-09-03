# Telnyx Developer Kit 0.1.0

Initial release candidate for Codex. It bundles four focused Telnyx skills and
registers the OAuth-authenticated connector at `https://api.telnyx.com/v2/ai/mcp`.

The connector contract is pinned to `1.0.0-preview.5` and exposes exactly six
tools: two local catalog-discovery tools, one explicitly confirmed billable
Number Lookup, and three bounded account-scoped call/recording reads. It has no
catch-all API executor and no MCP Apps or embedded UI.

The marketplace remains `NOT_AVAILABLE` until the same immutable connector
image passes staging OAuth, Gateway, key-rotation, clean-install, and endpoint
tests and receives the required human approvals.
