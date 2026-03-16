---
name: telnyx-missions-java
description: >-
  Telnyx Missions: automated workflows, tasks, and sub-resources for AI-driven
  operations.
metadata:
  author: telnyx
  product: missions
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Missions - Java

## Core Workflow

### Prerequisites

1. No special setup required — just a Telnyx API key

### Steps

1. **Create mission**: `client.missions().create(params)`
2. **Add tasks**: `client.missionTasks().create(params)`
3. **Monitor progress**: `client.missions().retrieve(params)`

### Common mistakes

- Missions orchestrate multi-step AI workflows — each task runs independently

**Related skills**: telnyx-ai-assistants-java, telnyx-ai-inference-java

## Installation

```text
<!-- Maven -->
<dependency>
    <groupId>com.telnyx.sdk</groupId>
    <artifactId>telnyx-java</artifactId>
    <version>5.2.1</version>
</dependency>

// Gradle
implementation("com.telnyx.sdk:telnyx-java:5.2.1")
```

## Setup

```java
import com.telnyx.sdk.client.TelnyxClient;
import com.telnyx.sdk.client.okhttp.TelnyxOkHttpClient;

TelnyxClient client = TelnyxOkHttpClient.fromEnv();
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```java
import com.telnyx.sdk.errors.TelnyxServiceException;

try {
    var result = client.missions().create(params);
} catch (TelnyxServiceException e) {
    System.err.println("API error " + e.statusCode() + ": " + e.getMessage());
    if (e.statusCode() == 422) {
        System.err.println("Validation error — check required fields and formats");
    } else if (e.statusCode() == 429) {
        // Rate limited — wait and retry with exponential backoff
        Thread.sleep(1000);
    }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** List methods return a page. Use `.autoPager()` for automatic iteration: `for (var item : page.autoPager()) { ... }`. For manual control, use `.hasNextPage()` and `.nextPage()`.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List missions

List all missions for the organization

`client.ai().missions().list()` — `GET /ai/missions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page[number]` | integer | No | Page number (1-based) |
| `page[size]` | integer | No | Number of items per page |

```java
import com.telnyx.sdk.models.ai.missions.MissionListPage;
import com.telnyx.sdk.models.ai.missions.MissionListParams;

MissionListPage page = client.ai().missions().list();
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Create mission

Create a new mission definition

`client.ai().missions().create()` — `POST /ai/missions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes |  |
| `executionMode` | enum (external, managed) | No |  |
| `description` | string | No |  |
| `model` | string | No |  |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.ai.missions.MissionCreateParams;
import com.telnyx.sdk.models.ai.missions.MissionCreateResponse;

MissionCreateParams params = MissionCreateParams.builder()
    .name("my-resource")
    .build();
MissionCreateResponse mission = client.ai().missions().create(params);
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## List recent events

List recent events across all missions

`client.ai().missions().listEvents()` — `GET /ai/missions/events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | No |  |
| `page[number]` | integer | No | Page number (1-based) |
| `page[size]` | integer | No | Number of items per page |

```java
import com.telnyx.sdk.models.ai.missions.MissionListEventsPage;
import com.telnyx.sdk.models.ai.missions.MissionListEventsParams;

MissionListEventsPage page = client.ai().missions().listEvents();
```

Key response fields: `response.data.type, response.data.agent_id, response.data.event_id`

## List recent runs

List recent runs across all missions

`client.ai().missions().runs().listRuns()` — `GET /ai/missions/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No |  |
| `page[number]` | integer | No | Page number (1-based) |
| `page[size]` | integer | No | Number of items per page |

```java
import com.telnyx.sdk.models.ai.missions.runs.RunListRunsPage;
import com.telnyx.sdk.models.ai.missions.runs.RunListRunsParams;

RunListRunsPage page = client.ai().missions().runs().listRuns();
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## Get mission

Get a mission by ID (includes tools, knowledge_bases, mcp_servers)

`client.ai().missions().retrieve()` — `GET /ai/missions/{mission_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.MissionRetrieveParams;
import com.telnyx.sdk.models.ai.missions.MissionRetrieveResponse;

MissionRetrieveResponse mission = client.ai().missions().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Update mission

Update a mission definition

`client.ai().missions().updateMission()` — `PUT /ai/missions/{mission_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `executionMode` | enum (external, managed) | No |  |
| `name` | string | No |  |
| `description` | string | No |  |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.ai.missions.MissionUpdateMissionParams;
import com.telnyx.sdk.models.ai.missions.MissionUpdateMissionResponse;

MissionUpdateMissionResponse response = client.ai().missions().updateMission("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Delete mission

Delete a mission

`client.ai().missions().deleteMission()` — `DELETE /ai/missions/{mission_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.MissionDeleteMissionParams;

client.ai().missions().deleteMission("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## Clone mission

Clone an existing mission

`client.ai().missions().cloneMission()` — `POST /ai/missions/{mission_id}/clone`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.MissionCloneMissionParams;
import com.telnyx.sdk.models.ai.missions.MissionCloneMissionResponse;

MissionCloneMissionResponse response = client.ai().missions().cloneMission("550e8400-e29b-41d4-a716-446655440000");
```

## List knowledge bases

List all knowledge bases for a mission

`client.ai().missions().knowledgeBases().listKnowledgeBases()` — `GET /ai/missions/{mission_id}/knowledge-bases`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.knowledgebases.KnowledgeBaseListKnowledgeBasesParams;
import com.telnyx.sdk.models.ai.missions.knowledgebases.KnowledgeBaseListKnowledgeBasesResponse;

KnowledgeBaseListKnowledgeBasesResponse response = client.ai().missions().knowledgeBases().listKnowledgeBases("550e8400-e29b-41d4-a716-446655440000");
```

## Create knowledge base

Create a new knowledge base for a mission

`client.ai().missions().knowledgeBases().createKnowledgeBase()` — `POST /ai/missions/{mission_id}/knowledge-bases`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.knowledgebases.KnowledgeBaseCreateKnowledgeBaseParams;
import com.telnyx.sdk.models.ai.missions.knowledgebases.KnowledgeBaseCreateKnowledgeBaseResponse;

KnowledgeBaseCreateKnowledgeBaseResponse response = client.ai().missions().knowledgeBases().createKnowledgeBase("550e8400-e29b-41d4-a716-446655440000");
```

## Get knowledge base

Get a specific knowledge base by ID

`client.ai().missions().knowledgeBases().getKnowledgeBase()` — `GET /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `knowledgeBaseId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.knowledgebases.KnowledgeBaseGetKnowledgeBaseParams;
import com.telnyx.sdk.models.ai.missions.knowledgebases.KnowledgeBaseGetKnowledgeBaseResponse;

KnowledgeBaseGetKnowledgeBaseParams params = KnowledgeBaseGetKnowledgeBaseParams.builder()
    .missionId("550e8400-e29b-41d4-a716-446655440000")
    .knowledgeBaseId("550e8400-e29b-41d4-a716-446655440000")
    .build();
KnowledgeBaseGetKnowledgeBaseResponse response = client.ai().missions().knowledgeBases().getKnowledgeBase(params);
```

## Update knowledge base

Update a knowledge base definition

`client.ai().missions().knowledgeBases().updateKnowledgeBase()` — `PUT /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `knowledgeBaseId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.knowledgebases.KnowledgeBaseUpdateKnowledgeBaseParams;
import com.telnyx.sdk.models.ai.missions.knowledgebases.KnowledgeBaseUpdateKnowledgeBaseResponse;

KnowledgeBaseUpdateKnowledgeBaseParams params = KnowledgeBaseUpdateKnowledgeBaseParams.builder()
    .missionId("550e8400-e29b-41d4-a716-446655440000")
    .knowledgeBaseId("550e8400-e29b-41d4-a716-446655440000")
    .build();
KnowledgeBaseUpdateKnowledgeBaseResponse response = client.ai().missions().knowledgeBases().updateKnowledgeBase(params);
```

## Delete knowledge base

Delete a knowledge base from a mission

`client.ai().missions().knowledgeBases().deleteKnowledgeBase()` — `DELETE /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `knowledgeBaseId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.knowledgebases.KnowledgeBaseDeleteKnowledgeBaseParams;

KnowledgeBaseDeleteKnowledgeBaseParams params = KnowledgeBaseDeleteKnowledgeBaseParams.builder()
    .missionId("550e8400-e29b-41d4-a716-446655440000")
    .knowledgeBaseId("550e8400-e29b-41d4-a716-446655440000")
    .build();
client.ai().missions().knowledgeBases().deleteKnowledgeBase(params);
```

## List MCP servers

List all MCP servers for a mission

`client.ai().missions().mcpServers().listMcpServers()` — `GET /ai/missions/{mission_id}/mcp-servers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.mcpservers.McpServerListMcpServersParams;
import com.telnyx.sdk.models.ai.missions.mcpservers.McpServerListMcpServersResponse;

McpServerListMcpServersResponse response = client.ai().missions().mcpServers().listMcpServers("550e8400-e29b-41d4-a716-446655440000");
```

## Create MCP server

Create a new MCP server for a mission

`client.ai().missions().mcpServers().createMcpServer()` — `POST /ai/missions/{mission_id}/mcp-servers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.mcpservers.McpServerCreateMcpServerParams;
import com.telnyx.sdk.models.ai.missions.mcpservers.McpServerCreateMcpServerResponse;

McpServerCreateMcpServerResponse response = client.ai().missions().mcpServers().createMcpServer("550e8400-e29b-41d4-a716-446655440000");
```

## Get MCP server

Get a specific MCP server by ID

`client.ai().missions().mcpServers().getMcpServer()` — `GET /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `mcpServerId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.mcpservers.McpServerGetMcpServerParams;
import com.telnyx.sdk.models.ai.missions.mcpservers.McpServerGetMcpServerResponse;

McpServerGetMcpServerParams params = McpServerGetMcpServerParams.builder()
    .missionId("550e8400-e29b-41d4-a716-446655440000")
    .mcpServerId("550e8400-e29b-41d4-a716-446655440000")
    .build();
McpServerGetMcpServerResponse response = client.ai().missions().mcpServers().getMcpServer(params);
```

## Update MCP server

Update an MCP server definition

`client.ai().missions().mcpServers().updateMcpServer()` — `PUT /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `mcpServerId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.mcpservers.McpServerUpdateMcpServerParams;
import com.telnyx.sdk.models.ai.missions.mcpservers.McpServerUpdateMcpServerResponse;

McpServerUpdateMcpServerParams params = McpServerUpdateMcpServerParams.builder()
    .missionId("550e8400-e29b-41d4-a716-446655440000")
    .mcpServerId("550e8400-e29b-41d4-a716-446655440000")
    .build();
McpServerUpdateMcpServerResponse response = client.ai().missions().mcpServers().updateMcpServer(params);
```

## Delete MCP server

Delete an MCP server from a mission

`client.ai().missions().mcpServers().deleteMcpServer()` — `DELETE /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `mcpServerId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.mcpservers.McpServerDeleteMcpServerParams;

McpServerDeleteMcpServerParams params = McpServerDeleteMcpServerParams.builder()
    .missionId("550e8400-e29b-41d4-a716-446655440000")
    .mcpServerId("550e8400-e29b-41d4-a716-446655440000")
    .build();
client.ai().missions().mcpServers().deleteMcpServer(params);
```

## List runs for mission

List all runs for a specific mission

`client.ai().missions().runs().list()` — `GET /ai/missions/{mission_id}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `status` | string | No |  |
| `page[number]` | integer | No | Page number (1-based) |
| `page[size]` | integer | No | Number of items per page |

```java
import com.telnyx.sdk.models.ai.missions.runs.RunListPage;
import com.telnyx.sdk.models.ai.missions.runs.RunListParams;

RunListPage page = client.ai().missions().runs().list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## Start a run

Start a new run for a mission

`client.ai().missions().runs().create()` — `POST /ai/missions/{mission_id}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `input` | object | No |  |
| `metadata` | object | No |  |

```java
import com.telnyx.sdk.models.ai.missions.runs.RunCreateParams;
import com.telnyx.sdk.models.ai.missions.runs.RunCreateResponse;

RunCreateResponse run = client.ai().missions().runs().create("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## Get run details

Get details of a specific run

`client.ai().missions().runs().retrieve()` — `GET /ai/missions/{mission_id}/runs/{run_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.runs.RunRetrieveParams;
import com.telnyx.sdk.models.ai.missions.runs.RunRetrieveResponse;

RunRetrieveParams params = RunRetrieveParams.builder()
    .missionId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .runId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
RunRetrieveResponse run = client.ai().missions().runs().retrieve(params);
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## Update run

Update run status and/or result

`client.ai().missions().runs().update()` — `PATCH /ai/missions/{mission_id}/runs/{run_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |
| `status` | enum (pending, running, paused, succeeded, failed, ...) | No |  |
| `resultSummary` | string | No |  |
| `resultPayload` | object | No |  |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.ai.missions.runs.RunUpdateParams;
import com.telnyx.sdk.models.ai.missions.runs.RunUpdateResponse;

RunUpdateParams params = RunUpdateParams.builder()
    .missionId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .runId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
RunUpdateResponse run = client.ai().missions().runs().update(params);
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## Cancel run

Cancel a running or paused run

`client.ai().missions().runs().cancelRun()` — `POST /ai/missions/{mission_id}/runs/{run_id}/cancel`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.runs.RunCancelRunParams;
import com.telnyx.sdk.models.ai.missions.runs.RunCancelRunResponse;

RunCancelRunParams params = RunCancelRunParams.builder()
    .missionId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .runId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
RunCancelRunResponse response = client.ai().missions().runs().cancelRun(params);
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## List events

List events for a run (paginated)

`client.ai().missions().runs().events().list()` — `GET /ai/missions/{mission_id}/runs/{run_id}/events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |
| `type` | string | No |  |
| `stepId` | string (UUID) | No |  |
| `agentId` | string (UUID) | No |  |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```java
import com.telnyx.sdk.models.ai.missions.runs.events.EventListPage;
import com.telnyx.sdk.models.ai.missions.runs.events.EventListParams;

EventListParams params = EventListParams.builder()
    .missionId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .runId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
EventListPage page = client.ai().missions().runs().events().list(params);
```

Key response fields: `response.data.type, response.data.agent_id, response.data.event_id`

## Log event

Log an event for a run

`client.ai().missions().runs().events().log()` — `POST /ai/missions/{mission_id}/runs/{run_id}/events`

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

```java
import com.telnyx.sdk.models.ai.missions.runs.events.EventLogParams;
import com.telnyx.sdk.models.ai.missions.runs.events.EventLogResponse;

EventLogParams params = EventLogParams.builder()
    .missionId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .runId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .summary("Brief task summary")
    .type(EventLogParams.Type.STATUS_CHANGE)
    .build();
EventLogResponse response = client.ai().missions().runs().events().log(params);
```

Key response fields: `response.data.type, response.data.agent_id, response.data.event_id`

## Get event details

Get details of a specific event

`client.ai().missions().runs().events().getEventDetails()` — `GET /ai/missions/{mission_id}/runs/{run_id}/events/{event_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |
| `eventId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.runs.events.EventGetEventDetailsParams;
import com.telnyx.sdk.models.ai.missions.runs.events.EventGetEventDetailsResponse;

EventGetEventDetailsParams params = EventGetEventDetailsParams.builder()
    .missionId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .runId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .eventId("550e8400-e29b-41d4-a716-446655440000")
    .build();
EventGetEventDetailsResponse response = client.ai().missions().runs().events().getEventDetails(params);
```

Key response fields: `response.data.type, response.data.agent_id, response.data.event_id`

## Pause run

Pause a running run

`client.ai().missions().runs().pauseRun()` — `POST /ai/missions/{mission_id}/runs/{run_id}/pause`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.runs.RunPauseRunParams;
import com.telnyx.sdk.models.ai.missions.runs.RunPauseRunResponse;

RunPauseRunParams params = RunPauseRunParams.builder()
    .missionId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .runId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
RunPauseRunResponse response = client.ai().missions().runs().pauseRun(params);
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## Get plan

Get the plan (all steps) for a run

`client.ai().missions().runs().plan().retrieve()` — `GET /ai/missions/{mission_id}/runs/{run_id}/plan`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.runs.plan.PlanRetrieveParams;
import com.telnyx.sdk.models.ai.missions.runs.plan.PlanRetrieveResponse;

PlanRetrieveParams params = PlanRetrieveParams.builder()
    .missionId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .runId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
PlanRetrieveResponse plan = client.ai().missions().runs().plan().retrieve(params);
```

Key response fields: `response.data.status, response.data.completed_at, response.data.description`

## Create initial plan

Create the initial plan for a run

`client.ai().missions().runs().plan().create()` — `POST /ai/missions/{mission_id}/runs/{run_id}/plan`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `steps` | array[object] | Yes |  |
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.runs.plan.PlanCreateParams;
import com.telnyx.sdk.models.ai.missions.runs.plan.PlanCreateResponse;

PlanCreateParams params = PlanCreateParams.builder()
    .missionId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .runId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .addStep(PlanCreateParams.Step.builder()
        .description("description")
        .sequence(0L)
        .stepId("550e8400-e29b-41d4-a716-446655440000")
        .build())
    .build();
PlanCreateResponse plan = client.ai().missions().runs().plan().create(params);
```

Key response fields: `response.data.status, response.data.completed_at, response.data.description`

## Add step(s) to plan

Add one or more steps to an existing plan

`client.ai().missions().runs().plan().addStepsToPlan()` — `POST /ai/missions/{mission_id}/runs/{run_id}/plan/steps`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `steps` | array[object] | Yes |  |
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.runs.plan.PlanAddStepsToPlanParams;
import com.telnyx.sdk.models.ai.missions.runs.plan.PlanAddStepsToPlanResponse;

PlanAddStepsToPlanParams params = PlanAddStepsToPlanParams.builder()
    .missionId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .runId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .addStep(PlanAddStepsToPlanParams.Step.builder()
        .description("description")
        .sequence(0L)
        .stepId("550e8400-e29b-41d4-a716-446655440000")
        .build())
    .build();
PlanAddStepsToPlanResponse response = client.ai().missions().runs().plan().addStepsToPlan(params);
```

Key response fields: `response.data.status, response.data.completed_at, response.data.description`

## Get step details

Get details of a specific plan step

`client.ai().missions().runs().plan().getStepDetails()` — `GET /ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |
| `stepId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.runs.plan.PlanGetStepDetailsParams;
import com.telnyx.sdk.models.ai.missions.runs.plan.PlanGetStepDetailsResponse;

PlanGetStepDetailsParams params = PlanGetStepDetailsParams.builder()
    .missionId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .runId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .stepId("550e8400-e29b-41d4-a716-446655440000")
    .build();
PlanGetStepDetailsResponse response = client.ai().missions().runs().plan().getStepDetails(params);
```

Key response fields: `response.data.status, response.data.completed_at, response.data.description`

## Update step status

Update the status of a plan step

`client.ai().missions().runs().plan().updateStep()` — `PATCH /ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |
| `stepId` | string (UUID) | Yes |  |
| `status` | enum (pending, in_progress, completed, skipped, failed) | No |  |
| `metadata` | object | No |  |

```java
import com.telnyx.sdk.models.ai.missions.runs.plan.PlanUpdateStepParams;
import com.telnyx.sdk.models.ai.missions.runs.plan.PlanUpdateStepResponse;

PlanUpdateStepParams params = PlanUpdateStepParams.builder()
    .missionId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .runId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .stepId("550e8400-e29b-41d4-a716-446655440000")
    .build();
PlanUpdateStepResponse response = client.ai().missions().runs().plan().updateStep(params);
```

Key response fields: `response.data.status, response.data.completed_at, response.data.description`

## Resume run

Resume a paused run

`client.ai().missions().runs().resumeRun()` — `POST /ai/missions/{mission_id}/runs/{run_id}/resume`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.runs.RunResumeRunParams;
import com.telnyx.sdk.models.ai.missions.runs.RunResumeRunResponse;

RunResumeRunParams params = RunResumeRunParams.builder()
    .missionId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .runId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
RunResumeRunResponse response = client.ai().missions().runs().resumeRun(params);
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## List linked Telnyx agents

List all Telnyx agents linked to a run

`client.ai().missions().runs().telnyxAgents().list()` — `GET /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.runs.telnyxagents.TelnyxAgentListParams;
import com.telnyx.sdk.models.ai.missions.runs.telnyxagents.TelnyxAgentListResponse;

TelnyxAgentListParams params = TelnyxAgentListParams.builder()
    .missionId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .runId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
TelnyxAgentListResponse telnyxAgents = client.ai().missions().runs().telnyxAgents().list(params);
```

Key response fields: `response.data.created_at, response.data.run_id, response.data.telnyx_agent_id`

## Link Telnyx agent to run

Link a Telnyx AI agent (voice/messaging) to a run

`client.ai().missions().runs().telnyxAgents().link()` — `POST /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `telnyxAgentId` | string (UUID) | Yes | The Telnyx AI agent ID to link |
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.runs.telnyxagents.TelnyxAgentLinkParams;
import com.telnyx.sdk.models.ai.missions.runs.telnyxagents.TelnyxAgentLinkResponse;

TelnyxAgentLinkParams params = TelnyxAgentLinkParams.builder()
    .missionId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .runId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .telnyxAgentId("550e8400-e29b-41d4-a716-446655440000")
    .build();
TelnyxAgentLinkResponse response = client.ai().missions().runs().telnyxAgents().link(params);
```

Key response fields: `response.data.created_at, response.data.run_id, response.data.telnyx_agent_id`

## Unlink Telnyx agent

Unlink a Telnyx agent from a run

`client.ai().missions().runs().telnyxAgents().unlink()` — `DELETE /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents/{telnyx_agent_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `runId` | string (UUID) | Yes |  |
| `telnyxAgentId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.runs.telnyxagents.TelnyxAgentUnlinkParams;

TelnyxAgentUnlinkParams params = TelnyxAgentUnlinkParams.builder()
    .missionId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .runId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .telnyxAgentId("550e8400-e29b-41d4-a716-446655440000")
    .build();
client.ai().missions().runs().telnyxAgents().unlink(params);
```

## List tools

List all tools for a mission

`client.ai().missions().tools().listTools()` — `GET /ai/missions/{mission_id}/tools`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.tools.ToolListToolsParams;
import com.telnyx.sdk.models.ai.missions.tools.ToolListToolsResponse;

ToolListToolsResponse response = client.ai().missions().tools().listTools("550e8400-e29b-41d4-a716-446655440000");
```

## Create tool

Create a new tool for a mission

`client.ai().missions().tools().createTool()` — `POST /ai/missions/{mission_id}/tools`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.tools.ToolCreateToolParams;
import com.telnyx.sdk.models.ai.missions.tools.ToolCreateToolResponse;

ToolCreateToolResponse response = client.ai().missions().tools().createTool("550e8400-e29b-41d4-a716-446655440000");
```

## Get tool

Get a specific tool by ID

`client.ai().missions().tools().getTool()` — `GET /ai/missions/{mission_id}/tools/{tool_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `toolId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.tools.ToolGetToolParams;
import com.telnyx.sdk.models.ai.missions.tools.ToolGetToolResponse;

ToolGetToolParams params = ToolGetToolParams.builder()
    .missionId("550e8400-e29b-41d4-a716-446655440000")
    .toolId("550e8400-e29b-41d4-a716-446655440000")
    .build();
ToolGetToolResponse response = client.ai().missions().tools().getTool(params);
```

## Update tool

Update a tool definition

`client.ai().missions().tools().updateTool()` — `PUT /ai/missions/{mission_id}/tools/{tool_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `toolId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.tools.ToolUpdateToolParams;
import com.telnyx.sdk.models.ai.missions.tools.ToolUpdateToolResponse;

ToolUpdateToolParams params = ToolUpdateToolParams.builder()
    .missionId("550e8400-e29b-41d4-a716-446655440000")
    .toolId("550e8400-e29b-41d4-a716-446655440000")
    .build();
ToolUpdateToolResponse response = client.ai().missions().tools().updateTool(params);
```

## Delete tool

Delete a tool from a mission

`client.ai().missions().tools().deleteTool()` — `DELETE /ai/missions/{mission_id}/tools/{tool_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `missionId` | string (UUID) | Yes |  |
| `toolId` | string (UUID) | Yes |  |

```java
import com.telnyx.sdk.models.ai.missions.tools.ToolDeleteToolParams;

ToolDeleteToolParams params = ToolDeleteToolParams.builder()
    .missionId("550e8400-e29b-41d4-a716-446655440000")
    .toolId("550e8400-e29b-41d4-a716-446655440000")
    .build();
client.ai().missions().tools().deleteTool(params);
```

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
