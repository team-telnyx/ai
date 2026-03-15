# Missions (JavaScript) — API Details

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

### Create mission — `client.ai.missions.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `description` | string |  |
| `model` | string |  |
| `instructions` | string |  |
| `executionMode` | enum (external, managed) |  |
| `metadata` | object |  |

### Update mission — `client.ai.missions.updateMission()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string |  |
| `description` | string |  |
| `model` | string |  |
| `instructions` | string |  |
| `executionMode` | enum (external, managed) |  |
| `metadata` | object |  |

### Start a run — `client.ai.missions.runs.create()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `input` | object |  |
| `metadata` | object |  |

### Update run — `client.ai.missions.runs.update()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | enum (pending, running, paused, succeeded, failed, ...) |  |
| `resultSummary` | string |  |
| `resultPayload` | object |  |
| `error` | string |  |
| `metadata` | object |  |

### Log event — `client.ai.missions.runs.events.log()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `stepId` | string (UUID) |  |
| `agentId` | string (UUID) |  |
| `payload` | object |  |
| `idempotencyKey` | string | Prevents duplicate events on retry |

### Update step status — `client.ai.missions.runs.plan.updateStep()`

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | enum (pending, in_progress, completed, skipped, failed) |  |
| `metadata` | object |  |
