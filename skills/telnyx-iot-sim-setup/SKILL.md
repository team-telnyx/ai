---
name: telnyx-iot-sim-setup
description: >-
  IoT SIM provisioning skill for Telnyx Wireless. Guides users through SIM
  registration, group management, activation, and connectivity verification.
  Used by the iot-sim-developer agent.
metadata:
  author: telnyx
  product: iot
---

# telnyx-iot-sim-setup

Reference documents and validation scripts for the IoT SIM setup flow used by the `iot-sim-developer` agent.

## Structure

```
skills/telnyx-iot-sim-setup/
├── SKILL.md                          (this file)
├── references/
│   ├── architecture.md               — service architecture + Mermaid dependency graph
│   ├── troubleshooting.md            — common IoT SIM issues and resolutions
│   └── friction-log.md               — known friction points (auto-updated)
└── scripts/
    └── validate-setup.sh             — validates API key, SIMs, groups, and connectivity
```

## Related Skills

- **telnyx-iot-curl** — Full IoT SIM REST API reference with curl examples for every endpoint.

## Usage

This skill is loaded automatically by the `iot-sim-developer` agent. The reference documents provide context when the agent encounters issues, and the validation script can be run independently to verify the environment is ready for IoT SIM provisioning.

## Validation

```bash
bash skills/telnyx-iot-sim-setup/scripts/validate-setup.sh
```

Checks: API key configured, API reachable, SIMs exist, groups exist, at least one SIM enabled.
