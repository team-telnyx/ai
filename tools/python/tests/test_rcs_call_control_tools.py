"""Contract tests for RCS and live Call Control atomic tools."""

import json
from typing import Any, cast

import httpx
import pytest
import respx
from respx.models import Call

from telnyx_agent_toolkit import TelnyxAgentToolkit
from telnyx_agent_toolkit.shared.api_client import TelnyxAPIClient
from telnyx_agent_toolkit.shared.constants import TOOL_DEFINITIONS
from telnyx_agent_toolkit.shared.toolkit_core import ToolkitCore


@pytest.fixture
def core() -> ToolkitCore:
    client = TelnyxAPIClient(api_key="test-key", base_url="https://api.telnyx.com/v2")
    return ToolkitCore(client=client)


EXPECTED_TOOLS: dict[str, tuple[str, str, str, set[str], set[str]]] = {
    "send_rcs_message": (
        "POST",
        "/messages/rcs",
        "messaging",
        {
            "agent_id",
            "agent_message",
            "messaging_profile_id",
            "to",
            "mms_fallback",
            "sms_fallback",
            "type",
            "webhook_url",
        },
        {"agent_id", "agent_message", "messaging_profile_id", "to", "type"},
    ),
    "check_rcs_capabilities": (
        "GET",
        "/messaging/rcs/capabilities/{agent_id}/{phone_number}",
        "messaging",
        {"agent_id", "phone_number"},
        {"agent_id", "phone_number"},
    ),
    "add_ai_assistant_messages": (
        "POST",
        "/calls/{call_control_id}/actions/ai_assistant_add_messages",
        "voice",
        {"call_control_id", "client_state", "command_id", "messages"},
        {"call_control_id"},
    ),
    "gather_using_ai": (
        "POST",
        "/calls/{call_control_id}/actions/gather_using_ai",
        "voice",
        {
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
        },
        {"call_control_id", "parameters"},
    ),
    "gather_using_audio": (
        "POST",
        "/calls/{call_control_id}/actions/gather_using_audio",
        "voice",
        {
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
        },
        {"call_control_id"},
    ),
    "gather_using_speak": (
        "POST",
        "/calls/{call_control_id}/actions/gather_using_speak",
        "voice",
        {
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
        },
        {"call_control_id", "payload", "voice"},
    ),
    "join_ai_assistant": (
        "POST",
        "/calls/{call_control_id}/actions/ai_assistant_join",
        "voice",
        {
            "call_control_id",
            "conversation_id",
            "participant",
            "client_state",
            "command_id",
        },
        {"call_control_id", "conversation_id", "participant"},
    ),
    "start_ai_assistant": (
        "POST",
        "/calls/{call_control_id}/actions/ai_assistant_start",
        "voice",
        {
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
        },
        {"call_control_id"},
    ),
    "stop_ai_assistant": (
        "POST",
        "/calls/{call_control_id}/actions/ai_assistant_stop",
        "voice",
        {"call_control_id", "client_state", "command_id"},
        {"call_control_id"},
    ),
    "start_conversation_relay": (
        "POST",
        "/calls/{call_control_id}/actions/conversation_relay_start",
        "voice",
        {
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
        },
        {"call_control_id"},
    ),
    "stop_conversation_relay": (
        "POST",
        "/calls/{call_control_id}/actions/conversation_relay_stop",
        "voice",
        {"call_control_id", "client_state", "command_id"},
        {"call_control_id"},
    ),
    "switch_supervisor_role": (
        "POST",
        "/calls/{call_control_id}/actions/switch_supervisor_role",
        "voice",
        {"call_control_id", "role"},
        {"call_control_id", "role"},
    ),
}


GOOGLE_TRANSCRIPTION_LANGUAGES = [
    "af",
    "sq",
    "am",
    "ar",
    "hy",
    "az",
    "eu",
    "bn",
    "bs",
    "bg",
    "my",
    "ca",
    "yue",
    "zh",
    "hr",
    "cs",
    "da",
    "nl",
    "en",
    "et",
    "fil",
    "fi",
    "fr",
    "gl",
    "ka",
    "de",
    "el",
    "gu",
    "iw",
    "hi",
    "hu",
    "is",
    "id",
    "it",
    "ja",
    "jv",
    "kn",
    "kk",
    "km",
    "ko",
    "lo",
    "lv",
    "lt",
    "mk",
    "ms",
    "ml",
    "mr",
    "mn",
    "ne",
    "no",
    "fa",
    "pl",
    "pt",
    "pa",
    "ro",
    "ru",
    "rw",
    "sr",
    "si",
    "sk",
    "sl",
    "ss",
    "st",
    "es",
    "su",
    "sw",
    "sv",
    "ta",
    "te",
    "th",
    "tn",
    "tr",
    "ts",
    "uk",
    "ur",
    "uz",
    "ve",
    "vi",
    "xh",
    "zu",
]

CONVERSATION_RELAY_TRANSCRIPTION_ENGINES = [
    "Google",
    "Telnyx",
    "Deepgram",
    "Azure",
    "xAI",
    "AssemblyAI",
    "Speechmatics",
    "Soniox",
    "A",
    "B",
]


class TestRCSAndCallControlDefinitions:
    @pytest.mark.parametrize("name", EXPECTED_TOOLS)
    def test_atomic_tool_schema(self, name: str) -> None:
        method, path, category, properties, required = EXPECTED_TOOLS[name]
        tool = TOOL_DEFINITIONS[name]

        assert tool["method"] == method
        assert tool["path"] == path
        assert tool["category"] == category
        assert set(tool["parameters"]["properties"]) == properties
        assert set(tool["parameters"]["required"]) == required

    def test_nested_api_body_names_and_enums(self) -> None:
        add_messages = TOOL_DEFINITIONS["add_ai_assistant_messages"]
        assert add_messages["parameters"]["properties"]["messages"] == {
            "type": "array",
            "items": {"type": "object"},
            "description": "Messages to add to the AI assistant conversation.",
        }
        start_ai = TOOL_DEFINITIONS["start_ai_assistant"]
        assert start_ai["parameters"]["properties"]["participants"]["type"] == (
            "array"
        )
        send_rcs = TOOL_DEFINITIONS["send_rcs_message"]
        assert send_rcs["parameters"]["properties"]["agent_message"]["type"] == (
            "object"
        )
        switch_role = TOOL_DEFINITIONS["switch_supervisor_role"]
        assert switch_role["parameters"]["properties"]["role"]["enum"] == [
            "barge",
            "whisper",
            "monitor",
        ]

    def test_gather_using_ai_language_matches_openapi_enum(self) -> None:
        properties = TOOL_DEFINITIONS["gather_using_ai"]["parameters"][
            "properties"
        ]

        assert properties["language"]["type"] == "string"
        assert properties["language"]["enum"] == GOOGLE_TRANSCRIPTION_LANGUAGES

    def test_conversation_relay_language_and_interruptible_schemas(self) -> None:
        parameters = TOOL_DEFINITIONS["start_conversation_relay"]["parameters"]
        properties = parameters["properties"]

        assert properties["language"]["type"] == "string"
        assert properties["interruptible"]["type"] == "string"
        assert properties["interruptible"]["enum"] == [
            "none",
            "any",
            "speech",
            "dtmf",
        ]
        assert properties["interruptible_greeting"]["type"] == "string"
        assert properties["interruptible_greeting"]["enum"] == [
            "none",
            "any",
            "speech",
            "dtmf",
        ]
        assert properties["transcription_engine"]["enum"] == (
            CONVERSATION_RELAY_TRANSCRIPTION_ENGINES
        )
        assert parameters["anyOf"] == [
            {"required": ["url"]},
            {"required": ["conversation_relay_url"]},
            {"required": ["conversation_relay_settings"]},
        ]

    def test_conversation_relay_languages_items_match_openapi(self) -> None:
        properties = TOOL_DEFINITIONS["start_conversation_relay"]["parameters"][
            "properties"
        ]
        languages = properties["languages"]
        items = languages["items"]

        assert languages["type"] == "array"
        assert items["type"] == "object"
        assert set(items["properties"]) == {
            "language",
            "tts_provider",
            "voice",
            "voice_settings",
            "transcription_engine",
            "transcription_engine_config",
            "transcription_provider",
            "speech_model",
        }
        assert items["properties"]["language"]["type"] == "string"
        assert items["properties"]["transcription_engine"]["enum"] == (
            CONVERSATION_RELAY_TRANSCRIPTION_ENGINES
        )
        assert items["required"] == ["language"]

    def test_configuration_permissions_enable_atomic_tools(self) -> None:
        toolkit = TelnyxAgentToolkit(
            api_key="test-key",
            configuration={
                "actions": {
                    "messaging": {
                        "send_rcs_message": True,
                        "check_rcs_capabilities": True,
                    },
                    "voice": {
                        name: True
                        for name in EXPECTED_TOOLS
                        if name not in {"send_rcs_message", "check_rcs_capabilities"}
                    },
                }
            },
        )

        assert {tool["name"] for tool in toolkit.enabled_tools} == set(EXPECTED_TOOLS)


POST_CASES: list[tuple[str, str, dict[str, Any], dict[str, Any]]] = [
    (
        "send_rcs_message",
        "https://api.telnyx.com/v2/messages/rcs",
        {
            "agent_id": "agent-1",
            "agent_message": {
                "content_message": {"text": "Hello from RCS"},
                "ttl": "300s",
            },
            "messaging_profile_id": "profile-1",
            "to": "+155****4567",
            "sms_fallback": {"from": "+155****0000", "text": "Hello by SMS"},
            "type": "RCS",
            "webhook_url": "https://example.com/rcs-events",
        },
        {
            "agent_id": "agent-1",
            "agent_message": {
                "content_message": {"text": "Hello from RCS"},
                "ttl": "300s",
            },
            "messaging_profile_id": "profile-1",
            "to": "+155****4567",
            "sms_fallback": {"from": "+155****0000", "text": "Hello by SMS"},
            "type": "RCS",
            "webhook_url": "https://example.com/rcs-events",
        },
    ),
    (
        "add_ai_assistant_messages",
        "https://api.telnyx.com/v2/calls/call-1/actions/ai_assistant_add_messages",
        {
            "call_control_id": "call-1",
            "messages": [{"role": "user", "content": "hello"}],
            "client_state": "c3RhdGU=",
            "command_id": "cmd-1",
        },
        {
            "messages": [{"role": "user", "content": "hello"}],
            "client_state": "c3RhdGU=",
            "command_id": "cmd-1",
        },
    ),
    (
        "gather_using_ai",
        "https://api.telnyx.com/v2/calls/call-2/actions/gather_using_ai",
        {
            "call_control_id": "call-2",
            "parameters": {
                "type": "object",
                "properties": {"name": {"type": "string"}},
            },
            "assistant": {
                "model": "openai/gpt-4o",
                "tools": [{"type": "webhook"}],
            },
            "message_history": [
                {"role": "user", "content": "My name starts with A"}
            ],
            "interruption_settings": {"enable": True},
            "send_partial_results": True,
            "transcription": {"language": "en"},
            "voice_settings": {"voice_speed": 1.1},
        },
        {
            "parameters": {
                "type": "object",
                "properties": {"name": {"type": "string"}},
            },
            "assistant": {
                "model": "openai/gpt-4o",
                "tools": [{"type": "webhook"}],
            },
            "message_history": [
                {"role": "user", "content": "My name starts with A"}
            ],
            "interruption_settings": {"enable": True},
            "send_partial_results": True,
            "transcription": {"language": "en"},
            "voice_settings": {"voice_speed": 1.1},
        },
    ),
    (
        "gather_using_audio",
        "https://api.telnyx.com/v2/calls/call-3/actions/gather_using_audio",
        {
            "call_control_id": "call-3",
            "audio_url": "https://example.com/menu.wav",
            "maximum_digits": 4,
            "valid_digits": "1234",
        },
        {
            "audio_url": "https://example.com/menu.wav",
            "maximum_digits": 4,
            "valid_digits": "1234",
        },
    ),
    (
        "gather_using_speak",
        "https://api.telnyx.com/v2/calls/call-4/actions/gather_using_speak",
        {
            "call_control_id": "call-4",
            "payload": "Enter your PIN",
            "voice": "Telnyx.KokoroTTS.af",
            "invalid_payload": "Try again",
            "minimum_digits": 4,
            "voice_settings": {"voice_speed": 1.0},
        },
        {
            "payload": "Enter your PIN",
            "voice": "Telnyx.KokoroTTS.af",
            "invalid_payload": "Try again",
            "minimum_digits": 4,
            "voice_settings": {"voice_speed": 1.0},
        },
    ),
    (
        "join_ai_assistant",
        "https://api.telnyx.com/v2/calls/call-5/actions/ai_assistant_join",
        {
            "call_control_id": "call-5",
            "conversation_id": "conv-1",
            "participant": {"id": "call-6", "role": "user", "name": "Caller"},
        },
        {
            "conversation_id": "conv-1",
            "participant": {"id": "call-6", "role": "user", "name": "Caller"},
        },
    ),
    (
        "start_ai_assistant",
        "https://api.telnyx.com/v2/calls/call-7/actions/ai_assistant_start",
        {
            "call_control_id": "call-7",
            "assistant": {
                "id": "assistant-1",
                "dynamic_variables": {"customer": "Ada"},
            },
            "message_history": [{"role": "system", "content": "Be concise"}],
            "participants": [{"id": "call-8", "role": "user"}],
            "send_message_history_updates": True,
        },
        {
            "assistant": {
                "id": "assistant-1",
                "dynamic_variables": {"customer": "Ada"},
            },
            "message_history": [{"role": "system", "content": "Be concise"}],
            "participants": [{"id": "call-8", "role": "user"}],
            "send_message_history_updates": True,
        },
    ),
    (
        "stop_ai_assistant",
        "https://api.telnyx.com/v2/calls/call-9/actions/ai_assistant_stop",
        {
            "call_control_id": "call-9",
            "client_state": "c3RvcA==",
            "command_id": "cmd-stop",
        },
        {"client_state": "c3RvcA==", "command_id": "cmd-stop"},
    ),
    (
        "start_conversation_relay",
        "https://api.telnyx.com/v2/calls/call-10/actions/conversation_relay_start",
        {
            "call_control_id": "call-10",
            "assistant": {"dynamic_variables": {"customer": "Ada"}},
            "conversation_relay_settings": {
                "url": "wss://example.com/relay",
                "dtmf_detection": True,
            },
            "custom_parameters": {"account_id": "acct-1"},
            "interruption_settings": {
                "enable": True,
                "interruptible": "speech",
            },
            "language": "en-US",
            "languages": [
                {
                    "language": "en-US",
                    "voice": "Telnyx.KokoroTTS.af",
                    "transcription_engine": "Deepgram",
                }
            ],
            "voice_settings": {"voice_speed": 1.0},
        },
        {
            "assistant": {"dynamic_variables": {"customer": "Ada"}},
            "conversation_relay_settings": {
                "url": "wss://example.com/relay",
                "dtmf_detection": True,
            },
            "custom_parameters": {"account_id": "acct-1"},
            "interruption_settings": {
                "enable": True,
                "interruptible": "speech",
            },
            "language": "en-US",
            "languages": [
                {
                    "language": "en-US",
                    "voice": "Telnyx.KokoroTTS.af",
                    "transcription_engine": "Deepgram",
                }
            ],
            "voice_settings": {"voice_speed": 1.0},
        },
    ),
    (
        "stop_conversation_relay",
        "https://api.telnyx.com/v2/calls/call-11/actions/conversation_relay_stop",
        {
            "call_control_id": "call-11",
            "client_state": "cmVsYXk=",
            "command_id": "relay-stop",
        },
        {"client_state": "cmVsYXk=", "command_id": "relay-stop"},
    ),
    (
        "switch_supervisor_role",
        "https://api.telnyx.com/v2/calls/call-12/actions/switch_supervisor_role",
        {"call_control_id": "call-12", "role": "whisper"},
        {"role": "whisper"},
    ),
]


class TestRCSAndCallControlExecution:
    @respx.mock
    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "response_data",
        [
            {"features": ["GENERIC_RCS_FEATURE"]},
            {"features": None, "status": "RCS unavailable"},
            {"features": [], "status": "Success"},
        ],
    )
    async def test_check_rcs_capabilities_interpolates_both_path_fields(
        self,
        core: ToolkitCore,
        response_data: dict[str, Any],
    ) -> None:
        route = respx.get(
            "https://api.telnyx.com/v2/messaging/rcs/capabilities/agent-1/+155****4567"
        ).mock(return_value=httpx.Response(200, json={"data": response_data}))

        result = json.loads(
            await core.run_tool_async(
                "check_rcs_capabilities",
                {"agent_id": "agent-1", "phone_number": "+155****4567"},
            )
        )

        assert route.call_count == 1
        request = cast(Call, route.calls[0]).request
        assert request.url == httpx.URL(
            "https://api.telnyx.com/v2/messaging/rcs/capabilities/agent-1/+155****4567"
        )
        assert result["data"] == response_data

    @respx.mock
    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        ("tool_name", "url", "arguments", "expected_body"), POST_CASES
    )
    async def test_post_tool_interpolates_url_and_preserves_exact_json_body(
        self,
        core: ToolkitCore,
        tool_name: str,
        url: str,
        arguments: dict[str, Any],
        expected_body: dict[str, Any],
    ) -> None:
        response = httpx.Response(200, json={"data": {"result": "ok"}})
        route = respx.post(url).mock(return_value=response)

        result = json.loads(await core.run_tool_async(tool_name, arguments))

        assert route.call_count == 1
        request = cast(Call, route.calls[0]).request
        assert request.url == httpx.URL(url)
        assert json.loads(request.content) == expected_body
        assert result == {"data": {"result": "ok"}}
