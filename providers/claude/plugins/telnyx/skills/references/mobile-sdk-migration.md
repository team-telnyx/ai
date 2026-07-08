# Mobile SDK Migration: Twilio Voice SDK to Telnyx WebRTC (iOS, Android, React Native, Flutter)

Migrate native mobile VoIP clients from Twilio Voice SDK to Telnyx WebRTC SDK.

For browser-based WebRTC migration (JavaScript), see `{baseDir}/references/webrtc-migration.md`.

## Table of Contents

- [Migration Strategy Decision Tree](#migration-strategy-decision-tree)
- [Architecture Differences](#architecture-differences)
- [Push Notification Architecture (Critical)](#push-notification-architecture-critical)
- [iOS (Swift)](#ios-swift)
- [Android (Kotlin)](#android-kotlin)
- [React Native (TypeScript)](#react-native-typescript)
- [Flutter (Dart)](#flutter-dart)

---

## Migration Strategy Decision Tree

```
MOBILE CLIENT MIGRATION DECISION
─────────────────────────────────
Are you migrating server-side voice/messaging too?
├── YES → Migrate server-side FIRST, then mobile client
│         (Server and mobile client are independent — both SDKs coexist)
└── NO  → Only migrating mobile client?
    ├── YES → Proceed with mobile migration below
    └── Unsure → Start with server-side migration, keep Twilio mobile SDK temporarily

DEFAULT RECOMMENDATION: Migrate server first, mobile later.
Both Twilio and Telnyx mobile SDKs can coexist in the same app.
The server-side credential endpoint is the only shared dependency.
```

**Three migration paths:**

| Path | When to Use | Risk |
|---|---|---|
| **(a) Server only, keep Twilio mobile** | Mobile app is stable, no push issues | Lowest — mobile unchanged |
| **(b) Full migration (server + mobile)** | User specifically wants complete Telnyx migration | Medium — coordinate server + app release |
| **(c) Server first, mobile later** (default) | Multiple products, staged rollout | Lowest — each piece validates independently |

---

## Architecture Differences

**Twilio (mandatory backend for every session):**
```
Mobile App → Your Backend → Twilio API (get Access Token, TTL ~1hr)
           ← Access Token ←
Mobile App → Twilio (connect with Access Token)
           → Twilio calls your TwiML App webhook → Server returns <Dial>
```

**Telnyx (backend optional):**
```
Mobile App → Telnyx (connect with SIP credentials or JWT, TTL ~24hr)
Mobile App → client.newCall(destinationNumber) → Call connects directly to PSTN
```

| Aspect | Twilio | Telnyx |
|---|---|---|
| Auth model | Access Token per session (~1hr TTL), requires backend | SIP credentials (static) or JWT (~24hr TTL) |
| Backend requirement | Mandatory for every session | Only for dynamic credential management |
| Outbound calls | Requires TwiML webhook round-trip | Direct PSTN dial from client |
| Push config | Per-credential via API | Per-connection in Mission Control Portal |
| Hold/Transfer | Server-side only | Built into client SDK |

---

## Push Notification Architecture (Critical)

**This is the #1 migration failure point.** If push notifications are not configured correctly, incoming calls will not ring on the device.

### Twilio vs Telnyx Push Configuration

| Aspect | Twilio | Telnyx |
|---|---|---|
| **Where configured** | Per-credential via API (`credential.create()`) | Per-connection in Mission Control Portal |
| **iOS (APNs)** | Upload certificate via API call | Upload certificate in Portal → SIP → Connections → Push Credentials |
| **Android (FCM)** | Pass FCM server key via API call | Configure FCM server key in Portal → SIP → Connections → Push Credentials |
| **Scope** | Each credential has its own push config | One push config applies to ALL credentials on the connection |

### Migration Steps for Push

1. **iOS**: Export your APNs certificate (.p12 or .p8). Upload it in Telnyx Mission Control Portal → **SIP** → **Connections** → select your WebRTC connection → **Push Credentials** → **Apple Push (VoIP)**. Enter your bundle ID and team ID.

2. **Android**: Copy your FCM server key (or service account JSON). Configure it in Telnyx Mission Control Portal → **SIP** → **Connections** → select your WebRTC connection → **Push Credentials** → **Firebase Cloud Messaging**.

3. **Verify**: After configuring, make a test inbound call to the mobile device with the app in the background. If the device doesn't ring, push is misconfigured.

---

## iOS (Swift)

### Concept Mapping

| Twilio (iOS) | Telnyx (iOS) | Notes |
|---|---|---|
| `TwilioVoiceSDK` / `TwilioVoice` | `TelnyxRTC` | Import module |
| `TVOCall` | `Call` | Active call object |
| `TVOCallDelegate` | `TxClientDelegate` | Call/client events |
| `TVOCallInvite` | `onIncomingCall(call:)` / `onPushCall(call:)` | Incoming call handling |
| `CXProvider` | `CXProvider` (same) | CallKit integration unchanged |
| `TVOCancelledCallInvite` | `CallState.DONE` | Call cancelled |
| `accessToken` | `TxConfig(sipUser:password:)` or `TxConfig(token:)` | Auth mechanism |
| `TwilioVoiceSDK.connect()` | `telnyxClient.connect(txConfig:)` | Connect to backend |
| `call.disconnect()` | `call.hangup()` | End call |
| `call.mute` (property) | `call.muteAudio()` / `call.unmuteAudio()` | Separate methods |
| `call.sendDigits()` | `call.dtmf(digit:)` | DTMF |
| `call.hold` (property) | `call.hold()` / `call.unhold()` | Separate methods |
| `TwilioVoiceSDK.register()` | Pass `pushDeviceToken` in `TxConfig` | Push token registration |
| `TwilioVoiceSDK.handleNotification()` | `telnyxClient.processVoIPNotification()` | Push handling |

### Installation

```ruby
# Remove Twilio
# pod 'TwilioVoice'

# Add Telnyx
pod 'TelnyxRTC', '~> 0.1.0'
```

```bash
pod install --repo-update
```

Or via Swift Package Manager:
1. In Xcode: File → Add Packages
2. Enter: `https://github.com/team-telnyx/telnyx-webrtc-ios.git`
3. Select the `main` branch

### Platform Configuration

1. **Disable Bitcode**: Build Settings → "Bitcode" → Set to "NO"

2. **Enable Background Modes**: Signing & Capabilities → +Capability → Background Modes:
   - Voice over IP
   - Audio, AirPlay, and Picture in Picture

3. **Microphone Permission** (`Info.plist`):
   ```xml
   <key>NSMicrophoneUsageDescription</key>
   <string>Microphone access required for VoIP calls</string>
   ```

### Client Initialization

**Credential-based:**

```swift
import TelnyxRTC

let telnyxClient = TxClient()
telnyxClient.delegate = self

let txConfig = TxConfig(
    sipUser: "your_sip_username",
    password: "your_sip_password",
    pushDeviceToken: "DEVICE_APNS_TOKEN",
    ringtone: "incoming_call.mp3",
    ringBackTone: "ringback_tone.mp3",
    logLevel: .all
)

do {
    try telnyxClient.connect(txConfig: txConfig)
} catch {
    print("Connection error: \(error)")
}
```

**Token-based (JWT):**

```swift
let txConfig = TxConfig(
    token: "your_jwt_token",
    pushDeviceToken: "DEVICE_APNS_TOKEN",
    ringtone: "incoming_call.mp3",
    ringBackTone: "ringback_tone.mp3",
    logLevel: .all
)

try telnyxClient.connect(txConfig: txConfig)
```

**Region selection (optional):**

```swift
let serverConfig = TxServerConfiguration(
    environment: .production,
    region: .usEast  // .auto, .usEast, .usCentral, .usWest, .caCentral, .eu, .apac
)

try telnyxClient.connect(txConfig: txConfig, serverConfiguration: serverConfig)
```

### Client Delegate

```swift
extension ViewController: TxClientDelegate {

    func onSocketConnected() {
        // Connected to Telnyx backend
    }

    func onSocketDisconnected() {
        // Disconnected from backend
    }

    func onClientReady() {
        // Ready to make/receive calls
    }

    func onClientError(error: Error) {
        // Handle error
    }

    func onIncomingCall(call: Call) {
        // Incoming call while app is in foreground
        self.currentCall = call
    }

    func onPushCall(call: Call) {
        // Incoming call from push notification
        self.currentCall = call
    }

    func onCallStateUpdated(callState: CallState, callId: UUID) {
        switch callState {
        case .CONNECTING:
            break
        case .RINGING:
            break
        case .ACTIVE:
            break
        case .HELD:
            break
        case .DONE(let reason):
            if let reason = reason {
                print("Call ended: \(reason.cause ?? "Unknown")")
            }
        case .RECONNECTING(let reason):
            print("Reconnecting: \(reason.rawValue)")
        case .DROPPED(let reason):
            print("Dropped: \(reason.rawValue)")
        }
    }
}
```

### Making Calls

```swift
let call = try telnyxClient.newCall(
    callerName: "John Doe",
    callerNumber: "+15551234567",
    destinationNumber: "+18004377950",
    callId: UUID()
)
```

### Receiving Calls

```swift
func onIncomingCall(call: Call) {
    self.currentCall = call
    call.answer()
}
```

### Call Controls

```swift
// End call
call.hangup()

// Mute/Unmute
call.muteAudio()
call.unmuteAudio()

// Hold/Unhold
call.hold()
call.unhold()

// Send DTMF
call.dtmf(digit: "1")
```

### Push Notifications (PushKit + CallKit)

**This section is critical. Incorrect push setup = incoming calls don't ring.**

#### 1. Configure PushKit

```swift
import PushKit

class AppDelegate: UIResponder, UIApplicationDelegate, PKPushRegistryDelegate {

    private var pushRegistry = PKPushRegistry(queue: .main)

    func initPushKit() {
        pushRegistry.delegate = self
        pushRegistry.desiredPushTypes = [.voIP]
    }

    func pushRegistry(_ registry: PKPushRegistry,
                      didUpdate credentials: PKPushCredentials,
                      for type: PKPushType) {
        if type == .voIP {
            let token = credentials.token.map { String(format: "%02X", $0) }.joined()
            // Save token for use in TxConfig
        }
    }

    func pushRegistry(_ registry: PKPushRegistry,
                      didReceiveIncomingPushWith payload: PKPushPayload,
                      for type: PKPushType,
                      completion: @escaping () -> Void) {
        if type == .voIP {
            handleVoIPPush(payload: payload)
        }
        completion()
    }
}
```

#### 2. Handle VoIP Push

```swift
func handleVoIPPush(payload: PKPushPayload) {
    guard let metadata = payload.dictionaryPayload["metadata"] as? [String: Any] else { return }

    let callId = metadata["call_id"] as? String ?? UUID().uuidString
    let callerName = (metadata["caller_name"] as? String) ?? ""
    let callerNumber = (metadata["caller_number"] as? String) ?? ""

    // Reconnect client and process push
    let txConfig = TxConfig(sipUser: sipUser, password: password, pushDeviceToken: token)
    try? telnyxClient.processVoIPNotification(
        txConfig: txConfig,
        serverConfiguration: serverConfig,
        pushMetaData: metadata
    )

    // Report to CallKit (REQUIRED on iOS 13+)
    let callHandle = CXHandle(type: .generic, value: callerNumber)
    let callUpdate = CXCallUpdate()
    callUpdate.remoteHandle = callHandle

    provider.reportNewIncomingCall(with: UUID(uuidString: callId)!, update: callUpdate) { error in
        if let error = error {
            print("Failed to report call: \(error)")
        }
    }
}
```

#### 3. CallKit Integration

```swift
import CallKit

class AppDelegate: CXProviderDelegate {

    var callKitProvider: CXProvider!

    func initCallKit() {
        let config = CXProviderConfiguration(localizedName: "TelnyxRTC")
        config.maximumCallGroups = 1
        config.maximumCallsPerCallGroup = 1
        callKitProvider = CXProvider(configuration: config)
        callKitProvider.setDelegate(self, queue: nil)
    }

    // CRITICAL: Audio session handling for WebRTC + CallKit
    func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession) {
        telnyxClient.enableAudioSession(audioSession: audioSession)
    }

    func provider(_ provider: CXProvider, didDeactivate audioSession: AVAudioSession) {
        telnyxClient.disableAudioSession(audioSession: audioSession)
    }

    func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
        // Use SDK method to handle race conditions
        telnyxClient.answerFromCallkit(answerAction: action)
    }

    func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
        telnyxClient.endCallFromCallkit(endAction: action)
    }
}
```

### iOS Troubleshooting

| Issue | Solution |
|-------|----------|
| No audio | Ensure microphone permission granted in Info.plist |
| Push not working | Verify APNs certificate uploaded in Telnyx Portal → SIP → Connections → Push Credentials |
| CallKit crash on iOS 13+ | Must report incoming call to CallKit before processing — Apple requirement |
| Audio routing issues | Use `enableAudioSession`/`disableAudioSession` in CXProviderDelegate callbacks |
| Login fails | Verify SIP credentials in Telnyx Portal → SIP → Connections |
| No incoming calls | Confirm `pushDeviceToken` is passed in TxConfig and APNs cert matches bundle ID |

---

## Android (Kotlin)

### Concept Mapping

| Twilio (Android) | Telnyx (Android) | Notes |
|---|---|---|
| `com.twilio.voice.Voice` | `TelnyxClient` | Main SDK class |
| `com.twilio.voice.Call` | `Call` | Active call object |
| `com.twilio.voice.CallInvite` | `InviteResponse` via `SocketMethod.INVITE` | Incoming call |
| `com.twilio.voice.Call.Listener` | `socketResponseFlow` (SharedFlow) | Event handling |
| `Voice.connect()` | `telnyxClient.call.newInvite()` | Make outbound call |
| `callInvite.accept()` | `telnyxClient.acceptCall()` | Answer call |
| `call.disconnect()` | `currentCall.endCall(callId)` | End call |
| `call.mute(bool)` | `currentCall.onMuteUnmutePressed()` | Toggle mute |
| `call.hold(bool)` | `currentCall.onHoldUnholdPressed(callId)` | Toggle hold |
| `call.sendDigits()` | `currentCall.dtmf(callId, digit)` | DTMF |
| `Voice.register()` | Pass `fcmToken` in `CredentialConfig` | Push registration |
| `Voice.handleMessage()` | Parse FCM `remoteMessage.data` | Push handling |
| `accessToken` | `CredentialConfig` or `TokenConfig` | Auth mechanism |

### Installation

Add JitPack repository to project `build.gradle`:

```gradle
allprojects {
    repositories {
        maven { url 'https://jitpack.io' }
    }
}
```

Replace dependencies:

```gradle
dependencies {
    // Remove Twilio
    // implementation 'com.twilio:voice-android:latest'

    // Add Telnyx
    implementation 'com.github.team-telnyx:telnyx-webrtc-android:latest-version'
}
```

### Platform Configuration

Add to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- For push notifications (Android 14+) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_PHONE_CALL"/>
```

### Client Initialization

**Credential-based:**

```kotlin
val telnyxClient = TelnyxClient(context)
telnyxClient.connect()

val credentialConfig = CredentialConfig(
    sipUser = "your_sip_username",
    sipPassword = "your_sip_password",
    sipCallerIDName = "Display Name",
    sipCallerIDNumber = "+15551234567",
    fcmToken = fcmToken,
    logLevel = LogLevel.DEBUG,
    autoReconnect = true
)

telnyxClient.credentialLogin(credentialConfig)
```

**Token-based (JWT):**

```kotlin
val tokenConfig = TokenConfig(
    sipToken = "your_jwt_token",
    sipCallerIDName = "Display Name",
    sipCallerIDNumber = "+15551234567",
    fcmToken = fcmToken,
    logLevel = LogLevel.DEBUG,
    autoReconnect = true
)

telnyxClient.tokenLogin(tokenConfig)
```

### Making Calls

```kotlin
telnyxClient.call.newInvite(
    callerName = "John Doe",
    callerNumber = "+15551234567",
    destinationNumber = "+15559876543",
    clientState = "my-custom-state"
)
```

### Receiving Calls

```kotlin
lifecycleScope.launch {
    telnyxClient.socketResponseFlow.collect { response ->
        when (response.status) {
            SocketStatus.ESTABLISHED -> {
                // Socket connected
            }
            SocketStatus.MESSAGERECEIVED -> {
                response.data?.let { data ->
                    when (data.method) {
                        SocketMethod.CLIENT_READY.methodName -> {
                            // Ready to make/receive calls
                        }
                        SocketMethod.LOGIN.methodName -> {
                            // Successfully logged in
                        }
                        SocketMethod.INVITE.methodName -> {
                            // Incoming call
                            val invite = data.result as InviteResponse
                            telnyxClient.acceptCall(
                                invite.callId,
                                invite.callerIdNumber
                            )
                        }
                        SocketMethod.ANSWER.methodName -> {
                            // Call was answered
                        }
                        SocketMethod.BYE.methodName -> {
                            // Call ended
                        }
                        SocketMethod.RINGING.methodName -> {
                            // Remote party is ringing
                        }
                    }
                }
            }
            SocketStatus.ERROR -> {
                // Handle error
            }
            SocketStatus.DISCONNECT -> {
                // Socket disconnected
            }
        }
    }
}
```

### Call Controls

```kotlin
val currentCall: Call? = telnyxClient.calls[callId]

// End call
currentCall?.endCall(callId)

// Mute/Unmute (toggle)
currentCall?.onMuteUnmutePressed()

// Hold/Unhold (toggle)
currentCall?.onHoldUnholdPressed(callId)

// Send DTMF tone
currentCall?.dtmf(callId, "1")
```

### Push Notifications (FCM)

**This section is critical. Incorrect push setup = incoming calls don't ring.**

#### 1. Get FCM Token

```kotlin
FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
    if (task.isSuccessful) {
        val fcmToken = task.result
        // Use this token in CredentialConfig or TokenConfig
    }
}
```

#### 2. Handle Incoming Push

```kotlin
class MyFirebaseService : FirebaseMessagingService() {
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        val params = remoteMessage.data
        val metadata = JSONObject(params as Map<*, *>).getString("metadata")

        // Check for missed call
        if (params["message"] == "Missed call!") {
            // Show missed call notification
            return
        }

        // Show incoming call notification (use Foreground Service)
        showIncomingCallNotification(metadata)
    }
}
```

#### 3. Decline Push Call

```kotlin
// The SDK handles decline automatically
telnyxClient.connectWithDeclinePush(
    txPushMetaData = pushMetaData,
    credentialConfig = credentialConfig
)
// SDK connects, sends decline, and disconnects automatically
```

#### 4. Android 14+ Foreground Service

```xml
<service
    android:name=".YourForegroundService"
    android:foregroundServiceType="phoneCall"
    android:exported="true" />
```

#### ProGuard Rules

```proguard
-keep class com.telnyx.webrtc.** { *; }
-dontwarn kotlin.Experimental$Level
-dontwarn kotlin.Experimental
-dontwarn kotlinx.coroutines.scheduling.ExperimentalCoroutineDispatcher
```

### Android Troubleshooting

| Issue | Solution |
|-------|----------|
| No audio | Check RECORD_AUDIO permission is granted at runtime |
| Push not received | Verify FCM server key in Telnyx Portal → SIP → Connections → Push Credentials |
| Login fails | Verify SIP credentials in Telnyx Portal |
| Call drops | Check network stability, enable `autoReconnect = true` |
| sender_id_mismatch (push) | FCM project mismatch — `google-services.json` must match server credentials in Portal |
| Android 14 crash | Add `FOREGROUND_SERVICE_PHONE_CALL` permission and `foregroundServiceType="phoneCall"` |

---

## React Native (TypeScript)

### Concept Mapping

| Twilio (React Native) | Telnyx (React Native) | Notes |
|---|---|---|
| `@twilio/voice-react-native-sdk` | `@telnyx/react-voice-commons-sdk` | Package |
| `Voice.connect()` | `voipClient.newCall()` | Make outbound call |
| `Voice.register()` | Pass `pushNotificationDeviceToken` in config | Push registration |
| `callInvite.accept()` | `call.answer()` | Answer call |
| `call.disconnect()` | `call.hangup()` | End call |
| `call.mute(bool)` | `call.mute()` / `call.unmute()` | Separate methods |
| `call.hold(bool)` | `call.hold()` / `call.unhold()` | Separate methods |
| `call.sendDigits()` | `call.dtmf()` | DTMF |
| Event listeners | RxJS observables (`connectionState$`, `calls$`) | Reactive streams |
| Manual CallKit/ConnectionService | Automatic via `TelnyxVoiceApp` wrapper | Built-in native call UI |

### Installation

```bash
# Remove Twilio
npm uninstall @twilio/voice-react-native-sdk

# Add Telnyx
npm install @telnyx/react-voice-commons-sdk
```

### Basic Setup

```tsx
import { TelnyxVoiceApp, createTelnyxVoipClient } from '@telnyx/react-voice-commons-sdk';

const voipClient = createTelnyxVoipClient({
  enableAppStateManagement: true,  // Auto background/foreground handling
  debug: true,
});

export default function App() {
  return (
    <TelnyxVoiceApp
      voipClient={voipClient}
      enableAutoReconnect={false}
      debug={true}
    >
      <YourAppContent />
    </TelnyxVoiceApp>
  );
}
```

### Client Initialization

**Credential-based:**

```tsx
import { createCredentialConfig } from '@telnyx/react-voice-commons-sdk';

const config = createCredentialConfig('sip_username', 'sip_password', {
  debug: true,
  pushNotificationDeviceToken: 'your_device_token',
});

await voipClient.login(config);
```

**Token-based (JWT):**

```tsx
import { createTokenConfig } from '@telnyx/react-voice-commons-sdk';

const config = createTokenConfig('your_jwt_token', {
  debug: true,
  pushNotificationDeviceToken: 'your_device_token',
});

await voipClient.loginWithToken(config);
```

**Auto-reconnection:**

```tsx
// Automatically reconnects using stored credentials
const success = await voipClient.loginFromStoredConfig();
if (!success) {
  // No stored auth — show login UI
}
```

### Reactive State Management

```tsx
import { useEffect, useState } from 'react';

function CallScreen() {
  const [connectionState, setConnectionState] = useState(null);
  const [calls, setCalls] = useState([]);

  useEffect(() => {
    const connSub = voipClient.connectionState$.subscribe((state) => {
      setConnectionState(state);
    });

    const callsSub = voipClient.calls$.subscribe((activeCalls) => {
      setCalls(activeCalls);
    });

    return () => {
      connSub.unsubscribe();
      callsSub.unsubscribe();
    };
  }, []);

  return (/* UI */);
}
```

### Making Calls

```tsx
const call = await voipClient.newCall('+18004377950');
```

### Call Controls

```tsx
await call.answer();
await call.mute();
await call.unmute();
await call.hold();
await call.unhold();
await call.hangup();
await call.dtmf('1');
```

### Push Notifications — Android (FCM)

#### 1. Place `google-services.json` in project root

#### 2. MainActivity Setup

```kotlin
// MainActivity.kt
import com.telnyx.react_voice_commons.TelnyxMainActivity

class MainActivity : TelnyxMainActivity() {
    override fun onHandleIntent(intent: Intent) {
        super.onHandleIntent(intent)
    }
}
```

#### 3. Background Message Handler

```tsx
// index.js or App.tsx
import messaging from '@react-native-firebase/messaging';
import { TelnyxVoiceApp } from '@telnyx/react-voice-commons-sdk';

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  await TelnyxVoiceApp.handleBackgroundPush(remoteMessage.data);
});
```

### Push Notifications — iOS (PushKit)

#### AppDelegate Setup

```swift
// AppDelegate.swift
import PushKit
import TelnyxVoiceCommons

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate, PKPushRegistryDelegate {

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    TelnyxVoipPushHandler.initializeVoipRegistration()
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  public func pushRegistry(_ registry: PKPushRegistry,
                           didUpdate pushCredentials: PKPushCredentials,
                           for type: PKPushType) {
    TelnyxVoipPushHandler.shared.handleVoipTokenUpdate(pushCredentials, type: type)
  }

  public func pushRegistry(_ registry: PKPushRegistry,
                           didReceiveIncomingPushWith payload: PKPushPayload,
                           for type: PKPushType,
                           completion: @escaping () -> Void) {
    TelnyxVoipPushHandler.shared.handleVoipPush(payload, type: type, completion: completion)
  }
}
```

CallKit integration is handled automatically by the `TelnyxVoiceApp` wrapper's internal CallBridge component.

### React Native Troubleshooting

| Issue | Solution |
|-------|----------|
| Double login | Don't call `login()` manually when using `TelnyxVoiceApp` with auto-reconnect |
| Background disconnect | Check `enableAutoReconnect` prop on `TelnyxVoiceApp` |
| Android push not working | Verify `google-services.json` and MainActivity extends `TelnyxMainActivity` |
| iOS push not working | Ensure AppDelegate implements `PKPushRegistryDelegate` and calls `TelnyxVoipPushHandler` |
| Memory leaks | Unsubscribe from RxJS observables in useEffect cleanup |

---

## Flutter (Dart)

### Concept Mapping

| Twilio (Flutter) | Telnyx (Flutter) | Notes |
|---|---|---|
| `twilio_voice` package | `telnyx_webrtc` package | pub.dev package |
| `TwilioVoice.instance` | `TelnyxClient()` | Main SDK class |
| `TwilioVoice.makeCall()` | `telnyxClient.call.newInvite()` | Make outbound call |
| `TwilioVoice.register()` | Pass `notificationToken` in config | Push registration |
| `callInvite.accept()` | `telnyxClient.acceptCall()` | Answer call |
| `call.disconnect()` | `telnyxClient.call.endCall(callId)` | End call |
| `call.mute(bool)` | `telnyxClient.call.onMuteUnmutePressed()` | Toggle mute |
| `call.hold(bool)` | `telnyxClient.call.onHoldUnholdPressed()` | Toggle hold |
| `call.sendDigits()` | `telnyxClient.call.dtmf(callId, digit)` | DTMF |
| Event stream | `onSocketMessageReceived` callback | Socket events |

### Installation

Update `pubspec.yaml`:

```yaml
dependencies:
  # Remove Twilio
  # twilio_voice: ^latest

  # Add Telnyx
  telnyx_webrtc: ^latest_version
```

```bash
flutter pub get
```

### Platform Configuration

**Android** — add to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

**iOS** — add to `Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>$(PRODUCT_NAME) needs microphone access for calls</string>
```

### Client Initialization

**Credential-based:**

```dart
final telnyxClient = TelnyxClient();

final credentialConfig = CredentialConfig(
  sipUser: 'your_sip_username',
  sipPassword: 'your_sip_password',
  sipCallerIDName: 'Display Name',
  sipCallerIDNumber: '+15551234567',
  notificationToken: fcmOrApnsToken,
  autoReconnect: true,
  debug: true,
  logLevel: LogLevel.debug,
);

telnyxClient.connectWithCredential(credentialConfig);
```

**Token-based (JWT):**

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

### Making Calls

```dart
telnyxClient.call.newInvite(
  'John Doe',           // callerName
  '+15551234567',       // callerNumber
  '+15559876543',       // destinationNumber
  'my-custom-state',    // clientState
);
```

### Receiving Calls

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
      // Incoming call
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

### Call Controls

```dart
// End call
telnyxClient.call.endCall(telnyxClient.call.callId);

// Mute/Unmute (toggle)
telnyxClient.call.onMuteUnmutePressed();

// Hold/Unhold (toggle)
telnyxClient.call.onHoldUnholdPressed();

// Toggle speaker
telnyxClient.call.enableSpeakerPhone(true);

// Send DTMF tone
telnyxClient.call.dtmf(telnyxClient.call.callId, '1');
```

### Push Notifications — Android (FCM)

#### 1. Setup Firebase

```dart
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

#### 2. Background Handler

```dart
Future<void> _firebaseBackgroundHandler(RemoteMessage message) async {
  showIncomingCallNotification(message);

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
          isDecline: true,
        );
        break;
    }
  });
}
```

#### 3. Handle Push When App Opens

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

#### Early Accept/Decline Handling

The INVITE message from the Telnyx backend may arrive after the user taps "Accept" on the push notification UI. Handle this race condition:

```dart
bool _waitingForInvite = false;

void acceptCall() {
  if (_incomingInvite != null) {
    _currentCall = telnyxClient.acceptCall(...);
  } else {
    _waitingForInvite = true;
  }
}

// In socket message handler:
case SocketMethod.INVITE:
  _incomingInvite = message.message.inviteParams;
  if (_waitingForInvite) {
    acceptCall();
    _waitingForInvite = false;
  }
  break;
```

### Push Notifications — iOS (APNs + PushKit)

#### AppDelegate Setup

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

#### Handle in Flutter

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

### Handling Late Notifications

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

### Flutter Troubleshooting

| Issue | Solution |
|-------|----------|
| No audio on Android | Check RECORD_AUDIO permission granted at runtime |
| No audio on iOS | Check NSMicrophoneUsageDescription in Info.plist |
| Push not working (debug) | Push notifications only work in release mode on iOS |
| Login fails | Verify SIP credentials in Telnyx Portal |
| 10-second timeout | INVITE didn't arrive — check network connectivity and push setup |
| sender_id_mismatch | FCM project mismatch between app's `google-services.json` and server credentials |
| iOS push not ringing | Verify APNs certificate in Portal matches app's bundle ID and provisioning profile |
