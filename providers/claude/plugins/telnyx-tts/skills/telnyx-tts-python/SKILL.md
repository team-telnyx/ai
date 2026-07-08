---
name: telnyx-tts-python
description: >-
  Generate speech from text using Telnyx and third-party TTS providers (AWS,
  Azure, ElevenLabs, MiniMax, Resemble, Rime, xAI). Returns base64-encoded
  audio or a binary stream. Also lists available voices per provider.
metadata:
  author: telnyx
  product: tts
  language: python
  generated_by: telnyx-ext-skills-generator
  profile: northstar-v2
---

# Telnyx Text-to-Speech - Python

## Installation

```bash
pip install telnyx
```

## Setup

```python
import os
from telnyx import Telnyx

client = Telnyx(
    api_key=os.environ.get("TELNYX_API_KEY"),
)
```

All examples below assume `client` is already initialized as shown above.

## Error Handling

All API calls can fail with network errors, rate limits (429), validation errors (422),
or authentication errors (401). Always handle errors in production code:

```python
import telnyx

try:
    response = client.text_to_speech.generate(text="Hello world")
except telnyx.APIConnectionError:
    print("Network error — check connectivity and retry")
except telnyx.RateLimitError:
    import time
    time.sleep(1)
except telnyx.APIStatusError as e:
    print(f"API error {e.status_code}: {e.message}")
```

Common error codes: `401` invalid API key, `403` insufficient permissions,
`404` resource not found, `422` validation error, `429` rate limited.

## Core Tasks

### Generate speech from text

Generate synthesized speech audio from text input. Returns audio as base64-encoded
JSON (`base64_output`) or a binary audio stream (`binary_output`).

`POST /text-to-speech/speech`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | Yes | The text to synthesize. |
| `provider` | enum | No | TTS provider: `telnyx`, `aws`, `azure`, `elevenlabs`, `minimax`, `resemble`, `rime`. Default: `telnyx`. |
| `voice` | string | No | Voice ID to use (e.g., `en-US-Standard-A` for AWS). |
| `output_type` | enum | No | `binary_output` or `base64_output`. Default: `binary_output`. |
| `text_type` | enum | No | `text` or `ssml`. Default: `text`. |
| `language` | string | No | Language code (e.g., `en-US`). |
| `voice_settings` | object | No | Advanced voice settings (speed, pitch, volume). |
| `telnyx` | object | No | Telnyx-specific provider options. |
| `aws` | object | No | AWS-specific provider options. |
| `azure` | object | No | Azure-specific provider options. |
| `elevenlabs` | object | No | ElevenLabs-specific provider options. |
| `minimax` | object | No | MiniMax-specific provider options. |
| `resemble` | object | No | Resemble-specific provider options. |
| `rime` | object | No | Rime-specific provider options. |
| `disable_cache` | boolean | No | Disable response caching. |

```python
# Default Telnyx provider
response = client.text_to_speech.generate(
    text="Hello from Telnyx!",
)
print(response.base64_audio)

# AWS provider with specific voice
response = client.text_to_speech.generate(
    text="Hello from Telnyx!",
    provider="aws",
    voice="en-US-Standard-A",
    output_type="base64_output",
)
print(response.base64_audio)

# SSML input
response = client.text_to_speech.generate(
    text="<speak>Hello <break time='1s'/> world</speak>",
    text_type="ssml",
)
print(response.base64_audio)

# ElevenLabs provider
response = client.text_to_speech.generate(
    text="Hello from Telnyx!",
    provider="elevenlabs",
    voice="21m00Tcm4TlvDq8ikWAM",
    output_type="base64_output",
)
print(response.base64_audio)
```

Primary response fields:
- `response.base64_audio` — Base64-encoded audio data (when `output_type` is `base64_output`)
- Binary stream (when `output_type` is `binary_output`)

### List available voices

Retrieve a list of available voices from one or all TTS providers.

`GET /text-to-speech/voices`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | enum | No | Filter by provider: `telnyx`, `aws`, `azure`, `elevenlabs`, `minimax`, `resemble`, `rime`. |

```python
# List all voices across all providers
response = client.text_to_speech.list_voices()
for voice in response.voices:
    print(f"{voice['name']} — {voice['provider']} ({voice['language']})")

# List only AWS voices
response = client.text_to_speech.list_voices(provider="aws")
for voice in response.voices:
    print(f"{voice['name']} — {voice['language']}")
```

Primary response fields:
- `response.voices` — Array of voice objects with `name`, `provider`, `language`, `voice_id`

## CLI Usage

The Telnyx Agent CLI provides composite commands for TTS:

```bash
# Generate speech
telnyx-agent tts --text "Hello world" --json

# Generate with specific provider and voice
telnyx-agent tts --text "Hello world" --provider aws --voice en-US-Standard-A --json

# List available voices
telnyx-agent tts-voices --json

# Filter voices by provider
telnyx-agent tts-voices --provider elevenlabs --json
```

## Important Notes

- **Audio format**: When `output_type` is `base64_output`, decode the base64 string to get the audio bytes. When `binary_output`, the response is a raw audio stream.
- **SSML**: Use `text_type: "ssml"` to send SSML markup for fine-grained control over pronunciation, pauses, and emphasis.
- **Provider-specific options**: Each provider (`aws`, `azure`, `elevenlabs`, etc.) has its own object for provider-specific configuration (e.g., AWS engine type, ElevenLabs stability).
- **Caching**: Responses are cached by default. Use `disable_cache: true` to bypass.
- **xAI**: The xAI provider is available via the CLI (`--provider xai`) and supports voice listing.
