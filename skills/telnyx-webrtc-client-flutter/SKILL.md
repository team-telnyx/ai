---
name: telnyx-webrtc-client-flutter
description: >-
  Build cross-platform VoIP calling apps with Flutter using Telnyx WebRTC SDK.
  Covers authentication, making/receiving calls, push notifications (FCM + APNS),
  call quality metrics, and AI Agent integration. Works on Android, iOS, and Web.
metadata:
  author: telnyx
  product: webrtc
  language: dart
  platform: flutter
---

# Telnyx WebRTC - Flutter SDK

Build real-time voice communication into Flutter applications (Android, iOS, Web).

> **Prerequisites**: Create WebRTC credentials and generate a login token using the Telnyx server-side SDK. See the `telnyx-webrtc-*` skill in your server language plugin (e.g., `telnyx-python`, `telnyx-javascript`).

## Quick Start Option

For faster implementation, consider [Telnyx Common](https://pub.dev/packages/telnyx_common) - a higher-level abstraction that simplifies WebRTC integration with minimal setup.

## Installation

Add to `pubspec.yaml`:

```yaml
dependencies:
  telnyx_webrtc: ^latest_version
```

Then run:

```bash
flutter pub get
```

## Platform Configuration

### Android

Add to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

### iOS

Add to `Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>$(PRODUCT_NAME) needs microphone access for calls</string>
```

---

## Authentication

### Option 1: Credential-Based Login

```dart
final telnyxClient = TelnyxClient();

final credentialConfig = CredentialConfig(
  sipUser: 'your_sip_username',
  sipPassword: 'your_sip_password',
  sipCallerIDName: 'Display Name',
  sipCallerIDNumber: '+15551234567',
  notificationToken: fcmOrApnsToken,  // Optional: for push
  autoReconnect: true,
  debug: true,
  logLevel: LogLevel.debug,
);

telnyxClient.connectWithCredential(credentialConfig);
```

### Option 2: Token-Based Login (JWT)

```dart
final tokenConfig = TokenConfig(
  sipToken: 'your_jwt_token',
  sipCallerIDName: 'Display Name',
  sipCallerIDNumber: '+15551234567',
  notificationToken: fcmOrApnsToken,
  autoReconnect: true,
  debug: true,
);

telnyxClient.connectWithToken(tokenConfig);
```

### Configuration Options

| Parameter | Type | Description |
|-----------|------|-------------|
| `sipUser` / `sipToken` | String | Credentials from Telnyx Portal |
| `sipCallerIDName` | String | Caller ID name displayed to recipients |
| `sipCallerIDNumber` | String | Caller ID number |
| `notificationToken` | String? | FCM (Android) or APNS (iOS) token |
| `autoReconnect` | bool | Auto-retry login on failure |
| `debug` | bool | Enable call quality metrics |
| `logLevel` | LogLevel | none, error, warning, debug, info, all |
| `ringTonePath` | String? | Custom ringtone asset path |
| `ringbackPath` | String? | Custom ringback tone asset path |

---

## Making Outbound Calls

```dart
telnyxClient.call.newInvite(
  'John Doe',           // callerName
  '+15551234567',       // callerNumber
  '+15559876543',       // destinationNumber
  'my-custom-state',    // clientState
);
```

---

## Receiving Inbound Calls

Listen for socket events:

```dart
InviteParams? _incomingInvite;
Call? _currentCall;

telnyxClient.onSocketMessageReceived = (TelnyxMessage message) {
  switch (message.socketMethod) {
    case SocketMethod.CLIENT_READY:
      // Ready to make/receive calls
      break;
      
    case SocketMethod.LOGIN:
      // Successfully logged in
      break;
      
    case SocketMethod.INVITE:
      // Incoming call!
      _incomingInvite = message.message.inviteParams;
      // Show incoming call UI...
      break;
      
    case SocketMethod.ANSWER:
      // Call was answered
      break;
      
    case SocketMethod.BYE:
      // Call ended
      break;
  }
};

// Accept the incoming call
void acceptCall() {
  if (_incomingInvite != null) {
    _currentCall = telnyxClient.acceptCall(
      _incomingInvite!,
      'My Name',
      '+15551234567',
      'state',
    );
  }
}
```

---

## Call Controls

```dart
// End call
telnyxClient.call.endCall(telnyxClient.call.callId);

// Decline incoming call
telnyxClient.createCall().endCall(_incomingInvite?.callID);

// Mute/Unmute
telnyxClient.call.onMuteUnmutePressed();

// Hold/Unhold
telnyxClient.call.onHoldUnholdPressed();

// Toggle speaker
telnyxClient.call.enableSpeakerPhone(true);

// Send DTMF tone
telnyxClient.call.dtmf(telnyxClient.call.callId, '1');
```

---

## Push Notifications - Android (FCM)

### 1. Setup Firebase

```dart
// main.dart
@pragma('vm:entry-point')
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  if (defaultTargetPlatform == TargetPlatform.android) {
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(_firebaseBackgroundHandler);
  }
  
  runApp(const MyApp());
}
```

### 2. Background Handler

```dart
Future<void> _firebaseBackgroundHandler(RemoteMessage message) async {
  // Show notification (e.g., using flutter_callkit_incoming)
  showIncomingCallNotification(message);
  
  // Listen for user action
  FlutterCallkitIncoming.onEvent.listen((CallEvent? event) {
    switch (event!.event) {
      case Event.actionCallAccept:
        TelnyxClient.setPushMetaData(
          message.data,
          isAnswer: true,
          isDecline: false,
        );
        break;
      case Event.actionCallDecline:
        TelnyxClient.setPushMetaData(
          message.data,
          isAnswer: false,
          isDecline: true,  // SDK handles decline automatically
        );
        break;
    }
  });
}
```

### 3. Handle Push When App Opens

```dart
Future<void> _handlePushNotification() async {
  final data = await TelnyxClient.getPushMetaData();
  if (data != null) {
    PushMetaData pushMetaData = PushMetaData.fromJson(data);
    telnyxClient.handlePushNotification(
      pushMetaData,
      credentialConfig,
      tokenConfig,
    );
  }
}
```

### Early Accept/Decline Handling

```dart
bool _waitingForInvite = false;

void acceptCall() {
  if (_incomingInvite != null) {
    _currentCall = telnyxClient.acceptCall(...);
  } else {
    // Set flag if invite hasn't arrived yet
    _waitingForInvite = true;
  }
}

// In socket message handler:
case SocketMethod.INVITE:
  _incomingInvite = message.message.inviteParams;
  if (_waitingForInvite) {
    acceptCall();  // Accept now that invite arrived
    _waitingForInvite = false;
  }
  break;
```

---

## Push Notifications - iOS (APNS + PushKit)

### 1. AppDelegate Setup

```swift
// AppDelegate.swift
func pushRegistry(_ registry: PKPushRegistry, 
                  didUpdate credentials: PKPushCredentials, 
                  for type: PKPushType) {
    let deviceToken = credentials.token.map { 
        String(format: "%02x", $0) 
    }.joined()
    SwiftFlutterCallkitIncomingPlugin.sharedInstance?
        .setDevicePushTokenVoIP(deviceToken)
}

func pushRegistry(_ registry: PKPushRegistry,
                  didReceiveIncomingPushWith payload: PKPushPayload,
                  for type: PKPushType,
                  completion: @escaping () -> Void) {
    guard type == .voIP else { return }
    
    if let metadata = payload.dictionaryPayload["metadata"] as? [String: Any] {
        let callerName = (metadata["caller_name"] as? String) ?? ""
        let callerNumber = (metadata["caller_number"] as? String) ?? ""
        let callId = (metadata["call_id"] as? String) ?? UUID().uuidString
        
        let data = flutter_callkit_incoming.Data(
            id: callId,
            nameCaller: callerName,
            handle: callerNumber,
            type: 0
        )
        data.extra = payload.dictionaryPayload as NSDictionary
        
        SwiftFlutterCallkitIncomingPlugin.sharedInstance?
            .showCallkitIncoming(data, fromPushKit: true)
    }
}
```

### 2. Handle in Flutter

```dart
FlutterCallkitIncoming.onEvent.listen((CallEvent? event) {
  switch (event!.event) {
    case Event.actionCallIncoming:
      PushMetaData? pushMetaData = PushMetaData.fromJson(
        event.body['extra']['metadata']
      );
      telnyxClient.handlePushNotification(
        pushMetaData,
        credentialConfig,
        tokenConfig,
      );
      break;
    case Event.actionCallAccept:
      // Handle accept
      break;
  }
});
```

---

## Handling Late Notifications

```dart
const CALL_MISSED_TIMEOUT = 60;  // seconds

void handlePushMessage(RemoteMessage message) {
  DateTime now = DateTime.now();
  Duration? diff = now.difference(message.sentTime!);
  
  if (diff.inSeconds > CALL_MISSED_TIMEOUT) {
    showMissedCallNotification(message);
    return;
  }
  
  // Handle normal incoming call...
}
```

---

## Call Quality Metrics

Enable with `debug: true` in config:

```dart
// When making a call
call.newInvite(
  callerName: 'John',
  callerNumber: '+15551234567',
  destinationNumber: '+15559876543',
  clientState: 'state',
  debug: true,
);

// Listen for quality updates
call.onCallQualityChange = (CallQualityMetrics metrics) {
  print('MOS: ${metrics.mos}');
  print('Jitter: ${metrics.jitter * 1000} ms');
  print('RTT: ${metrics.rtt * 1000} ms');
  print('Quality: ${metrics.quality}');  // excellent, good, fair, poor, bad
};
```

| Quality Level | MOS Range |
|---------------|-----------|
| excellent | > 4.2 |
| good | 4.1 - 4.2 |
| fair | 3.7 - 4.0 |
| poor | 3.1 - 3.6 |
| bad | ≤ 3.0 |

---

## AI Agent Integration

Connect to a Telnyx Voice AI Agent:

### 1. Anonymous Login

```dart
try {
  await telnyxClient.anonymousLogin(
    targetId: 'your_ai_assistant_id',
    targetType: 'ai_assistant',  // Default
    targetVersionId: 'optional_version_id',  // Optional
  );
} catch (e) {
  print('Login failed: $e');
}
```

### 2. Start Conversation

```dart
telnyxClient.newInvite(
  'User Name',
  '+15551234567',
  '',  // Destination ignored for AI Agent
  'state',
  customHeaders: {
    'X-Account-Number': '123',  // Maps to {{account_number}}
    'X-User-Tier': 'premium',   // Maps to {{user_tier}}
  },
);
```

### 3. Receive Transcripts

```dart
telnyxClient.onTranscriptUpdate = (List<TranscriptItem> transcript) {
  for (var item in transcript) {
    print('${item.role}: ${item.content}');
    // role: 'user' or 'assistant'
    // content: transcribed text
    // timestamp: when received
  }
};

// Get current transcript anytime
List<TranscriptItem> current = telnyxClient.transcript;

// Clear transcript
telnyxClient.clearTranscript();
```

### 4. Send Text to AI Agent

```dart
Call? activeCall = telnyxClient.calls.values.firstOrNull;

if (activeCall != null) {
  activeCall.sendConversationMessage(
    'Hello, I need help with my account'
  );
}
```

---

## Custom Logging

```dart
class MyCustomLogger extends CustomLogger {
  @override
  log(LogLevel level, String message) {
    print('[$level] $message');
    // Send to analytics, file, server, etc.
  }
}

final config = CredentialConfig(
  // ... other config
  logLevel: LogLevel.debug,
  customLogger: MyCustomLogger(),
);
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No audio on Android | Check RECORD_AUDIO permission |
| No audio on iOS | Check NSMicrophoneUsageDescription in Info.plist |
| Push not working (debug) | Push only works in release mode |
| Login fails | Verify SIP credentials in Telnyx Portal |
| 10-second timeout | INVITE didn't arrive - check network/push setup |
| sender_id_mismatch | FCM project mismatch between app and server |

<!-- BEGIN AUTO-GENERATED API REFERENCE -- do not edit below this line -->

**[references/webrtc-server-api.md](references/webrtc-server-api.md) has the server-side WebRTC API — credential creation, token generation, and push notification setup. You MUST read it when setting up authentication or push notifications.**

## API Reference


### TxClient

### Telnyx Client

TelnyxClient() is the core class of the SDK, and can be used to connect to our backend socket connection, create calls, check state and disconnect, etc.

```dart
    TelnyxClient _telnyxClient = TelnyxClient();
```
### Logging into Telnyx Client

To log into the Telnyx WebRTC client, you'll need to authenticate using a Telnyx SIP Connection. Follow our [quickstart guide](https://developers.telnyx.com/docs/v2/webrtc/quickstart) to create **JWTs** (JSON Web Tokens) to authenticate. To log in with a token we use the connectWithToken() method. You can also authenticate directly with the SIP Connection `username` and `password` with the connectWithCredential() method:

```dart
    _telnyxClient.connectWithToken(tokenConfig)
                     //OR
    _telnyxClient.connectWithCredential(credentialConfig)             
 ```
### Listening for events and reacting - Accepting a Call

In order to be able to accept a call, we first need to listen for invitations. We do this by getting the Telnyx Socket Response callbacks from our TelnyxClient:


### Call

### Call

The Call class is used to manage the call state and call actions. It is used to accept, decline, end, mute, hold, and send DTMF tones during a call.
### Accept Call

In order to accept a call, we simply retrieve the instance of the call and use the .acceptCall(callID) method:

```dart
    _telnyxClient.call.acceptCall(_incomingInvite?.callID);
```
### Decline / End Call

In order to end a call, we can get a stored instance of Call and call the .endCall(callID) method. To decline an incoming call we first create the call with the .createCall() method and then call the .endCall(callID) method:

```dart
    if (_ongoingCall) {
      _telnyxClient.call.endCall(_telnyxClient.call.callId);
    } else {
      _telnyxClient.createCall().endCall(_incomingInvite?.callID);
    }
```
### DTMF (Dual Tone Multi Frequency)

In order to send a DTMF message while on a call you can call the .dtmf(callID, tone), method where tone is a String value of the character you would like pressed:

```dart
    _telnyxClient.call.dtmf(_telnyxClient.call.callId, tone);
```
### Mute a call

To mute a call, you can simply call the .onMuteUnmutePressed() method:

```dart
    _telnyxClient.call.onMuteUnmutePressed();
```
### Toggle loud speaker

To toggle loud speaker, you can simply call .enableSpeakerPhone(bool):

```dart
    _telnyxClient.call.enableSpeakerPhone(true);
```
### Put a call on hold

To put a call on hold, you can simply call the .onHoldUnholdPressed() method:

```dart
    _telnyxClient.call.onHoldUnholdPressed();
```

<!-- END AUTO-GENERATED API REFERENCE -->
