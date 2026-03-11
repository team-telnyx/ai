# SMS Campaign Compliance Reference

Quick reference for US A2P SMS marketing compliance. This is guidance, not legal advice.

## TCPA (Telephone Consumer Protection Act)

### Consent Requirements

- **Express written consent** is required for marketing/promotional messages
- Consent must be "clear and conspicuous" — no buried checkboxes
- Must disclose: message frequency, "message and data rates may apply", how to opt out
- Consent cannot be a condition of purchase
- Keep records of consent (timestamp, source, IP, consent language shown)

### Quiet Hours

- **No sending between 9:00 PM and 8:00 AM** in the recipient's local time zone
- This means you need to know the recipient's time zone or area code mapping
- Some states have stricter rules (e.g., Oklahoma: 8 PM cutoff)

### Penalties

- $500–$1,500 per unsolicited message
- Class action lawsuits are common — one bad campaign can cost millions

## 10DLC (10-Digit Long Code)

### Registration Required

All US A2P SMS from local numbers requires 10DLC registration:

1. **Brand Registration** — Register your company with The Campaign Registry (TCR)
2. **Campaign Registration** — Register each use case (campaign type)
3. **Number Assignment** — Assign phone numbers to campaigns

### Campaign Types

| Type | Description | Throughput |
|------|-------------|------------|
| MARKETING | Promotional, sales, offers | Varies by trust score |
| MIXED | Informational + promotional | Varies by trust score |
| LOW_VOLUME | <1000 msg/month, mixed content | Low |
| CHARITY | Non-profit campaigns | Medium |

### Trust Scores

Carrier throughput depends on your TCR trust score (1–100):
- **75+** — High throughput (~75 msg/segment per second on T-Mobile)
- **50–74** — Medium throughput
- **1–49** — Low throughput (~4 msg/segment per second on T-Mobile)

Sole proprietors are capped at a trust score that allows ~1 msg/sec.

## Required Message Elements

Every marketing SMS must include:

1. **Brand identification** — Company/brand name
2. **Opt-out instructions** — "Reply STOP to opt out" (or similar)
3. **Relevant content** — Match what the user consented to receive

### Example Compliant Message

```
Acme Co: Flash sale! 25% off all items today only. Shop now: acme.com/sale Reply STOP to opt out
```

### What NOT to Send

- ❌ Messages without brand identification
- ❌ Messages without opt-out language
- ❌ Content that doesn't match the registered campaign type
- ❌ Messages outside quiet hours
- ❌ SHAFT content (Sex, Hate, Alcohol, Firearms, Tobacco) without proper campaign type

## Carrier-Specific Rules

### AT&T

- **Blocks URL shorteners:** bit.ly, tinyurl.com, goo.gl, ow.ly, t.co — use full URLs or your own branded shortener
- **Content filtering:** Aggressive spam detection; avoid ALL CAPS, excessive punctuation, and spammy keywords
- **Daily volume limits** based on trust score

### T-Mobile

- **Daily message caps** per campaign based on trust score:
  - Low trust: ~2,000 msg/day
  - Medium trust: ~10,000 msg/day  
  - High trust: ~200,000 msg/day
- **Content filtering:** Blocks messages that look like phishing
- **Rate limiting:** Per-second caps based on trust score

### Verizon

- **Content filtering:** Filters for spam patterns
- **Delivery receipts:** Less reliable than AT&T/T-Mobile
- **Long message handling:** May split differently than other carriers

## Opt-Out Handling

### Standard Keywords

Carriers require automatic handling of these keywords (case-insensitive):

| Keyword | Action |
|---------|--------|
| STOP | Opt out of all messages |
| CANCEL | Opt out |
| UNSUBSCRIBE | Opt out |
| END | Opt out |
| QUIT | Opt out |
| HELP | Send help/info message |
| INFO | Send help/info message |
| START | Re-subscribe (opt back in) |
| UNSTOP | Re-subscribe |
| YES | Re-subscribe |

### Opt-Out Response

When someone texts STOP, respond with:

```
You have been unsubscribed from Acme Co alerts. No more messages will be sent. Reply START to resubscribe.
```

### Implementation

- Telnyx handles automatic opt-out responses when `autoresponse_type` is configured on the messaging profile
- You **must also** maintain an internal suppression list
- Check the suppression list before every send
- Never send to an opted-out number — even if they're on a new list

## Record-Keeping

Maintain records for at least **5 years**:

- [ ] Consent records (who, when, how, what they consented to)
- [ ] Opt-out records (who, when)
- [ ] Message logs (to, from, content, timestamp, delivery status)
- [ ] Campaign registration details
- [ ] Complaint records

## Pre-Send Checklist

Before every campaign:

1. ✅ Recipients have valid, documented consent
2. ✅ Suppression list is current (all opt-outs removed)
3. ✅ Message includes brand name and opt-out language
4. ✅ No URL shorteners (use full URLs)
5. ✅ Sending during compliant hours (8 AM – 9 PM recipient local time)
6. ✅ Content matches registered campaign type
7. ✅ Rate limiting configured within trust score limits
8. ✅ 10DLC campaign is approved and active
9. ✅ Messaging profile has correct `whitelisted_destinations`
10. ✅ Webhook configured for delivery receipts and opt-outs

## Resources

- [Telnyx 10DLC Guide](https://developers.telnyx.com/docs/messaging/10dlc)
- [CTIA Messaging Principles](https://www.ctia.org/the-wireless-industry/industry-commitments/messaging-principles-and-best-practices)
- [TCR (The Campaign Registry)](https://www.campaignregistry.com/)
- [FCC TCPA Rules](https://www.fcc.gov/general/telemarketing-and-robocalls)
