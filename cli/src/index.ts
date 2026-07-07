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
import { ttsCommand } from "./commands/tts.ts";
import { ttsVoicesCommand } from "./commands/tts-voices.ts";
import { setupWhatsappCommand } from "./commands/setup-whatsapp.ts";
import { whatsappSendCommand } from "./commands/whatsapp-send.ts";
import { whatsappTemplatesCommand } from "./commands/whatsapp-templates.ts";
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
  tts               Generate speech from text (text-to-speech)
  tts-voices        List available TTS voices (optionally filter by provider)
  setup-whatsapp    Zero to WhatsApp: list WABA, buy number, verify, set profile
  whatsapp-send     Send a WhatsApp message (text or template)
  whatsapp-templates List or create WhatsApp message templates

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

TTS Flags:
  --text            Text to synthesize (required)
  --voice           Voice ID/name (optional, provider-specific)
  --language        Language code (default: en)
  --provider        TTS provider: telnyx, aws, azure, elevenlabs, minimax, resemble, rime, xai (default: telnyx)
  --output-type     Response format: base64 (base64-encoded audio JSON; default: base64)
  --text-type       Input format: text or ssml (default: text)
  --disable-cache   Skip cached audio and regenerate (boolean)

TTS-voices Flags:
  --provider        Filter voices by provider: telnyx, aws, azure, elevenlabs, minimax, resemble, rime, xai (optional)
  --api-key <key>   Provider API key forwarded to the Go CLI for provider-backed voice lists (e.g., elevenlabs, resemble)

WhatsApp Flags:
  --waba-id <id>    WhatsApp Business Account id (setup-whatsapp, whatsapp-templates)
  --display-name    WhatsApp profile display name (setup-whatsapp)
  --about           WhatsApp profile about text (setup-whatsapp)
  --category        WhatsApp business category, e.g. RETAIL (setup-whatsapp)
  --code            Verification code, to verify a number already initialized (setup-whatsapp)
  --from            Sender E.164 number (whatsapp-send, required)
  --to              Recipient E.164 number (whatsapp-send, required)
  --text            Text message body (whatsapp-send)
  --template-name   Template name to send (whatsapp-send)
  --template-language Template language code, default en_US (whatsapp-send)
  --messaging-profile-id Messaging profile id (whatsapp-send)
  --create          Switch to create mode (whatsapp-templates)
  --name            Template name (whatsapp-templates, create)
  --language        Template language, default en_US (whatsapp-templates, create)
  --component       Template components as a JSON array string (whatsapp-templates, create)
  --status          Filter templates by status: APPROVED|PENDING|REJECTED (whatsapp-templates, list)

Environment:
  TELNYX_API_KEY    API key (or configure ~/.config/telnyx/config.json)

Examples:
  telnyx-agent status
  telnyx-agent status --json
  telnyx-agent capabilities
  telnyx-agent setup-sms --country US
  telnyx-agent setup-voice --webhook https://example.com/calls
  telnyx-agent setup-ai --instructions "You are a pizza ordering bot"
  telnyx-agent setup-porting --phone-numbers +131****0001,+131****0002 --customer-name "Acme Corp"
  telnyx-agent edge-doctor --json
  telnyx-agent setup-edge-mcp --name my-mcp-server
  telnyx-agent setup-edge-webhook --name my-webhook
  telnyx-agent fund-account --amount 50.00
  telnyx-agent fund-account --amount 50.00 --wallet-key 0x... --json
  telnyx-agent tts --text "Hello world"
  telnyx-agent tts --text "Hello world" --voice en-US-Standard-A --provider aws --json
  telnyx-agent tts --text "<speak>Hello</speak>" --text-type ssml --output-type base64
  telnyx-agent tts-voices --json
  telnyx-agent tts-voices --provider aws
  telnyx-agent setup-whatsapp --json
  telnyx-agent setup-whatsapp --waba-id <id> --display-name "My Biz" --code 123456
  telnyx-agent whatsapp-send --from +155****1111 --to +155****2222 --text "Hello!"
  telnyx-agent whatsapp-send --from +155****1111 --to +155****2222 --template-name order_ready
  telnyx-agent whatsapp-templates --waba-id <id> --json
  telnyx-agent whatsapp-templates --waba-id <id> --create --name promo --category MARKETING --component '[]'
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
  tts: ttsCommand,
  "tts-voices": ttsVoicesCommand,
  "setup-whatsapp": setupWhatsappCommand,
  "whatsapp-send": whatsappSendCommand,
  "whatsapp-templates": whatsappTemplatesCommand,
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
