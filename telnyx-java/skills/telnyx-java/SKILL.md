---
name: telnyx-java
description: >-
  Broad Telnyx Java SDK entrypoint. Use when starting a Java integration and
  you need the main setup pattern plus a map of the available Telnyx product
  skills.
metadata:
  author: telnyx
  product: telnyx
  language: java
---

# Telnyx Java SDK

Use this wrapper when you want broad Telnyx Java SDK guidance before narrowing to a specific product area.

## Installation

Add the Telnyx Java SDK to your build.

## Setup

```java
import com.telnyx.sdk.TelnyxClient;

TelnyxClient client = new TelnyxClient(System.getenv("TELNYX_API_KEY"));
```

## Choose The Right Product Skill

- Messaging: `telnyx-messaging-java`, `telnyx-messaging-profiles-java`, `telnyx-messaging-hosted-java`, `telnyx-10dlc-java`
- Voice: `telnyx-voice-java`, `telnyx-voice-media-java`, `telnyx-voice-gather-java`, `telnyx-voice-streaming-java`, `telnyx-voice-conferencing-java`, `telnyx-voice-advanced-java`, `telnyx-texml-java`, `telnyx-sip-java`, `telnyx-sip-integrations-java`, `telnyx-webrtc-java`
- Numbers: `telnyx-numbers-java`, `telnyx-numbers-config-java`, `telnyx-numbers-compliance-java`, `telnyx-numbers-services-java`, `telnyx-porting-in-java`, `telnyx-porting-out-java`, `telnyx-verify-java`
- AI: `telnyx-ai-assistants-java`, `telnyx-ai-inference-java`, `telnyx-missions-java`
- Account and platform services: `telnyx-account-java`, `telnyx-account-access-java`, `telnyx-account-management-java`, `telnyx-account-notifications-java`, `telnyx-account-reports-java`, `telnyx-storage-java`, `telnyx-video-java`, `telnyx-fax-java`, `telnyx-networking-java`, `telnyx-iot-java`, `telnyx-oauth-java`, `telnyx-seti-java`

## Usage Guidance

- Use this wrapper as the discovery entrypoint.
- For production code, install and use the specific product skill that matches your task.
- If you already know the exact product area, install that specific skill directly instead of this wrapper.
