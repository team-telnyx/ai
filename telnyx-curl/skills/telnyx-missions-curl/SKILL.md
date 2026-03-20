---
name: telnyx-missions-curl
description: >-
  Telnyx Missions: automated workflows, tasks, and sub-resources for AI-driven
  operations.
metadata:
  author: telnyx
  product: missions
  language: curl
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Missions - curl

## Core Workflow

### Prerequisites

1. No special setup required — just a Telnyx API key

### Steps

1. **Create mission**
2. **Add tasks**
3. **Monitor progress**

### Common mistakes

- Missions orchestrate multi-step AI workflows — each task runs independently

**Related skills**: telnyx-ai-assistants-curl, telnyx-ai-inference-curl

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
  -X POST "https://api.telnyx.com/v2/{endpoint}" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}')

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

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List missions

List all missions for the organization

`GET /ai/missions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | Page number (1-based) |
| `page[size]` | integer | No | Number of items per page |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions"
```

Key response fields: `.data.name, .data.created_at, .data.updated_at`

## Create mission

Create a new mission definition

`POST /ai/missions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes |  |
| `execution_mode` | enum (external, managed) | No |  |
| `description` | string | No |  |
| `model` | string | No |  |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "my-resource"
}' \
  "https://api.telnyx.com/v2/ai/missions"
```

Key response fields: `.data.name, .data.created_at, .data.updated_at`

## List recent events

List recent events across all missions

`GET /ai/missions/events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | No |  |
| `page[number]` | integer | No | Page number (1-based) |
| `page[size]` | integer | No | Number of items per page |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/events"
```

Key response fields: `.data.type, .data.agent_id, .data.event_id`

## List recent runs

List recent runs across all missions

`GET /ai/missions/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No |  |
| `page[number]` | integer | No | Page number (1-based) |
| `page[size]` | integer | No | Number of items per page |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/runs"
```

Key response fields: `.data.status, .data.updated_at, .data.error`

## Get mission

Get a mission by ID (includes tools, knowledge_bases, mcp_servers)

`GET /ai/missions/{mission_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}"
```

Key response fields: `.data.name, .data.created_at, .data.updated_at`

## Update mission

Update a mission definition

`PUT /ai/missions/{mission_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `execution_mode` | enum (external, managed) | No |  |
| `name` | string | No |  |
| `description` | string | No |  |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}"
```

Key response fields: `.data.name, .data.created_at, .data.updated_at`

## Delete mission

Delete a mission

`DELETE /ai/missions/{mission_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}"
```

## Clone mission

Clone an existing mission

`POST /ai/missions/{mission_id}/clone`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/clone"
```

## List knowledge bases

List all knowledge bases for a mission

`GET /ai/missions/{mission_id}/knowledge-bases`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/knowledge-bases"
```

## Create knowledge base

Create a new knowledge base for a mission

`POST /ai/missions/{mission_id}/knowledge-bases`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/knowledge-bases"
```

## Get knowledge base

Get a specific knowledge base by ID

`GET /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `knowledge_base_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}"
```

## Update knowledge base

Update a knowledge base definition

`PUT /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `knowledge_base_id` | string (UUID) | Yes |  |

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}"
```

## Delete knowledge base

Delete a knowledge base from a mission

`DELETE /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `knowledge_base_id` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}"
```

## List MCP servers

List all MCP servers for a mission

`GET /ai/missions/{mission_id}/mcp-servers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/mcp-servers"
```

## Create MCP server

Create a new MCP server for a mission

`POST /ai/missions/{mission_id}/mcp-servers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/mcp-servers"
```

## Get MCP server

Get a specific MCP server by ID

`GET /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `mcp_server_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/mcp-servers/{mcp_server_id}"
```

## Update MCP server

Update an MCP server definition

`PUT /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `mcp_server_id` | string (UUID) | Yes |  |

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/mcp-servers/{mcp_server_id}"
```

## Delete MCP server

Delete an MCP server from a mission

`DELETE /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `mcp_server_id` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/mcp-servers/{mcp_server_id}"
```

## List runs for mission

List all runs for a specific mission

`GET /ai/missions/{mission_id}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `status` | string | No |  |
| `page[number]` | integer | No | Page number (1-based) |
| `page[size]` | integer | No | Number of items per page |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs"
```

Key response fields: `.data.status, .data.updated_at, .data.error`

## Start a run

Start a new run for a mission

`POST /ai/missions/{mission_id}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `input` | object | No |  |
| `metadata` | object | No |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs"
```

Key response fields: `.data.status, .data.updated_at, .data.error`

## Get run details

Get details of a specific run

`GET /ai/missions/{mission_id}/runs/{run_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}"
```

Key response fields: `.data.status, .data.updated_at, .data.error`

## Update run

Update run status and/or result

`PATCH /ai/missions/{mission_id}/runs/{run_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |
| `status` | enum (pending, running, paused, succeeded, failed, ...) | No |  |
| `result_summary` | string | No |  |
| `result_payload` | object | No |  |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}"
```

Key response fields: `.data.status, .data.updated_at, .data.error`

## Cancel run

Cancel a running or paused run

`POST /ai/missions/{mission_id}/runs/{run_id}/cancel`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/cancel"
```

Key response fields: `.data.status, .data.updated_at, .data.error`

## List events

List events for a run (paginated)

`GET /ai/missions/{mission_id}/runs/{run_id}/events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |
| `type` | string | No |  |
| `step_id` | string (UUID) | No |  |
| `agent_id` | string (UUID) | No |  |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/events"
```

Key response fields: `.data.type, .data.agent_id, .data.event_id`

## Log event

Log an event for a run

`POST /ai/missions/{mission_id}/runs/{run_id}/events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | enum (status_change, step_started, step_completed, step_failed, tool_call, ...) | Yes |  |
| `summary` | string | Yes |  |
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |
| `step_id` | string (UUID) | No |  |
| `agent_id` | string (UUID) | No |  |
| `payload` | object | No |  |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "type": "status_change",
  "summary": "Brief task summary"
}' \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/events"
```

Key response fields: `.data.type, .data.agent_id, .data.event_id`

## Get event details

Get details of a specific event

`GET /ai/missions/{mission_id}/runs/{run_id}/events/{event_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |
| `event_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/events/{event_id}"
```

Key response fields: `.data.type, .data.agent_id, .data.event_id`

## Pause run

Pause a running run

`POST /ai/missions/{mission_id}/runs/{run_id}/pause`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/pause"
```

Key response fields: `.data.status, .data.updated_at, .data.error`

## Get plan

Get the plan (all steps) for a run

`GET /ai/missions/{mission_id}/runs/{run_id}/plan`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/plan"
```

Key response fields: `.data.status, .data.completed_at, .data.description`

## Create initial plan

Create the initial plan for a run

`POST /ai/missions/{mission_id}/runs/{run_id}/plan`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `steps` | array[object] | Yes |  |
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "steps": [
    "Initiate the task"
  ]
}' \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/plan"
```

Key response fields: `.data.status, .data.completed_at, .data.description`

## Add step(s) to plan

Add one or more steps to an existing plan

`POST /ai/missions/{mission_id}/runs/{run_id}/plan/steps`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `steps` | array[object] | Yes |  |
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "steps": [
    "Initiate the task"
  ]
}' \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/plan/steps"
```

Key response fields: `.data.status, .data.completed_at, .data.description`

## Get step details

Get details of a specific plan step

`GET /ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |
| `step_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}"
```

Key response fields: `.data.status, .data.completed_at, .data.description`

## Update step status

Update the status of a plan step

`PATCH /ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |
| `step_id` | string (UUID) | Yes |  |
| `status` | enum (pending, in_progress, completed, skipped, failed) | No |  |
| `metadata` | object | No |  |

```bash
curl \
  -X PATCH \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}"
```

Key response fields: `.data.status, .data.completed_at, .data.description`

## Resume run

Resume a paused run

`POST /ai/missions/{mission_id}/runs/{run_id}/resume`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/resume"
```

Key response fields: `.data.status, .data.updated_at, .data.error`

## List linked Telnyx agents

List all Telnyx agents linked to a run

`GET /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/telnyx-agents"
```

Key response fields: `.data.created_at, .data.run_id, .data.telnyx_agent_id`

## Link Telnyx agent to run

Link a Telnyx AI agent (voice/messaging) to a run

`POST /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `telnyx_agent_id` | string (UUID) | Yes | The Telnyx AI agent ID to link |
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "telnyx_agent_id": "550e8400-e29b-41d4-a716-446655440000"
}' \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/telnyx-agents"
```

Key response fields: `.data.created_at, .data.run_id, .data.telnyx_agent_id`

## Unlink Telnyx agent

Unlink a Telnyx agent from a run

`DELETE /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents/{telnyx_agent_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |
| `telnyx_agent_id` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/runs/{run_id}/telnyx-agents/{telnyx_agent_id}"
```

## List tools

List all tools for a mission

`GET /ai/missions/{mission_id}/tools`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/tools"
```

## Create tool

Create a new tool for a mission

`POST /ai/missions/{mission_id}/tools`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |

```bash
curl \
  -X POST \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/tools"
```

## Get tool

Get a specific tool by ID

`GET /ai/missions/{mission_id}/tools/{tool_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `tool_id` | string (UUID) | Yes |  |

```bash
curl -H "Authorization: Bearer $TELNYX_API_KEY" "https://api.telnyx.com/v2/ai/missions/{mission_id}/tools/{tool_id}"
```

## Update tool

Update a tool definition

`PUT /ai/missions/{mission_id}/tools/{tool_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `tool_id` | string (UUID) | Yes |  |

```bash
curl \
  -X PUT \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/tools/{tool_id}"
```

## Delete tool

Delete a tool from a mission

`DELETE /ai/missions/{mission_id}/tools/{tool_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `tool_id` | string (UUID) | Yes |  |

```bash
curl \
  -X DELETE \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  "https://api.telnyx.com/v2/ai/missions/{mission_id}/tools/{tool_id}"
```

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
