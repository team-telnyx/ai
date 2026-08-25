"""Tests for the CrewAI adapter.

These tests verify the tool generation logic without importing crewai.
CrewAI integration tests require `pip install telnyx-agent-toolkit[crewai]`.
"""

import importlib
from typing import Any
from unittest.mock import patch

import pytest
from pydantic import ValidationError

from telnyx_agent_toolkit.shared.constants import TOOL_DEFINITIONS, ToolDefinition


class TestCrewAIToolkitUnit:
    """Unit tests that mock CrewAI imports."""

    def test_import_error_without_crewai(self) -> None:
        """Verify helpful error when crewai is not installed."""
        with patch.dict("sys.modules", {"crewai": None, "crewai.tools": None}):
            from telnyx_agent_toolkit.crewai import toolkit as crew_toolkit

            importlib.reload(crew_toolkit)
            crew_toolkit._BaseCrewTool = None

            with pytest.raises(ImportError, match="CrewAI is required"):
                crew_toolkit._get_base_tool()

    def test_args_schema_generation(self) -> None:
        """Test that _build_args_schema creates valid Pydantic models."""
        from telnyx_agent_toolkit.crewai.toolkit import _build_args_schema

        schema_cls = _build_args_schema(TOOL_DEFINITIONS["send_sms"])
        assert schema_cls is not None

        fields = schema_cls.model_fields
        assert "from_" in fields
        assert "to" in fields
        assert "text" in fields

    def test_args_schema_optional_fields(self) -> None:
        """Test that non-required fields default to None."""
        from telnyx_agent_toolkit.crewai.toolkit import _build_args_schema

        schema_cls = _build_args_schema(TOOL_DEFINITIONS["list_phone_numbers"])
        fields = schema_cls.model_fields
        # All fields in list_phone_numbers are optional
        for field_name, field_info in fields.items():
            assert field_info.default is not ..., f"{field_name} should have a default"

    def test_args_schema_for_ai_chat(self) -> None:
        """Test schema for complex nested tool."""
        from telnyx_agent_toolkit.crewai.toolkit import _build_args_schema

        schema_cls = _build_args_schema(TOOL_DEFINITIONS["ai_chat"])
        fields = schema_cls.model_fields
        assert "model" in fields
        assert "messages" in fields

    @pytest.mark.parametrize(
        "relay_field,relay_value",
        [
            ("url", "wss://example.test/relay"),
            ("conversation_relay_url", "wss://example.test/relay"),
            ("conversation_relay_settings", {}),
        ],
    )
    def test_conversation_relay_enforces_any_of_required_field_groups(
        self, relay_field: str, relay_value: Any
    ) -> None:
        from telnyx_agent_toolkit.crewai.toolkit import _build_args_schema

        schema_cls = _build_args_schema(TOOL_DEFINITIONS["start_conversation_relay"])

        with pytest.raises(ValidationError, match="anyOf"):
            schema_cls(call_control_id="call-control-id")

        model = schema_cls(
            call_control_id="call-control-id", **{relay_field: relay_value}
        )
        assert relay_field in model.model_fields_set

    def test_any_of_validation_is_generic_and_uses_field_presence(self) -> None:
        from telnyx_agent_toolkit.crewai.toolkit import _build_args_schema

        tool_def: ToolDefinition = {
            "name": "generic_any_of",
            "description": "Generic anyOf contract.",
            "parameters": {
                "type": "object",
                "properties": {
                    "alpha": {"type": "string"},
                    "beta": {"type": "string"},
                },
                "anyOf": [
                    {"required": ["alpha"]},
                    {"required": ["beta"]},
                ],
            },
            "method": "POST",
            "path": "/generic",
            "category": "test",
        }
        schema_cls = _build_args_schema(tool_def)

        with pytest.raises(ValidationError, match="anyOf"):
            schema_cls()
        with pytest.raises(ValidationError):
            schema_cls(alpha=None)
        with pytest.raises(ValidationError):
            schema_cls(beta=None)

        assert schema_cls(alpha="alpha").model_dump()["alpha"] == "alpha"
        assert schema_cls(beta="beta").model_dump()["beta"] == "beta"

    def test_optional_typed_field_can_be_omitted_but_rejects_none(self) -> None:
        from telnyx_agent_toolkit.crewai.toolkit import _build_args_schema

        tool_def: ToolDefinition = {
            "name": "generic_optional",
            "description": "Generic optional field contract.",
            "parameters": {
                "type": "object",
                "properties": {
                    "label": {"type": "string"},
                    "nullable_label": {"type": ["string", "null"]},
                },
            },
            "method": "POST",
            "path": "/generic",
            "category": "test",
        }
        schema_cls = _build_args_schema(tool_def)

        assert schema_cls().model_fields_set == set()
        with pytest.raises(ValidationError):
            schema_cls(label=None)
        assert schema_cls(nullable_label=None).model_dump()["nullable_label"] is None

    def test_preserves_string_enums_and_array_object_types(self) -> None:
        from telnyx_agent_toolkit.crewai.toolkit import _build_args_schema

        relay_schema = _build_args_schema(
            TOOL_DEFINITIONS["start_conversation_relay"]
        )
        with pytest.raises(ValidationError):
            relay_schema(
                call_control_id="call-control-id",
                url="wss://example.test/relay",
                interruptible="invalid",
            )

        messages_schema = _build_args_schema(
            TOOL_DEFINITIONS["add_ai_assistant_messages"]
        )
        messages = [{"role": "user", "content": "hello"}]
        model = messages_schema(call_control_id="call-control-id", messages=messages)
        assert model.messages == messages
