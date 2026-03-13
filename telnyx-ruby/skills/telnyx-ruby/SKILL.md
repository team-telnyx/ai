---
name: telnyx-ruby
description: >-
  Broad Telnyx Ruby SDK entrypoint. Use when starting a Ruby integration and
  you need the main setup pattern plus a map of the available Telnyx product
  skills.
metadata:
  author: telnyx
  product: telnyx
  language: ruby
---

# Telnyx Ruby SDK

Use this wrapper when you want broad Telnyx Ruby SDK guidance before narrowing to a specific product area.

## Installation

```bash
gem install telnyx
```

## Setup

```ruby
require "telnyx"

client = Telnyx::Client.new(api_key: ENV["TELNYX_API_KEY"])
```

## Choose The Right Product Skill

- Messaging: `telnyx-messaging-ruby`, `telnyx-messaging-profiles-ruby`, `telnyx-messaging-hosted-ruby`, `telnyx-10dlc-ruby`
- Voice: `telnyx-voice-ruby`, `telnyx-voice-media-ruby`, `telnyx-voice-gather-ruby`, `telnyx-voice-streaming-ruby`, `telnyx-voice-conferencing-ruby`, `telnyx-voice-advanced-ruby`, `telnyx-texml-ruby`, `telnyx-sip-ruby`, `telnyx-sip-integrations-ruby`, `telnyx-webrtc-ruby`
- Numbers: `telnyx-numbers-ruby`, `telnyx-numbers-config-ruby`, `telnyx-numbers-compliance-ruby`, `telnyx-numbers-services-ruby`, `telnyx-porting-in-ruby`, `telnyx-porting-out-ruby`, `telnyx-verify-ruby`
- AI: `telnyx-ai-assistants-ruby`, `telnyx-ai-inference-ruby`, `telnyx-missions-ruby`
- Account and platform services: `telnyx-account-ruby`, `telnyx-account-access-ruby`, `telnyx-account-management-ruby`, `telnyx-account-notifications-ruby`, `telnyx-account-reports-ruby`, `telnyx-storage-ruby`, `telnyx-video-ruby`, `telnyx-fax-ruby`, `telnyx-networking-ruby`, `telnyx-iot-ruby`, `telnyx-oauth-ruby`, `telnyx-seti-ruby`

## Usage Guidance

- Use this wrapper as the discovery entrypoint.
- For production code, install and use the specific product skill that matches your task.
- If you already know the exact product area, install that specific skill directly instead of this wrapper.
