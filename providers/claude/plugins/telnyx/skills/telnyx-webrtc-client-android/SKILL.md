---
name: telnyx-webrtc-client-android
description: >-
  Build VoIP calling apps on Android using Telnyx WebRTC SDK. Covers authentication,
  making/receiving calls, push notifications (FCM), call quality metrics, and AI Agent
  integration. Use when implementing real-time voice communication on Android.
metadata:
  author: telnyx
  product: webrtc
  language: kotlin
  platform: android
---

# Telnyx WebRTC - Android SDK

Build real-time voice communication into Android applications using Telnyx WebRTC.

> **Prerequisites**: Create WebRTC credentials and generate a login token using the Telnyx server-side SDK. See the `telnyx-webrtc-*` skill in your server language plugin (e.g., `telnyx-python`, `telnyx-javascript`).

## Installation

Add JitPack repository to your project's `build.gradle`:

```gradle
allprojects {
    repositories {
        maven { url 'https://jitpack.io' }
    }
}
```

Add the dependency:

```gradle
dependencies {
    implementation 'com.github.team-telnyx:telnyx-webrtc-android:latest-version'
}
```

## Required Permissions

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

---

## Authentication

### Option 1: Credential-Based Login

```kotlin
val telnyxClient = TelnyxClient(context)
telnyxClient.connect()

val credentialConfig = CredentialConfig(
    sipUser = "your_sip_username",
    sipPassword = "your_sip_password",
    sipCallerIDName = "Display Name",
    sipCallerIDNumber = "+15551234567",
    fcmToken = fcmToken,  // Optional: for push notifications
    logLevel = LogLevel.DEBUG,
    autoReconnect = true
)

telnyxClient.credentialLogin(credentialConfig)
```

### Option 2: Token-Based Login (JWT)

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

### Configuration Options

| Parameter | Type | Description |
|-----------|------|-------------|
| `sipUser` / `sipToken` | String | Credentials from Telnyx Portal |
| `sipCallerIDName` | String? | Caller ID name displayed to recipients |
| `sipCallerIDNumber` | String? | Caller ID number |
| `fcmToken` | String? | Firebase Cloud Messaging token for push |
| `ringtone` | Any? | Raw resource ID or URI for ringtone |
| `ringBackTone` | Int? | Raw resource ID for ringback tone |
| `logLevel` | LogLevel | NONE, ERROR, WARNING, DEBUG, INFO, ALL |
| `autoReconnect` | Boolean | Auto-retry login on failure (3 attempts) |
| `region` | Region | AUTO, US_EAST, US_WEST, EU_WEST |

---

## Making Outbound Calls

```kotlin
// Create a new outbound call
telnyxClient.call.newInvite(
    callerName = "John Doe",
    callerNumber = "+15551234567",
    destinationNumber = "+15559876543",
    clientState = "my-custom-state"
)
```

---

## Receiving Inbound Calls

Listen for socket events using SharedFlow (recommended):

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
                            // Incoming call!
                            val invite = data.result as InviteResponse
                            // Show incoming call UI, then accept:
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
                // Handle error: response.errorCode
            }
            SocketStatus.DISCONNECT -> {
                // Socket disconnected
            }
        }
    }
}
```

---

## Call Controls

```kotlin
// Get current call
val currentCall: Call? = telnyxClient.calls[callId]

// End call
currentCall?.endCall(callId)

// Mute/Unmute
currentCall?.onMuteUnmutePressed()

// Hold/Unhold
currentCall?.onHoldUnholdPressed(callId)

// Send DTMF tone
currentCall?.dtmf(callId, "1")
```

### Handling Multiple Calls

```kotlin
// Get all active calls
val calls: Map<UUID, Call> = telnyxClient.calls

// Iterate through calls
calls.forEach { (callId, call) ->
    // Handle each call
}
```

---

## Push Notifications (FCM)

### 1. Setup Firebase

Add Firebase to your project and get an FCM token:

```kotlin
FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
    if (task.isSuccessful) {
        val fcmToken = task.result
        // Use this token in your login config
    }
}
```

### 2. Handle Incoming Push

In your `FirebaseMessagingService`:

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

### 3. Decline Push Call (Simplified)

```kotlin
// The SDK now handles decline automatically
telnyxClient.connectWithDeclinePush(
    txPushMetaData = pushMetaData,
    credentialConfig = credentialConfig
)
// SDK connects, sends decline, and disconnects automatically
```

### Android 14+ Requirements

```xml
<service
    android:name=".YourForegroundService"
    android:foregroundServiceType="phoneCall"
    android:exported="true" />
```

---

## Call Quality Metrics

Enable metrics to monitor call quality in real-time:

```kotlin
val credentialConfig = CredentialConfig(
    // ... other config
    debug = true  // Enables call quality metrics
)

// Listen for quality updates
lifecycleScope.launch {
    currentCall?.callQualityFlow?.collect { metrics ->
        println("MOS: ${metrics.mos}")
        println("Jitter: ${metrics.jitter * 1000} ms")
        println("RTT: ${metrics.rtt * 1000} ms")
        println("Quality: ${metrics.quality}")  // EXCELLENT, GOOD, FAIR, POOR, BAD
    }
}
```

| Quality Level | MOS Range |
|---------------|-----------|
| EXCELLENT | > 4.2 |
| GOOD | 4.1 - 4.2 |
| FAIR | 3.7 - 4.0 |
| POOR | 3.1 - 3.6 |
| BAD | ≤ 3.0 |

---

## AI Agent Integration

Connect to a Telnyx Voice AI Agent without traditional SIP credentials:

### 1. Anonymous Login

```kotlin
telnyxClient.connectAnonymously(
    targetId = "your_ai_assistant_id",
    targetType = "ai_assistant",  // Default
    targetVersionId = "optional_version_id",
    userVariables = mapOf("user_id" to "12345")
)
```

### 2. Start Conversation

```kotlin
// After anonymous login, call the AI Agent
telnyxClient.newInvite(
    callerName = "User Name",
    callerNumber = "+15551234567",
    destinationNumber = "",  // Ignored for AI Agent
    clientState = "state",
    customHeaders = mapOf(
        "X-Account-Number" to "123",  // Maps to {{account_number}}
        "X-User-Tier" to "premium"    // Maps to {{user_tier}}
    )
)
```

### 3. Receive Transcripts

```kotlin
lifecycleScope.launch {
    telnyxClient.transcriptUpdateFlow.collect { transcript ->
        transcript.forEach { item ->
            println("${item.role}: ${item.content}")
            // role: "user" or "assistant"
        }
    }
}
```

### 4. Send Text to AI Agent

```kotlin
// Send text message during active call
telnyxClient.sendAIAssistantMessage("Hello, I need help with my account")
```

---

## Custom Logging

Implement your own logger:

```kotlin
class MyLogger : TxLogger {
    override fun log(level: LogLevel, tag: String?, message: String, throwable: Throwable?) {
        // Send to your logging service
        MyAnalytics.log(level.name, tag ?: "Telnyx", message)
    }
}

val config = CredentialConfig(
    // ... other config
    logLevel = LogLevel.ALL,
    customLogger = MyLogger()
)
```

---

## ProGuard Rules

If using code obfuscation, add to `proguard-rules.pro`:

```proguard
-keep class com.telnyx.webrtc.** { *; }
-dontwarn kotlin.Experimental$Level
-dontwarn kotlin.Experimental
-dontwarn kotlinx.coroutines.scheduling.ExperimentalCoroutineDispatcher
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No audio | Check RECORD_AUDIO permission is granted |
| Push not received | Verify FCM token is passed in config |
| Login fails | Verify SIP credentials in Telnyx Portal |
| Call drops | Check network stability, enable `autoReconnect` |
| sender_id_mismatch (push) | FCM project mismatch - ensure app's `google-services.json` matches server credentials |

<!-- BEGIN AUTO-GENERATED API REFERENCE -- do not edit below this line -->

**[references/webrtc-server-api.md](references/webrtc-server-api.md) has the server-side WebRTC API — credential creation, token generation, and push notification setup. You MUST read it when setting up authentication or push notifications.**

## API Reference


### TelnyxClient

`TelnyxClient` is the main entry point for interacting with the Telnyx WebRTC SDK. It handles connection management, call creation, and responses from the Telnyx platform.

### Core Functionalities

- **Connection Management**: Establishes and maintains a WebSocket connection to the Telnyx RTC platform.
- **Authentication**: Supports authentication via SIP credentials or tokens.
- **Call Control**: Provides methods to initiate (`newInvite`), accept (`acceptCall`), and end (`endCall`) calls.
- **Event Handling**: Uses `TxSocketListener` to process events from the socket, such as incoming calls (`onOfferReceived`), call answers (`onAnswerReceived`), call termination (`onByeReceived`), and errors (`onErrorReceived`).
- **State Exposure**: Exposes connection status, session information, and call events via `SharedFlow` (recommended: `socketResponseFlow`) and deprecated `LiveData` (e.g., `socketResponseLiveData`) for UI consumption.

### Key Components and Interactions

- **`TxSocket`**: Manages the underlying WebSocket communication.
- **`TxSocketListener`**: An interface implemented by `TelnyxClient` to receive and process socket events. Notably:
    - `onOfferReceived(jsonObject: JsonObject)`: Handles incoming call invitations.
    - `onAnswerReceived(jsonObject: JsonObject)`: Processes answers to outgoing calls.
    - `onByeReceived(jsonObject: JsonObject)`: Handles call termination notifications. The `jsonObject` now contains richer details including `cause`, `causeCode`, `sipCode`, and `sipReason`, allowing the client to populate `CallState.DONE` with a detailed `CallTerminationReason`.
    - `onErrorReceived(jsonObject: JsonObject)`: Manages errors reported by the socket or platform.
    - `onClientReady(jsonObject: JsonObject)`: Indicates the client is ready for operations after connection and initial setup.
    - `onGatewayStateReceived(gatewayState: String, receivedSessionId: String?)`: Provides updates on the registration status with the Telnyx gateway.
- **`Call` Class**: Represents individual call sessions. `TelnyxClient` creates and manages instances of `Call`.
- **`CallState`**: The client updates the `CallState` of individual `Call` objects based on socket events and network conditions. This includes states like `DROPPED(reason: CallNetworkChangeReason)`, `RECONNECTING(reason: CallNetworkChangeReason)`, and `DONE(reason: CallTerminationReason?)` which now provide more context.
- **`socketResponseFlow: SharedFlow<SocketResponse<ReceivedMessageBody>>`**: This SharedFlow stream is the recommended approach for applications. It emits `SocketResponse` objects that wrap messages received from the Telnyx platform. For `BYE` messages, the `ReceivedMessageBody` will contain a `com.telnyx.webrtc.sdk.verto.receive.ByeResponse` which is now enriched with termination cause details.
- **`socketResponseLiveData: LiveData<SocketResponse<ReceivedMessageBody>>`**: **[DEPRECATED]** This LiveData stream is deprecated in favor of `socketResponseFlow`. It's maintained for backward compatibility but new implementations should use SharedFlow.

### Usage Example

**Recommended approach using SharedFlow:**

```kotlin
// Initializing the client
val telnyxClient = TelnyxClient(context)

// Observing responses using SharedFlow (Recommended)
lifecycleScope.launch {
    telnyxClient.socketResponseFlow.collect { response ->
        when (response.status) {
            SocketStatus.MESSAGERECEIVED -> {
                response.data?.let {
                    when (it.method) {
                        SocketMethod.INVITE.methodName -> {
                            val invite = it.result as InviteResponse
                            // Handle incoming call invitation
                        }
                        SocketMethod.BYE.methodName -> {
                            val bye = it.result as com.telnyx.webrtc.sdk.verto.receive.ByeResponse
                            // Call ended by remote party, bye.cause, bye.sipCode etc. are available
                            Log.d("TelnyxClient", "Call ended: ${bye.callId}, Reason: ${bye.cause}")
                        }
                        // Handle other methods like ANSWER, RINGING, etc.
                    }
                }
            }
            SocketStatus.ERROR -> {
                // Handle errors
                Log.e("TelnyxClient", "Error: ${response.errorMessage}")
            }
            // Handle other statuses: ESTABLISHED, LOADING, DISCONNECT
        }
    }
}
```

**Deprecated approach using LiveData:**

```kotlin
@Deprecated("Use socketResponseFlow instead. LiveData is deprecated in favor of Kotlin Flows.")
// Observing responses (including errors and BYE messages)
telnyxClient.socketResponseLiveData.observe(lifecycleOwner, Observer { response ->
    when (response.status) {
        SocketStatus.MESSAGERECEIVED -> {
            response.data?.let {
                when (it.method) {
                    SocketMethod.INVITE.methodName -> {
                        val invite = it.result as InviteResponse
                        // Handle incoming call invitation
                    }
                    SocketMethod.BYE.methodName -> {
                        val bye = it.result as com.telnyx.webrtc.sdk.verto.receive.ByeResponse
                        // Call ended by remote party, bye.cause, bye.sipCode etc. are available
                        Log.d("TelnyxClient", "Call ended: ${bye.callId}, Reason: ${bye.cause}")
                    }
                    // Handle other methods like ANSWER, RINGING, etc.
                }
            }
        }
        SocketStatus.ERROR -> {
            // Handle errors
            Log.e("TelnyxClient", "Error: ${response.errorMessage}")
        }
        // Handle other statuses: ESTABLISHED, LOADING, DISCONNECT
    }
})

// Connecting and Logging In (example with credentials)
telnyxClient.connect(
    credentialConfig = CredentialConfig(
        sipUser = "your_sip_username",
        sipPassword = "your_sip_password",
        // ... other config ...
    )
)

// Making a call
val outgoingCall = telnyxClient.newInvite(
    callerName = "My App",
    callerNumber = "+11234567890",
    destinationNumber = "+10987654321",
    clientState = "some_state"
)

// Observing the specific call's state
outgoingCall.callStateFlow.collect { state ->
    if (state is CallState.DONE) {
        Log.d("TelnyxClient", "Outgoing call ended. Reason: ${state.reason?.cause}")
    }
    // Handle other states
}
```

Refer to the SDK's implementation and specific method documentation for detailed usage patterns and configuration options.

### Telnyx Client
NOTE:
Remember to add and handle INTERNET, RECORD_AUDIO and ACCESS_NETWORK_STATE permissions

   <p align="center">
               <img align="center" src="https://user-images.githubusercontent.com/9112652/117322479-f4731c00-ae85-11eb-9259-6333fc20b629.png" />
            </p>

### Initialize

To initialize the TelnyxClient you will have to provide the application context.

```kotlin
  telnyxClient = TelnyxClient(context)
```
### Connect

Once an instance is created, you can call the one of two available .connect(....) method to connect to the socket.

```kotlin
fun connect(
    providedServerConfig: TxServerConfiguration = TxServerConfiguration(),
    credentialConfig: CredentialConfig,
    txPushMetaData: String? = null,
    autoLogin: Boolean = true,
)
```
### Listening for events and reacting

We need to react for a socket connection state or incoming calls. We do this by getting the Telnyx Socket Response callbacks from our TelnyxClient.

```kotlin
val socketResponseFlow: SharedFlow<SocketResponse<ReceivedMessageBody>>
```


### Call

### Telnyx Call

Class that represents a Call and handles all call related actions, including answering and ending a call.
### Creating a call invitation

In order to make a call invitation, you need to provide your callerName, callerNumber, the destinationNumber (or SIP credential), and your clientState (any String value).

```kotlin
   telnyxClient.call.newInvite(callerName, callerNumber, destinationNumber, clientState)
```
### Accepting a call

In order to be able to accept a call, we first need to listen for invitations. We do this by getting the Telnyx Socket Response as LiveData:

```kotlin
  fun getSocketResponse(): LiveData<SocketResponse<ReceivedMessageBody>>? =
        telnyxClient.getSocketResponse()
```
### Handling Multiple Calls

The Telnyx WebRTC SDK allows for multiple calls to be handled at once. You can use the callId to differentiate the calls..
### Key Properties

- **`callId: UUID`**: A unique identifier for the call.
- **`sessionId: String`**: The session ID associated with the Telnyx connection.
- **`callStateFlow: StateFlow<CallState>`**: A Kotlin Flow that emits updates to the call's current state. This is the primary way to observe real-time changes to the call. States include:
    - `CallState.NEW`: The call has been locally initiated but not yet sent.
    - `CallState.CONNECTING`: The call is in the process of connecting.
    - `CallState.RINGING`: The call invitation has been sent, and the remote party is being alerted.
    - `CallState.ACTIVE`: The call is established and active.
    - `CallState.HELD`: The call is on hold.
    - `CallState.DONE(reason: CallTerminationReason?)`: The call has ended. The optional `reason` parameter provides details about why the call terminated (e.g., normal hangup, call rejected, busy, SIP error). `CallTerminationReason` contains `cause`, `causeCode`, `sipCode`, and `sipReason`.
    - `CallState.ERROR`: An error occurred related to this call.
    - `CallState.DROPPED(reason: CallNetworkChangeReason)`: The call was dropped, typically due to network issues. The `reason` (`CallNetworkChangeReason.NETWORK_LOST` or `CallNetworkChangeReason.NETWORK_SWITCH`) provides context.
    - `CallState.RECONNECTING(reason: CallNetworkChangeReason)`: The SDK is attempting to reconnect the call after a network disruption. The `reason` provides context.
- **`onCallQualityChange: ((CallQualityMetrics) -> Unit)?`**: A callback for real-time call quality metrics.
- **`audioManager: AudioManager`**: Reference to the Android `AudioManager` for controlling audio settings.
- **`peerConnection: Peer?`**: Represents the underlying WebRTC peer connection.

### Key Methods

- **`newInvite(...)`**: (Typically initiated via `TelnyxClient`) Initiates a new outgoing call.
- **`acceptCall(...)`**: (Typically initiated via `TelnyxClient`) Accepts an incoming call.
- **`endCall(callId: UUID)`**: Terminates the call. This is usually called on the `TelnyxClient` which then manages the specific `Call` object.
- **`onMuteUnmutePressed()`**: Toggles the microphone mute state.
- **`onLoudSpeakerPressed()`**: Toggles the loudspeaker state.
- **`onHoldUnholdPressed(callId: UUID)`**: Toggles the hold state for the call.
- **`dtmf(callId: UUID, tone: String)`**: Sends DTMF tones.

### Observing Call State

Applications should observe the `callStateFlow` to react to changes in the call's status and update the UI accordingly. For example, displaying call duration when `ACTIVE`, showing a "reconnecting" indicator when `RECONNECTING`, or presenting termination reasons when `DONE`.

```kotlin
// Example: Observing call state in a ViewModel or Composable
viewModelScope.launch {
    myCall.callStateFlow.collect { state ->
        when (state) {
            is CallState.ACTIVE -> {
                // Update UI to show active call controls
            }
            is CallState.DONE -> {
                // Call has ended, update UI
                // Access state.reason for termination details
                val reasonDetails = state.reason?.let {
                    "Cause: ${it.cause}, SIP Code: ${it.sipCode}"
                } ?: "No specific reason provided."
                Log.d("Call Ended", "Reason: $reasonDetails")
            }
            is CallState.DROPPED -> {
                // Call dropped, possibly show a message with state.reason.description
                Log.d("Call Dropped", "Reason: ${state.callNetworkChangeReason.description}")
            }
            is CallState.RECONNECTING -> {
                // Call is reconnecting, update UI
                Log.d("Call Reconnecting", "Reason: ${state.callNetworkChangeReason.description}")
            }
            // Handle other states like NEW, CONNECTING, RINGING, HELD, ERROR
            else -> { /* ... */ }
        }
    }
}
```

For more details on specific parameters and advanced usage, refer to the SDK's source code and the main `TelnyxClient` documentation.


### ReceivedMessageBody

### ReceivedMessageBody

A data class the represents the structure of every message received via the socket connection

```kotlin
data class ReceivedMessageBody(val method: String, val result: ReceivedResult?)
```

Where the params are:
* method the Telnyx Message Method - ie. INVITE, BYE, MODIFY, etc. @see [SocketMethod]
* result the content of the actual message in the structure provided via `ReceivedResult`

### SocketMethod

Enum class to detail the Method property of the response from the Telnyx WEBRTC client with the given [methodName]
### Structure

```kotlin
data class ReceivedMessageBody(
    val method: String,      // The Telnyx Message Method (e.g., "telnyx_rtc.invite", "telnyx_rtc.bye")
    val result: ReceivedResult? // The content of the actual message
)
```

- **`method: String`**: This field indicates the type of message received. It corresponds to one of the `SocketMethod` enums (e.g., `SocketMethod.INVITE`, `SocketMethod.ANSWER`, `SocketMethod.BYE`). Your application will typically use this field in a `when` statement to determine how to process the `result`.

- **`result: ReceivedResult?`**: This field holds the actual payload of the message. `ReceivedResult` is a sealed class, and the concrete type of `result` will depend on the `method`. For example:
    - If `method` is `SocketMethod.LOGIN.methodName`, `result` will be a `LoginResponse`.
    - If `method` is `SocketMethod.INVITE.methodName`, `result` will be an `InviteResponse`.
    - If `method` is `SocketMethod.ANSWER.methodName`, `result` will be an `AnswerResponse`.
    - If `method` is `SocketMethod.BYE.methodName`, `result` will be a `com.telnyx.webrtc.sdk.verto.receive.ByeResponse`. Importantly, this `ByeResponse` now includes detailed termination information such as `cause`, `causeCode`, `sipCode`, and `sipReason`, in addition to the `callId`.
    - Other `ReceivedResult` subtypes include `RingingResponse`, `MediaResponse`, and `DisablePushResponse`.

### Usage

When you observe `TelnyxClient.socketResponseLiveData`, you receive a `SocketResponse<ReceivedMessageBody>`. If the status is `SocketStatus.MESSAGERECEIVED`, the `data` field of `SocketResponse` will contain the `ReceivedMessageBody`.

```kotlin
telnyxClient.socketResponseLiveData.observe(this, Observer { response ->
    if (response.status == SocketStatus.MESSAGERECEIVED) {
        response.data?.let { receivedMessageBody ->
            Log.d("SDK_APP", "Method: ${receivedMessageBody.method}")
            when (receivedMessageBody.method) {
                SocketMethod.LOGIN.methodName -> {
                    val loginResponse = receivedMessageBody.result as? LoginResponse
                    // Process login response
                }
                SocketMethod.INVITE.methodName -> {
                    val inviteResponse = receivedMessageBody.result as? InviteResponse
                    // Process incoming call invitation
                }
                SocketMethod.BYE.methodName -> {
                    val byeResponse = receivedMessageBody.result as? com.telnyx.webrtc.sdk.verto.receive.ByeResponse
                    byeResponse?.let {
                        // Process call termination, access it.cause, it.sipCode, etc.
                        Log.i("SDK_APP", "Call ${it.callId} ended. Reason: ${it.cause}, SIP Code: ${it.sipCode}")
                    }
                }
                // Handle other methods...
            }
        }
    }
})
```

By checking the `method` and casting the `result` to its expected type, your application can effectively handle the diverse messages sent by the Telnyx platform.

<!-- END AUTO-GENERATED API REFERENCE -->
