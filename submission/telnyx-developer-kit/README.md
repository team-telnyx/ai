# Telnyx Developer Kit release evidence

This directory is reviewer evidence for the Codex plugin. The distributable
plugin is `plugins/telnyx-developer-kit` and registers only
`https://api.telnyx.com/v2/ai/mcp`.

## Current status

Strong production candidate, not production-certified. The repository policy
stays `NOT_AVAILABLE` until every external gate below has dated evidence.

The embedded `connector-contract.json` is byte-identical to
`team-telnyx/telnyx-ai-connector` contract `1.0.0-preview.7` in the local, uncommitted
2026-09-08 five-tool candidate, including the prior delegation/TLS patch. The last checked remote
head still contains preview.5. Its local SHA-256 is
`f14d578ce1f36f339ee9c506009f678b49dace1fda6dee288f131f91082e2fad`.
Record the new source commit only after an authorized commit/push. Preview.6 narrows Call Control
IDs to unambiguous single segments (no `/`, `\\`, `%`, `?`, `#`); preview.7 additionally defers Number
Lookup, removing its catalog entry, execution and delegated capability. It is still Telnyx API v2.

## Local validation

```sh
python3 scripts/check-codex-plugin.py
python3 scripts/check-telnyx-mcp-catalog.py --self-test
./scripts/sync-skills.sh --check
```

The hosted audit is metadata-only: it initializes MCP and lists tools but never
calls one. Run it only against the deployed staging candidate with an OAuth
access token scoped to that exact resource:

```sh
TELNYX_MCP_OAUTH_TOKEN=REDACTED \
  python3 scripts/check-telnyx-mcp-catalog.py \
  --url https://apidev.telnyx.com/v2/ai/mcp
```

## Certification gates

1. Source, Gateway/Auth Manager, and deployment CI pass on their exact heads.
2. Workflow references follow Infra's approved internal moving-reference policy; external actions
   are pinned or explicitly accepted, and resolved workflow revisions are recorded.
3. The immutable multi-architecture image, SBOM, provenance, and signature are
   published and independently verified.
4. The image is deployed disabled to staging; Gateway propagation, PKCE S256,
   exact audience/scope binding, refresh, revocation, and key rotation pass.
5. A dedicated staging account validates all three account-read endpoints. Number Lookup is
   unavailable; stale direct calls must fail without upstream dispatch, even with confirmation.
6. Empty-profile Claude and Codex installs discover exactly these five tools and
   no legacy route, catch-all executor, Apps tool, or resource.
7. Product approves the five-tool contract, and Gateway, Auth Manager, security,
   product, connector, and code owners approve the release.
8. Only then may a separate release change switch marketplace installation to
   `AVAILABLE` and promote the already-tested image digest.

Never commit OAuth tokens, API keys, reviewer credentials, challenge values,
phone numbers, call identifiers, recordings, or private account data here.
