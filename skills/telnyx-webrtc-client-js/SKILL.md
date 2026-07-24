---
name: telnyx-webrtc-client-js
description: "Build browser-based VoIP calling apps using the Telnyx WebRTC JavaScript SDK (@telnyx/webrtc). Initiate and receive voice calls, handle call events and state changes, configure authentication credentials, monitor call quality metrics, run pre-call diagnostics, and integrate AI Agents for anonymous calling. Use when building browser phone apps, implementing WebRTC calling in JavaScript, integrating Telnyx voice SDK in web applications, or adding VoIP functionality to a frontend."
metadata:
  author: telnyx
  product: webrtc
  language: javascript
  platform: browser
---

# Telnyx WebRTC - JavaScript SDK

Build real-time voice communication into browser applications.

> **Prerequisites**: Create WebRTC credentials and generate a login token using the Telnyx server-side SDK. See [references/webrtc-server-api.md](references/webrtc-server-api.md) for credential creation, token generation, and push notification setup.

## Installation

```bash
npm install @telnyx/webrtc --save
```

```js
import { TelnyxRTC } from '@telnyx/webrtc';
```

## Getting Started Workflow

1. **Create WebRTC credentials** (server-side) → get SIP username/password or JWT token
2. **Initialize TelnyxRTC client** with credentials
3. **Wait for `telnyx.ready`** before making calls
4. **Make or receive calls** and handle state changes via `telnyx.notification`
5. **Disconnect** when done

---

## Authentication

### Option 1: Token-Based (Recommended)

```js
const client = new TelnyxRTC({
  login_token: 'your_jwt_token',
});

client.connect();
```

### Option 2: Credential-Based

```js
const client = new TelnyxRTC({
  login: 'sip_username',
  password: 'sip_password',
});

client.connect();
```

> **Important**: Never hardcode credentials in frontend code. Use environment variables or prompt users.

### Disconnect

```js
client.disconnect();
client.off('telnyx.ready');
client.off('telnyx.notification');
```

---

## Media Elements

Specify an HTML element to play remote audio:

```js
client.remoteElement = 'remoteMedia';
```

```html
<audio id="remoteMedia" autoplay="true" />
```

---

## Events

```js
let activeCall;

client
  .on('telnyx.ready', () => {
    console.log('Ready to make calls');
  })
  .on('telnyx.error', (error) => {
    console.error('Error:', error);
  })
  .on('telnyx.notification', (notification) => {
    if (notification.type === 'callUpdate') {
      activeCall = notification.call;
      
      if (activeCall.state === 'ringing') {
        // Show incoming call UI
        // Call activeCall.answer() to accept
      }
    }
  });
```

| Event | Description |
|-------|-------------|
| `telnyx.ready` | Client connected and ready |
| `telnyx.error` | Error occurred |
| `telnyx.notification` | Call updates, incoming calls |
| `telnyx.stats.frame` | In-call quality metrics (when debug enabled) |

---

## Making Calls

```js
const call = client.newCall({
  destinationNumber: '+18004377950',
  callerNumber: '+15551234567',
});
```

---

## Receiving Calls

```js
client.on('telnyx.notification', (notification) => {
  const call = notification.call;
  
  if (notification.type === 'callUpdate' && call.state === 'ringing') {
    call.answer();
  }
});
```

---

## Call Controls

```js
call.hangup();
call.dtmf('1234');
call.muteAudio();
call.unmuteAudio();
call.hold();
call.unhold();
```

---

## Debugging & Call Quality

### Enable Debug Logging

```js
const call = client.newCall({
  destinationNumber: '+18004377950',
  debug: true,
  debugOutput: 'socket',  // 'socket' (send to Telnyx) or 'file' (save locally)
});
```

### In-Call Quality Metrics

```js
const call = client.newCall({
  destinationNumber: '+18004377950',
  debug: true,
});

client.on('telnyx.stats.frame', (stats) => {
  console.log('Quality stats:', stats);
  // Contains jitter, RTT, packet loss, etc.
});
```

---

## Pre-Call Diagnosis

Test connectivity before making calls:

```js
import { PreCallDiagnosis } from '@telnyx/webrtc';

PreCallDiagnosis.run({
  credentials: {
    login: 'sip_username',
    password: 'sip_password',
    // or: loginToken: 'jwt_token'
  },
  texMLApplicationNumber: '+12407758982',
})
  .then((report) => console.log('Diagnosis report:', report))
  .catch((error) => console.error('Diagnosis failed:', error));
```

---

## Preferred Codecs

```js
const allCodecs = RTCRtpReceiver.getCapabilities('audio').codecs;

// Prefer Opus for AI/high quality
const opusCodec = allCodecs.find(c => 
  c.mimeType.toLowerCase().includes('opus')
);

client.newCall({
  destinationNumber: '+18004377950',
  preferred_codecs: [opusCodec],
});
```

---

## Registration State

```js
const isRegistered = await client.getIsRegistered();
console.log('Registered:', isRegistered);
```

---

## AI Agent Integration

### Anonymous Login

Connect to an AI assistant without SIP credentials:

```js
const client = new TelnyxRTC({
  anonymous_login: {
    target_id: 'your-ai-assistant-id',
    target_type: 'ai_assistant',
  },
});

client.connect();
```

> **Note**: The AI assistant must have `telephony_settings.supports_unauthenticated_web_calls` set to `true`.

### Make Call to AI Assistant

```js
const call = client.newCall({
  destinationNumber: '',
  remoteElement: 'remoteMedia',
  preferred_codecs: [opusCodec],  // Opus recommended for AI
});
```

---

## Browser Support

| Platform | Chrome | Firefox | Safari | Edge |
|----------|--------|---------|--------|------|
| Android | ✓ | ✓ | - | - |
| iOS | - | - | ✓ | - |
| Linux | ✓ | ✓ | - | - |
| macOS | ✓ | ✓ | ✓ | ✓ |
| Windows | ✓ | ✓ | - | ✓ |

```js
const webRTCInfo = TelnyxRTC.webRTCInfo;
console.log('WebRTC supported:', webRTCInfo.supportWebRTC);
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No audio | Check microphone permissions in browser |
| Echo/feedback | Use headphones or enable echo cancellation |
| Connection fails | Check network, firewall, or use TURN relay |
| Quality issues | Enable `debug: true` and check `telnyx.stats.frame` events |

---

See [references/api-reference.md](references/api-reference.md) for the full TelnyxRTC and Call class API documentation, including device management, audio settings, ICE configuration, and voice isolation options.

**[references/webrtc-server-api.md](references/webrtc-server-api.md) has the server-side WebRTC API — credential creation, token generation, and push notification setup. You MUST read it when setting up authentication or push notifications.**
