---
name: telnyx-missions-javascript
description: >-
  Telnyx Missions: automated workflows, tasks, and sub-resources for AI-driven
  operations.
metadata:
  author: telnyx
  product: missions
  language: javascript
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Missions - JavaScript

## Core Workflow

### Prerequisites

1. No special setup required — just a Telnyx API key

### Steps

1. **Create mission**: `client.missions.create({name: ..., description: ...})`
2. **Add tasks**: `client.missionTasks.create({missionId: ..., ...: ...})`
3. **Monitor progress**: `client.missions.retrieve({id: ...})`

### Common mistakes

- Missions orchestrate multi-step AI workflows — each task runs independently

**Related skills**: telnyx-ai-assistants-javascript, telnyx-ai-inference-javascript

## Installation

```bash
npm install telnyx
```

## Setup

```javascript
import Telnyx from 'telnyx';

const client = new Telnyx({
  apiKey: process.env['TELNYX_API_KEY'], // This is the default and can be omitted
});
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```javascript
try {
  const result = await client.missions.create(params);
} catch (err) {
  if (err instanceof Telnyx.APIConnectionError) {
    console.error('Network error — check connectivity and retry');
  } else if (err instanceof Telnyx.RateLimitError) {
    // 429: rate limited — wait and retry with exponential backoff
    const retryAfter = err.headers?.['retry-after'] || 1;
    await new Promise(r => setTimeout(r, retryAfter * 1000));
  } else if (err instanceof Telnyx.APIError) {
    console.error(`API error ${err.status}: ${err.message}`);
    if (err.status === 422) {
      console.error('Validation error — check required fields and formats');
    }
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return an auto-paginating iterator. Use `for await (const item of result) { ... }` to iterate through all pages automatically.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List missions

List all missions for the organization

`client.ai.missions.list()` — `GET /ai/missions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | Page number (1-based) |
| `page[size]` | integer | No | Number of items per page |

```javascript
// Automatically fetches more pages as needed.
for await (const missionData of client.ai.missions.list()) {
  console.log(missionData.mission_id);
}
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Create mission

Create a new mission definition

`client.ai.missions.create()` — `POST /ai/missions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes |  |
| `executionMode` | enum (external, managed) | No |  |
| `description` | string | No |  |
| `model` | string | No |  |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const mission = await client.ai.missions.create({ name: 'my-resource' });

console.log(mission.data);
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## List recent events

List recent events across all missions

`client.ai.missions.listEvents()` — `GET /ai/missions/events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | No |  |
| `page[number]` | integer | No | Page number (1-based) |
| `page[size]` | integer | No | Number of items per page |

```javascript
// Automatically fetches more pages as needed.
for await (const eventData of client.ai.missions.listEvents()) {
  console.log(eventData.event_id);
}
```

Key response fields: `response.data.type, response.data.agent_id, response.data.event_id`

## List recent runs

List recent runs across all missions

`client.ai.missions.runs.listRuns()` — `GET /ai/missions/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No |  |
| `page[number]` | integer | No | Page number (1-based) |
| `page[size]` | integer | No | Number of items per page |

```javascript
// Automatically fetches more pages as needed.
for await (const missionRunData of client.ai.missions.runs.listRuns()) {
  console.log(missionRunData.mission_id);
}
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## Get mission

Get a mission by ID (includes tools, knowledge_bases, mcp_servers)

`client.ai.missions.retrieve()` — `GET /ai/missions/{mission_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |

```javascript
const mission = await client.ai.missions.retrieve('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(mission.data);
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Update mission

Update a mission definition

`client.ai.missions.updateMission()` — `PUT /ai/missions/{mission_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `executionMode` | enum (external, managed) | No |  |
| `name` | string | No |  |
| `description` | string | No |  |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const response = await client.ai.missions.updateMission('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(response.data);
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Delete mission

Delete a mission

`client.ai.missions.deleteMission()` — `DELETE /ai/missions/{mission_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |

```javascript
await client.ai.missions.deleteMission('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');
```

## Clone mission

Clone an existing mission

`client.ai.missions.cloneMission()` — `POST /ai/missions/{mission_id}/clone`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |

```javascript
const response = await client.ai.missions.cloneMission('mission_id');

console.log(response);
```

## List knowledge bases

List all knowledge bases for a mission

`client.ai.missions.knowledgeBases.listKnowledgeBases()` — `GET /ai/missions/{mission_id}/knowledge-bases`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |

```javascript
const response = await client.ai.missions.knowledgeBases.listKnowledgeBases('mission_id');

console.log(response);
```

## Create knowledge base

Create a new knowledge base for a mission

`client.ai.missions.knowledgeBases.createKnowledgeBase()` — `POST /ai/missions/{mission_id}/knowledge-bases`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |

```javascript
const response = await client.ai.missions.knowledgeBases.createKnowledgeBase('mission_id');

console.log(response);
```

## Get knowledge base

Get a specific knowledge base by ID

`client.ai.missions.knowledgeBases.getKnowledgeBase()` — `GET /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `knowledgeBaseId` | string (UUID) | Yes |  |

```javascript
const response = await client.ai.missions.knowledgeBases.getKnowledgeBase('knowledge_base_id', {
  mission_id: '550e8400-e29b-41d4-a716-446655440000',
});

console.log(response);
```

## Update knowledge base

Update a knowledge base definition

`client.ai.missions.knowledgeBases.updateKnowledgeBase()` — `PUT /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `knowledgeBaseId` | string (UUID) | Yes |  |

```javascript
const response = await client.ai.missions.knowledgeBases.updateKnowledgeBase('knowledge_base_id', {
  mission_id: '550e8400-e29b-41d4-a716-446655440000',
});

console.log(response);
```

## Delete knowledge base

Delete a knowledge base from a mission

`client.ai.missions.knowledgeBases.deleteKnowledgeBase()` — `DELETE /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `knowledgeBaseId` | string (UUID) | Yes |  |

```javascript
await client.ai.missions.knowledgeBases.deleteKnowledgeBase('knowledge_base_id', {
  mission_id: '550e8400-e29b-41d4-a716-446655440000',
});
```

## List MCP servers

List all MCP servers for a mission

`client.ai.missions.mcpServers.listMcpServers()` — `GET /ai/missions/{mission_id}/mcp-servers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |

```javascript
const response = await client.ai.missions.mcpServers.listMcpServers('mission_id');

console.log(response);
```

## Create MCP server

Create a new MCP server for a mission

`client.ai.missions.mcpServers.createMcpServer()` — `POST /ai/missions/{mission_id}/mcp-servers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |

```javascript
const response = await client.ai.missions.mcpServers.createMcpServer('mission_id');

console.log(response);
```

## Get MCP server

Get a specific MCP server by ID

`client.ai.missions.mcpServers.getMcpServer()` — `GET /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `mcpServerId` | string (UUID) | Yes |  |

```javascript
const response = await client.ai.missions.mcpServers.getMcpServer('mcp_server_id', {
  mission_id: '550e8400-e29b-41d4-a716-446655440000',
});

console.log(response);
```

## Update MCP server

Update an MCP server definition

`client.ai.missions.mcpServers.updateMcpServer()` — `PUT /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `mcpServerId` | string (UUID) | Yes |  |

```javascript
const response = await client.ai.missions.mcpServers.updateMcpServer('mcp_server_id', {
  mission_id: '550e8400-e29b-41d4-a716-446655440000',
});

console.log(response);
```

## Delete MCP server

Delete an MCP server from a mission

`client.ai.missions.mcpServers.deleteMcpServer()` — `DELETE /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `mcpServerId` | string (UUID) | Yes |  |

```javascript
await client.ai.missions.mcpServers.deleteMcpServer('mcp_server_id', { mission_id: '550e8400-e29b-41d4-a716-446655440000' });
```

## List runs for mission

List all runs for a specific mission

`client.ai.missions.runs.list()` — `GET /ai/missions/{mission_id}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `status` | string | No |  |
| `page[number]` | integer | No | Page number (1-based) |
| `page[size]` | integer | No | Number of items per page |

```javascript
// Automatically fetches more pages as needed.
for await (const missionRunData of client.ai.missions.runs.list(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
)) {
  console.log(missionRunData.mission_id);
}
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## Start a run

Start a new run for a mission

`client.ai.missions.runs.create()` — `POST /ai/missions/{mission_id}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `input` | object | No |  |
| `metadata` | object | No |  |

```javascript
const run = await client.ai.missions.runs.create('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e');

console.log(run.data);
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## Get run details

Get details of a specific run

`client.ai.missions.runs.retrieve()` — `GET /ai/missions/{mission_id}/runs/{run_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |

```javascript
const run = await client.ai.missions.runs.retrieve('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e', {
  mission_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
});

console.log(run.data);
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## Update run

Update run status and/or result

`client.ai.missions.runs.update()` — `PATCH /ai/missions/{mission_id}/runs/{run_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |
| `status` | enum (pending, running, paused, succeeded, failed, ...) | No |  |
| `resultSummary` | string | No |  |
| `resultPayload` | object | No |  |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const run = await client.ai.missions.runs.update('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e', {
  mission_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
});

console.log(run.data);
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## Cancel run

Cancel a running or paused run

`client.ai.missions.runs.cancelRun()` — `POST /ai/missions/{mission_id}/runs/{run_id}/cancel`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |

```javascript
const response = await client.ai.missions.runs.cancelRun('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e', {
  mission_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
});

console.log(response.data);
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## List events

List events for a run (paginated)

`client.ai.missions.runs.events.list()` — `GET /ai/missions/{mission_id}/runs/{run_id}/events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |
| `type` | string | No |  |
| `stepId` | string (UUID) | No |  |
| `agentId` | string (UUID) | No |  |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```javascript
// Automatically fetches more pages as needed.
for await (const eventData of client.ai.missions.runs.events.list(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  { mission_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e' },
)) {
  console.log(eventData.event_id);
}
```

Key response fields: `response.data.type, response.data.agent_id, response.data.event_id`

## Log event

Log an event for a run

`client.ai.missions.runs.events.log()` — `POST /ai/missions/{mission_id}/runs/{run_id}/events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | enum (status_change, step_started, step_completed, step_failed, tool_call, ...) | Yes |  |
| `summary` | string | Yes |  |
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |
| `stepId` | string (UUID) | No |  |
| `agentId` | string (UUID) | No |  |
| `payload` | object | No |  |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```javascript
const response = await client.ai.missions.runs.events.log('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e', {
  mission_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  summary: 'Brief task summary',
  type: 'status_change',
});

console.log(response.data);
```

Key response fields: `response.data.type, response.data.agent_id, response.data.event_id`

## Get event details

Get details of a specific event

`client.ai.missions.runs.events.getEventDetails()` — `GET /ai/missions/{mission_id}/runs/{run_id}/events/{event_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |
| `eventId` | string (UUID) | Yes |  |

```javascript
const response = await client.ai.missions.runs.events.getEventDetails('event_id', {
  mission_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  run_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
});

console.log(response.data);
```

Key response fields: `response.data.type, response.data.agent_id, response.data.event_id`

## Pause run

Pause a running run

`client.ai.missions.runs.pauseRun()` — `POST /ai/missions/{mission_id}/runs/{run_id}/pause`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |

```javascript
const response = await client.ai.missions.runs.pauseRun('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e', {
  mission_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
});

console.log(response.data);
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## Get plan

Get the plan (all steps) for a run

`client.ai.missions.runs.plan.retrieve()` — `GET /ai/missions/{mission_id}/runs/{run_id}/plan`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |

```javascript
const plan = await client.ai.missions.runs.plan.retrieve('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e', {
  mission_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
});

console.log(plan.data);
```

Key response fields: `response.data.status, response.data.completed_at, response.data.description`

## Create initial plan

Create the initial plan for a run

`client.ai.missions.runs.plan.create()` — `POST /ai/missions/{mission_id}/runs/{run_id}/plan`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `steps` | array[object] | Yes |  |
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |

```javascript
const plan = await client.ai.missions.runs.plan.create('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e', {
  mission_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  steps: [
    {
      description: 'description',
      sequence: 0,
      step_id: '550e8400-e29b-41d4-a716-446655440000',
    },
  ],
});

console.log(plan.data);
```

Key response fields: `response.data.status, response.data.completed_at, response.data.description`

## Add step(s) to plan

Add one or more steps to an existing plan

`client.ai.missions.runs.plan.addStepsToPlan()` — `POST /ai/missions/{mission_id}/runs/{run_id}/plan/steps`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `steps` | array[object] | Yes |  |
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |

```javascript
const response = await client.ai.missions.runs.plan.addStepsToPlan(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  {
    mission_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
    steps: [
      {
        description: 'description',
        sequence: 0,
        step_id: '550e8400-e29b-41d4-a716-446655440000',
      },
    ],
  },
);

console.log(response.data);
```

Key response fields: `response.data.status, response.data.completed_at, response.data.description`

## Get step details

Get details of a specific plan step

`client.ai.missions.runs.plan.getStepDetails()` — `GET /ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |
| `stepId` | string (UUID) | Yes |  |

```javascript
const response = await client.ai.missions.runs.plan.getStepDetails('step_id', {
  mission_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  run_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
});

console.log(response.data);
```

Key response fields: `response.data.status, response.data.completed_at, response.data.description`

## Update step status

Update the status of a plan step

`client.ai.missions.runs.plan.updateStep()` — `PATCH /ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |
| `stepId` | string (UUID) | Yes |  |
| `status` | enum (pending, in_progress, completed, skipped, failed) | No |  |
| `metadata` | object | No |  |

```javascript
const response = await client.ai.missions.runs.plan.updateStep('step_id', {
  mission_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  run_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
});

console.log(response.data);
```

Key response fields: `response.data.status, response.data.completed_at, response.data.description`

## Resume run

Resume a paused run

`client.ai.missions.runs.resumeRun()` — `POST /ai/missions/{mission_id}/runs/{run_id}/resume`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |

```javascript
const response = await client.ai.missions.runs.resumeRun('182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e', {
  mission_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
});

console.log(response.data);
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## List linked Telnyx agents

List all Telnyx agents linked to a run

`client.ai.missions.runs.telnyxAgents.list()` — `GET /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |

```javascript
const telnyxAgents = await client.ai.missions.runs.telnyxAgents.list(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  { mission_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e' },
);

console.log(telnyxAgents.data);
```

Key response fields: `response.data.created_at, response.data.run_id, response.data.telnyx_agent_id`

## Link Telnyx agent to run

Link a Telnyx AI agent (voice/messaging) to a run

`client.ai.missions.runs.telnyxAgents.link()` — `POST /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `telnyxAgentId` | string (UUID) | Yes | The Telnyx AI agent ID to link |
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |

```javascript
const response = await client.ai.missions.runs.telnyxAgents.link(
  '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  { mission_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e', telnyx_agent_id: '550e8400-e29b-41d4-a716-446655440000' },
);

console.log(response.data);
```

Key response fields: `response.data.created_at, response.data.run_id, response.data.telnyx_agent_id`

## Unlink Telnyx agent

Unlink a Telnyx agent from a run

`client.ai.missions.runs.telnyxAgents.unlink()` — `DELETE /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents/{telnyx_agent_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |
| `telnyxAgentId` | string (UUID) | Yes |  |

```javascript
await client.ai.missions.runs.telnyxAgents.unlink('telnyx_agent_id', {
  mission_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
  run_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
});
```

## List tools

List all tools for a mission

`client.ai.missions.tools.listTools()` — `GET /ai/missions/{mission_id}/tools`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |

```javascript
const response = await client.ai.missions.tools.listTools('mission_id');

console.log(response);
```

## Create tool

Create a new tool for a mission

`client.ai.missions.tools.createTool()` — `POST /ai/missions/{mission_id}/tools`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |

```javascript
const response = await client.ai.missions.tools.createTool('mission_id');

console.log(response);
```

## Get tool

Get a specific tool by ID

`client.ai.missions.tools.getTool()` — `GET /ai/missions/{mission_id}/tools/{tool_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `toolId` | string (UUID) | Yes |  |

```javascript
const response = await client.ai.missions.tools.getTool('tool_id', { mission_id: '550e8400-e29b-41d4-a716-446655440000' });

console.log(response);
```

## Update tool

Update a tool definition

`client.ai.missions.tools.updateTool()` — `PUT /ai/missions/{mission_id}/tools/{tool_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `toolId` | string (UUID) | Yes |  |

```javascript
const response = await client.ai.missions.tools.updateTool('tool_id', { mission_id: '550e8400-e29b-41d4-a716-446655440000' });

console.log(response);
```

## Delete tool

Delete a tool from a mission

`client.ai.missions.tools.deleteTool()` — `DELETE /ai/missions/{mission_id}/tools/{tool_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `toolId` | string (UUID) | Yes |  |

```javascript
await client.ai.missions.tools.deleteTool('tool_id', { mission_id: '550e8400-e29b-41d4-a716-446655440000' });
```

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
