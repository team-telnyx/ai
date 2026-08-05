# Friction Feedback Loop CLI

CLI for reporting Telnyx API friction to the FFL (Friction Feedback Loop) backend.

---

## Overview

When AI agents or developers encounter friction using Telnyx APIs (parameter mismatches, unclear errors, missing docs), they can report it using this CLI. Reports go to the FFL backend, where the Telnyx team uses them to fix docs, specs, and skills — every report makes the skills in this repo better.

---

## Installation

```bash
pip install "git+https://github.com/team-telnyx/ai.git#subdirectory=tools/ffl-cli"
```

---

## Configuration

**Minimum required:**
```bash
export TELNYX_API_KEY="<your-api-key>"
```

**Optional overrides:**
```bash
# Override endpoint (dev/testing)
export TELNYX_FRICTION_ENDPOINT="https://ffl-backend.telnyx.com/v2/friction"

# Production endpoint is configured by default (no override needed)
```

**Note:** Production endpoint (`https://ffl-backend.telnyx.com/v2/friction`) is configured by default.

---

## Usage in AgentSkills

**⚠️ ALL commands in AgentSkills MUST use the watchdog wrapper.**

### Wrapper Format

```bash
friction-report watchdog --skill <SKILLNAME> --team <TEAM> -- <your-command-here>
```

### When to Use the Wrapper

**ALWAYS wrap these command types:**

1. **Bash scripts:**
   ```bash
   friction-report watchdog --skill telnyx-verify --team numbers -- \
     ./scripts/verify.sh create-profile --name "Test"
   ```

2. **CLI tools:**
   ```bash
   friction-report watchdog --skill telnyx-cli --team numbers -- \
     telnyx number list --limit 10
   ```

3. **API calls (curl):**
   ```bash
   friction-report watchdog --skill telnyx-messaging --team messaging -- \
     curl -X POST "https://api.telnyx.com/v2/messages" -H "Authorization: Bearer $TELNYX_API_KEY" -d '{...}'
   ```

4. **SDK scripts:**
   ```bash
   friction-report watchdog --skill telnyx-voice-js --team voice -- \
     node send-call.js
   ```

### What Gets Auto-Detected

- ❌ Exit code != 0 → `type: api, severity: major`
- ❌ Error keywords in stderr → `type: api, severity: minor`  
- ❌ Command not found → `type: docs, severity: blocker`

### Output Modes

- `--output auto` (default): Remote if TELNYX_API_KEY set, local otherwise
- `--output local`: Save to `~/.openclaw/friction-logs/`
- `--output remote`: Send to FFL backend (requires a Telnyx API key)
- `--output both`: Local file + remote report

---

## Quick Start (Automatic Detection - Recommended)

Use the **watchdog** subcommand to automatically detect and report friction:

```bash
friction-report watchdog --skill <skillname> --team <team> -- <command>
```

**On success:**
```
🔍 Running with friction monitoring: <command>
✅ No friction detected
[command output]
```

**On error:**
```
🔍 Running with friction monitoring: <command>
 ›   Error: <error message>

✅ Friction reported to remote: http://ffl-backend...

🚨 Auto-reported: Command failed (exit code 2)
```

**Auto-detected friction:**
- ❌ Exit code != 0 → auto-report (severity: major)
- ❌ Error keywords in stderr → auto-report (severity: minor)
- ❌ Command not found → auto-report (severity: blocker)

---

## Quick Start (Manual Reporting)

For cases where automatic detection doesn't capture the issue:

```bash
friction-report \
  --skill telnyx-webrtc-python \
  --team webrtc \
  --type parameter \
  --severity major \
  --message "API expects 'certificate' but docs say 'cert'" \
  --context '{"endpoint":"POST /v2/mobile_push_credentials","error":"422"}'
```

### Watchdog Options

```bash
friction-report watchdog --skill <SKILLNAME> --team <TEAM> -- <command>
```

- `--skill SKILL` - Skill name (required)
- `--team TEAM` - Product team: webrtc, messaging, voice, numbers, ai, fax, iot, default (required)
- `-- <command>` - Command to execute with friction monitoring (required)

### Manual Report Options

- `--skill SKILL` - Skill name (required)
- `--team TEAM` - Product team: webrtc, messaging, voice, etc. (required)
- `--language LANG` - SDK language: python, javascript, go, etc. (default: auto-detect)
- `--type TYPE` - Friction type: `parameter`, `api`, `docs`, `auth` (required)
- `--severity SEV` - Severity: `blocker`, `major`, `minor` (required)
- `--message MSG` - Brief description (required, max 200 chars)
- `--context JSON` - Additional context as JSON string (optional)
- `--output MODE` - Output mode: `local`, `remote`, `both`, `auto` (default: `auto`)
- `--api-key KEY` - Telnyx API key (optional, uses `TELNYX_API_KEY` env var)

---

## Quick Start (Python Library)

Use as a Python library for programmatic reporting:

```python
import os
from telnyx_ffl_cli import FrictionReporter

# Configure environment
os.environ["TELNYX_FRICTION_ENDPOINT"] = "https://ffl-backend.telnyx.com/v2/friction"
os.environ["TELNYX_API_KEY"] = "KEY..."

# Initialize reporter
friction = FrictionReporter(
    skill='telnyx-webrtc-python',
    team='webrtc',
    output='remote'  # local, remote, both, auto
)

# Report friction
result = friction.report(
    type='parameter',
    severity='major',
    message="API expects 'certificate' but docs say 'cert'",
    context={
        'endpoint': 'POST /v2/mobile_push_credentials',
        'attempted_param': 'cert',
        'correct_param': 'certificate'
    }
)

print(result)
# {'remote': {'status': 'sent', 'endpoint': 'http://...'}}
```

---

## Output Modes

### `auto` (default)
Automatically chooses where to send reports:
- **With API key + endpoint** → `remote` (sends to FFL backend)
- **Without** → `local` (saves YAML files to `~/.openclaw/friction-logs/`)

### `local`
Save reports as YAML files locally (no API call).

### `remote`
Send reports to FFL backend (requires `TELNYX_FRICTION_ENDPOINT` and `TELNYX_API_KEY`).

### `both`
Save locally AND send remotely.

---

## Friction Types

- **`parameter`** - Parameter name/format mismatch
- **`api`** - API behavior differs from docs
- **`docs`** - Documentation unclear, missing, or incorrect
- **`auth`** - Authentication/authorization issues

---

## Severity Levels

- **`blocker`** - Prevents completion (e.g., API always fails)
- **`major`** - Significant workaround required
- **`minor`** - Small inconvenience or unclear documentation

---

## Examples

See the [`examples/`](./examples/) directory for:
- [`basic_usage.sh`](./examples/basic_usage.sh) - CLI usage examples
- [`from_python.py`](./examples/from_python.py) - Python library usage
- [`skill_integration.py`](./examples/skill_integration.py) - Integration pattern for skills

---

## Skill Integration

See [`templates/SKILL_TEMPLATE.md`](./templates/SKILL_TEMPLATE.md) for a copy-paste template to add friction reporting to your Telnyx skills.

---

## Development

### Local Testing

```bash
# Clone repo
git clone https://github.com/team-telnyx/ai.git
cd ai/tools/ffl-cli

# Install in editable mode
pip install -e .

# Test CLI
friction-report --help

# Test local mode (no backend required)
friction-report \
  --skill test-skill \
  --team ai \
  --type api \
  --severity minor \
  --message "Testing local mode" \
  --output local

# Check output
cat ~/.openclaw/friction-logs/friction-*.yaml
```

### Running Tests

```bash
# TODO: Add tests
python -m pytest tests/
```

---

## Architecture

```
┌─────────────────┐
│  AI Agent/Skill │
└────────┬────────┘
         │
         │ friction-report CLI
         │ or FrictionReporter()
         │
         ▼
┌─────────────────────────┐
│  friction_sdk/reporter  │
│  - Validates report     │
│  - Sends to backend     │
└────────┬────────────────┘
         │
         ├─► Local: ~/.openclaw/friction-logs/*.yaml
         │
         └─► Remote: POST /v2/friction
                     ▼
             ┌──────────────────┐
             │  FFL Backend     │
             │  (aifde-ffl-     │
             │   backend)       │
             └──────────────────┘
```

---

## License

MIT

---

## Support

For questions or issues, [open an issue](https://github.com/team-telnyx/ai/issues) on this repo or email ai-fde@telnyx.com.
