# @telnyx/agent-cli

Agent-friendly CLI for Telnyx API v2 — composite setup commands that reduce multi-step portal workflows to a single command.

Use Node.js 20.11 or newer for installation. Although `package.json` currently
states Node.js 18 or newer, the ESM postinstall needs `import.meta.dirname`,
which is available from Node.js 20.11. On older runtimes installation can finish
without downloading the vendored Telnyx Go CLI, leaving Go-backed commands to
require a separately installed compatible `telnyx` on `PATH`. The package's
platform release pin is Telnyx Go CLI v0.27.0; on supported platforms, a working
postinstall downloads that binary when a compatible local copy is unavailable.

## Quick Start

```bash
# Install
npm install -g @telnyx/agent-cli

# Set your API key
export TELNYX_API_KEY="KEY_xxx"

# Check account status
telnyx-agent status

# See all capabilities
telnyx-agent capabilities
```

> **Contributors / from-source:** run the CLI with `node bin/telnyx-agent.mjs <command>`
> (the published `bin`). The older `npx tsx bin/telnyx-agent.ts` form is dev-only and
> is **not** what an installed user runs.

## Commands

### `telnyx-agent status`

Account health at a glance — balance, phone numbers, messaging profiles, voice connections, AI assistants.

```bash
telnyx-agent status          # Human-readable
telnyx-agent status --json   # Machine-readable
```

### `telnyx-agent capabilities`

Machine-readable catalog of API capabilities and selected composite-command
descriptions. It is not a complete router inventory; use the selection catalog
below or `telnyx-agent --help` for all currently routed commands.

```bash
telnyx-agent capabilities
telnyx-agent capabilities --json
```

### Agent command selection catalog

#### How an agent should choose

- Prefer `list-*` or search commands before `get-*` or mutation commands when
  you do not already have an exact resource ID; retrieve the selected resource
  before changing or deleting it.
- Distinguish `setup-*` composites, which can coordinate several provisioning
  steps and purchases, from lifecycle commands that act on one existing
  resource. Use the narrower lifecycle command when the resource already exists.
- Inspect each operational note before dispatch. Treat create, buy, send, submit,
  activate, and delete operations as live side effects; preserve confirmation
  gates and account for asynchronous or approval-pending states.

Use the catalog below to select the smallest command that matches the intended
workflow. It is a decision guide, not a flag reference or per-command tutorial;
the focused sections later in this README cover common composites and nuanced
operations, while `telnyx-agent --help` shows the complete routed command and
flag surface. `telnyx-agent capabilities --json` is a machine-readable API
capability catalog, not a substitute for this complete router inventory.

<!-- markdownlint-disable MD013 -->

### Account and discovery

| Command | Agent selection sentence | Operational note |
| --- | --- | --- |
| `status` | Use this to inspect account health across balance, owned numbers, messaging profiles, voice connections, and AI assistants. | Read-only; direct REST |
| `capabilities` | Use this to discover the CLI’s machine-readable API-capability catalog and selected composite workflows. | Read-only; local metadata; not the complete router inventory |
| `fund-account` | Use this to request an x402 USDC funding quote or, with a wallet key, sign and submit account funding. | Funds account when signing; non-idempotent; direct REST |

### Composite provisioning

| Command | Agent selection sentence | Operational note |
| --- | --- | --- |
| `setup-sms` | Use this to provision or reuse an SMS messaging profile, obtain a phone number, and assign the number to the profile in one workflow. | Creates/buys; reuses unless forced; hybrid REST + Go CLI |
| `setup-voice` | Use this to provision or reuse a Call Control application, obtain a phone number, and assign the number for voice in one workflow. | Creates/buys; reuses unless forced; hybrid REST + Go CLI |
| `setup-iot` | Use this to select an IoT SIM, create its SIM-card group, enable the SIM, and assign it to that group. | Creates/activates; asynchronous SIM action; hybrid REST + Go CLI |
| `setup-ai` | Use this to create an AI assistant, buy a phone number, and connect them through a TeXML application. | Creates/buys; non-idempotent; hybrid REST + Go CLI |
| `setup-wireguard` | Use this to create a private network, WireGuard interface, and peer and return a ready-to-use peer configuration. | Creates network resources; direct REST |
| `setup-verify` | Use this to create or reuse a Verify profile for OTP delivery through Telnyx’s managed sender pool. | Creates profile; buys no number; direct REST |
| `setup-10dlc` | Use this to create a US A2P 10DLC brand and campaign and optionally assign an existing number. | Creates/submits; non-idempotent; approval pending; Go CLI |
| `setup-porting` | Use this to check number portability, create a draft port-in order, list its requirements, and optionally submit it. | Creates order; submits only when requested; direct REST |
| `setup-whatsapp` | Use this to select a WhatsApp Business Account, reuse or buy a number, initialize and verify it, and set its business profile. | Creates/buys/sends verification; may remain pending; hybrid REST + Go CLI |

### Verify

| Command | Agent selection sentence | Operational note |
| --- | --- | --- |
| `verify-send` | Use this to start a phone verification over SMS, call, flashcall, or WhatsApp and obtain its verification ID. | Sends/dials; non-idempotent; Go CLI |
| `verify-check` | Use this to retrieve a verification’s status or, when a code is supplied, submit that code for validation. | Read-only without code; submits with code; Go CLI |

### SMS, MMS, and messaging profiles

| Command | Agent selection sentence | Operational note |
| --- | --- | --- |
| `send-sms` | Use this to send an immediate SMS or MMS from a number, alphanumeric sender, or messaging-profile number pool. | Sends; non-idempotent; Go CLI |
| `send-group-mms` | Use this to send one group MMS conversation to multiple E.164 recipients. | Sends; non-idempotent; direct REST |
| `schedule-sms` | Use this to schedule an SMS for delivery at a future ISO 8601 time instead of sending it immediately. | Schedules send; non-idempotent; direct REST |
| `sms-status` | Use this to retrieve one message’s delivery state or cancel it when it is still scheduled. | Read-only by default; mutates with cancel; Go CLI |
| `list-messaging-profiles` | Use this to discover messaging profiles with name filters and pagination before choosing a profile ID. | Read-only; Go CLI |
| `create-messaging-profile` | Use this to create a messaging profile with destination and webhook controls. | Creates; Go CLI |
| `get-messaging-profile` | Use this to retrieve one messaging profile when its ID is already known. | Read-only; Go CLI |
| `update-messaging-profile` | Use this to change selected settings on an existing messaging profile. | Mutates; Go CLI |
| `delete-messaging-profile` | Use this to permanently delete a messaging profile by ID. | Deletes; requires `--confirm`; Go CLI |

### Email

| Command | Agent selection sentence | Operational note |
| --- | --- | --- |
| `email-send` | Use this to send an outbound email now or schedule it for later, including templates, multiple recipients, and attachments. | Sends/schedules; non-idempotent; Go CLI v0.27+ |
| `email-forward` | Use this to forward a message already received by a Telnyx email inbox to new recipients. | Sends; non-idempotent; Go CLI v0.27+ |
| `email-reply` | Use this to reply only to the Reply-To or From address of a message received by a Telnyx email inbox. | Sends; non-idempotent; Go CLI v0.27+ |
| `email-reply-all` | Use this to reply to all de-duplicated recipients of a message received by a Telnyx email inbox. | Sends; non-idempotent; Go CLI v0.27+ |

### WhatsApp and RCS

| Command | Agent selection sentence | Operational note |
| --- | --- | --- |
| `whatsapp-send` | Use this to send exactly one WhatsApp payload type such as text, template, media, interactive content, location, reaction, sticker, contacts, or video. | Sends; non-idempotent; Go CLI |
| `whatsapp-templates` | Use this to list templates for a WhatsApp Business Account or create a new template for approval. | Read-only by default; creates with create mode; approval pending; direct REST |
| `rcs-send` | Use this to send a text message from an RCS agent through a messaging profile. | Sends; non-idempotent; Go CLI |
| `rcs-capabilities` | Use this to check which RCS features a recipient supports before choosing RCS content. | Read-only; Go CLI |

### Phone numbers and lookup

| Command | Agent selection sentence | Operational note |
| --- | --- | --- |
| `list-phone-numbers` | Use this to list phone numbers already owned by the account, with filters and pagination. | Read-only; Go CLI |
| `search-phone-numbers` | Use this to search inventory of available phone numbers before purchasing one. | Read-only; Go CLI |
| `buy-phone-number` | Use this to purchase one available phone number and optionally assign its voice connection or messaging profile. | Buys; non-idempotent; Go CLI |
| `lookup-number` | Use this to retrieve carrier or caller-name data for an E.164 phone number. | Read-only; Go CLI |

### Voice calls, connections, and recordings

| Command | Agent selection sentence | Operational note |
| --- | --- | --- |
| `call-dial` | Use this to originate an outbound Call Control call from a configured connection. | Dials; non-idempotent; direct REST |
| `call-control` | Use this to perform a chosen action on an existing Call Control leg, including answer, hangup, transfer, media, recording, transcription, streaming, queue, or AI actions. | Mutates live call; Go CLI |
| `call-pay` | Use this to securely collect and then charge or tokenize payment details over DTMF on an active call. | Submits payment action; non-idempotent; Go CLI |
| `call-status` | Use this to retrieve the current state of one call when its call-control ID is known. | Read-only; direct REST |
| `list-voice-connections` | Use this to discover voice connections across supported connection types with filters and pagination. | Read-only; Go CLI |
| `get-voice-connection` | Use this to retrieve high-level configuration for one voice connection by ID. | Read-only; Go CLI |
| `list-active-calls` | Use this to list calls currently active on one voice connection rather than inspect a single known call. | Read-only; direct REST |
| `list-call-recordings` | Use this to list post-call recording resources and their metadata using call filters and pagination. | Read-only; Go CLI |
| `get-call-recording` | Use this to retrieve one post-call recording resource and its metadata or media URLs, not its transcript. | Read-only; Go CLI |
| `list-recording-transcriptions` | Use this to list transcription resources generated from recordings, filtered by recording or creation time. | Read-only; Go CLI |
| `get-recording-transcription` | Use this to retrieve the transcript resource for one known recording-transcription ID. | Read-only; Go CLI |

### Conferences

| Command | Agent selection sentence | Operational note |
| --- | --- | --- |
| `create-conference` | Use this to turn an active Call Control leg into a new multi-party conference. | Creates live conference; Go CLI |
| `get-conference` | Use this to retrieve one conference when its ID is known. | Read-only; Go CLI |
| `list-conferences` | Use this to discover conferences by name or status with pagination. | Read-only; Go CLI |
| `list-conference-participants` | Use this to inspect participants in one conference before applying participant controls. | Read-only; Go CLI |
| `conference-control` | Use this to control conference membership, participant state, media, DTMF, recording, supervisor roles, or lifecycle. | Mutates live conference; Go CLI |

### Meeting Bot

| Command | Agent selection sentence | Operational note |
| --- | --- | --- |
| `create-meeting-session` | Use this to create a Meeting Bot session that joins or schedules attendance at an external meeting URL. | Creates/joins meeting; non-idempotent; Go CLI v0.27+ |
| `list-meeting-sessions` | Use this to discover Meeting Bot sessions, optionally by status, before selecting a session ID. | Read-only; Go CLI v0.27+ |
| `get-meeting-session` | Use this to retrieve one Meeting Bot session when its ID is known. | Read-only; Go CLI v0.27+ |
| `end-meeting-session` | Use this to end or cancel a Meeting Bot’s participation while retaining its persisted session record. | Mutates session; Go CLI v0.27+ |
| `send-meeting-chat` | Use this to send a chat message from the bot into an active Meeting Bot session. | Sends; non-idempotent; Go CLI v0.27+ |
| `speak-in-meeting` | Use this to make the bot speak text in a meeting, optionally interrupting current playback. | Speaks/sends audio; non-idempotent; Go CLI v0.27+ |
| `stop-meeting-speaking` | Use this to stop the bot’s active text-to-speech playback without ending its meeting session. | Mutates live playback; Go CLI v0.27+ |
| `get-meeting-transcript` | Use this to retrieve cursor-paginated transcript segments from a Meeting Bot session, optionally with long polling. | Read-only; Go CLI v0.27+ |
| `get-meeting-recordings` | Use this to retrieve recordings attached to one Meeting Bot session rather than Call Control recording resources. | Read-only; Go CLI v0.27+ |
| `create-meeting-artifact` | Use this to request asynchronous generation of a summary or action-items artifact from a Meeting Bot session. | Creates async job; non-idempotent; Go CLI v0.27+ |
| `list-meeting-artifacts` | Use this to list generated artifacts for one Meeting Bot session. | Read-only; Go CLI v0.27+ |
| `get-meeting-artifact` | Use this to retrieve one generated Meeting Bot artifact by both session and artifact IDs. | Read-only; Go CLI v0.27+ |

### Telnyx Rooms

| Command | Agent selection sentence | Operational note |
| --- | --- | --- |
| `list-room-sessions` | Use this to discover Telnyx real-time media room sessions, optionally filtering by room or active state. | Read-only; Go CLI |
| `get-room-session` | Use this to retrieve one Telnyx room session, optionally including participants. | Read-only; Go CLI |
| `list-room-participants` | Use this to list participants in one Telnyx room session with context and pagination controls. | Read-only; Go CLI |
| `get-room-participant` | Use this to retrieve one Telnyx room participant by participant ID. | Read-only; Go CLI |
| `end-room-session` | Use this to end a Telnyx room session and remove all of its current participants. | Ends live session; Go CLI |
| `kick-room-participants` | Use this to remove selected participants from a Telnyx room session without ending the room. | Mutates live session; Go CLI |
| `mute-room-participants` | Use this to mute selected participants in a Telnyx room session. | Mutates live session; Go CLI |
| `unmute-room-participants` | Use this to unmute selected participants in a Telnyx room session. | Mutates live session; Go CLI |

### AI inference, assistants, and collections

| Command | Agent selection sentence | Operational note |
| --- | --- | --- |
| `ai-chat` | Use this to make a stateless OpenAI-compatible chat-completion request, not to converse through a configured Telnyx assistant. | Inference; Go CLI |
| `ai-anthropic-message` | Use this to make a stateless Anthropic-compatible Messages request through Telnyx AI inference. | Inference; Go CLI |
| `ai-embed` | Use this to create OpenAI-compatible embeddings for one text or an array of texts. | Inference; Go CLI |
| `list-ai-assistants` | Use this to discover configured AI assistants before choosing an assistant ID. | Read-only; Go CLI |
| `create-ai-assistant` | Use this to create a reusable Telnyx AI assistant configuration with instructions and optional model or voice settings. | Creates; Go CLI |
| `get-ai-assistant` | Use this to retrieve one configured AI assistant by ID. | Read-only; Go CLI |
| `update-ai-assistant` | Use this to change an assistant’s configuration and create a new assistant version. | Mutates/version-creates; Go CLI |
| `delete-ai-assistant` | Use this to permanently delete a configured AI assistant by ID. | Deletes; requires `--confirm`; Go CLI |
| `search-ai-collection` | Use this to retrieve ranked RAG chunks for a query or, without a query, list the collection’s document catalog. | Read-only; Go CLI v0.27+ |
| `chat-ai-assistant` | Use this to send a live chat turn through an existing assistant conversation rather than run a stateless completion or a test. | Sends conversation turn; non-idempotent; Go CLI |
| `send-ai-assistant-sms` | Use this to start or continue an AI assistant conversation over SMS. | Sends SMS; non-idempotent; Go CLI |
| `trigger-ai-assistant-test-run` | Use this to execute an already configured AI assistant test, not a live assistant chat turn. | Starts test execution; non-idempotent; Go CLI |
| `get-ai-assistant-test-run` | Use this to retrieve detailed results for one known assistant test run. | Read-only; Go CLI |
| `list-ai-assistant-test-runs` | Use this to inspect and filter execution history for one configured assistant test. | Read-only; Go CLI |
| `test-ai-assistant-tool` | Use this to invoke one configured assistant webhook tool with test arguments and dynamic variables. | Executes webhook; may have external side effects; Go CLI |

### Web intelligence

| Command | Agent selection sentence | Operational note |
| --- | --- | --- |
| `web-search` | Use this to find live web pages and return structured search results for a query. | Read-only retrieval; Go CLI v0.27+ |
| `web-contents` | Use this to fetch clean HTML, Markdown, or metadata for up to 20 URLs already known to you. | Read-only retrieval; Go CLI v0.27+ |
| `web-research` | Use this to synthesize a cited answer across multiple web sources synchronously or start a background research task. | Starts research; Go CLI v0.27+ |
| `web-research-status` | Use this to poll a background web-research task by ID for status, answer, and citations. | Read-only; Go CLI v0.27+ |

### Speech and fax

| Command | Agent selection sentence | Operational note |
| --- | --- | --- |
| `tts` | Use this to synthesize speech audio from text or SSML through a selected TTS provider. | Generates media; direct REST |
| `tts-voices` | Use this to list available TTS voices, optionally filtered by provider, before synthesizing speech. | Read-only; Go CLI |
| `stt` | Use this to transcribe a hosted audio-file URL through the OpenAI-compatible speech-to-text endpoint. | Inference; Go CLI |
| `stt-providers` | Use this to list available speech-to-text providers and service types before selecting one. | Read-only; Go CLI |
| `fax-send` | Use this to submit an outbound fax from a media URL or uploaded media name through a fax connection. | Sends; non-idempotent; Go CLI |
| `fax-status` | Use this to retrieve the latest state and details for one fax. | Read-only; Go CLI |
| `fax-cancel` | Use this to cancel an outbound fax that is still queued or in progress. | Cancels send; Go CLI |
| `fax-refresh` | Use this to refresh an expired temporary media URL for an inbound fax. | Mutates media access; Go CLI |

### IoT SIM lifecycle

| Command | Agent selection sentence | Operational note |
| --- | --- | --- |
| `list-sim-cards` | Use this to discover IoT SIM cards with status, group, and pagination filters. | Read-only; Go CLI |
| `retrieve-sim-card` | Use this to retrieve one IoT SIM card when its ID is known. | Read-only; Go CLI |
| `enable-sim-card` | Use this to request asynchronous enablement of an IoT SIM card. | Activates asynchronously; Go CLI |
| `disable-sim-card` | Use this to request asynchronous disablement of an IoT SIM card. | Deactivates asynchronously; Go CLI |
| `retrieve-sim-card-action` | Use this to retrieve the status and details of one asynchronous SIM-card action by action ID. | Read-only; Go CLI |
| `list-sim-card-actions` | Use this to list asynchronous SIM-card actions by SIM, type, status, bulk action, or page. | Read-only; Go CLI |

### Port-in and Port-Out lifecycle

| Command | Agent selection sentence | Operational note |
| --- | --- | --- |
| `list-porting-orders` | Use this to discover port-in orders with phone-number, carrier, reference, FOC-date, port-type, and pagination filters. | Read-only; Go CLI |
| `get-porting-order` | Use this to retrieve one port-in order by ID, optionally including its phone-number objects. | Read-only; Go CLI |
| `update-porting-order` | Use this to change a port-in order’s references, FOC settings, documents, messaging, or post-port number configuration. | Mutates order; Go CLI |
| `submit-porting-order` | Use this to submit an existing draft port-in order for processing. | Submits; non-idempotent; Go CLI |
| `cancel-porting-order` | Use this to cancel an existing port-in order. | Cancels; requires `--confirm`; Go CLI |
| `activate-porting-order` | Use this to irreversibly activate all numbers in an eligible US FastPort port-in order. | Activates; irreversible; requires `--confirm`; Go CLI |
| `attach-porting-document` | Use this to attach an existing Telnyx document resource to a port-in order. | Mutates order; Go CLI |
| `list-porting-documents` | Use this to list documents already attached to a port-in order. | Read-only; Go CLI |
| `list-portout-orders` | Use this to discover Port-Out orders for numbers leaving Telnyx, with filters and pagination. | Read-only; Go CLI |
| `get-portout-order` | Use this to retrieve one Port-Out order for a number leaving Telnyx. | Read-only; Go CLI |
| `list-portout-rejection-codes` | Use this to list rejection codes eligible for a specific Port-Out order before rejecting it. | Read-only; Go CLI |
| `update-portout-status` | Use this to authorize or reject a Port-Out order for numbers leaving Telnyx. | Authorizes/rejects; requires `--confirm`; Go CLI |
| `create-portout-comment` | Use this to add an operational comment to a Port-Out order. | Mutates order; Go CLI |
| `list-portout-comments` | Use this to read comments already attached to a Port-Out order. | Read-only; Go CLI |

### Edge Compute handoff

| Command | Agent selection sentence | Operational note |
| --- | --- | --- |
| `edge-doctor` | Use this to validate local `telnyx-edge` installation, authentication, health, and command support before an Edge workflow. | Read-only diagnostics; external Edge CLI |
| `setup-edge-mcp` | Use this to validate readiness and emit concrete `telnyx-edge` commands for deploying the repository’s MCP-on-Edge example. | Edge handoff only; does not deploy |
| `setup-edge-webhook` | Use this to validate readiness and emit concrete `telnyx-edge` commands for deploying the repository’s webhook-on-Edge example. | Edge handoff only; does not deploy |

### Storage

| Command | Agent selection sentence | Operational note |
| --- | --- | --- |
| `storage-sql-query` | Use this to execute parameterized SQL statements or scripts against a Telnyx Storage SQL database. | May mutate SQL state; no dry run or confirm; Go CLI v0.27+ |

<!-- markdownlint-enable MD013 -->

Commands are not dry runs merely because `--json` is present. Setup commands
can create billable resources, and mutation commands change live account state.
Review the command documentation before running them. The CLI intercepts
`telnyx-agent <command> --help` before dispatch, so asking for help does not
provision resources, but current per-command help is the same global help text
rather than a command-scoped reference. Unknown flags emit a warning and the
command continues; treat that warning as a typo or compatibility problem before
trusting the result.
`delete-messaging-profile`, `delete-ai-assistant`, `cancel-porting-order`,
`activate-porting-order`, and `update-portout-status` require explicit
`--confirm`; do not automate that acknowledgement without reviewing the target
IDs and operation. `storage-sql-query` can execute mutating SQL as well as
queries and has no dry-run or `--confirm` guard.

### `telnyx-agent setup-sms`

**One command: zero to sending SMS.**

Creates a messaging profile, searches for a number with SMS capability, buys it, and assigns it to the profile.

```bash
telnyx-agent setup-sms                    # Default: US number
telnyx-agent setup-sms --country GB       # UK number
telnyx-agent setup-sms --json             # JSON output
telnyx-agent setup-sms --force            # Provision a NEW profile + number
```

Output: `{ profile_id, phone_number, ready: true, reused }`

**Idempotent by default.** If a previous `setup-sms` already created an
`Agent SMS Profile - …` with an assigned number, this command **reuses** it
instead of buying another (`reused: true`). Pass `--force` to always provision a
fresh profile and number (this buys a new ~$1/mo number).

### `telnyx-agent setup-voice`

**One command: zero to making/receiving calls.**

Creates a Call Control Application (with webhook URL + outbound voice profile), searches for a voice-capable number, buys it, and assigns it to the app. The output `connection_id` works directly with `call-dial`.

```bash
telnyx-agent setup-voice
telnyx-agent setup-voice --webhook https://example.com/calls
telnyx-agent setup-voice --outbound-voice-profile-id 2927726759434519857
telnyx-agent setup-voice --country US --json
telnyx-agent setup-voice --force   # Provision a NEW app + number
```

**Idempotent by default.** Reuses a previous `Agent Voice App - …` (and its
assigned number) when one exists (`reused: true`); pass `--force` to provision a
fresh Call Control App and number.

**Flags:**
- `--webhook-url` (or `--webhook`) — Webhook URL for call events (default: `https://example.com/webhook`)
- `--outbound-voice-profile-id` — Outbound voice profile ID (default: auto-detect first available)
- `--force` — Always provision a new app + number instead of reusing an existing agent-created one
- `--country` — ISO country code for number search (default: `US`)

Output: `{ connection_id, connection_name, phone_number, phone_number_id, webhook_url, outbound_voice_profile_id, ready }`

### `telnyx-agent setup-iot`

**One command: zero to connected SIM.**

Lists existing SIM cards, creates a SIM card group, activates the first available SIM, and assigns it to the group.

```bash
telnyx-agent setup-iot
telnyx-agent setup-iot --json
```

Output: `{ sim_id, group_id, status, apn_config }`

### `telnyx-agent setup-verify`

**One command: zero to phone verification.**

Creates a verify profile with SMS channel settings (default timeout 300s, code length 6, whitelisted destinations US) and outputs everything you need to start sending verifications. **No number is purchased** — Telnyx delivers OTPs from its own managed sender pool, and `verify-send` only takes the phone number being verified. Re-running reuses an existing agent-created verify profile (`reused: true`) unless you pass `--force` or a custom `--profile-name`.

```bash
telnyx-agent setup-verify
telnyx-agent setup-verify --destinations US,GB,LK
telnyx-agent setup-verify --profile-name "My Verify Profile" --json
telnyx-agent setup-verify --force   # Always create a new profile
```

**Flags:**
- `--destinations` — Comma-separated ISO country codes to whitelist (default: `US`)
- `--profile-name` — Custom profile name (also forces creating a distinct profile)
- `--force` — Always create a new profile instead of reusing an existing agent-created one

Output: `{ profile_id, profile_name, timeout_secs, test_command, ready, reused }`

### `telnyx-agent setup-10dlc`

**Create a US A2P 10DLC brand and submit a campaign for review.**

The command creates a US sole-proprietor brand, validates and submits a campaign,
and optionally assigns an existing phone number. Contact phone and email are
required. The default campaign use case is `CUSTOMER_CARE`, and the default
opt-in method is `web`.

```bash
telnyx-agent setup-10dlc \
  --phone +131****0000 \
  --email messaging@example.com \
  --brand-name "Example Brand" \
  --website https://example.com/sms-opt-in \
  --sample-message \
    "Example Brand: Your support update is ready. Reply STOP to opt out."

# Assign an existing number as the third step and return structured output
telnyx-agent setup-10dlc \
  --phone +131****0000 \
  --email messaging@example.com \
  --brand-name "Example Brand" \
  --website https://example.com/sms-opt-in \
  --sample-message \
    "Example Brand: Your support update is ready. Reply STOP to opt out." \
  --phone-number-id +131****0001 \
  --json
```

Before creating resources, the command validates the campaign use case and
opt-in method, checks the message flow for required consent/STOP/HELP/rates and
no-sharing disclosures, rejects known prohibited sample-message terms, and
generates default HELP/STOP/START responses. Supply real customer-facing sample
messages; mixed, marketing, low-volume mixed, and polling campaigns should use
`--sample-message-2` for a second representative example. For web opt-in, pass
`--website` so the generated message flow does not contain a placeholder URL.

This command is side-effecting and is **not idempotent**: every successful run
creates a new brand and campaign, and a partially failed run can leave the brand
already created. It does not buy a number. `--phone-number-id` only adds the
optional assignment step. Campaign submission is not approval—review commonly
remains pending after the command completes, so do not send A2P traffic until
the campaign is approved. In JSON output, `ready: true` means the setup workflow
completed, not that carrier review is complete.

### `telnyx-agent setup-ai`

**One command: zero to AI assistant on a phone number.**

Creates an AI assistant, buys a voice-capable number, and wires them together.

```bash
telnyx-agent setup-ai
telnyx-agent setup-ai --instructions "You are a pizza ordering bot"
telnyx-agent setup-ai --name "Support Bot" --json
```

Output: `{ assistant_id, phone_number, test_command }`

### `telnyx-agent setup-whatsapp`

**One command: zero to WhatsApp.**

Lists your WhatsApp Business Accounts (WABAs), picks one (or use `--waba-id`), checks for existing WhatsApp phone numbers, buys an SMS-capable number if needed, initializes WhatsApp verification, and (optionally) verifies it and sets up the business profile.

```bash
telnyx-agent setup-whatsapp                                # Auto-pick WABA, buy number, init verification
telnyx-agent setup-whatsapp --waba-id waba_123 --json      # Use specific WABA
telnyx-agent setup-whatsapp --display-name "My Biz" --code 123456  # Verify + set profile
telnyx-agent setup-whatsapp --category RETAIL --about "We sell widgets"
```

**Flags:**

- `--waba-id <id>` — Use a specific WhatsApp Business Account (default: first available)
- `--display-name` — WhatsApp profile display name
- `--about` — WhatsApp profile about text
- `--category` — Business category (e.g. RETAIL, TECHNOLOGY)
- `--code` — Verification code to verify an initialized number
- `--country <code>` — Country for number search (default: US)

Output: `{ waba_id, phone_number, verified, profile_configured, ready }`

### `telnyx-agent whatsapp-send`

**Send a WhatsApp text, template, media, interactive, location, reaction, sticker, contacts, or video message.**

Constructs the WhatsApp message JSON from simple flags and sends via the Telnyx API.

```bash
telnyx-agent whatsapp-send --from +155****4567 --to +155****6543 --text "Hello!"
telnyx-agent whatsapp-send --from +155****4567 --to +155****6543 --template-name order_ready
telnyx-agent whatsapp-send --from +155****4567 --to +155****6543 --text "Hi" --messaging-profile-id msgprof_123
telnyx-agent whatsapp-send --from +155****4567 --to +155****6543 \
  --image '{"link":"https://example.com/photo.jpg","caption":"Hello"}'
telnyx-agent whatsapp-send --from +155****4567 --to +155****6543 \
  --location '{"latitude":41.8781,"longitude":-87.6298,"name":"Chicago"}'
```

**Flags:**

- `--from` — Sender E.164 number (required)
- `--to` — Recipient E.164 number (required)
- `--text` — Text message body
- `--template-name` — Template name to send
- `--template-language` — Template language code (default: en_US)
- `--audio`, `--document`, `--image`, `--interactive`, `--location`, `--reaction`, `--sticker`, `--video` — The selected WhatsApp payload object as JSON (mutually exclusive)
- `--contacts` — A non-empty JSON array of WhatsApp contact objects
- `--biz-opaque-callback-data` — Custom data returned in message status updates
- `--messaging-profile-id` — Messaging profile ID (required if `--from` is not SMS-enabled)
- `--webhook-url` — Message status webhook URL

The wrapper inspects the local Go CLI's `messages --help` output before sending,
so it supports both the legacy `messages send-whatsapp` spelling and v0.27's
`messages whatsapp`. If command help is unavailable, its local semantic version
is used as the fallback. No API request is used for compatibility detection.

Output: `{ from, to, message_type, message_id, status }`

### Advanced `send-sms` sender modes

`send-sms` infers the correct generated Go CLI action from its sender inputs:

```bash
# E.164 sender (`messages send`)
telnyx-agent send-sms --from +131****0000 --to +131****0001 --text "Hello"

# Messaging-profile number pool (`messages send-number-pool`); no --from
telnyx-agent send-sms --messaging-profile-id msgprof_123 --to +131****0001 --text "Hello"

# Alphanumeric sender (`messages send-with-alphanumeric-sender`)
telnyx-agent send-sms --from MyCompany --messaging-profile-id msgprof_123 \
  --to +131****0001 --text "Hello"
```

Number-pool and E.164 modes also support MMS via `--media-url`. Alphanumeric
sender IDs are SMS-only and require both `--text` and `--messaging-profile-id`.

### `telnyx-agent whatsapp-templates`

**List or create WhatsApp message templates.**

```bash
telnyx-agent whatsapp-templates --waba-id waba_123                    # List templates
telnyx-agent whatsapp-templates --waba-id waba_123 --status APPROVED   # Filter by status
telnyx-agent whatsapp-templates --waba-id waba_123 --create \
  --name order_ready --language en_US --category UTILITY \
  --component '[{"type":"BODY","text":"Your order is ready"}]'
```

**Flags:**

- `--waba-id <id>` — WhatsApp Business Account ID (required)
- `--create` — Switch to create mode (default: list)
- `--name` — Template name (create mode, required)
- `--language` — Template language, default en_US (create mode)
- `--category` — UTILITY, MARKETING, or AUTHENTICATION (create mode, required)
- `--component` — Template components as JSON array string (create mode, required)
- `--status` — Filter by status: APPROVED, PENDING, REJECTED (list mode)

### Voice: `call-dial`, `call-control`, `call-status`

**Place and manage outbound calls via Call Control.** Use the `connection_id`
from `setup-voice`.

```bash
telnyx-agent call-dial --connection-id <id> --from +13125550000 --to +447700900123 --json
telnyx-agent call-status --call-control-id <id> --json
telnyx-agent call-control --call-control-id <id> --action hangup
```

- `call-dial` accepts any valid `+E.164` `--to` (posts directly to `POST /v2/calls`).
- `call-status` reports `active` / `ended`, derived from the live call's
  `is_alive` state.

### `telnyx-agent send-group-mms`

**Send one MMS to multiple recipients.**

```bash
telnyx-agent send-group-mms --from +13125550000 --to "+13125550001,+13125550002" --text "Hi team"
telnyx-agent send-group-mms --from +13125550000 --to "+1...,+1..." --media-url https://example.com/pic.jpg
```

⚠ **Delivery verification caveat:** the group MMS returns a *group-level*
message id that is **not** resolvable via `sms-status` / `GET /v2/messages/{id}`.
Confirm delivery via the per-recipient statuses in the response (`recipient_statuses`)
and/or message webhooks — not by polling the returned id.

### Edge Compute handoff commands

These are **thin executable bridges**, not native Edge lifecycle support.
They make Edge Compute usable from `telnyx-agent` while keeping real deploy/auth/secrets/bindings ownership in `telnyx-edge`. They now prefer API-key auth for agent use when the installed Edge CLI supports it.

```bash
telnyx-agent edge-doctor --json
telnyx-agent setup-edge-mcp --name my-mcp-server --json
telnyx-agent setup-edge-webhook --name my-webhook --json
```

What they do:
- validate that `telnyx-edge` is available
- check whether Edge auth is already configured
- prefer `telnyx-edge auth api-key set <your-api-key>` for agents when supported
- point you at a real Edge example
- give you the concrete next deploy command
- hand off function creation, deployment, and lifecycle management to the `telnyx-edge` CLI, which owns them

### `telnyx-agent fund-account`

**Fund your Telnyx account with USDC on Base via x402 protocol.**

Requests a payment quote, signs EIP-712 typed data (transferWithAuthorization / EIP-3009), and submits the payment. Without a wallet key, outputs payment requirements for external signing.

```bash
telnyx-agent fund-account --amount 50.00                      # Get quote + payment requirements
telnyx-agent fund-account --amount 50.00 --wallet-key 0x...   # Sign and submit (see warning below)
telnyx-agent fund-account --amount 50.00 --json              # JSON output
```

**Flags:**
| Flag | Description |
|------|-------------|
| `--amount <usd>` | Amount to fund in USD (required) |
| `--wallet-key <0x>` | Private key for EIP-712 signing (optional) |

**Output (with --wallet-key):**
```json
{
  "previous_balance": "-1.59",
  "funded_amount": "50.00",
  "quote_id": "quote_abc123",
  "transaction_id": "txn_xxx",
  "status": "settled",
  "new_balance": "48.41",
  "tx_hash": "0x..."
}
```

**Output (without --wallet-key):**
Returns `payment_requirements` JSON for external signing by agents or wallets.
External signing is safer because `--wallet-key` places the private key in
process arguments and commonly in shell history. Prefer an external wallet or
signer; if you accept that exposure for automation, keep the environment and
history private and short-lived.

### `telnyx-agent tts`

**Generate speech from text (text-to-speech).**

Supports multiple providers (telnyx, aws, azure, minimax, inworld, rime, resemble, fishaudio, humain, xai). Returns base64-encoded audio. Run `telnyx-agent tts-voices --json` for the authoritative live list.

```bash
telnyx-agent tts --text "Hello world" --voice Telnyx.Bayan.Amanda
telnyx-agent tts --text "Bonjour" --voice Amy --provider aws --language fr
telnyx-agent tts --text "Hello" --provider minimax --json
telnyx-agent tts --text "<speak>Hello</speak>" --text-type ssml
```

**Flags:**
- `--text` — Text to synthesize (required)
- `--voice` — Voice ID (e.g., `Telnyx.Bayan.Amanda`, `Amy`)
- `--provider` — TTS provider (default: `telnyx`)
- `--language` — Language code (default: `en`)
- `--output-type` — Output format: `base64` (default). `binary_output` is not supported by this wrapper.
- `--text-type` — `text` (default) or `ssml`
- `--disable-cache` — Skip TTS cache
- `--output <file>` — Also decode the audio and write it straight to this file (e.g. `speech.wav`)

Output: `{ text, voice, provider, output_type, audio_data, has_audio_data, output_file? }`

### `telnyx-agent tts-voices`

**List available TTS voices, optionally filtered by provider.**

```bash
telnyx-agent tts-voices
telnyx-agent tts-voices --provider aws
telnyx-agent tts-voices --provider minimax --json
```

**Flags:**
- `--provider` — Filter by provider (default: `telnyx`)

Output: `{ provider, count, voices: [...] }`

### `telnyx-agent stt`

**Transcribe audio to text (speech-to-text).**

Transcription requires the audio at a **publicly reachable URL** — the command
cannot upload a local file. Host the audio (any public URL or a Telnyx storage
bucket) first, then pass it with `--audio-url`. Note: `tts` returns base64 audio
data, not a URL, so you cannot pipe `tts` straight into `stt` — host the audio in
between.

```bash
telnyx-agent stt --audio-url https://example.com/audio.wav
telnyx-agent stt --audio-url https://example.com/audio.mp3 --model openai/whisper-large-v3-turbo --language es --json
```

**Flags:**
- `--audio-url` — Public URL of the audio file to transcribe (required)
- `--model` — Transcription model (default: `distil-whisper/distil-large-v2`; also `openai/whisper-large-v3-turbo`, `deepgram/nova-3`)
- `--language` — Language hint (optional)
- `--response-format` — `json` or `verbose_json` (optional)

Output: `{ audio_url, model, transcription }`

### `telnyx-agent stt-providers`

**List available speech-to-text providers.**

```bash
telnyx-agent stt-providers
telnyx-agent stt-providers --provider telnyx --service-type transcription --json
```

Output: `{ providers: [...] }`

### `telnyx-agent storage-sql-query`

**Run parameterized SQL against a Telnyx Storage SQL database.** The command
requires the database ID and preserves the generated Go CLI's binding syntax.
Repeat `--param` in positional `?` placeholder order; each value may be a
string, number, boolean, or `null`.

```bash
telnyx-agent storage-sql-query --id <database-id> --sql "SELECT * FROM users"
telnyx-agent storage-sql-query --id <database-id> \
  --sql "SELECT * FROM users WHERE active = ? AND age >= ?" \
  --param true --param 21 --json
```

Use bindings instead of interpolating values into SQL. Placeholder/parameter
count mismatches are rejected by the API. The SQL text is not restricted to
`SELECT`: statements may mutate database state. Review the statement and target
database before execution. This command requires Telnyx Go CLI v0.27.0 or newer;
it does not change the package's vendored platform pin.


## Authentication

The CLI looks for an API key in this order:

1. `TELNYX_API_KEY` environment variable
2. `~/.config/telnyx/config.json` (same as `@telnyx/api-cli`)

Most commands use that resolver. `setup-sms` and `setup-porting` are exceptions:
their implementations explicitly require `TELNYX_API_KEY` and do not fall back
to the config file.

## Global Flags

| Flag | Description |
|------|-------------|
| `--json` | Output structured JSON instead of human-readable text |

`--country` is command-specific, not global. It is accepted by commands such as
`setup-sms`, `setup-voice`, `setup-whatsapp`, `list-phone-numbers`,
`search-phone-numbers`, and `web-search`, with semantics and defaults documented
for each command.

## Architecture

- **Hybrid execution** — command modules use the Telnyx REST API v2 directly,
  wrap the generated Telnyx Go CLI, or combine both transports in one workflow.
  Many command families use the Go wrapper; it is not limited to a small number
  of messaging and number operations.
- **Go CLI dependency** — `scripts/postinstall.ts` pins Telnyx Go CLI v0.27.0.
  Runtime resolution checks `TELNYX_CLI_PATH`, then the platform-specific binary
  under `vendor/`, then `telnyx` on `PATH`. A PATH fallback is verified with
  `telnyx --version`; missing, incompatible, or command-too-old binaries fail
  with an actionable version/install error instead of the former downstream
  `command … not found` failure. Re-run `npm install` or `npm rebuild` to restore
  the vendored binary.
- **Safe override troubleshooting** — set `TELNYX_CLI_PATH` only to the absolute
  path of a trusted Telnyx Go CLI and verify it first with
  `"$TELNYX_CLI_PATH" --version`. The override is authoritative, so an invalid or
  too-old override does not silently fall through to another binary; unset it to
  return to normal vendor/PATH resolution.
- **No CLI framework** — simple `process.argv` parsing.
- **Error handling** — composite commands report what succeeded and what failed.

## Development

```bash
cd cli
npm install

# Run directly (from source, dev mode)
npx tsx bin/telnyx-agent.ts status
# ...or drive the published launcher exactly as an installed user would:
node bin/telnyx-agent.mjs status

# Print the agent CLI package version
node bin/telnyx-agent.mjs --version   # -V is equivalent

# Run tests
npm test

# Type check
npm run typecheck
```

## Testing

`npm test` is the package's hermetic local suite. It exercises command behavior
with mocks, local capture servers, and fake binaries; run it without a live API
key or account config so it cannot select real account credentials.

```bash
npm test
```

Live-network coverage is separate and controlled in CI. Inspect each job's test
selection before treating its label as a safety boundary:

- **API Read-Only Tests** is a legacy job name, not a mutation guarantee. Its
  CLI `integration-ci` suite runs with a repository secret and invokes
  `setup-iot`, `setup-wireguard`, and `setup-verify`; depending on account state,
  those cases can create resources, enable or reassign a SIM, and rely on only
  partial best-effort cleanup.
- **API Write + Cleanup Tests** adds the explicitly write-gated coverage with
  `RUN_WRITE_TESTS=true`. It creates and cleans up real resources and runs only
  on pushes to `main` or an explicitly enabled manual workflow dispatch.
