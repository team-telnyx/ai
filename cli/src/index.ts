/**
 * Command router for telnyx-agent CLI.
 */

import { setupSmsCommand } from "./commands/setup-sms.ts";
import { setupVoiceCommand } from "./commands/setup-voice.ts";
import { setupIotCommand } from "./commands/setup-iot.ts";
import { setupAiCommand } from "./commands/setup-ai.ts";
import { setupWireguardCommand } from "./commands/setup-wireguard.ts";
import { setupVerifyCommand } from "./commands/setup-verify.ts";
import { verifySendCommand } from "./commands/verify-send.ts";
import { verifyCheckCommand } from "./commands/verify-check.ts";
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
import { sendSmsCommand } from "./commands/send-sms.ts";
import { sendGroupMmsCommand } from "./commands/send-group-mms.ts";
import { scheduleSmsCommand } from "./commands/schedule-sms.ts";
import { smsStatusCommand } from "./commands/sms-status.ts";
import { callDialCommand } from "./commands/call-dial.ts";
import { callControlCommand } from "./commands/call-control.ts";
import { callStatusCommand } from "./commands/call-status.ts";
import { sttCommand } from "./commands/stt.ts";
import { sttProvidersCommand } from "./commands/stt-providers.ts";
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
  verify-send       Trigger a phone verification (sms, call, flashcall, or whatsapp)
  verify-check      Verify a code or check verification status
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
  send-sms          Send an SMS or MMS message (--media-url sends MMS)
  send-group-mms    Send a group MMS to multiple recipients (--to comma-separated)
  schedule-sms      Schedule an SMS for future delivery (--send-at ISO 8601)
  sms-status        Check SMS delivery status, or cancel a scheduled message (--cancel)
  call-dial         Make an outbound call via Call Control
  call-control      Call Control actions (answer, hangup, transfer, dtmf, record, speak, ...)
  call-status       Get the status of a call by call-control-id
  stt               Transcribe audio to text (speech-to-text)
  stt-providers     List available speech-to-text providers

Global Flags:
  --json            Output structured JSON instead of human-readable text
  --country <code>  Country code for number search (default: US)

Setup-specific Flags:
  --webhook <url>   Webhook URL (setup-voice)
  --instructions    AI assistant instructions (setup-ai)
  --name            AI assistant name (setup-ai)
  --network-id      Use existing network (setup-wireguard)
  --profile-name    Custom verify profile name (setup-verify)

Verify Flags:
  --phone-number    E.164 number to verify (verify-send, required)
  --verify-profile-id Verify profile ID (verify-send, required)
  --method          Verification channel (verify-send, required): sms, call, flashcall, whatsapp
  --custom-code     Self-generated code to send (verify-send, optional; not used with flashcall)
  --timeout-secs    Verification timeout in seconds (verify-send, optional)
  --extension       Extension for the call leg (verify-send, optional; only with --method call)
  --verification-id Verification ID to check (verify-check, required)
  --code            Code to submit for verification (verify-check, optional; if omitted, status is retrieved)
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
SMS Action Flags:
  --from <e164>          Sender number, E.164 (send-sms, send-group-mms, schedule-sms — required)
  --to <e164>            Recipient number, E.164 (send-sms, schedule-sms — required)
  --to <e164,...>        Comma-separated recipients, E.164 (send-group-mms — required)
  --text <msg>           Message text (send-sms, schedule-sms — required; send-group-mms — optional)
  --media-url <url>      Media URL; sends MMS instead of SMS (send-sms, schedule-sms, send-group-mms)
  --messaging-profile-id <id> Messaging profile to use (send-sms, schedule-sms; not supported by group MMS)
  --webhook-url <url>    Webhook for delivery status updates (send-sms)
  --subject <text>       MMS subject line (send-sms)
  --send-at <iso8601>    Send time, ISO 8601 (schedule-sms — required, e.g., 2024-12-31T00:00:00Z)
  --id <message-id>      Message ID (sms-status — required)
  --cancel               Cancel a scheduled message instead of retrieving status (sms-status)

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
Voice Call Flags:
  --connection-id   Call Control connection ID (call-dial, required)
  --from             E.164 number to call from (call-dial, required)
  --to               E.164 destination (call-dial, call-control transfer)
  --call-control-id Call Control ID of the call (call-control, call-status, required)
  --action           Call Control action (call-control, required)
                    Valid: answer, hangup, transfer, dtmf, start-recording, stop-recording,
                    start-noise-suppression, stop-noise-suppression, speak, bridge, refer, reject,
                    gather, stop-gather, start-playback, stop-playback, start-transcription,
                    stop-transcription, pause-recording, resume-recording, start-forking,
                    stop-forking, start-siprec, stop-siprec, start-streaming, stop-streaming,
                    enqueue, leave-queue, send-sip-info, update-client-state
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
  --audio-url                    Audio URL to play on answer (call-dial); audio to play (call-control start-playback, required)
  --timeout-secs                 Dial timeout in seconds (call-dial)
  --privacy                      Number masking: 'id' hides caller ID, 'none' is normal (call-dial, default: none)
  --from-display-name            Caller ID display name (call-dial)
  --time-limit-secs              Max call duration in seconds (call-dial)
  --transcription                Enable real-time transcription on dial (call-dial)
  --media-encryption             Media encryption mode (call-dial)
  --client-state                 Opaque client-state string (call-dial; call-control update-client-state, required; call-control gather, optional)
  --command-id                   Idempotency/command UUID (call-dial; call-control gather, optional)
  --webhook-url-method           HTTP method for --webhook-url (call-dial: GET|POST|PUT|PATCH|DELETE)
  --webhook-urls                 Comma-separated additional webhook URLs (call-dial)
  --queue-name                   Queue to place the call into (call-control enqueue, required)
  --body                         SIP INFO body content (call-control send-sip-info, required)
  --content-type                 SIP INFO Content-Type header (call-control send-sip-info, required, e.g. application/dtmf-relay)
STT Flags:
  --audio-url <url> URL of the audio file to transcribe (required)
  --model           Transcription model (default: distil-whisper/distil-large-v2; also openai/whisper-large-v3-turbo, deepgram/nova-3)
  --language        Language code (optional; not supported by the default model)
  --response-format Transcript output format (optional, json or verbose_json)

STT-providers Flags:
  --provider        Filter providers by name (optional)
  --service-type    Filter providers by service type (optional)

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
  telnyx-agent verify-send --phone-number +131****0001 --verify-profile-id prof_xxx --method sms
  telnyx-agent verify-check --verification-id ver_xxx --code 123456
  telnyx-agent verify-check --verification-id ver_xxx
  telnyx-agent setup-porting --phone-numbers +13125550001,+13125550002 --customer-name "Acme Corp"
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
  telnyx-agent send-sms --from +131****0000 --to +131****0001 --text "Hello!"
  telnyx-agent send-sms --from +131****0000 --to +131****0001 --text "See this" --media-url https://example.com/img.png --subject "Photo"
  telnyx-agent send-group-mms --from +131****0000 --to +131****0001,+131****0002,+131****0003 --text "Group hi!"
  telnyx-agent send-group-mms --from +131****0000 --to +131****0001,+131****0002 --media-url https://example.com/cat.png
  telnyx-agent schedule-sms --from +131****0000 --to +131****0001 --text "Later" --send-at 2024-12-31T00:00:00Z
  telnyx-agent sms-status --id 3fa85f64-5717-4562-b3fc-2c963f66afa6
  telnyx-agent sms-status --id 3fa85f64-5717-4562-b3fc-2c963f66afa6 --cancel
  telnyx-agent call-dial --connection-id <id> --from +131****0000 --to +131****1234
  telnyx-agent call-dial --connection-id <id> --from +131****0000 --to +131****1234 --answering-machine-detection --json
  telnyx-agent call-control --action hangup --call-control-id <id>
  telnyx-agent call-control --action transfer --call-control-id <id> --to +131****9999
  telnyx-agent call-control --action dtmf --call-control-id <id> --digits 1234
  telnyx-agent call-control --action speak --call-control-id <id> --payload "Hello there" --voice female
  telnyx-agent call-control --action start-recording --call-control-id <id> --channels dual --format mp3
  telnyx-agent call-control --action bridge --call-control-id <id> --call-control-id-2 <id2>
  telnyx-agent call-dial --connection-id <id> --from +131****0000 --to +131****1234 --privacy id
  telnyx-agent call-dial --connection-id <id> --from +131****0000 --to +131****1234 --transcription --time-limit-secs 600
  telnyx-agent call-control --action start-playback --call-control-id <id> --audio-url https://example.com/hello.wav
  telnyx-agent call-control --action stop-playback --call-control-id <id>
  telnyx-agent call-control --action gather --call-control-id <id> --client-state state-1 --command-id cmd-1
  telnyx-agent call-control --action stop-gather --call-control-id <id>
  telnyx-agent call-control --action start-transcription --call-control-id <id>
  telnyx-agent call-control --action stop-transcription --call-control-id <id>
  telnyx-agent call-control --action pause-recording --call-control-id <id>
  telnyx-agent call-control --action resume-recording --call-control-id <id>
  telnyx-agent call-control --action start-forking --call-control-id <id>
  telnyx-agent call-control --action start-siprec --call-control-id <id>
  telnyx-agent call-control --action start-streaming --call-control-id <id>
  telnyx-agent call-control --action enqueue --call-control-id <id> --queue-name support
  telnyx-agent call-control --action leave-queue --call-control-id <id>
  telnyx-agent call-control --action send-sip-info --call-control-id <id> --body "hello" --content-type application/dtmf-relay
  telnyx-agent call-control --action update-client-state --call-control-id <id> --client-state state-2
  telnyx-agent call-control --action reject --call-control-id <id> --cause USER_BUSY
  telnyx-agent call-status --call-control-id <id> --json
  telnyx-agent stt --audio-url https://example.com/audio.mp3
  telnyx-agent stt --audio-url https://example.com/audio.mp3 --model openai/whisper-large-v3-turbo --language es --json
  telnyx-agent stt-providers --json
  telnyx-agent stt-providers --provider telnyx --service-type transcription --json
`;

const COMMANDS: Record<string, (flags: Record<string, string | boolean>) => Promise<void>> = {
  "setup-sms": setupSmsCommand,
  "setup-voice": setupVoiceCommand,
  "setup-iot": setupIotCommand,
  "setup-ai": setupAiCommand,
  "setup-wireguard": setupWireguardCommand,
  "setup-verify": setupVerifyCommand,
  "verify-send": verifySendCommand,
  "verify-check": verifyCheckCommand,
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
  "send-sms": sendSmsCommand,
  "send-group-mms": sendGroupMmsCommand,
  "schedule-sms": scheduleSmsCommand,
  "sms-status": smsStatusCommand,
  "call-dial": callDialCommand,
  "call-control": callControlCommand,
  "call-status": callStatusCommand,
  stt: sttCommand,
  "stt-providers": sttProvidersCommand,
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
