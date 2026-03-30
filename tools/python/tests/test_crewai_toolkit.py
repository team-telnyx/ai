"""Tests for the CrewAI adapter.

These tests verify the tool generation logic without importing crewai.
CrewAI integration tests require `pip install telnyx-agent-toolkit[crewai]`.
"""

from unittest.mock import patch

import pytest

from telnyx_agent_toolkit.shared.constants import TOOL_DEFINITIONS


class TestCrewAIToolkitUnit:
    """Unit tests that mock CrewAI imports."""

    def test_import_error_without_crewai(self) -> None:
        """Verify helpful error when crewai is not installed."""
        with patch.dict("sys.modules", {"crewai": None, "crewai.tools": None}):
            import importlib
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
