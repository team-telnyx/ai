---
name: telnyx-contact-center
description: >-
  Reference material for the contact-center-developer agent. Contains
  architecture diagrams, webhook server code examples, friction points
  with workarounds, troubleshooting with error codes, and a validation
  script for inbound contact center infrastructure using Telnyx Call
  Control API, SIP trunking, WebRTC, and IVR.
user_invocable: false
metadata:
  author: telnyx
  product: voice
  blueprint-id: AIF-273
  version: "1.0"
---

# Telnyx Contact Center

Reference material for the **contact-center-developer** agent. This skill is not user-invocable; it provides supporting documentation, code examples, and validation tooling for building inbound contact centers on Telnyx.

The contact-center-developer agent guides users through a 10-step interactive flow (Steps 0–9) to build a working MVP contact center with IVR, agent routing (mobile/SIP/WebRTC), call recording, voicemail, and metrics.

## Documents

| Document | Description |
|----------|-------------|
| `references/architecture.md` | Service architecture, ASCII flow diagram, Mermaid sequence diagram, dependency graph |
| `references/friction-log.md` | 9 known friction points (FRIC-001 through FRIC-009) with symptoms, resolutions, and timestamps |
| `references/troubleshooting.md` | SIP/Q.850 error codes, webhook event reference, diagnostic decision tree, retry logic, production checklist |
| `references/code-examples.md` | Complete webhook server implementations in 6 languages (Node.js, Python, Ruby, PHP, Java, Go) |
| `scripts/validate-setup.sh` | Infrastructure validation script — 8 checks for API key, connectivity, phone numbers, CCA, OVP, credentials |

## Services Used

| Service | API | Purpose |
|---------|-----|---------|
| Call Control | `/v2/calls`, `/v2/call_control_applications` | Answer, gather, bridge, hangup, transfer |
| Phone Numbers | `/v2/phone_numbers` | Inbound DIDs for the contact center |
| SIP Credential Connections | `/v2/credential_connections` | SIP softphone agent endpoints |
| WebRTC | `/v2/credential_connections` (WebRTC type) | Browser-based agent endpoints |
| Outbound Voice Profiles | `/v2/outbound_voice_profiles` | Whitelisted destinations for outbound agent dialing |
| Call Recording | `/v2/calls/{id}/actions/record_start` | Call recording with transcription |
| Call Analysis (Gather) | `/v2/calls/{id}/actions/gather_using_audio` | IVR DTMF collection |
| Conferencing | `/v2/conferences` | Multi-party bridging (if needed) |

## Cost Estimate

| Resource | Cost |
|----------|-----|
| Phone number (local or toll-free) | ~$1.00/month |
| Outbound calls (agent dial) | ~$0.01/minute |
| Call recording storage | ~$0.0025/minute |
| WebRTC session | ~$0.005/minute |
| Inbound calls | ~$0.0035/minute (varies by rate deck) |

**Typical MVP monthly cost** (1 number, 100 minutes/day, 1 agent): ~$25–35/month
