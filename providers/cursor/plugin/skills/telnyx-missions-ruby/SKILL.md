---
name: telnyx-missions-ruby
description: >-
  Create and manage Telnyx Missions — automated workflows, tasks, and
  sub-resources for AI-driven telecom operations. This skill provides Ruby SDK
  examples.
metadata:
  author: telnyx
  product: missions
  language: ruby
  generated_by: telnyx-openapi-pipeline
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Missions - Ruby

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
  result = client.messages.send_(to: "+13125550001", from: "+13125550002", text: "Hello")
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

## List missions

Returns a paginated list of all mission definitions in your organization. Missions describe a goal and the tools, knowledge bases, and MCP servers agents may use to accomplish it.

`GET /ai/missions`

```ruby
page = client.ai.missions.list

puts(page)
```

Returns: `created_at` (date-time), `description` (string), `execution_mode` (enum: external, managed), `instructions` (string), `metadata` (object), `mission_id` (uuid), `model` (string), `name` (string), `updated_at` (date-time)

## Create mission

Creates a new mission definition from the provided configuration and returns the created mission. Execute the mission by starting runs against it.

`POST /ai/missions` — Required: `name`

Optional: `description` (string), `execution_mode` (enum: external, managed), `instructions` (string), `metadata` (object), `model` (string)

```ruby
mission = client.ai.missions.create(name: "my-resource")

puts(mission)
```

Returns: `created_at` (date-time), `description` (string), `execution_mode` (enum: external, managed), `instructions` (string), `metadata` (object), `mission_id` (uuid), `model` (string), `name` (string), `updated_at` (date-time)

## List recent events

Returns a paginated list of recent events across every mission in your organization, optionally filtered by event type. Useful for building activity feeds or monitoring dashboards.

`GET /ai/missions/events`

```ruby
page = client.ai.missions.list_events

puts(page)
```

Returns: `agent_id` (string), `event_id` (string), `idempotency_key` (string), `payload` (object), `run_id` (string), `step_id` (string), `summary` (string), `timestamp` (date-time), `type` (enum: status_change, step_started, step_completed, step_failed, tool_call, tool_result, message, error, custom)

## List recent runs

Returns a paginated list of recent runs across every mission in your organization, optionally filtered by run status. Useful for monitoring overall mission activity without querying each mission individually.

`GET /ai/missions/runs`

```ruby
page = client.ai.missions.runs.list_runs

puts(page)
```

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## Get mission

Get a mission by ID (includes tools, knowledge_bases, mcp_servers)

`GET /ai/missions/{mission_id}`

```ruby
mission = client.ai.missions.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(mission)
```

Returns: `created_at` (date-time), `description` (string), `execution_mode` (enum: external, managed), `instructions` (string), `metadata` (object), `mission_id` (uuid), `model` (string), `name` (string), `updated_at` (date-time)

## Update mission

Replaces the specified mission's definition with the provided configuration and returns the updated mission.

`PUT /ai/missions/{mission_id}`

Optional: `description` (string), `execution_mode` (enum: external, managed), `instructions` (string), `metadata` (object), `model` (string), `name` (string)

```ruby
response = client.ai.missions.update_mission("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(response)
```

Returns: `created_at` (date-time), `description` (string), `execution_mode` (enum: external, managed), `instructions` (string), `metadata` (object), `mission_id` (uuid), `model` (string), `name` (string), `updated_at` (date-time)

## Delete mission

Permanently deletes the specified mission definition and returns no content on success.

`DELETE /ai/missions/{mission_id}`

```ruby
result = client.ai.missions.delete_mission("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(result)
```

## Clone mission

Creates a copy of the specified mission as a new mission definition, so you can iterate on its configuration without modifying the original.

`POST /ai/missions/{mission_id}/clone`

```ruby
response = client.ai.missions.clone_mission("mission_id")

puts(response)
```

## List knowledge bases

Returns the knowledge bases attached to the specified mission. Knowledge bases provide reference content agents can draw on during runs.

`GET /ai/missions/{mission_id}/knowledge-bases`

```ruby
response = client.ai.missions.knowledge_bases.list_knowledge_bases("mission_id")

puts(response)
```

## Create knowledge base

Create a new knowledge base for a mission

`POST /ai/missions/{mission_id}/knowledge-bases`

```ruby
response = client.ai.missions.knowledge_bases.create_knowledge_base("mission_id")

puts(response)
```

## Get knowledge base

Returns the details of a single knowledge base attached to the specified mission.

`GET /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

```ruby
response = client.ai.missions.knowledge_bases.get_knowledge_base("knowledge_base_id", mission_id: "550e8400-e29b-41d4-a716-446655440000")

puts(response)
```

## Update knowledge base

Replaces the definition of the specified knowledge base on this mission.

`PUT /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

```ruby
response = client.ai.missions.knowledge_bases.update_knowledge_base("knowledge_base_id", mission_id: "550e8400-e29b-41d4-a716-446655440000")

puts(response)
```

## Delete knowledge base

Detaches the specified knowledge base from the mission so its content is no longer available to agents in subsequent runs.

`DELETE /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

```ruby
result = client.ai.missions.knowledge_bases.delete_knowledge_base("knowledge_base_id", mission_id: "550e8400-e29b-41d4-a716-446655440000")

puts(result)
```

## List MCP servers

Returns the MCP servers configured on the specified mission. MCP servers expose external tools and data sources agents can use during runs.

`GET /ai/missions/{mission_id}/mcp-servers`

```ruby
response = client.ai.missions.mcp_servers.list_mcp_servers("mission_id")

puts(response)
```

## Create MCP server

Adds an MCP server to the specified mission, making the server's tools available to agents during runs of this mission.

`POST /ai/missions/{mission_id}/mcp-servers`

```ruby
response = client.ai.missions.mcp_servers.create_mcp_server("mission_id")

puts(response)
```

## Get MCP server

Returns the configuration of a single MCP server attached to the specified mission.

`GET /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

```ruby
response = client.ai.missions.mcp_servers.get_mcp_server("mcp_server_id", mission_id: "550e8400-e29b-41d4-a716-446655440000")

puts(response)
```

## Update MCP server

Replaces the configuration of the specified MCP server on this mission.

`PUT /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

```ruby
response = client.ai.missions.mcp_servers.update_mcp_server("mcp_server_id", mission_id: "550e8400-e29b-41d4-a716-446655440000")

puts(response)
```

## Delete MCP server

Removes the specified MCP server from the mission, revoking agent access to its tools in subsequent runs.

`DELETE /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

```ruby
result = client.ai.missions.mcp_servers.delete_mcp_server("mcp_server_id", mission_id: "550e8400-e29b-41d4-a716-446655440000")

puts(result)
```

## List runs for mission

Returns a paginated list of runs for the specified mission, optionally filtered by run status, so you can track the mission's execution history over time.

`GET /ai/missions/{mission_id}/runs`

```ruby
page = client.ai.missions.runs.list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(page)
```

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## Start a run

Starts a new run of the specified mission and returns the created run object. Track its progress through the run detail, plan, and events endpoints.

`POST /ai/missions/{mission_id}/runs`

Optional: `input` (object), `metadata` (object)

```ruby
run = client.ai.missions.runs.create("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(run)
```

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## Get run details

Returns the full details of a single run, including its current status. Use this to poll an in-flight run or inspect the outcome of a completed one.

`GET /ai/missions/{mission_id}/runs/{run_id}`

```ruby
run = client.ai.missions.runs.retrieve(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(run)
```

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## Update run

Updates a run's status and/or result and returns the updated run object. Typically used by executing agents to report progress or record the final outcome.

`PATCH /ai/missions/{mission_id}/runs/{run_id}`

Optional: `error` (string), `metadata` (object), `result_payload` (object), `result_summary` (string), `status` (enum: pending, running, paused, succeeded, failed, cancelled)

```ruby
run = client.ai.missions.runs.update(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(run)
```

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## Cancel run

Cancels a running or paused run and returns the updated run object. A cancelled run stops executing; start a new run to execute the mission again.

`POST /ai/missions/{mission_id}/runs/{run_id}/cancel`

```ruby
response = client.ai.missions.runs.cancel_run(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(response)
```

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## List events

Returns a paginated list of events logged for the specified run, filterable by event type, plan step, and agent, so you can reconstruct exactly what happened during execution.

`GET /ai/missions/{mission_id}/runs/{run_id}/events`

```ruby
page = client.ai.missions.runs.events.list(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(page)
```

Returns: `agent_id` (string), `event_id` (string), `idempotency_key` (string), `payload` (object), `run_id` (string), `step_id` (string), `summary` (string), `timestamp` (date-time), `type` (enum: status_change, step_started, step_completed, step_failed, tool_call, tool_result, message, error, custom)

## Log event

Logs a new event against the specified run and returns the created event. Events form the run's audit trail and can reference a plan step or agent.

`POST /ai/missions/{mission_id}/runs/{run_id}/events` — Required: `type`, `summary`

Optional: `agent_id` (string), `idempotency_key` (string), `payload` (object), `step_id` (string)

```ruby
response = client.ai.missions.runs.events.log(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  summary: "Brief task summary",
  type: :status_change
)

puts(response)
```

Returns: `agent_id` (string), `event_id` (string), `idempotency_key` (string), `payload` (object), `run_id` (string), `step_id` (string), `summary` (string), `timestamp` (date-time), `type` (enum: status_change, step_started, step_completed, step_failed, tool_call, tool_result, message, error, custom)

## Get event details

Returns the details of a single event logged for the specified run, including its type and payload.

`GET /ai/missions/{mission_id}/runs/{run_id}/events/{event_id}`

```ruby
response = client.ai.missions.runs.events.get_event_details(
  "event_id",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  run_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(response)
```

Returns: `agent_id` (string), `event_id` (string), `idempotency_key` (string), `payload` (object), `run_id` (string), `step_id` (string), `summary` (string), `timestamp` (date-time), `type` (enum: status_change, step_started, step_completed, step_failed, tool_call, tool_result, message, error, custom)

## Pause run

Pauses a currently running run and returns the updated run object. Execution halts until the run is resumed.

`POST /ai/missions/{mission_id}/runs/{run_id}/pause`

```ruby
response = client.ai.missions.runs.pause_run(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(response)
```

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## Get plan

Returns the plan for the specified run, including all plan steps and their statuses, so you can see how the mission was decomposed and how far execution has progressed.

`GET /ai/missions/{mission_id}/runs/{run_id}/plan`

```ruby
plan = client.ai.missions.runs.plan.retrieve(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(plan)
```

Returns: `completed_at` (date-time), `description` (string), `metadata` (object), `parent_step_id` (string), `run_id` (uuid), `sequence` (integer), `started_at` (date-time), `status` (enum: pending, in_progress, completed, skipped, failed), `step_id` (string)

## Create initial plan

Creates the initial plan for the specified run from the provided steps and returns the created plan steps. Progress is subsequently reported by updating individual steps.

`POST /ai/missions/{mission_id}/runs/{run_id}/plan` — Required: `steps`

```ruby
plan = client.ai.missions.runs.plan.create(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  steps: [{description: "description", sequence: 0, step_id: "550e8400-e29b-41d4-a716-446655440000"}]
)

puts(plan)
```

Returns: `completed_at` (date-time), `description` (string), `metadata` (object), `parent_step_id` (string), `run_id` (uuid), `sequence` (integer), `started_at` (date-time), `status` (enum: pending, in_progress, completed, skipped, failed), `step_id` (string)

## Add step(s) to plan

Add one or more steps to an existing plan

`POST /ai/missions/{mission_id}/runs/{run_id}/plan/steps` — Required: `steps`

```ruby
response = client.ai.missions.runs.plan.add_steps_to_plan(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  steps: [{description: "description", sequence: 0, step_id: "550e8400-e29b-41d4-a716-446655440000"}]
)

puts(response)
```

Returns: `completed_at` (date-time), `description` (string), `metadata` (object), `parent_step_id` (string), `run_id` (uuid), `sequence` (integer), `started_at` (date-time), `status` (enum: pending, in_progress, completed, skipped, failed), `step_id` (string)

## Get step details

Returns the details of a single plan step within a run's plan, including its status.

`GET /ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}`

```ruby
response = client.ai.missions.runs.plan.get_step_details(
  "step_id",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  run_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(response)
```

Returns: `completed_at` (date-time), `description` (string), `metadata` (object), `parent_step_id` (string), `run_id` (uuid), `sequence` (integer), `started_at` (date-time), `status` (enum: pending, in_progress, completed, skipped, failed), `step_id` (string)

## Update step status

Updates the status of a single plan step and returns the updated step. Typically called by the executing agent as it works through the plan.

`PATCH /ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}`

Optional: `metadata` (object), `status` (enum: pending, in_progress, completed, skipped, failed)

```ruby
response = client.ai.missions.runs.plan.update_step(
  "step_id",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  run_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(response)
```

Returns: `completed_at` (date-time), `description` (string), `metadata` (object), `parent_step_id` (string), `run_id` (uuid), `sequence` (integer), `started_at` (date-time), `status` (enum: pending, in_progress, completed, skipped, failed), `step_id` (string)

## Resume run

Resumes a previously paused run and returns the updated run object, letting execution continue from where it was paused.

`POST /ai/missions/{mission_id}/runs/{run_id}/resume`

```ruby
response = client.ai.missions.runs.resume_run(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(response)
```

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## List linked Telnyx agents

Returns the Telnyx agents currently linked to the specified run. Linked agents participate in executing the run's plan.

`GET /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents`

```ruby
telnyx_agents = client.ai.missions.runs.telnyx_agents.list(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(telnyx_agents)
```

Returns: `created_at` (date-time), `run_id` (string), `telnyx_agent_id` (string)

## Link Telnyx agent to run

Link a Telnyx AI agent (voice/messaging) to a run

`POST /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents` — Required: `telnyx_agent_id`

```ruby
response = client.ai.missions.runs.telnyx_agents.link(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  telnyx_agent_id: "550e8400-e29b-41d4-a716-446655440000"
)

puts(response)
```

Returns: `created_at` (date-time), `run_id` (string), `telnyx_agent_id` (string)

## Unlink Telnyx agent

Unlinks the specified Telnyx agent from the run so it no longer participates in execution. The run itself and its history are unaffected.

`DELETE /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents/{telnyx_agent_id}`

```ruby
result = client.ai.missions.runs.telnyx_agents.unlink(
  "telnyx_agent_id",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  run_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(result)
```

## List tools

Returns the tools configured on the specified mission. Tools define the actions agents may invoke while executing the mission's runs.

`GET /ai/missions/{mission_id}/tools`

```ruby
response = client.ai.missions.tools.list_tools("mission_id")

puts(response)
```

## Create tool

Adds a new tool to the specified mission, defining an action agents can invoke during runs of this mission.

`POST /ai/missions/{mission_id}/tools`

```ruby
response = client.ai.missions.tools.create_tool("mission_id")

puts(response)
```

## Get tool

Returns the definition of a single tool configured on the specified mission.

`GET /ai/missions/{mission_id}/tools/{tool_id}`

```ruby
response = client.ai.missions.tools.get_tool("tool_id", mission_id: "550e8400-e29b-41d4-a716-446655440000")

puts(response)
```

## Update tool

Replaces the definition of the specified tool on this mission.

`PUT /ai/missions/{mission_id}/tools/{tool_id}`

```ruby
response = client.ai.missions.tools.update_tool("tool_id", mission_id: "550e8400-e29b-41d4-a716-446655440000")

puts(response)
```

## Delete tool

Removes the specified tool from the mission so agents can no longer invoke it in subsequent runs.

`DELETE /ai/missions/{mission_id}/tools/{tool_id}`

```ruby
result = client.ai.missions.tools.delete_tool("tool_id", mission_id: "550e8400-e29b-41d4-a716-446655440000")

puts(result)
```
