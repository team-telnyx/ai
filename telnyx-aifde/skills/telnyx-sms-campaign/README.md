# telnyx-sms-campaign

Orchestrate SMS marketing campaigns with Telnyx — list hygiene, rate-limited sending, delivery tracking, and opt-out compliance.

## Scripts

- `scripts/validate-list.sh` — Filter recipients via Number Lookup API
- `scripts/send-campaign.sh` — Send campaign with rate limiting and retry
- `scripts/check-delivery.sh` — Check delivery status from campaign log

## Requirements

- `TELNYX_API_KEY` environment variable
- `jq`, `curl`
- Phone number assigned to a messaging profile with `whitelisted_destinations`
- 10DLC campaign approved (for US A2P)
