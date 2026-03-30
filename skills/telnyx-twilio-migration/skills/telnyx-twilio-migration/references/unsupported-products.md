# Unsupported Products & Platforms

Products and platforms detected by the scanner that are NOT covered by this migration skill.

## Products with No Telnyx Equivalent

These Twilio products have no direct Telnyx replacement. When the scanner detects them, present this table to the user with recommended alternatives.

| Twilio Product | Status | Recommended Alternative |
|---|---|---|
| **Flex** (Contact Center) | No equivalent | Telnyx provides voice/messaging primitives — build custom CC with Call Control + conferencing, or use a third-party CCaaS |
| **Studio** (Visual Workflows) | No equivalent | Extract Studio flow logic into application code, then migrate that code using this skill |
| **TaskRouter** (Queue Routing) | No equivalent | Build custom routing with Call Control events + your own queue logic |
| **Conversations** (Multi-channel) | No equivalent | Use Telnyx Messaging for SMS + your own chat backend |
| **Sync** (Real-time State) | No equivalent | Use Redis, Firebase, or another real-time data store |
| **SendGrid** (Email) | No equivalent | Use a dedicated email provider (SendGrid can remain alongside Telnyx) |
| **Twilio Pay** | No equivalent | Use Stripe/Braintree for payment processing. No `<Pay>` verb in TeXML. |
| **Autopilot** (NLU) | No equivalent | Use Telnyx AI Assistants for voice AI, or bring your own NLU |
| **Notify** (Push/SMS Notifications) | No equivalent | Use Telnyx Messaging API directly for SMS notifications. For push, use FCM/APNs directly. |
| **Proxy** (Phone Masking) | No equivalent | Build custom number masking with Telnyx Messaging API + number pool |
| **Segment** (CDP) | No equivalent | Consider Segment independently, or alternatives (Rudderstack, mParticle) |

## Multi-Service Architecture

If the scanner detects Twilio usage across multiple independent services (microservices, separate repos):

1. **Run this skill on each service independently**
2. In **Phase 0 of the FIRST service**, create shared Telnyx resources (messaging profiles, connections, outbound voice profiles)
3. **Subsequent services reuse those same resource IDs** — pass them as environment variables
4. Each service gets its own migration branch and validation cycle

## Infrastructure-as-Code

If the scanner detects Twilio references in infrastructure files:

| File Type | What to Do |
|---|---|
| Terraform (`.tf`) | Update provider configs manually. This skill handles application code only. |
| CloudFormation (`.yaml`/`.json`) | Update resource definitions manually. |
| SAM templates | Update API definitions manually. |
| Docker/Compose files | Update env var references — this skill can help with that. |
| CI/CD configs (`.github/`, `.circleci/`) | Update env var names from `TWILIO_*` to `TELNYX_*`. |

## How to Present This to the User

In Phase 1 (Discovery), after scanning:

```
The following detected products/platforms are OUT OF SCOPE for automated migration:

❌ [product name] — No Telnyx equivalent. See references/unsupported-products.md
   Recommended: [alternative from table above]

The migration will proceed with the remaining in-scope products:
✅ [list of migratable products]
```

For each unsupported product, the user should decide:
1. **Keep it on Twilio** — Twilio and Telnyx can coexist
2. **Replace with alternative** — Use the recommended alternative from the table above
3. **Remove it** — If the feature is no longer needed
