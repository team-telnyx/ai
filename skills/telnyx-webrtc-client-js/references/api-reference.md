# Telnyx WebRTC JavaScript SDK - API Reference

## TelnyxRTC

The `TelnyxRTC` client connects your application to the Telnyx backend,
enabling you to make outgoing calls and handle incoming calls.

```js
const client = new TelnyxRTC({
  login_token: login_token,
  // or: login: username, password: password,
});

client
  .on('telnyx.ready', () => console.log('ready to call'))
  .on('telnyx.notification', (notification) => {
    console.log('notification:', notification);
  });

client.connect();
```

### Methods

#### checkPermissions

▸ **checkPermissions**(`audio?`, `video?`): `Promise<boolean>`

```js
client.checkPermissions();
```

#### disableMicrophone / enableMicrophone

▸ **disableMicrophone**(): `void`
▸ **enableMicrophone**(): `void`

```js
client.disableMicrophone();
client.enableMicrophone();
```

#### getAudioInDevices / getAudioOutDevices / getVideoDevices / getDevices

▸ Returns `Promise<MediaDeviceInfo[]>` for each.

```js
const devices = await client.getDevices();
const audioIn = await client.getAudioInDevices();
const audioOut = await client.getAudioOutDevices();
const video = await client.getVideoDevices();
```

#### getDeviceResolutions

▸ **getDeviceResolutions**(`deviceId`): `Promise<any[]>`

```js
const resolutions = await client.getDeviceResolutions();
```

#### setAudioSettings

▸ **setAudioSettings**(`settings`): `Promise<MediaTrackConstraints>`

```js
const constraints = await client.setAudioSettings({
  micId: '772e94959e12e589b1cc71133d32edf543d3315cfd1d0a4076a60601d4ff4df8',
  micLabel: 'Internal Microphone (Built-in)',
  echoCancellation: false,
});
```

#### webRTCInfo

▸ `Static` **webRTCInfo**(): `string | IWebRTCInfo`

```js
const info = TelnyxRTC.webRTCInfo();
const isWebRTCSupported = info.supportWebRTC;
```

#### webRTCSupportedBrowserList

▸ `Static` **webRTCSupportedBrowserList**(): `IWebRTCSupportedBrowser[]`

```js
const browserList = TelnyxRTC.webRTCSupportedBrowserList();
```

## Call

A `Call` represents an audio or video call between two browsers, SIP clients, or phone numbers.

### Making a call

```js
const call = client.newCall({
  destinationNumber: '18004377950',
  callerNumber: '155531234567',
});
```

### Answering an incoming call

```js
client.on('telnyx.notification', (notification) => {
  const call = notification.call;
  if (notification.type === 'callUpdate' && call.state === 'ringing') {
    call.answer();
  }
});
```

### Call controls

```js
call.hangup();
call.dtmf('1234');
call.hold();
call.muteAudio();
```

### Call Methods

#### getStats

▸ **getStats**(`callback`, `constraints`): `void`

#### setAudioInDevice

▸ **setAudioInDevice**(`deviceId`, `muted?`): `Promise<void>`

```js
await call.setAudioInDevice('abc123');
```

#### setAudioOutDevice

▸ **setAudioOutDevice**(`deviceId`): `Promise<boolean>`

```js
await call.setAudioOutDevice('abc123');
```

#### setVideoDevice

▸ **setVideoDevice**(`deviceId`): `Promise<void>`

```js
await call.setVideoDevice('abc123');
```

## newCall Options

### ICE Candidate Prefetching

Enabled by default. Disable with:

```js
client.newCall({
  destinationNumber: 'xxx',
  prefetchIceCandidates: false,
});
```

### Trickle ICE

```js
client.newCall({
  destinationNumber: 'xxx',
  trickleIce: true,
});
```

### Voice Isolation

Control audio settings via the `audio` object parameter. See [MediaTrackConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints) for available options.
