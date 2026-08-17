/**
 * telnyx-agent capabilities — Self-describing API surface.
 */

import { outputJson } from "../utils/output.ts";

interface Capability {
  name: string;
  description: string;
  actions: string[];
}

const CAPABILITIES: Record<string, Capability[]> = {
  "📱 Messaging": [
    { name: "SMS / MMS", description: "Send, schedule, and manage text and multimedia messages and messaging profiles", actions: ["send_sms", "send_mms", "send_sms_from_number_pool", "send_sms_with_alphanumeric_sender", "send_group_mms", "schedule_sms", "check_sms_status", "cancel_scheduled_sms", "list_messaging_profiles", "create_messaging_profile", "get_messaging_profile", "update_messaging_profile", "delete_messaging_profile"] },
  ],
  "📧 Email": [
    { name: "Email", description: "Send or schedule outbound email and reply to or forward messages received by an email inbox", actions: ["send_email", "forward_email", "reply_email", "reply_all_email"] },
  ],
  "💬 RCS": [
    { name: "RCS Messaging", description: "Send RCS text messages and check recipient capabilities", actions: ["send_rcs_message", "check_rcs_capabilities"] },
  ],
  "📞 Voice": [
    { name: "Call Control", description: "Make and manage voice calls via SIP connections", actions: ["make_call", "list_connections", "list_voice_connections", "get_voice_connection", "list_active_calls", "answer_call", "hangup_call", "transfer_call", "send_dtmf", "start_recording", "stop_recording", "start_noise_suppression", "stop_noise_suppression", "speak_tts", "bridge_calls", "refer_call", "reject_call", "get_call_status", "answering_machine_detection", "deepfake_detection", "number_masking", "from_display_name", "time_limit", "media_encryption", "transcription", "gather", "stop_gather", "start_playback", "stop_playback", "start_transcription", "stop_transcription", "pause_recording", "resume_recording", "start_forking", "stop_forking", "start_siprec", "stop_siprec", "start_streaming", "stop_streaming", "enqueue", "leave_queue", "send_sip_info", "update_client_state", "add_ai_assistant_messages", "gather_using_ai", "gather_using_audio", "gather_using_speak", "join_ai_assistant", "start_ai_assistant", "stop_ai_assistant", "start_conversation_relay", "stop_conversation_relay", "switch_supervisor_role"] },
    { name: "Conferences", description: "Discover, create, inspect, and control multi-party conferences and participants", actions: ["create_conference", "get_conference", "list_conferences", "list_conference_participants", "update_conference_participant", "end_conference", "gather_conference_dtmf", "hold_conference_participants", "join_conference", "leave_conference", "mute_conference_participants", "play_conference_audio", "pause_conference_recording", "resume_conference_recording", "start_conference_recording", "stop_conference_recording", "send_conference_dtmf", "speak_to_conference", "stop_conference_audio", "unhold_conference_participants", "unmute_conference_participants"] },
  ],
  "🎥 Rooms": [
    { name: "Room Sessions", description: "Inspect room sessions and participants, end sessions, and moderate participant audio or presence", actions: ["list_room_sessions", "get_room_session", "list_room_participants", "get_room_participant", "end_room_session", "kick_room_participants", "mute_room_participants", "unmute_room_participants"] },
  ],
  "🔢 Numbers": [
    { name: "Phone Numbers", description: "Search, buy, and manage phone numbers", actions: ["list_phone_numbers", "search_phone_numbers", "buy_phone_number"] },
  ],
  "🤖 AI": [
    { name: "Chat Completions", description: "LLM inference via Telnyx AI (executable with telnyx-agent ai-chat)", actions: ["ai_chat"] },
    { name: "Anthropic Messages", description: "Anthropic-compatible LLM inference (executable with telnyx-agent ai-anthropic-message)", actions: ["ai_anthropic_message"] },
    { name: "Embeddings", description: "Generate text embeddings (executable with telnyx-agent ai-embed)", actions: ["ai_embed"] },
    { name: "Assistants", description: "Create and manage AI voice assistants", actions: ["list_ai_assistants", "create_ai_assistant", "get_ai_assistant", "update_ai_assistant", "delete_ai_assistant"] },
    { name: "AI Collections", description: "Retrieve and rank RAG document chunks from an AI collection", actions: ["search_ai_collection"] },
  ],
  "🌐 Web Intelligence": [
    { name: "Web Search", description: "Search the live web and retrieve clean page content", actions: ["web_search", "web_contents"] },
    { name: "Deep Research", description: "Synthesize cited answers from multiple web sources, synchronously or as a background task", actions: ["web_research", "get_web_research_status"] },
  ],
  "🔊 Text-to-Speech": [
    { name: "Speech Synthesis", description: "Generate audio from text via Telnyx and third-party TTS providers (telnyx, aws, azure, minimax, inworld, rime, resemble, fishaudio, humain, xai)", actions: ["generate_speech"] },
    { name: "Voice Catalog", description: "List available TTS voices, optionally filtered by provider (telnyx, aws, azure, minimax, inworld, rime, resemble, fishaudio, humain, xai)", actions: ["list_voices"] },
  ],
  "🎤 Speech-to-Text": [
    { name: "Transcription", description: "Transcribe hosted audio files to text via the OpenAI-compatible transcription endpoint, with model and language options", actions: ["ai_audio_transcribe"] },
    { name: "Providers", description: "List available speech-to-text providers and service types", actions: ["list_stt_providers"] },
  ],
  "📠 Fax": [
    { name: "Fax", description: "Send and manage inbound and outbound faxes", actions: ["send_fax", "check_fax_status", "cancel_fax", "refresh_fax_media_url"] },
  ],
  "📡 IoT": [
    { name: "SIM Cards", description: "List, inspect, enable, and disable IoT SIM cards and observe asynchronous actions", actions: ["list_sim_cards", "retrieve_sim_card", "enable_sim_card", "disable_sim_card", "retrieve_sim_card_action", "list_sim_card_actions"] },
  ],
  "🔍 Lookup": [
    { name: "Number Lookup", description: "Carrier and caller ID lookups", actions: ["lookup_number"] },
  ],
  "✅ Verify": [
    { name: "Phone Verification", description: "Send and verify phone codes (2FA)", actions: ["verify_phone", "verify_code", "create_verify_profile"] },
    { name: "Verification Send", description: "Trigger a verification via SMS, call, flashcall, or WhatsApp", actions: ["send_verification_sms", "send_verification_call", "send_verification_flashcall", "send_verification_whatsapp"] },
    { name: "Verification Check", description: "Submit a code for verification or check verification status", actions: ["verify_code", "check_verification_status"] },
  ],
  "🔐 Networking": [
    { name: "WireGuard VPN", description: "Create private networks and WireGuard tunnels", actions: ["create_network", "create_wireguard_interface", "create_wireguard_peer"] },
  ],
  "⚡ Edge Compute": [
    { name: "Edge Functions", description: "Pair Telnyx AI workflows with Telnyx Edge Compute. telnyx-agent now provides an executable handoff and prefers API-key auth for agent use when supported by telnyx-edge.", actions: ["see_guides_edge_compute"] },
    { name: "Deployment Handoff", description: "Use team-telnyx/ai for orchestration patterns and telnyx-edge for deploy, secrets, bindings, and lifecycle management.", actions: ["telnyx_edge_ship", "telnyx_edge_secrets", "telnyx_edge_bindings"] },
    { name: "Edge CLI Bridge", description: "Thin executable handoff from telnyx-agent into telnyx-edge for real MCP and webhook starting points.", actions: ["edge_doctor", "setup_edge_mcp", "setup_edge_webhook"] },
    { name: "Stateful Actors", description: "Per-entity stateful workloads on Edge Compute (Beta). Single-threaded, per-name, persisted. No external database needed for carts, sessions, call legs, chat rooms.", actions: ["telnyx_edge_new_func_actor", "telnyx_edge_actors_list", "telnyx_edge_types"] },
  ],
  "📋 10DLC Compliance": [
    { name: "10DLC Registration", description: "Register brands and campaigns for US A2P messaging", actions: ["create_10dlc_brand", "create_10dlc_campaign", "assign_10dlc_number"] },
  ],
  "💰 Account": [
    { name: "Balance", description: "Check account balance and billing", actions: ["get_balance"] },
  ],
  "💳 Payments": [
    { name: "x402 Crypto Payments", description: "Fund account with USDC on Base blockchain via x402 protocol", actions: ["get_payment_quote", "submit_payment"] },
  ],
  "🔄 Porting": [
    { name: "Number Porting", description: "Check portability, create and manage port-in orders, track requirements and documents", actions: ["check_portability", "list_porting_orders", "create_porting_order", "get_porting_order", "update_porting_order", "submit_porting_order", "cancel_porting_order", "list_porting_phone_numbers", "attach_porting_document", "list_porting_documents", "list_porting_requirements"] },
    { name: "Port-Out", description: "List and inspect port-out activity, reject or comment on port-out orders", actions: ["list_portout_orders", "get_portout_order", "list_portout_rejection_codes"] },
  ],
  "💬 WhatsApp": [
    { name: "WhatsApp Business", description: "Send text, template, media, interactive, location, reaction, sticker, contact, and video WhatsApp messages; manage business accounts, phone numbers, and templates", actions: ["setup_whatsapp", "send_whatsapp_message", "send_whatsapp_audio", "send_whatsapp_document", "send_whatsapp_image", "send_whatsapp_interactive", "send_whatsapp_location", "send_whatsapp_reaction", "send_whatsapp_sticker", "send_whatsapp_contacts", "send_whatsapp_video", "list_whatsapp_templates", "create_whatsapp_template", "verify_whatsapp_number", "manage_whatsapp_profile"] },
  ],
};

const COMPOSITE_COMMANDS = [
  { name: "telnyx-agent setup-sms", description: "Zero to SMS: creates messaging profile, buys number, assigns it" },
  { name: "telnyx-agent send-sms", description: "Send SMS/MMS from an E.164 number, alphanumeric sender, or messaging-profile number pool" },
  { name: "telnyx-agent send-sms", description: "Send an SMS or MMS message (pass --media-url to send MMS)" },
  { name: "telnyx-agent email-send", description: "Send or schedule outbound email with multiple recipients, bodies, templates, and attachments" },
  { name: "telnyx-agent email-forward", description: "Forward an email inbox message to caller-supplied recipients" },
  { name: "telnyx-agent email-reply", description: "Reply to the Reply-To or From address of an email inbox message" },
  { name: "telnyx-agent email-reply-all", description: "Reply to all de-duplicated recipients of an email inbox message" },
  { name: "telnyx-agent list-messaging-profiles", description: "List messaging profiles with name filters and pagination" },
  { name: "telnyx-agent create-messaging-profile", description: "Create a messaging profile with explicit destination controls" },
  { name: "telnyx-agent get-messaging-profile", description: "Retrieve one messaging profile by ID" },
  { name: "telnyx-agent update-messaging-profile", description: "Update one or more fields on a messaging profile" },
  { name: "telnyx-agent delete-messaging-profile", description: "Delete a messaging profile by ID with explicit confirmation" },
  { name: "telnyx-agent fax-send", description: "Send a fax using a fax application connection and a media URL or uploaded media name" },
  { name: "telnyx-agent fax-status", description: "Retrieve the latest status and useful details for one fax" },
  { name: "telnyx-agent fax-cancel", description: "Cancel an outbound fax that is queued, processed, originated, or sending" },
  { name: "telnyx-agent fax-refresh", description: "Refresh the expired temporary media URL for an inbound fax" },
  { name: "telnyx-agent send-group-mms", description: "Send a group MMS to multiple recipients (--to comma-separated E.164 numbers)" },
  { name: "telnyx-agent schedule-sms", description: "Schedule an SMS for future delivery at a given ISO 8601 time" },
  { name: "telnyx-agent sms-status", description: "Check SMS delivery status, or cancel a scheduled message with --cancel" },
  { name: "telnyx-agent rcs-send", description: "Send a text message from an RCS agent" },
  { name: "telnyx-agent rcs-capabilities", description: "Check the RCS features available for a recipient" },
  { name: "telnyx-agent setup-voice", description: "Zero to voice: creates SIP connection, buys number, assigns it" },
  { name: "telnyx-agent setup-iot", description: "Zero to IoT: lists SIMs, creates group, activates SIM" },
  { name: "telnyx-agent list-sim-cards", description: "List IoT SIM cards with filters and pagination" },
  { name: "telnyx-agent retrieve-sim-card", description: "Retrieve one IoT SIM card by ID" },
  { name: "telnyx-agent enable-sim-card", description: "Request asynchronous enablement of an IoT SIM card" },
  { name: "telnyx-agent disable-sim-card", description: "Request asynchronous disablement of an IoT SIM card" },
  { name: "telnyx-agent retrieve-sim-card-action", description: "Retrieve the status and details of an asynchronous SIM card action" },
  { name: "telnyx-agent list-sim-card-actions", description: "List asynchronous SIM card actions with status, type, SIM, bulk-action, and pagination filters" },
  { name: "telnyx-agent setup-ai", description: "Zero to AI assistant: creates assistant, buys number, wires them together" },
  { name: "telnyx-agent ai-chat", description: "Create an OpenAI-compatible chat completion via Telnyx AI inference" },
  { name: "telnyx-agent ai-anthropic-message", description: "Create an Anthropic-compatible message response via Telnyx AI inference" },
  { name: "telnyx-agent ai-embed", description: "Create OpenAI-compatible embeddings for text or a JSON array of texts" },
  { name: "telnyx-agent list-ai-assistants", description: "List AI assistant configurations" },
  { name: "telnyx-agent create-ai-assistant", description: "Create an AI assistant from a name, instructions, and optional model or voice settings" },
  { name: "telnyx-agent get-ai-assistant", description: "Retrieve one AI assistant by ID" },
  { name: "telnyx-agent update-ai-assistant", description: "Update an AI assistant and create a new version" },
  { name: "telnyx-agent delete-ai-assistant", description: "Delete an AI assistant with explicit confirmation" },
  { name: "telnyx-agent search-ai-collection", description: "Search ranked RAG document chunks in an AI collection, or omit --query to list its document catalog" },
  { name: "telnyx-agent web-search", description: "Search the web with domain, country, freshness, safe-search, and live-crawl controls" },
  { name: "telnyx-agent web-contents", description: "Retrieve clean HTML, Markdown, or metadata for up to 20 URLs" },
  { name: "telnyx-agent web-research", description: "Start deep web research and return an answer or asynchronous task ID" },
  { name: "telnyx-agent web-research-status", description: "Retrieve the status, answer, and citations for a background research task" },
  { name: "telnyx-agent setup-wireguard", description: "Zero to VPN: creates network, WireGuard interface, peer — outputs ready-to-use WG config" },
  { name: "telnyx-edge ship", description: "Deploy an Edge Compute function with the dedicated telnyx-edge CLI (referenced by the Edge Compute guide)" },
  { name: "telnyx-agent edge-doctor", description: "Validate Edge Compute handoff prerequisites and point to the next concrete telnyx-edge steps" },
  { name: "telnyx-agent setup-edge-mcp", description: "Concrete MCP-on-Edge handoff: points to the real example and deploy command via telnyx-edge" },
  { name: "telnyx-agent setup-edge-webhook", description: "Concrete webhook-on-Edge handoff: points to the real example and deploy command via telnyx-edge" },
  { name: "telnyx-agent setup-verify", description: "Zero to verification: creates a verify profile (no number bought — OTPs use Telnyx's managed pool) — outputs test command" },
  { name: "telnyx-agent verify-send", description: "Trigger a verification via SMS, call, flashcall, or WhatsApp — returns verification ID" },
  { name: "telnyx-agent verify-check", description: "Submit a code for verification (--code) or retrieve the current verification status" },
  { name: "telnyx-agent setup-10dlc", description: "Zero to A2P: creates 10DLC brand, campaign, optional number assignment" },
  { name: "telnyx-agent setup-porting", description: "Zero to porting: checks portability, creates porting order, lists requirements, optionally submits" },
  { name: "telnyx-agent list-porting-orders", description: "List port-in orders with core filters, phone-number inclusion, sorting, and pagination" },
  { name: "telnyx-agent get-porting-order", description: "Retrieve one porting order by ID" },
  { name: "telnyx-agent update-porting-order", description: "Update references, FOC settings, documents, messaging, and post-port number configuration" },
  { name: "telnyx-agent submit-porting-order", description: "Confirm and submit a draft porting order" },
  { name: "telnyx-agent cancel-porting-order", description: "Cancel a porting order after explicit --confirm acknowledgement" },
  { name: "telnyx-agent attach-porting-document", description: "Attach an existing Telnyx document resource to a porting order" },
  { name: "telnyx-agent list-porting-documents", description: "List documents attached to a porting order with type filters and pagination" },
  { name: "telnyx-agent tts", description: "Generate speech from text (text-to-speech) across multiple providers, returning base64-encoded audio data" },
  { name: "telnyx-agent tts-voices", description: "List available TTS voices, optionally filtered by provider (telnyx, aws, azure, minimax, inworld, rime, resemble, fishaudio, humain, xai)" },
  { name: "telnyx-agent setup-whatsapp", description: "Zero to WhatsApp: lists WABA, buys number, initializes & verifies, sets profile" },
  { name: "telnyx-agent whatsapp-send", description: "Send text, template, media, interactive, location, reaction, stickers, contacts, or video over WhatsApp" },
  { name: "telnyx-agent stt", description: "Transcribe audio to text (speech-to-text) — accepts an audio URL and returns the transcript with optional language, model, and keyword biasing" },
  { name: "telnyx-agent stt", description: "Transcribe audio to text (speech-to-text) — accepts a hosted audio file URL and returns the transcript with optional model and language selection" },
  { name: "telnyx-agent stt-providers", description: "List available speech-to-text providers, optionally filtered by provider name or service type" },
  { name: "telnyx-agent status", description: "Account health overview — balance, numbers, profiles, connections" },
  { name: "telnyx-agent capabilities", description: "This command — lists all available API capabilities" },
  { name: "telnyx-agent call-dial", description: "Make an outbound call via Call Control (AMD, deepfake detection, recording optional)" },
  { name: "telnyx-agent call-control", description: "Call Control actions: answer, hangup, transfer, DTMF, recording, noise suppression, speak (TTS), bridge, refer, reject, gather, playback, transcription, forking, siprec, streaming, enqueue, send-sip-info, update-client-state, AI assistant lifecycle/messages/gather/join, Conversation Relay, supervisor roles" },
  { name: "telnyx-agent call-status", description: "Get the status of a call by call-control-id" },
  { name: "telnyx-agent create-conference", description: "Create a multi-party conference from an active Call Control leg" },
  { name: "telnyx-agent get-conference", description: "Retrieve one conference by ID" },
  { name: "telnyx-agent list-conferences", description: "Discover conferences with name/status filters and pagination" },
  { name: "telnyx-agent list-conference-participants", description: "List and filter participants in a conference" },
  { name: "telnyx-agent conference-control", description: "Control conference membership, mute/hold state, media, DTMF, recording, supervisor roles, and lifecycle" },
  { name: "telnyx-agent list-voice-connections", description: "List voice connections across connection types with filters and pagination" },
  { name: "telnyx-agent get-voice-connection", description: "Retrieve the high-level details of one voice connection" },
  { name: "telnyx-agent list-active-calls", description: "List active calls for a voice connection with pagination" },
  { name: "telnyx-agent list-room-sessions", description: "List room sessions with room, active-state, participant, and pagination controls" },
  { name: "telnyx-agent get-room-session", description: "Retrieve one room session, optionally including its participants" },
  { name: "telnyx-agent list-room-participants", description: "List participants in one room session with context and pagination controls" },
  { name: "telnyx-agent get-room-participant", description: "Retrieve one room participant by ID" },
  { name: "telnyx-agent end-room-session", description: "End a room session and remove all of its current participants" },
  { name: "telnyx-agent kick-room-participants", description: "Remove selected participants from a room session" },
  { name: "telnyx-agent mute-room-participants", description: "Mute selected participants in a room session" },
  { name: "telnyx-agent unmute-room-participants", description: "Unmute selected participants in a room session" },
  { name: "telnyx-agent list-phone-numbers", description: "List account-owned phone numbers with core filters and pagination" },
  { name: "telnyx-agent search-phone-numbers", description: "Search available phone numbers by country, type, features, location, or number pattern" },
  { name: "telnyx-agent buy-phone-number", description: "Purchase one phone number and optionally assign its connection or messaging profile" },
  { name: "telnyx-agent lookup-number", description: "Look up carrier or caller-name information for an E.164 phone number" },
];

export async function capabilitiesCommand(flags: Record<string, string | boolean>): Promise<void> {
  const jsonOutput = flags.json === true;

  if (jsonOutput) {
    outputJson({
      api_capabilities: CAPABILITIES,
      composite_commands: COMPOSITE_COMMANDS,
      total_tools: Object.values(CAPABILITIES).flat().reduce((sum, c) => sum + c.actions.length, 0),
    });
    return;
  }

  console.log("\n🔧 Telnyx Agent Toolkit — Capabilities");
  console.log("=======================================\n");

  console.log("📦 Composite Commands (one command, full stack):\n");
  for (const cmd of COMPOSITE_COMMANDS) {
    console.log(`  ${cmd.name}`);
    console.log(`    ${cmd.description}\n`);
  }

  console.log("─".repeat(50));
  console.log("\n🛠️  API Capabilities:\n");

  for (const [category, capabilities] of Object.entries(CAPABILITIES)) {
    console.log(`  ${category}`);
    for (const cap of capabilities) {
      console.log(`    ${cap.name} — ${cap.description}`);
      console.log(`      Tools: ${cap.actions.join(", ")}`);
    }
    console.log();
  }

  const total = Object.values(CAPABILITIES).flat().reduce((sum, c) => sum + c.actions.length, 0);
  console.log(`Total: ${total} API tools across ${Object.keys(CAPABILITIES).length} categories\n`);
}
