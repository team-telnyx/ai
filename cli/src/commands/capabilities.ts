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
    { name: "SMS / MMS", description: "Send, schedule, and manage text and multimedia messages", actions: ["send_sms", "send_mms", "send_group_mms", "schedule_sms", "check_sms_status", "cancel_scheduled_sms", "list_messaging_profiles", "create_messaging_profile"] },
  ],
  "📞 Voice": [
    { name: "Call Control", description: "Make and manage voice calls via SIP connections", actions: ["make_call", "list_connections", "answer_call", "hangup_call", "transfer_call", "send_dtmf", "start_recording", "stop_recording", "start_noise_suppression", "stop_noise_suppression", "speak_tts", "bridge_calls", "refer_call", "reject_call", "get_call_status", "answering_machine_detection", "deepfake_detection", "number_masking", "from_display_name", "time_limit", "media_encryption", "transcription", "gather", "stop_gather", "start_playback", "stop_playback", "start_transcription", "stop_transcription", "pause_recording", "resume_recording", "start_forking", "stop_forking", "start_siprec", "stop_siprec", "start_streaming", "stop_streaming", "enqueue", "leave_queue", "send_sip_info", "update_client_state"] },
  ],
  "🔢 Numbers": [
    { name: "Phone Numbers", description: "Search, buy, and manage phone numbers", actions: ["list_phone_numbers", "search_phone_numbers", "buy_phone_number"] },
  ],
  "🤖 AI": [
    { name: "Chat Completions", description: "LLM inference via Telnyx AI", actions: ["ai_chat"] },
    { name: "Embeddings", description: "Generate text embeddings", actions: ["ai_embed"] },
    { name: "Assistants", description: "Create and manage AI voice assistants", actions: ["list_ai_assistants", "create_ai_assistant"] },
  ],
  "🔊 Text-to-Speech": [
    { name: "Speech Synthesis", description: "Generate audio from text via Telnyx and third-party TTS providers (telnyx, aws, azure, elevenlabs, minimax, resemble, rime, xai)", actions: ["generate_speech"] },
    { name: "Voice Catalog", description: "List available TTS voices, optionally filtered by provider (telnyx, aws, azure, elevenlabs, minimax, resemble, rime, xai)", actions: ["list_voices"] },
  ],
  "📠 Fax": [
    { name: "Fax", description: "Send faxes programmatically", actions: ["send_fax"] },
  ],
  "📡 IoT": [
    { name: "SIM Cards", description: "Manage IoT SIM cards and connectivity", actions: ["list_sim_cards"] },
  ],
  "🔍 Lookup": [
    { name: "Number Lookup", description: "Carrier and caller ID lookups", actions: ["lookup_number"] },
  ],
  "✅ Verify": [
    { name: "Phone Verification", description: "Send and verify phone codes (2FA)", actions: ["verify_phone", "verify_code", "create_verify_profile"] },
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
    { name: "Number Porting", description: "Check portability, create and manage port-in orders, track requirements and documents", actions: ["check_portability", "list_porting_orders", "create_porting_order", "get_porting_order", "submit_porting_order", "cancel_porting_order", "list_porting_phone_numbers", "upload_porting_document", "list_porting_requirements"] },
    { name: "Port-Out", description: "List and inspect port-out activity, reject or comment on port-out orders", actions: ["list_portout_orders", "get_portout_order", "list_portout_rejection_codes"] },
  ],
  "💬 WhatsApp": [
    { name: "WhatsApp Business", description: "Send WhatsApp messages, manage business accounts, phone numbers, and templates", actions: ["setup_whatsapp", "send_whatsapp_message", "list_whatsapp_templates", "create_whatsapp_template", "verify_whatsapp_number", "manage_whatsapp_profile"] },
  ],
};

const COMPOSITE_COMMANDS = [
  { name: "telnyx-agent setup-sms", description: "Zero to SMS: creates messaging profile, buys number, assigns it" },
  { name: "telnyx-agent send-sms", description: "Send an SMS or MMS message (pass --media-url to send MMS)" },
  { name: "telnyx-agent send-group-mms", description: "Send a group MMS to multiple recipients (--to comma-separated E.164 numbers)" },
  { name: "telnyx-agent schedule-sms", description: "Schedule an SMS for future delivery at a given ISO 8601 time" },
  { name: "telnyx-agent sms-status", description: "Check SMS delivery status, or cancel a scheduled message with --cancel" },
  { name: "telnyx-agent setup-voice", description: "Zero to voice: creates SIP connection, buys number, assigns it" },
  { name: "telnyx-agent setup-iot", description: "Zero to IoT: lists SIMs, creates group, activates SIM" },
  { name: "telnyx-agent setup-ai", description: "Zero to AI assistant: creates assistant, buys number, wires them together" },
  { name: "telnyx-agent setup-wireguard", description: "Zero to VPN: creates network, WireGuard interface, peer — outputs ready-to-use WG config" },
  { name: "telnyx-edge ship", description: "Deploy an Edge Compute function with the dedicated telnyx-edge CLI (referenced by the Edge Compute guide)" },
  { name: "telnyx-agent edge-doctor", description: "Validate Edge Compute handoff prerequisites and point to the next concrete telnyx-edge steps" },
  { name: "telnyx-agent setup-edge-mcp", description: "Concrete MCP-on-Edge handoff: points to the real example and deploy command via telnyx-edge" },
  { name: "telnyx-agent setup-edge-webhook", description: "Concrete webhook-on-Edge handoff: points to the real example and deploy command via telnyx-edge" },
  { name: "telnyx-agent setup-verify", description: "Zero to verification: creates verify profile, buys number — outputs test command" },
  { name: "telnyx-agent setup-10dlc", description: "Zero to A2P: creates 10DLC brand, campaign, optional number assignment" },
  { name: "telnyx-agent setup-porting", description: "Zero to porting: checks portability, creates porting order, lists requirements, optionally submits" },
  { name: "telnyx-agent tts", description: "Generate speech from text (text-to-speech) across multiple providers, returning base64-encoded audio data" },
  { name: "telnyx-agent tts-voices", description: "List available TTS voices, optionally filtered by provider (telnyx, aws, azure, elevenlabs, minimax, resemble, rime, xai)" },
  { name: "telnyx-agent setup-whatsapp", description: "Zero to WhatsApp: lists WABA, buys number, initializes & verifies, sets profile" },
  { name: "telnyx-agent status", description: "Account health overview — balance, numbers, profiles, connections" },
  { name: "telnyx-agent capabilities", description: "This command — lists all available API capabilities" },
  { name: "telnyx-agent call-dial", description: "Make an outbound call via Call Control (AMD, deepfake detection, recording optional)" },
  { name: "telnyx-agent call-control", description: "Call Control actions: answer, hangup, transfer, DTMF, recording, noise suppression, speak (TTS), bridge, refer, reject, gather, playback, transcription, forking, siprec, streaming, enqueue, send-sip-info, update-client-state" },
  { name: "telnyx-agent call-status", description: "Get the status of a call by call-control-id" },
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
