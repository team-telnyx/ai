# Voice Agent with Smallest AI

> Build a real-time voice agent on Telnyx using Smallest AI's Pulse STT and Lightning TTS — caller audio in, synthesized speech out, sub-second latency.

## How It Works

Telnyx [bidirectional media streaming](https://developers.telnyx.com/docs/voice/programmable-voice/media-streaming) forks live call audio to your WebSocket server and lets you inject audio back into the same call. Your server:

1. Pipes caller audio to **Smallest AI Pulse** for real-time speech-to-text
2. Sends each final transcript to an LLM for a response
3. Synthesizes the reply with **Smallest AI Lightning TTS**
4. Injects the audio back into the call over the same WebSocket

```
Caller ◄──► Telnyx ◄──► your WebSocket server ◄──► Smallest AI (Pulse STT + Lightning TTS)
```

Telephony calls use **PCMU (µ-law) at 8 kHz**. To avoid any transcoding on the hot path, this guide streams µ-law end to end: Pulse ingests µ-law directly, and Lightning is asked to return µ-law, which Telnyx plays back as-is in RTP mode.

## Prerequisites

- Telnyx API key ([get one free](https://telnyx.com/agent-signup.md))
- Smallest AI API key ([get one at waves.smallest.ai](https://waves.smallest.ai))
- A Telnyx phone number with a Call Control application and webhook URL
- Python 3.11+

```bash
pip install fastapi uvicorn websockets httpx openai
```

## Quick Start

Before wiring up the call, confirm your Smallest AI key works and that Lightning can emit telephony-ready µ-law audio. This is the exact format you will stream back into the call:

```bash
curl -X POST "https://api.smallest.ai/waves/v1/tts" \
  -H "Authorization: Bearer $SMALLEST_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hi! I am your Telnyx voice agent.",
    "voice_id": "meher",
    "model": "lightning_v3.1",
    "sample_rate": 8000,
    "output_format": "ulaw"
  }' --output reply.ulaw
```

Then start the agent server and expose it, and point your Telnyx Call Control webhook at it:

```bash
export TELNYX_API_KEY=your_telnyx_key
export SMALLEST_API_KEY=your_smallest_key
export STREAM_URL=wss://your-tunnel.ngrok.io/stream

uvicorn app:app --host 0.0.0.0 --port 8000   # terminal 1
ngrok http 8000                              # terminal 2
```

Set your Call Control webhook to `https://<ngrok-url>/webhook`, call your Telnyx number, and speak — the agent will transcribe, respond, and speak back.

## Step 1: Answer the Call and Start Media Streaming

Set your Call Control application webhook to `https://your-server.com/webhook`. When a call arrives, answer it and enable bidirectional media streaming in `rtp` mode:

```python
import os
import httpx
from fastapi import FastAPI, Request

TELNYX_API_KEY = os.environ["TELNYX_API_KEY"]
STREAM_URL = os.environ["STREAM_URL"]  # wss://your-server.com/stream

app = FastAPI()

async def call_action(call_control_id: str, action: str, body: dict = None):
    async with httpx.AsyncClient() as client:
        await client.post(
            f"https://api.telnyx.com/v2/calls/{call_control_id}/actions/{action}",
            json=body or {},
            headers={"Authorization": f"Bearer {TELNYX_API_KEY}"},
        )

@app.post("/webhook")
async def webhook(request: Request):
    event = await request.json()
    payload = event["data"]["payload"]
    call_control_id = payload["call_control_id"]

    match event["data"]["event_type"]:
        case "call.initiated":
            await call_action(call_control_id, "answer")

        case "call.answered":
            await call_action(call_control_id, "streaming_start", {
                "stream_url": STREAM_URL,
                "stream_bidirectional_mode": "rtp",
            })

    return {"status": "ok"}
```

| Parameter | Value | Description |
|-----------|-------|-------------|
| `stream_url` | `wss://your-server.com/stream` | Your WebSocket endpoint — must be `wss://` in production |
| `stream_bidirectional_mode` | `"rtp"` | Stream raw RTP audio both ways. The call's telephony codec is PCMU (µ-law) at 8 kHz, so the `media.payload` you send back must be base64-encoded µ-law — which is exactly what Lightning returns below. (Use `mp3` mode only if you send whole MP3 files, which are queued at one-per-second and unsuitable for real-time replies.) |

## Step 2: Receive Call Audio over WebSocket

Telnyx connects to your `/stream` endpoint when streaming starts. Audio arrives as base64-encoded PCMU (µ-law) payloads in 20 ms chunks:

```python
import asyncio
import base64
import json
from fastapi import WebSocket

@app.websocket("/stream")
async def stream(ws: WebSocket):
    await ws.accept()
    session = AgentSession(ws)

    async for message in ws.iter_text():
        event = json.loads(message)
        match event.get("event"):
            case "media":
                audio = base64.b64decode(event["media"]["payload"])
                await session.on_audio(audio)
            case "stop":
                await session.close()
```

## Step 3: Transcribe with Smallest AI Pulse STT

Open a persistent WebSocket to Smallest AI's STT endpoint. Telnyx sends PCMU (µ-law) at 8 kHz, so declare that format in the query string with `encoding=mulaw&sample_rate=8000` and forward the raw bytes straight through — no conversion needed:

```python
import websockets

SMALLEST_API_KEY = os.environ["SMALLEST_API_KEY"]
STT_WS_URL = (
    "wss://api.smallest.ai/waves/v1/stt/live"
    "?model=pulse&encoding=mulaw&sample_rate=8000"
)

class AgentSession:
    def __init__(self, telnyx_ws: WebSocket):
        self.telnyx_ws = telnyx_ws
        self.stt_ws = None

    async def _connect_stt(self):
        self.stt_ws = await websockets.connect(
            STT_WS_URL,
            additional_headers={"Authorization": f"Bearer {SMALLEST_API_KEY}"},
        )
        asyncio.create_task(self._receive_transcripts())

    async def on_audio(self, pcmu_bytes: bytes):
        if self.stt_ws is None:
            await self._connect_stt()
        # Telnyx PCMU (µ-law) 8 kHz matches the STT encoding declared in the URL
        await self.stt_ws.send(pcmu_bytes)

    async def _receive_transcripts(self):
        async for message in self.stt_ws:
            data = json.loads(message)
            if data.get("is_final") and data.get("transcript"):
                asyncio.create_task(self.on_transcript(data["transcript"]))

    async def close(self):
        if self.stt_ws:
            await self.stt_ws.close()
```

> **Model options**: Switch to `?model=pulse-pro` in the STT URL for higher accuracy on accented speech and noisy environments.

> **`additional_headers`**: On `websockets` ≥ 14 the client handshake uses `additional_headers`. If you pin an older release, use the legacy `extra_headers` argument instead.

## Step 4: Generate a Response and Synthesize with Lightning TTS

On each final transcript, call an LLM and synthesize the reply with Smallest AI Lightning. Request `output_format: "ulaw"` at 8 kHz so the bytes are ready to inject into the call with no transcoding:

```python
from openai import AsyncOpenAI

llm = AsyncOpenAI()
TTS_URL = "https://api.smallest.ai/waves/v1/tts"

async def on_transcript(self, text: str):
    # Generate LLM response
    completion = await llm.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a helpful voice assistant. Keep replies short and conversational."},
            {"role": "user", "content": text},
        ],
    )
    reply = completion.choices[0].message.content

    # Synthesize with Smallest AI Lightning TTS as telephony-ready µ-law
    async with httpx.AsyncClient() as client:
        response = await client.post(
            TTS_URL,
            headers={
                "Authorization": f"Bearer {SMALLEST_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "text": reply,
                "voice_id": "meher",
                "model": "lightning_v3.1",
                "sample_rate": 8000,
                "output_format": "ulaw",
            },
        )
        response.raise_for_status()
        await self.inject_audio(response.content)
```

| Field | Value | Description |
|-------|-------|-------------|
| `voice_id` | `"meher"`, etc. | See the [Smallest AI voice catalog](https://waves.smallest.ai) |
| `model` | `"lightning_v3.1"` | Use `"lightning_v3.1_pro"` for premium broadcast-quality voices |
| `sample_rate` | `8000` | Match Telnyx's native call audio rate |
| `output_format` | `"ulaw"` | Raw PCMU bytes — the exact payload Telnyx expects in `rtp` mode |

> **Tip**: Replace the OpenAI LLM call with [Telnyx's colocated inference](https://developers.telnyx.com/docs/inference) to cut round-trip latency — Telnyx runs inference on the same network as the call.

## Step 5: Inject TTS Audio Back into the Call

Base64-encode the µ-law audio and send it to Telnyx over the bidirectional WebSocket to play it to the caller:

```python
async def inject_audio(self, ulaw_bytes: bytes):
    payload = base64.b64encode(ulaw_bytes).decode()
    await self.telnyx_ws.send_text(json.dumps({
        "event": "media",
        "media": {"payload": payload},
    }))
```

To interrupt queued playback when the caller starts speaking, send a `clear` message:

```python
await self.telnyx_ws.send_text(json.dumps({"event": "clear"}))
```

## API Reference

### Telnyx — Start Bidirectional Media Streaming

**`POST /v2/calls/{call_control_id}/actions/streaming_start`**

```bash
curl -X POST "https://api.telnyx.com/v2/calls/$CALL_CONTROL_ID/actions/streaming_start" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "stream_url": "wss://your-server.com/stream",
    "stream_bidirectional_mode": "rtp"
  }'
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `stream_url` | string | Yes | Your `wss://` WebSocket endpoint |
| `stream_bidirectional_mode` | string | Yes | `"rtp"` to stream raw µ-law audio in both directions |

### Smallest AI — Pulse Realtime STT (WebSocket)

**`wss://api.smallest.ai/waves/v1/stt/live`**

| Query param | Value | Description |
|-------------|-------|-------------|
| `model` | `pulse` \| `pulse-pro` | STT model pool |
| `encoding` | `mulaw` | Match Telnyx's PCMU telephony audio (also supports `linear16`, `alaw`, `opus`) |
| `sample_rate` | `8000` | Telephony sample rate in Hz |

Auth is a bearer token sent in the connection headers: `Authorization: Bearer $SMALLEST_API_KEY`. Send raw audio frames; receive JSON transcript messages with `is_final` and `transcript` fields.

### Smallest AI — Lightning TTS (HTTP)

**`POST https://api.smallest.ai/waves/v1/tts`**

```bash
curl -X POST "https://api.smallest.ai/waves/v1/tts" \
  -H "Authorization: Bearer $SMALLEST_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your order has been confirmed!",
    "voice_id": "meher",
    "model": "lightning_v3.1",
    "sample_rate": 8000,
    "output_format": "ulaw"
  }' --output reply.ulaw
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | Yes | Text to synthesize |
| `voice_id` | string | Yes | Voice selection — see the [voice catalog](https://waves.smallest.ai) |
| `model` | string | No | `lightning_v3.1` (default) or `lightning_v3.1_pro` |
| `sample_rate` | int | No | `8000` for telephony |
| `output_format` | string | No | One of `pcm`, `wav`, `mp3`, `ulaw`, `alaw` — use `ulaw` for Telnyx RTP mode |

## TypeScript Examples

Answer the call and start bidirectional streaming from a TypeScript webhook handler:

```typescript
const TELNYX_API_KEY = process.env.TELNYX_API_KEY!;
const STREAM_URL = process.env.STREAM_URL!; // wss://your-server.com/stream
const BASE_URL = "https://api.telnyx.com/v2";

async function callAction(callControlId: string, action: string, body: object = {}) {
  await fetch(`${BASE_URL}/calls/${callControlId}/actions/${action}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TELNYX_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

// Inside your webhook handler:
async function onWebhook(event: any) {
  const { call_control_id: id, event_type } = {
    ...event.data.payload,
    event_type: event.data.event_type,
  };

  if (event_type === "call.initiated") {
    await callAction(id, "answer");
  } else if (event_type === "call.answered") {
    await callAction(id, "streaming_start", {
      stream_url: STREAM_URL,
      stream_bidirectional_mode: "rtp",
    });
  }
}
```

Synthesize a reply as telephony-ready µ-law with Lightning TTS:

```typescript
const SMALLEST_API_KEY = process.env.SMALLEST_API_KEY!;

async function synthesize(text: string): Promise<Buffer> {
  const res = await fetch("https://api.smallest.ai/waves/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SMALLEST_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      voice_id: "meher",
      model: "lightning_v3.1",
      sample_rate: 8000,
      output_format: "ulaw",
    }),
  });
  return Buffer.from(await res.arrayBuffer());
}
```

## Next Steps

- **Interruption handling** — Track a speaking flag from VAD events and call `clear` before injecting new audio when the caller barge-ins.
- **Pulse Pro** — Higher accuracy STT with `?model=pulse-pro`, especially useful for accented speakers or noisy call environments.
- **Lightning Pro voices** — Premium broadcast-quality voices with Hindi+English code-switching via `model: "lightning_v3.1_pro"`. See the [Smallest AI voice catalog](https://waves.smallest.ai).
- **Telnyx inference** — Replace the OpenAI call with [Telnyx's inference API](https://developers.telnyx.com/docs/inference) (OpenAI-compatible) — runs on Telnyx GPUs colocated with the call for lowest possible latency.
- **TeXML alternative** — If you prefer a markup-based approach over WebSocket streaming, use [Telnyx TeXML](https://developers.telnyx.com/docs/voice/texml) with `<Stream>` to pipe audio to your server.
