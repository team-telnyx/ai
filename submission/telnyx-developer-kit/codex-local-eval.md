# Local Codex package evaluation

Status: package-valid; live connector evaluation pending staging.

The package validator proves the manifest, marketplace policy, icon, canonical
skill bytes, pinned six-tool contract, annotation justifications, review-case
coverage, credential absence, and exact action pins. The hosted-audit self-test
proves JSON and SSE response handling without making network requests.

A live Codex installation cannot be called complete until `/v2/ai/mcp` is
deployed disabled to staging, OAuth succeeds with the dedicated reviewer
account, and the three non-billable account reads return only fixture data.
Number Lookup must remain unexecuted until a human separately approves one
billable staging call.
