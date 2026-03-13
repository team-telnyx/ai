---
name: telnyx-javascript
description: >-
  Broad Telnyx JavaScript SDK entrypoint. Use when starting a Node.js or
  JavaScript integration and you need the main setup pattern plus a map of the
  available Telnyx product skills.
metadata:
  author: telnyx
  product: telnyx
  language: javascript
---

# Telnyx JavaScript SDK

Use this wrapper when you want broad Telnyx JavaScript SDK guidance before narrowing to a specific product area.

## Installation

```bash
npm install telnyx
```

## Setup

```javascript
import Telnyx from "telnyx";

const client = new Telnyx({ apiKey: process.env.TELNYX_API_KEY });
```

## Choose The Right Product Skill

- Messaging: `telnyx-messaging-javascript`, `telnyx-messaging-profiles-javascript`, `telnyx-messaging-hosted-javascript`, `telnyx-10dlc-javascript`
- Voice: `telnyx-voice-javascript`, `telnyx-voice-media-javascript`, `telnyx-voice-gather-javascript`, `telnyx-voice-streaming-javascript`, `telnyx-voice-conferencing-javascript`, `telnyx-voice-advanced-javascript`, `telnyx-texml-javascript`, `telnyx-sip-javascript`, `telnyx-sip-integrations-javascript`, `telnyx-webrtc-javascript`
- Numbers: `telnyx-numbers-javascript`, `telnyx-numbers-config-javascript`, `telnyx-numbers-compliance-javascript`, `telnyx-numbers-services-javascript`, `telnyx-porting-in-javascript`, `telnyx-porting-out-javascript`, `telnyx-verify-javascript`
- AI: `telnyx-ai-assistants-javascript`, `telnyx-ai-inference-javascript`, `telnyx-missions-javascript`
- Account and platform services: `telnyx-account-javascript`, `telnyx-account-access-javascript`, `telnyx-account-management-javascript`, `telnyx-account-notifications-javascript`, `telnyx-account-reports-javascript`, `telnyx-storage-javascript`, `telnyx-video-javascript`, `telnyx-fax-javascript`, `telnyx-networking-javascript`, `telnyx-iot-javascript`, `telnyx-oauth-javascript`, `telnyx-seti-javascript`

## Usage Guidance

- Use this wrapper as the discovery entrypoint.
- For production code, install and use the specific product skill that matches your task.
- If you already know the exact product area, install that specific skill directly instead of this wrapper.
