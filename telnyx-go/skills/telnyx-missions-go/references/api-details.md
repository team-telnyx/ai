# Missions (Go) — API Details

<!-- Auto-generated reference file. Do not edit. -->

## Table of Contents

- [Response Schemas](#response-schemas)
- [Optional Parameters](#optional-parameters)

## Response Schemas

**Returned by:** List missions, Create mission, Get mission, Update mission

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `description` | string |
| `execution_mode` | enum: external, managed |
| `instructions` | string |
| `metadata` | object |
| `mission_id` | uuid |
| `model` | string |
| `name` | string |
| `updated_at` | date-time |

**Returned by:** List recent events, List events, Log event, Get event details

| Field | Type |
|-------|------|
| `agent_id` | string |
| `event_id` | string |
| `idempotency_key` | string |
| `payload` | object |
| `run_id` | string |
| `step_id` | string |
| `summary` | string |
| `timestamp` | date-time |
| `type` | enum: status_change, step_started, step_completed, step_failed, tool_call, tool_result, message, error, custom |

**Returned by:** List recent runs, List runs for mission, Start a run, Get run details, Update run, Cancel run, Pause run, Resume run

| Field | Type |
|-------|------|
| `error` | string |
| `finished_at` | date-time |
| `input` | object |
| `metadata` | object |
| `mission_id` | uuid |
| `result_payload` | object |
| `result_summary` | string |
| `run_id` | uuid |
| `started_at` | date-time |
| `status` | enum: pending, running, paused, succeeded, failed, cancelled |
| `updated_at` | date-time |

**Returned by:** Get plan, Create initial plan, Add step(s) to plan, Get step details, Update step status

| Field | Type |
|-------|------|
| `completed_at` | date-time |
| `description` | string |
| `metadata` | object |
| `parent_step_id` | string |
| `run_id` | uuid |
| `sequence` | integer |
| `started_at` | date-time |
| `status` | enum: pending, in_progress, completed, skipped, failed |
| `step_id` | string |

**Returned by:** List linked Telnyx agents, Link Telnyx agent to run

| Field | Type |
|-------|------|
| `created_at` | date-time |
| `run_id` | string |
| `telnyx_agent_id` | string |

## Optional Parameters

### Create mission — `client.AI.Missions.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Description` | string |  |
| `Model` | string |  |
| `Instructions` | string |  |
| `ExecutionMode` | enum (external, managed) |  |
| `Metadata` | object |  |

### Update mission — `client.AI.Missions.UpdateMission()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Name` | string |  |
| `Description` | string |  |
| `Model` | string |  |
| `Instructions` | string |  |
| `ExecutionMode` | enum (external, managed) |  |
| `Metadata` | object |  |

### Start a run — `client.AI.Missions.Runs.New()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Input` | object |  |
| `Metadata` | object |  |

### Update run — `client.AI.Missions.Runs.Update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Status` | enum (pending, running, paused, succeeded, failed, ...) |  |
| `ResultSummary` | string |  |
| `ResultPayload` | object |  |
| `Error` | string |  |
| `Metadata` | object |  |

### Log event — `client.AI.Missions.Runs.Events.Log()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `StepId` | string (UUID) |  |
| `AgentId` | string (UUID) |  |
| `Payload` | object |  |
| `IdempotencyKey` | string | Prevents duplicate events on retry |

### Update step status — `client.AI.Missions.Runs.Plan.UpdateStep()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `Status` | enum (pending, in_progress, completed, skipped, failed) |  |
| `Metadata` | object |  |
