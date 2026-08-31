---
name: telnyx-phone-verification
description: >-
  Reference material for the phone-verification-developer agent. Contains
  architecture diagrams, 6-language SDK code examples, 11 friction points
  with workarounds, troubleshooting with retry logic, and a validation
  script for phone verification infrastructure using Telnyx Verify API,
  Number Lookup, Global Numbers, Messaging Profiles, and 10DLC.
user_invocable: false
metadata:
  author: telnyx
  product: verify
  blueprint-id: AIFDE-23
  version: "3.1"
---

# Phone Verification — Reference Material

This skill provides reference documentation for the `phone-verification-developer` agent. The agent is the interactive entry point; these documents are the detailed reference material the agent consults.

## Documents

| Document | Contents |
|----------|----------|
| `references/architecture.md` | Service diagrams (ASCII + Mermaid), dependency graph, data flow |
| `references/code-examples.md` | Python, Node.js, Ruby, PHP, Java, Go SDK examples for every step |
| `references/friction-log.md` | 11 friction points discovered during validation (FRIC-001 to FRIC-011) |
| `references/troubleshooting.md` | Error handling, retry logic, production checklist, webhook receiver examples |
| `scripts/validate-setup.sh` | Infrastructure validation script — 7 checks, exit 0 when all pass |

## Services Used

| # | Service | Role |
|---|---------|------|
| 1 | Number Lookup | Pre-validate phone numbers — detect line type before sending |
| 2 | Global Numbers | Search & purchase SMS-capable numbers |
| 3 | Messaging Profiles | Configure SMS delivery (webhooks, delivery settings) |
| 4 | 10DLC Registration | US carrier compliance (brand + campaign with TCR) |
| 5 | Verify API | OTP generation, delivery, expiry tracking, and verification |

## Cost Estimate

| Item | Cost | Frequency |
|------|------|-----------|
| Phone number | ~$1.00/mo | Monthly |
| 10DLC brand | $4.00 | One-time (non-refundable) |
| Number Lookup | ~$0.01 | Per verification |
| SMS verification | ~$0.004 | Per verification |
| Voice verification | ~$0.01/min | Per verification |

**Estimated per-verification cost:** ~$0.015
