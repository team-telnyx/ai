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
  generated_by: telnyx-ext-skills-generator
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

## List missions

List all missions for the organization

`GET /ai/missions`

```ruby
page = client.ai.missions.list

puts(page)
```

## Create mission

Create a new mission definition

`POST /ai/missions` — Required: `name`

Optional: `description` (string), `execution_mode` (enum), `instructions` (string), `metadata` (object), `model` (string)

```ruby
mission = client.ai.missions.create(name: "name")

puts(mission)
```

## List recent events

List recent events across all missions

`GET /ai/missions/events`

```ruby
page = client.ai.missions.list_events

puts(page)
```

## List recent runs

List recent runs across all missions

`GET /ai/missions/runs`

```ruby
page = client.ai.missions.runs.list_runs

puts(page)
```

## Get mission

Get a mission by ID (includes tools, knowledge_bases, mcp_servers)

`GET /ai/missions/{mission_id}`

```ruby
mission = client.ai.missions.retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(mission)
```

## Update mission

Update a mission definition

`PUT /ai/missions/{mission_id}`

Optional: `description` (string), `execution_mode` (enum), `instructions` (string), `metadata` (object), `model` (string), `name` (string)

```ruby
response = client.ai.missions.update_mission("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(response)
```

## Delete mission

Delete a mission

`DELETE /ai/missions/{mission_id}`

```ruby
result = client.ai.missions.delete_mission("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(result)
```

## Clone mission

Clone an existing mission

`POST /ai/missions/{mission_id}/clone`

```ruby
response = client.ai.missions.clone_mission("mission_id")

puts(response)
```

## List knowledge bases

List all knowledge bases for a mission

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

Get a specific knowledge base by ID

`GET /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

```ruby
response = client.ai.missions.knowledge_bases.get_knowledge_base("knowledge_base_id", mission_id: "mission_id")

puts(response)
```

## Update knowledge base

Update a knowledge base definition

`PUT /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

```ruby
response = client.ai.missions.knowledge_bases.update_knowledge_base("knowledge_base_id", mission_id: "mission_id")

puts(response)
```

## Delete knowledge base

Delete a knowledge base from a mission

`DELETE /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

```ruby
result = client.ai.missions.knowledge_bases.delete_knowledge_base("knowledge_base_id", mission_id: "mission_id")

puts(result)
```

## List MCP servers

List all MCP servers for a mission

`GET /ai/missions/{mission_id}/mcp-servers`

```ruby
response = client.ai.missions.mcp_servers.list_mcp_servers("mission_id")

puts(response)
```

## Create MCP server

Create a new MCP server for a mission

`POST /ai/missions/{mission_id}/mcp-servers`

```ruby
response = client.ai.missions.mcp_servers.create_mcp_server("mission_id")

puts(response)
```

## Get MCP server

Get a specific MCP server by ID

`GET /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

```ruby
response = client.ai.missions.mcp_servers.get_mcp_server("mcp_server_id", mission_id: "mission_id")

puts(response)
```

## Update MCP server

Update an MCP server definition

`PUT /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

```ruby
response = client.ai.missions.mcp_servers.update_mcp_server("mcp_server_id", mission_id: "mission_id")

puts(response)
```

## Delete MCP server

Delete an MCP server from a mission

`DELETE /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

```ruby
result = client.ai.missions.mcp_servers.delete_mcp_server("mcp_server_id", mission_id: "mission_id")

puts(result)
```

## List runs for mission

List all runs for a specific mission

`GET /ai/missions/{mission_id}/runs`

```ruby
page = client.ai.missions.runs.list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(page)
```

## Start a run

Start a new run for a mission

`POST /ai/missions/{mission_id}/runs`

Optional: `input` (object), `metadata` (object)

```ruby
run = client.ai.missions.runs.create("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")

puts(run)
```

## Get run details

Get details of a specific run

`GET /ai/missions/{mission_id}/runs/{run_id}`

```ruby
run = client.ai.missions.runs.retrieve(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(run)
```

## Update run

Update run status and/or result

`PATCH /ai/missions/{mission_id}/runs/{run_id}`

Optional: `error` (string), `metadata` (object), `result_payload` (object), `result_summary` (string), `status` (enum)

```ruby
run = client.ai.missions.runs.update(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(run)
```

## Cancel run

Cancel a running or paused run

`POST /ai/missions/{mission_id}/runs/{run_id}/cancel`

```ruby
response = client.ai.missions.runs.cancel_run(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(response)
```

## List events

List events for a run (paginated)

`GET /ai/missions/{mission_id}/runs/{run_id}/events`

```ruby
page = client.ai.missions.runs.events.list(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(page)
```

## Log event

Log an event for a run

`POST /ai/missions/{mission_id}/runs/{run_id}/events` — Required: `type`, `summary`

Optional: `agent_id` (string), `idempotency_key` (string), `payload` (object), `step_id` (string)

```ruby
response = client.ai.missions.runs.events.log(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  summary: "summary",
  type: :status_change
)

puts(response)
```

## Get event details

Get details of a specific event

`GET /ai/missions/{mission_id}/runs/{run_id}/events/{event_id}`

```ruby
response = client.ai.missions.runs.events.get_event_details(
  "event_id",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  run_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(response)
```

## Pause run

Pause a running run

`POST /ai/missions/{mission_id}/runs/{run_id}/pause`

```ruby
response = client.ai.missions.runs.pause_run(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(response)
```

## Get plan

Get the plan (all steps) for a run

`GET /ai/missions/{mission_id}/runs/{run_id}/plan`

```ruby
plan = client.ai.missions.runs.plan.retrieve(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(plan)
```

## Create initial plan

Create the initial plan for a run

`POST /ai/missions/{mission_id}/runs/{run_id}/plan` — Required: `steps`

```ruby
plan = client.ai.missions.runs.plan.create(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  steps: [{description: "description", sequence: 0, step_id: "step_id"}]
)

puts(plan)
```

## Add step(s) to plan

Add one or more steps to an existing plan

`POST /ai/missions/{mission_id}/runs/{run_id}/plan/steps` — Required: `steps`

```ruby
response = client.ai.missions.runs.plan.add_steps_to_plan(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  steps: [{description: "description", sequence: 0, step_id: "step_id"}]
)

puts(response)
```

## Get step details

Get details of a specific plan step

`GET /ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}`

```ruby
response = client.ai.missions.runs.plan.get_step_details(
  "step_id",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  run_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(response)
```

## Update step status

Update the status of a plan step

`PATCH /ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}`

Optional: `metadata` (object), `status` (enum)

```ruby
response = client.ai.missions.runs.plan.update_step(
  "step_id",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  run_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(response)
```

## Resume run

Resume a paused run

`POST /ai/missions/{mission_id}/runs/{run_id}/resume`

```ruby
response = client.ai.missions.runs.resume_run(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(response)
```

## List linked Telnyx agents

List all Telnyx agents linked to a run

`GET /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents`

```ruby
telnyx_agents = client.ai.missions.runs.telnyx_agents.list(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e"
)

puts(telnyx_agents)
```

## Link Telnyx agent to run

Link a Telnyx AI agent (voice/messaging) to a run

`POST /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents` — Required: `telnyx_agent_id`

```ruby
response = client.ai.missions.runs.telnyx_agents.link(
  "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  mission_id: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
  telnyx_agent_id: "telnyx_agent_id"
)

puts(response)
```

## Unlink Telnyx agent

Unlink a Telnyx agent from a run

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

List all tools for a mission

`GET /ai/missions/{mission_id}/tools`

```ruby
response = client.ai.missions.tools.list_tools("mission_id")

puts(response)
```

## Create tool

Create a new tool for a mission

`POST /ai/missions/{mission_id}/tools`

```ruby
response = client.ai.missions.tools.create_tool("mission_id")

puts(response)
```

## Get tool

Get a specific tool by ID

`GET /ai/missions/{mission_id}/tools/{tool_id}`

```ruby
response = client.ai.missions.tools.get_tool("tool_id", mission_id: "mission_id")

puts(response)
```

## Update tool

Update a tool definition

`PUT /ai/missions/{mission_id}/tools/{tool_id}`

```ruby
response = client.ai.missions.tools.update_tool("tool_id", mission_id: "mission_id")

puts(response)
```

## Delete tool

Delete a tool from a mission

`DELETE /ai/missions/{mission_id}/tools/{tool_id}`

```ruby
result = client.ai.missions.tools.delete_tool("tool_id", mission_id: "mission_id")

puts(result)
```
