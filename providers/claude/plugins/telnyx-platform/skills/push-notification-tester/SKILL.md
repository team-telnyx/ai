---
name: push-notification-tester
description: >-
  Test VoIP push notifications for Telnyx WebRTC iOS (APNs) and Android (FCM) apps.
  Use when debugging push notification delivery, validating certificate/credential setup,
  or testing that a device receives VoIP pushes correctly.
metadata:
  author: telnyx
  product: webrtc
---

# Push Notification Tester

Send test VoIP push notifications to iOS (APNs) and Android (FCM) devices.

## iOS (APNs)

```bash
node {baseDir}/scripts/send-ios-push.js \
  --token=<device_token> \
  --bundle-id=<bundle_id> \
  --cert=<path/to/cert.pem> \
  --key=<path/to/key.pem> \
  [--env=sandbox|production] \
  [--caller-name="Test Caller"] \
  [--caller-number="+1234567890"]
```

### Required args
- `--token` — 64-char hex APNs device token
- `--bundle-id` — App bundle ID (e.g. `com.telnyx.webrtc`)
- `--cert` — Path to certificate PEM file
- `--key` — Path to private key PEM file

### Optional args
- `--env` — `sandbox` (default) or `production`
- `--caller-name` — Display name (default: "Test Caller")
- `--caller-number` — Phone number (default: "+1234567890")

## Android (FCM)

```bash
node {baseDir}/scripts/send-android-push.js \
  --token=<fcm_token> \
  --project-id=<firebase_project_id> \
  --service-account=<path/to/service-account.json> \
  [--caller-name="Test Caller"] \
  [--caller-number="+1234567890"]
```

### Required args
- `--token` — FCM device token
- `--project-id` — Firebase project ID
- `--service-account` — Path to service account JSON file

### Optional args
- `--caller-name` — Display name (default: "Test Caller")
- `--caller-number` — Phone number (default: "+1234567890")

## Output

Both scripts output JSON to stdout:
```json
{"success": true, "message": "Push notification sent successfully", "details": {...}}
```
```json
{"success": false, "error": "Description of what went wrong"}
```

Exit code 0 on success, 1 on failure.

## Dependencies

Run `npm install` in the `scripts/` directory, or the scripts will auto-install on first run.

- `@parse/node-apn` — APNs client for iOS
- `google-auth-library` — Google OAuth for FCM
- `axios` — HTTP client for FCM API
