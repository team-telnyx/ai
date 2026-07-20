import assert from "node:assert/strict";

import type { TelnyxAPIClient } from "../src/shared/api-client.js";
import { TOOL_DEFINITIONS, PERMISSION_MAP } from "../src/shared/constants.js";
import { ToolkitCore } from "../src/shared/toolkit-core.js";

const TOOL_NAMES = [
  "send_rcs_message",
  "check_rcs_capabilities",
  "add_ai_assistant_messages",
  "gather_using_ai",
  "gather_using_audio",
  "gather_using_speak",
  "join_ai_assistant",
  "start_ai_assistant",
  "stop_ai_assistant",
  "start_conversation_relay",
  "stop_conversation_relay",
  "switch_supervisor_role",
] as const;

const CALL_ACTIONS = TOOL_NAMES.slice(2);

const GOOGLE_TRANSCRIPTION_LANGUAGES = [
  "af", "sq", "am", "ar", "hy", "az", "eu", "bn", "bs", "bg", "my", "ca", "yue", "zh",
  "hr", "cs", "da", "nl", "en", "et", "fil", "fi", "fr", "gl", "ka", "de", "el", "gu",
  "iw", "hi", "hu", "is", "id", "it", "ja", "jv", "kn", "kk", "km", "ko", "lo", "lv",
  "lt", "mk", "ms", "ml", "mr", "mn", "ne", "no", "fa", "pl", "pt", "pa", "ro", "ru",
  "rw", "sr", "si", "sk", "sl", "ss", "st", "es", "su", "sw", "sv", "ta", "te", "th",
  "tn", "tr", "ts", "uk", "ur", "uz", "ve", "vi", "xh", "zu",
];

const CONVERSATION_RELAY_TRANSCRIPTION_ENGINES = [
  "Google", "Telnyx", "Deepgram", "Azure", "xAI", "AssemblyAI", "Speechmatics", "Soniox", "A", "B",
];

const expectedProperties: Record<(typeof TOOL_NAMES)[number], string[]> = {
  send_rcs_message: [
    "agent_id",
    "to",
    "messaging_profile_id",
    "agent_message",
    "mms_fallback",
    "sms_fallback",
    "type",
    "webhook_url",
  ],
  check_rcs_capabilities: ["agent_id", "phone_number"],
  add_ai_assistant_messages: ["call_control_id", "client_state", "command_id", "messages"],
  gather_using_ai: [
    "call_control_id",
    "parameters",
    "assistant",
    "client_state",
    "command_id",
    "gather_ended_speech",
    "greeting",
    "interruption_settings",
    "language",
    "message_history",
    "send_message_history_updates",
    "send_partial_results",
    "transcription",
    "user_response_timeout_ms",
    "voice",
    "voice_settings",
  ],
  gather_using_audio: [
    "call_control_id",
    "audio_url",
    "client_state",
    "command_id",
    "inter_digit_timeout_millis",
    "invalid_audio_url",
    "invalid_media_name",
    "maximum_digits",
    "maximum_tries",
    "media_name",
    "minimum_digits",
    "terminating_digit",
    "timeout_millis",
    "valid_digits",
  ],
  gather_using_speak: [
    "call_control_id",
    "payload",
    "voice",
    "client_state",
    "command_id",
    "inter_digit_timeout_millis",
    "invalid_payload",
    "language",
    "maximum_digits",
    "maximum_tries",
    "minimum_digits",
    "payload_type",
    "service_level",
    "terminating_digit",
    "timeout_millis",
    "valid_digits",
    "voice_settings",
  ],
  join_ai_assistant: ["call_control_id", "conversation_id", "participant", "client_state", "command_id"],
  start_ai_assistant: [
    "call_control_id",
    "assistant",
    "client_state",
    "command_id",
    "greeting",
    "interruption_settings",
    "message_history",
    "participants",
    "send_message_history_updates",
    "transcription",
    "voice",
    "voice_settings",
  ],
  stop_ai_assistant: ["call_control_id", "client_state", "command_id"],
  start_conversation_relay: [
    "call_control_id",
    "assistant",
    "client_state",
    "command_id",
    "conversation_relay_dtmf_detection",
    "conversation_relay_settings",
    "conversation_relay_url",
    "custom_parameters",
    "dtmf_detection",
    "greeting",
    "interruptible",
    "interruptible_greeting",
    "interruption_settings",
    "language",
    "languages",
    "provider",
    "structured_provider",
    "transcription",
    "transcription_engine",
    "transcription_engine_config",
    "tts_provider",
    "url",
    "voice",
    "voice_settings",
  ],
  stop_conversation_relay: ["call_control_id", "client_state", "command_id"],
  switch_supervisor_role: ["call_control_id", "role"],
};

const expectedRequired: Record<(typeof TOOL_NAMES)[number], string[]> = {
  send_rcs_message: ["agent_id", "to", "messaging_profile_id", "agent_message", "type"],
  check_rcs_capabilities: ["agent_id", "phone_number"],
  add_ai_assistant_messages: ["call_control_id"],
  gather_using_ai: ["call_control_id", "parameters"],
  gather_using_audio: ["call_control_id"],
  gather_using_speak: ["call_control_id", "payload", "voice"],
  join_ai_assistant: ["call_control_id", "conversation_id", "participant"],
  start_ai_assistant: ["call_control_id"],
  stop_ai_assistant: ["call_control_id"],
  start_conversation_relay: ["call_control_id"],
  stop_conversation_relay: ["call_control_id"],
  switch_supervisor_role: ["call_control_id", "role"],
};

function assertDefinitions(): void {
  assert.equal(Object.keys(TOOL_DEFINITIONS).length, 211);

  for (const name of TOOL_NAMES) {
    const definition = TOOL_DEFINITIONS[name];
    assert.ok(definition, `${name} should be defined`);
    assert.equal(definition.name, name);
    assert.equal(definition.category, name.includes("rcs") ? "messaging" : "voice");
    assert.deepEqual(Object.keys(definition.parameters.properties), expectedProperties[name]);
    assert.deepEqual(definition.parameters.required, expectedRequired[name]);
  }

  assert.equal(TOOL_DEFINITIONS.send_rcs_message.method, "POST");
  assert.equal(TOOL_DEFINITIONS.send_rcs_message.path, "/messages/rcs");
  assert.equal(TOOL_DEFINITIONS.check_rcs_capabilities.method, "GET");
  assert.equal(
    TOOL_DEFINITIONS.check_rcs_capabilities.path,
    "/messaging/rcs/capabilities/{agent_id}/{phone_number}",
  );

  for (const action of CALL_ACTIONS) {
    assert.equal(TOOL_DEFINITIONS[action].method, "POST");
  }

  assert.equal(TOOL_DEFINITIONS.add_ai_assistant_messages.path, "/calls/{call_control_id}/actions/ai_assistant_add_messages");
  assert.equal(TOOL_DEFINITIONS.gather_using_ai.path, "/calls/{call_control_id}/actions/gather_using_ai");
  assert.equal(TOOL_DEFINITIONS.gather_using_audio.path, "/calls/{call_control_id}/actions/gather_using_audio");
  assert.equal(TOOL_DEFINITIONS.gather_using_speak.path, "/calls/{call_control_id}/actions/gather_using_speak");
  assert.equal(TOOL_DEFINITIONS.join_ai_assistant.path, "/calls/{call_control_id}/actions/ai_assistant_join");
  assert.equal(TOOL_DEFINITIONS.start_ai_assistant.path, "/calls/{call_control_id}/actions/ai_assistant_start");
  assert.equal(TOOL_DEFINITIONS.stop_ai_assistant.path, "/calls/{call_control_id}/actions/ai_assistant_stop");
  assert.equal(TOOL_DEFINITIONS.start_conversation_relay.path, "/calls/{call_control_id}/actions/conversation_relay_start");
  assert.equal(TOOL_DEFINITIONS.stop_conversation_relay.path, "/calls/{call_control_id}/actions/conversation_relay_stop");
  assert.equal(TOOL_DEFINITIONS.switch_supervisor_role.path, "/calls/{call_control_id}/actions/switch_supervisor_role");

  assert.deepEqual(TOOL_DEFINITIONS.send_rcs_message.parameters.properties.type.enum, ["RCS"]);
  assert.deepEqual(TOOL_DEFINITIONS.gather_using_speak.parameters.properties.payload_type.enum, ["text", "ssml"]);
  assert.deepEqual(TOOL_DEFINITIONS.gather_using_speak.parameters.properties.service_level.enum, ["basic", "premium"]);
  assert.deepEqual(TOOL_DEFINITIONS.switch_supervisor_role.parameters.properties.role.enum, ["barge", "whisper", "monitor"]);

  const gatherLanguage = TOOL_DEFINITIONS.gather_using_ai.parameters.properties.language;
  assert.equal(gatherLanguage.type, "string");
  assert.deepEqual(gatherLanguage.enum, GOOGLE_TRANSCRIPTION_LANGUAGES);

  const relay = TOOL_DEFINITIONS.start_conversation_relay.parameters;
  assert.deepEqual(relay.anyOf, [
    { required: ["url"] },
    { required: ["conversation_relay_url"] },
    { required: ["conversation_relay_settings"] },
  ]);
  assert.equal(relay.properties.language.type, "string");
  assert.deepEqual(relay.properties.interruptible.enum, ["none", "any", "speech", "dtmf"]);
  assert.deepEqual(relay.properties.interruptible_greeting.enum, ["none", "any", "speech", "dtmf"]);
  assert.deepEqual(relay.properties.transcription_engine.enum, CONVERSATION_RELAY_TRANSCRIPTION_ENGINES);
  assert.equal(relay.properties.languages.type, "array");
  assert.deepEqual(relay.properties.languages.items, {
    type: "object",
    properties: {
      language: { type: "string" },
      speech_model: { type: "string" },
      transcription_engine: { type: "string", enum: CONVERSATION_RELAY_TRANSCRIPTION_ENGINES },
      transcription_engine_config: { type: "object" },
      transcription_provider: { type: "string" },
      tts_provider: { type: "string" },
      voice: { type: "string" },
      voice_settings: { type: "object" },
    },
    required: ["language"],
  });

  for (const name of TOOL_NAMES) {
    const permissionCategory = name.includes("rcs") ? "messaging" : "voice";
    assert.equal(PERMISSION_MAP[`${permissionCategory}.${name}`], name);
  }
}

interface RequestRecord {
  method: "GET" | "POST";
  path: string;
  value?: Record<string, unknown>;
}

class MockClient {
  readonly apiKey = "test-key";
  readonly requests: RequestRecord[] = [];
  response: Record<string, unknown> = { data: { result: "ok" } };

  async get(path: string, params?: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.requests.push({ method: "GET", path, value: params });
    return this.response;
  }

  async post(path: string, body?: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.requests.push({ method: "POST", path, value: body });
    return this.response;
  }
}

async function assertExecution(): Promise<void> {
  const client = new MockClient();
  const core = new ToolkitCore(client as unknown as TelnyxAPIClient);

  const agentMessage = { content_message: { text: "Hello RCS" }, ttl: "300s" };
  const rcsBody = {
    agent_id: "agent-1",
    to: "+15550001111",
    messaging_profile_id: "profile-1",
    agent_message: agentMessage,
    mms_fallback: { from: "+15550002222", media_urls: ["https://example.com/image.png"] },
    sms_fallback: { from: "+15550002222", text: "fallback" },
    type: "RCS",
    webhook_url: "https://example.com/events",
    ignored_null: null,
  };
  await core.runTool("send_rcs_message", rcsBody);
  assert.deepEqual(client.requests.shift(), {
    method: "POST",
    path: "/messages/rcs",
    value: {
      agent_id: "agent-1",
      to: "+15550001111",
      messaging_profile_id: "profile-1",
      agent_message: agentMessage,
      mms_fallback: rcsBody.mms_fallback,
      sms_fallback: rcsBody.sms_fallback,
      type: "RCS",
      webhook_url: "https://example.com/events",
    },
  });

  client.response = { data: { features: null, status: "RCS unavailable" } };
  const unavailable = JSON.parse(await core.runTool("check_rcs_capabilities", {
    agent_id: "agent-one",
    phone_number: "+15550001111",
  }));
  assert.deepEqual(client.requests.shift(), {
    method: "GET",
    path: "/messaging/rcs/capabilities/agent-one/+15550001111",
    value: undefined,
  });
  assert.deepEqual(unavailable.data, {
    features: null,
    status: "RCS unavailable",
  });

  client.response = { data: { features: [], status: "Success" } };
  const empty = JSON.parse(await core.runTool("check_rcs_capabilities", {
    agent_id: "agent-1",
    phone_number: "+15550001111",
  }));
  assert.deepEqual(empty.data, {
    features: [],
    status: "Success",
  });
  client.requests.shift();

  const cases: Array<{
    name: (typeof CALL_ACTIONS)[number];
    args: Record<string, unknown>;
    body: Record<string, unknown>;
  }> = [
    {
      name: "add_ai_assistant_messages",
      args: { call_control_id: "call-1", messages: [{ role: "user", content: "hello" }], client_state: "state", command_id: "cmd" },
      body: { messages: [{ role: "user", content: "hello" }], client_state: "state", command_id: "cmd" },
    },
    {
      name: "gather_using_ai",
      args: { call_control_id: "call-1", parameters: { type: "object", properties: { name: { type: "string" } } }, assistant: { model: "openai/gpt-4o" }, language: "en", message_history: [{ role: "user", content: "Hi" }], send_partial_results: true },
      body: { parameters: { type: "object", properties: { name: { type: "string" } } }, assistant: { model: "openai/gpt-4o" }, language: "en", message_history: [{ role: "user", content: "Hi" }], send_partial_results: true },
    },
    {
      name: "gather_using_audio",
      args: { call_control_id: "call-1", audio_url: "https://example.com/menu.wav", maximum_digits: 4, valid_digits: "1234" },
      body: { audio_url: "https://example.com/menu.wav", maximum_digits: 4, valid_digits: "1234" },
    },
    {
      name: "gather_using_speak",
      args: { call_control_id: "call-1", payload: "Enter PIN", voice: "Telnyx.KokoroTTS.af", voice_settings: { speed: 1.1 } },
      body: { payload: "Enter PIN", voice: "Telnyx.KokoroTTS.af", voice_settings: { speed: 1.1 } },
    },
    {
      name: "join_ai_assistant",
      args: { call_control_id: "call-1", conversation_id: "conv-1", participant: { id: "call-2", role: "user" } },
      body: { conversation_id: "conv-1", participant: { id: "call-2", role: "user" } },
    },
    {
      name: "start_ai_assistant",
      args: { call_control_id: "call-1", assistant: { id: "assistant-1", dynamic_variables: { customer: "Ada" } }, participants: [{ id: "call-1", role: "user" }], message_history: [{ role: "assistant", content: "Hello" }] },
      body: { assistant: { id: "assistant-1", dynamic_variables: { customer: "Ada" } }, participants: [{ id: "call-1", role: "user" }], message_history: [{ role: "assistant", content: "Hello" }] },
    },
    {
      name: "stop_ai_assistant",
      args: { call_control_id: "call-1", command_id: "stop-ai" },
      body: { command_id: "stop-ai" },
    },
    {
      name: "start_conversation_relay",
      args: { call_control_id: "call-1", conversation_relay_settings: { url: "wss://nested.example.com" }, custom_parameters: { account: "42" }, language: "en-US", languages: [{ language: "en-US", transcription_engine: "Deepgram", transcription_engine_config: { transcription_model: "deepgram/nova-3" }, tts_provider: "telnyx", voice: "Telnyx.KokoroTTS.af" }], dtmf_detection: true, interruptible: "speech", interruptible_greeting: "dtmf", transcription_engine: "Deepgram" },
      body: { conversation_relay_settings: { url: "wss://nested.example.com" }, custom_parameters: { account: "42" }, language: "en-US", languages: [{ language: "en-US", transcription_engine: "Deepgram", transcription_engine_config: { transcription_model: "deepgram/nova-3" }, tts_provider: "telnyx", voice: "Telnyx.KokoroTTS.af" }], dtmf_detection: true, interruptible: "speech", interruptible_greeting: "dtmf", transcription_engine: "Deepgram" },
    },
    {
      name: "stop_conversation_relay",
      args: { call_control_id: "call-1", client_state: "relay-state" },
      body: { client_state: "relay-state" },
    },
    {
      name: "switch_supervisor_role",
      args: { call_control_id: "call-1", role: "whisper" },
      body: { role: "whisper" },
    },
  ];

  for (const testCase of cases) {
    client.response = { data: { result: "ok" } };
    await core.runTool(testCase.name, testCase.args);
    assert.deepEqual(client.requests.shift(), {
      method: "POST",
      path: TOOL_DEFINITIONS[testCase.name].path.replace("{call_control_id}", "call-1"),
      value: testCase.body,
    });
  }

  assert.equal(client.requests.length, 0);
}

assertDefinitions();
await assertExecution();
console.log("RCS and live Call Control atomic tool tests passed");
