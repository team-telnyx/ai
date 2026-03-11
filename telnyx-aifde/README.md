# Telnyx AI FDE Skills (Hand-Crafted)

Hand-crafted, manually validated agent skills built by the **AI FDE team**. These skills use bash wrapper scripts with built-in input validation, error handling, and routing logic — designed for agents to follow with zero human help.

## Skills

| Skill | Product | Description | FFL Score |
|-------|---------|-------------|-----------|
| `telnyx-verify` | Verify API | Create profiles, send OTP (SMS/voice/flash), verify codes, manage templates | 9.5/10 |
| `telnyx-number-lookup` | Number Lookup | Carrier info, line type, CNAM, portability, verification routing recommendations | 9.5/10 |
| `telnyx-sms-campaign` | Messaging + 10DLC | Full SMS marketing pipeline: buy numbers, create profiles, register 10DLC, send campaigns | 9.5/10 |
| `telnyx-10dlc-registration` | 10DLC | Brand + campaign registration for US A2P messaging compliance | 9.5/10 |

## How These Differ from Auto-Generated Skills

| | Hand-Crafted (this folder) | Auto-Generated (`telnyx-curl/`, `telnyx-javascript/`) |
|---|---|---|
| **Wrapper scripts** | ✅ Full CLI with `--flags` | ❌ Raw curl/SDK examples |
| **Input validation** | ✅ E.164 format, required args | ❌ None |
| **Error handling** | ✅ Built-in (clear messages) | ❌ Raw API errors |
| **API complexity** | ✅ Abstracted (e.g., SMS channel config) | ❌ User must guess params |
| **FFL tested** | ✅ Every endpoint tested live | ⚠️ Varies |
| **Maintained by** | AI FDE team | Auto-generator from OpenAPI |

## Author

**Ifthikar Razik** — AI FDE Team @ Telnyx

## Related

- [AIFDE-23: Phone Verification Blueprint](https://github.com/team-telnyx/ai-fde-blueprints/blob/main/Phone-Verification-Flow.md)
- [AIFDE-29: SMS Marketing Pipeline Blueprint](https://github.com/team-telnyx/ai-fde-blueprints)
- [FFL Testing Results](https://github.com/team-telnyx/aifde-docs-friction-feedback-loop)
