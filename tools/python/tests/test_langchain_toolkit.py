"""Tests for the LangChain adapter.

These tests verify the tool generation logic without importing langchain.
LangChain integration tests require `pip install telnyx-agent-toolkit[langchain]`.
"""

import importlib
from typing import Any
from unittest.mock import patch

import pytest
from pydantic import ValidationError

from telnyx_agent_toolkit.shared.constants import TOOL_DEFINITIONS, ToolDefinition


class TestLangChainToolkitUnit:
    """Unit tests that mock LangChain imports."""

    def test_import_error_without_langchain(self) -> None:
        """Verify helpful error when langchain is not installed."""
        with patch.dict(
            "sys.modules",
            {"langchain_core": None, "langchain_core.tools": None},
        ):
            # Force reimport
            from telnyx_agent_toolkit.langchain import toolkit as lc_toolkit

            importlib.reload(lc_toolkit)
            lc_toolkit._BaseTool = None  # Reset cached import

            with pytest.raises(ImportError, match="LangChain is required"):
                lc_toolkit._get_base_tool()

    def test_args_schema_generation(self) -> None:
        """Test that _build_args_schema creates valid Pydantic models."""
        from telnyx_agent_toolkit.langchain.toolkit import _build_args_schema

        schema_cls = _build_args_schema(TOOL_DEFINITIONS["send_sms"])
        assert schema_cls is not None

        # Check required fields
        fields = schema_cls.model_fields
        assert "from_" in fields
        assert "to" in fields
        assert "text" in fields
        # Optional fields should have None default
        assert "media_urls" in fields

    def test_args_schema_for_get_balance(self) -> None:
        """Test schema for a tool with no parameters."""
        from telnyx_agent_toolkit.langchain.toolkit import _build_args_schema

        schema_cls = _build_args_schema(TOOL_DEFINITIONS["get_balance"])
        fields = schema_cls.model_fields
        assert len(fields) == 0

    def test_args_schema_for_search(self) -> None:
        """Test schema for a tool with optional filters."""
        from telnyx_agent_toolkit.langchain.toolkit import _build_args_schema

        schema_cls = _build_args_schema(TOOL_DEFINITIONS["search_phone_numbers"])
        fields = schema_cls.model_fields
        assert "filter_country_code" in fields
        assert "filter_area_code" in fields
        assert "limit" in fields

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
        from telnyx_agent_toolkit.langchain.toolkit import _build_args_schema

        schema_cls = _build_args_schema(TOOL_DEFINITIONS["start_conversation_relay"])

        with pytest.raises(ValidationError, match="anyOf"):
            schema_cls(call_control_id="call-control-id")

        model = schema_cls(
            call_control_id="call-control-id", **{relay_field: relay_value}
        )
        assert relay_field in model.model_fields_set

    def test_any_of_validation_is_generic_and_uses_field_presence(self) -> None:
        from telnyx_agent_toolkit.langchain.toolkit import _build_args_schema

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
        from telnyx_agent_toolkit.langchain.toolkit import _build_args_schema

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
        assert schema_cls(nullable_label=None).nullable_label is None

    def test_preserves_string_enums_and_array_object_types(self) -> None:
        from telnyx_agent_toolkit.langchain.toolkit import _build_args_schema

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
