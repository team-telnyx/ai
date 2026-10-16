<!-- SDK reference: telnyx-missions-curl -->

# Telnyx Missions - curl

## Installation

```text
# curl is pre-installed on macOS, Linux, and Windows 10+
```

## Setup

```bash
export TELNYX_API_KEY="YOUR_API_KEY_HERE"
```

All examples below use `$TELNYX_API_KEY` for authentication.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```bash
# Check HTTP status code in response
response=$(curl -s -w "\n%{http_code}" \
  -X POST "https://api.telnyx.com/v2/messages" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to": "+13125550001", "from": "+13125550002", "text": "Hello"}')

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

case $http_code in
  2*) echo "Success: $body" ;;
  422) echo "Validation error — check required fields and formats" ;;
  429) echo "Rate limited — retry after delay"; sleep 1 ;;
  401) echo "Authentication failed — check TELNYX_API_KEY" ;;
  *)   echo "Error $http_code: $body" ;;
esac
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List endpoints return paginated results. Use `page[number]` and `page[size]` query parameters to navigate pages. Check `meta.total_pages` in the response.

## List missions

Returns a paginated list of all mission definitions in your organization. Missions describe a goal and the tools, knowledge bases, and MCP servers agents may use to accomplish it.

`GET /ai/missions`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions"
```

Returns: `created_at` (date-time), `description` (string), `execution_mode` (enum: external, managed), `instructions` (string), `metadata` (object), `mission_id` (uuid), `model` (string), `name` (string), `updated_at` (date-time)

## Create mission

Creates a new mission definition from the provided configuration and returns the created mission. Execute the mission by starting runs against it.

`POST /ai/missions` — Required: `name`

Optional: `description` (string), `execution_mode` (enum: external, managed), `instructions` (string), `metadata` (object), `model` (string)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "Name",
  "description": "Description",
  "model": "Model",
  "instructions": "Instructions",
  "execution_mode": "external"
}' \
  "https://api.telnyx.com/v2/ai/missions"
```

Returns: `created_at` (date-time), `description` (string), `execution_mode` (enum: external, managed), `instructions` (string), `metadata` (object), `mission_id` (uuid), `model` (string), `name` (string), `updated_at` (date-time)

## List recent events

Returns a paginated list of recent events across every mission in your organization, optionally filtered by event type. Useful for building activity feeds or monitoring dashboards.

`GET /ai/missions/events`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/events"
```

Returns: `agent_id` (string), `event_id` (string), `idempotency_key` (string), `payload` (object), `run_id` (string), `step_id` (string), `summary` (string), `timestamp` (date-time), `type` (enum: status_change, step_started, step_completed, step_failed, tool_call, tool_result, message, error, custom)

## List recent runs

Returns a paginated list of recent runs across every mission in your organization, optionally filtered by run status. Useful for monitoring overall mission activity without querying each mission individually.

`GET /ai/missions/runs`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/runs"
```

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## Get mission

Get a mission by ID (includes tools, knowledge_bases, mcp_servers)

`GET /ai/missions/{mission_id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}"
```

Returns: `created_at` (date-time), `description` (string), `execution_mode` (enum: external, managed), `instructions` (string), `metadata` (object), `mission_id` (uuid), `model` (string), `name` (string), `updated_at` (date-time)

## Update mission

Replaces the specified mission's definition with the provided configuration and returns the updated mission.

`PUT /ai/missions/{mission_id}`

Optional: `description` (string), `execution_mode` (enum: external, managed), `instructions` (string), `metadata` (object), `model` (string), `name` (string)

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "Name",
  "description": "Description",
  "model": "Model",
  "instructions": "Instructions",
  "execution_mode": "external"
}' \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}"
```

Returns: `created_at` (date-time), `description` (string), `execution_mode` (enum: external, managed), `instructions` (string), `metadata` (object), `mission_id` (uuid), `model` (string), `name` (string), `updated_at` (date-time)

## Delete mission

Permanently deletes the specified mission definition and returns no content on success.

`DELETE /ai/missions/{mission_id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}"
```

## Clone mission

Creates a copy of the specified mission as a new mission definition, so you can iterate on its configuration without modifying the original.

`POST /ai/missions/{mission_id}/clone`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/clone"
```

## List knowledge bases

Returns the knowledge bases attached to the specified mission. Knowledge bases provide reference content agents can draw on during runs.

`GET /ai/missions/{mission_id}/knowledge-bases`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/knowledge-bases"
```

## Create knowledge base

Create a new knowledge base for a mission

`POST /ai/missions/{mission_id}/knowledge-bases`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/knowledge-bases"
```

## Get knowledge base

Returns the details of a single knowledge base attached to the specified mission.

`GET /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}"
```

## Update knowledge base

Replaces the definition of the specified knowledge base on this mission.

`PUT /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}"
```

## Delete knowledge base

Detaches the specified knowledge base from the mission so its content is no longer available to agents in subsequent runs.

`DELETE /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}"
```

## List MCP servers

Returns the MCP servers configured on the specified mission. MCP servers expose external tools and data sources agents can use during runs.

`GET /ai/missions/{mission_id}/mcp-servers`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/mcp-servers"
```

## Create MCP server

Adds an MCP server to the specified mission, making the server's tools available to agents during runs of this mission.

`POST /ai/missions/{mission_id}/mcp-servers`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/mcp-servers"
```

## Get MCP server

Returns the configuration of a single MCP server attached to the specified mission.

`GET /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/mcp-servers/{mcp_server_id}"
```

## Update MCP server

Replaces the configuration of the specified MCP server on this mission.

`PUT /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/mcp-servers/{mcp_server_id}"
```

## Delete MCP server

Removes the specified MCP server from the mission, revoking agent access to its tools in subsequent runs.

`DELETE /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/mcp-servers/{mcp_server_id}"
```

## List runs for mission

Returns a paginated list of runs for the specified mission, optionally filtered by run status, so you can track the mission's execution history over time.

`GET /ai/missions/{mission_id}/runs`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs"
```

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## Start a run

Starts a new run of the specified mission and returns the created run object. Track its progress through the run detail, plan, and events endpoints.

`POST /ai/missions/{mission_id}/runs`

Optional: `input` (object), `metadata` (object)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "input": {
    "objective": "Summarize yesterday's failed call attempts"
  },
  "metadata": {
    "requested_by": "docs-example"
  }
}' \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs"
```

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## Get run details

Returns the full details of a single run, including its current status. Use this to poll an in-flight run or inspect the outcome of a completed one.

`GET /ai/missions/{mission_id}/runs/{run_id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}"
```

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## Update run

Updates a run's status and/or result and returns the updated run object. Typically used by executing agents to report progress or record the final outcome.

`PATCH /ai/missions/{mission_id}/runs/{run_id}`

Optional: `error` (string), `metadata` (object), `result_payload` (object), `result_summary` (string), `status` (enum: pending, running, paused, succeeded, failed, cancelled)

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "status": "succeeded",
  "result_summary": "Processed 24 customer records successfully."
}' \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}"
```

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## Cancel run

Cancels a running or paused run and returns the updated run object. A cancelled run stops executing; start a new run to execute the mission again.

`POST /ai/missions/{mission_id}/runs/{run_id}/cancel`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/cancel"
```

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## List events

Returns a paginated list of events logged for the specified run, filterable by event type, plan step, and agent, so you can reconstruct exactly what happened during execution.

`GET /ai/missions/{mission_id}/runs/{run_id}/events`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/events"
```

Returns: `agent_id` (string), `event_id` (string), `idempotency_key` (string), `payload` (object), `run_id` (string), `step_id` (string), `summary` (string), `timestamp` (date-time), `type` (enum: status_change, step_started, step_completed, step_failed, tool_call, tool_result, message, error, custom)

## Log event

Logs a new event against the specified run and returns the created event. Events form the run's audit trail and can reference a plan step or agent.

`POST /ai/missions/{mission_id}/runs/{run_id}/events` — Required: `type`, `summary`

Optional: `agent_id` (string), `idempotency_key` (string), `payload` (object), `step_id` (string)

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "type": "status_change",
  "summary": "Summary",
  "step_id": "Step Id",
  "agent_id": "Agent Id",
  "idempotency_key": "Idempotency Key"
}' \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/events"
```

Returns: `agent_id` (string), `event_id` (string), `idempotency_key` (string), `payload` (object), `run_id` (string), `step_id` (string), `summary` (string), `timestamp` (date-time), `type` (enum: status_change, step_started, step_completed, step_failed, tool_call, tool_result, message, error, custom)

## Get event details

Returns the details of a single event logged for the specified run, including its type and payload.

`GET /ai/missions/{mission_id}/runs/{run_id}/events/{event_id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/events/{event_id}"
```

Returns: `agent_id` (string), `event_id` (string), `idempotency_key` (string), `payload` (object), `run_id` (string), `step_id` (string), `summary` (string), `timestamp` (date-time), `type` (enum: status_change, step_started, step_completed, step_failed, tool_call, tool_result, message, error, custom)

## Pause run

Pauses a currently running run and returns the updated run object. Execution halts until the run is resumed.

`POST /ai/missions/{mission_id}/runs/{run_id}/pause`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/pause"
```

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## Get plan

Returns the plan for the specified run, including all plan steps and their statuses, so you can see how the mission was decomposed and how far execution has progressed.

`GET /ai/missions/{mission_id}/runs/{run_id}/plan`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/plan"
```

Returns: `completed_at` (date-time), `description` (string), `metadata` (object), `parent_step_id` (string), `run_id` (uuid), `sequence` (integer), `started_at` (date-time), `status` (enum: pending, in_progress, completed, skipped, failed), `step_id` (string)

## Create initial plan

Creates the initial plan for the specified run from the provided steps and returns the created plan steps. Progress is subsequently reported by updating individual steps.

`POST /ai/missions/{mission_id}/runs/{run_id}/plan` — Required: `steps`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "steps": [
    {
      "step_id": "Step Id",
      "description": "Description",
      "sequence": 0,
      "parent_step_id": "Parent Step Id"
    }
  ]
}' \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/plan"
```

Returns: `completed_at` (date-time), `description` (string), `metadata` (object), `parent_step_id` (string), `run_id` (uuid), `sequence` (integer), `started_at` (date-time), `status` (enum: pending, in_progress, completed, skipped, failed), `step_id` (string)

## Add step(s) to plan

Add one or more steps to an existing plan

`POST /ai/missions/{mission_id}/runs/{run_id}/plan/steps` — Required: `steps`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "steps": [
    {
      "step_id": "Step Id",
      "description": "Description",
      "sequence": 0,
      "parent_step_id": "Parent Step Id"
    }
  ]
}' \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/plan/steps"
```

Returns: `completed_at` (date-time), `description` (string), `metadata` (object), `parent_step_id` (string), `run_id` (uuid), `sequence` (integer), `started_at` (date-time), `status` (enum: pending, in_progress, completed, skipped, failed), `step_id` (string)

## Get step details

Returns the details of a single plan step within a run's plan, including its status.

`GET /ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}"
```

Returns: `completed_at` (date-time), `description` (string), `metadata` (object), `parent_step_id` (string), `run_id` (uuid), `sequence` (integer), `started_at` (date-time), `status` (enum: pending, in_progress, completed, skipped, failed), `step_id` (string)

## Update step status

Updates the status of a single plan step and returns the updated step. Typically called by the executing agent as it works through the plan.

`PATCH /ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}`

Optional: `metadata` (object), `status` (enum: pending, in_progress, completed, skipped, failed)

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "status": "pending"
}' \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}"
```

Returns: `completed_at` (date-time), `description` (string), `metadata` (object), `parent_step_id` (string), `run_id` (uuid), `sequence` (integer), `started_at` (date-time), `status` (enum: pending, in_progress, completed, skipped, failed), `step_id` (string)

## Resume run

Resumes a previously paused run and returns the updated run object, letting execution continue from where it was paused.

`POST /ai/missions/{mission_id}/runs/{run_id}/resume`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/resume"
```

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## List linked Telnyx agents

Returns the Telnyx agents currently linked to the specified run. Linked agents participate in executing the run's plan.

`GET /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/telnyx-agents"
```

Returns: `created_at` (date-time), `run_id` (string), `telnyx_agent_id` (string)

## Link Telnyx agent to run

Link a Telnyx AI agent (voice/messaging) to a run

`POST /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents` — Required: `telnyx_agent_id`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "telnyx_agent_id": "Telnyx Agent Id"
}' \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/telnyx-agents"
```

Returns: `created_at` (date-time), `run_id` (string), `telnyx_agent_id` (string)

## Unlink Telnyx agent

Unlinks the specified Telnyx agent from the run so it no longer participates in execution. The run itself and its history are unaffected.

`DELETE /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents/{telnyx_agent_id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/telnyx-agents/{telnyx_agent_id}"
```

## List tools

Returns the tools configured on the specified mission. Tools define the actions agents may invoke while executing the mission's runs.

`GET /ai/missions/{mission_id}/tools`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/tools"
```

## Create tool

Adds a new tool to the specified mission, defining an action agents can invoke during runs of this mission.

`POST /ai/missions/{mission_id}/tools`

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/tools"
```

## Get tool

Returns the definition of a single tool configured on the specified mission.

`GET /ai/missions/{mission_id}/tools/{tool_id}`

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/tools/{tool_id}"
```

## Update tool

Replaces the definition of the specified tool on this mission.

`PUT /ai/missions/{mission_id}/tools/{tool_id}`

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/tools/{tool_id}"
```

## Delete tool

Removes the specified tool from the mission so agents can no longer invoke it in subsequent runs.

`DELETE /ai/missions/{mission_id}/tools/{tool_id}`

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/tools/{tool_id}"
```
