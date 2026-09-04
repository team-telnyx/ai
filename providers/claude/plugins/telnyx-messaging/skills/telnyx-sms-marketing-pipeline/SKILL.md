---
name: telnyx-sms-marketing-pipeline
description: >-
  Reference material for the sms-marketing-pipeline-developer agent. Contains
  architecture diagrams, 6-language SDK code examples, 9 friction points with
  workarounds, troubleshooting with retry logic and compliance checklists, and
  a validation script for SMS marketing pipeline infrastructure using Telnyx
  Messaging API, Number Lookup, Global Numbers, Messaging Profiles, 10DLC
  Registration, and Webhooks.
user_invocable: false
metadata:
  author: telnyx
  product: messaging
  blueprint-id: AIFDE-29
  version: "2.0"
---

# SMS Marketing Pipeline — Reference Material

This skill provides reference documentation for the `sms-marketing-pipeline-developer` agent. The agent is the interactive entry point; these documents are the detailed reference material the agent consults.

## Documents

| Document | Contents |
|----------|----------|
| `references/architecture.md` | Service diagrams (ASCII + Mermaid), dependency graph, rate limits, capacity planning |
| `references/code-examples.md` | Python, Node.js, Ruby, PHP, Java, Go SDK examples for every step |
| `references/friction-log.md` | 9 friction points discovered during validation (FRIC-001 to FRIC-009) |
| `references/troubleshooting.md` | Error handling, carrier filtering, 10DLC rejections, compliance checklist, benchmarks |
| `scripts/validate-setup.sh` | Infrastructure validation script — 7 checks, exit 0 when all pass |

## Services Used

| # | Service | Role |
|---|---------|------|
| 1 | Global Numbers | Search & purchase SMS-capable phone numbers |
| 2 | Messaging Profiles | Configure SMS delivery (webhooks, whitelisted destinations, number pool) |
| 3 | 10DLC Registration | US carrier compliance — brand + MARKETING/MIXED campaign with TCR |
| 4 | Number Lookup | Pre-send list hygiene — detect carrier type, filter invalid numbers |
| 5 | Messaging API | Send SMS/MMS messages with rate limiting |
| 6 | Webhooks | Real-time delivery receipts and inbound opt-out processing |

## Cost Estimate

| Item | Cost | Frequency |
|------|------|-----------|
| Phone number | ~$1.00/mo each | Monthly |
| 10DLC brand registration | $4.00 | One-time |
| 10DLC brand vetting | ~$40.00 | One-time |
| 10DLC campaign registration | ~$15.00 | One-time |
| 10DLC campaign fee | ~$10.00/mo | Monthly |
| Number Lookup (list hygiene) | ~$0.0025/query | Per validation |
| Outbound SMS | ~$0.004 + carrier fee (~$0.003) | Per message segment |

**Estimated cost for 10,000-message campaign:** ~$107 (first campaign, ~$95 subsequent)
