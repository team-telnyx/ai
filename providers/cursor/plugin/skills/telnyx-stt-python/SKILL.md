---
name: telnyx-stt-python
description: >-
  Transcribe audio to text via the OpenAI-compatible transcription endpoint.
  Supports multiple models, languages, and keyword biasing. Also lists
  available speech-to-text providers and service types.
metadata:
  author: telnyx
  product: stt
  language: python
---

# Telnyx Speech-to-Text - Python

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
    response = client.ai.audio.transcribe(
        model="openai/whisper-large-v3-turbo",
        url="https://example.com/audio.mp3",
    )
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

### Transcribe speech to text

Transcribe an audio file to text. This endpoint is consistent with the
[OpenAI Transcription API](https://platform.openai.com/docs/api-reference/audio/createTranscription)
and may be used with the OpenAI JS or Python SDK.

`POST /ai/audio/transcriptions`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string (URL) | Yes | URL of the audio file to transcribe. |
| `model` | string | No | Model ID (e.g., `openai/whisper-large-v3-turbo`, `distil-whisper/distil-large-v2`). |
| `language` | string | No | Language code (e.g., `en`, `es`, `fr`). |
| `prompt` | string | No | Optional prompt to guide transcription style. |
| `response_format` | enum | No | `json`, `text`, `srt`, `verbose_json`, `vtt`. Default: `json`. |
| `temperature` | number | No | Sampling temperature (0-1). Default: 0. |
| `keywords` | array[string] | No | Keyword biasing — improve accuracy for domain-specific terms. |

```python
# Basic transcription
response = client.ai.audio.transcribe(
    url="https://example.com/audio.mp3",
)
print(response.text)

# With specific model and language
response = client.ai.audio.transcribe(
    url="https://example.com/audio.mp3",
    model="openai/whisper-large-v3-turbo",
    language="es",
)
print(response.text)

# With keyword biasing for domain-specific terms
response = client.ai.audio.transcribe(
    url="https://example.com/audio.mp3",
    keywords=["Telnyx", "API", "WebRTC", "SIP"],
)
print(response.text)

# Verbose JSON with segments
response = client.ai.audio.transcribe(
    url="https://example.com/audio.mp3",
    response_format="verbose_json",
)
for segment in response.segments:
    print(f"[{segment.start:.1f}s - {segment.end:.1f}s] {segment.text}")
```

Primary response fields:
- `response.text` — Full transcription text
- `response.duration` — Audio duration in seconds
- `response.segments` — Array of segment objects (with `start`, `end`, `text`) when using `verbose_json` format

### List available STT providers

Retrieve a list of available speech-to-text providers and their service types.

`GET /ai/audio/transcriptions/providers`

```python
response = client.ai.audio.list_providers()
for provider in response.providers:
    print(f"{provider['name']} — {provider['service_type']}")

# Filter by provider name
response = client.ai.audio.list_providers(provider="telnyx")
for provider in response.providers:
    print(f"{provider['name']} — {provider['service_type']}")

# Filter by service type
response = client.ai.audio.list_providers(service_type="transcription")
for provider in response.providers:
    print(f"{provider['name']} — {provider['service_type']}")
```

Primary response fields:
- `response.providers` — Array of provider objects with `name` and `service_type`

## CLI Usage

The Telnyx Agent CLI provides composite commands for STT:

```bash
# Transcribe audio
telnyx-agent stt --audio-url https://example.com/audio.mp3 --json

# With specific model and language
telnyx-agent stt --audio-url https://example.com/audio.mp3 --model openai/whisper-large-v3-turbo --language es --json

# List available providers
telnyx-agent stt-providers --json

# Filter by provider or service type
telnyx-agent stt-providers --provider telnyx --service-type transcription --json
```

## Important Notes

- **Audio URL**: The audio file must be publicly accessible via a URL. Supported formats include mp3, mp4, mpeg, mpga, m4a, wav, and webm.
- **OpenAI compatibility**: The transcription endpoint is OpenAI-compatible — you can use the OpenAI Python or JS SDK by setting the base URL to `https://api.telnyx.com/v2/ai/openai`.
- **Keyword biasing**: Use `keywords` to improve transcription accuracy for domain-specific terms, product names, or acronyms that generic models may mishear.
- **Models**: Available models include `openai/whisper-large-v3-turbo` (fast, accurate) and `distil-whisper/distil-large-v2` (lightweight). Check `stt-providers` for the full list.
- **Languages**: Use ISO 639-1 codes (`en`, `es`, `fr`, `de`, `ja`, etc.). Omit to auto-detect.
- **Response formats**: Use `verbose_json` to get timestamps and segments. Use `srt` or `vtt` for subtitle files.
