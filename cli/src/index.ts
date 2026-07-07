/**
 * Command router for telnyx-agent CLI.
 */

import { setupSmsCommand } from "./commands/setup-sms.ts";
import { setupVoiceCommand } from "./commands/setup-voice.ts";
import { setupIotCommand } from "./commands/setup-iot.ts";
import { setupAiCommand } from "./commands/setup-ai.ts";
import { setupWireguardCommand } from "./commands/setup-wireguard.ts";
import { setupVerifyCommand } from "./commands/setup-verify.ts";
import { setup10dlcCommand } from "./commands/setup-10dlc.ts";
import { setupPortingCommand } from "./commands/setup-porting.ts";
import { edgeDoctorCommand } from "./commands/edge-doctor.ts";
import { setupEdgeMcpCommand } from "./commands/setup-edge-mcp.ts";
import { setupEdgeWebhookCommand } from "./commands/setup-edge-webhook.ts";
import { capabilitiesCommand } from "./commands/capabilities.ts";
import { statusCommand } from "./commands/status.ts";
import { fundAccountCommand } from "./commands/fund-account.ts";
import { callDialCommand } from "./commands/call-dial.ts";
import { callControlCommand } from "./commands/call-control.ts";
import { callStatusCommand } from "./commands/call-status.ts";
import { parseFlags } from "./utils/output.ts";

const HELP = `
telnyx-agent — Agent-friendly CLI for Telnyx API v2

Usage:
  telnyx-agent <command> [flags]

Commands:
  setup-sms         Zero to SMS: create profile, buy number, assign it
  setup-voice       Zero to voice: create connection, buy number, assign it
  setup-iot         Zero to IoT: list SIMs, create group, activate SIM
  setup-ai          Zero to AI: create assistant, buy number, wire them together
  setup-wireguard   Zero to VPN: create network, WireGuard interface, peer
  setup-verify      Zero to verification: create profile, buy number
  setup-10dlc       Zero to A2P: create brand, campaign, assign number
  setup-porting     Zero to porting: check portability, create order, submit
  edge-doctor       Validate Edge Compute prerequisites and handoff readiness
  setup-edge-mcp    Handoff to an Edge-hosted MCP server example
  setup-edge-webhook Handoff to an Edge-hosted webhook receiver example
  status            Account health overview
  capabilities      List all available API capabilities
  fund-account      Fund account via x402 USDC payment (EIP-712 signing)
  call-dial         Make an outbound call via Call Control
  call-control      Call Control actions (answer, hangup, transfer, dtmf, record, speak, ...)
  call-status       Get the status of a call by call-control-id

Global Flags:
  --json            Output structured JSON instead of human-readable text
  --country <code>  Country code for number search (default: US)

Setup-specific Flags:
  --webhook <url>   Webhook URL (setup-voice)
  --instructions    AI assistant instructions (setup-ai)
  --name            AI assistant name (setup-ai)
  --network-id      Use existing network (setup-wireguard)
  --profile-name    Custom verify profile name (setup-verify)
  --phone           Contact phone for brand (setup-10dlc, required)
  --email           Contact email for brand (setup-10dlc, required)
  --brand-name      Brand display name (setup-10dlc)
  --company-name    Company name passed to brand create (setup-10dlc)
  --vertical        Business vertical (setup-10dlc, default: TECHNOLOGY)
  --usecase         Campaign use case (setup-10dlc, default: CUSTOMER_CARE)
                    Valid: 2FA, ACCOUNT_NOTIFICATION, CUSTOMER_CARE, DELIVERY_NOTIFICATIONS,
                    FRAUD_ALERT_MESSAGING, HIGHER_EDUCATION, LOW_VOLUME_MIXED, M2M,
                    MARKETING, MIXED, POLLING_AND_VOTING, PUBLIC_SERVICE_ANNOUNCEMENT, SECURITY_ALERT
  --opt-in-method   How consumers opt in (setup-10dlc, default: web)
                    Valid: web, verbal, paper, inbound
  --website         Opt-in website URL (setup-10dlc, recommended for --opt-in-method web)
  --description     Campaign description (setup-10dlc)
  --sample-message  First sample message text (setup-10dlc)
  --sample-message-2 Second sample message (setup-10dlc, required for Marketing/Mixed/Low Volume Mixed/Polling)
  --message-flow     Custom message flow (setup-10dlc, default: generated from --opt-in-method)
  --help-message    HELP auto-response text (setup-10dlc, default: generated)
  --stop-message    STOP auto-response text (setup-10dlc, default: generated)
  --start-message   START auto-response text (setup-10dlc, default: generated)
  --phone-number-id Assign existing number to campaign (setup-10dlc)
  --phone-numbers   Comma-separated E.164 numbers to port (setup-porting, required)
  --customer-name   Customer name on the losing carrier account (setup-porting)
  --authorized-person Authorized signer/contact name (setup-porting)
  --billing-phone   Billing telephone number on the account (setup-porting)
  --old-provider    Current/losing carrier name (setup-porting)
  --submit          Submit the newly created porting order immediately (setup-porting)

Fund-account Flags:
  --amount <usd>    Amount to fund in USD (required, e.g., 50.00)
  --wallet-key <0x> Private key for signing (optional, outputs payment requirements if omitted)

Voice Call Flags:
  --connection-id   Call Control connection ID (call-dial, required)
  --from             E.164 number to call from (call-dial, required)
  --to               E.164 destination (call-dial, call-control transfer)
  --call-control-id Call Control ID of the call (call-control, call-status, required)
  --action           Call Control action (call-control, required)
                    Valid: answer, hangup, transfer, dtmf, start-recording, stop-recording,
                    start-noise-suppression, stop-noise-suppression, speak, bridge, refer, reject
  --digits           DTMF digits to send (call-control dtmf)
  --payload          Text to synthesize and speak (call-control speak)
  --voice            TTS voice to use (call-control speak, default: female)
  --call-control-id-2 Second call-control-id to bridge with (call-control bridge)
  --sip-address      SIP address to refer to (call-control refer, e.g. sip:user@example.com)
  --channels         Recording channels: single|dual (call-control start-recording)
  --format           Recording format: mp3|wav (call-control start-recording)
  --cause            Rejection cause: CALL_REJECTED|USER_BUSY (call-control reject, default: CALL_REJECTED)
  --answering-machine-detection [mode]  Enable answering machine detection (call-dial)
                    Valid: premium, detect, detect_beep, detect_words, greeting_end, disabled
                    (bare flag defaults to detect)
  --deepfake-detection           Enable deepfake detection (call-dial, call-control answer)
  --record                       Record the call (call-dial, call-control answer)
  --webhook-url                  Webhook URL override (call-dial, call-control answer)
  --audio-url                    Audio URL to play on answer (call-dial)
  --timeout-secs                 Dial timeout in seconds (call-dial)

Environment:
  TELNYX_API_KEY    API key (or configure ~/.config/telnyx/config.json)

Examples:
  telnyx-agent status
  telnyx-agent status --json
  telnyx-agent capabilities
  telnyx-agent setup-sms --country US
  telnyx-agent setup-voice --webhook https://example.com/calls
  telnyx-agent setup-ai --instructions "You are a pizza ordering bot"
  telnyx-agent setup-porting --phone-numbers +13125550001,+13125550002 --customer-name "Acme Corp"
  telnyx-agent edge-doctor --json
  telnyx-agent setup-edge-mcp --name my-mcp-server
  telnyx-agent setup-edge-webhook --name my-webhook
  telnyx-agent fund-account --amount 50.00
  telnyx-agent fund-account --amount 50.00 --wallet-key 0x... --json
  telnyx-agent call-dial --connection-id <id> --from +131****0000 --to +131****1234
  telnyx-agent call-dial --connection-id <id> --from +131****0000 --to +131****1234 --answering-machine-detection --json
  telnyx-agent call-control --action hangup --call-control-id <id>
  telnyx-agent call-control --action transfer --call-control-id <id> --to +131****9999
  telnyx-agent call-control --action dtmf --call-control-id <id> --digits 1234
  telnyx-agent call-control --action speak --call-control-id <id> --payload "Hello there" --voice female
  telnyx-agent call-control --action start-recording --call-control-id <id> --channels dual --format mp3
  telnyx-agent call-control --action bridge --call-control-id <id> --call-control-id-2 <id2>
  telnyx-agent call-control --action reject --call-control-id <id> --cause USER_BUSY
  telnyx-agent call-status --call-control-id <id> --json
`;

const COMMANDS: Record<string, (flags: Record<string, string | boolean>) => Promise<void>> = {
  "setup-sms": setupSmsCommand,
  "setup-voice": setupVoiceCommand,
  "setup-iot": setupIotCommand,
  "setup-ai": setupAiCommand,
  "setup-wireguard": setupWireguardCommand,
  "setup-verify": setupVerifyCommand,
  "setup-10dlc": setup10dlcCommand,
  "setup-porting": setupPortingCommand,
  "edge-doctor": edgeDoctorCommand,
  "setup-edge-mcp": setupEdgeMcpCommand,
  "setup-edge-webhook": setupEdgeWebhookCommand,
  capabilities: capabilitiesCommand,
  status: statusCommand,
  "fund-account": fundAccountCommand,
  "call-dial": callDialCommand,
  "call-control": callControlCommand,
  "call-status": callStatusCommand,
};

export async function run(argv: string[]): Promise<void> {
  const { command, flags } = parseFlags(argv);

  if (command === "help" || command === "--help" || command === "-h" || !command) {
    console.log(HELP);
    return;
  }

  const handler = COMMANDS[command];
  if (!handler) {
    console.error(`Unknown command: ${command}\n`);
    console.log(HELP);
    process.exit(1);
  }

  await handler(flags);
}
