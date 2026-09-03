# Telnyx Developer Kit release evidence

This directory is reviewer evidence for the Codex plugin. The distributable
plugin is `plugins/telnyx-developer-kit` and registers only
`https://api.telnyx.com/v2/ai/mcp`.

## Current status

Strong production candidate, not production-certified. The repository policy
stays `NOT_AVAILABLE` until every external gate below has dated evidence.

The embedded `connector-contract.json` is byte-identical to
`team-telnyx/telnyx-ai-connector` contract `1.0.0-preview.5` at source candidate
`5bff92e2f32f32705e1ea3a5e15d0676c64b4cb9`. Its SHA-256 is
`29c307e0735c462d5cafa7a4d1223fd2e8b57664b013d6fd46289574fb482878`.
After the source PR merges, update this pin to the merged commit if the contract
bytes change.

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
2. All workflow actions are exact-SHA pinned and approved by the owning team.
3. The immutable multi-architecture image, SBOM, provenance, and signature are
   published and independently verified.
4. The image is deployed disabled to staging; Gateway propagation, PKCE S256,
   exact audience/scope binding, refresh, revocation, and key rotation pass.
5. A dedicated staging account validates every non-billable endpoint and one
   separately approved Number Lookup. No billable lookup is pre-authorized.
6. Empty-profile Claude and Codex installs discover exactly these six tools and
   no legacy route, catch-all executor, Apps tool, or resource.
7. Product approves the six-tool contract, and Gateway, Auth Manager, security,
   product, connector, and code owners approve the release.
8. Only then may a separate release change switch marketplace installation to
   `AVAILABLE` and promote the already-tested image digest.

Never commit OAuth tokens, API keys, reviewer credentials, challenge values,
phone numbers, call identifiers, recordings, or private account data here.
