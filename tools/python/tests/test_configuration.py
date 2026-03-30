"""Tests for configuration and toolkit initialization."""

import pytest

from telnyx_agent_toolkit import TelnyxAgentToolkit, TelnyxConfig
from telnyx_agent_toolkit.shared.constants import TOOL_DEFINITIONS


class TestTelnyxConfig:
    def test_default_config(self) -> None:
        config = TelnyxConfig()
        assert config.actions == {}
        assert config.context == {}

    def test_config_with_actions(self) -> None:
        config = TelnyxConfig(
            actions={"messaging": {"send_sms": True}},
            context={"user_id": "123"},
        )
        assert config.actions["messaging"]["send_sms"] is True
        assert config.context["user_id"] == "123"


class TestTelnyxAgentToolkit:
    def test_init_with_dict_config(self) -> None:
        toolkit = TelnyxAgentToolkit(
            api_key="test-key",
            configuration={
                "actions": {
                    "messaging": {"send_sms": True},
                }
            },
        )
        assert len(toolkit.enabled_tools) == 1
        assert toolkit.enabled_tools[0]["name"] == "send_sms"

    def test_init_with_pydantic_config(self) -> None:
        config = TelnyxConfig(actions={"messaging": {"send_sms": True}})
        toolkit = TelnyxAgentToolkit(api_key="test-key", configuration=config)
        assert len(toolkit.enabled_tools) == 1

    def test_no_config_enables_all_tools(self) -> None:
        toolkit = TelnyxAgentToolkit(api_key="test-key")
        assert len(toolkit.enabled_tools) == len(TOOL_DEFINITIONS)

    def test_empty_config_enables_all_tools(self) -> None:
        toolkit = TelnyxAgentToolkit(
            api_key="test-key",
            configuration={"actions": {}},
        )
        assert len(toolkit.enabled_tools) == len(TOOL_DEFINITIONS)

    def test_multiple_categories(self) -> None:
        toolkit = TelnyxAgentToolkit(
            api_key="test-key",
            configuration={
                "actions": {
                    "messaging": {"send_sms": True, "list_messaging_profiles": True},
                    "numbers": {"list": True, "search": True},
                    "account": {"get_balance": True},
                }
            },
        )
        names = {t["name"] for t in toolkit.enabled_tools}
        assert names == {
            "send_sms",
            "list_messaging_profiles",
            "list_phone_numbers",
            "search_phone_numbers",
            "get_balance",
        }

    def test_disabled_actions_excluded(self) -> None:
        toolkit = TelnyxAgentToolkit(
            api_key="test-key",
            configuration={
                "actions": {
                    "messaging": {"send_sms": True, "list_messaging_profiles": False},
                }
            },
        )
        names = {t["name"] for t in toolkit.enabled_tools}
        assert "send_sms" in names
        assert "list_messaging_profiles" not in names

    def test_custom_base_url(self) -> None:
        toolkit = TelnyxAgentToolkit(
            api_key="test-key",
            base_url="https://custom.api.com/v2",
        )
        assert toolkit.api_client is not None

    def test_api_client_accessible(self) -> None:
        toolkit = TelnyxAgentToolkit(api_key="test-key")
        assert toolkit.api_client is not None

    def test_core_accessible(self) -> None:
        toolkit = TelnyxAgentToolkit(api_key="test-key")
        assert toolkit.core is not None
