# Friction Log — IoT SIM Setup

Known friction points encountered during IoT SIM provisioning. Auto-updated by the `iot-sim-developer` agent when analytics opt-in is enabled.

---

### FRIC-1: APN confusion — "telnyx" vs "data00.telnyx"
- **Step:** Step 5 (Device Configuration)
- **Symptom:** Device registers on carrier network but no data session established. Connectivity logs show `log_type: registration` but no `log_type: data` entries.
- **API:** N/A (device-side configuration)
- **HTTP Status:** N/A
- **Resolution:** APN must be exactly `data00.telnyx` (with two zeros). Common incorrect values: `telnyx`, `internet`, `apn.telnyx.com`, `data.telnyx`.
- **Timestamp:** 2026-07-01T00:00:00Z

### FRIC-2: SIM enable fails without group assignment
- **Step:** Step 3 (Enable SIM)
- **Symptom:** `POST /sim_cards/{id}/actions/enable` returns 422 error. Error message does not clearly state that group assignment is required first.
- **API:** `POST /sim_cards/{id}/actions/enable`
- **HTTP Status:** 422
- **Resolution:** Assign SIM to a group first via `PATCH /sim_cards/{id}` with `sim_card_group_id`, then retry enable.
- **Timestamp:** 2026-07-01T00:00:00Z

### FRIC-3: Async action status unclear
- **Step:** Step 3 (Enable SIM)
- **Symptom:** Enable action returns success but SIM `status.value` remains `registered` for several seconds. No clear indication that the action is asynchronous and requires polling.
- **API:** `POST /sim_cards/{id}/actions/enable`
- **HTTP Status:** 200
- **Resolution:** Poll `GET /sim_cards/{id}` every 5 seconds until `status.value` transitions to `enabled`. Document the async nature in agent guidance.
- **Timestamp:** 2026-07-01T00:00:00Z

### FRIC-4: Connectivity logs pagination not documented
- **Step:** Step 6 (Verify Connectivity)
- **Symptom:** `GET /sim_cards/{id}/wireless_connectivity_logs` returns only 25 entries by default with no visible pagination cursor, making it hard to retrieve historical logs for troubleshooting.
- **API:** `GET /sim_cards/{id}/wireless_connectivity_logs`
- **HTTP Status:** 200
- **Resolution:** Use `page[number]` and `page[size]` query parameters. Maximum page size is 100.
- **Timestamp:** 2026-07-01T00:00:00Z

### FRIC-5: IMSI selection not exposed in portal
- **Step:** Step 5 (Device Configuration)
- **Symptom:** When IMSI1 has carrier issues in a region, the recommended workaround is to pin IMSI5 manually on the device. However, the Mission Control Portal does not show which IMSI profile is currently active or allow OTA IMSI switching from the UI.
- **API:** `GET /sim_cards/{id}` (returns `imsi` field but not labeled as IMSI1/2/5)
- **HTTP Status:** N/A
- **Resolution:** Parse the `imsi` field — `311210...` = IMSI1 (Telnyx US), `311210...` with different range = IMSI5. OTA updates can be triggered via `POST /ota_updates` but the portal doesn't surface this.
- **Timestamp:** 2026-07-01T00:00:00Z
