<!-- SDK reference: telnyx-missions-go -->

# Telnyx Missions - Go

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
  option.WithPublicKey(os.Getenv("TELNYX_PUBLIC_KEY")), // Required for client.Webhooks.Unwrap (webhook verification)
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```go
import "errors"

result, err := client.Messages.Send(ctx, params)
if err != nil {
  var apiErr *telnyx.Error
  if errors.As(err, &apiErr) {
    switch apiErr.StatusCode {
    case 422:
      fmt.Println("Validation error — check required fields and formats")
    case 429:
      // Rate limited — wait, then retry the request (bounded exponential backoff)
      fmt.Println("Rate limited, retrying...")
    default:
      fmt.Printf("API error %d: %s\n", apiErr.StatusCode, apiErr.Error())
    }
  } else {
    fmt.Println("Network error — check connectivity and retry")
  }
  return err // Propagate: a failed request must never look like success to the caller
}
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error (check field formats),
`429` rate limited (retry with exponential backoff).

## Important Notes

- **Pagination:** Use `ListAutoPaging()` for automatic iteration: `iter := client.Resource.ListAutoPaging(ctx, params); for iter.Next() { item := iter.Current() }`.

## List missions

Returns a paginated list of all mission definitions in your organization. Missions describe a goal and the tools, knowledge bases, and MCP servers agents may use to accomplish it.

`GET /ai/missions`

```go
	page, err := client.AI.Missions.List(context.Background(), telnyx.AIMissionListParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `created_at` (date-time), `description` (string), `execution_mode` (enum: external, managed), `instructions` (string), `metadata` (object), `mission_id` (uuid), `model` (string), `name` (string), `updated_at` (date-time)

## Create mission

Creates a new mission definition from the provided configuration and returns the created mission. Execute the mission by starting runs against it.

`POST /ai/missions` — Required: `name`

Optional: `description` (string), `execution_mode` (enum: external, managed), `instructions` (string), `metadata` (object), `model` (string)

```go
	mission, err := client.AI.Missions.New(context.Background(), telnyx.AIMissionNewParams{
		Name: "my-resource",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", mission.Data)
```

Returns: `created_at` (date-time), `description` (string), `execution_mode` (enum: external, managed), `instructions` (string), `metadata` (object), `mission_id` (uuid), `model` (string), `name` (string), `updated_at` (date-time)

## List recent events

Returns a paginated list of recent events across every mission in your organization, optionally filtered by event type. Useful for building activity feeds or monitoring dashboards.

`GET /ai/missions/events`

```go
	page, err := client.AI.Missions.ListEvents(context.Background(), telnyx.AIMissionListEventsParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `agent_id` (string), `event_id` (string), `idempotency_key` (string), `payload` (object), `run_id` (string), `step_id` (string), `summary` (string), `timestamp` (date-time), `type` (enum: status_change, step_started, step_completed, step_failed, tool_call, tool_result, message, error, custom)

## List recent runs

Returns a paginated list of recent runs across every mission in your organization, optionally filtered by run status. Useful for monitoring overall mission activity without querying each mission individually.

`GET /ai/missions/runs`

```go
	page, err := client.AI.Missions.Runs.ListRuns(context.Background(), telnyx.AIMissionRunListRunsParams{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", page)
```

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## Get mission

Get a mission by ID (includes tools, knowledge_bases, mcp_servers)

`GET /ai/missions/{mission_id}`

```go
	mission, err := client.AI.Missions.Get(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", mission.Data)
```

Returns: `created_at` (date-time), `description` (string), `execution_mode` (enum: external, managed), `instructions` (string), `metadata` (object), `mission_id` (uuid), `model` (string), `name` (string), `updated_at` (date-time)

## Update mission

Replaces the specified mission's definition with the provided configuration and returns the updated mission.

`PUT /ai/missions/{mission_id}`

Optional: `description` (string), `execution_mode` (enum: external, managed), `instructions` (string), `metadata` (object), `model` (string), `name` (string)

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

Returns: `created_at` (date-time), `description` (string), `execution_mode` (enum: external, managed), `instructions` (string), `metadata` (object), `mission_id` (uuid), `model` (string), `name` (string), `updated_at` (date-time)

## Delete mission

Permanently deletes the specified mission definition and returns no content on success.

`DELETE /ai/missions/{mission_id}`

```go
	err := client.AI.Missions.DeleteMission(context.Background(), "182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e")
	if err != nil {
		log.Fatal(err)
	}
```

## Clone mission

Creates a copy of the specified mission as a new mission definition, so you can iterate on its configuration without modifying the original.

`POST /ai/missions/{mission_id}/clone`

```go
	response, err := client.AI.Missions.CloneMission(context.Background(), "mission_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## List knowledge bases

Returns the knowledge bases attached to the specified mission. Knowledge bases provide reference content agents can draw on during runs.

`GET /ai/missions/{mission_id}/knowledge-bases`

```go
	response, err := client.AI.Missions.KnowledgeBases.ListKnowledgeBases(context.Background(), "mission_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Create knowledge base

Create a new knowledge base for a mission

`POST /ai/missions/{mission_id}/knowledge-bases`

```go
	response, err := client.AI.Missions.KnowledgeBases.NewKnowledgeBase(context.Background(), "mission_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Get knowledge base

Returns the details of a single knowledge base attached to the specified mission.

`GET /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

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

Replaces the definition of the specified knowledge base on this mission.

`PUT /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

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

Detaches the specified knowledge base from the mission so its content is no longer available to agents in subsequent runs.

`DELETE /ai/missions/{mission_id}/knowledge-bases/{knowledge_base_id}`

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

Returns the MCP servers configured on the specified mission. MCP servers expose external tools and data sources agents can use during runs.

`GET /ai/missions/{mission_id}/mcp-servers`

```go
	response, err := client.AI.Missions.McpServers.ListMcpServers(context.Background(), "mission_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Create MCP server

Adds an MCP server to the specified mission, making the server's tools available to agents during runs of this mission.

`POST /ai/missions/{mission_id}/mcp-servers`

```go
	response, err := client.AI.Missions.McpServers.NewMcpServer(context.Background(), "mission_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Get MCP server

Returns the configuration of a single MCP server attached to the specified mission.

`GET /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

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

Replaces the configuration of the specified MCP server on this mission.

`PUT /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

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

Removes the specified MCP server from the mission, revoking agent access to its tools in subsequent runs.

`DELETE /ai/missions/{mission_id}/mcp-servers/{mcp_server_id}`

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

Returns a paginated list of runs for the specified mission, optionally filtered by run status, so you can track the mission's execution history over time.

`GET /ai/missions/{mission_id}/runs`

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

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## Start a run

Starts a new run of the specified mission and returns the created run object. Track its progress through the run detail, plan, and events endpoints.

`POST /ai/missions/{mission_id}/runs`

Optional: `input` (object), `metadata` (object)

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

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## Get run details

Returns the full details of a single run, including its current status. Use this to poll an in-flight run or inspect the outcome of a completed one.

`GET /ai/missions/{mission_id}/runs/{run_id}`

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

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## Update run

Updates a run's status and/or result and returns the updated run object. Typically used by executing agents to report progress or record the final outcome.

`PATCH /ai/missions/{mission_id}/runs/{run_id}`

Optional: `error` (string), `metadata` (object), `result_payload` (object), `result_summary` (string), `status` (enum: pending, running, paused, succeeded, failed, cancelled)

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

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## Cancel run

Cancels a running or paused run and returns the updated run object. A cancelled run stops executing; start a new run to execute the mission again.

`POST /ai/missions/{mission_id}/runs/{run_id}/cancel`

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

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## List events

Returns a paginated list of events logged for the specified run, filterable by event type, plan step, and agent, so you can reconstruct exactly what happened during execution.

`GET /ai/missions/{mission_id}/runs/{run_id}/events`

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

Returns: `agent_id` (string), `event_id` (string), `idempotency_key` (string), `payload` (object), `run_id` (string), `step_id` (string), `summary` (string), `timestamp` (date-time), `type` (enum: status_change, step_started, step_completed, step_failed, tool_call, tool_result, message, error, custom)

## Log event

Logs a new event against the specified run and returns the created event. Events form the run's audit trail and can reference a plan step or agent.

`POST /ai/missions/{mission_id}/runs/{run_id}/events` — Required: `type`, `summary`

Optional: `agent_id` (string), `idempotency_key` (string), `payload` (object), `step_id` (string)

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

Returns: `agent_id` (string), `event_id` (string), `idempotency_key` (string), `payload` (object), `run_id` (string), `step_id` (string), `summary` (string), `timestamp` (date-time), `type` (enum: status_change, step_started, step_completed, step_failed, tool_call, tool_result, message, error, custom)

## Get event details

Returns the details of a single event logged for the specified run, including its type and payload.

`GET /ai/missions/{mission_id}/runs/{run_id}/events/{event_id}`

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

Returns: `agent_id` (string), `event_id` (string), `idempotency_key` (string), `payload` (object), `run_id` (string), `step_id` (string), `summary` (string), `timestamp` (date-time), `type` (enum: status_change, step_started, step_completed, step_failed, tool_call, tool_result, message, error, custom)

## Pause run

Pauses a currently running run and returns the updated run object. Execution halts until the run is resumed.

`POST /ai/missions/{mission_id}/runs/{run_id}/pause`

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

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## Get plan

Returns the plan for the specified run, including all plan steps and their statuses, so you can see how the mission was decomposed and how far execution has progressed.

`GET /ai/missions/{mission_id}/runs/{run_id}/plan`

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

Returns: `completed_at` (date-time), `description` (string), `metadata` (object), `parent_step_id` (string), `run_id` (uuid), `sequence` (integer), `started_at` (date-time), `status` (enum: pending, in_progress, completed, skipped, failed), `step_id` (string)

## Create initial plan

Creates the initial plan for the specified run from the provided steps and returns the created plan steps. Progress is subsequently reported by updating individual steps.

`POST /ai/missions/{mission_id}/runs/{run_id}/plan` — Required: `steps`

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

Returns: `completed_at` (date-time), `description` (string), `metadata` (object), `parent_step_id` (string), `run_id` (uuid), `sequence` (integer), `started_at` (date-time), `status` (enum: pending, in_progress, completed, skipped, failed), `step_id` (string)

## Add step(s) to plan

Add one or more steps to an existing plan

`POST /ai/missions/{mission_id}/runs/{run_id}/plan/steps` — Required: `steps`

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

Returns: `completed_at` (date-time), `description` (string), `metadata` (object), `parent_step_id` (string), `run_id` (uuid), `sequence` (integer), `started_at` (date-time), `status` (enum: pending, in_progress, completed, skipped, failed), `step_id` (string)

## Get step details

Returns the details of a single plan step within a run's plan, including its status.

`GET /ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}`

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

Returns: `completed_at` (date-time), `description` (string), `metadata` (object), `parent_step_id` (string), `run_id` (uuid), `sequence` (integer), `started_at` (date-time), `status` (enum: pending, in_progress, completed, skipped, failed), `step_id` (string)

## Update step status

Updates the status of a single plan step and returns the updated step. Typically called by the executing agent as it works through the plan.

`PATCH /ai/missions/{mission_id}/runs/{run_id}/plan/steps/{step_id}`

Optional: `metadata` (object), `status` (enum: pending, in_progress, completed, skipped, failed)

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

Returns: `completed_at` (date-time), `description` (string), `metadata` (object), `parent_step_id` (string), `run_id` (uuid), `sequence` (integer), `started_at` (date-time), `status` (enum: pending, in_progress, completed, skipped, failed), `step_id` (string)

## Resume run

Resumes a previously paused run and returns the updated run object, letting execution continue from where it was paused.

`POST /ai/missions/{mission_id}/runs/{run_id}/resume`

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

Returns: `error` (string), `finished_at` (date-time), `input` (object), `metadata` (object), `mission_id` (uuid), `result_payload` (object), `result_summary` (string), `run_id` (uuid), `started_at` (date-time), `status` (enum: pending, running, paused, succeeded, failed, cancelled), `updated_at` (date-time)

## List linked Telnyx agents

Returns the Telnyx agents currently linked to the specified run. Linked agents participate in executing the run's plan.

`GET /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents`

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

Returns: `created_at` (date-time), `run_id` (string), `telnyx_agent_id` (string)

## Link Telnyx agent to run

Link a Telnyx AI agent (voice/messaging) to a run

`POST /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents` — Required: `telnyx_agent_id`

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

Returns: `created_at` (date-time), `run_id` (string), `telnyx_agent_id` (string)

## Unlink Telnyx agent

Unlinks the specified Telnyx agent from the run so it no longer participates in execution. The run itself and its history are unaffected.

`DELETE /ai/missions/{mission_id}/runs/{run_id}/telnyx-agents/{telnyx_agent_id}`

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

Returns the tools configured on the specified mission. Tools define the actions agents may invoke while executing the mission's runs.

`GET /ai/missions/{mission_id}/tools`

```go
	response, err := client.AI.Missions.Tools.ListTools(context.Background(), "mission_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Create tool

Adds a new tool to the specified mission, defining an action agents can invoke during runs of this mission.

`POST /ai/missions/{mission_id}/tools`

```go
	response, err := client.AI.Missions.Tools.NewTool(context.Background(), "mission_id")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%+v\n", response)
```

## Get tool

Returns the definition of a single tool configured on the specified mission.

`GET /ai/missions/{mission_id}/tools/{tool_id}`

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

Replaces the definition of the specified tool on this mission.

`PUT /ai/missions/{mission_id}/tools/{tool_id}`

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

Removes the specified tool from the mission so agents can no longer invoke it in subsequent runs.

`DELETE /ai/missions/{mission_id}/tools/{tool_id}`

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
