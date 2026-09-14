# Troubleshooting Reference — First Outbound Call

Expanded error reference for every failure mode a new developer might encounter.

## SIP Error Codes

### 4xx — Client Errors

| SIP Code | Name | Common Cause on Telnyx | Fix |
|----------|------|------------------------|-----|
| **400** | Bad Request | Malformed SIP INVITE or invalid headers | Check SIP client configuration |
| **401** | Unauthorized | Invalid API key or wrong credential connection auth | Verify `TELNYX_API_KEY` is correct |
| **403** | Forbidden | Destination country not in OVP `whitelisted_destinations`, or IP not whitelisted on FQDN connection | Add destination country to OVP whitelist |
| **404** | Not Found | Destination number doesn't exist or can't be routed | Verify destination is in E.164 format |
| **407** | Proxy Auth Required | SIP registration auth challenge — normal | Client should respond with credentials |
| **478** | Unresolvable Destination | Wrong connection type or destination can't be resolved | Use Call Control Application, not credential connection |
| **480** | Temporarily Unavailable | Destination phone is off, out of range, or busy | Not a Telnyx issue — try again later |
| **486** | Busy Here | Destination is on another call without call waiting | Not a Telnyx issue — try again later |
| **487** | Request Terminated | Call cancelled before answer (caller hung up or API hangup) | Normal if you cancelled — check for premature hangup commands |

### 5xx — Server Errors

| SIP Code | Name | Common Cause on Telnyx | Fix |
|----------|------|------------------------|-----|
| **500** | Server Internal Error | **The big one.** Usually means routing failed — no OVP linked, or internal routing issue | Create an OVP and link it to your app (Step 2). If OVP exists and is linked, contact support |
| **502** | Bad Gateway | Upstream carrier returned an error | Try again — destination carrier may be having issues |
| **503** | Service Unavailable | Telnyx infrastructure issue or carrier overload | Wait 30s and retry. Check status.telnyx.com |

## API Error Codes

| Error Code | Message | Cause | Fix |
|-----------|---------|-------|-----|
| **40001** | `"Unauthorized"` | Invalid or missing API key | Check `TELNYX_API_KEY` |
| **40003** | `"connection_id is invalid"` | Call Control App ID doesn't exist or belongs to different account | Verify with `GET /v2/call_control_applications` |
| **42201** | `"Unprocessable Entity"` | Request body malformed — missing required fields | Check `connection_id`, `to`, and `from` are present and E.164 format |
| **42901** | `"Too Many Requests"` | Rate limited | Default limit ~1 req/sec for call creation |
| **10027** | `"Did you first search for the number(s)?"` | Number taken between search and purchase | Re-run search and try different number |
| **10010** | `"...does not have a valid LRN"` / D50 | Destination is a non-dialable US/CA number (555 test ranges, unallocated NPAs) | Use a real, dialable number |

## Webhook Events Reference

### Success Flow

| Event | When | Key Fields |
|-------|------|------------|
| `call.initiated` | Call leg created, SIP INVITE sent | `call_control_id`, `call_leg_id`, `call_session_id`, `direction: "outgoing"`, `state: "parked"` |
| `call.answered` | Recipient picked up | `call_control_id`, `state: "bridging"` or `"active"` |
| `call.hangup` | Call ended normally | `call_control_id`, `hangup_cause`, `hangup_source`, `sip_hangup_cause` |

### Failure Flow

| Event | When | Key Fields |
|-------|------|------------|
| `call.initiated` | Call leg created (even if it will fail) | Same as success — you can't tell from this event |
| `call.hangup` | Call failed during routing | `hangup_cause: "originator_cancel"` or `"normal_clearing"`, `sip_hangup_cause: "500"`, `telnyx_error: null` |

### Hangup Causes

| `hangup_cause` | `sip_hangup_cause` | What It Means |
|----------------|-------------------|---------------|
| `normal_clearing` | `200` | Normal call end — someone hung up |
| `originator_cancel` | `487` | Caller cancelled before answer |
| `user_busy` | `486` | Destination busy |
| `no_answer` | `480` | Ring timeout — nobody answered |
| `call_rejected` | `403` | Destination or routing rejected the call |
| `unallocated_number` | `404` | Number doesn't exist |
| `normal_temporary_failure` | `500` | **Usually the missing OVP error** |
| `recovery_on_timer_expire` | `408` | Call setup timed out |
| `interworking` | `500` | Generic interop failure — check OVP and connection |

## CDR Interpretation Guide

CDRs are in Mission Control → Reporting → Call Detail Records.

### Key Fields

| Field | What It Tells You |
|-------|-------------------|
| **Direction** | `outbound` = you initiated, `inbound` = someone called you |
| **Status** | `completed` = connected, `failed` = never connected, `busy` = destination busy, `no-answer` = rang out |
| **Duration** | `0` = never connected. `> 0` = audio was exchanged |
| **SIP Response Code** | `180` = ringing, `200` = answered, `4xx/5xx` = error |
| **From** | Your Telnyx number |
| **To** | Destination number |
| **Connection** | Which connection was used — verify it's the one with your OVP |
| **Hangup Cause** | Why the call ended |
| **Cost** | What you were charged ($0 if failed = no charge) |

### CDR Debugging Scenarios

**Call shows `failed`, duration 0:**
- SIP 500 → Missing OVP or number not assigned
- SIP 403 → Country not in OVP whitelist
- SIP 480/486 → Destination-side problem

**Call shows `completed` but duration 0:**
- Call answered then immediately hung up
- Check webhook handler for premature hangup commands

**Call shows `completed`, duration > 0, but no audio:**
- Media/RTP issue, not signaling
- Firewall blocking UDP ports 20000-65535
- NAT traversal issue — enable STUN/TURN
- See One-Way Audio blueprint

**No CDR exists:**
- Call never made it to Telnyx's network
- Verify API key and connection ID
- Check that API returned a `call_control_id`

## "Why Is My Call Hanging Up Immediately?"

```
Call hangs up immediately after call.initiated
│
├── Did you get a call_control_id back from the API?
│   ├── NO → API error. Check the response body for error details.
│   └── YES ↓
│
├── Is there an OVP linked to the connection?
│   ├── NO → That's your problem. Create and link an OVP.
│   └── YES ↓
│
├── Is the phone number assigned to the Call Control Application?
│   ├── NO → Assign it. Step 4 in SKILL.md.
│   └── YES ↓
│
├── Is the destination country in the OVP whitelist?
│   ├── NO → Add it to whitelisted_destinations.
│   └── YES ↓
│
├── Is the `from` number in your account?
│   ├── NO → You can only use numbers you own.
│   └── YES ↓
│
├── Is there sufficient balance?
│   ├── NO → Add funds.
│   └── YES ↓
│
└── Contact Telnyx support with the call_control_id.
```

## Useful Diagnostic Commands

```bash
# List all your Call Control Applications and OVP link status
# Note: the OVP link is nested under outbound.outbound_voice_profile_id.
# A top-level outbound_voice_profile_id field will look missing even when linked.
bash ${CLAUDE_PLUGIN_ROOT}/scripts/telnyx-curl.sh \
  "https://api.telnyx.com/v2/call_control_applications" | \
  jq '.data[] | {id, application_name, active, ovp: .outbound.outbound_voice_profile_id}'

# List all your OVPs
bash ${CLAUDE_PLUGIN_ROOT}/scripts/telnyx-curl.sh \
  "https://api.telnyx.com/v2/outbound_voice_profiles" | \
  jq '.data[] | {id, name, enabled, destinations: .whitelisted_destinations}'

# List all your phone numbers and their connections
bash ${CLAUDE_PLUGIN_ROOT}/scripts/telnyx-curl.sh \
  "https://api.telnyx.com/v2/phone_numbers" | \
  jq '.data[] | {phone_number, connection_id, connection_name, status}'

# Check your account balance
bash ${CLAUDE_PLUGIN_ROOT}/scripts/telnyx-curl.sh \
  "https://api.telnyx.com/v2/balance" | jq .
```

## Production Checklist

- [ ] API key has Voice API permissions
- [ ] Call Control Application created with valid webhook URL
- [ ] Outbound Voice Profile created and enabled
- [ ] OVP linked to Call Control Application (verified via API)
- [ ] `whitelisted_destinations` includes all target countries
- [ ] Voice-enabled phone number purchased and active
- [ ] Phone number assigned to Call Control Application (verified via API)
- [ ] Webhook endpoint is publicly reachable and returns 200 within 3 seconds
- [ ] Webhook handler responds to `call.answered` (speak, hangup, or transfer)
- [ ] Account balance > $5
- [ ] Test call made and verified via CDR (status: completed, duration > 0)
