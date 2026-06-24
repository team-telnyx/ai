# Voice Agent with Smallest AI

> Build a real-time voice agent on Telnyx using Smallest AI's Pulse STT and Lightning TTS — caller audio in, synthesized speech out, sub-second latency.

## How It Works

Telnyx [media streaming](https://developers.telnyx.com/docs/voice/programmable-voice/media-streaming) forks live call audio to your WebSocket server. Your server:

1. Pipes caller audio to **Smallest AI Pulse** for real-time speech-to-text
2. Sends each final transcript to an LLM for a response
3. Synthesizes the reply with **Smallest AI Lightning TTS**
4. Injects the audio back into the call over the same WebSocket

```
Caller ◄──► Telnyx ◄──► your WebSocket server ◄──► Smallest AI (Pulse STT + Lightning TTS)
```

## Prerequisites

- Telnyx API key ([get one free](https://telnyx.com/agent-signup.md))
- Smallest AI API key ([get one at waves.smallest.ai](https://waves.smallest.ai))
- A Telnyx phone number with a Call Control application and webhook URL
- Python 3.11+

```bash
pip install fastapi uvicorn websockets httpx openai
```

## Step 1: Answer the Call and Start Media Streaming

Set your Call Control application webhook to `https://your-server.com/webhook`. When a call arrives, answer it and enable bidirectional media streaming:

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
| `stream_bidirectional_mode` | `"rtp"` | Required to inject audio back into the call |

## Step 2: Receive Call Audio over WebSocket

Telnyx connects to your `/stream` endpoint when streaming starts. Audio arrives as base64-encoded PCMU payloads in 20ms chunks:

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

Open a persistent WebSocket to Smallest AI's STT endpoint. Telnyx sends PCMU (µ-law) audio — convert to linear16 PCM before forwarding:

```python
import audioop
import websockets

SMALLEST_API_KEY = os.environ["SMALLEST_API_KEY"]
STT_WS_URL = "wss://api.smallest.ai/waves/v1/stt/live?model=pulse"

class AgentSession:
    def __init__(self, telnyx_ws: WebSocket):
        self.telnyx_ws = telnyx_ws
        self.stt_ws = None

    async def _connect_stt(self):
        self.stt_ws = await websockets.connect(
            STT_WS_URL,
            extra_headers={"Authorization": f"Bearer {SMALLEST_API_KEY}"},
        )
        asyncio.create_task(self._receive_transcripts())

    async def on_audio(self, pcmu_bytes: bytes):
        if self.stt_ws is None:
            await self._connect_stt()
        # Convert PCMU (µ-law) → linear16 PCM for Smallest AI
        pcm = audioop.ulaw2lin(pcmu_bytes, 2)
        await self.stt_ws.send(pcm)

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

## Step 4: Generate a Response and Synthesize with Lightning TTS

On each final transcript, call an LLM and synthesize the reply with Smallest AI Lightning:

```python
from openai import AsyncOpenAI

llm = AsyncOpenAI()
TTS_URL = "https://waves-api.smallest.ai/api/v1/lightning/get_speech"

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

    # Synthesize with Smallest AI Lightning TTS
    async with httpx.AsyncClient() as client:
        response = await client.post(
            TTS_URL,
            headers={"Authorization": f"Bearer {SMALLEST_API_KEY}"},
            json={
                "text": reply,
                "voice_id": "emily",
                "sample_rate": 8000,
                "format": "mp3",
            },
        )
        response.raise_for_status()
        await self.inject_audio(response.content)
```

| Parameter | Value | Description |
|-----------|-------|-------------|
| `voice_id` | `"emily"`, `"james"`, etc. | See the [Smallest AI voice catalog](https://waves.smallest.ai) |
| `sample_rate` | `8000` | Match Telnyx's native call audio rate |
| `format` | `"mp3"` | Telnyx accepts base64-encoded MP3 for injection |

> **Tip**: Replace the OpenAI LLM call with [Telnyx's colocated inference](https://developers.telnyx.com/docs/inference) to cut round-trip latency — Telnyx runs inference on the same network as the call.

## Step 5: Inject TTS Audio Back into the Call

Send the MP3 audio to Telnyx over the bidirectional WebSocket to play it to the caller:

```python
async def inject_audio(self, mp3_bytes: bytes):
    payload = base64.b64encode(mp3_bytes).decode()
    await self.telnyx_ws.send_text(json.dumps({
        "event": "media",
        "media": {"payload": payload},
    }))
```

To interrupt queued playback when the caller starts speaking, send a `clear` message:

```python
await self.telnyx_ws.send_text(json.dumps({"event": "clear"}))
```

## Run Locally

```bash
# Set credentials
export TELNYX_API_KEY=your_telnyx_key
export SMALLEST_API_KEY=your_smallest_key
export STREAM_URL=wss://your-tunnel.ngrok.io/stream

# Start the server
uvicorn app:app --host 0.0.0.0 --port 8000

# In another terminal, expose it
ngrok http 8000
```

Set your Telnyx Call Control webhook to `https://<ngrok-url>/webhook`, call your Telnyx number, and speak — the agent will transcribe, respond, and speak back.

## Key Parameters

| Setting | Value | Notes |
|---------|-------|-------|
| Telnyx streaming mode | `stream_bidirectional_mode: "rtp"` | Required for audio injection |
| STT endpoint | `wss://api.smallest.ai/waves/v1/stt/live?model=pulse` | Switch to `pulse-pro` for higher accuracy |
| STT input format | Linear16 PCM, 8 kHz | Convert from Telnyx PCMU with `audioop.ulaw2lin(data, 2)` |
| TTS endpoint | `https://waves-api.smallest.ai/api/v1/lightning/get_speech` | ~100ms first-chunk latency |
| TTS output format | MP3 | Base64-encode before injecting into Telnyx WebSocket |
| TTS sample rate | `8000` | Match Telnyx's native call audio rate |

## Next Steps

- **Interruption handling** — Track a speaking flag from VAD events and call `clear` before injecting new audio when the caller barge-ins.
- **Pulse Pro** — Higher accuracy STT with `?model=pulse-pro`, especially useful for accented speakers or noisy call environments.
- **Lightning Pro voices** — Premium broadcast-quality voices with Hindi+English code-switching. See [Smallest AI voice catalog](https://waves.smallest.ai).
- **Telnyx inference** — Replace the OpenAI call with [Telnyx's inference API](https://developers.telnyx.com/docs/inference) (OpenAI-compatible) — runs on Telnyx GPUs colocated with the call for lowest possible latency.
- **TeXML alternative** — If you prefer a markup-based approach over WebSocket streaming, use [Telnyx TeXML](https://developers.telnyx.com/docs/voice/texml) with `<Stream>` to pipe audio to your server.
