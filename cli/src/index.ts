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
import {
  activatePortingOrderCommand,
  attachPortingDocumentCommand,
  cancelPortingOrderCommand,
  getPortingOrderCommand,
  listPortingDocumentsCommand,
  listPortingOrdersCommand,
  submitPortingOrderCommand,
  updatePortingOrderCommand,
} from "./commands/porting-orders.ts";
import {
  createPortoutCommentCommand,
  getPortoutOrderCommand,
  listPortoutCommentsCommand,
  listPortoutOrdersCommand,
  listPortoutRejectionCodesCommand,
  updatePortoutStatusCommand,
} from "./commands/portout-orders.ts";
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
import {
  emailForwardCommand,
  emailReplyAllCommand,
  emailReplyCommand,
  emailSendCommand,
} from "./commands/email-actions.ts";
import {
  createMessagingProfileCommand,
  deleteMessagingProfileCommand,
  getMessagingProfileCommand,
  listMessagingProfilesCommand,
  updateMessagingProfileCommand,
} from "./commands/messaging-profiles.ts";
import { faxSendCommand } from "./commands/fax-send.ts";
import {
  faxCancelCommand,
  faxRefreshCommand,
  faxStatusCommand,
} from "./commands/fax-lifecycle.ts";
import { sendGroupMmsCommand } from "./commands/send-group-mms.ts";
import { scheduleSmsCommand } from "./commands/schedule-sms.ts";
import { smsStatusCommand } from "./commands/sms-status.ts";
import { rcsSendCommand } from "./commands/rcs-send.ts";
import { rcsCapabilitiesCommand } from "./commands/rcs-capabilities.ts";
import { callDialCommand } from "./commands/call-dial.ts";
import { callControlCommand, callPayCommand } from "./commands/call-control.ts";
import { callStatusCommand } from "./commands/call-status.ts";
import {
  getCallRecordingCommand,
  getRecordingTranscriptionCommand,
  listCallRecordingsCommand,
  listRecordingTranscriptionsCommand,
} from "./commands/recordings.ts";
import {
  conferenceControlCommand,
  createConferenceCommand,
  getConferenceCommand,
  listConferenceParticipantsCommand,
  listConferencesCommand,
} from "./commands/conferences.ts";
import {
  createMeetingArtifactCommand,
  createMeetingSessionCommand,
  endMeetingSessionCommand,
  getMeetingArtifactCommand,
  getMeetingRecordingsCommand,
  getMeetingSessionCommand,
  getMeetingTranscriptCommand,
  listMeetingArtifactsCommand,
  listMeetingSessionsCommand,
  sendMeetingChatCommand,
  speakInMeetingCommand,
  stopMeetingSpeakingCommand,
} from "./commands/meeting-sessions.ts";
import { sttCommand } from "./commands/stt.ts";
import { sttProvidersCommand } from "./commands/stt-providers.ts";
import {
  buyPhoneNumberCommand,
  listPhoneNumbersCommand,
  lookupNumberCommand,
  searchPhoneNumbersCommand,
} from "./commands/numbers.ts";
import { aiChatCommand } from "./commands/ai-chat.ts";
import { aiAnthropicMessageCommand } from "./commands/ai-anthropic-message.ts";
import { aiEmbedCommand } from "./commands/ai-embed.ts";
import {
  chatAiAssistantCommand,
  createAiAssistantCommand,
  deleteAiAssistantCommand,
  getAiAssistantTestRunCommand,
  getAiAssistantCommand,
  listAiAssistantTestRunsCommand,
  listAiAssistantsCommand,
  sendAiAssistantSmsCommand,
  testAiAssistantToolCommand,
  triggerAiAssistantTestRunCommand,
  updateAiAssistantCommand,
} from "./commands/ai-assistants.ts";
import { searchAiCollectionCommand } from "./commands/ai-collections.ts";
import {
  disableSimCardCommand,
  enableSimCardCommand,
  listSimCardActionsCommand,
  listSimCardsCommand,
  retrieveSimCardActionCommand,
  retrieveSimCardCommand,
} from "./commands/sim-cards.ts";
import {
  getVoiceConnectionCommand,
  listActiveCallsCommand,
  listVoiceConnectionsCommand,
} from "./commands/voice-connections.ts";
import {
  endRoomSessionCommand,
  getRoomParticipantCommand,
  getRoomSessionCommand,
  kickRoomParticipantsCommand,
  listRoomParticipantsCommand,
  listRoomSessionsCommand,
  muteRoomParticipantsCommand,
  unmuteRoomParticipantsCommand,
} from "./commands/room-sessions.ts";
import {
  webContentsCommand,
  webResearchCommand,
  webResearchStatusCommand,
  webSearchCommand,
} from "./commands/web-search.ts";
import { storageSqlQueryCommand } from "./commands/storage-sql.ts";
import { parseFlags, isBooleanFlag } from "./utils/output.ts";

// Version is read lazily so that `--version` works without loading any command modules.
import { createRequire } from "node:module";
const VERSION = createRequire(import.meta.url)("../package.json").version as string;

const HELP = `
telnyx-agent — Agent-friendly CLI for Telnyx API v2

Usage:
  telnyx-agent <command> [flags]

Commands:
  setup-sms         Zero to SMS: create profile, buy number, assign it
  setup-voice       Zero to voice: create Call Control App, buy number, assign it
  setup-iot         Zero to IoT: list SIMs, create group, activate SIM
  list-sim-cards    List IoT SIM cards with filters and pagination
  retrieve-sim-card Retrieve one IoT SIM card by ID
  enable-sim-card   Enable an IoT SIM card (asynchronous action)
  disable-sim-card  Disable an IoT SIM card (asynchronous action)
  retrieve-sim-card-action Retrieve an asynchronous SIM card action by ID
  list-sim-card-actions List asynchronous SIM card actions with filters and pagination
  setup-ai          Zero to AI: create assistant, buy number, wire them together
  setup-wireguard   Zero to VPN: create network, WireGuard interface, peer
  setup-verify      Zero to verification: create profile (no number bought)
  verify-send       Trigger a phone verification (sms, call, flashcall, or whatsapp)
  verify-check      Verify a code or check verification status
  setup-10dlc       Zero to A2P: create brand, campaign, assign number
  setup-porting     Zero to porting: check portability, create order, submit
  list-porting-orders List port-in orders with filters and pagination
  get-porting-order Retrieve one porting order by ID
  update-porting-order Update porting order details and number configuration
  submit-porting-order Confirm and submit a draft porting order
  cancel-porting-order Cancel a porting order (requires --confirm)
  activate-porting-order Activate all numbers in a US FastPort order (irreversible; requires --confirm)
  attach-porting-document Attach an existing Telnyx document to a porting order
  list-porting-documents List documents attached to a porting order
  list-portout-orders List Port-Out orders with filters and pagination
  get-portout-order Retrieve one Port-Out order by ID
  list-portout-rejection-codes List eligible rejection codes for a Port-Out order
  update-portout-status Authorize or reject a Port-Out order (requires --confirm)
  create-portout-comment Create a comment on a Port-Out order
  list-portout-comments List comments on a Port-Out order
  edge-doctor       Validate Edge Compute prerequisites and handoff readiness
  setup-edge-mcp    Handoff to an Edge-hosted MCP server example
  setup-edge-webhook Handoff to an Edge-hosted webhook receiver example
  status            Account health overview
  capabilities      List all available API capabilities
  fund-account      Fund account via x402 USDC payment (EIP-712 signing)
  tts               Generate speech from text (text-to-speech)
  tts-voices        List available TTS voices (optionally filter by provider)
  setup-whatsapp    Zero to WhatsApp: list WABA, buy number, verify, set profile
  whatsapp-send     Send a WhatsApp message (text, template, media, or rich payload)
  whatsapp-templates List or create WhatsApp message templates
  send-sms          Send SMS/MMS from a number, alphanumeric sender, or number pool
  send-sms          Send an SMS or MMS message (--media-url sends MMS)
  email-send        Send or schedule an outbound email
  email-forward     Forward a message received by an email inbox
  email-reply       Reply to a message received by an email inbox
  email-reply-all   Reply to all recipients of an inbox message
  list-messaging-profiles List messaging profiles with name filters and pagination
  create-messaging-profile Create a messaging profile
  get-messaging-profile Get a messaging profile by ID
  update-messaging-profile Update a messaging profile by ID
  delete-messaging-profile Delete a messaging profile by ID (requires --confirm)
  fax-send          Send a fax from a URL or uploaded media file
  fax-status        Retrieve the latest status and details for a fax
  fax-cancel        Cancel an outbound fax that is still in progress
  fax-refresh       Refresh an expired media URL for an inbound fax
  send-group-mms    Send a group MMS to multiple recipients (--to comma-separated)
  schedule-sms      Schedule an SMS for future delivery (--send-at ISO 8601)
  sms-status        Check SMS delivery status, or cancel a scheduled message (--cancel)
  rcs-send          Send a text RCS message
  rcs-capabilities  Check RCS capabilities for a recipient
  call-dial         Make an outbound call via Call Control
  call-control      Call Control actions (answer, hangup, transfer, dtmf, record, speak, ...)
  call-pay          Securely collect or tokenize payment details on an active call
  call-status       Get the status of a call by call-control-id
  list-call-recordings List post-call recordings with call filters and pagination
  get-call-recording Retrieve one post-call recording by ID
  list-recording-transcriptions List recording transcriptions with filters and pagination
  get-recording-transcription Retrieve one recording transcription by ID
  create-conference Create a multi-party conference from an active call leg
  get-conference    Retrieve a conference by ID
  list-conferences  Discover active conferences with filters and pagination
  list-conference-participants List participants in a conference
  conference-control Control conference participants, media, DTMF, recording, or lifecycle
  create-meeting-session Create a Meeting Bot session and join a meeting
  list-meeting-sessions List Meeting Bot sessions, optionally filtered by status
  get-meeting-session Retrieve one Meeting Bot session by ID
  end-meeting-session End/cancel a Meeting Bot session (the record is retained)
  send-meeting-chat Send a chat message from a Meeting Bot
  speak-in-meeting Speak text through a Meeting Bot
  stop-meeting-speaking Stop active Meeting Bot text-to-speech playback
  get-meeting-transcript Retrieve transcript segments for a Meeting Bot session
  get-meeting-recordings Retrieve recordings for a Meeting Bot session
  create-meeting-artifact Request summary or action-items artifact generation
  list-meeting-artifacts List artifacts generated for a Meeting Bot session
  get-meeting-artifact Retrieve one Meeting Bot artifact
  list-voice-connections List voice connections with filters and pagination
  get-voice-connection Retrieve one voice connection by ID
  list-active-calls List active calls for a voice connection
  list-room-sessions List room sessions with room and active-state filters
  get-room-session  Retrieve one room session by ID
  list-room-participants List participants in a room session
  get-room-participant Retrieve one room participant by ID
  end-room-session  End a room session and remove all participants
  kick-room-participants Remove selected participants from a room session
  mute-room-participants Mute selected participants in a room session
  unmute-room-participants Unmute selected participants in a room session
  stt               Transcribe audio to text (speech-to-text)
  stt-providers     List available speech-to-text providers
  list-phone-numbers List phone numbers owned by the account
  search-phone-numbers Search available phone numbers to purchase
  buy-phone-number  Purchase/order one phone number
  lookup-number     Look up carrier and caller-name information
  ai-chat           Create an OpenAI-compatible chat completion
  ai-anthropic-message Create an Anthropic-compatible message response
  ai-embed          Create OpenAI-compatible text embeddings
  list-ai-assistants List AI assistant configurations
  create-ai-assistant Create an AI assistant
  get-ai-assistant  Retrieve an AI assistant by ID
  update-ai-assistant Update an AI assistant by ID
  delete-ai-assistant Delete an AI assistant by ID (requires --confirm)
  search-ai-collection Search or list RAG documents in an AI collection
  web-search        Search the web and return structured, LLM-ready results
  web-contents      Retrieve clean content for up to 20 URLs
  web-research      Start synchronous or background deep web research
  web-research-status Retrieve a background web research task by ID
  storage-sql-query Run SQL against a Telnyx Storage SQL database
  chat-ai-assistant Send a chat turn to an AI assistant conversation
  send-ai-assistant-sms Send or start an assistant conversation over SMS
  trigger-ai-assistant-test-run Execute an existing AI assistant test
  get-ai-assistant-test-run Retrieve one AI assistant test run
  list-ai-assistant-test-runs List execution history for an AI assistant test
  test-ai-assistant-tool Execute a webhook tool in an AI assistant context

Global Flags:
  --json            Output structured JSON instead of human-readable text
  --country <code>  Country code for number search (default: US)

Setup-specific Flags:
  --webhook-url <url>          Webhook URL for setup-voice (alias: --webhook; default: https://example.com/webhook)
  --outbound-voice-profile-id  Outbound voice profile ID (setup-voice, default: auto-detect first available)
  --force                      Provision a NEW profile/app + number even if an agent-created one
                               already exists (setup-sms, setup-voice; default: reuse existing to
                               avoid buying duplicate ~$1/mo numbers)
  --instructions    AI assistant instructions (setup-ai)
  --name            AI assistant name (setup-ai)
  --network-id      Use existing network (setup-wireguard)
  --profile-name    Custom verify profile name (setup-verify)
  --destinations    Whitelisted destination countries for verify (setup-verify, default: US)

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

Porting Order Action Flags:
  --id <id>         Porting order ID (get, update, submit, cancel, activate, attach/list documents — required)
  --customer-reference Customer bookkeeping reference (list, update)
  --customer-group-reference Customer group reference (list, update)
  --parent-support-key Parent support key filter (list-porting-orders)
  --phone-number    Phone-number substring filter (list-porting-orders)
  --country-code    Phone-number country filter (list-porting-orders)
  --carrier-name    Current carrier filter (list-porting-orders)
  --port-type       full|partial (list, update)
  --fast-port-eligible <bool> FastPort eligibility filter (list-porting-orders)
  --foc-after / --foc-before ISO 8601 requested FOC range filters (list-porting-orders)
  --include-phone-numbers <bool> Include phone-number objects (list, get)
  --page-number / --page-size Positive pagination values (list orders/documents)
  --sort            Generated API sort value (list orders/documents)
  --foc-datetime-requested ISO 8601 requested FOC date-time (update)
  --enable-messaging <bool> Port messaging capabilities (update)
  --connection-id / --messaging-profile-id Number assignments after porting (update)
  --billing-group-id / --emergency-address-id Number configuration (update)
  --tags            Comma-separated number tags (update)
  --loa-document-id / --invoice-document-id Primary document IDs (update)
  --requirement-group-id Requirement group to copy into the order (update)
  --webhook-url     Porting order webhook URL (update)
  --remaining-numbers-action keep|disconnect (partial-port update)
  --new-billing-phone-number Required when keeping remaining numbers (update)
  --confirm         Required safety acknowledgement (cancel-porting-order, activate-porting-order)
  --document-id     Existing Telnyx document ID (attach-porting-document — required)
  --document-type   loa|invoice|csr|other (attach required; comma-separated list filter)

Port-Out Action Flags:
  --id <id>         Port-Out order ID (get, update status, create/list comments — required)
  --portout-id <id> Port-Out order ID (list-portout-rejection-codes — required upstream flag)
  --filter <json>   Consolidated generated filter object (list orders/rejection codes)
  --carrier-name / --country-code / --phone-number / --pon / --spid / --status / --support-key
                    Scalar filters for list-portout-orders
  --country-code-in / --status-in Comma-separated or JSON string arrays (list-portout-orders)
  --foc-date        ISO 8601 FOC date filter (list-portout-orders)
  --inserted-at / --ported-out-at JSON date-range objects (list-portout-orders)
  --code            Rejection code filter (list-portout-rejection-codes)
  --page-number / --page-size Positive pagination values (list-portout-orders)
  --max-items       Maximum orders returned from the selected page; -1 means unlimited
  --status          authorized|rejected-pending (update-portout-status — required)
  --reason          Authorization or rejection reason (update-portout-status — required)
  --host-messaging <bool> Keep messaging services with Telnyx after port-out completion
  --confirm         Required safety acknowledgement for update-portout-status; never forwarded
  --body            Comment text (create-portout-comment — required)

Fund-account Flags:
  --amount <usd>    Amount to fund in USD (required, e.g., 50.00)
  --wallet-key <0x> Private key for signing (optional, outputs payment requirements if omitted)

TTS Flags:
  --text            Text to synthesize (required)
  --voice           Voice ID/name (optional, provider-specific)
  --language        Language code (default: en)
  --provider        TTS provider: telnyx, aws, azure, minimax, inworld, rime, resemble, fishaudio, humain, xai (default: telnyx)
  --output-type     Response format: base64 (base64-encoded audio JSON; default: base64)
  --text-type       Input format: text or ssml (default: text)
  --disable-cache   Skip cached audio and regenerate (boolean)

TTS-voices Flags:
  --provider        Filter voices by provider: telnyx, aws, azure, minimax, inworld, rime, resemble, fishaudio, humain, xai (optional)
  --api-key <key>   Provider API key forwarded to the Go CLI for provider-backed voice lists (e.g., resemble)
SMS Action Flags:
  --from <sender>        E.164 number or alphanumeric sender ID (send-sms); omit with
                         --messaging-profile-id to send from its number pool
  --from <e164>          Sender number (send-group-mms and schedule-sms — required)
  --to <e164>            Recipient number, E.164 (send-sms, schedule-sms — required)
  --to <e164,...>        Comma-separated recipients, E.164 (send-group-mms — required)
  --text <msg>           Message text (send-sms, schedule-sms — required; send-group-mms — optional)
  --media-url <url>      Media URL; sends MMS instead of SMS (send-sms, schedule-sms, send-group-mms)
  --messaging-profile-id <id> Required for number-pool and alphanumeric sends; optional
                              for E.164 send-sms (not supported by group MMS)
  --webhook-url <url>    Webhook for delivery status updates (send-sms)
  --subject <text>       MMS subject line (send-sms)
  --send-at <iso8601>    Send time, ISO 8601 (schedule-sms — required, e.g., 2024-12-31T00:00:00Z)
  --id <message-id>      Message ID (sms-status — required)
  --cancel               Cancel a scheduled message instead of retrieving status (sms-status)

Email Action Flags:
  --from <email|json>    Sender email address or sender JSON object (email-send — required)
  --to <email|json>      Recipient; repeat for multiple recipients (email-send, email-forward — required)
  --cc <email|json>      Cc recipient; repeat for multiple recipients (email-send, email-forward)
  --bcc <email|json>     Bcc recipient; repeat for multiple recipients (email-send, email-forward)
  --subject <text>       Subject (email-send — required unless --template-id is supplied)
  --text-body <text>     Plain-text outbound body (email-send)
  --html-body <html>     HTML outbound body (email-send)
  --attachment <json>   Attachment object; repeat for multiple attachments (email-send)
  --scheduled-at <iso8601> Future send time (email-send)
  --send-at <iso8601>   Deprecated alias for --scheduled-at (email-send)
  --template-id <id>    Email template ID (email-send)
  --template-variables <json> Liquid template variables (email-send)
  --reply-to <email|json> Reply-To address (email-send)
  --tag <value>         Reporting tag; repeat for multiple tags (email-send)
  --sandbox-mode <bool> Sandbox-send without delivery (email-send)
  --inline-css <bool>   Inline CSS in the HTML body (email-send)
  --ignore-suppression <bool> Override eligible suppressions (email-send; requires email:override scope)
  --idempotency-key <key> Idempotency key (email-send)
  --inbox-id <id>       Email inbox ID (email-forward, email-reply, email-reply-all — required)
  --message-id <id>     Received inbox message ID (email-forward, email-reply, email-reply-all — required)
  --text <text>         Reply or forwarding note plain-text body (inbox actions)
  --html <html>         Reply or forwarding note HTML body (inbox actions)

Messaging Profile Flags:
  --id <profile-id>      Messaging profile ID (get, update, delete — required)
  --name <name>          Profile name (create — required; update) or exact-name filter (list)
  --name-contains <text> Filter profile names containing text (list)
  --whitelisted-destinations <codes> Comma-separated ISO alpha-2 destinations or * (create — required; update)
  --whitelisted-destination <code> Repeatable generated-CLI alias for destinations (create, update)
  --ai-assistant-id <id> AI assistant linked to the profile (create, update)
  --alpha-sender <text>  Default alphanumeric sender (create, update)
  --enabled <bool>       Enable or disable the profile (create, update)
  --health-webhook-url <url> Spend-limit health webhook (create only)
  --resource-group-id <id> Resource group assignment (create only)
  --webhook-url <url>    Primary messaging webhook URL (create, update)
  --webhook-failover-url <url> Failover messaging webhook URL (create, update)
  --webhook-api-version <version> 1, 2, or 2010-04-01 (create, update)
  --v1-secret <secret>   Legacy webhook secret (update only)
  --daily-spend-limit <usd> Non-negative profile spend limit (create, update)
  --daily-spend-limit-enabled <bool> Enforce the daily spend limit (create, update)
  --smart-encoding <bool> Enable automatic SMS encoding optimization (create, update)
  --mms-fall-back-to-sms <bool> Enable MMS-to-SMS fallback (create, update)
  --mms-transcoding <bool> Enable MMS media transcoding (create, update)
  --mobile-only <bool> Restrict sends to mobile numbers (create, update)
  --number-pool-settings <json|null> Number-pool settings object (create, update)
  --url-shortener-settings <json|null> URL-shortener settings object (create, update)
  --page-number <n>      Result page (list-messaging-profiles)
  --page-size <n>        Results per page (list-messaging-profiles)
  --max-items <n>        Maximum list items; -1 means unlimited (list-messaging-profiles)
  --confirm              Required safety confirmation (delete-messaging-profile)

Fax Action Flags:
  --id <fax-id>          Fax ID (fax-status, fax-cancel, fax-refresh; required)
  --connection-id <id>   Fax application connection ID (fax-send, required)
  --from <e164>          Sender number, E.164 (fax-send, required)
  --to <e164|sip-uri>    Destination number or SIP URI (fax-send, required)
  --media-url <url>      Public URL of the fax document (fax-send; exclusive with --media-name)
  --media-name <name>    Previously uploaded Telnyx media name (fax-send; exclusive with --media-url)
  --webhook-url <url>    Override webhook URL for this fax (fax-send)
  --client-state <base64> Base64 state included in subsequent webhooks (fax-send)
  --from-display-name <name> Caller ID display name (fax-send)
  --quality <quality>    normal|high|very_high|ultra_light|ultra_dark (fax-send)
  --monochrome           Enable monochrome fax output (fax-send)
  --black-threshold <n> Black threshold percentage when monochrome is enabled (fax-send)
  --store-media          Store fax media on a temporary URL (fax-send)
  --store-preview        Store a fax preview on a temporary URL (fax-send)
  --preview-format <fmt> Preview format: pdf|tiff (fax-send)
  --t38-enabled <bool>   Enable or disable T.38 (fax-send)

RCS Action Flags:
  --agent-id <id>        RCS agent ID (rcs-send, rcs-capabilities — required)
  --messaging-profile-id <id> Messaging profile ID (rcs-send — required)
  --to <e164>            Recipient number, E.164 (rcs-send — required)
  --phone-number <e164>  Recipient number, E.164 (rcs-capabilities — required)
  --text <msg>           Text content (rcs-send — required)
  --ttl <duration>       Message lifetime ending in s, e.g. 300s (rcs-send)
  --webhook-url <url>    Webhook for message events (rcs-send)

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
  --audio <json>    Audio object, e.g. {"link":"https://..."} (whatsapp-send)
  --document <json> Document object (whatsapp-send)
  --image <json>    Image object (whatsapp-send)
  --interactive <json> Interactive message object (whatsapp-send)
  --location <json> Location object (whatsapp-send)
  --reaction <json> Reaction object (whatsapp-send)
  --sticker <json>  Sticker object (whatsapp-send)
  --contacts <json> JSON array of contact objects (whatsapp-send)
  --video <json>    Video object (whatsapp-send)
  --biz-opaque-callback-data <text> Custom data returned with status updates
  --messaging-profile-id Messaging profile id (whatsapp-send)
  --webhook-url     Message status webhook URL (whatsapp-send)
  --create          Switch to create mode (whatsapp-templates)
  --name            Template name (whatsapp-templates, create)
  --language        Template language, default en_US (whatsapp-templates, create)
  --component       Template components as a JSON array string (whatsapp-templates, create)
  --status          Filter templates by status: APPROVED|PENDING|REJECTED (whatsapp-templates, list)
Voice Call Flags:
  --connection-id   Voice connection ID (call-dial, list-active-calls — required)
  --from             E.164 number to call from (call-dial, required)
  --to               E.164 destination (call-dial, call-control transfer)
  --call-control-id Call Control ID of the call (call-control, call-status, required)
  --action           Call Control action (call-control, required)
                    Valid: answer, hangup, transfer, dtmf, start-recording, stop-recording,
                    start-noise-suppression, stop-noise-suppression, speak, bridge, refer, reject,
                    gather, stop-gather, start-playback, stop-playback, start-transcription,
                    stop-transcription, pause-recording, resume-recording, start-forking,
                    stop-forking, start-siprec, stop-siprec, start-streaming, stop-streaming,
                    enqueue, leave-queue, send-sip-info, update-client-state,
                    add-ai-assistant-messages, gather-using-ai, gather-using-audio,
                    gather-using-speak, join-ai-assistant, start-ai-assistant, stop-ai-assistant,
                    start-conversation-relay, stop-conversation-relay, switch-supervisor-role, pay
  --digits           DTMF digits to send (call-control dtmf)
  --payload          Text/SSML to synthesize (speak; gather-using-speak, required)
  --voice            TTS voice (speak default: female; gather-using-speak, required; AI/relay optional)
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
  --audio-url                    Audio URL to play on answer (call-dial); start-playback (required); gather-using-audio (optional)
  --timeout-secs                 Dial timeout in seconds (call-dial)
  --retry-on-timeout [true|false] Continue through remaining routing paths after a dial timeout (call-dial, default: true)
  --route-to-mobile [true|false]   Route directly to a Telnyx Mobile device, bypassing inbound call interception (call-dial, call-control transfer; default: false)
  --privacy                      Number masking: 'id' hides caller ID, 'none' is normal (call-dial, default: none)
  --from-display-name            Caller ID display name (call-dial)
  --time-limit-secs              Max call duration in seconds (call-dial)
  --transcription                Enable real-time transcription on dial (call-dial)
  --media-encryption             Media encryption mode (call-dial)
  --client-state                 Opaque client-state string (call-dial; update-client-state required; gather/AI/relay actions optional)
  --command-id                   Idempotency/command UUID (call-dial; gather/AI/relay actions optional)
  --webhook-url-method           HTTP method for --webhook-url (call-dial: GET|POST|PUT|PATCH|DELETE)
  --webhook-urls                 Comma-separated additional webhook URLs (call-dial)
  --queue-name                   Queue to place the call into (call-control enqueue, required)
  --body                         SIP INFO body content (call-control send-sip-info, required)
  --content-type                 SIP INFO Content-Type header (call-control send-sip-info, required, e.g. application/dtmf-relay)
  --message                      AI message array as JSON (add-ai-assistant-messages, optional)
  --trigger-response             Immediately trigger an assistant turn after adding AI messages
  --parameters                   JSON Schema object (gather-using-ai, required)
  --assistant                    Assistant configuration as JSON (gather/start AI and conversation relay, optional)
  --greeting                     Initial spoken greeting (gather-using-ai, start-ai-assistant/start-conversation-relay, optional)
  --conversation-id              Existing AI conversation ID (join-ai-assistant, required)
  --participant                  Participant object as JSON (join-ai-assistant, required; start-ai-assistant, optional)
  --url                          WebSocket URL (start-conversation-relay, optional)
  --dtmf-detection               Enable relay DTMF detection (start-conversation-relay, optional)
  --role                         Supervisor role: barge|whisper|monitor (switch-supervisor-role, required)
                    Generated optional JSON, scalar, boolean, and dotted inner flags for these actions
                    are forwarded unchanged to the Go CLI (for example --assistant.id).
Call Pay Flags:
  --call-control-id              Call Control ID of the active call (required)
  --amount                       Amount to charge (required for --transaction-type charge)
  --transaction-type             charge|tokenize; inferred from --amount when omitted
  --connector-name               Pay connector name (Go CLI default: Default)
  --currency                     Transaction currency (currently USD; Go CLI default: USD)
  --description                  Description forwarded with the payment transaction
  --payment-method               Payment method to collect (Go CLI default: credit-card)
  --payment-token                Existing token; skips payment-detail collection
  --metadata                     JSON metadata forwarded to the Pay connector
  --parameters                   JSON parameters forwarded to the Pay connector
  --prompts                      JSON object of custom payment collection prompts
  --prompts.<step>               Custom prompt for bank-account-number, bank-routing-number,
                                 expiration-date, payment-card-number, postal-code, or security-code
  --language                     Prompt language (Go CLI default: en-US)
  --voice                        Prompt voice (Go CLI default: female)
  --service-level                Prompt TTS service level (Go CLI default: premium)
  --inter-digit-timeout-millis   Inter-digit DTMF timeout (Go CLI default: 5000)
  --timeout-millis               DTMF input timeout per step (Go CLI default: 5000)
  --max-attempts                 Maximum attempts per collection step (Go CLI default: 3)
  --client-state                 Base64 state included in subsequent webhooks
  --command-id                   Idempotency key for the payment command
Post-call Recording Discovery Flags:
  --id <id>                     Recording or recording-transcription ID (get commands — required)
  --call-control-id             Exact Call Control ID filter (list-call-recordings)
  --call-leg-id                 Exact call-leg ID filter (list-call-recordings)
  --call-session-id             Exact call-session ID filter (list-call-recordings)
  --conference-id              Exact conference ID filter (list-call-recordings)
  --conference-region          Exact conference-region filter (list-call-recordings)
  --connection-id              Exact connection ID filter (list-call-recordings)
  --from / --to                Exact caller/callee filter (list-call-recordings)
  --sip-call-id                Exact SIP Call-ID filter (list-call-recordings)
  --recording-id               Filter transcriptions by recording (list-recording-transcriptions)
  --created-at <json>          Generated range object, e.g. {"gte":"2026-08-01T00:00:00Z"} (list commands)
  --start-time / --end-time <json> Generated range objects (list-call-recordings)
  --page-number / --page-size  Positive pagination values (list commands)
  --max-items                  Maximum items retained from the selected page; -1 means all
Voice Connection Discovery Flags:
  --id <connection-id> Retrieve a voice connection (get-voice-connection — required)
  --connection-name Filter connections by name substring (list-voice-connections)
  --fqdn            Exact FQDN filter (list-voice-connections)
  --outbound-voice-profile-id Outbound voice profile filter (list-voice-connections)
  --page-number     Result page (list-voice-connections)
  --page-size       Results per page (list-voice-connections, list-active-calls)
  --sort            Connection sort order; prefix with - for descending (list-voice-connections)
  --max-items       Maximum items to return; -1 for unlimited (list-voice-connections, list-active-calls)
Conference Flags:
  --conference-id   Conference ID (conference-control, list-conference-participants — required)
  --id              Conference ID (get-conference; --id is also accepted by conference-control)
  --name            Conference name (create-conference required; list-conferences exact filter)
  --call-control-id Active call leg to bridge (create/join/leave/update) or repeatable participant target
  --action           Conference control action (conference-control, required)
                    Valid: update, end-conference, gather-dtmf-audio, hold, join, leave, mute,
                    play, record-pause, record-resume, record-start, record-stop, send-dtmf,
                    speak, stop, unhold, unmute
                    Aliases: end, gather-dtmf, start-recording, stop-recording,
                    pause-recording, resume-recording
  --region           Conference data region
  --status           Exact conference status filter (list-conferences)
  --page-number / --page-size Conference or participant page selection
  --max-items        Limit conferences or participants returned; -1 means all on the selected page
  --muted / --on-hold / --whispering <bool> Participant filters
  Action-specific flags are forwarded exactly to the generated Telnyx CLI. Common examples:
  --payload / --voice (speak), --audio-url / --media-name (play, hold, gather),
  --digits (send-dtmf), --format mp3|wav (record-start), --recording-id,
  --command-id, --supervisor-role, --whisper-call-control-id, --beep-enabled
Room Session Moderation Flags:
  --room-session-id <id> Room session ID (get/list participants and moderation actions — required)
  --room-participant-id <id> Room participant ID (get-room-participant — required)
  --room-id <id>    Filter sessions by room (list-room-sessions)
  --active <bool>   Filter active or inactive sessions (list-room-sessions)
  --include-participants <bool> Include participants with session results (list/get room sessions)
  --context <text>  Filter participants by context (list-room-participants)
  --participants <all|ids> "all" or comma-separated participant IDs (kick/mute/unmute — required)
  --exclude <ids>   Comma-separated participant IDs to exclude (kick/mute/unmute)
  --page-number     Result page (list-room-sessions, list-room-participants)
  --page-size       Results per page (list-room-sessions, list-room-participants)

Meeting Bot Flags (requires Telnyx Go CLI v0.27+):
  --id <session-id> Meeting session ID (get/end/live/transcript/recording/artifact commands)
  --meeting-session-id Alias for --id
  --meeting-url     Meeting URL (create-meeting-session, required)
  --bot-name        Meeting Bot display name (create)
  --join-at         Future ISO-8601 join time (create)
  --assistant / --avatar / --camera-image JSON configuration objects (create)
  --metadata        JSON metadata object (create)
  --idempotency-key Safe create retry key (create)
  --speak-on-enter  Text to speak after joining (create)
  --voice           Default session voice (create) or utterance override (speak)
  --webhook-url     HTTPS lifecycle callback URL (create)
  --barge-in <bool> Interrupt bot audio when a participant speaks (create)
  --summarize-on-end <bool> Generate a summary when the session ends (create)
  --text            Chat or speech text (send-meeting-chat, speak-in-meeting; required)
  --interrupt <bool> Interrupt current audio before speaking (speak-in-meeting)
  --after           Transcript sequence cursor (get-meeting-transcript)
  --limit           Transcript page size, 1-1000 (get-meeting-transcript)
  --wait-seconds    Transcript long-poll duration (get-meeting-transcript)
  --type            summary|action_items (create-meeting-artifact, required)
  --artifact-id     Artifact ID (get-meeting-artifact, required)

  Ending uses upstream "meeting-sessions delete" semantics: participation stops but the
  persisted session record remains. A hard-delete meeting-session route is not exposed upstream.
STT Flags:
  --audio-url <url> URL of the audio file to transcribe (required)
  --model           Transcription model (default: distil-whisper/distil-large-v2; also openai/whisper-large-v3-turbo, deepgram/nova-3)
  --language        Language code (optional; not supported by the default model)
  --response-format Transcript output format (optional, json or verbose_json)

STT-providers Flags:
  --provider        Filter providers by name (optional)
  --service-type    Filter providers by service type (optional)

Numbers Action Flags:
  --phone-number    Phone number filter, number to buy, or E.164 number to look up
  --country         ISO alpha-2 country code (list, search; search default: US)
  --status          Owned-number status filter (list-phone-numbers)
  --connection-id   Connection filter (list) or connection assignment (buy)
  --tag             Tag filter (list-phone-numbers)
  --source          Source filter: ported or purchased (list-phone-numbers)
  --number-type     Number type equality filter (list-phone-numbers)
  --page-number     Result page (list-phone-numbers)
  --page-size       Results per page (list-phone-numbers)
  --sort            Owned-number sort order (list-phone-numbers)
  --type            local|toll_free|national|mobile (search); carrier|caller-name (lookup, required)
  --features        Comma-separated features, e.g. sms,voice,mms (search-phone-numbers)
  --limit           Maximum search results (search-phone-numbers)
  --area-code       Area/national destination code (search-phone-numbers)
  --national-destination-code Exact alias for --area-code (search-phone-numbers)
  --locality        City/locality filter (search-phone-numbers)
  --administrative-area State/province filter (search-phone-numbers)
  --contains        Number pattern that must occur (search-phone-numbers)
  --starts-with     Number pattern prefix (search-phone-numbers)
  --ends-with       Number pattern suffix (search-phone-numbers)
  --messaging-profile-id Messaging profile assignment (buy-phone-number)
  --billing-group-id Billing group filter (list) or assignment (buy)
  --customer-reference Customer reference filter (list) or value (buy)
  --bundle-id       Bundle for the ordered number (buy-phone-number)
  --requirement-group-id Requirement group for the ordered number (buy-phone-number)

AI Chat Flags:
  --message <json>  Chat message JSON object (repeatable), or an array of message objects (required)
  --model           Language model ID (optional; Go CLI default is Meta-Llama-3.1-8B-Instruct)
  --max-tokens      Maximum completion tokens
  --temperature     Sampling temperature
  --top-p           Nucleus sampling probability
  --stop <json>     Stop string or JSON array, passed through to the Go CLI
  --response-format <json> OpenAI response-format object, passed through as JSON
  --guided-choice   Constrain output to one exact choice
  --guided-json <json> JSON schema for constrained output
  --tool <json>     OpenAI-compatible tool object
  --tool-choice     Tool selection: none, auto, or required

AI Anthropic Message Flags:
  --message <json>  Anthropic message JSON object (repeatable, required)
  --model <id>      Anthropic-compatible model ID (required)
  --max-tokens <n>  Maximum number of tokens to generate (required)
  --api-key-ref <id> Integration-secret identifier for an external provider API key
  --billing-group-id <id> Billing group to associate with the request
  --fallback-config <json> Model fallback configuration
  --max-retries <n> Maximum request retries
  --mcp-server <json> MCP server definition JSON object (repeatable)
  --metadata <json> Request metadata object
  --service-tier <tier> Service tier for the request
  --stop-sequence <value> Stop sequence (repeatable)
  --system <value>  System prompt string or JSON content-block array
  --temperature <n> Sampling temperature from 0 to 1
  --thinking <json> Extended-thinking configuration
  --timeout <seconds> Request timeout in seconds
  --tool-choice <json> Anthropic tool-choice JSON object
  --tool <json>     Anthropic tool definition JSON object (repeatable)
  --top-k <n>       Restrict sampling to the top K token options
  --top-p <n>       Nucleus sampling probability

AI Embed Flags:
  --input <value>   Text or JSON array of strings to embed (required)
  --model <id>      Embedding model ID (required)
  --dimensions      Requested embedding dimensions (model support varies)
  --encoding-format Embedding encoding format (Go CLI default: float)
  --user            End-user identifier for monitoring and abuse detection

AI Assistant Lifecycle Flags:
  --id <assistant-id> AI assistant ID (get, update, delete; --assistant-id alias accepted)
  --name            Assistant name (create required; update optional)
  --instructions    System instructions (create required; update optional)
  --description     Assistant description (create, update)
  --model           Language model ID (create, update)
  --greeting        Initial assistant greeting; an empty string makes it wait (create, update)
  --voice           Voice ID, forwarded as --voice-settings.voice (create, update)
  --transcription-model Speech-to-text model (create, update)
  --transcription-language Speech-to-text language (create, update)
  --dynamic-variables <json> Dynamic variable defaults as a JSON object (create, update)
  --dynamic-variables-webhook-url <url> Dynamic variable resolver webhook (create, update)
  --dynamic-variables-webhook-timeout-ms <1-10000> Resolver timeout (create, update)
  --tags <csv>      Comma-separated assistant tags (create, update)
  --tool-ids <csv>  Comma-separated shared AI tool IDs (create, update)
  --clear-tags      Clear all assistant tags (update only; exclusive with --tags)
  --clear-tool-ids  Clear all shared AI tool IDs (update only; exclusive with --tool-ids)
  --version-name    Human-readable version name (update only)
  --promote-to-main <bool> Promote the new version (update only)
  --confirm         Explicitly confirm deletion (delete only, required)

AI Collection Retrieval Flags:
  --collection-id <slug> Collection slug to search (required; --slug alias accepted)
  --query <text>    Natural-language query; omit for a plain document catalog listing
  --retrieval-type <type> Override retrieval strategy: vector, hybrid, or keyword
  --top-k <n>       Maximum ranked candidates (defaults to the collection setting)
  --page-number <n> Result page, starting at 1 (default: 1)
  --page-size <n>   Results per page (default: 20)
  --sources <csv>   Comma-separated source types to search, e.g. voice,message
  --filter <json>   Pre-ranking field filters, e.g. {"record_id":{"eq":"rec_123"}}
Web Intelligence Flags:
  --query <text>    Search query or research question (web-search, web-research — required)
  --count <1-100>   Number of web search results to return
  --country <code>  ISO alpha-2 country code used to bias web search results
  --exclude-domain <host> Exclude a domain from search results (repeatable)
  --include-domain <host> Restrict search results to a domain (repeatable)
  --freshness <age> Search freshness filter: day, week, month, or year
  --livecrawl <bool> Crawl search results in real time
  --safesearch <level> Safe-search filter level
  --url <url>       URL to retrieve (web-contents — required, repeatable, max 20)
  --crawl-timeout <seconds> Per-URL crawl timeout from 1 to 60 seconds
  --format <format> Content format: html, markdown, or metadata (repeatable)
  --max-age <seconds|null> Maximum cached-content age
  --background <bool> Run web research asynchronously and return a task ID
  --max-sources <n> Maximum number of research sources
  --research-effort <level> Research depth: lite or deep
  --task-id <id>    Background research task ID (web-research-status — required)
AI Assistant Execution Flags:
  --id <assistant-id> Assistant ID (chat, SMS, and tool test; --assistant-id alias accepted)
  --content <text>  User message sent to the assistant (chat required)
  --conversation-id <id> Existing conversation thread ID (chat required)
  --name <name>     Optional display name for the chat user
  --from / --to     SMS sender and recipient in E.164 format (assistant SMS required)
  --text <text>     Optional initial assistant SMS text
  --conversation-metadata <json> Conversation metadata object (assistant SMS)
  --should-create-conversation <bool> Create a conversation when needed (assistant SMS)
  --test-id <id>    Assistant test ID (trigger, get, and list test runs)
  --run-id <id>     Assistant test run ID (get required)
  --destination-version-id <id> Assistant version used by a triggered test run
  --status <value>  Test-run status filter (list)
  --page-number / --page-size Positive pagination values (list test runs)
  --max-items <n>   Maximum returned test runs; -1 means unlimited
  --tool-id <id>    Shared webhook tool ID (tool test required)
  --arguments <json> Webhook tool arguments object
  --dynamic-variables <json> Dynamic variables object (tool test)

IoT SIM Action Flags:
  --id <id>         SIM card ID (retrieve/enable/disable) or action ID (retrieve-sim-card-action) — required
  --iccid           Partial ICCID filter (list-sim-cards)
  --msisdn          MSISDN filter (list-sim-cards)
  --status          Comma-separated SIM statuses (list-sim-cards), or action status (list-sim-card-actions)
  --tags            Comma-separated tags that all matching SIMs must have (list-sim-cards)
  --sim-card-group-id SIM card group filter (list-sim-cards)
  --sim-card-id     SIM card filter (list-sim-card-actions)
  --bulk-sim-card-action-id Bulk action filter (list-sim-card-actions)
  --action-type     Action type filter (list-sim-card-actions)
  --include-sim-card-group Include the associated SIM card group (list, retrieve)
  --page-number     Result page (SIM/action list commands)
  --page-size       Results per page (SIM/action list commands)
  --sort            Sort field; prefix with - for descending (list-sim-cards)

Storage SQL Query Flags:
  --id <database-id> SQL database ID (required)
  --sql <statement>  SQL to execute; use positional ? placeholders (required)
  --param <value>    Positional binding in placeholder order; repeat for each ?
                     Values use the generated CLI syntax: string, number, boolean, or null

Environment:
  TELNYX_API_KEY    API key (or configure ~/.config/telnyx/config.json)

Examples:
  telnyx-agent status
  telnyx-agent status --json
  telnyx-agent capabilities
  telnyx-agent setup-sms --country US
  telnyx-agent setup-voice
  telnyx-agent setup-verify
  telnyx-agent setup-verify --destinations US,GB,LK
  telnyx-agent setup-voice --webhook https://example.com/calls
  telnyx-agent setup-voice --outbound-voice-profile-id 2927726759434519857
  telnyx-agent setup-ai --instructions "You are a pizza ordering bot"
  telnyx-agent setup-porting --phone-numbers +131****0001,+131****0002 --customer-name "Acme Corp"
  telnyx-agent list-porting-orders --customer-reference migration-2026 --page-size 25 --json
  telnyx-agent get-porting-order --id <porting-order-id> --json
  telnyx-agent update-porting-order --id <porting-order-id> --connection-id <connection-id> --enable-messaging true --json
  telnyx-agent submit-porting-order --id <porting-order-id> --json
  telnyx-agent cancel-porting-order --id <porting-order-id> --confirm --json
  telnyx-agent activate-porting-order --id <porting-order-id> --confirm --json
  telnyx-agent attach-porting-document --id <porting-order-id> --document-id <document-id> --document-type loa --json
  telnyx-agent list-porting-documents --id <porting-order-id> --document-type loa,invoice --json
  telnyx-agent list-portout-orders --status pending --page-size 25 --json
  telnyx-agent get-portout-order --id <portout-id> --json
  telnyx-agent list-portout-rejection-codes --portout-id <portout-id> --code 1002 --json
  telnyx-agent update-portout-status --id <portout-id> --status authorized --reason "Verified request" --confirm --json
  telnyx-agent create-portout-comment --id <portout-id> --body "Review complete" --json
  telnyx-agent list-portout-comments --id <portout-id> --json
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
  telnyx-agent whatsapp-send --from +155****1111 --to +155****2222 --image '{"link":"https://example.com/photo.jpg","caption":"Hello"}'
  telnyx-agent whatsapp-templates --waba-id <id> --json
  telnyx-agent whatsapp-templates --waba-id <id> --create --name promo --category MARKETING --component '[]'
  telnyx-agent send-sms --from +131****0000 --to +131****0001 --text "Hello!"
  telnyx-agent send-sms --messaging-profile-id <id> --to +131****0001 --text "From the pool"
  telnyx-agent send-sms --from MyCompany --messaging-profile-id <id> --to +131****0001 --text "Hello!"
  telnyx-agent send-sms --from +131****0000 --to +131****0001 --text "See this" --media-url https://example.com/img.png --subject "Photo"
  telnyx-agent email-send --from sender@example.com --to alice@example.com --to bob@example.com --subject "Hello" --text-body "Hello from Telnyx"
  telnyx-agent email-send --from sender@example.com --to alice@example.com --template-id <template-id> --template-variables '{"name":"Alice"}' --scheduled-at 2026-08-18T12:00:00Z
  telnyx-agent email-forward --inbox-id <inbox-id> --message-id <message-id> --to colleague@example.com --text "FYI"
  telnyx-agent email-reply --inbox-id <inbox-id> --message-id <message-id> --text "Thanks for the update"
  telnyx-agent email-reply-all --inbox-id <inbox-id> --message-id <message-id> --html '<p>Thanks, everyone.</p>'
  telnyx-agent list-messaging-profiles --name-contains production --json
  telnyx-agent create-messaging-profile --name "Production SMS" --whitelisted-destinations US,CA --webhook-url https://example.com/messages --json
  telnyx-agent get-messaging-profile --id <profile-id> --json
  telnyx-agent update-messaging-profile --id <profile-id> --name "Updated SMS" --enabled true --json
  telnyx-agent delete-messaging-profile --id <profile-id> --confirm --json
  telnyx-agent fax-send --connection-id <id> --from +131****0000 --to +131****0001 --media-url https://example.com/document.pdf
  telnyx-agent fax-status --id <fax-id> --json
  telnyx-agent fax-cancel --id <fax-id> --json
  telnyx-agent fax-refresh --id <fax-id> --json
  telnyx-agent send-group-mms --from +131****0000 --to +131****0001,+131****0002,+131****0003 --text "Group hi!"
  telnyx-agent send-group-mms --from +131****0000 --to +131****0001,+131****0002 --media-url https://example.com/cat.png
  telnyx-agent schedule-sms --from +131****0000 --to +131****0001 --text "Later" --send-at 2024-12-31T00:00:00Z
  telnyx-agent sms-status --id 3fa85f64-5717-4562-b3fc-2c963f66afa6
  telnyx-agent sms-status --id 3fa85f64-5717-4562-b3fc-2c963f66afa6 --cancel
  telnyx-agent rcs-capabilities --agent-id <agent-id> --phone-number +131****0001 --json
  telnyx-agent rcs-send --agent-id <agent-id> --messaging-profile-id <id> --to +131****0001 --text "Hello from RCS"
  telnyx-agent call-dial --connection-id <id> --from +131****0000 --to +131****1234
  telnyx-agent call-dial --connection-id <id> --from +131****0000 --to +131****1234 --answering-machine-detection --json
  telnyx-agent call-control --action hangup --call-control-id <id>
  telnyx-agent call-control --action transfer --call-control-id <id> --to +131****9999
  telnyx-agent call-control --action transfer --call-control-id <id> --to +131****9999 --route-to-mobile
  telnyx-agent call-control --action dtmf --call-control-id <id> --digits 1234
  telnyx-agent call-control --action speak --call-control-id <id> --payload "Hello there" --voice female
  telnyx-agent call-control --action start-recording --call-control-id <id> --channels dual --format mp3
  telnyx-agent call-control --action bridge --call-control-id <id> --call-control-id-2 <id2>
  telnyx-agent call-dial --connection-id <id> --from +131****0000 --to +131****1234 --privacy id
  telnyx-agent call-dial --connection-id <id> --from +131****0000 --to +131****1234 --route-to-mobile
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
  telnyx-agent call-control --action gather-using-ai --call-control-id <id> --parameters '{"type":"object","properties":{"name":{"type":"string"}}}'
  telnyx-agent call-control --action gather-using-speak --call-control-id <id> --payload "Enter your PIN" --voice Telnyx.KokoroTTS.af
  telnyx-agent call-control --action join-ai-assistant --call-control-id <id> --conversation-id <conversation-id> --participant '{"id":"call-2","role":"user"}'
  telnyx-agent call-control --action start-ai-assistant --call-control-id <id> --assistant.id <assistant-id>
  telnyx-agent call-control --action start-conversation-relay --call-control-id <id> --url wss://example.com/relay
  telnyx-agent call-control --action switch-supervisor-role --call-control-id <id> --role whisper
  telnyx-agent call-pay --call-control-id <id> --amount 10.50 --transaction-type charge --description "Order 12345"
  telnyx-agent call-pay --call-control-id <id> --transaction-type tokenize --json
  telnyx-agent call-status --call-control-id <id> --json
  telnyx-agent list-call-recordings --call-control-id <id> --page-size 25 --json
  telnyx-agent get-call-recording --id <recording-id> --json
  telnyx-agent list-recording-transcriptions --recording-id <recording-id> --json
  telnyx-agent get-recording-transcription --id <transcription-id> --json
  telnyx-agent create-conference --call-control-id <call-id> --name support-room --json
  telnyx-agent list-conferences --status active --json
  telnyx-agent get-conference --id <conference-id> --json
  telnyx-agent list-conference-participants --conference-id <conference-id> --json
  telnyx-agent conference-control --conference-id <conference-id> --action join --call-control-id <call-id>
  telnyx-agent conference-control --conference-id <conference-id> --action mute --call-control-id <call-id>
  telnyx-agent conference-control --conference-id <conference-id> --action speak --payload "Welcome" --voice Telnyx.KokoroTTS.af
  telnyx-agent conference-control --conference-id <conference-id> --action record-start --format mp3
  telnyx-agent conference-control --conference-id <conference-id> --action end-conference
  telnyx-agent create-meeting-session --meeting-url https://meet.example.com/room --bot-name "Notes Bot" --json
  telnyx-agent list-meeting-sessions --status active --json
  telnyx-agent get-meeting-session --id <meeting-session-id> --json
  telnyx-agent send-meeting-chat --id <meeting-session-id> --text "Hello everyone"
  telnyx-agent speak-in-meeting --id <meeting-session-id> --text "The meeting starts now" --interrupt
  telnyx-agent get-meeting-transcript --id <meeting-session-id> --after 0 --limit 100 --json
  telnyx-agent get-meeting-recordings --id <meeting-session-id> --json
  telnyx-agent create-meeting-artifact --id <meeting-session-id> --type summary --json
  telnyx-agent list-meeting-artifacts --id <meeting-session-id> --json
  telnyx-agent get-meeting-artifact --id <meeting-session-id> --artifact-id <artifact-id> --json
  telnyx-agent end-meeting-session --id <meeting-session-id> --json
  telnyx-agent list-voice-connections --connection-name support --page-size 25 --json
  telnyx-agent get-voice-connection --id <connection-id> --json
  telnyx-agent list-active-calls --connection-id <connection-id> --json
  telnyx-agent list-room-sessions --active true --include-participants true --json
  telnyx-agent get-room-session --room-session-id <session-id> --json
  telnyx-agent list-room-participants --room-session-id <session-id> --json
  telnyx-agent get-room-participant --room-participant-id <participant-id> --json
  telnyx-agent mute-room-participants --room-session-id <session-id> --participants all --exclude <participant-id> --json
  telnyx-agent unmute-room-participants --room-session-id <session-id> --participants <participant-id> --json
  telnyx-agent kick-room-participants --room-session-id <session-id> --participants <participant-id> --json
  telnyx-agent end-room-session --room-session-id <session-id> --json
  telnyx-agent stt --audio-url https://example.com/audio.mp3
  telnyx-agent stt --audio-url https://example.com/audio.mp3 --model openai/whisper-large-v3-turbo --language es --json
  telnyx-agent stt-providers --json
  telnyx-agent stt-providers --provider telnyx --service-type transcription --json
  telnyx-agent list-phone-numbers --status active --page-size 50 --json
  telnyx-agent search-phone-numbers --country US --area-code 312 --features sms,voice --limit 5 --json
  telnyx-agent buy-phone-number --phone-number +131****0000 --messaging-profile-id <id> --json
  telnyx-agent lookup-number --phone-number +131****0000 --type carrier --json
  telnyx-agent lookup-number --phone-number +131****0000 --type caller-name --json
  telnyx-agent ai-chat --message '{"role":"user","content":"Hello"}' --json
  telnyx-agent ai-chat --message '{"role":"user","content":"Return JSON"}' --response-format '{"type":"json_object"}' --json
  telnyx-agent ai-anthropic-message --model zai-org/GLM-5.2 --max-tokens 256 --message '{"role":"user","content":"Hello"}' --json
  telnyx-agent ai-embed --model thenlper/gte-large --input "Hello world" --json
  telnyx-agent ai-embed --model thenlper/gte-large --input '["one","two"]' --dimensions 256 --json
  telnyx-agent list-ai-assistants --json
  telnyx-agent create-ai-assistant --name Concierge --instructions "Help callers" --model meta-llama/Llama-3.1-70B-Instruct --json
  telnyx-agent get-ai-assistant --id <assistant-id> --json
  telnyx-agent update-ai-assistant --id <assistant-id> --greeting "How can I help?" --json
  telnyx-agent delete-ai-assistant --id <assistant-id> --confirm --json
  telnyx-agent search-ai-collection --collection-id support-transcripts --query "billing issue" --retrieval-type hybrid --top-k 10 --json
  telnyx-agent web-search --query "latest WebRTC developments" --count 10 --freshness week --json
  telnyx-agent web-contents --url https://example.com --format markdown --json
  telnyx-agent web-research --query "Compare SIP trunking providers" --background true --json
  telnyx-agent web-research-status --task-id <task-id> --json
  telnyx-agent chat-ai-assistant --id <assistant-id> --conversation-id <conversation-id> --content "Hello" --json
  telnyx-agent send-ai-assistant-sms --id <assistant-id> --from +131****0000 --to +131****0001 --text "Hello" --json
  telnyx-agent trigger-ai-assistant-test-run --test-id <test-id> --json
  telnyx-agent get-ai-assistant-test-run --test-id <test-id> --run-id <run-id> --json
  telnyx-agent list-ai-assistant-test-runs --test-id <test-id> --status completed --json
  telnyx-agent test-ai-assistant-tool --id <assistant-id> --tool-id <tool-id> --arguments '{"ticket_id":"123"}' --json
  telnyx-agent list-sim-cards --status enabled,disabled --page-size 25 --json
  telnyx-agent retrieve-sim-card --id <sim-card-id> --json
  telnyx-agent enable-sim-card --id <sim-card-id> --json
  telnyx-agent disable-sim-card --id <sim-card-id> --json
  telnyx-agent retrieve-sim-card-action --id <action-id> --json
  telnyx-agent list-sim-card-actions --sim-card-id <sim-card-id> --status in-progress --json
  telnyx-agent storage-sql-query --id <database-id> --sql "SELECT * FROM users WHERE id = ?" --param 42 --json
`;

const COMMANDS: Record<string, (
  flags: Record<string, string | boolean>,
  occurrences?: Record<string, Array<string | boolean>>,
) => Promise<void>> = {
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
  "list-porting-orders": listPortingOrdersCommand,
  "get-porting-order": getPortingOrderCommand,
  "update-porting-order": updatePortingOrderCommand,
  "submit-porting-order": submitPortingOrderCommand,
  "cancel-porting-order": cancelPortingOrderCommand,
  "activate-porting-order": activatePortingOrderCommand,
  "attach-porting-document": attachPortingDocumentCommand,
  "list-porting-documents": listPortingDocumentsCommand,
  "list-portout-orders": listPortoutOrdersCommand,
  "get-portout-order": getPortoutOrderCommand,
  "list-portout-rejection-codes": listPortoutRejectionCodesCommand,
  "update-portout-status": updatePortoutStatusCommand,
  "create-portout-comment": createPortoutCommentCommand,
  "list-portout-comments": listPortoutCommentsCommand,
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
  "email-send": emailSendCommand,
  "email-forward": emailForwardCommand,
  "email-reply": emailReplyCommand,
  "email-reply-all": emailReplyAllCommand,
  "list-messaging-profiles": listMessagingProfilesCommand,
  "create-messaging-profile": createMessagingProfileCommand,
  "get-messaging-profile": getMessagingProfileCommand,
  "update-messaging-profile": updateMessagingProfileCommand,
  "delete-messaging-profile": deleteMessagingProfileCommand,
  "fax-send": faxSendCommand,
  "fax-status": faxStatusCommand,
  "fax-cancel": faxCancelCommand,
  "fax-refresh": faxRefreshCommand,
  "send-group-mms": sendGroupMmsCommand,
  "schedule-sms": scheduleSmsCommand,
  "sms-status": smsStatusCommand,
  "rcs-send": rcsSendCommand,
  "rcs-capabilities": rcsCapabilitiesCommand,
  "call-dial": callDialCommand,
  "call-control": callControlCommand,
  "call-pay": callPayCommand,
  "call-status": callStatusCommand,
  "list-call-recordings": listCallRecordingsCommand,
  "get-call-recording": getCallRecordingCommand,
  "list-recording-transcriptions": listRecordingTranscriptionsCommand,
  "get-recording-transcription": getRecordingTranscriptionCommand,
  "create-conference": createConferenceCommand,
  "get-conference": getConferenceCommand,
  "list-conferences": listConferencesCommand,
  "list-conference-participants": listConferenceParticipantsCommand,
  "conference-control": conferenceControlCommand,
  "create-meeting-session": createMeetingSessionCommand,
  "list-meeting-sessions": listMeetingSessionsCommand,
  "get-meeting-session": getMeetingSessionCommand,
  "end-meeting-session": endMeetingSessionCommand,
  "send-meeting-chat": sendMeetingChatCommand,
  "speak-in-meeting": speakInMeetingCommand,
  "stop-meeting-speaking": stopMeetingSpeakingCommand,
  "get-meeting-transcript": getMeetingTranscriptCommand,
  "get-meeting-recordings": getMeetingRecordingsCommand,
  "create-meeting-artifact": createMeetingArtifactCommand,
  "list-meeting-artifacts": listMeetingArtifactsCommand,
  "get-meeting-artifact": getMeetingArtifactCommand,
  "list-voice-connections": listVoiceConnectionsCommand,
  "get-voice-connection": getVoiceConnectionCommand,
  "list-active-calls": listActiveCallsCommand,
  "list-room-sessions": listRoomSessionsCommand,
  "get-room-session": getRoomSessionCommand,
  "list-room-participants": listRoomParticipantsCommand,
  "get-room-participant": getRoomParticipantCommand,
  "end-room-session": endRoomSessionCommand,
  "kick-room-participants": kickRoomParticipantsCommand,
  "mute-room-participants": muteRoomParticipantsCommand,
  "unmute-room-participants": unmuteRoomParticipantsCommand,
  stt: sttCommand,
  "stt-providers": sttProvidersCommand,
  "list-phone-numbers": listPhoneNumbersCommand,
  "search-phone-numbers": searchPhoneNumbersCommand,
  "buy-phone-number": buyPhoneNumberCommand,
  "lookup-number": lookupNumberCommand,
  "ai-chat": aiChatCommand,
  "ai-anthropic-message": aiAnthropicMessageCommand,
  "ai-embed": aiEmbedCommand,
  "list-ai-assistants": listAiAssistantsCommand,
  "create-ai-assistant": createAiAssistantCommand,
  "get-ai-assistant": getAiAssistantCommand,
  "update-ai-assistant": updateAiAssistantCommand,
  "delete-ai-assistant": deleteAiAssistantCommand,
  "search-ai-collection": searchAiCollectionCommand,
  "chat-ai-assistant": chatAiAssistantCommand,
  "send-ai-assistant-sms": sendAiAssistantSmsCommand,
  "trigger-ai-assistant-test-run": triggerAiAssistantTestRunCommand,
  "get-ai-assistant-test-run": getAiAssistantTestRunCommand,
  "list-ai-assistant-test-runs": listAiAssistantTestRunsCommand,
  "test-ai-assistant-tool": testAiAssistantToolCommand,
  "list-sim-cards": listSimCardsCommand,
  "retrieve-sim-card": retrieveSimCardCommand,
  "enable-sim-card": enableSimCardCommand,
  "disable-sim-card": disableSimCardCommand,
  "retrieve-sim-card-action": retrieveSimCardActionCommand,
  "list-sim-card-actions": listSimCardActionsCommand,
  "web-search": webSearchCommand,
  "web-contents": webContentsCommand,
  "web-research": webResearchCommand,
  "web-research-status": webResearchStatusCommand,
  "storage-sql-query": storageSqlQueryCommand,
};

// Union of every flag any command reads (kept in sync with src/commands/*).
// Used ONLY to emit a non-blocking warning for unrecognized flags so a typo
// like `tts --output-typ base64` or `tts --ouput f.wav` doesn't silently no-op.
// This never fails the run — a missing entry just costs a spurious warning.
const KNOWN_FLAGS = new Set<string>([
  "about", "action", "action-type", "active", "actor", "administrative-area", "after", "agent-id",
  "agent-message", "ai-assistant-id", "alpha-sender", "amount", "answering-machine-detection",
  "api-key", "api-key-ref", "area-code", "arguments", "artifact-id", "assistant", "assistant-id",
  "attachment", "audio", "audio-url", "authorized-person", "background", "barge-in", "bcc",
  "beep-enabled", "billing-group-id", "billing-phone", "biz-opaque-callback-data",
  "black-threshold", "body", "bot-name", "brand-id", "brand-name", "bulk-sim-card-action-id",
  "bundle-id", "call-control-id", "call-control-id-2", "call-control-id-to-bridge", "call-leg-id",
  "call-session-id",
  "call-control-id-to-bridge-with", "camera-image", "campaign-id", "cancel", "carrier-name",
  "category", "cause", "cc", "channels", "clear-tags", "clear-tool-ids", "client-state", "code",
  "collection-id", "comfort-noise", "command-id", "company-name", "component", "conference-id",
  "conference-region",
  "confirm", "connection-id", "connection-name", "connector-name", "contacts", "contains",
  "content", "content-type", "context", "conversation-id", "conversation-metadata", "count",
  "country", "country-code", "country-code-in", "crawl-timeout", "create", "created-at", "currency", "custom-code",
  "customer-group-reference", "customer-name", "customer-reference", "daily-spend-limit",
  "daily-spend-limit-enabled", "deepfake-detection", "depth", "description",
  "destination-version-id", "destinations", "digits", "dimensions", "disable-cache",
  "display-name", "document", "document-id", "document-type", "dtmf-detection", "duration-minutes",
  "dynamic-variables", "dynamic-variables-webhook-timeout-ms", "dynamic-variables-webhook-url",
  "email", "emergency-address-id", "enable-messaging", "enabled", "encoding-format", "end-time", "ends-with",
  "exclude", "exclude-domain", "extension", "fallback-config", "fast-port-eligible", "features",
  "file-url", "filter", "filter-sim-card-group-id", "flag", "foc-after", "foc-before", "foc-date",
  "foc-datetime-requested", "force", "fork-rx", "fork-stream-type", "fork-tx", "format",
  "forward-of-message-id", "fqdn", "freshness", "from", "from-dir", "from-display-name",
  "from-name", "greeting", "group-id", "guided-choice", "guided-json", "headers",
  "health-webhook-url", "help", "help-message", "hold-audio-url", "hold-media-name", "host-messaging", "html",
  "html-body", "iccid", "id", "idempotency-key", "ignore-suppression", "image",
  "in-reply-to-message-id", "inbox-id", "include-domain", "include-participants", "inserted-at",
  "include-phone-numbers", "include-sim-card-group", "inline-css", "input", "instructions",
  "inter-digit-timeout-millis", "interactive", "interrupt", "invoice-document-id", "join-at",
  "json", "language", "limit", "livecrawl", "loa-document-id", "locality", "location", "max-age",
  "max-attempts", "max-items", "max-participants", "max-retries", "max-sources", "max-tokens",
  "mcp-server", "media-encryption", "media-name", "media-url", "meeting-session-id", "meeting-url",
  "message", "message-flow", "message-id", "messaging-profile-id", "metadata", "method",
  "mms-fall-back-to-sms", "mms-transcoding", "mobile-only", "model", "monochrome", "msisdn",
  "muted", "name", "name-contains", "national-destination-code", "network-id",
  "new-billing-phone-number", "number-pool-settings", "number-type", "numbers", "old-provider",
  "on-hold", "opt-in-method", "optin-message", "optout-message", "outbound-voice-profile-id",
  "output", "output-file", "output-type", "page-number", "page-size", "param", "parameters",
  "parent-support-key", "participant", "participants", "payload", "payment-method",
  "payment-token", "phone", "phone-number", "phone-number-id", "phone-numbers", "port-type",
  "pon", "ported-out-at", "portout-id", "preview-format", "privacy", "profile-name", "promote-to-main", "prompts", "provider", "quality",
  "query", "queue-name", "reaction", "reason", "record", "recording-id", "region",
  "remaining-numbers-action", "reply-to", "reply-to-all", "requirement-group-id",
  "research-effort", "resource-group-id", "response-format", "retrieval-type", "retry-on-timeout",
  "role", "room-id", "room-participant-id", "room-session-id", "route-to-mobile", "run-id", "rx",
  "safesearch", "sample-message", "sample-message-2", "sample1", "sample2", "sandbox-mode",
  "scheduled-at", "send-at", "service-level", "service-tier", "service-type",
  "should-create-conversation", "sim-card-group-id", "sim-card-id", "sip-address", "sip-call-id", "slug",
  "smart-encoding", "sole-prop", "sort", "source", "sources", "spid", "speak-on-enter", "sql",
  "start-conference-on-create", "start-message", "start-time", "starts-with", "status", "status-in", "sticker", "stop",
  "stop-message", "stop-sequence", "store-media", "store-preview", "stream", "stream-type",
  "subject", "submit", "summarize-on-end", "system", "t38-enabled", "tag", "tags", "task-id",
  "temperature", "template-id", "template-language", "template-name", "template-variables",
  "test-id", "text", "text-body", "text-type", "thinking", "time-limit-secs", "timeout",
  "timeout-millis", "timeout-secs", "to", "tool", "tool-choice", "tool-id", "tool-ids", "top-k",
  "top-p", "tracking-settings", "transaction-type", "transcription", "transcription-language",
  "transcription-model", "trigger-response", "ttl", "tx", "type", "url", "url-shortener-settings",
  "support-key", "usecase", "user", "v1-secret", "verification-id", "verify-profile-id", "version",
  "version-name", "vertical", "video", "voice", "waba-id", "wait-seconds", "wallet-key", "webhook",
  "webhook-api-version", "webhook-failover-url", "webhook-url", "webhook-url-method",
  "webhook-urls", "website", "whatsapp-message", "whispering", "whitelisted-destination",
  "whitelisted-destinations",
]);

// Commands that accept an arbitrary/generated flag surface, where an
// unknown-flag warning would produce false positives. These forward flags
// through to the Go CLI or maintain their own extensible flag lists.
const FLAG_WARN_EXEMPT_COMMANDS = new Set<string>(["call-control", "call-pay", "conference-control", "ai-chat"]);

// Detect a help request in FLAG position only. A help token counts when it is
// the command itself (`help`, `--help`, `-h`) or a standalone flag on a
// subcommand (`setup-voice --help`, `setup-voice -h`). It must NOT count when
// `-h`/`--help` is consumed as the VALUE of a value-taking flag (e.g.
// `send-sms --text "-h"`), so we walk argv the same way parseFlags does and skip
// consumed values — but only for flags that actually take a value. Boolean
// flags don't consume the next token, so `-h` after them is still help.
// Boolean flag detection is imported from utils/output.ts so this stays in sync
// with parseFlags, including command-scoped boolean flags.
function isHelpRequested(argv: string[]): boolean {
  const command = argv[0];
  if (command === "help" || command === "--help" || command === "-h") return true;
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") return true;
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      // Boolean flags never consume the next token — so a following
      // `-h`/`--help` is still seen as a help request, not swallowed as a
      // value (e.g. `setup-voice --force -h`, `setup-sms --json -h`).
      if (!isBooleanFlag(command ?? "help", key)) {
        const next = argv[i + 1];
        if (next && !next.startsWith("--")) i++; // skip value consumed by this flag
      }
    }
  }
  return false;
}

export async function run(argv: string[]): Promise<void> {
  const { command, flags, occurrences, helpRequested } = parseFlags(argv);

  // Version flag (AIF-333): `telnyx-agent --version` / `-V`.
  if (command === "--version" || command === "-V") {
    console.log(VERSION);
    return;
  }

  // Intercept help BEFORE dispatching to any command handler. setup-* handlers
  // make live API calls and purchase billable resources (numbers, connections)
  // before hitting an unknown flag, so a `--help`/`-h` request must never fall
  // through to a handler. See isHelpRequested for flag-position vs value nuance.
  if (!command || command === "help" || isHelpRequested(argv)) {
    console.log(HELP);
    return;
  }

  // Per-command help: `telnyx-agent tts --help` or `telnyx-agent tts -h`
  if (helpRequested) {
    console.log(HELP);
    return;
  }

  const handler = COMMANDS[command];
  if (!handler) {
    console.error(`Unknown command: ${command}\n`);
    console.log(HELP);
    process.exit(1);
  }

  // Non-blocking warning for unrecognized flags so typos don't silently no-op
  // (e.g. `tts --output-typ base64`). We never fail the run on this.
  // Skip commands that legitimately accept arbitrary/generated flags:
  //  - call-control forwards a large generated Go-CLI flag surface, incl. nested
  //    dotted flags (e.g. --assistant.model, --participant.name);
  //  - ai-webchat maintains its own extensible sampling-flag set.
  // Also always ignore dotted flags (nested payload builders) anywhere.
  if (!FLAG_WARN_EXEMPT_COMMANDS.has(command)) {
    const unknownFlags = Object.keys(flags).filter(
      (f) => f !== "_" && !f.includes(".") && !KNOWN_FLAGS.has(f),
    );
    if (unknownFlags.length > 0) {
      console.error(`⚠ Ignoring unrecognized flag${unknownFlags.length > 1 ? "s" : ""}: ${unknownFlags.map((f) => `--${f}`).join(", ")} (run \`telnyx-agent ${command} --help\`)`);
    }
  }

  await handler(flags, occurrences);
}
