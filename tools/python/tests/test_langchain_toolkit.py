"""Tests for the LangChain adapter.

These tests verify the tool generation logic without importing langchain.
LangChain integration tests require `pip install telnyx-agent-toolkit[langchain]`.
"""

import json
from unittest.mock import MagicMock, patch

import httpx
import pytest
import respx

from telnyx_agent_toolkit.shared.constants import TOOL_DEFINITIONS
from telnyx_agent_toolkit.shared.api_client import TelnyxAPIClient
from telnyx_agent_toolkit.shared.toolkit_core import ToolkitCore


class TestLangChainToolkitUnit:
    """Unit tests that mock LangChain imports."""

    def test_import_error_without_langchain(self) -> None:
        """Verify helpful error when langchain is not installed."""
        with patch.dict("sys.modules", {"langchain_core": None, "langchain_core.tools": None}):
            # Force reimport
            import importlib
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
