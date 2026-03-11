# 10DLC Registration

Register for 10DLC (10-Digit Long Code) to enable A2P SMS messaging in the USA.

## Quick Start

```bash
# Setup (one-time)
./setup.sh

# Start registration wizard
./scripts/register.sh

# Check status
./scripts/status.sh

# Assign number to campaign
./scripts/assign.sh +15551234567 <campaign-id>
```

## User Story

> **AIFDE-5:** "As a Telnyx user, I would like to do a 10DLC registration as a sole proprietor so I can send SMS in the USA"

✅ **Status:** Scripts ready, needs testing

## Requirements

- Telnyx CLI (`npm install -g @telnyx/api-cli`)
- Telnyx API key ([portal.telnyx.com](https://portal.telnyx.com/#/app/api-keys))
- At least one US phone number

## What is 10DLC?

10DLC (10-Digit Long Code) is a system for registering business messaging on standard US phone numbers. Required for A2P (Application-to-Person) SMS in the USA.

**Registration involves:**
1. **Brand** — Your business identity
2. **Campaign** — Use case (e.g., 2FA, marketing)
3. **Number assignment** — Link phone numbers to campaigns

## Files

| File | Purpose |
|------|---------|
| `SKILL.md` | Clawdbot skill definition |
| `config.json` | Default configuration |
| `setup.sh` | Setup and auth |
| `test.sh` | Verify installation |
| `scripts/register.sh` | Interactive wizard |
| `scripts/status.sh` | Check brands/campaigns |
| `scripts/assign.sh` | Assign numbers |

## See Also

- [SKILL.md](SKILL.md) — Full documentation
- [Telnyx 10DLC Docs](https://developers.telnyx.com/docs/messaging/10dlc)
