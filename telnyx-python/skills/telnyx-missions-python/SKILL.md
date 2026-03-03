---
name: telnyx-missions-python
description: >-
  Create and manage Telnyx Missions — automated workflows, tasks, and
  sub-resources for AI-driven telecom operations. This skill provides Python SDK
  examples.
metadata:
  author: telnyx
  product: missions
  language: python
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Missions - Python

## Installation

```bash
pip install telnyx
```

## Setup

```python
import os
from telnyx import Telnyx

client = Telnyx(
    api_key=os.environ.get("TELNYX_API_KEY"),  # This is the default and can be omitted
)
```

All examples below assume `client` is already initialized as shown above.

## List missions

List all missions for the organization

`GET /ai/missions`

```python
page = client.ai.missions.list()
page = page.data[0]
print(page.mission_id)
```

## Create mission

Create a new mission definition

`POST /ai/missions` — Required: `name`

Optional: `description` (string), `execution_mode` (enum), `instructions` (string), `metadata` (object), `model` (string)

```python
mission = client.ai.missions.create(
    name="name",
)
print(mission.data)
```

## List recent events

List recent events across all missions

`GET /ai/missions/events`

```python
page = client.ai.missions.list_events()
page = page.data[0]
print(page.event_id)
```

## List recent runs

List recent runs across all missions

`GET /ai/missions/runs`

```python
page = client.ai.missions.runs.list_runs()
page = page.data[0]
print(page.mission_id)
```

## Get mission

Get a mission by ID (includes tools, knowledge_bases, mcp_servers)

`GET /ai/missions/{mission_id}`

```python
mission = client.ai.missions.retrieve(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(mission.data)
```

## Update mission

Update a mission definition

`PUT /ai/missions/{mission_id}`

Optional: `description` (string), `execution_mode` (enum), `instructions` (string), `metadata` (object), `model` (string), `name` (string)

```python
response = client.ai.missions.update_mission(
    mission_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

## Delete mission

Delete a mission

`DELETE /ai/missions/{mission_id}`

```python
client.ai.missions.delete_mission(
    "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
```

## Clone mission

Clone an existing mission

`POST /ai/missions/{mission_id}/clone`

```python
response = client.ai.missions.clone_mission(
    "mission_id",
)
print(response)
```

## List knowledge bases

List all knowledge bases for a mission

`GET /ai/missions/{mission_id}/knowledge-bases`

```python
response = client.ai.missions.knowledge_bases.list_knowledge_bases(
    "mission_id",
)
print(response)
```

## Create knowledge base

Create a new knowledge base for a mission

`POST /ai/missions/{mission_id}/knowledge-bases`

```python
response = client.ai.missions.knowledge_bases.create_knowledge_base(
    "mission_id",
)
print(response)
```

## Get knowledge base

Get a specific knowledge base by ID

`GET /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

```python
response = client.ai.missions.knowledge_bases.get_knowledge_base(
    knowledge_base_id="knowledge_base_id",
    mission_id="mission_id",
)
print(response)
```

## Update knowledge base

Update a knowledge base definition

`PUT /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

```python
response = client.ai.missions.knowledge_bases.update_knowledge_base(
    knowledge_base_id="knowledge_base_id",
    mission_id="mission_id",
)
print(response)
```

## Delete knowledge base

Delete a knowledge base from a mission

`DELETE /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

```python
client.ai.missions.knowledge_bases.delete_knowledge_base(
    knowledge_base_id="knowledge_base_id",
    mission_id="mission_id",
)
```

## List MCP servers

List all MCP servers for a mission

`GET /ai/missions/{mission_id}/mcp-servers`

```python
response = client.ai.missions.mcp_servers.list_mcp_servers(
    "mission_id",
)
print(response)
```

## Create MCP server

Create a new MCP server for a mission

`POST /ai/missions/{mission_id}/mcp-servers`

```python
response = client.ai.missions.mcp_servers.create_mcp_server(
    "mission_id",
)
print(response)
```

## Get MCP server

Get a specific MCP server by ID

`GET /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

```python
response = client.ai.missions.mcp_servers.get_mcp_server(
    mcp_server_id="mcp_server_id",
    mission_id="mission_id",
)
print(response)
```

## Update MCP server

Update an MCP server definition

`PUT /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

```python
response = client.ai.missions.mcp_servers.update_mcp_server(
    mcp_server_id="mcp_server_id",
    mission_id="mission_id",
)
print(response)
```

## Delete MCP server

Delete an MCP server from a mission

`DELETE /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

```python
client.ai.missions.mcp_servers.delete_mcp_server(
    mcp_server_id="mcp_server_id",
    mission_id="mission_id",
)
```

## List runs for mission

List all runs for a specific mission

`GET /ai/missions/{mission_id}/runs`

```python
page = client.ai.missions.runs.list(
    mission_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
page = page.data[0]
print(page.mission_id)
```

## Start a run

Start a new run for a mission

`POST /ai/missions/{mission_id}/runs`

Optional: `input` (object), `metadata` (object)

```python
run = client.ai.missions.runs.create(
    mission_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(run.data)
```

## Get run details

Get details of a specific run

`GET /ai/missions/{mission_id}/runs/{run_id}`

```python
run = client.ai.missions.runs.retrieve(
    run_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    mission_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(run.data)
```

## Update run

Update run status and/or result

`PATCH /ai/missions/{mission_id}/runs/{run_id}`

Optional: `error` (string), `metadata` (object), `result_payload` (object), `result_summary` (string), `status` (enum)

```python
run = client.ai.missions.runs.update(
    run_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    mission_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(run.data)
```

## Cancel run

Cancel a running or paused run

`POST /ai/missions/{mission_id}/runs/{run_id}/cancel`

```python
response = client.ai.missions.runs.cancel_run(
    run_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    mission_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

## List events

List events for a run (paginated)

`GET /ai/missions/{mission_id}/runs/{run_id}/events`

```python
page = client.ai.missions.runs.events.list(
    run_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    mission_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
page = page.data[0]
print(page.event_id)
```

## Log event

Log an event for a run

`POST /ai/missions/{mission_id}/runs/{run_id}/events` — Required: `type`, `summary`

Optional: `agent_id` (string), `idempotency_key` (string), `payload` (object), `step_id` (string)

```python
response = client.ai.missions.runs.events.log(
    run_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    mission_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    summary="summary",
    type="status_change",
)
print(response.data)
```

## Get event details

Get details of a specific event

`GET /ai/missions/{mission_id}/runs/{run_id}/events/{event_id}`

```python
response = client.ai.missions.runs.events.get_event_details(
    event_id="event_id",
    mission_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    run_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

## Pause run

Pause a running run

`POST /ai/missions/{mission_id}/runs/{run_id}/pause`

```python
response = client.ai.missions.runs.pause_run(
    run_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    mission_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

## Get plan

Get the plan (all steps) for a run

`GET /ai/missions/{mission_id}/runs/{run_id}/plan`

```python
plan = client.ai.missions.runs.plan.retrieve(
    run_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    mission_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(plan.data)
```

## Create initial plan

Create the initial plan for a run

`POST /ai/missions/{mission_id}/runs/{run_id}/plan` — Required: `steps`

```python
plan = client.ai.missions.runs.plan.create(
    run_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    mission_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    steps=[{
        "description": "description",
        "sequence": 0,
        "step_id": "step_id",
    }],
)
print(plan.data)
```

## Add step(s) to plan

Add one or more steps to an existing plan

`POST /ai/missions/{mission_id}/runs/{run_id}/plan/steps` — Required: `steps`

```python
response = client.ai.missions.runs.plan.add_steps_to_plan(
    run_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    mission_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    steps=[{
        "description": "description",
        "sequence": 0,
        "step_id": "step_id",
    }],
)
print(response.data)
```

## Get step details

Get details of a specific plan step

`GET /ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}`

```python
response = client.ai.missions.runs.plan.get_step_details(
    step_id="step_id",
    mission_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    run_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

## Update step status

Update the status of a plan step

`PATCH /ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}`

Optional: `metadata` (object), `status` (enum)

```python
response = client.ai.missions.runs.plan.update_step(
    step_id="step_id",
    mission_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    run_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

## Resume run

Resume a paused run

`POST /ai/missions/{mission_id}/runs/{run_id}/resume`

```python
response = client.ai.missions.runs.resume_run(
    run_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    mission_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(response.data)
```

## List linked Telnyx agents

List all Telnyx agents linked to a run

`GET /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents`

```python
telnyx_agents = client.ai.missions.runs.telnyx_agents.list(
    run_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    mission_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
print(telnyx_agents.data)
```

## Link Telnyx agent to run

Link a Telnyx AI agent (voice/messaging) to a run

`POST /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents` — Required: `telnyx_agent_id`

```python
response = client.ai.missions.runs.telnyx_agents.link(
    run_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    mission_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    telnyx_agent_id="telnyx_agent_id",
)
print(response.data)
```

## Unlink Telnyx agent

Unlink a Telnyx agent from a run

`DELETE /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents/{telnyx_agent_id}`

```python
client.ai.missions.runs.telnyx_agents.unlink(
    telnyx_agent_id="telnyx_agent_id",
    mission_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
    run_id="182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
)
```

## List tools

List all tools for a mission

`GET /ai/missions/{mission_id}/tools`

```python
response = client.ai.missions.tools.list_tools(
    "mission_id",
)
print(response)
```

## Create tool

Create a new tool for a mission

`POST /ai/missions/{mission_id}/tools`

```python
response = client.ai.missions.tools.create_tool(
    "mission_id",
)
print(response)
```

## Get tool

Get a specific tool by ID

`GET /ai/missions/{mission_id}/tools/{tool_id}`

```python
response = client.ai.missions.tools.get_tool(
    tool_id="tool_id",
    mission_id="mission_id",
)
print(response)
```

## Update tool

Update a tool definition

`PUT /ai/missions/{mission_id}/tools/{tool_id}`

```python
response = client.ai.missions.tools.update_tool(
    tool_id="tool_id",
    mission_id="mission_id",
)
print(response)
```

## Delete tool

Delete a tool from a mission

`DELETE /ai/missions/{mission_id}/tools/{tool_id}`

```python
client.ai.missions.tools.delete_tool(
    tool_id="tool_id",
    mission_id="mission_id",
)
```
