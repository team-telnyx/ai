# Troubleshooting

## Error Handling

| Scenario | Error | Cause | Solution |
|----------|-------|-------|----------|
| SMS not delivered | No error (silent failure) | 10DLC not registered | Complete 10DLC brand + campaign registration |
| `422 Unprocessable` on verification | Invalid phone format | Phone number not in E.164 | Ensure `+` prefix and country code |
| `404` on verify by phone | URL encoding | `+` not encoded as `%2B` | URL-encode phone number in path |
| `400` on brand create | Missing required fields | Entity type requires specific fields | Check entity type requirements table |
| Brand `REGISTRATION_FAILED` | TCR rejection | Invalid EIN, company info mismatch | Check `failureReasons` field, correct and resubmit |
| Campaign `TCR_FAILED` | TCR rejection | Invalid use case, bad samples | Review campaign requirements, fix sample messages |
| `response_code: rejected` | Code expired or wrong | User took too long or mistyped | Allow retry, offer "resend code" option |
| Verification `status: error` | Delivery failed | Number unreachable, carrier block | Try alternative channel (call instead of SMS) |
| `40331` on messaging profile | Missing field | `whitelisted_destinations` not included | Add `"whitelisted_destinations": ["US"]` |
| `10027` on number order | Number unavailable | Search results expired | Re-search and purchase immediately |

## Webhook Receiver

Telnyx sends webhook events to your Messaging Profile and Verify Profile `webhook_url`. You need a server listening.

### Python (Flask)

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhooks/messaging', methods=['POST'])
def messaging_webhook():
    event = request.json
    event_type = event.get('data', {}).get('event_type', '')
    
    if event_type == 'message.finalized':
        status = event['data']['payload']['to'][0]['status']
        phone = event['data']['payload']['to'][0]['phone_number']
        if status == 'delivered':
            print(f"✅ SMS delivered to {phone}")
        else:
            print(f"❌ SMS delivery failed to {phone}: {status}")
    
    return jsonify({"status": "ok"}), 200

@app.route('/webhooks/verify', methods=['POST'])
def verify_webhook():
    event = request.json
    event_type = event.get('data', {}).get('event_type', '')
    payload = event.get('data', {}).get('payload', {})
    
    if event_type == 'verification.complete':
        print(f"Verification complete for {payload.get('phone_number')}: {payload.get('status')}")
    
    return jsonify({"status": "ok"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

### JavaScript (Express)

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/webhooks/messaging', (req, res) => {
  const event = req.body;
  const eventType = event?.data?.event_type || '';
  
  if (eventType === 'message.finalized') {
    const { status, phone_number } = event.data.payload.to[0];
    console.log(status === 'delivered'
      ? `✅ SMS delivered to ${phone_number}`
      : `❌ SMS delivery failed to ${phone_number}: ${status}`);
  }
  res.json({ status: 'ok' });
});

app.post('/webhooks/verify', (req, res) => {
  const event = req.body;
  const eventType = event?.data?.event_type || '';
  const payload = event?.data?.payload || {};
  
  if (eventType === 'verification.complete') {
    console.log(`Verification complete for ${payload.phone_number}: ${payload.status}`);
  }
  res.json({ status: 'ok' });
});

app.listen(8080, () => console.log('Webhook server running on port 8080'));
```

> **Tip:** For local development, use [ngrok](https://ngrok.com): `ngrok http 8080`

## Complete Verification Flow with Retry Logic

### Python

```python
import time
import os
from telnyx import Telnyx

class PhoneVerifier:
    def __init__(self, verify_profile_id, max_retries=3,
                 resend_cooldown=60, max_resends=2):
        self.client = Telnyx(api_key=os.environ["TELNYX_API_KEY"])
        self.verify_profile_id = verify_profile_id
        self.max_retries = max_retries
        self.resend_cooldown = resend_cooldown
        self.max_resends = max_resends
    
    def lookup(self, phone_number):
        try:
            result = self.client.number_lookup.retrieve(phone_number)
            carrier_type = result.data.carrier.type if result.data.carrier else "unknown"
            if carrier_type in ("mobile", "voip", "fixed line or mobile"):
                return {"channel": "sms", "type": carrier_type}
            elif carrier_type == "fixed line":
                return {"channel": "call", "type": carrier_type}
            elif carrier_type in ("toll free", "premium rate"):
                return {"channel": None, "type": carrier_type,
                        "error": f"Cannot verify {carrier_type} numbers"}
            else:
                return {"channel": "sms", "type": carrier_type}
        except Exception as e:
            return {"channel": "sms", "type": "unknown", "warning": str(e)}
    
    def send(self, phone_number, channel="sms"):
        try:
            if channel == "sms":
                v = self.client.verifications.trigger_sms(
                    phone_number=phone_number,
                    verify_profile_id=self.verify_profile_id)
            elif channel == "call":
                v = self.client.verifications.trigger_call(
                    phone_number=phone_number,
                    verify_profile_id=self.verify_profile_id)
            else:
                return {"success": False, "error": f"Unknown channel: {channel}"}
            return {"success": True, "verification_id": v.data.id,
                    "channel": channel, "timeout_secs": v.data.timeout_secs}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def check(self, verification_id, code):
        try:
            result = self.client.verifications.actions.verify(
                verification_id=verification_id, code=code)
            return {"verified": result.data.response_code == "accepted",
                    "response_code": result.data.response_code}
        except Exception as e:
            return {"verified": False, "error": str(e)}
    
    def verify_phone(self, phone_number, get_code_fn):
        lookup = self.lookup(phone_number)
        if lookup["channel"] is None:
            return {"verified": False, "error": lookup.get("error")}
        
        channel = lookup["channel"]
        resends = 0
        
        while resends <= self.max_resends:
            send_result = self.send(phone_number, channel)
            if not send_result["success"] and channel == "sms":
                channel = "call"
                send_result = self.send(phone_number, channel)
            if not send_result["success"]:
                return {"verified": False, "error": send_result["error"]}
            
            for attempt in range(self.max_retries):
                code = get_code_fn(channel=channel, attempt=attempt + 1,
                                   max_attempts=self.max_retries)
                if code is None:
                    return {"verified": False, "error": "User cancelled"}
                if code == "RESEND":
                    break
                
                result = self.check(send_result["verification_id"], code)
                if result["verified"]:
                    return {"verified": True, "phone_number": phone_number,
                            "channel": channel, "attempts": attempt + 1,
                            "resends": resends}
            
            resends += 1
            if resends <= self.max_resends:
                time.sleep(self.resend_cooldown)
        
        return {"verified": False, "error": "Max verification attempts exceeded"}
```

### JavaScript

```javascript
class PhoneVerifier {
  constructor({ verifyProfileId, apiKey, maxRetries = 3,
                resendCooldown = 60, maxResends = 2 }) {
    this.client = new (require('telnyx'))({ apiKey });
    this.verifyProfileId = verifyProfileId;
    this.maxRetries = maxRetries;
    this.resendCooldown = resendCooldown;
    this.maxResends = maxResends;
  }
  
  async lookup(phoneNumber) {
    try {
      const result = await this.client.numberLookup.retrieve(phoneNumber);
      const type = result.data.carrier?.type || 'unknown';
      if (['mobile', 'voip', 'fixed line or mobile'].includes(type))
        return { channel: 'sms', type };
      if (type === 'fixed line') return { channel: 'call', type };
      if (['toll free', 'premium rate'].includes(type))
        return { channel: null, type, error: `Cannot verify ${type} numbers` };
      return { channel: 'sms', type };
    } catch (e) {
      return { channel: 'sms', type: 'unknown', warning: e.message };
    }
  }
  
  async send(phoneNumber, channel = 'sms') {
    try {
      const v = channel === 'sms'
        ? await this.client.verifications.triggerSMS({
            phone_number: phoneNumber,
            verify_profile_id: this.verifyProfileId
          })
        : await this.client.verifications.triggerCall({
            phone_number: phoneNumber,
            verify_profile_id: this.verifyProfileId
          });
      return { success: true, verificationId: v.data.id,
               channel, timeoutSecs: v.data.timeout_secs };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  
  async check(verificationId, code) {
    try {
      const result = await this.client.verifications.actions.verify(
        verificationId, { code });
      return { verified: result.data.response_code === 'accepted',
               responseCode: result.data.response_code };
    } catch (e) {
      return { verified: false, error: e.message };
    }
  }
  
  async verifyPhone(phoneNumber, getCodeFn) {
    const lookup = await this.lookup(phoneNumber);
    if (!lookup.channel) return { verified: false, error: lookup.error };
    
    let channel = lookup.channel;
    for (let resends = 0; resends <= this.maxResends; resends++) {
      let sendResult = await this.send(phoneNumber, channel);
      if (!sendResult.success && channel === 'sms') {
        channel = 'call';
        sendResult = await this.send(phoneNumber, channel);
      }
      if (!sendResult.success) return { verified: false, error: sendResult.error };
      
      for (let attempt = 0; attempt < this.maxRetries; attempt++) {
        const code = await getCodeFn({ channel, attempt: attempt + 1,
                                        maxAttempts: this.maxRetries });
        if (!code) return { verified: false, error: 'User cancelled' };
        if (code === 'RESEND') break;
        
        const result = await this.check(sendResult.verificationId, code);
        if (result.verified)
          return { verified: true, phoneNumber, channel,
                   attempts: attempt + 1, resends };
      }
      
      if (resends < this.maxResends)
        await new Promise(r => setTimeout(r, this.resendCooldown * 1000));
    }
    return { verified: false, error: 'Max verification attempts exceeded' };
  }
}

module.exports = PhoneVerifier;
```

## Environment Variables

```bash
# Required
TELNYX_API_KEY=KEY0123456789...       # Your Telnyx API key

# Created during setup (save these)
TELNYX_PHONE_NUMBER=+19705555098      # Your purchased phone number
TELNYX_PHONE_NUMBER_ID=...            # Phone number resource ID
MESSAGING_PROFILE_ID=...              # Messaging profile UUID
BRAND_ID=...                          # 10DLC brand UUID
CAMPAIGN_ID=...                       # 10DLC campaign UUID
VERIFY_PROFILE_ID=...                 # Verify profile UUID

# Application
WEBHOOK_URL=https://your-app.example.com/webhooks
```

## Production Checklist

```
Infrastructure:
  □ Phone number purchased and active
  □ Messaging profile created with production webhook URL
  □ Phone number assigned to messaging profile
  □ 10DLC brand registered and VERIFIED (not just OK)
  □ 10DLC campaign created and MNO_PROVISIONED
  □ Phone number assigned to 10DLC campaign (status: ASSIGNED)
  □ Verify profile created with correct settings

Application Logic:
  □ Number Lookup integrated for carrier type detection
  □ SMS/Call routing based on carrier type
  □ Code verification with retry logic (max 3 attempts)
  □ Timeout handling (default 300s / 5 min)
  □ Rate limiting (prevent verification spam)
  □ Error handling for all API failure modes
  □ Toll-free / premium rate number rejection

Security:
  □ API key stored securely (environment variable, not in code)
  □ Webhook endpoint validates Telnyx signatures
  □ Rate limiting on verification requests per phone number
  □ Logging for audit trail (verification attempts, results)
  □ Don't expose verification IDs to end users

Monitoring:
  □ Alert on high verification failure rates
  □ Monitor 10DLC campaign health
  □ Track SMS delivery rates
  □ Log carrier type distribution
```
