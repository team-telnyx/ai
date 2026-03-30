"""Configuration and main toolkit entry point."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from telnyx_agent_toolkit.shared.api_client import TelnyxAPIClient
from telnyx_agent_toolkit.shared.constants import TOOL_DEFINITIONS, ToolDefinition
from telnyx_agent_toolkit.shared.friction import FrictionReporter
from telnyx_agent_toolkit.shared.telemetry import TelemetryReporter
from telnyx_agent_toolkit.shared.toolkit_core import ToolkitCore


class ActionPermissions(BaseModel):
    """Permissions for a category of actions."""

    send_sms: bool = False
    list_messaging_profiles: bool = False
    create_messaging_profile: bool = False
    list: bool = False  # list phone numbers
    search: bool = False  # search available numbers
    buy: bool = False  # buy phone number
    get_balance: bool = False
    make_call: bool = False
    list_connections: bool = False
    chat: bool = False  # AI chat
    embed: bool = False  # AI embeddings
    list_ai_assistants: bool = False
    create_ai_assistant: bool = False
    send_fax: bool = False
    lookup_number: bool = False
    list_sim_cards: bool = False
    verify_phone: bool = False
    verify_code: bool = False
    get_payment_quote: bool = False
    submit_payment: bool = False
    create_credential_connection: bool = False
    get_connection: bool = False
    delete_connection: bool = False
    update_connection: bool = False
    list_voice_profiles: bool = False
    create_voice_profile: bool = False
    get_voice_profile: bool = False
    delete_voice_profile: bool = False
    update_phone_number: bool = False
    delete_phone_number: bool = False
    update_number_voice: bool = False
    update_number_messaging: bool = False
    get_messaging_profile: bool = False
    update_messaging_profile: bool = False
    delete_messaging_profile: bool = False
    get_assistant: bool = False
    update_assistant: bool = False
    delete_assistant: bool = False
    list_storage_buckets: bool = False
    create_storage_bucket: bool = False
    delete_storage_bucket: bool = False
    list_ai_models: bool = False
    list_messages: bool = False
    # 10DLC
    list_10dlc_brands: bool = False
    create_10dlc_brand: bool = False
    get_10dlc_brand: bool = False
    list_10dlc_campaigns: bool = False
    create_10dlc_campaign: bool = False
    get_10dlc_campaign: bool = False
    assign_10dlc_campaign: bool = False
    # IoT / Wireless
    get_sim_card: bool = False
    enable_sim_card: bool = False
    disable_sim_card: bool = False
    list_sim_card_groups: bool = False
    create_sim_card_group: bool = False
    # Verify
    list_verify_profiles: bool = False
    create_verify_profile: bool = False
    get_verify_profile: bool = False
    # Porting
    check_portability: bool = False
    list_porting_orders: bool = False
    # E911
    list_e911_addresses: bool = False
    create_e911_address: bool = False
    # Billing
    list_billing_groups: bool = False
    create_billing_group: bool = False
    # Webhooks
    list_webhook_deliveries: bool = False
    get_webhook_delivery: bool = False
    # Networking
    list_networks: bool = False
    create_network: bool = False
    # Fax
    list_faxes: bool = False
    get_fax: bool = False


# Map from (category, action_key) to tool name
_PERMISSION_MAP: dict[tuple[str, str], str] = {
    ("messaging", "send_sms"): "send_sms",
    ("messaging", "list_messaging_profiles"): "list_messaging_profiles",
    ("messaging", "create_messaging_profile"): "create_messaging_profile",
    ("numbers", "list"): "list_phone_numbers",
    ("numbers", "search"): "search_phone_numbers",
    ("numbers", "buy"): "buy_phone_number",
    ("account", "get_balance"): "get_balance",
    ("voice", "make_call"): "make_call",
    ("voice", "list_connections"): "list_connections",
    ("ai", "chat"): "ai_chat",
    ("ai", "embed"): "ai_embed",
    ("ai", "list_ai_assistants"): "list_ai_assistants",
    ("ai", "create_ai_assistant"): "create_ai_assistant",
    ("fax", "send_fax"): "send_fax",
    ("lookup", "lookup_number"): "lookup_number",
    ("iot", "list_sim_cards"): "list_sim_cards",
    ("verify", "verify_phone"): "verify_phone",
    ("verify", "verify_code"): "verify_code",
    ("payments", "get_payment_quote"): "get_payment_quote",
    ("payments", "submit_payment"): "submit_payment",
    ("connections", "create_credential_connection"): "create_credential_connection",
    ("connections", "get_connection"): "get_connection",
    ("connections", "delete_connection"): "delete_connection",
    ("connections", "update_connection"): "update_connection",
    ("voice_profiles", "list_voice_profiles"): "list_voice_profiles",
    ("voice_profiles", "create_voice_profile"): "create_voice_profile",
    ("voice_profiles", "get_voice_profile"): "get_voice_profile",
    ("voice_profiles", "delete_voice_profile"): "delete_voice_profile",
    ("numbers", "update_phone_number"): "update_phone_number",
    ("numbers", "delete_phone_number"): "delete_phone_number",
    ("numbers", "update_number_voice"): "update_number_voice",
    ("numbers", "update_number_messaging"): "update_number_messaging",
    ("messaging", "get_messaging_profile"): "get_messaging_profile",
    ("messaging", "update_messaging_profile"): "update_messaging_profile",
    ("messaging", "delete_messaging_profile"): "delete_messaging_profile",
    ("ai", "get_assistant"): "get_assistant",
    ("ai", "update_assistant"): "update_assistant",
    ("ai", "delete_assistant"): "delete_assistant",
    ("storage", "list_storage_buckets"): "list_storage_buckets",
    ("storage", "create_storage_bucket"): "create_storage_bucket",
    ("storage", "delete_storage_bucket"): "delete_storage_bucket",
    ("ai", "list_ai_models"): "list_ai_models",
    ("messaging", "list_messages"): "list_messages",
    # 10DLC
    ("10dlc", "list_10dlc_brands"): "list_10dlc_brands",
    ("10dlc", "create_10dlc_brand"): "create_10dlc_brand",
    ("10dlc", "get_10dlc_brand"): "get_10dlc_brand",
    ("10dlc", "list_10dlc_campaigns"): "list_10dlc_campaigns",
    ("10dlc", "create_10dlc_campaign"): "create_10dlc_campaign",
    ("10dlc", "get_10dlc_campaign"): "get_10dlc_campaign",
    ("10dlc", "assign_10dlc_campaign"): "assign_10dlc_campaign",
    # IoT / Wireless
    ("iot", "get_sim_card"): "get_sim_card",
    ("iot", "enable_sim_card"): "enable_sim_card",
    ("iot", "disable_sim_card"): "disable_sim_card",
    ("iot", "list_sim_card_groups"): "list_sim_card_groups",
    ("iot", "create_sim_card_group"): "create_sim_card_group",
    # Verify
    ("verify", "list_verify_profiles"): "list_verify_profiles",
    ("verify", "create_verify_profile"): "create_verify_profile",
    ("verify", "get_verify_profile"): "get_verify_profile",
    # Porting
    ("porting", "check_portability"): "check_portability",
    ("porting", "list_porting_orders"): "list_porting_orders",
    # E911
    ("e911", "list_e911_addresses"): "list_e911_addresses",
    ("e911", "create_e911_address"): "create_e911_address",
    # Billing
    ("billing", "list_billing_groups"): "list_billing_groups",
    ("billing", "create_billing_group"): "create_billing_group",
    # Webhooks
    ("webhooks", "list_webhook_deliveries"): "list_webhook_deliveries",
    ("webhooks", "get_webhook_delivery"): "get_webhook_delivery",
    # Networking
    ("networking", "list_networks"): "list_networks",
    ("networking", "create_network"): "create_network",
    # Fax
    ("fax", "list_faxes"): "list_faxes",
    ("fax", "get_fax"): "get_fax",
}


class TelnyxConfig(BaseModel):
    """Configuration for the Telnyx Agent Toolkit."""

    actions: dict[str, dict[str, bool]] = Field(default_factory=dict)
    context: dict[str, Any] = Field(default_factory=dict)


class TelnyxAgentToolkit:
    """Main entry point for the Telnyx Agent Toolkit.

    Provides tools for OpenAI, LangChain, and CrewAI frameworks
    based on user-configured permissions.

    Example:
        ```python
        toolkit = TelnyxAgentToolkit(
            api_key="KEY...",
            configuration={
                "actions": {
                    "messaging": {"send_sms": True},
                    "numbers": {"list": True, "search": True},
                }
            }
        )
        tools = toolkit.get_openai_tools()
        ```
    """

    def __init__(
        self,
        api_key: str,
        *,
        configuration: dict[str, Any] | TelnyxConfig | None = None,
        base_url: str = "https://api.telnyx.com/v2",
        telemetry_endpoint: str | None = None,
        friction_endpoint: str | None = None,
        friction_enabled: bool | None = None,
    ) -> None:
        if isinstance(configuration, dict):
            self._config = TelnyxConfig(**configuration)
        elif configuration is not None:
            self._config = configuration
        else:
            self._config = TelnyxConfig()

        self._client = TelnyxAPIClient(api_key=api_key, base_url=base_url)
        self._telemetry = TelemetryReporter(endpoint=telemetry_endpoint)
        self._friction = FrictionReporter(endpoint=friction_endpoint, enabled=friction_enabled)
        self._core = ToolkitCore(client=self._client, telemetry=self._telemetry, friction=self._friction)
        self._enabled_tools = self._resolve_enabled_tools()

    def _resolve_enabled_tools(self) -> list[ToolDefinition]:
        """Resolve which tools are enabled based on configuration."""
        if not self._config.actions:
            # No config = all tools enabled
            return list(TOOL_DEFINITIONS.values())

        enabled: list[ToolDefinition] = []
        seen: set[str] = set()
        for category, actions in self._config.actions.items():
            for action_key, is_enabled in actions.items():
                if not is_enabled:
                    continue
                # Try permission map first (short key like "list" → "list_phone_numbers")
                tool_name = _PERMISSION_MAP.get((category, action_key))
                # Fall back to action_key as literal tool name
                if tool_name is None and action_key in TOOL_DEFINITIONS:
                    tool_name = action_key
                if tool_name and tool_name in TOOL_DEFINITIONS and tool_name not in seen:
                    enabled.append(TOOL_DEFINITIONS[tool_name])
                    seen.add(tool_name)
        return enabled

    @property
    def api_client(self) -> TelnyxAPIClient:
        """Access the underlying API client."""
        return self._client

    @property
    def core(self) -> ToolkitCore:
        """Access the toolkit core for direct tool execution."""
        return self._core

    @property
    def enabled_tools(self) -> list[ToolDefinition]:
        """List of enabled tool definitions."""
        return self._enabled_tools

    def get_openai_tools(self) -> list[dict[str, Any]]:
        """Get tools formatted for OpenAI function calling.

        Returns a list of tool definitions compatible with the OpenAI API.
        Use with `openai.ChatCompletion.create(tools=...)`.
        """
        from telnyx_agent_toolkit.openai.toolkit import OpenAIToolkit

        adapter = OpenAIToolkit(core=self._core, tools=self._enabled_tools)
        return adapter.get_tools()

    def get_openai_tool_executor(self) -> Any:
        """Get an executor that can run OpenAI tool calls.

        Returns an OpenAIToolkit instance with an `execute` method.
        """
        from telnyx_agent_toolkit.openai.toolkit import OpenAIToolkit

        return OpenAIToolkit(core=self._core, tools=self._enabled_tools)

    def get_langchain_tools(self) -> list[Any]:
        """Get tools formatted for LangChain.

        Returns a list of LangChain `BaseTool` instances.
        """
        from telnyx_agent_toolkit.langchain.toolkit import LangChainToolkit

        adapter = LangChainToolkit(core=self._core, tools=self._enabled_tools)
        return adapter.get_tools()

    def get_crewai_tools(self) -> list[Any]:
        """Get tools formatted for CrewAI.

        Returns a list of CrewAI `BaseTool` instances.
        """
        from telnyx_agent_toolkit.crewai.toolkit import CrewAIToolkit

        adapter = CrewAIToolkit(core=self._core, tools=self._enabled_tools)
        return adapter.get_tools()
