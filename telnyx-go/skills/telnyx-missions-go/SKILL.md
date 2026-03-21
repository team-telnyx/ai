---
name: telnyx-missions-go
description: >-
  Telnyx Missions: automated workflows, tasks, and sub-resources for AI-driven
  operations.
metadata:
  author: telnyx
  product: missions
  language: go
  generated_by: telnyx-ext-skills-generator
---

<!-- Auto-generated from Telnyx OpenAPI specs. Do not edit. -->

# Telnyx Missions - Go

## Core Workflow

### Prerequisites

1. No special setup required — just a Telnyx API key

### Steps

1. **Create mission**: `client.Missions.Create(ctx, params)`
2. **Add tasks**: `client.MissionTasks.Create(ctx, params)`
3. **Monitor progress**: `client.Missions.Retrieve(ctx, params)`

### Common mistakes

- Missions orchestrate multi-step AI workflows — each task runs independently

**Related skills**: telnyx-ai-assistants-go, telnyx-ai-inference-go

## Installation

```bash
go get github.com/team-telnyx/telnyx-go
```

## Setup

```go
import (
  "context"
  "fmt"
  "os"

  "github.com/team-telnyx/telnyx-go"
  "github.com/team-telnyx/telnyx-go/option"
)

client := telnyx.NewClient(
  option.WithAPIKey(os.Getenv("TELNYX_API_KEY")),
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```go
import "errors"

result, err := client.Missions.Create(ctx, params)
if err != nil {
  var apiErr *telnyx.Error
  if errors.As(err, &apiErr) {
    switch apiErr.StatusCode {
    case 422:
      fmt.Println("Validation error — check required fields and formats")
    case 429:
      // Rate limited — wait and retry with exponential backoff
      fmt.Println("Rate limited, retrying...")
    default:
      fmt.Printf("API error %d: %s\n", apiErr.StatusCode, apiErr.Error())
    }
  } else {
    fmt.Println("Network error — check connectivity and retry")
  }
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** Use `ListAutoPaging()` for automatic iteration: `iter := client.Resource.ListAutoPaging(ctx, params); for iter.Next() { item := iter.Current() }`.

**[references/api-details.md](references/api-details.md) has complete response schemas, all optional parameters, and webhook payload fields. You MUST read it when accessing response fields or using optional parameters not shown below.**

## List missions

List all missions for the organization

`client.AI.Missions.List()` — `GET /ai/missions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Page[number]` | integer | No | Page number (1-based) |
| `Page[size]` | integer | No | Number of items per page |

```go
	page, err := client.AI.Missions.List(context.Background(), telnyx.AIMissionListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Create mission

Create a new mission definition

`client.AI.Missions.New()` — `POST /ai/missions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Name` | string | Yes |  |
| `ExecutionMode` | enum (external, managed) | No |  |
| `Description` | string | No |  |
| `Model` | string | No |  |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```go
	mission, err := client.AI.Missions.New(context.Background(), telnyx.AIMissionNewParams{
		Name: "my-resource",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", mission.Data)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## List recent events

List recent events across all missions

`client.AI.Missions.ListEvents()` — `GET /ai/missions/events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Type` | string | No |  |
| `Page[number]` | integer | No | Page number (1-based) |
| `Page[size]` | integer | No | Number of items per page |

```go
	page, err := client.AI.Missions.ListEvents(context.Background(), telnyx.AIMissionListEventsParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.type, response.data.agent_id, response.data.event_id`

## List recent runs

List recent runs across all missions

`client.AI.Missions.Runs.ListRuns()` — `GET /ai/missions/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Status` | string | No |  |
| `Page[number]` | integer | No | Page number (1-based) |
| `Page[size]` | integer | No | Number of items per page |

```go
	page, err := client.AI.Missions.Runs.ListRuns(context.Background(), telnyx.AIMissionRunListRunsParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## Get mission

Get a mission by ID (includes tools, knowledge_bases, mcp_servers)

`client.AI.Missions.Get()` — `GET /ai/missions/{mission_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |

```go
	mission, err := client.AI.Missions.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", mission.Data)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Update mission

Update a mission definition

`client.AI.Missions.UpdateMission()` — `PUT /ai/missions/{mission_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |
| `ExecutionMode` | enum (external, managed) | No |  |
| `Name` | string | No |  |
| `Description` | string | No |  |
| ... | | | +3 optional params in [references/api-details.md](references/api-details.md) |

```go
	response, err := client.AI.Missions.UpdateMission(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AIMissionUpdateMissionParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.name, response.data.created_at, response.data.updated_at`

## Delete mission

Delete a mission

`client.AI.Missions.DeleteMission()` — `DELETE /ai/missions/{mission_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |

```go
	err := client.AI.Missions.DeleteMission(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
```

## Clone mission

Clone an existing mission

`client.AI.Missions.CloneMission()` — `POST /ai/missions/{mission_id}/clone`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |

```go
	response, err := client.AI.Missions.CloneMission(context.Background(), "mission_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## List knowledge bases

List all knowledge bases for a mission

`client.AI.Missions.KnowledgeBases.ListKnowledgeBases()` — `GET /ai/missions/{mission_id}/knowledge-bases`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |

```go
	response, err := client.AI.Missions.KnowledgeBases.ListKnowledgeBases(context.Background(), "mission_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Create knowledge base

Create a new knowledge base for a mission

`client.AI.Missions.KnowledgeBases.NewKnowledgeBase()` — `POST /ai/missions/{mission_id}/knowledge-bases`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |

```go
	response, err := client.AI.Missions.KnowledgeBases.NewKnowledgeBase(context.Background(), "mission_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Get knowledge base

Get a specific knowledge base by ID

`client.AI.Missions.KnowledgeBases.GetKnowledgeBase()` — `GET /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |
| `KnowledgeBaseId` | string (UUID) | Yes |  |

```go
	response, err := client.AI.Missions.KnowledgeBases.GetKnowledgeBase(
		context.Background(),
		"knowledge_base_id",
		telnyx.AIMissionKnowledgeBaseGetKnowledgeBaseParams{
			MissionID: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Update knowledge base

Update a knowledge base definition

`client.AI.Missions.KnowledgeBases.UpdateKnowledgeBase()` — `PUT /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |
| `KnowledgeBaseId` | string (UUID) | Yes |  |

```go
	response, err := client.AI.Missions.KnowledgeBases.UpdateKnowledgeBase(
		context.Background(),
		"knowledge_base_id",
		telnyx.AIMissionKnowledgeBaseUpdateKnowledgeBaseParams{
			MissionID: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Delete knowledge base

Delete a knowledge base from a mission

`client.AI.Missions.KnowledgeBases.DeleteKnowledgeBase()` — `DELETE /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |
| `KnowledgeBaseId` | string (UUID) | Yes |  |

```go
	err := client.AI.Missions.KnowledgeBases.DeleteKnowledgeBase(
		context.Background(),
		"knowledge_base_id",
		telnyx.AIMissionKnowledgeBaseDeleteKnowledgeBaseParams{
			MissionID: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
```

## List MCP servers

List all MCP servers for a mission

`client.AI.Missions.McpServers.ListMcpServers()` — `GET /ai/missions/{mission_id}/mcp-servers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |

```go
	response, err := client.AI.Missions.McpServers.ListMcpServers(context.Background(), "mission_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Create MCP server

Create a new MCP server for a mission

`client.AI.Missions.McpServers.NewMcpServer()` — `POST /ai/missions/{mission_id}/mcp-servers`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |

```go
	response, err := client.AI.Missions.McpServers.NewMcpServer(context.Background(), "mission_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Get MCP server

Get a specific MCP server by ID

`client.AI.Missions.McpServers.GetMcpServer()` — `GET /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |
| `McpServerId` | string (UUID) | Yes |  |

```go
	response, err := client.AI.Missions.McpServers.GetMcpServer(
		context.Background(),
		"mcp_server_id",
		telnyx.AIMissionMcpServerGetMcpServerParams{
			MissionID: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Update MCP server

Update an MCP server definition

`client.AI.Missions.McpServers.UpdateMcpServer()` — `PUT /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |
| `McpServerId` | string (UUID) | Yes |  |

```go
	response, err := client.AI.Missions.McpServers.UpdateMcpServer(
		context.Background(),
		"mcp_server_id",
		telnyx.AIMissionMcpServerUpdateMcpServerParams{
			MissionID: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Delete MCP server

Delete an MCP server from a mission

`client.AI.Missions.McpServers.DeleteMcpServer()` — `DELETE /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |
| `McpServerId` | string (UUID) | Yes |  |

```go
	err := client.AI.Missions.McpServers.DeleteMcpServer(
		context.Background(),
		"mcp_server_id",
		telnyx.AIMissionMcpServerDeleteMcpServerParams{
			MissionID: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
```

## List runs for mission

List all runs for a specific mission

`client.AI.Missions.Runs.List()` — `GET /ai/missions/{mission_id}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |
| `Status` | string | No |  |
| `Page[number]` | integer | No | Page number (1-based) |
| `Page[size]` | integer | No | Number of items per page |

```go
	page, err := client.AI.Missions.Runs.List(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AIMissionRunListParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## Start a run

Start a new run for a mission

`client.AI.Missions.Runs.New()` — `POST /ai/missions/{mission_id}/runs`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |
| `Input` | object | No |  |
| `Metadata` | object | No |  |

```go
	run, err := client.AI.Missions.Runs.New(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AIMissionRunNewParams{},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", run.Data)
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## Get run details

Get details of a specific run

`client.AI.Missions.Runs.Get()` — `GET /ai/missions/{mission_id}/runs/{run_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |
| `RunId` | string (UUID) | Yes |  |

```go
	run, err := client.AI.Missions.Runs.Get(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AIMissionRunGetParams{
			MissionID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", run.Data)
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## Update run

Update run status and/or result

`client.AI.Missions.Runs.Update()` — `PATCH /ai/missions/{mission_id}/runs/{run_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |
| `RunId` | string (UUID) | Yes |  |
| `Status` | enum (pending, running, paused, succeeded, failed, ...) | No |  |
| `ResultSummary` | string | No |  |
| `ResultPayload` | object | No |  |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```go
	run, err := client.AI.Missions.Runs.Update(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AIMissionRunUpdateParams{
			MissionID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", run.Data)
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## Cancel run

Cancel a running or paused run

`client.AI.Missions.Runs.CancelRun()` — `POST /ai/missions/{mission_id}/runs/{run_id}/cancel`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |
| `RunId` | string (UUID) | Yes |  |

```go
	response, err := client.AI.Missions.Runs.CancelRun(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AIMissionRunCancelRunParams{
			MissionID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## List events

List events for a run (paginated)

`client.AI.Missions.Runs.Events.List()` — `GET /ai/missions/{mission_id}/runs/{run_id}/events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |
| `RunId` | string (UUID) | Yes |  |
| `Type` | string | No |  |
| `StepId` | string (UUID) | No |  |
| `AgentId` | string (UUID) | No |  |
| ... | | | +2 optional params in [references/api-details.md](references/api-details.md) |

```go
	page, err := client.AI.Missions.Runs.Events.List(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AIMissionRunEventListParams{
			MissionID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Key response fields: `response.data.type, response.data.agent_id, response.data.event_id`

## Log event

Log an event for a run

`client.AI.Missions.Runs.Events.Log()` — `POST /ai/missions/{mission_id}/runs/{run_id}/events`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Type` | enum (status_change, step_started, step_completed, step_failed, tool_call, ...) | Yes |  |
| `Summary` | string | Yes |  |
| `MissionId` | string (UUID) | Yes |  |
| `RunId` | string (UUID) | Yes |  |
| `StepId` | string (UUID) | No |  |
| `AgentId` | string (UUID) | No |  |
| `Payload` | object | No |  |
| ... | | | +1 optional params in [references/api-details.md](references/api-details.md) |

```go
	response, err := client.AI.Missions.Runs.Events.Log(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AIMissionRunEventLogParams{
			MissionID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
			Summary: "Brief task summary",
			Type:      telnyx.AIMissionRunEventLogParamsTypeStatusChange,
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.type, response.data.agent_id, response.data.event_id`

## Get event details

Get details of a specific event

`client.AI.Missions.Runs.Events.GetEventDetails()` — `GET /ai/missions/{mission_id}/runs/{run_id}/events/{event_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |
| `RunId` | string (UUID) | Yes |  |
| `EventId` | string (UUID) | Yes |  |

```go
	response, err := client.AI.Missions.Runs.Events.GetEventDetails(
		context.Background(),
		"event_id",
		telnyx.AIMissionRunEventGetEventDetailsParams{
			MissionID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
			RunID:     "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.type, response.data.agent_id, response.data.event_id`

## Pause run

Pause a running run

`client.AI.Missions.Runs.PauseRun()` — `POST /ai/missions/{mission_id}/runs/{run_id}/pause`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |
| `RunId` | string (UUID) | Yes |  |

```go
	response, err := client.AI.Missions.Runs.PauseRun(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AIMissionRunPauseRunParams{
			MissionID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## Get plan

Get the plan (all steps) for a run

`client.AI.Missions.Runs.Plan.Get()` — `GET /ai/missions/{mission_id}/runs/{run_id}/plan`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |
| `RunId` | string (UUID) | Yes |  |

```go
	plan, err := client.AI.Missions.Runs.Plan.Get(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AIMissionRunPlanGetParams{
			MissionID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", plan.Data)
```

Key response fields: `response.data.status, response.data.completed_at, response.data.description`

## Create initial plan

Create the initial plan for a run

`client.AI.Missions.Runs.Plan.New()` — `POST /ai/missions/{mission_id}/runs/{run_id}/plan`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Steps` | array[object] | Yes |  |
| `MissionId` | string (UUID) | Yes |  |
| `RunId` | string (UUID) | Yes |  |

```go
	plan, err := client.AI.Missions.Runs.Plan.New(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AIMissionRunPlanNewParams{
			MissionID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
			Steps: []telnyx.AIMissionRunPlanNewParamsStep{{
				Description: "description",
				Sequence:    0,
				StepID: "550e8400-e29b-41d4-a716-446655440000",
			}},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", plan.Data)
```

Key response fields: `response.data.status, response.data.completed_at, response.data.description`

## Add step(s) to plan

Add one or more steps to an existing plan

`client.AI.Missions.Runs.Plan.AddStepsToPlan()` — `POST /ai/missions/{mission_id}/runs/{run_id}/plan/steps`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Steps` | array[object] | Yes |  |
| `MissionId` | string (UUID) | Yes |  |
| `RunId` | string (UUID) | Yes |  |

```go
	response, err := client.AI.Missions.Runs.Plan.AddStepsToPlan(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AIMissionRunPlanAddStepsToPlanParams{
			MissionID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
			Steps: []telnyx.AIMissionRunPlanAddStepsToPlanParamsStep{{
				Description: "description",
				Sequence:    0,
				StepID: "550e8400-e29b-41d4-a716-446655440000",
			}},
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.status, response.data.completed_at, response.data.description`

## Get step details

Get details of a specific plan step

`client.AI.Missions.Runs.Plan.GetStepDetails()` — `GET /ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |
| `RunId` | string (UUID) | Yes |  |
| `StepId` | string (UUID) | Yes |  |

```go
	response, err := client.AI.Missions.Runs.Plan.GetStepDetails(
		context.Background(),
		"step_id",
		telnyx.AIMissionRunPlanGetStepDetailsParams{
			MissionID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
			RunID:     "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.status, response.data.completed_at, response.data.description`

## Update step status

Update the status of a plan step

`client.AI.Missions.Runs.Plan.UpdateStep()` — `PATCH /ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |
| `RunId` | string (UUID) | Yes |  |
| `StepId` | string (UUID) | Yes |  |
| `Status` | enum (pending, in_progress, completed, skipped, failed) | No |  |
| `Metadata` | object | No |  |

```go
	response, err := client.AI.Missions.Runs.Plan.UpdateStep(
		context.Background(),
		"step_id",
		telnyx.AIMissionRunPlanUpdateStepParams{
			MissionID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
			RunID:     "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.status, response.data.completed_at, response.data.description`

## Resume run

Resume a paused run

`client.AI.Missions.Runs.ResumeRun()` — `POST /ai/missions/{mission_id}/runs/{run_id}/resume`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |
| `RunId` | string (UUID) | Yes |  |

```go
	response, err := client.AI.Missions.Runs.ResumeRun(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AIMissionRunResumeRunParams{
			MissionID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.status, response.data.updated_at, response.data.error`

## List linked Telnyx agents

List all Telnyx agents linked to a run

`client.AI.Missions.Runs.TelnyxAgents.List()` — `GET /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |
| `RunId` | string (UUID) | Yes |  |

```go
	telnyxAgents, err := client.AI.Missions.Runs.TelnyxAgents.List(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AIMissionRunTelnyxAgentListParams{
			MissionID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", telnyxAgents.Data)
```

Key response fields: `response.data.created_at, response.data.run_id, response.data.telnyx_agent_id`

## Link Telnyx agent to run

Link a Telnyx AI agent (voice/messaging) to a run

`client.AI.Missions.Runs.TelnyxAgents.Link()` — `POST /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `TelnyxAgentId` | string (UUID) | Yes | The Telnyx AI agent ID to link |
| `MissionId` | string (UUID) | Yes |  |
| `RunId` | string (UUID) | Yes |  |

```go
	response, err := client.AI.Missions.Runs.TelnyxAgents.Link(
		context.Background(),
		"182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		telnyx.AIMissionRunTelnyxAgentLinkParams{
			MissionID:     "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
			TelnyxAgentID: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response.Data)
```

Key response fields: `response.data.created_at, response.data.run_id, response.data.telnyx_agent_id`

## Unlink Telnyx agent

Unlink a Telnyx agent from a run

`client.AI.Missions.Runs.TelnyxAgents.Unlink()` — `DELETE /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents/{telnyx_agent_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |
| `RunId` | string (UUID) | Yes |  |
| `TelnyxAgentId` | string (UUID) | Yes |  |

```go
	err := client.AI.Missions.Runs.TelnyxAgents.Unlink(
		context.Background(),
		"telnyx_agent_id",
		telnyx.AIMissionRunTelnyxAgentUnlinkParams{
			MissionID: "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
			RunID:     "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
```

## List tools

List all tools for a mission

`client.AI.Missions.Tools.ListTools()` — `GET /ai/missions/{mission_id}/tools`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |

```go
	response, err := client.AI.Missions.Tools.ListTools(context.Background(), "mission_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Create tool

Create a new tool for a mission

`client.AI.Missions.Tools.NewTool()` — `POST /ai/missions/{mission_id}/tools`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |

```go
	response, err := client.AI.Missions.Tools.NewTool(context.Background(), "mission_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Get tool

Get a specific tool by ID

`client.AI.Missions.Tools.GetTool()` — `GET /ai/missions/{mission_id}/tools/{tool_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |
| `ToolId` | string (UUID) | Yes |  |

```go
	response, err := client.AI.Missions.Tools.GetTool(
		context.Background(),
		"tool_id",
		telnyx.AIMissionToolGetToolParams{
			MissionID: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Update tool

Update a tool definition

`client.AI.Missions.Tools.UpdateTool()` — `PUT /ai/missions/{mission_id}/tools/{tool_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |
| `ToolId` | string (UUID) | Yes |  |

```go
	response, err := client.AI.Missions.Tools.UpdateTool(
		context.Background(),
		"tool_id",
		telnyx.AIMissionToolUpdateToolParams{
			MissionID: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Delete tool

Delete a tool from a mission

`client.AI.Missions.Tools.DeleteTool()` — `DELETE /ai/missions/{mission_id}/tools/{tool_id}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MissionId` | string (UUID) | Yes |  |
| `ToolId` | string (UUID) | Yes |  |

```go
	err := client.AI.Missions.Tools.DeleteTool(
		context.Background(),
		"tool_id",
		telnyx.AIMissionToolDeleteToolParams{
			MissionID: "550e8400-e29b-41d4-a716-446655440000",
		},
	)
	if err != nil {
		log.Fatal(err)
	}
```

---

**Do not guess response field names or optional parameters. Load [references/api-details.md](references/api-details.md) for complete schemas and parameter details.**
