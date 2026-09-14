# Troubleshooting

## Error Handling

### SMS API Error Codes

| Scenario | Error Code | Cause | Solution |
|----------|-----------|-------|----------|
| Recipient opted out | `40300` | Number has a STOP block rule | Remove from send list. Telnyx auto-blocks at platform level. Wait for recipient to text START. |
| Invalid destination number | `40001` | Phone number format invalid or not in service | Validate E.164 format. Run Number Lookup to confirm number is active. |
| Number not in service | `40002` | Destination disconnected or not reachable | Remove from list after 2+ consecutive failures. |
| Rate limit exceeded | `40003` | Sending faster than account/number allows | Slow down. Use token bucket rate limiter at 80% of capacity. |
| Message filtered by carrier | `40008` | Content triggered carrier spam filter | Review message content (see "Carrier Filtering" below). |
| Message blocked (spam) | `40010` | Carrier content filter blocked the message | Pause campaign. Review content for spam triggers. See carrier rules. |
| Queue full | `40318` | Send rate exceeded, internal queue at capacity (720K) | Pause 30-60 seconds. Reduce sending rate by 50%. |
| Message expired in queue | `40319` | Message sat in queue > 4 hours without delivery | Retry. Consider reducing overall send volume. |
| Number not enabled for messaging | `42203` | Phone number not configured for SMS | Check number has SMS feature. Assign to messaging profile. |
| Messaging profile not found | `40401` | Invalid `messaging_profile_id` | Verify profile ID. Create profile if needed. |
| Authentication failure | `40100` | Invalid or expired API key | Check `TELNYX_API_KEY` environment variable. |
| 10DLC campaign required | `47000` | US A2P message without 10DLC registration | Complete 10DLC brand + campaign registration. |
| Invalid phone number format | `40310` | `from` or `to` not in E.164 format | Ensure `+` prefix and country code. |
| Number not on account | `40312` | Sending from a number not owned by your account | Verify `from` number is purchased and active. |
| Text required for SMS | `40320` | Empty message body | Include non-empty `text` field. |
| Media too large | `40323` | MMS media exceeds 1 MB | Compress images. Total media must be < 1 MB. |
| Messaging profile `whitelisted_destinations` missing | `40331` | Profile created without `whitelisted_destinations` | Add `"whitelisted_destinations": ["US"]` (or your target countries). See FRIC-001. |

### Error Response Format

```json
{
  "errors": [
    {
      "code": "40300",
      "title": "Blocked due to STOP message",
      "detail": "Messages cannot be sent from '{from}' to '{to}' due to an existing block rule.",
      "source": { "pointer": "/to/0/phone_number" }
    }
  ]
}
```

---

## 10DLC Marketing Campaign Rejection Reasons

| Rejection Reason | Fix |
|------------------|-----|
| **Samples don't match use case** | Rewrite samples with clear promotional language if registered as MARKETING. Include brand name, offer, and opt-out. |
| **Missing opt-out language** | Add "Reply STOP to opt out" (or variant) to **every** sample message. |
| **Inadequate opt-in description** | Describe exact opt-in: WHERE (URL), HOW (checkbox), WHAT (consent language shown). |
| **Opt-in buried in Terms of Service** | Marketing opt-in must be a **separate checkbox** from Terms of Service. |
| **Pre-checked consent checkbox** | Checkbox must be **unchecked by default**. Affirmative action required. |
| **"Consent required for purchase"** | Must state: "Consent is not a condition of purchase." |
| **No message frequency disclosure** | Must state: "Up to X msgs/month" or "Msg frequency varies." |
| **URL shorteners in samples** | Replace bit.ly/tinyurl with full branded URLs (acme.com/sale). AT&T blocks URL shorteners. |
| **SHAFT content** | Remove sex/hate/alcohol/firearms/tobacco content. Or apply for age-gated special approval. |
| **Vague campaign description** | Be specific: "Promotional SMS including sales, coupons, and product launches" not just "marketing messages." |
| **Samples too similar** | Each sample must be distinctly different (different offers, different formats). |
| **Missing brand name in samples** | Include your brand name in **every** sample message. |
| **Missing privacy/terms links** | Include links to privacy policy and terms in your opt-in language. |
| **Prohibited use case** | No: unsolicited outreach, payday loans, cannabis/CBD, unlicensed gambling, "free giveaway" sweepstakes. |

---

## Carrier Filtering Issues

### Content That Triggers Carrier Filters

| Trigger | Example | Fix |
|---------|---------|-----|
| ALL CAPS | `FREE STUFF!!!` | Use normal capitalization |
| Excessive punctuation | `Buy now!!!` | Max one exclamation mark |
| URL shorteners | `bit.ly/abc123` | Use full branded URL: `acme.com/sale` |
| Generic short URLs | `tinyurl.com/xyz` | Use your own domain |
| "FREE" in caps | `FREE gift for you` | Use "free" in lowercase, or rephrase as "complimentary" |
| Spam phrases | `You won!`, `Act now!`, `Limited time!` | Rephrase. Avoid urgency language. |
| Excessive emoji | `🔥🔥🔥🔥🔥` | Use 1-2 emoji max |
| No sender identification | (no brand name) | Include brand name in every message |
| No opt-out language | (no STOP instruction) | Include "Reply STOP to opt out" |
| Content mismatch | Sending promos on a 2FA campaign | Use correct campaign type (MARKETING/MIXED) |

### Carrier-Specific Rules

| Carrier | Key Rules |
|---------|-----------|
| **AT&T** | Most aggressive filtering. Blocks all URL shorteners. Pattern-based + content-based filtering. High velocity triggers review. |
| **T-Mobile** | Daily caps per brand (not per campaign). Cannabis/CBD blocked even in legal states. "Free" and loan-related content heavily scrutinized. |
| **Verizon** | Content-based filtering, less transparent. No published rate limits. Messages matching registered campaign are generally delivered. |

### Signs of Carrier Blocking

1. Sudden spike in `40300` (carrier rejection) or `40008`/`40010` (content filter) errors
2. Delivery rate drops from >95% to <50%
3. `delivery_unconfirmed` rate increases significantly
4. Consistent failures to a specific carrier

### Response Playbook

1. **Immediate:** Pause the campaign
2. **Diagnose:** Check which carrier is blocking (webhook `to[].carrier` field)
3. **Review content:** Check all triggers above
4. **Rate check:** Verify you're not exceeding 10DLC throughput limits
5. **Contact Telnyx support** if blocking persists
6. **Resume gradually** at 50% rate, monitor 15 minutes before ramping up

---

## Rate Limit Handling & Backoff Strategies

### Retry Strategy (Exponential Backoff with Jitter)

```python
import random
import time
import asyncio

MAX_RETRIES = 3
BASE_DELAY = 1.0  # seconds
MAX_DELAY = 60.0  # seconds

RETRYABLE_ERRORS = {'40001', '40002', '40003', '40318', '40319', '40303'}
PERMANENT_ERRORS = {'40300', '40301', '40302', '42201', '42203', '40100', '47000'}

async def send_with_retry(client, message_params: dict) -> dict:
    """Send message with exponential backoff retry."""
    last_error = None
    
    for attempt in range(MAX_RETRIES + 1):
        try:
            response = client.messages.send(**message_params)
            return {'status': 'sent', 'message_id': response.data.id}
        except Exception as e:
            error_code = str(getattr(e, 'code', 'unknown'))
            last_error = e
            
            if error_code in PERMANENT_ERRORS:
                return {'status': 'permanent_failure', 'error_code': error_code}
            
            if error_code in RETRYABLE_ERRORS and attempt < MAX_RETRIES:
                delay = min(BASE_DELAY * (2 ** attempt), MAX_DELAY)
                jitter = random.uniform(0, delay * 0.5)
                await asyncio.sleep(delay + jitter)
                
                # Extra delay for queue full
                if error_code == '40318':
                    await asyncio.sleep(30)
                continue
            
            break
    
    return {'status': 'exhausted_retries', 'error_code': str(getattr(last_error, 'code', 'unknown'))}
```

### Backoff by Scenario

| Scenario | Strategy |
|----------|----------|
| API rate limit (429 / `40003`) | Exponential backoff: 1s, 2s, 4s, 8s... |
| Queue full (`40318`) | Pause 30-60 seconds. Reduce sending rate by 50%. |
| Carrier rejection spike | Pause 5 minutes. Reduce rate by 75%. Ramp up slowly. |
| Gateway timeout | Retry after 10s. Max 2 retries. |
| T-Mobile daily cap hit | Stop sending to T-Mobile recipients. Resume next day. |
| Account-level throttle | Pause all sending 60s. Contact Telnyx if persistent. |

---

## Opt-Out Edge Cases

| Edge Case | Behavior | Recommended Action |
|-----------|----------|-------------------|
| Recipient texts "STOP" mid-campaign | Telnyx auto-blocks immediately. Subsequent sends return `40300`. | Your webhook handler should also flag in your DB. No further action needed — Telnyx handles it. |
| Recipient texts "START" to re-opt-in | Telnyx removes block. `autoresponse_type: "START"` in webhook. | Remove from suppression list. Send re-confirmation message. |
| "STOP" from toll-free number | Carrier sends its OWN auto-reply PLUS your custom STOP response (2 messages). | Can't prevent carrier's NETWORK MSG on toll-free. Accept the double reply. |
| Opt-out from one number on profile | Block applies to ALL numbers on that messaging profile. | If you need separate opt-out lists per campaign, use separate messaging profiles. |
| Typo like "STPO" or "SOTP" | NOT recognized as opt-out by default. | Consider adding common misspellings as custom opt-out keywords. |
| "Stop" in lowercase | Recognized — keyword matching is case-insensitive. | No action needed. |
| "Please stop texting me" | NOT recognized — only exact keyword matches. | Only exact keywords (STOP, CANCEL, etc.) trigger auto-opt-out. |
| Re-engagement after 90+ days | May need re-consent under CTIA guidelines. | Send re-engagement message: "Reply YES to keep receiving. STOP to unsubscribe." After 30 days no response → auto-suppress. |

---

## Production Checklist

```
Infrastructure:
  □ Phone number(s) purchased and active
  □ Messaging profile created with production webhook URL
  □ Messaging profile has whitelisted_destinations set (FRIC-001)
  □ Phone number(s) assigned to messaging profile
  □ 10DLC brand registered and VERIFIED (not just OK)
  □ 10DLC campaign created as MARKETING or MIXED
  □ 10DLC campaign approved (status: MNO_PROVISIONED)
  □ Phone number(s) assigned to 10DLC campaign (status: ASSIGNED)
  □ Webhook endpoint reachable and returning 200 within 2 seconds

Campaign Logic:
  □ Recipient list validated via Number Lookup (landlines excluded)
  □ Suppression list checked before every send
  □ Rate limiting implemented (token bucket at 80% capacity)
  □ Timezone-aware scheduling (send at local 10 AM per zone)
  □ TCPA quiet hours enforced (no sends 8 PM - 8 AM recipient local time)
  □ Brand name included in every message
  □ Opt-out language in every message ("Reply STOP to opt out")
  □ No URL shorteners (full branded URLs only)
  □ No SHAFT content without age-gating
  □ Smart encoding enabled on messaging profile (avoid accidental UCS-2)
  □ Error handling with retry logic for transient failures
  □ Circuit breaker for sustained failures

Opt-Out & Compliance:
  □ STOP/HELP/START auto-responses configured
  □ Opt-out webhook handler processes autoresponse_type events
  □ Suppression list maintained in application database
  □ Consent records stored (timestamp, IP, language shown, method)
  □ Message frequency matches opt-in disclosure
  □ Privacy policy and Terms of Service published and linked from opt-in

Monitoring:
  □ Track delivery rate per campaign (target: >95%)
  □ Track opt-out rate per campaign (flag if >2%)
  □ Monitor carrier-specific failure rates
  □ Alert on sudden delivery rate drops
  □ Alert on queue full errors (40318)
  □ Log all webhook events with message_id for audit trail

Security:
  □ API key stored as environment variable (not in code)
  □ Webhook signatures verified (Ed25519)
  □ HTTPS for all webhook endpoints
  □ Rate limiting on webhook endpoint (prevent abuse)
```

---

## Message Content Compliance Checklist

Every marketing SMS message must include:
- ✅ Your brand name
- ✅ Opt-out language ("Reply STOP to opt out")
- ✅ Full branded URLs (no bit.ly, tinyurl, or other shorteners)
- ❌ No ALL CAPS body text
- ❌ No excessive punctuation (!!!) or emoji spam
- ❌ No SHAFT content (Sex, Hate, Alcohol, Firearms, Tobacco) without age-gating

---

## Campaign Performance Benchmarks

| Metric | Good Benchmark |
|---|---|
| Delivery Rate | > 95% |
| Failure Rate | < 3% |
| Opt-Out Rate | < 2% per campaign |
| DLR Timeout Rate | < 5% |

---

## Environment Variables

```bash
# Required
TELNYX_API_KEY=KEY0123456789...          # Your Telnyx API key

# Created during setup (save these)
TELNYX_PHONE_NUMBER=+19705551234         # Your purchased phone number(s)
TELNYX_PHONE_NUMBER_ID=...               # Phone number resource ID
MESSAGING_PROFILE_ID=...                 # Messaging profile UUID
BRAND_ID=...                             # 10DLC brand UUID
CAMPAIGN_ID=...                          # 10DLC campaign UUID (MARKETING/MIXED)

# Webhook
WEBHOOK_URL=https://your-app.example.com/webhooks/messaging
TELNYX_PUBLIC_KEY=...                    # For webhook signature verification

# Optional
WEBHOOK_FAILOVER_URL=https://backup.your-app.example.com/webhooks/messaging
```

---

## Capacity Planning Quick Reference

| Campaign Size | Sender Type | Numbers Needed | Estimated Time |
|--------------|-------------|----------------|----------------|
| 1,000 | 1 Toll-Free | 1 | ~50 seconds |
| 10,000 | 1-2 Toll-Free | 1-2 | ~8-16 minutes |
| 100,000 | 3-5 Toll-Free (number pool) | 3-5 | ~1.5-3 hours |
| 100,000 | 10DLC Top Tier | 2-5 | ~22 minutes |
| 500,000 | Toll-Free pool or Short Code | 5-10 | ~2.8+ hours |

> Account max: 50 SMS/sec. Contact Telnyx to increase. T-Mobile daily cap: 200K (top tier) — the real bottleneck for large US campaigns.
