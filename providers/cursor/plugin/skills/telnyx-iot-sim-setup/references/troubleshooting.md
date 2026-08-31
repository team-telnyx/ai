# IoT SIM Setup — Troubleshooting Guide

## Common Issues

### 1. SIM Not Registering on Network

**Symptoms:** `live_data_session` shows `disconnected` or `unknown` after enable. No `ipv4` assigned. Device shows "No Service" or fast-flashing LED.

**Possible causes:**
- **APN misconfiguration** — Must be `data00.telnyx` (not `telnyx`, `internet`, or `apn.telnyx.com`).
- **Data roaming disabled** — Telnyx uses multi-IMSI roaming. Even domestic deployments require data roaming enabled on the device.
- **SIM not in a group** — SIMs must be assigned to a SIM card group before they can be enabled. Check `sim_card_group_id` on the SIM object.
- **SIM still transitioning** — Enable/standby actions are asynchronous. Poll `GET /sim_cards/{id}` and check `data.status.value` until it stabilizes.
- **Carrier network issue** — Check `https://status.telnyx.com` for active wireless incidents. If there's an active IMSI1 Americas incident, the workaround is to manually pin IMSI5 on the device.

**Triage:**
```bash
# Check SIM status
curl -X GET -H "Authorization: Bearer ${TELNYX_API_KEY}" --globoff \
  "https://api.telnyx.com/v2/sim_cards/{sim_id}"

# Check connectivity logs
curl -X GET -H "Authorization: Bearer ${TELNYX_API_KEY}" --globoff \
  "https://api.telnyx.com/v2/sim_cards/{sim_id}/wireless_connectivity_logs"

# Check for active incidents
curl -s "https://status.telnyx.com/api/v2/incidents.json" | python3 -c "import json,sys; [print(i['name'],i['status']) for i in json.load(sys.stdin)['incidents'] if i['status'] != 'resolved']"
```

---

### 2. SIM Registers but No Data Session

**Symptoms:** `live_data_session` is `disconnected`. Connectivity logs show `log_type: registration` entries but no `log_type: data` entries.

**Possible causes:**
- **APN typo** — Most common cause. Triple-check: `data00.telnyx` (with two zeros).
- **PDP context failure** — The device is failing to establish a data session. Check if the device firmware supports the configured PDP type (IPv4 vs IPv6).
- **Data limit reached** — Check `data_limit` on the SIM group. If consumed data equals the limit, new data sessions are blocked.
- **SIM disabled** — Check `data.status.value` — if `disabled`, re-enable with `POST /sim_cards/{id}/actions/enable`.

**Triage:**
```bash
# Check data limit on group
curl -X GET -H "Authorization: Bearer ${TELNYX_API_KEY}" --globoff \
  "https://api.telnyx.com/v2/sim_card_groups/{group_id}"

# Check current billing period consumed data
curl -X GET -H "Authorization: Bearer ${TELNYX_API_KEY}" --globoff \
  "https://api.telnyx.com/v2/sim_cards/{sim_id}"
# Look at: data.current_billing_period_consumed_data
```

---

### 3. Intermittent Connectivity (Attach Loop)

**Symptoms:** SIM attaches to carrier, then drops. Re-attaches after power cycle but fails again hours later. Pattern is non-deterministic.

**Possible causes:**
- **Active carrier incident** — Check status page for roaming partner issues.
- **IMSI profile mismatch** — If the device is in a region where IMSI1 has known issues, pinning to IMSI5 (US) or IMSI2 (EU) may stabilize.
- **Device firmware bug** — Some LTE modems have known attach-loop bugs. Check for firmware updates from the device manufacturer.
- **Carrier rejection** — The carrier may be rejecting the SIM due to IMEI pairing issues or network-side policies.

**Triage:**
```bash
# Pull connectivity logs and look for pattern
curl -X GET -H "Authorization: Bearer ${TELNYX_API_KEY}" --globoff \
  "https://api.telnyx.com/v2/sim_cards/{sim_id}/wireless_connectivity_logs"

# Check current carrier (mobile_country_code / mobile_network_code)
curl -X GET -H "Authorization: Bearer ${TELNYX_API_KEY}" --globoff \
  "https://api.telnyx.com/v2/sim_cards/{sim_id}"
# Look at: data.current_mcc, data.current_mnc (SIM object fields)
# In connectivity logs, the fields are mobile_country_code and mobile_network_code
```

---

### 4. eSIM Installation Failure

**Symptoms:** eSIM purchased successfully but `esim_installation_status` shows `disabled` or activation code endpoint returns error.

**Possible causes:**
- **eSIM already installed** — The activation code endpoint returns an error if the eSIM has already been installed on a device.
- **Incompatible device** — The device must support eSIM (LPA - Local Profile Assistant).
- **SM-DP+ server unreachable** — The eSIM provisioning server may be temporarily unreachable.

**Triage:**
```bash
# Get activation code
curl -X GET -H "Authorization: Bearer ${TELNYX_API_KEY}" --globoff \
  "https://api.telnyx.com/v2/sim_cards/{sim_id}/activation_code"

# Check installation status
curl -X GET -H "Authorization: Bearer ${TELNYX_API_KEY}" --globoff \
  "https://api.telnyx.com/v2/sim_cards/{sim_id}"
# Look at: data.esim_installation_status
```

---

### 5. Wireless Blocklist Not Taking Effect

**Symptoms:** Blocklist assigned to group but SIMs still connecting to blocked carriers.

**Possible causes:**
- **Async operation still in progress** — Blocklist assignment is asynchronous. Check the SIM card group action status.
- **Blocklist applied at group level only** — Individual SIMs must be in the group for the blocklist to apply.
- **Cached carrier selection** — The device may cache the last successful carrier. Power-cycle the device after blocklist assignment.

**Triage:**
```bash
# Check blocklist action status
curl -X GET -H "Authorization: Bearer ${TELNYX_API_KEY}" --globoff \
  "https://api.telnyx.com/v2/sim_card_group_actions?filter[sim_card_group_id]={group_id}"

# Verify SIM is in the group
curl -X GET -H "Authorization: Bearer ${TELNYX_API_KEY}" --globoff \
  "https://api.telnyx.com/v2/sim_cards/{sim_id}"
# Look at: data.sim_card_group_id
```

---

## Connectivity Log Field Reference

| Field | Description |
|---|---|
| `log_type` | `registration` (SIM attach/detach) or `data` (data session) |
| `state` | Connection state (e.g., `connected`, `disconnected`) |
| `apn` | APN used for the session (should be `data00.telnyx`) |
| `ipv4` | IPv4 address assigned (empty if no data session) |
| `ipv6` | IPv6 address assigned (if applicable) |
| `imei` | Device IMEI (confirms which device is using the SIM) |
| `imsi` | IMSI profile in use (identifies which carrier profile) |
| `mobile_country_code` | Mobile Country Code (e.g., `310` = US, `234` = UK) |
| `mobile_network_code` | Mobile Network Code (identifies specific carrier) |
| `radio_access_technology` | `LTE`, `3G`, `2G`, etc. |
| `start_time` / `stop_time` | Session start/end timestamps |
| `last_seen` | Last activity timestamp |

## Status Page Quick Check

```bash
# Active (non-resolved) incidents
curl -s "https://status.telnyx.com/api/v2/incidents.json" | \
  python3 -c "import json,sys; [print(f'[{i[\"status\"]}] {i[\"name\"]}') for i in json.load(sys.stdin)['incidents'] if i['status'] != 'resolved']"
```
