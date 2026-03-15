---
name: telnyx-missions-ruby
description: >-
  Telnyx Missions: automated workflows, tasks, and sub-resources for AI-driven
  operations.
metadata:
  author: telnyx
  product: missions
  language: ruby
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Missions - Ruby

## Core Workflow

### Prerequisites

1. No special setup required — just a Telnyx API key

### Steps

1. **Create mission**: `client.missions.create(name: ..., description: ...)`
2. **Add tasks**: `client.mission_tasks.create(mission_id: ..., ...: ...)`
3. **Monitor progress**: `client.missions.retrieve(id: ...)`

### Common mistakes

- Missions orchestrate multi-step AI workflows — each task runs independently

**Related skills**: telnyx-ai-assistants-ruby, telnyx-ai-inference-ruby

## Installation

```bash
gem install telnyx
```

## Setup

```ruby
require "telnyx"

client = Telnyx::Client.new(
  api_key: ENV["TELNYX_API_KEY"], # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```ruby
begin
  result = client.missions.create(params)
rescue Telnyx::Errors::APIConnectionError
  puts "Network error — check connectivity and retry"
rescue Telnyx::Errors::RateLimitError
  # 429: rate limited — wait and retry with exponential backoff
  sleep(1) # Check Retry-After header for actual delay
rescue Telnyx::Errors::APIStatusError => e
  puts "API error #{e.status}: #{e.message}"
  if e.status == 422
    puts "Validation error — check required fields and formats"
  end
end
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** Use `.auto_paging_each` for automatic iteration: `page.auto_paging_each { |item| puts item.id }`.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List missions

List all missions for the organization

`client.ai.missions.list()` — `GET /ai/missions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | Page number (1-based) |
| `page[size]` | integer | No | Number of items per page |

```ruby
page = client.ai.missions.list

puts(page)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Create mission

Create a new mission definition

`client.ai.missions.create()` — `POST /ai/missions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes |  |
| `execution_mode` | enum (external, managed) | No |  |
| `description` | string | No |  |
| `model` | string | No |  |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```ruby
mission = client.ai.missions.create(name: "my-resource")

puts(mission)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## List recent events

List recent events across all missions

`client.ai.missions.list_events()` — `GET /ai/missions/events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | No |  |
| `page[number]` | integer | No | Page number (1-based) |
| `page[size]` | integer | No | Number of items per page |

```ruby
page = client.ai.missions.list_events

puts(page)
```

Key response fields: `response.data.type, response.data.agent_id, response.data.event_id`

## List recent runs

List recent runs across all missions

`client.ai.missions.runs.list_runs()` — `GET /ai/missions/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No |  |
| `page[number]` | integer | No | Page number (1-based) |
| `page[size]` | integer | No | Number of items per page |

```ruby
page = client.ai.missions.runs.list_runs

puts(page)
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## Get mission

Get a mission by ID (includes tools, knowledge_bases, mcp_servers)

`client.ai.missions.retrieve()` — `GET /ai/missions/{mission_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |

```ruby
mission = client.ai.missions.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(mission)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Update mission

Update a mission definition

`client.ai.missions.update_mission()` — `PUT /ai/missions/{mission_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `execution_mode` | enum (external, managed) | No |  |
| `name` | string | No |  |
| `description` | string | No |  |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```ruby
response = client.ai.missions.update_mission("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(response)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Delete mission

Delete a mission

`client.ai.missions.delete_mission()` — `DELETE /ai/missions/{mission_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |

```ruby
result = client.ai.missions.delete_mission("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(result)
```

## Clone mission

Clone an existing mission

`client.ai.missions.clone_mission()` — `POST /ai/missions/{mission_id}/clone`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |

```ruby
response = client.ai.missions.clone_mission("mission_id")

puts(response)
```

## List knowledge bases

List all knowledge bases for a mission

`client.ai.missions.knowledge_bases.list_knowledge_bases()` — `GET /ai/missions/{mission_id}/knowledge-bases`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |

```ruby
response = client.ai.missions.knowledge_bases.list_knowledge_bases("mission_id")

puts(response)
```

## Create knowledge base

Create a new knowledge base for a mission

`client.ai.missions.knowledge_bases.create_knowledge_base()` — `POST /ai/missions/{mission_id}/knowledge-bases`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |

```ruby
response = client.ai.missions.knowledge_bases.create_knowledge_base("mission_id")

puts(response)
```

## Get knowledge base

Get a specific knowledge base by ID

`client.ai.missions.knowledge_bases.get_knowledge_base()` — `GET /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `knowledge_base_id` | string (UUID) | Yes |  |

```ruby
response = client.ai.missions.knowledge_bases.get_knowledge_base("knowledge_base_id", mission_id: "550e8400-e29b-41d4-a716-446655440000")

puts(response)
```

## Update knowledge base

Update a knowledge base definition

`client.ai.missions.knowledge_bases.update_knowledge_base()` — `PUT /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `knowledge_base_id` | string (UUID) | Yes |  |

```ruby
response = client.ai.missions.knowledge_bases.update_knowledge_base("knowledge_base_id", mission_id: "550e8400-e29b-41d4-a716-446655440000")

puts(response)
```

## Delete knowledge base

Delete a knowledge base from a mission

`client.ai.missions.knowledge_bases.delete_knowledge_base()` — `DELETE /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `knowledge_base_id` | string (UUID) | Yes |  |

```ruby
result = client.ai.missions.knowledge_bases.delete_knowledge_base("knowledge_base_id", mission_id: "550e8400-e29b-41d4-a716-446655440000")

puts(result)
```

## List MCP servers

List all MCP servers for a mission

`client.ai.missions.mcp_servers.list_mcp_servers()` — `GET /ai/missions/{mission_id}/mcp-servers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |

```ruby
response = client.ai.missions.mcp_servers.list_mcp_servers("mission_id")

puts(response)
```

## Create MCP server

Create a new MCP server for a mission

`client.ai.missions.mcp_servers.create_mcp_server()` — `POST /ai/missions/{mission_id}/mcp-servers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |

```ruby
response = client.ai.missions.mcp_servers.create_mcp_server("mission_id")

puts(response)
```

## Get MCP server

Get a specific MCP server by ID

`client.ai.missions.mcp_servers.get_mcp_server()` — `GET /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `mcp_server_id` | string (UUID) | Yes |  |

```ruby
response = client.ai.missions.mcp_servers.get_mcp_server("mcp_server_id", mission_id: "550e8400-e29b-41d4-a716-446655440000")

puts(response)
```

## Update MCP server

Update an MCP server definition

`client.ai.missions.mcp_servers.update_mcp_server()` — `PUT /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `mcp_server_id` | string (UUID) | Yes |  |

```ruby
response = client.ai.missions.mcp_servers.update_mcp_server("mcp_server_id", mission_id: "550e8400-e29b-41d4-a716-446655440000")

puts(response)
```

## Delete MCP server

Delete an MCP server from a mission

`client.ai.missions.mcp_servers.delete_mcp_server()` — `DELETE /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `mcp_server_id` | string (UUID) | Yes |  |

```ruby
result = client.ai.missions.mcp_servers.delete_mcp_server("mcp_server_id", mission_id: "550e8400-e29b-41d4-a716-446655440000")

puts(result)
```

## List runs for mission

List all runs for a specific mission

`client.ai.missions.runs.list()` — `GET /ai/missions/{mission_id}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `status` | string | No |  |
| `page[number]` | integer | No | Page number (1-based) |
| `page[size]` | integer | No | Number of items per page |

```ruby
page = client.ai.missions.runs.list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(page)
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## Start a run

Start a new run for a mission

`client.ai.missions.runs.create()` — `POST /ai/missions/{mission_id}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `input` | object | No |  |
| `metadata` | object | No |  |

```ruby
run = client.ai.missions.runs.create("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(run)
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## Get run details

Get details of a specific run

`client.ai.missions.runs.retrieve()` — `GET /ai/missions/{mission_id}/runs/{run_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |

```ruby
run = client.ai.missions.runs.retrieve(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(run)
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## Update run

Update run status and/or result

`client.ai.missions.runs.update()` — `PATCH /ai/missions/{mission_id}/runs/{run_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |
| `status` | enum (pending, running, paused, succeeded, failed, ...) | No |  |
| `result_summary` | string | No |  |
| `result_payload` | object | No |  |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```ruby
run = client.ai.missions.runs.update(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(run)
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## Cancel run

Cancel a running or paused run

`client.ai.missions.runs.cancel_run()` — `POST /ai/missions/{mission_id}/runs/{run_id}/cancel`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |

```ruby
response = client.ai.missions.runs.cancel_run(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(response)
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## List events

List events for a run (paginated)

`client.ai.missions.runs.events.list()` — `GET /ai/missions/{mission_id}/runs/{run_id}/events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |
| `type` | string | No |  |
| `step_id` | string (UUID) | No |  |
| `agent_id` | string (UUID) | No |  |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```ruby
page = client.ai.missions.runs.events.list(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(page)
```

Key response fields: `response.data.type, response.data.agent_id, response.data.event_id`

## Log event

Log an event for a run

`client.ai.missions.runs.events.log()` — `POST /ai/missions/{mission_id}/runs/{run_id}/events`

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

```ruby
response = client.ai.missions.runs.events.log(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  summary: "Brief task summary",
  type: :status_change
)

puts(response)
```

Key response fields: `response.data.type, response.data.agent_id, response.data.event_id`

## Get event details

Get details of a specific event

`client.ai.missions.runs.events.get_event_details()` — `GET /ai/missions/{mission_id}/runs/{run_id}/events/{event_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |
| `event_id` | string (UUID) | Yes |  |

```ruby
response = client.ai.missions.runs.events.get_event_details(
  "event_id",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  run_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(response)
```

Key response fields: `response.data.type, response.data.agent_id, response.data.event_id`

## Pause run

Pause a running run

`client.ai.missions.runs.pause_run()` — `POST /ai/missions/{mission_id}/runs/{run_id}/pause`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |

```ruby
response = client.ai.missions.runs.pause_run(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(response)
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## Get plan

Get the plan (all steps) for a run

`client.ai.missions.runs.plan.retrieve()` — `GET /ai/missions/{mission_id}/runs/{run_id}/plan`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |

```ruby
plan = client.ai.missions.runs.plan.retrieve(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(plan)
```

Key response fields: `response.data.status, response.data.completed_at, response.data.description`

## Create initial plan

Create the initial plan for a run

`client.ai.missions.runs.plan.create()` — `POST /ai/missions/{mission_id}/runs/{run_id}/plan`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `steps` | array[object] | Yes |  |
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |

```ruby
plan = client.ai.missions.runs.plan.create(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  steps: [{description: "description", sequence: 0, step_id: "550e8400-e29b-41d4-a716-446655440000"}]
)

puts(plan)
```

Key response fields: `response.data.status, response.data.completed_at, response.data.description`

## Add step(s) to plan

Add one or more steps to an existing plan

`client.ai.missions.runs.plan.add_steps_to_plan()` — `POST /ai/missions/{mission_id}/runs/{run_id}/plan/steps`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `steps` | array[object] | Yes |  |
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |

```ruby
response = client.ai.missions.runs.plan.add_steps_to_plan(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  steps: [{description: "description", sequence: 0, step_id: "550e8400-e29b-41d4-a716-446655440000"}]
)

puts(response)
```

Key response fields: `response.data.status, response.data.completed_at, response.data.description`

## Get step details

Get details of a specific plan step

`client.ai.missions.runs.plan.get_step_details()` — `GET /ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |
| `step_id` | string (UUID) | Yes |  |

```ruby
response = client.ai.missions.runs.plan.get_step_details(
  "step_id",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  run_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(response)
```

Key response fields: `response.data.status, response.data.completed_at, response.data.description`

## Update step status

Update the status of a plan step

`client.ai.missions.runs.plan.update_step()` — `PATCH /ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |
| `step_id` | string (UUID) | Yes |  |
| `status` | enum (pending, in_progress, completed, skipped, failed) | No |  |
| `metadata` | object | No |  |

```ruby
response = client.ai.missions.runs.plan.update_step(
  "step_id",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  run_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(response)
```

Key response fields: `response.data.status, response.data.completed_at, response.data.description`

## Resume run

Resume a paused run

`client.ai.missions.runs.resume_run()` — `POST /ai/missions/{mission_id}/runs/{run_id}/resume`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |

```ruby
response = client.ai.missions.runs.resume_run(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(response)
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## List linked Telnyx agents

List all Telnyx agents linked to a run

`client.ai.missions.runs.telnyx_agents.list()` — `GET /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |

```ruby
telnyx_agents = client.ai.missions.runs.telnyx_agents.list(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(telnyx_agents)
```

Key response fields: `response.data.created_at, response.data.run_id, response.data.telnyx_agent_id`

## Link Telnyx agent to run

Link a Telnyx AI agent (voice/messaging) to a run

`client.ai.missions.runs.telnyx_agents.link()` — `POST /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `telnyx_agent_id` | string (UUID) | Yes | The Telnyx AI agent ID to link |
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |

```ruby
response = client.ai.missions.runs.telnyx_agents.link(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  telnyx_agent_id: "550e8400-e29b-41d4-a716-446655440000"
)

puts(response)
```

Key response fields: `response.data.created_at, response.data.run_id, response.data.telnyx_agent_id`

## Unlink Telnyx agent

Unlink a Telnyx agent from a run

`client.ai.missions.runs.telnyx_agents.unlink()` — `DELETE /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents/{telnyx_agent_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `run_id` | string (UUID) | Yes |  |
| `telnyx_agent_id` | string (UUID) | Yes |  |

```ruby
result = client.ai.missions.runs.telnyx_agents.unlink(
  "telnyx_agent_id",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  run_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(result)
```

## List tools

List all tools for a mission

`client.ai.missions.tools.list_tools()` — `GET /ai/missions/{mission_id}/tools`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |

```ruby
response = client.ai.missions.tools.list_tools("mission_id")

puts(response)
```

## Create tool

Create a new tool for a mission

`client.ai.missions.tools.create_tool()` — `POST /ai/missions/{mission_id}/tools`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |

```ruby
response = client.ai.missions.tools.create_tool("mission_id")

puts(response)
```

## Get tool

Get a specific tool by ID

`client.ai.missions.tools.get_tool()` — `GET /ai/missions/{mission_id}/tools/{tool_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `tool_id` | string (UUID) | Yes |  |

```ruby
response = client.ai.missions.tools.get_tool("tool_id", mission_id: "550e8400-e29b-41d4-a716-446655440000")

puts(response)
```

## Update tool

Update a tool definition

`client.ai.missions.tools.update_tool()` — `PUT /ai/missions/{mission_id}/tools/{tool_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `tool_id` | string (UUID) | Yes |  |

```ruby
response = client.ai.missions.tools.update_tool("tool_id", mission_id: "550e8400-e29b-41d4-a716-446655440000")

puts(response)
```

## Delete tool

Delete a tool from a mission

`client.ai.missions.tools.delete_tool()` — `DELETE /ai/missions/{mission_id}/tools/{tool_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mission_id` | string (UUID) | Yes |  |
| `tool_id` | string (UUID) | Yes |  |

```ruby
result = client.ai.missions.tools.delete_tool("tool_id", mission_id: "550e8400-e29b-41d4-a716-446655440000")

puts(result)
```

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
