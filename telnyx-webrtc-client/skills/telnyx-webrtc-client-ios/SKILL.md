---
name: telnyx-webrtc-client-ios
description: >-
  Build VoIP calling apps on iOS using Telnyx WebRTC SDK. Covers authentication,
  making/receiving calls, CallKit integration, PushKit/APNS push notifications,
  call quality metrics, and AI Agent integration. Use when implementing real-time
  voice communication on iOS.
metadata:
  internal: true
  author: telnyx
  product: webrtc
  language: swift
  platform: ios
---

# Telnyx WebRTC - iOS SDK

Build real-time voice communication into iOS applications using Telnyx WebRTC.

> **Prerequisites**: Create WebRTC credentials and generate a login token using the Telnyx server-side SDK. See the `telnyx-webrtc-*` skill in your server language plugin (e.g., `telnyx-python`, `telnyx-javascript`).

## Installation

### CocoaPods

```ruby
pod 'TelnyxRTC', '~> 0.1.0'
```

Then run:

```bash
pod install --repo-update
```

### Swift Package Manager

1. In Xcode: File → Add Packages
2. Enter: `https://github.com/team-telnyx/telnyx-webrtc-ios.git`
3. Select the `main` branch

## Project Configuration

1. **Disable Bitcode**: Build Settings → "Bitcode" → Set to "NO"

2. **Enable Background Modes**: Signing & Capabilities → +Capability → Background Modes:
   - Voice over IP
   - Audio, AirPlay, and Picture in Picture

3. **Microphone Permission**: Add to `Info.plist`:
   ```xml
   <key>NSMicrophoneUsageDescription</key>
   <string>Microphone access required for VoIP calls</string>
   ```

---

## Authentication

### Option 1: Credential-Based Login

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

### Option 2: Token-Based Login (JWT)

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

### Configuration Options

| Parameter | Type | Description |
|-----------|------|-------------|
| `sipUser` / `token` | String | Credentials from Telnyx Portal |
| `password` | String | SIP password (credential auth) |
| `pushDeviceToken` | String? | APNS VoIP push token |
| `ringtone` | String? | Audio file for incoming calls |
| `ringBackTone` | String? | Audio file for ringback |
| `logLevel` | LogLevel | .none, .error, .warning, .debug, .info, .all |
| `forceRelayCandidate` | Bool | Force TURN relay (avoid local network) |

### Region Selection

```swift
let serverConfig = TxServerConfiguration(
    environment: .production,
    region: .usEast  // .auto, .usEast, .usCentral, .usWest, .caCentral, .eu, .apac
)

try telnyxClient.connect(txConfig: txConfig, serverConfiguration: serverConfig)
```

---

## Client Delegate

Implement `TxClientDelegate` to receive events:

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
                print("SIP: \(reason.sipCode ?? 0) \(reason.sipReason ?? "")")
            }
        case .RECONNECTING(let reason):
            print("Reconnecting: \(reason.rawValue)")
        case .DROPPED(let reason):
            print("Dropped: \(reason.rawValue)")
        }
    }
}
```

---

## Making Outbound Calls

```swift
let call = try telnyxClient.newCall(
    callerName: "John Doe",
    callerNumber: "+15551234567",
    destinationNumber: "+18004377950",
    callId: UUID()
)
```

---

## Receiving Inbound Calls

```swift
func onIncomingCall(call: Call) {
    // Store reference and show UI
    self.currentCall = call
    
    // Answer the call
    call.answer()
}
```

---

## Call Controls

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

// Toggle speaker
// (Use AVAudioSession for speaker routing)
```

---

## Push Notifications (PushKit + CallKit)

### 1. Configure PushKit

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

### 2. Handle VoIP Push

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

### 3. CallKit Integration

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

---

## Call Quality Metrics

Enable with `debug: true`:

```swift
let call = try telnyxClient.newCall(
    callerName: "John",
    callerNumber: "+15551234567",
    destinationNumber: "+18004377950",
    callId: UUID(),
    debug: true
)

call.onCallQualityChange = { metrics in
    print("MOS: \(metrics.mos)")
    print("Jitter: \(metrics.jitter * 1000) ms")
    print("RTT: \(metrics.rtt * 1000) ms")
    print("Quality: \(metrics.quality.rawValue)")
    
    switch metrics.quality {
    case .excellent, .good:
        // Green indicator
    case .fair:
        // Yellow indicator
    case .poor, .bad:
        // Red indicator
    case .unknown:
        // Gray indicator
    }
}
```

| Quality Level | MOS Range |
|---------------|-----------|
| .excellent | > 4.2 |
| .good | 4.1 - 4.2 |
| .fair | 3.7 - 4.0 |
| .poor | 3.1 - 3.6 |
| .bad | ≤ 3.0 |

---

## AI Agent Integration

### 1. Anonymous Login

```swift
client.anonymousLogin(
    targetId: "your-ai-assistant-id",
    targetType: "ai_assistant"
)
```

### 2. Start Conversation

```swift
// After anonymous login, destination is ignored
let call = client.newInvite(
    callerName: "User",
    callerNumber: "user",
    destinationNumber: "ai-assistant",  // Ignored
    callId: UUID()
)
```

### 3. Receive Transcripts

```swift
let cancellable = client.aiAssistantManager.subscribeToTranscriptUpdates { transcripts in
    for item in transcripts {
        print("\(item.role): \(item.content)")
        // role: "user" or "assistant"
    }
}
```

### 4. Send Text Message

```swift
let success = client.sendAIAssistantMessage("Hello, can you help me?")
```

---

## Custom Logging

```swift
class MyLogger: TxLogger {
    func log(level: LogLevel, message: String) {
        // Send to your logging service
        MyAnalytics.log(level: level, message: message)
    }
}

let txConfig = TxConfig(
    sipUser: sipUser,
    password: password,
    logLevel: .all,
    customLogger: MyLogger()
)
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No audio | Ensure microphone permission granted |
| Push not working | Verify APNS certificate in Telnyx Portal |
| CallKit crash on iOS 13+ | Must report incoming call to CallKit |
| Audio routing issues | Use `enableAudioSession`/`disableAudioSession` in CXProviderDelegate |
| Login fails | Verify SIP credentials in Telnyx Portal |

<!-- BEGIN AUTO-GENERATED API REFERENCE -- do not edit below this line -->

## API Reference


### TxClient

**CLASS**

# `TxClient`

```swift
public class TxClient
```

The `TelnyxRTC` client connects your application to the Telnyx backend,
enabling you to make outgoing calls and handle incoming calls.

### Examples
### Connect and login:

// Initialize the client
### Listen TxClient delegate events.

extension ViewController: TxClientDelegate {
### Methods
### `enableAudioSession(audioSession:)`

```swift
public func enableAudioSession(audioSession: AVAudioSession)
```

Enables and configures the audio session for a call.
This method sets up the appropriate audio configuration and activates the session.

- Parameter audioSession: The AVAudioSession instance to configure
- Important: This method MUST be called from the CXProviderDelegate's `provider(_:didActivate:)` callback
            to properly handle audio routing when using CallKit integration.

Example usage:
```swift
func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession) {
    print("provider:didActivateAudioSession:")
    self.telnyxClient.enableAudioSession(audioSession: audioSession)
}
```

**Parameters**

| Name | Description |
| ---- | ----------- |
| audioSession | The AVAudioSession instance to configure |

### `disableAudioSession(audioSession:)`

```swift
public func disableAudioSession(audioSession: AVAudioSession)
```

Disables and resets the audio session.
This method cleans up the audio configuration and deactivates the session.

- Parameter audioSession: The AVAudioSession instance to reset
- Important: This method MUST be called from the CXProviderDelegate's `provider(_:didDeactivate:)` callback
            to properly clean up audio resources when using CallKit integration.

Example usage:
```swift
func provider(_ provider: CXProvider, didDeactivate audioSession: AVAudioSession) {
    print("provider:didDeactivateAudioSession:")
    self.telnyxClient.disableAudioSession(audioSession: audioSession)
}
```

**Parameters**

| Name | Description |
| ---- | ----------- |
| audioSession | The AVAudioSession instance to reset |

### `init()`

```swift
public init()
```

TxClient has to be instantiated.

### `deinit`

```swift
deinit
```

Deinitializer to ensure proper cleanup of resources

### `connect(txConfig:serverConfiguration:)`

```swift
public func connect(txConfig: TxConfig,
                    serverConfiguration: TxServerConfiguration = TxServerConfiguration()) throws
```

Connects to the iOS cloglient to the Telnyx signaling server using the desired login credentials.
- Parameters:
  - txConfig: The desired login credentials. See TxConfig docummentation for more information.
  - serverConfiguration: (Optional) To define a custom `signaling server` and `TURN/ STUN servers`. As default we use the internal Telnyx Production servers.
- Throws: TxConfig parameters errors

**Parameters**

| Name | Description |
| ---- | ----------- |
| txConfig | The desired login credentials. See TxConfig docummentation for more information. |
| serverConfiguration | (Optional) To define a custom `signaling server` and `TURN/ STUN servers`. As default we use the internal Telnyx Production servers. |

### `disconnect()`

```swift
public func disconnect()
```

Disconnects the TxClient from the Telnyx signaling server.

### `isConnected()`

```swift
public func isConnected() -> Bool
```

To check if TxClient is connected to Telnyx server.
- Returns: `true` if TxClient socket is connected, `false` otherwise.

### `answerFromCallkit(answerAction:customHeaders:debug:)`

```swift
public func answerFromCallkit(answerAction: CXAnswerCallAction,
                              customHeaders: [String:String] = [:],
                              debug: Bool = false)
```

Answers an incoming call from CallKit and manages the active call flow.

This method should be called from the CXProviderDelegate's `provider(_:perform:)` method
when handling a `CXAnswerCallAction`. It properly integrates with CallKit to answer incoming calls.

### Examples:

extension CallKitProvider: CXProviderDelegate {
### `endCallFromCallkit(endAction:callId:)`

```swift
public func endCallFromCallkit(endAction: CXEndCallAction,
                               callId: UUID? = nil)
```

To end and control callKit active and conn

### `disablePushNotifications()`

```swift
public func disablePushNotifications()
```

To disable push notifications for the current user

### `getSessionId()`

```swift
public func getSessionId() -> String
```

Get the current session ID after logging into Telnyx Backend.
- Returns: The current sessionId. If this value is empty, that means that the client is not connected to Telnyx server.

### `anonymousLogin(targetId:targetType:targetVersionId:userVariables:reconnection:serverConfiguration:)`

```swift
public func anonymousLogin(
    targetId: String, 
    targetType: String = "ai_assistant", 
    targetVersionId: String? = nil,
    userVariables: [String: Any] = [:],
    reconnection: Bool = false,
    serverConfiguration: TxServerConfiguration = TxServerConfiguration()
)
```

Performs an anonymous login to the Telnyx backend for AI assistant connections.
This method allows connecting to AI assistants without traditional authentication.

If the socket is already connected, the anonymous login message is sent immediately.
If not connected, the socket connection process is started, and the anonymous login 
message is sent once the connection is established.

- Parameters:
  - targetId: The target ID for the AI assistant
  - targetType: The target type (defaults to "ai_assistant")
  - targetVersionId: Optional target version ID
  - userVariables: Optional user variables to include in the login
  - reconnection: Whether this is a reconnection attempt (defaults to false)
  - serverConfiguration: Server configuration to use for connection (defaults to TxServerConfiguration())

**Parameters**

| Name | Description |
| ---- | ----------- |
| targetId | The target ID for the AI assistant |
| targetType | The target type (defaults to “ai_assistant”) |
| targetVersionId | Optional target version ID |
| userVariables | Optional user variables to include in the login |
| reconnection | Whether this is a reconnection attempt (defaults to false) |
| serverConfiguration | Server configuration to use for connection (defaults to TxServerConfiguration()) |

### `sendRingingAck(callId:)`

```swift
public func sendRingingAck(callId: String)
```

Send a ringing acknowledgment message for a specific call
- Parameter callId: The call ID to acknowledge

**Parameters**

| Name | Description |
| ---- | ----------- |
| callId | The call ID to acknowledge |

### `sendAIAssistantMessage(_:)`

```swift
public func sendAIAssistantMessage(_ message: String) -> Bool
```

Send a text message to AI Assistant during active call (mixed-mode communication)
- Parameter message: The text message to send to AI assistant
- Returns: True if message was sent successfully, false otherwise

**Parameters**

| Name | Description |
| ---- | ----------- |
| message | The text message to send to AI assistant |

### `sendAIAssistantMessage(_:base64Images:imageFormat:)`

```swift
public func sendAIAssistantMessage(_ message: String, base64Images: [String]?, imageFormat: String = "jpeg") -> Bool
```

Send a text message with multiple Base64 encoded images to AI Assistant during active call
- Parameters:
  - message: The text message to send to AI assistant
  - base64Images: Optional array of Base64 encoded image data (without data URL prefix)
  - imageFormat: Image format (jpeg, png, etc.). Defaults to "jpeg"
- Returns: True if message was sent successfully, false otherwise

**Parameters**

| Name | Description |
| ---- | ----------- |
| message | The text message to send to AI assistant |
| base64Images | Optional array of Base64 encoded image data (without data URL prefix) |
| imageFormat | Image format (jpeg, png, etc.). Defaults to “jpeg” |


### Call

**CLASS**

# `Call`

```swift
public class Call
```

A Call represents an audio or video communication session between two endpoints: WebRTC Clients, SIP clients, or phone numbers.
The Call object manages the entire lifecycle of a call, from initiation to termination, handling both outbound and inbound calls.

A Call object is created in two scenarios:
1. When you initiate a new outbound call using TxClient's newCall method
2. When you receive an inbound call through the TxClientDelegate's onIncomingCall callback

### Key Features
- Audio and video call support
- Call state management (NEW, CONNECTING, RINGING, ACTIVE, HELD, DONE)
- Mute/unmute functionality
- DTMF tone sending
- Custom headers support for both INVITE and ANSWER messages
- Call statistics reporting when debug mode is enabled

### Examples
### Creating an Outbound Call:

// Initialize the client
### Handling an Incoming Call:

class CallHandler: TxClientDelegate {
### Examples
```swift
// Access local audio tracks for visualization
if let localStream = call.localStream {
    let audioTracks = localStream.audioTracks
    // Use audio tracks for waveform visualization
}
```

### `remoteStream`

```swift
public var remoteStream: RTCMediaStream?
```

The remote media stream containing audio and/or video tracks received from the remote party.
This stream represents the media being received from the other participant in the call.
Can be used for audio visualization, remote video display, or other media processing.

### Examples
```swift
// Access remote audio tracks for visualization
if let remoteStream = call.remoteStream {
    let audioTracks = remoteStream.audioTracks
    // Use audio tracks for waveform visualization
}
```


### TxConfig

**STRUCT**

# `TxConfig`

```swift
public struct TxConfig
```

This structure is intended to used for Telnyx SDK configurations.

### Methods
### `init(sipUser:password:pushDeviceToken:ringtone:ringBackTone:pushEnvironment:logLevel:customLogger:reconnectClient:debug:forceRelayCandidate:enableQualityMetrics:sendWebRTCStatsViaSocket:reconnectTimeOut:useTrickleIce:enableCallReports:callReportInterval:callReportLogLevel:callReportMaxLogEntries:)`

```swift
public init(sipUser: String, password: String,
            pushDeviceToken: String? = nil,
            ringtone: String? = nil,
            ringBackTone: String? = nil,
            pushEnvironment: PushEnvironment? = nil,
            logLevel: LogLevel = .none,
            customLogger: TxLogger? = nil,
            reconnectClient: Bool = true,
            debug: Bool = false,
            forceRelayCandidate: Bool = false,
            enableQualityMetrics: Bool = false,
            sendWebRTCStatsViaSocket: Bool = false,
            reconnectTimeOut: Double = DEFAULT_TIMEOUT,
            useTrickleIce: Bool = false,
            enableCallReports: Bool = true,
            callReportInterval: TimeInterval = 5.0,
            callReportLogLevel: String = "debug",
            callReportMaxLogEntries: Int = 1000
)
```

Constructor for the Telnyx SDK configuration using SIP credentials.
- Parameters:
  - sipUser: The SIP username for authentication
  - password: The password associated with the SIP user
  - pushDeviceToken: (Optional) The device's push notification token, required for receiving inbound call notifications
  - ringtone: (Optional) The audio file name to play for incoming calls (e.g., "my-ringtone.mp3")
  - ringBackTone: (Optional) The audio file name to play while making outbound calls (e.g., "my-ringbacktone.mp3")
  - pushEnvironment: (Optional) The push notification environment (production or debug)
  - logLevel: (Optional) The verbosity level for SDK logs (defaults to `.none`)
  - customLogger: (Optional) Custom logger implementation for handling SDK logs. If not provided, the default logger will be used
  - reconnectClient: (Optional) Whether the client should attempt to reconnect automatically. Default is true.
  - debug: (Optional) Enables WebRTC communication statistics reporting to Telnyx servers. Default is false.
  - forceRelayCandidate: (Optional) Controls whether the SDK should force TURN relay for peer connections. Default is false.
  - enableQualityMetrics: (Optional) Controls whether the SDK should deliver call quality metrics. Default is false.
  - sendWebRTCStatsViaSocket: (Optional) Whether to send WebRTC statistics via socket to Telnyx servers. Default is false.
  - reconnectTimeOut: (Optional) Maximum time in seconds the SDK will attempt to reconnect a call after network disruption. Default is 60 seconds.
  - useTrickleIce: (Optional) Controls whether the SDK should use trickle ICE for WebRTC signaling. Default is false.
  - enableCallReports: (Optional) Enable automatic call quality reporting to voice-sdk-proxy. Default is true.
  - callReportInterval: (Optional) Interval in seconds for collecting call statistics. Default is 5.0.
  - callReportLogLevel: (Optional) Minimum log level to capture for call reports. Default is "debug".
  - callReportMaxLogEntries: (Optional) Maximum number of log entries to buffer per call. Default is 1000.

**Parameters**

| Name | Description |
| ---- | ----------- |
| sipUser | The SIP username for authentication |
| password | The password associated with the SIP user |
| pushDeviceToken | (Optional) The device’s push notification token, required for receiving inbound call notifications |
| ringtone | (Optional) The audio file name to play for incoming calls (e.g., “my-ringtone.mp3”) |
| ringBackTone | (Optional) The audio file name to play while making outbound calls (e.g., “my-ringbacktone.mp3”) |
| pushEnvironment | (Optional) The push notification environment (production or debug) |
| logLevel | (Optional) The verbosity level for SDK logs (defaults to `.none`) |
| customLogger | (Optional) Custom logger implementation for handling SDK logs. If not provided, the default logger will be used |
| reconnectClient | (Optional) Whether the client should attempt to reconnect automatically. Default is true. |
| debug | (Optional) Enables WebRTC communication statistics reporting to Telnyx servers. Default is false. |
| forceRelayCandidate | (Optional) Controls whether the SDK should force TURN relay for peer connections. Default is false. |
| enableQualityMetrics | (Optional) Controls whether the SDK should deliver call quality metrics. Default is false. |
| sendWebRTCStatsViaSocket | (Optional) Whether to send WebRTC statistics via socket to Telnyx servers. Default is false. |
| reconnectTimeOut | (Optional) Maximum time in seconds the SDK will attempt to reconnect a call after network disruption. Default is 60 seconds. |
| useTrickleIce | (Optional) Controls whether the SDK should use trickle ICE for WebRTC signaling. Default is false. |
| enableCallReports | (Optional) Enable automatic call quality reporting to voice-sdk-proxy. Default is true. |
| callReportInterval | (Optional) Interval in seconds for collecting call statistics. Default is 5.0. |
| callReportLogLevel | (Optional) Minimum log level to capture for call reports. Default is “debug”. |
| callReportMaxLogEntries | (Optional) Maximum number of log entries to buffer per call. Default is 1000. |

### `init(token:pushDeviceToken:ringtone:ringBackTone:pushEnvironment:logLevel:customLogger:reconnectClient:debug:forceRelayCandidate:enableQualityMetrics:sendWebRTCStatsViaSocket:reconnectTimeOut:useTrickleIce:enableCallReports:callReportInterval:callReportLogLevel:callReportMaxLogEntries:)`

```swift
public init(token: String,
            pushDeviceToken: String? = nil,
            ringtone: String? = nil,
            ringBackTone: String? = nil,
            pushEnvironment: PushEnvironment? = nil,
            logLevel: LogLevel = .none,
            customLogger: TxLogger? = nil,
            reconnectClient: Bool = true,
            debug: Bool = false,
            forceRelayCandidate: Bool = false,
            enableQualityMetrics: Bool = false,
            sendWebRTCStatsViaSocket: Bool = false,
            reconnectTimeOut: Double = DEFAULT_TIMEOUT,
            useTrickleIce: Bool = false,
            enableCallReports: Bool = true,
            callReportInterval: TimeInterval = 5.0,
            callReportLogLevel: String = "debug",
            callReportMaxLogEntries: Int = 1000
)
```

Constructor for the Telnyx SDK configuration using JWT token authentication.
- Parameters:
  - token: JWT token generated from https://developers.telnyx.com/docs/v2/webrtc/quickstart
  - pushDeviceToken: (Optional) The device's push notification token, required for receiving inbound call notifications
  - ringtone: (Optional) The audio file name to play for incoming calls (e.g., "my-ringtone.mp3")
  - ringBackTone: (Optional) The audio file name to play while making outbound calls (e.g., "my-ringbacktone.mp3")
  - pushEnvironment: (Optional) The push notification environment (production or debug)
  - logLevel: (Optional) The verbosity level for SDK logs (defaults to `.none`)
  - customLogger: (Optional) Custom logger implementation for handling SDK logs. If not provided, the default logger will be used
  - reconnectClient: (Optional) Whether the client should attempt to reconnect automatically. Default is true.
  - debug: (Optional) Enables WebRTC communication statistics reporting to Telnyx servers. Default is false.
  - forceRelayCandidate: (Optional) Controls whether the SDK should force TURN relay for peer connections. Default is false.
  - enableQualityMetrics: (Optional) Controls whether the SDK should deliver call quality metrics. Default is false.
  - sendWebRTCStatsViaSocket: (Optional) Whether to send WebRTC statistics via socket to Telnyx servers. Default is false.
  - reconnectTimeOut: (Optional) Maximum time in seconds the SDK will attempt to reconnect a call after network disruption. Default is 60 seconds.
  - useTrickleIce: (Optional) Controls whether the SDK should use trickle ICE for WebRTC signaling. Default is false.
  - enableCallReports: (Optional) Enable automatic call quality reporting to voice-sdk-proxy. Default is true.
  - callReportInterval: (Optional) Interval in seconds for collecting call statistics. Default is 5.0.
  - callReportLogLevel: (Optional) Minimum log level to capture for call reports. Default is "debug".
  - callReportMaxLogEntries: (Optional) Maximum number of log entries to buffer per call. Default is 1000.

**Parameters**

| Name | Description |
| ---- | ----------- |
| token | JWT token generated from https://developers.telnyx.com/docs/v2/webrtc/quickstart |
| pushDeviceToken | (Optional) The device’s push notification token, required for receiving inbound call notifications |
| ringtone | (Optional) The audio file name to play for incoming calls (e.g., “my-ringtone.mp3”) |
| ringBackTone | (Optional) The audio file name to play while making outbound calls (e.g., “my-ringbacktone.mp3”) |
| pushEnvironment | (Optional) The push notification environment (production or debug) |
| logLevel | (Optional) The verbosity level for SDK logs (defaults to `.none`) |
| customLogger | (Optional) Custom logger implementation for handling SDK logs. If not provided, the default logger will be used |
| reconnectClient | (Optional) Whether the client should attempt to reconnect automatically. Default is true. |
| debug | (Optional) Enables WebRTC communication statistics reporting to Telnyx servers. Default is false. |
| forceRelayCandidate | (Optional) Controls whether the SDK should force TURN relay for peer connections. Default is false. |
| enableQualityMetrics | (Optional) Controls whether the SDK should deliver call quality metrics. Default is false. |
| sendWebRTCStatsViaSocket | (Optional) Whether to send WebRTC statistics via socket to Telnyx servers. Default is false. |
| reconnectTimeOut | (Optional) Maximum time in seconds the SDK will attempt to reconnect a call after network disruption. Default is 60 seconds. |
| useTrickleIce | (Optional) Controls whether the SDK should use trickle ICE for WebRTC signaling. Default is false. |
| enableCallReports | (Optional) Enable automatic call quality reporting to voice-sdk-proxy. Default is true. |
| callReportInterval | (Optional) Interval in seconds for collecting call statistics. Default is 5.0. |
| callReportLogLevel | (Optional) Minimum log level to capture for call reports. Default is “debug”. |
| callReportMaxLogEntries | (Optional) Maximum number of log entries to buffer per call. Default is 1000. |

### `validateParams()`

```swift
public func validateParams() throws
```

Validate if TxConfig parameters are valid
- Throws: Throws TxConfig parameters errors

<!-- END AUTO-GENERATED API REFERENCE -->
