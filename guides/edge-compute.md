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

1. Download the latest CLI from the [Edge Compute releases page](https://github.com/team-telnyx/edge-compute/releases). SQL databases require CLI v0.3.0 or newer.
2. Authenticate interactively or with an API key stored by the CLI.
3. Run the root status diagnostic. Unlike `auth status`, this validates configuration, credentials, and API connectivity.

```bash
telnyx-edge --version
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

## Quick Start

Use one of the repository-aware handoff commands below for a complete clone, build, secrets, deploy, and inspect sequence. The expanded manual flows show exactly what each helper emits.

### Classic Node lockfile prerequisite

Before shipping a classic Node function whose `package.json` declares dependencies, ensure the function directory contains either `package-lock.json` or `npm-shrinkwrap.json`. These are the accepted npm lockfile forms; without one, `telnyx-edge ship` fails before upload.

Run `npm install` in the function directory to create `package-lock.json`. The MCP manual flow below already does this before building and shipping.

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

## API Reference

### List, create, deploy, inspect, and recover

```bash
# List deployed functions. Use --page and --page-size for larger accounts.
telnyx-edge list
telnyx-edge list --page 2 --page-size 25
# New generated project
telnyx-edge new-func --language=ts --name=my-function

# Or copy a checked-out source directory into a new project
telnyx-edge new-func --from-dir=/absolute/source/path --name=my-function

cd my-function
telnyx-edge ship
telnyx-edge inspect my-function
```

`inspect <function>` is the per-function detail view: deployment status, invoke URL, timestamps, and **every binding the deployed function declares**. Binding rows show the `env.<NAME>` handle, kind, target, and status; actor rows also show their owner/reference role. Probe it with `telnyx-edge inspect --help` when supporting multiple CLI releases.

Before resetting a failed function, inspect the latest ship outcome: `ship status <function>` prints one actionable, stage-classified reason, and `--logs` adds the build-log or crash-output snippet when the platform supplied one. A failed function can then be reset to `created` without changing its identity, fixed, and shipped again:

```bash
telnyx-edge ship status my-function --logs
telnyx-edge reset-func my-function --yes
telnyx-edge ship --from-dir=./my-function
```

`reset-func` applies to failed states, not healthy deployments. Teardown is asynchronous.

Delete a function when it is no longer needed:

```bash
telnyx-edge delete-func my-function --yes
```

`delete-func` is irreversible. Use `--yes` (`-y`) in scripts, agents, and CI to skip the interactive confirmation; see [Non-interactive destructive commands](#non-interactive-destructive-commands) for the full list.

### Custom domains (v0.5.0)

`domains add` prints the DNS TXT record needed for ownership verification. After publishing it, complete the workflow and use `--yes` for destructive teardown:
```bash
telnyx-edge domains add api.example.com <function-id>
telnyx-edge domains verify api.example.com
telnyx-edge domains cert upload api.example.com --cert ./cert.pem --key ./key.pem
telnyx-edge domains list
telnyx-edge domains delete api.example.com --yes
```
DNS propagation can delay verification; retry `verify` before certificate upload. `domains list` reports verification and certificate status.

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
telnyx-edge secrets delete NAME --yes

telnyx-edge bindings create
telnyx-edge bindings get
telnyx-edge bindings validate
telnyx-edge bindings update
telnyx-edge bindings delete --yes
```

Use secrets for confidential values. Telnyx bindings provide managed Telnyx API access without hardcoding credentials in function source. The commands above manage the account resources; declare the handles a function uses in `func.toml` or `telnyx.toml`:

```toml
[telnyx]
binding = "TELNYX_CLIENT"

[[secrets]]
binding = "MCP_TOKEN"
name = "SHARED_SECRET"
```

The secret must already exist under its store name (`telnyx-edge secrets add SHARED_SECRET "$SHARED_SECRET"`). Install the current runtime and Telnyx client, then generate declarations:

```bash
npm install @telnyx/edge-runtime@latest telnyx
telnyx-edge types
```

```text
✓ Generated binding types for 2 binding(s) at telnyx-env.d.ts
    env.TELNYX_CLIENT → Telnyx (from "telnyx")
    env.SECRETS.get("MCP_TOKEN")
```

The generated `telnyx-env.d.ts` types `env.TELNYX_CLIENT` as the Telnyx client and narrows `env.SECRETS.get(...)` to the declared secret handles:

```typescript
import { env } from "@telnyx/edge-runtime";

const balance = await env.TELNYX_CLIENT.balance.retrieve();
const mcpToken: string = await env.SECRETS.get("MCP_TOKEN");
```

`binding` is the code-facing handle; `name` is the secret-store key. `types` covers all declared actor, Telnyx, secret, KV, SQL database, and Cloud Storage bindings, runs offline without authentication, and should be rerun whenever the manifest changes.

### Rate limiter bindings

Declare each fixed-window limiter in `func.toml` or `telnyx.toml`. `limit` is the allowed call count and `period` is the window in seconds:

```toml
[[ratelimits]]
name = "api-limit"
namespace_id = "1001"
limit = 100
period = 60
```

Install `@telnyx/edge-runtime` **0.9.2 or newer**, then regenerate declarations. `telnyx-edge types` emits the binding as a runtime `RateLimiter`:

```bash
npm install @telnyx/edge-runtime@latest
telnyx-edge types
```

```typescript
import { env } from "@telnyx/edge-runtime";

const { success } = await env.API_LIMIT.limit({ key: clientId });
if (!success) return new Response("Too many requests", { status: 429 });
```

The runtime handle is canonicalized to uppercase with hyphens replaced by underscores (`api-limit` becomes `env.API_LIMIT`). `namespace_id` is optional and must be a positive integer string; functions using the same value share a counter pool, so reuse it only when cross-function limiting is intentional.

### Non-interactive destructive commands

Destructive commands prompt in a terminal and deliberately fail rather than hang when stdin is not a terminal. Scripts, agents, and CI must pass `--yes` (`-y`) to `delete-func`, `reset-func`, `domains delete`, `secrets delete`, `bindings delete`, `actors delete`, `storage sqldb delete`, `storage kv delete`, and `storage kv key delete`. Piping the output of `yes` is not accepted.

```bash
telnyx-edge delete-func my-function --yes
telnyx-edge storage sqldb delete "$SQLDB_ID" --yes
```

`--yes` only waives the CLI's local intent check. On SQL database and KV namespace deletion, `--force` (`-f`) separately tells the API to override its "still bound/in use" precondition; it does **not** confirm intent. To do both in CI, pass both flags, for example `telnyx-edge storage sqldb delete "$SQLDB_ID" --yes --force`. Functions that still bind the deleted resource are not deleted and will break.

For a whole shell or CI job, `TELNYX_EDGE_SKIP_CONFIRMATIONS=1` has the same effect as `--yes`. For a persistent local preference, use `telnyx-edge config set skip_confirmations true` (undo with `false`). Neither setting implies `--force`, which remains per invocation.

### Persistent KV storage

```bash
# Namespace lifecycle
telnyx-edge storage kv create --name my-data
telnyx-edge storage kv list
telnyx-edge storage kv get <namespace-id>
telnyx-edge storage kv delete <namespace-id> --yes

# Keys
telnyx-edge storage kv key put <namespace-id> greeting "hello"
telnyx-edge storage kv key put <namespace-id> blob --path ./data.bin
telnyx-edge storage kv key get <namespace-id> greeting
telnyx-edge storage kv key list <namespace-id> --prefix config/
telnyx-edge storage kv key delete <namespace-id> greeting --yes
```

Declare a runtime binding in `telnyx.toml` or supported classic project manifests, then regenerate TypeScript declarations:

```toml
[storage.kv.CACHE]
id = "<namespace-uuid>"
```

Then run `telnyx-edge types`: it generates `telnyx-env.d.ts` with KV handles typed as `KvNamespace`. Rerun it whenever binding declarations change.

### SQL databases (v0.3.0; bound parameters v0.4.1)

A SQL database is an account-scoped SQLite database. It exists independently of functions and can be shared by every function that binds its UUID.

```bash
# Lifecycle: copy the UUID printed by create into SQLDB_ID.
telnyx-edge storage sqldb create --name my-app-db
SQLDB_ID="<uuid-from-create>"
telnyx-edge storage sqldb list
telnyx-edge storage sqldb get "$SQLDB_ID"

# In a script/CI teardown, confirmation must be explicit.
telnyx-edge storage sqldb delete "$SQLDB_ID" --yes
```

Wait until `storage sqldb get` reports `provision_ok` before using a new database. There is no server to size or per-database deployment.

Run SQL directly with `--remote` and **exactly one** of `--command`/`-c` or `--file`/`-f`. Add `--json` when a machine-readable result is needed:

```bash
telnyx-edge storage sqldb execute "$SQLDB_ID" --remote \
  --command "CREATE TABLE links (id INTEGER PRIMARY KEY, url TEXT NOT NULL)"
telnyx-edge storage sqldb execute "$SQLDB_ID" --remote -f ./schema.sql
telnyx-edge storage sqldb execute "$SQLDB_ID" --remote \
  -c "SELECT id, url FROM links ORDER BY id" --json
# Bind untrusted values instead of interpolating them into SQL.
telnyx-edge storage sqldb execute "$SQLDB_ID" --remote \
  -c "SELECT id, url FROM links WHERE url = ? AND id > ?" --param "https://example.com" --param-json 42
```

Do not combine `--command` and `--file`, and do not omit both. `--param` (binds a string) and `--param-json` (binds a JSON number, boolean, or null) are repeatable and fill `?` placeholders left to right in flag order; the count must match the placeholders exactly, and they only work with `--command`. Prefer bindings over interpolating outside values into SQL. Versioned migrations are created locally, then listed or applied against the remote database. Applied migrations are recorded in the database, so `apply` is safe to rerun and applies only pending files in numeric order.

```bash
telnyx-edge storage sqldb migrations create "$SQLDB_ID" add-links-table
# Edit the generated numbered .sql file under migrations/$SQLDB_ID/.
telnyx-edge storage sqldb migrations list "$SQLDB_ID" --remote
telnyx-edge storage sqldb migrations apply "$SQLDB_ID" --remote
```

Bind the database in `func.toml` or `telnyx.toml`, using the real UUID, and regenerate declarations:

```toml
[storage.sqldb.DB]
id = "<uuid>"
```

```bash
npm install @telnyx/edge-runtime@latest
telnyx-edge types
```

`env.DB` is generated as `SqlDatabase` and requires `@telnyx/edge-runtime` **0.9.0 or newer**. Keep the runtime current rather than pinning it to an older CLI-era version.

Do not confuse shared account SQLDB with actor-local SQL. `[storage.sqldb.DB]` exposes one account database as `env.DB` to any functions that bind the same UUID. `ctx.storage.sql` belongs to one StatefulActor instance, is reached only inside that actor, and has no `storage sqldb execute` or migration CLI surface.

### Cloud Storage binding types (v0.2.4)

CLI v0.2.4 added `[storage.cloudstorage.<name>]` manifest bindings and `CloudStorageBucket` output from `telnyx-edge types`. JavaScript/TypeScript scaffolds include the Cloud Storage dependencies.

```toml
[storage.cloudstorage.ARCHIVE]
bucket_name = "my-archive"
region = "us-east-1"
```

```bash
npm install @telnyx/edge-runtime@latest @aws-sdk/client-s3
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
telnyx-edge actors delete <type> --yes
telnyx-edge inspect <function>
```

The two inspect commands answer different questions:

- `inspect <function>` shows one function and every declared binding (including actor owner/reference roles).
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

Python equivalent:

```python
import os
import requests

response = requests.post(
    "https://<your-edge-endpoint>/",
    headers={"Authorization": f"Bearer {os.environ['EDGE_ENDPOINT_TOKEN']}"},
    json={"task": "redact_pii", "payload": {"text": "Call me at +1 555 123 4567"}},
    timeout=30,
)
response.raise_for_status()
print(response.json())
```

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
