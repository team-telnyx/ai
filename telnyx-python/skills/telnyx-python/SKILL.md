---
name: telnyx-python
description: >-
  Broad Telnyx Python SDK entrypoint. Use when starting a Python integration and
  you need the main setup pattern plus a map of the available Telnyx product
  skills.
metadata:
  author: telnyx
  product: telnyx
  language: python
---

# Telnyx Python SDK

Use this wrapper when you want broad Telnyx Python SDK guidance before narrowing to a specific product area.

## Installation

```bash
pip install telnyx
```

## Setup

```python
import os
from telnyx import Telnyx

client = Telnyx(api_key=os.environ.get("TELNYX_API_KEY"))
```

## Choose The Right Product Skill

- Messaging: `telnyx-messaging-python`, `telnyx-messaging-profiles-python`, `telnyx-messaging-hosted-python`, `telnyx-10dlc-python`
- Voice: `telnyx-voice-python`, `telnyx-voice-media-python`, `telnyx-voice-gather-python`, `telnyx-voice-streaming-python`, `telnyx-voice-conferencing-python`, `telnyx-voice-advanced-python`, `telnyx-texml-python`, `telnyx-sip-python`, `telnyx-sip-integrations-python`, `telnyx-webrtc-python`
- Numbers: `telnyx-numbers-python`, `telnyx-numbers-config-python`, `telnyx-numbers-compliance-python`, `telnyx-numbers-services-python`, `telnyx-porting-in-python`, `telnyx-porting-out-python`, `telnyx-verify-python`
- AI: `telnyx-ai-assistants-python`, `telnyx-ai-inference-python`, `telnyx-missions-python`
- Account and platform services: `telnyx-account-python`, `telnyx-account-access-python`, `telnyx-account-management-python`, `telnyx-account-notifications-python`, `telnyx-account-reports-python`, `telnyx-storage-python`, `telnyx-video-python`, `telnyx-fax-python`, `telnyx-networking-python`, `telnyx-iot-python`, `telnyx-oauth-python`, `telnyx-seti-python`

## Usage Guidance

- Use this wrapper as the discovery entrypoint.
- For production code, install and use the specific product skill that matches your task.
- If you already know the exact product area, install that specific skill directly instead of this wrapper.
