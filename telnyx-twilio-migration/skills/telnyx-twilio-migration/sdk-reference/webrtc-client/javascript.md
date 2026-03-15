<!-- SDK reference: telnyx-webrtc-client-js (WebRTC client) -->

# Telnyx WebRTC - JavaScript SDK

Build real-time voice communication into browser applications.

> **Prerequisites**: Create WebRTC credentials and generate a login token using the Telnyx server-side SDK. See the `telnyx-webrtc-*` skill in your server language plugin (e.g., `telnyx-python`, `telnyx-javascript`).

## Installation

```bash
npm install @telnyx/webrtc --save
```

Import the client:

```js
import { TelnyxRTC } from '@telnyx/webrtc';
```

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
// When done, disconnect and remove listeners
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

HTML:

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
      
      // Handle incoming call
      if (activeCall.state === 'ringing') {
        // Show incoming call UI
        // Call activeCall.answer() to accept
      }
    }
  });
```

### Event Types

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
    // Incoming call - show UI and answer
    call.answer();
  }
});
```

---

## Call Controls

```js
// End call
call.hangup();

// Send DTMF tones
call.dtmf('1234');

// Mute audio
call.muteAudio();
call.unmuteAudio();

// Hold
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
  debug: true,  // Required for metrics
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
  .then((report) => {
    console.log('Diagnosis report:', report);
  })
  .catch((error) => {
    console.error('Diagnosis failed:', error);
  });
```

---

## Preferred Codecs

Set codec preference for calls:

```js
const allCodecs = RTCRtpReceiver.getCapabilities('audio').codecs;

// Prefer Opus for AI/high quality
const opusCodec = allCodecs.find(c => 
  c.mimeType.toLowerCase().includes('opus')
);

// Or PCMA for telephony compatibility
const pcmaCodec = allCodecs.find(c => 
  c.mimeType.toLowerCase().includes('pcma')
);

client.newCall({
  destinationNumber: '+18004377950',
  preferred_codecs: [opusCodec],
});
```

---

## Registration State

Check if client is registered:

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
// After anonymous login, destinationNumber is ignored
const call = client.newCall({
  destinationNumber: '',  // Can be empty
  remoteElement: 'remoteMedia',
});
```

### Recommended Codec for AI

```js
const allCodecs = RTCRtpReceiver.getCapabilities('audio').codecs;
const opusCodec = allCodecs.find(c => 
  c.mimeType.toLowerCase().includes('opus')
);

client.newCall({
  destinationNumber: '',
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

### Check Browser Support

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

<!-- BEGIN AUTO-GENERATED API REFERENCE -- do not edit below this line -->

**[references/webrtc-server-api.md](references/webrtc-server-api.md) has the server-side WebRTC API — credential creation, token generation, and push notification setup. You MUST read it when setting up authentication or push notifications.**

## API Reference


### TelnyxRTC

The `TelnyxRTC` client connects your application to the Telnyx backend,
enabling you to make outgoing calls and handle incoming calls.

```js
// Initialize the client
const client = new TelnyxRTC({
  // Use a JWT to authenticate (recommended)
  login_token: login_token,
  // or use your Connection credentials
  //  login: username,
  //  password: password,
});

// Attach event listeners
client
  .on('telnyx.ready', () => console.log('ready to call'))
  .on('telnyx.notification', (notification) => {
    console.log('notification:', notification);
  });

// Connect and login
client.connect();

// You can call client.disconnect() when you're done.
// Note: When you call `client.disconnect()` you need to remove all ON event methods you've had attached before.

// Disconnecting and Removing listeners.
client.disconnect();
client.off('telnyx.ready');
client.off('telnyx.notification');
```

### Methods

### checkPermissions

▸ **checkPermissions**(`audio?`, `video?`): `Promise`\<`boolean`\>

Params: `audio` (boolean), `video` (boolean)

Returns: `Promise`

```js
const client = new TelnyxRTC(options);

client.checkPermissions();
```
### disableMicrophone

▸ **disableMicrophone**(): `void`

Returns: `void`

```js
const client = new TelnyxRTC(options);

client.disableMicrophone();
```
### enableMicrophone

▸ **enableMicrophone**(): `void`

Returns: `void`

```js
const client = new TelnyxRTC(options);

client.enableMicrophone();
```
### getAudioInDevices

▸ **getAudioInDevices**(): `Promise`\<`MediaDeviceInfo`[]\>

Returns: `Promise`
### getAudioOutDevices

▸ **getAudioOutDevices**(): `Promise`\<`MediaDeviceInfo`[]\>

Returns: `Promise`
### getDeviceResolutions

▸ **getDeviceResolutions**(`deviceId`): `Promise`\<`any`[]\>

Params: `deviceId` (string)

Returns: `Promise`

```js
async function() {
  const client = new TelnyxRTC(options);
  let result = await client.getDeviceResolutions();
  console.log(result);
}
```
### getDevices

▸ **getDevices**(): `Promise`\<`MediaDeviceInfo`[]\>

Returns: `Promise`

```js
async function() {
  const client = new TelnyxRTC(options);
  let result = await client.getDevices();
  console.log(result);
}
```
### getVideoDevices

▸ **getVideoDevices**(): `Promise`\<`MediaDeviceInfo`[]\>

Returns: `Promise`

```js
async function() {
  const client = new TelnyxRTC(options);
  let result = await client.getVideoDevices();
  console.log(result);
}
```
### handleLoginError

▸ **handleLoginError**(`error`): `void`

Params: `error` (any)

Returns: `void`
### Error handling

An error will be thrown if `destinationNumber` is not specified.

```js
const call = client.newCall().catch(console.error);
// => `destinationNumber is required`
```
### Setting Custom Headers

client.newCall({
### Setting Preferred Codec

You can pass `preferred_codecs` to the `newCall` method to set codec preference during the call.
### ICE Candidate Prefetching

ICE candidate prefetching is enabled by default. This pre-gathers ICE candidates when the

```js
client.newCall({
  destinationNumber: 'xxx',
  prefetchIceCandidates: false,
});
```
### Trickle ICE

Trickle ICE can be enabled by passing `trickleIce` to the `newCall` method.

```js
client.newCall({
  destinationNumber: 'xxx',
  trickleIce: true,
});
```
### Voice Isolation

Voice isolation options can be set by passing an `audio` object to the `newCall` method. This property controls the settings of a MediaStreamTrack object. For reference on available audio constraints, see [MediaTrackConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints).
### Events

[`TelnyxRTC`](https://developers.telnyx.com/development/webrtc/js-sdk/classes/telnyxrtc)

Params: `eventName` (string), `callback` (Function)
### setAudioSettings

▸ **setAudioSettings**(`settings`): `Promise`\<`MediaTrackConstraints`\>

Params: `settings` (IAudioSettings)

Returns: `Promise`

```js
// within an async function
const constraints = await client.setAudioSettings({
  micId: '772e94959e12e589b1cc71133d32edf543d3315cfd1d0a4076a60601d4ff4df8',
  micLabel: 'Internal Microphone (Built-in)',
  echoCancellation: false,
});
```
### webRTCInfo

▸ `Static` **webRTCInfo**(): `string` \| `IWebRTCInfo`

Returns: `string`

```js
const info = TelnyxRTC.webRTCInfo();
const isWebRTCSupported = info.supportWebRTC;
console.log(isWebRTCSupported); // => true
```
### webRTCSupportedBrowserList

▸ `Static` **webRTCSupportedBrowserList**(): `IWebRTCSupportedBrowser`[]

Returns: `IWebRTCSupportedBrowser`

```js
const browserList = TelnyxRTC.webRTCSupportedBrowserList();
console.log(browserList); // => [{"operationSystem": "Android", "supported": [{"browserName": "Chrome", "features": ["video", "audio"], "supported": "full"},{...}]
```


### Call

A `Call` is the representation of an audio or video call between
two browsers, SIP clients or phone numbers. The `call` object is
created whenever a new call is initiated, either by you or the
remote caller. You can access and act upon calls initiated by
a remote caller in a `telnyx.notification` event handler.

To create a new call, i.e. dial:

```js
const call = client.newCall({
  // Destination is required and can be a phone number or SIP URI
  destinationNumber: '18004377950',
  callerNumber: '‬155531234567',
});
```

To answer an incoming call:

```js
client.on('telnyx.notification', (notification) => {
  const call = notification.call;

  if (notification.type === 'callUpdate' && call.state === 'ringing') {
    call.answer();
  }
});
```

Both the outgoing and incoming call has methods that can be hooked up to your UI.

```js
// Hangup or reject an incoming call
call.hangup();

// Send digits and keypresses
call.dtmf('1234');

// Call states that can be toggled
call.hold();
call.muteAudio();
```

### Properties
### Accessors
### Methods

### getStats

▸ **getStats**(`callback`, `constraints`): `void`

Params: `callback` (Function), `constraints` (any)

Returns: `void`
### setAudioInDevice

▸ **setAudioInDevice**(`deviceId`, `muted?`): `Promise`\<`void`\>

Params: `deviceId` (string), `muted` (boolean)

Returns: `Promise`

```js
await call.setAudioInDevice('abc123');
```
### setAudioOutDevice

▸ **setAudioOutDevice**(`deviceId`): `Promise`\<`boolean`\>

Params: `deviceId` (string)

Returns: `Promise`

```js
await call.setAudioOutDevice('abc123');
```
### setVideoDevice

▸ **setVideoDevice**(`deviceId`): `Promise`\<`void`\>

Params: `deviceId` (string)

Returns: `Promise`

```js
await call.setVideoDevice('abc123');
```


### ICallOptions

ICallOptions
ICallOptions

### Properties


### IClientOptions

IClientOptions
IClientOptions

### Properties

<!-- END AUTO-GENERATED API REFERENCE -->
