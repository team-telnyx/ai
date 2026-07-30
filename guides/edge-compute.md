# Edge Compute

Use Telnyx Edge Compute when your AI workflow needs low-latency code execution, webhook handling, or an MCP/webhook endpoint that runs on Telnyx edge infrastructure.

## Important scope boundary

`team-telnyx/ai` does **not** manage Edge Compute lifecycle directly.

This repo helps you discover where Edge Compute fits into an AI workflow, but the actual function lifecycle is owned by:

- the `team-telnyx/edge-compute` repo
- the `telnyx-edge` CLI

That means:
- build/deploy/delete/secrets/bindings/actors/inspect/types/storage sqldb live in `telnyx-edge`
- agent/orchestration logic can live in `team-telnyx/ai`
- `team-telnyx/ai` should not pretend to replace Edge Compute

A useful mental model:
- **`ai` = brain / orchestration layer**
- **Edge Compute = low-latency hands / execution layer**

## When to use Edge Compute with `ai`

Good bridge use cases:

1. **MCP server adapters at the edge**
   - expose AI-adjacent tools close to the runtime
2. **Webhook ingestion + AI routing**
   - receive webhook traffic, normalize it, then hand off to AI logic
3. **AI-adjacent functions**
   - redaction, enrichment, scoring, post-processing, lightweight transforms

## Quick Start

```bash
# Authenticate with the dedicated Edge CLI
telnyx-edge auth login

# If your installed CLI exposes API-key auth, agents can use it non-interactively instead
# telnyx-edge auth api-key set <your-api-key>

# Start from the MCP server example
telnyx-edge new-func --from-dir=examples/ts/mcp-server --name=my-mcp-server
cd my-mcp-server

# Add required secrets and deploy
telnyx-edge secrets add TELNYX_API_KEY <your-api-key>
telnyx-edge ship
```

Once deployed, use `team-telnyx/ai` for orchestration and capability discovery, and use the deployed Edge endpoint for execution.

## API Reference

Edge Compute lifecycle is owned by the separate `telnyx-edge` CLI rather than the `team-telnyx/ai` SDK surface.

Common lifecycle commands:

```bash
telnyx-edge --version
telnyx-edge auth status
telnyx-edge status
telnyx-edge list
telnyx-edge actors
telnyx-edge inspect my-mcp-server
telnyx-edge secrets list
telnyx-edge bindings get
telnyx-edge types
telnyx-edge storage sqldb list
```

| Command | Purpose |
|---------|---------|
| `telnyx-edge auth login` | Authenticate the Edge CLI with the public upstream flow |
| `telnyx-edge --version` | Verify which Edge CLI build is installed before debugging auth or deploy failures |
| `telnyx-edge auth status` | Show whether the CLI is authenticated and whether the auth state is still usable |
| `telnyx-edge status` | Check CLI configuration and connectivity before or after a deployment handoff |
| `telnyx-edge new-func` | Scaffold a new function or clone an example |
| `telnyx-edge ship` | Deploy the current function |
| `telnyx-edge list` | List deployed functions |
| `telnyx-edge actors` | Manage account-scoped StatefulActor types that can be bound into functions |
| `telnyx-edge inspect` | Show a function's full details and actor bindings during handoff/debugging |
| `telnyx-edge secrets` | Manage runtime secrets |
| `telnyx-edge bindings` | Manage Telnyx API key bindings |
| `telnyx-edge types` | Generate TypeScript binding types from the Edge project config |
| `telnyx-edge storage sqldb` | Manage Edge SQL database resources from the upstream CLI |

## Prerequisites

- Telnyx account
- Access to the dedicated `telnyx-edge` CLI
- A use case where AI workflows need a real deployed HTTP or MCP execution surface

## Prerequisite: install `telnyx-edge`

Edge Compute is managed through the separate CLI:

```sh
# See the edge-compute repo for install/setup details
# https://github.com/team-telnyx/edge-compute

telnyx-edge auth login
telnyx-edge auth status

# If your installed CLI exposes API-key auth, agents can use it non-interactively instead
# telnyx-edge auth api-key set <your-api-key>
```

Typical lifecycle commands live there:

```sh
telnyx-edge new-func
telnyx-edge ship
telnyx-edge list
telnyx-edge actors
telnyx-edge inspect
telnyx-edge delete-func
telnyx-edge secrets
telnyx-edge bindings
telnyx-edge types
telnyx-edge storage sqldb
```

## Reference architecture

A practical pattern looks like this:

1. Use `team-telnyx/ai` for:
   - agent workflows
   - prompts/orchestration
   - guides and capability discovery
   - Telnyx API integrations
2. Use `team-telnyx/edge-compute` for:
   - function scaffolding
   - deployment
   - secrets, bindings, actors, inspect, generated types, and storage sqldb
   - running webhook/MCP edge endpoints
3. Connect them with a stable boundary:
   - HTTP webhook
   - MCP endpoint
   - function call into an edge-hosted adapter

## Endgame: what a good integration looks like

The end state is **not** "move Edge Compute into `team-telnyx/ai`".

The better endgame is a clear two-layer product:

### Layer 1 — `team-telnyx/ai`
This layer should:
- expose Edge Compute as a first-class capability in docs/manifests/help output
- provide AI-oriented patterns and recipes
- explain when an agent should reach for edge execution
- help users connect agent workflows to deployed edge endpoints

### Layer 2 — `team-telnyx/edge-compute`
This layer should continue to own:
- auth
- function creation
- deployment
- secrets
- bindings
- runtime lifecycle and operational ergonomics

### Bridge between them
The bridge should be explicit and boring:
- `ai` produces orchestration guidance
- Edge Compute provides execution endpoints
- the contract between them is HTTP, MCP, or a documented function interface

That keeps ownership clear and avoids duplicating deployment tooling.

## Phased rollout

### Phase 1 — Discoverability (this repo, now)
- add Edge Compute capability visibility
- add guide-level handoff and examples
- make the README and capabilities output honest about scope

### Phase 2 — Guided integration
- add richer examples for webhook handlers, MCP adapters, and AI post-processing functions
- add copy-paste scaffolds for how an AI app should call a deployed edge endpoint
- document required secrets/bindings patterns

## Surface drift note

The live `telnyx-edge --help` output available in this workspace on July 29, 2026 also exposes:

```bash
telnyx-edge actors
telnyx-edge inspect <function-name>
telnyx-edge types
telnyx-edge storage sqldb ...
```

That matches the delegated issue's monitoring note and keeps this guide aligned with the current upstream CLI surface. Upstream `v0.2.5`, published on July 14, 2026, also adds actor-instance visibility in its release notes. `team-telnyx/ai` should acknowledge that surface, including the SQL storage handoff, but lifecycle execution still belongs to `telnyx-edge`.

### Phase 3 — CLI bridge
Only if ownership stays clear:
- lightweight helper commands or docs-driven handoff from `telnyx-agent` to `telnyx-edge`
- examples: `edge doctor`, `setup-edge-mcp`, or explicit "next command" guidance
- these should shell out to `telnyx-edge`, not reimplement lifecycle management

### Phase 4 — Deeper integration (optional, later)
Only if a stable contract exists:
- standardized templates
- stronger config generation
- possibly a shared library or interface contract

Not before.

## Example: AI app calling an Edge endpoint

A simple pattern is to let your AI app call a deployed edge function for specialized execution.

```python
import os
import requests

response = requests.post(
    "https://<your-edge-endpoint>",
    headers={
        "content-type": "application/json",
        "authorization": f"Bearer {os.environ['TELNYX_API_KEY']}",
    },
    json={
        "task": "redact_pii",
        "payload": {
            "text": "Call me at +1 555 123 4567",
        },
    },
)

print(response.json())
```

```typescript
const response = await fetch("https://<your-edge-endpoint>", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
  },
  body: JSON.stringify({
    task: "redact_pii",
    payload: {
      text: "Call me at +1 555 123 4567",
    },
  }),
});

const result = await response.json();
console.log(result);
```

## Example patterns worth supporting

### 1. MCP server at the edge
Use Edge Compute to host a narrow MCP adapter close to runtime, while `team-telnyx/ai` handles the surrounding agent experience and capability discovery.

### 2. Webhook receiver + AI router
Use Edge Compute to receive inbound webhooks, normalize payloads, and forward structured requests into AI workflows.

### 3. Post-processing function
Use Edge Compute for deterministic transforms such as:
- redaction
- enrichment
- scoring
- transcript cleanup
- lightweight policy checks

These are the sweet spot: small execution units attached to larger agent workflows.

## Fastest path to a real test

If you want to test the end product quickly, do **one** of these first:

### Option A — MCP server on Edge
Best when you want an AI-native demo.

```sh
telnyx-edge new-func --from-dir=examples/ts/mcp-server --name=my-mcp-server
cd my-mcp-server
telnyx-edge secrets add TELNYX_API_KEY <your-api-key>
telnyx-edge ship
```

Then point your MCP client or agent runtime at the deployed endpoint.

### Option B — Webhook receiver on Edge
Best when you want a simple integration seam.

```sh
telnyx-edge new-func --from-dir=examples/js/webhook-receiver --name=my-webhook
cd my-webhook
telnyx-edge ship
```

Then have your AI workflow call or route into that edge endpoint.

### Option C — Post-processing function
Best when you want a narrow but real AI-adjacent utility.

Example use cases:
- redact PII before storage
- enrich messages before downstream routing
- score or classify inbound events
- clean transcripts before analysis

You can also smoke-test a deployed edge endpoint directly:

```bash
curl -X POST "https://<your-edge-endpoint>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -d '{
    "task": "redact_pii",
    "payload": {
      "text": "Call me at +1 555 123 4567"
    }
  }'
```

## What this repo should and should not claim

This repo **can**:
- explain how Edge Compute fits into AI-agent workflows
- provide examples and bridge guidance
- point users to the right product surface

This repo **should not** claim that it:
- deploys edge functions directly
- manages rollbacks or lifecycle state
- replaces `telnyx-edge`
- provides complete native Edge Compute support

## Test recipe

Here is the most practical end-to-end test loop:

1. install `telnyx-edge` and authenticate with `telnyx-edge auth api-key set <your-api-key>`
2. start from a working example in `team-telnyx/edge-compute`
3. deploy it with `telnyx-edge ship`
4. expose a stable HTTP or MCP boundary
5. call that deployed endpoint from an AI workflow
6. iterate on the boundary, not on duplicated deployment logic

That gives you a real integration test without pretending `team-telnyx/ai` owns lifecycle management.

## Best next step

If you want to use Edge Compute from an AI workflow today:

1. install `telnyx-edge` and authenticate with `telnyx-edge auth api-key set <your-api-key>`
2. create/deploy your function in `team-telnyx/edge-compute`
3. expose a stable HTTP or MCP boundary
4. use `team-telnyx/ai` to orchestrate calls into that deployed endpoint

For deploy/runtime specifics, use the `edge-compute` repo as the source of truth.

## Source of truth

- AI workflow/orchestration guidance: `team-telnyx/ai`
- Edge lifecycle and deployment: `team-telnyx/edge-compute`
- Runtime deploy tool: `telnyx-edge`
