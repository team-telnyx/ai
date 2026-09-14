# Friction Log — Telnyx Contact Center (AIF-273)

Known friction points discovered during contact center MVP validation. Each entry includes the step where it occurs, the symptom, the API involved, and the resolution.

---

## FRIC-001 — Agent Hears IVR Instead of Ringing

| Field | Value |
|-------|-------|
| **Title** | Agent hears IVR greeting instead of ringing when called |
| **Step** | Step 6 — Webhook Server (call.initiated handler) |
| **Symptom** | When the agent is dialed, they hear the IVR greeting audio instead of a standard ringing tone. The `call.initiated` webhook fires for both inbound (customer calling in) and outbound (agent being dialed) legs. If the webhook server does not check the `direction` field, it answers the agent leg and plays IVR. |
| **API** | `POST /v2/calls` (dial agent) → webhook `call.initiated` |
| **HTTP Status** | N/A (logic error, not API failure) |
| **Resolution** | In the `call.initiated` handler, check `event.data.direction`. If `direction === 'outgoing'`, return `200 OK` immediately without answering or playing IVR. Only process `direction === 'incoming'` calls with IVR logic. |
| **Timestamp** | 2025-01-15 (validation session) |

---

## FRIC-002 — Agent Never Rings, No Error (D13)

| Field | Value |
|-------|-------|
| **Title** | Outbound call to agent silently fails with D13 |
| **Step** | Step 5 — Agent Routing (Path A: Mobile Numbers) |
| **Symptom** | `POST /v2/calls` to dial the agent returns 200, but the agent phone never rings. No error is shown to the caller. CDR shows `D13` disconnect code. |
| **API** | `POST /v2/calls` (dial agent) |
| **HTTP Status** | 200 (API accepts the call; failure happens downstream) |
| **Resolution** | Add the agent's country code to the Outbound Voice Profile's `whitelisted_destinations` array via `PATCH /v2/outbound_voice_profiles/{id}`. Extract the country code from each agent phone number and verify it exists in the OVP whitelist before attempting to dial. |
| **Timestamp** | 2025-01-15 (validation session) |

---

## FRIC-003 — All Outbound Calls Fail (D38)

| Field | Value |
|-------|-------|
| **Title** | Every outbound call fails with D38 — no OVP assigned |
| **Step** | Step 2 — Call Control Application setup |
| **Symptom** | All outbound calls (dialing agents) fail with `D38` disconnect code. Inbound calls work fine. |
| **API** | `POST /v2/calls` (any outbound call) |
| **HTTP Status** | 200 (initial acceptance, failure downstream) |
| **Resolution** | Assign an Outbound Voice Profile to the Call Control Application via `PATCH /v2/call_control_applications/{id}` with `outbound_voice_profile_id`. If no OVP exists, create one first with `POST /v2/outbound_voice_profiles`. |
| **Timestamp** | 2025-01-15 (validation session) |

---

## FRIC-004 — Bridge Fails Intermittently (Race Condition)

| Field | Value |
|-------|-------|
| **Title** | Bridge action fails intermittently due to state race condition |
| **Step** | Step 6 — Webhook Server (call.bridged / call.answered handler) |
| **Symptom** | `POST /v2/calls/{id}/actions/bridge` returns 422 or fails silently. This happens when the webhook server tries to bridge before the agent leg's state is fully built on the Telnyx side. |
| **API** | `POST /v2/calls/{id}/actions/bridge` |
| **HTTP Status** | 422 Unprocessable Entity (intermittent) |
| **Resolution** | Build agent state (store the agent call control ID, mark as `ringing`/`answered`) in the webhook server BEFORE calling `POST /v2/calls` to dial the agent. When `call.answered` fires for the agent leg, verify the stored state exists and is valid before issuing the bridge command. Implement a short retry (max 2 retries, 500ms apart) if bridge returns 422. |
| **Timestamp** | 2025-01-15 (validation session) |

---

## FRIC-005 — playback_start Returns "audio_url invalid"

| Field | Value |
|-------|-------|
| **Title** | `playback_start` rejects `say:` TTS prefix |
| **Step** | Step 8 — Hold Music |
| **Symptom** | `POST /v2/calls/{id}/actions/playback_start` with `audio_url: "say:Hello"` returns 422 with message "audio_url parameter is invalid". |
| **API** | `POST /v2/calls/{id}/actions/playback_start` |
| **HTTP Status** | 422 Unprocessable Entity |
| **Resolution** | `playback_start` only accepts HTTPS URLs to MP3 or WAV files. Never use the `say:` TTS prefix with `playback_start`. For TTS, use `gather_using_audio` or `speak` actions instead. For hold music, provide a direct HTTPS URL to an MP3 file. If no hold music URL is available, the caller hears silence after the announcement (acceptable for MVP). |
| **Timestamp** | 2025-01-15 (validation session) |

---

## FRIC-006 — call.recording.saved Fires After call.hangup

| Field | Value |
|-------|-------|
| **Title** | Recording event arrives after hangup, metrics update missed |
| **Step** | Step 6 — Webhook Server (call.hangup and call.recording.saved handlers) |
| **Symptom** | The `call.recording.saved` webhook fires after `call.hangup`. If the webhook server closes the call record on `call.hangup`, the recording URL is never stored. Metrics show the call but with no recording link. |
| **API** | Webhook events: `call.hangup`, `call.recording.saved` |
| **HTTP Status** | N/A (event ordering issue) |
| **Resolution** | Do not close or finalize the call record on `call.hangup`. Instead, mark it as `hungup` and keep it in memory (or database) for a grace period (60 seconds). When `call.recording.saved` arrives, retroactively update the stored metrics with the recording URL. Use a TTL or cleanup job to expire records that never receive a recording event. |
| **Timestamp** | 2025-01-15 (validation session) |

---

## FRIC-007 — Customer Disconnected on Agent No-Answer

| Field | Value |
|-------|-------|
| **Title** | Customer is disconnected when agent does not answer |
| **Step** | Step 9 — Testing (test case: agent no-answer) |
| **Symptom** | When the agent does not answer, the customer's call is disconnected instead of being offered voicemail or returned to queue. |
| **API** | `POST /v2/calls/{id}/actions/hangup` (agent leg timeout) |
| **HTTP Status** | N/A (logic error) |
| **Resolution** | Before hanging up the customer leg on agent no-answer, check if the customer's call state is still `queued` or `waiting`. If so, offer voicemail: play a "No agent available, press 1 to leave a voicemail" gather. Only hang up the customer if they explicitly decline or if the queue timeout is exceeded. Always cancel the agent leg with `POST /v2/calls/{agent_call_id}/actions/hangup` separately from the customer leg. |
| **Timestamp** | 2025-01-15 (validation session) |

---

## FRIC-008 — Agent Keeps Ringing After Customer Hangs Up

| Field | Value |
|-------|-------|
| **Title** | Agent phone keeps ringing after customer hangs up |
| **Step** | Step 6 — Webhook Server (call.hangup handler) |
| **Symptom** | Customer hangs up during IVR or while waiting in queue. The agent's phone keeps ringing because the agent leg was never cancelled. |
| **API** | `POST /v2/calls/{agent_call_id}/actions/hangup` |
| **HTTP Status** | N/A (missing API call) |
| **Resolution** | In the `call.hangup` handler, check if an agent leg exists (stored in call state). If the agent is still ringing (not yet answered), send `POST /v2/calls/{agent_call_id}/actions/hangup` to cancel the agent leg. Clean up all stored call state for both legs. |
| **Timestamp** | 2025-01-15 (validation session) |

---

## FRIC-009 — Webhook Event Order Not Guaranteed

| Field | Value |
|-------|-------|
| **Title** | Webhook events arrive out of order |
| **Step** | Step 6 — Webhook Server (all handlers) |
| **Symptom** | Webhook events for the same call do not always arrive in the expected order. For example, `call.answered` may arrive before `call.initiated`, or `call.recording.saved` before `call.hangup`. Logic that depends on event arrival order breaks. |
| **API** | All webhook events |
| **HTTP Status** | N/A (delivery order issue) |
| **Resolution** | Never rely on event arrival order for state transitions. Use the `direction` field in `call.initiated` to distinguish inbound vs outbound legs. Use `event_type` to determine the current state, and store a state machine per call control ID. Implement idempotent handlers — processing the same event twice should not cause side effects. Use the `occurred_at` timestamp for ordering in metrics, not the arrival time. |
| **Timestamp** | 2025-01-15 (validation session) |
