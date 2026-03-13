---
name: telnyx-curl
description: >-
  Broad Telnyx REST API entrypoint with curl examples. Use when starting a
  language-agnostic Telnyx integration and you need the auth pattern plus a map
  of the available product skills.
metadata:
  author: telnyx
  product: telnyx
  language: curl
---

# Telnyx REST API - curl

Use this wrapper when you want broad Telnyx REST API guidance before narrowing to a specific product area.

## Setup

```bash
export TELNYX_API_KEY=your_api_key
```

Use the header below in Telnyx REST requests:

```bash
curl -X GET "https://api.telnyx.com/v2/example" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

## Choose The Right Product Skill

- Messaging: `telnyx-messaging-curl`, `telnyx-messaging-profiles-curl`, `telnyx-messaging-hosted-curl`, `telnyx-10dlc-curl`
- Voice: `telnyx-voice-curl`, `telnyx-voice-media-curl`, `telnyx-voice-gather-curl`, `telnyx-voice-streaming-curl`, `telnyx-voice-conferencing-curl`, `telnyx-voice-advanced-curl`, `telnyx-texml-curl`, `telnyx-sip-curl`, `telnyx-sip-integrations-curl`, `telnyx-webrtc-curl`
- Numbers: `telnyx-numbers-curl`, `telnyx-numbers-config-curl`, `telnyx-numbers-compliance-curl`, `telnyx-numbers-services-curl`, `telnyx-porting-in-curl`, `telnyx-porting-out-curl`, `telnyx-verify-curl`
- AI: `telnyx-ai-assistants-curl`, `telnyx-ai-inference-curl`, `telnyx-missions-curl`
- Account and platform services: `telnyx-account-curl`, `telnyx-account-access-curl`, `telnyx-account-management-curl`, `telnyx-account-notifications-curl`, `telnyx-account-reports-curl`, `telnyx-storage-curl`, `telnyx-video-curl`, `telnyx-fax-curl`, `telnyx-networking-curl`, `telnyx-iot-curl`, `telnyx-oauth-curl`, `telnyx-seti-curl`

## Usage Guidance

- Use this wrapper as the discovery entrypoint.
- For production code, install and use the specific product skill that matches your task.
- If you already know the exact product area, install that specific skill directly instead of this wrapper.
