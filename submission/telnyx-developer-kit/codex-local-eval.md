# Local Codex package evaluation

Status: package-valid; live connector evaluation pending staging.

The package validator proves the manifest, marketplace policy, icon, canonical
skill bytes, pinned five-tool contract, annotation justifications, review-case
coverage, credential absence, and exact action pins. The hosted-audit self-test
checks JSON and SSE response handling using local fixtures, with no hosted API calls.

A live Codex installation cannot be called complete until `/v2/ai/mcp` is
deployed disabled to staging, OAuth succeeds with the dedicated reviewer
account, and the three non-billable account reads return only fixture data.
Number Lookup is not part of this release, even with approval. Rejection of stale direct calls
and absence from the catalog must be verified instead of executing a billable staging call.
