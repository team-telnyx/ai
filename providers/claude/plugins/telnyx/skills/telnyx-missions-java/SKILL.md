---
name: telnyx-missions-java
description: >-
  Create and manage Telnyx Missions — automated workflows, tasks, and
  sub-resources for AI-driven telecom operations. This skill provides Java SDK
  examples.
metadata:
  author: telnyx
  product: missions
  language: java
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Missions - Java

## Installation

```text
<!-- Maven -->
<dependency>
    <groupId>com.telnyx.sdk</groupId>
    <artifactId>telnyx</artifactId>
    <version>6.36.0</version>
</dependency>

// Gradle
implementation("com.telnyx.sdk:telnyx:6.36.0")
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
    var result = client.messages().send(params);
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

## List missions

List all missions for the organization

`GET /ai/missions`

```java
import com.telnyx.sdk.models.ai.missions.MissionListPage;
import com.telnyx.sdk.models.ai.missions.MissionListParams;

MissionListPage page = client.ai().missions().list();
```

Returns: `created_at` (date-time), `description` (string), `execution_mode` (enum: external, managed), `instructions` (string), `metadata` (object), `mission_id` (uuid), `model` (string), `name` (string), `updated_at` (date-time)

## Create mission

Create a new mission definition

`POST /ai/missions` — Required: `name`

Optional: `description` (string), `execution_mode` (enum: external, managed), `instructions` (string), `metadata` (object), `model` (string)

```java
import com.telnyx.sdk.models.ai.missions.MissionCreateParams;
import com.telnyx.sdk.models.ai.missions.MissionCreateResponse;

MissionCreateParams params = MissionCreateParams.builder()
    .name("my-resource")
    .build();
MissionCreateResponse mission = client.ai().missions().create(params);
```

Returns: `created_at` (date-time), `description` (string), `execution_mode` (enum: external, managed), `instructions` (string), `metadata` (object), `mission_id` (uuid), `model` (string), `name` (string), `updated_at` (date-time)

## List recent events

List recent events across all missions

`GET /ai/missions/events`

```java
import com.telnyx.sdk.models.ai.missions.MissionListEventsPage;
import com.telnyx.sdk.models.ai.missions.MissionListEventsParams;

MissionListEventsPage page = client.ai().missions().listEvents();
```

Returns: `agent_id` (string), `event_id` (string), `idempotency_key` (string), `payload` (object), `run_id` (string), `step_id` (string), `summary` (string), `timestamp` (date-time), `type` (enum: status_change, step_started, step_completed, step_failed, tool_call, tool_result, message, error, custom)

## List recent runs

List recent runs across all missions

`GET /ai/missions/runs`

```java
import com.telnyx.sdk.models.ai.missions.runs.RunListRunsPage;
import com.telnyx.sdk.models.ai.missions.runs.RunListRunsParams;

RunListRunsPage page = client.ai().missions().runs().listRuns();
```

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## Get mission

Get a mission by ID (includes tools, knowledge_bases, mcp_servers)

`GET /ai/missions/{mission_id}`

```java
import com.telnyx.sdk.models.ai.missions.MissionRetrieveParams;
import com.telnyx.sdk.models.ai.missions.MissionRetrieveResponse;

MissionRetrieveResponse mission = client.ai().missions().retrieve("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Returns: `created_at` (date-time), `description` (string), `execution_mode` (enum: external, managed), `instructions` (string), `metadata` (object), `mission_id` (uuid), `model` (string), `name` (string), `updated_at` (date-time)

## Update mission

Update a mission definition

`PUT /ai/missions/{mission_id}`

Optional: `description` (string), `execution_mode` (enum: external, managed), `instructions` (string), `metadata` (object), `model` (string), `name` (string)

```java
import com.telnyx.sdk.models.ai.missions.MissionUpdateMissionParams;
import com.telnyx.sdk.models.ai.missions.MissionUpdateMissionResponse;

MissionUpdateMissionResponse response = client.ai().missions().updateMission("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Returns: `created_at` (date-time), `description` (string), `execution_mode` (enum: external, managed), `instructions` (string), `metadata` (object), `mission_id` (uuid), `model` (string), `name` (string), `updated_at` (date-time)

## Delete mission

Delete a mission

`DELETE /ai/missions/{mission_id}`

```java
import com.telnyx.sdk.models.ai.missions.MissionDeleteMissionParams;

client.ai().missions().deleteMission("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

## Clone mission

Clone an existing mission

`POST /ai/missions/{mission_id}/clone`

```java
import com.telnyx.sdk.models.ai.missions.MissionCloneMissionParams;
import com.telnyx.sdk.models.ai.missions.MissionCloneMissionResponse;

MissionCloneMissionResponse response = client.ai().missions().cloneMission("550e8400-e29b-41d4-a716-446655440000");
```

## List knowledge bases

List all knowledge bases for a mission

`GET /ai/missions/{mission_id}/knowledge-bases`

```java
import com.telnyx.sdk.models.ai.missions.knowledgebases.KnowledgeBaseListKnowledgeBasesParams;
import com.telnyx.sdk.models.ai.missions.knowledgebases.KnowledgeBaseListKnowledgeBasesResponse;

KnowledgeBaseListKnowledgeBasesResponse response = client.ai().missions().knowledgeBases().listKnowledgeBases("550e8400-e29b-41d4-a716-446655440000");
```

## Create knowledge base

Create a new knowledge base for a mission

`POST /ai/missions/{mission_id}/knowledge-bases`

```java
import com.telnyx.sdk.models.ai.missions.knowledgebases.KnowledgeBaseCreateKnowledgeBaseParams;
import com.telnyx.sdk.models.ai.missions.knowledgebases.KnowledgeBaseCreateKnowledgeBaseResponse;

KnowledgeBaseCreateKnowledgeBaseResponse response = client.ai().missions().knowledgeBases().createKnowledgeBase("550e8400-e29b-41d4-a716-446655440000");
```

## Get knowledge base

Get a specific knowledge base by ID

`GET /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

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

`PUT /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

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

`DELETE /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

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

`GET /ai/missions/{mission_id}/mcp-servers`

```java
import com.telnyx.sdk.models.ai.missions.mcpservers.McpServerListMcpServersParams;
import com.telnyx.sdk.models.ai.missions.mcpservers.McpServerListMcpServersResponse;

McpServerListMcpServersResponse response = client.ai().missions().mcpServers().listMcpServers("550e8400-e29b-41d4-a716-446655440000");
```

## Create MCP server

Create a new MCP server for a mission

`POST /ai/missions/{mission_id}/mcp-servers`

```java
import com.telnyx.sdk.models.ai.missions.mcpservers.McpServerCreateMcpServerParams;
import com.telnyx.sdk.models.ai.missions.mcpservers.McpServerCreateMcpServerResponse;

McpServerCreateMcpServerResponse response = client.ai().missions().mcpServers().createMcpServer("550e8400-e29b-41d4-a716-446655440000");
```

## Get MCP server

Get a specific MCP server by ID

`GET /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

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

`PUT /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

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

`DELETE /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

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

`GET /ai/missions/{mission_id}/runs`

```java
import com.telnyx.sdk.models.ai.missions.runs.RunListPage;
import com.telnyx.sdk.models.ai.missions.runs.RunListParams;

RunListPage page = client.ai().missions().runs().list("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## Start a run

Start a new run for a mission

`POST /ai/missions/{mission_id}/runs`

Optional: `input` (object), `metadata` (object)

```java
import com.telnyx.sdk.models.ai.missions.runs.RunCreateParams;
import com.telnyx.sdk.models.ai.missions.runs.RunCreateResponse;

RunCreateResponse run = client.ai().missions().runs().create("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e");
```

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## Get run details

Get details of a specific run

`GET /ai/missions/{mission_id}/runs/{run_id}`

```java
import com.telnyx.sdk.models.ai.missions.runs.RunRetrieveParams;
import com.telnyx.sdk.models.ai.missions.runs.RunRetrieveResponse;

RunRetrieveParams params = RunRetrieveParams.builder()
    .missionId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .runId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
RunRetrieveResponse run = client.ai().missions().runs().retrieve(params);
```

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## Update run

Update run status and/or result

`PATCH /ai/missions/{mission_id}/runs/{run_id}`

Optional: `error` (string), `metadata` (object), `result_payload` (object), `result_summary` (string), `status` (enum: pending, running, paused, succeeded, failed, cancelled)

```java
import com.telnyx.sdk.models.ai.missions.runs.RunUpdateParams;
import com.telnyx.sdk.models.ai.missions.runs.RunUpdateResponse;

RunUpdateParams params = RunUpdateParams.builder()
    .missionId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .runId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
RunUpdateResponse run = client.ai().missions().runs().update(params);
```

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## Cancel run

Cancel a running or paused run

`POST /ai/missions/{mission_id}/runs/{run_id}/cancel`

```java
import com.telnyx.sdk.models.ai.missions.runs.RunCancelRunParams;
import com.telnyx.sdk.models.ai.missions.runs.RunCancelRunResponse;

RunCancelRunParams params = RunCancelRunParams.builder()
    .missionId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .runId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
RunCancelRunResponse response = client.ai().missions().runs().cancelRun(params);
```

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## List events

List events for a run (paginated)

`GET /ai/missions/{mission_id}/runs/{run_id}/events`

```java
import com.telnyx.sdk.models.ai.missions.runs.events.EventListPage;
import com.telnyx.sdk.models.ai.missions.runs.events.EventListParams;

EventListParams params = EventListParams.builder()
    .missionId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .runId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
EventListPage page = client.ai().missions().runs().events().list(params);
```

Returns: `agent_id` (string), `event_id` (string), `idempotency_key` (string), `payload` (object), `run_id` (string), `step_id` (string), `summary` (string), `timestamp` (date-time), `type` (enum: status_change, step_started, step_completed, step_failed, tool_call, tool_result, message, error, custom)

## Log event

Log an event for a run

`POST /ai/missions/{mission_id}/runs/{run_id}/events` — Required: `type`, `summary`

Optional: `agent_id` (string), `idempotency_key` (string), `payload` (object), `step_id` (string)

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

Returns: `agent_id` (string), `event_id` (string), `idempotency_key` (string), `payload` (object), `run_id` (string), `step_id` (string), `summary` (string), `timestamp` (date-time), `type` (enum: status_change, step_started, step_completed, step_failed, tool_call, tool_result, message, error, custom)

## Get event details

Get details of a specific event

`GET /ai/missions/{mission_id}/runs/{run_id}/events/{event_id}`

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

Returns: `agent_id` (string), `event_id` (string), `idempotency_key` (string), `payload` (object), `run_id` (string), `step_id` (string), `summary` (string), `timestamp` (date-time), `type` (enum: status_change, step_started, step_completed, step_failed, tool_call, tool_result, message, error, custom)

## Pause run

Pause a running run

`POST /ai/missions/{mission_id}/runs/{run_id}/pause`

```java
import com.telnyx.sdk.models.ai.missions.runs.RunPauseRunParams;
import com.telnyx.sdk.models.ai.missions.runs.RunPauseRunResponse;

RunPauseRunParams params = RunPauseRunParams.builder()
    .missionId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .runId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
RunPauseRunResponse response = client.ai().missions().runs().pauseRun(params);
```

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## Get plan

Get the plan (all steps) for a run

`GET /ai/missions/{mission_id}/runs/{run_id}/plan`

```java
import com.telnyx.sdk.models.ai.missions.runs.plan.PlanRetrieveParams;
import com.telnyx.sdk.models.ai.missions.runs.plan.PlanRetrieveResponse;

PlanRetrieveParams params = PlanRetrieveParams.builder()
    .missionId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .runId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
PlanRetrieveResponse plan = client.ai().missions().runs().plan().retrieve(params);
```

Returns: `completed_at` (date-time), `description` (string), `metadata` (object), `parent_step_id` (string), `run_id` (uuid), `sequence` (integer), `started_at` (date-time), `status` (enum: pending, in_progress, completed, skipped, failed), `step_id` (string)

## Create initial plan

Create the initial plan for a run

`POST /ai/missions/{mission_id}/runs/{run_id}/plan` — Required: `steps`

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

Returns: `completed_at` (date-time), `description` (string), `metadata` (object), `parent_step_id` (string), `run_id` (uuid), `sequence` (integer), `started_at` (date-time), `status` (enum: pending, in_progress, completed, skipped, failed), `step_id` (string)

## Add step(s) to plan

Add one or more steps to an existing plan

`POST /ai/missions/{mission_id}/runs/{run_id}/plan/steps` — Required: `steps`

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

Returns: `completed_at` (date-time), `description` (string), `metadata` (object), `parent_step_id` (string), `run_id` (uuid), `sequence` (integer), `started_at` (date-time), `status` (enum: pending, in_progress, completed, skipped, failed), `step_id` (string)

## Get step details

Get details of a specific plan step

`GET /ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}`

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

Returns: `completed_at` (date-time), `description` (string), `metadata` (object), `parent_step_id` (string), `run_id` (uuid), `sequence` (integer), `started_at` (date-time), `status` (enum: pending, in_progress, completed, skipped, failed), `step_id` (string)

## Update step status

Update the status of a plan step

`PATCH /ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}`

Optional: `metadata` (object), `status` (enum: pending, in_progress, completed, skipped, failed)

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

Returns: `completed_at` (date-time), `description` (string), `metadata` (object), `parent_step_id` (string), `run_id` (uuid), `sequence` (integer), `started_at` (date-time), `status` (enum: pending, in_progress, completed, skipped, failed), `step_id` (string)

## Resume run

Resume a paused run

`POST /ai/missions/{mission_id}/runs/{run_id}/resume`

```java
import com.telnyx.sdk.models.ai.missions.runs.RunResumeRunParams;
import com.telnyx.sdk.models.ai.missions.runs.RunResumeRunResponse;

RunResumeRunParams params = RunResumeRunParams.builder()
    .missionId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .runId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
RunResumeRunResponse response = client.ai().missions().runs().resumeRun(params);
```

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## List linked Telnyx agents

List all Telnyx agents linked to a run

`GET /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents`

```java
import com.telnyx.sdk.models.ai.missions.runs.telnyxagents.TelnyxAgentListParams;
import com.telnyx.sdk.models.ai.missions.runs.telnyxagents.TelnyxAgentListResponse;

TelnyxAgentListParams params = TelnyxAgentListParams.builder()
    .missionId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .runId("182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
    .build();
TelnyxAgentListResponse telnyxAgents = client.ai().missions().runs().telnyxAgents().list(params);
```

Returns: `created_at` (date-time), `run_id` (string), `telnyx_agent_id` (string)

## Link Telnyx agent to run

Link a Telnyx AI agent (voice/messaging) to a run

`POST /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents` — Required: `telnyx_agent_id`

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

Returns: `created_at` (date-time), `run_id` (string), `telnyx_agent_id` (string)

## Unlink Telnyx agent

Unlink a Telnyx agent from a run

`DELETE /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents/{telnyx_agent_id}`

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

`GET /ai/missions/{mission_id}/tools`

```java
import com.telnyx.sdk.models.ai.missions.tools.ToolListToolsParams;
import com.telnyx.sdk.models.ai.missions.tools.ToolListToolsResponse;

ToolListToolsResponse response = client.ai().missions().tools().listTools("550e8400-e29b-41d4-a716-446655440000");
```

## Create tool

Create a new tool for a mission

`POST /ai/missions/{mission_id}/tools`

```java
import com.telnyx.sdk.models.ai.missions.tools.ToolCreateToolParams;
import com.telnyx.sdk.models.ai.missions.tools.ToolCreateToolResponse;

ToolCreateToolResponse response = client.ai().missions().tools().createTool("550e8400-e29b-41d4-a716-446655440000");
```

## Get tool

Get a specific tool by ID

`GET /ai/missions/{mission_id}/tools/{tool_id}`

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

`PUT /ai/missions/{mission_id}/tools/{tool_id}`

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

`DELETE /ai/missions/{mission_id}/tools/{tool_id}`

```java
import com.telnyx.sdk.models.ai.missions.tools.ToolDeleteToolParams;

ToolDeleteToolParams params = ToolDeleteToolParams.builder()
    .missionId("550e8400-e29b-41d4-a716-446655440000")
    .toolId("550e8400-e29b-41d4-a716-446655440000")
    .build();
client.ai().missions().tools().deleteTool(params);
```
