# Edge Compute

Use Telnyx Edge Compute for low-latency HTTP execution, webhook ingress, MCP servers, and small AI-adjacent transforms on Telnyx edge infrastructure.

## Ownership and repository context

`team-telnyx/ai` is the orchestration and guidance layer. It does **not** implement the Edge Compute lifecycle. The dedicated surfaces are:

- source examples and product documentation: [`team-telnyx/edge-compute`](https://github.com/team-telnyx/edge-compute)
- installable lifecycle tool: `telnyx-edge`
- AI workflow and handoff guidance: `team-telnyx/ai` and `telnyx-agent`

Commands such as `ship`, `inspect`, `reset-func`, secrets, bindings, storage, revisions, rollback, and actors belong to `telnyx-edge`.

The example paths in this guide, such as `examples/ts/mcp-server`, are paths **inside an `edge-compute` checkout**. They do not exist in a normal `team-telnyx/ai` checkout. Clone the source repository first, or use the repository-aware `telnyx-agent setup-edge-*` output.

```bash
git clone --depth 1 https://github.com/team-telnyx/edge-compute.git
# Source examples are under ./edge-compute/examples/
```

## Prerequisites and readiness

1. Download the latest CLI from the [Edge Compute releases page](https://github.com/team-telnyx/edge-compute/releases).
2. Authenticate interactively or with an API key stored by the CLI.
3. Run the root status diagnostic. Unlike `auth status`, this validates configuration, credentials, and API connectivity.

```bash
# Interactive OAuth
telnyx-edge auth login

# Or non-interactive auth; avoid putting the literal key in shell history
export TELNYX_API_KEY='***'
telnyx-edge auth api-key set "$TELNYX_API_KEY"

# Local auth marker, then end-to-end validation
telnyx-edge auth status
telnyx-edge status
```

`telnyx-agent edge-doctor --json` reports readiness only when all three conditions hold: `telnyx-edge` is installed, `auth status` is positively recognized as authenticated, and root `telnyx-edge status` reports that all checks passed. It probes command help surfaces instead of inferring capabilities from a version number.

```bash
telnyx-agent edge-doctor --json
```

## Function names

Names must be 1–64 characters, contain only alphanumeric characters and dashes, and have no leading or trailing dash. Examples: `my-mcp-server`, `webhook-v2`, `report7`.

## Secure MCP server handoff

The TypeScript MCP example requires two distinct secrets:

- `TELNYX_API_KEY`: credential used by MCP tools for upstream Telnyx API calls
- `SHARED_SECRET`: inbound bearer token required on MCP requests

Do not use the Telnyx API key as the inbound endpoint bearer token. Do not commit either value. The example rejects MCP requests when `SHARED_SECRET` is absent.

The helper emits `source_repo`, `source_path`, capability booleans, and an executable clone/build/secret/ship/inspect flow:

```bash
telnyx-agent setup-edge-mcp --name my-mcp-server --json
```

Equivalent manual flow:

```bash
export TELNYX_API_KEY='***'
export SHARED_SECRET="$(openssl rand -hex 32)"

EDGE_COMPUTE_SRC="$(mktemp -d)/edge-compute"
git clone --depth 1 https://github.com/team-telnyx/edge-compute.git "$EDGE_COMPUTE_SRC"
telnyx-edge new-func \
  --from-dir="$EDGE_COMPUTE_SRC/examples/ts/mcp-server" \
  --name=my-mcp-server
cd my-mcp-server

npm install
npm run build
telnyx-edge secrets add TELNYX_API_KEY "$TELNYX_API_KEY"
telnyx-edge secrets add SHARED_SECRET "$SHARED_SECRET"
telnyx-edge ship
telnyx-edge inspect my-mcp-server
```

Configure the MCP client with the inspected invoke URL and the **shared secret**, not the Telnyx API key:

```json
{
  "mcpServers": {
    "telnyx-edge": {
      "url": "https://<your-edge-endpoint>/",
      "headers": {
        "Authorization": "Bearer <your-shared-secret>"
      }
    }
  }
}
```

A correctly quoted smoke test looks like this (reuse the `SHARED_SECRET` exported above):

```bash
EDGE_MCP_TOKEN="$SHARED_SECRET"
curl -X POST "https://<your-edge-endpoint>/" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $EDGE_MCP_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"smoke-test","version":"1.0.0"}}}'
```

Health-check endpoints remain unauthenticated for platform probes; MCP traffic requires the bearer token.

## Secure webhook handoff

The JavaScript webhook example supports HMAC-SHA256 verification through `WEBHOOK_SECRET`. Production ingress should set it and configure the producer with the same key. Sign the exact request bytes and send `x-webhook-signature: sha256=<hex>`.

```bash
telnyx-agent setup-edge-webhook --name my-webhook --json
```

Equivalent manual flow:

```bash
export WEBHOOK_SECRET="$(openssl rand -hex 32)"

EDGE_COMPUTE_SRC="$(mktemp -d)/edge-compute"
git clone --depth 1 https://github.com/team-telnyx/edge-compute.git "$EDGE_COMPUTE_SRC"
telnyx-edge new-func \
  --from-dir="$EDGE_COMPUTE_SRC/examples/js/webhook-receiver" \
  --name=my-webhook
cd my-webhook

telnyx-edge secrets add WEBHOOK_SECRET "$WEBHOOK_SECRET"
telnyx-edge ship
telnyx-edge inspect my-webhook
```

Signed test request:

```bash
PAYLOAD='{"event":"message.received","id":"evt_123"}'
SIGNATURE="sha256=$(printf '%s' "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | cut -d' ' -f2)"

curl -X POST "https://<your-edge-endpoint>/" \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

Do not put `WEBHOOK_SECRET` in the request body or an Authorization header unless your own handler explicitly defines that separate protocol. Its purpose in this example is HMAC verification.

## CLI lifecycle reference

### Create, deploy, inspect, and recover

```bash
# New generated project
telnyx-edge new-func --language=ts --name=my-function

# Or copy a checked-out source directory into a new project
telnyx-edge new-func --from-dir=/absolute/source/path --name=my-function

cd my-function
telnyx-edge ship
telnyx-edge inspect my-function
```

`inspect <function>` is the per-function detail view: deployment status, invoke URL, timestamps, and actor bindings. Probe it with `telnyx-edge inspect --help` when supporting multiple CLI releases.

A failed function can be reset to `created` without changing its identity, fixed, and shipped again:

```bash
telnyx-edge reset-func my-function
telnyx-edge ship --from-dir=./my-function
```

`reset-func` applies to failed states, not healthy deployments. Teardown is asynchronous.

### Revisions and rollback

Every successful ship creates an immutable revision.

```bash
telnyx-edge revisions list my-function
telnyx-edge rollback my-function <revision-id>
```

Rollback retargets traffic to a prior healthy revision without rebuilding or re-uploading it.

### Secrets and Telnyx bindings

```bash
telnyx-edge secrets add NAME "$VALUE"
telnyx-edge secrets list
telnyx-edge secrets delete NAME

telnyx-edge bindings create
telnyx-edge bindings get
telnyx-edge bindings validate
telnyx-edge bindings update
telnyx-edge bindings delete
```

Use secrets for confidential values. Telnyx bindings provide managed Telnyx API access without hardcoding credentials in function source.

### Persistent KV storage

```bash
# Namespace lifecycle
telnyx-edge storage kv create --name my-data
telnyx-edge storage kv list
telnyx-edge storage kv get <namespace-id>
telnyx-edge storage kv delete <namespace-id>

# Keys
telnyx-edge storage kv key put <namespace-id> greeting "hello"
telnyx-edge storage kv key put <namespace-id> blob --path ./data.bin
telnyx-edge storage kv key get <namespace-id> greeting
telnyx-edge storage kv key list <namespace-id> --prefix config/
telnyx-edge storage kv key delete <namespace-id> greeting
```

Declare a runtime binding in `telnyx.toml` or supported classic project manifests, then regenerate TypeScript declarations:

```toml
[storage.kv.CACHE]
id = "<namespace-uuid>"
```

```bash
telnyx-edge types
```

`types` generates `telnyx-env.d.ts`; KV handles are typed as `KvNamespace`. Rerun it whenever binding declarations change.

### Cloud Storage binding types (v0.2.4)

CLI v0.2.4 added `[storage.cloudstorage.<name>]` manifest bindings and `CloudStorageBucket` output from `telnyx-edge types`. JavaScript/TypeScript scaffolds include the Cloud Storage dependencies.

```toml
[storage.cloudstorage.ARCHIVE]
bucket_name = "my-archive"
region = "us-east-1"
```

```bash
npm install @telnyx/edge-runtime@^0.3.0 @aws-sdk/client-s3
telnyx-edge types
```

The generated `env.ARCHIVE` is a typed `CloudStorageBucket`. This is a runtime binding/type-generation feature; it is distinct from the `storage kv` control-plane commands.

## Stateful Actors

Probe actor capabilities directly:

```bash
telnyx-edge new-func --help
telnyx-edge actors --help
telnyx-edge actors instances --help
```

Scaffold and inspect actors:

```bash
telnyx-edge new-func --actor --language=ts --name=my-actor

telnyx-edge actors list
telnyx-edge actors inspect <type>
telnyx-edge actors instances <type>
telnyx-edge inspect <function>
```

The two inspect commands answer different questions:

- `inspect <function>` shows one function and its actor bindings.
- `actors inspect <type>` shows one account-scoped actor type, attached functions, and a best-effort live instance count.

### v0.2.5 actor-instance support and limitations

v0.2.5 added `actors instances <type>` and the instance count in `actors inspect <type>`. The instance command is intentionally limited:

- read-only metadata, never stored state values
- type/instance IDs, state-key names, aggregate size, and timestamps only
- first page only, up to 50 instances, ordered by newest activity; no CLI pagination flags yet
- instances are created on first `idFromName(...)`
- instances are actor identities, not pods, and therefore have no pod health status
- an instance count may display as `unknown` when the best-effort state-store count cannot be loaded

Do not treat `actors instances` as a database dump, state-value inspection API, health monitor, or complete inventory when the reported total exceeds the displayed rows.

## Calling an application-protected Edge endpoint

Authentication is defined by the deployed function. Use an endpoint-specific credential, not automatically a Telnyx management API key:

```typescript
const response = await fetch("https://<your-edge-endpoint>/", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${process.env.EDGE_ENDPOINT_TOKEN}`,
  },
  body: JSON.stringify({ task: "redact_pii", payload: { text: "Call me at +1 555 123 4567" } }),
});

if (!response.ok) throw new Error(`Edge request failed: ${response.status}`);
console.log(await response.json());
```

If the function does not implement authentication, an Authorization header does not make it secure. Add and verify bearer-token or signature logic in the function, and use HTTPS.

## Practical end-to-end test

1. Install and authenticate `telnyx-edge`.
2. Require `telnyx-edge status` to pass.
3. Clone `team-telnyx/edge-compute` and copy a real example with an explicit valid name.
4. Install/build dependencies where required.
5. Set runtime secrets without committing or logging values.
6. Ship, then use `inspect` to obtain and verify deployment details.
7. Exercise the endpoint with its application-level bearer token or HMAC signature.
8. Connect the stable HTTP/MCP boundary to the AI orchestration layer.

## Source of truth

- Edge docs: https://developers.telnyx.com/docs/edge-compute
- Edge examples and releases: https://github.com/team-telnyx/edge-compute
- AI orchestration guidance: https://github.com/team-telnyx/ai
