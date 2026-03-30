"""Tests for tool execution via ToolkitCore."""

import json

import httpx
import pytest
import respx

from telnyx_agent_toolkit.shared.api_client import TelnyxAPIClient
from telnyx_agent_toolkit.shared.constants import TOOL_DEFINITIONS
from telnyx_agent_toolkit.shared.toolkit_core import ToolkitCore


@pytest.fixture
def core() -> ToolkitCore:
    client = TelnyxAPIClient(api_key="test-key", base_url="https://api.telnyx.com/v2")
    return ToolkitCore(client=client)


class TestToolDefinitions:
    def test_all_tools_have_required_keys(self) -> None:
        for name, tool_def in TOOL_DEFINITIONS.items():
            assert "name" in tool_def, f"{name} missing 'name'"
            assert "description" in tool_def, f"{name} missing 'description'"
            assert "parameters" in tool_def, f"{name} missing 'parameters'"
            assert "method" in tool_def, f"{name} missing 'method'"
            assert "path" in tool_def, f"{name} missing 'path'"
            assert "category" in tool_def, f"{name} missing 'category'"
            assert tool_def["name"] == name

    def test_84_tools_defined(self) -> None:
        assert len(TOOL_DEFINITIONS) == 84

    def test_tool_categories(self) -> None:
        categories = {t["category"] for t in TOOL_DEFINITIONS.values()}
        assert categories == {"messaging", "numbers", "account", "voice", "ai", "fax", "lookup", "iot", "verify", "payments", "connections", "voice_profiles", "storage", "10dlc", "porting", "e911", "billing", "webhooks", "networking"}

    def test_new_connection_tools(self) -> None:
        for name in ["create_credential_connection", "get_connection", "delete_connection", "update_connection"]:
            assert name in TOOL_DEFINITIONS, f"Missing tool: {name}"
            assert TOOL_DEFINITIONS[name]["category"] == "connections"

    def test_new_voice_profile_tools(self) -> None:
        for name in ["list_voice_profiles", "create_voice_profile", "get_voice_profile", "delete_voice_profile"]:
            assert name in TOOL_DEFINITIONS, f"Missing tool: {name}"
            assert TOOL_DEFINITIONS[name]["category"] == "voice_profiles"

    def test_new_number_management_tools(self) -> None:
        for name in ["update_phone_number", "delete_phone_number", "update_number_voice", "update_number_messaging"]:
            assert name in TOOL_DEFINITIONS, f"Missing tool: {name}"
            assert TOOL_DEFINITIONS[name]["category"] == "numbers"

    def test_new_messaging_profile_tools(self) -> None:
        for name in ["get_messaging_profile", "update_messaging_profile", "delete_messaging_profile"]:
            assert name in TOOL_DEFINITIONS, f"Missing tool: {name}"
            assert TOOL_DEFINITIONS[name]["category"] == "messaging"

    def test_new_ai_assistant_tools(self) -> None:
        for name in ["get_assistant", "update_assistant", "delete_assistant"]:
            assert name in TOOL_DEFINITIONS, f"Missing tool: {name}"
            assert TOOL_DEFINITIONS[name]["category"] == "ai"

    def test_new_storage_tools(self) -> None:
        for name in ["list_storage_buckets", "create_storage_bucket"]:
            assert name in TOOL_DEFINITIONS, f"Missing tool: {name}"
            assert TOOL_DEFINITIONS[name]["category"] == "storage"

    def test_list_ai_models_tool(self) -> None:
        assert "list_ai_models" in TOOL_DEFINITIONS
        assert TOOL_DEFINITIONS["list_ai_models"]["method"] == "GET"
        assert TOOL_DEFINITIONS["list_ai_models"]["path"] == "/ai/models"

    def test_list_messages_tool(self) -> None:
        assert "list_messages" in TOOL_DEFINITIONS
        assert TOOL_DEFINITIONS["list_messages"]["method"] == "GET"
        assert TOOL_DEFINITIONS["list_messages"]["path"] == "/messages"

    def test_payment_tools(self) -> None:
        for name in ["get_payment_quote", "submit_payment"]:
            assert name in TOOL_DEFINITIONS, f"Missing tool: {name}"
            assert TOOL_DEFINITIONS[name]["category"] == "payments"

    def test_10dlc_tools(self) -> None:
        for name in ["list_10dlc_brands", "create_10dlc_brand", "get_10dlc_brand", "list_10dlc_campaigns", "create_10dlc_campaign", "get_10dlc_campaign", "assign_10dlc_campaign"]:
            assert name in TOOL_DEFINITIONS, f"Missing tool: {name}"
            assert TOOL_DEFINITIONS[name]["category"] == "10dlc"

    def test_iot_extended_tools(self) -> None:
        for name in ["get_sim_card", "enable_sim_card", "disable_sim_card", "list_sim_card_groups", "create_sim_card_group"]:
            assert name in TOOL_DEFINITIONS, f"Missing tool: {name}"
            assert TOOL_DEFINITIONS[name]["category"] == "iot"

    def test_verify_extended_tools(self) -> None:
        for name in ["list_verify_profiles", "create_verify_profile", "get_verify_profile"]:
            assert name in TOOL_DEFINITIONS, f"Missing tool: {name}"
            assert TOOL_DEFINITIONS[name]["category"] == "verify"

    def test_porting_tools(self) -> None:
        for name in ["check_portability", "list_porting_orders", "create_porting_order"]:
            assert name in TOOL_DEFINITIONS, f"Missing tool: {name}"
            assert TOOL_DEFINITIONS[name]["category"] == "porting"

    def test_e911_tools(self) -> None:
        for name in ["list_e911_addresses", "create_e911_address", "update_e911_address", "delete_e911_address"]:
            assert name in TOOL_DEFINITIONS, f"Missing tool: {name}"
            assert TOOL_DEFINITIONS[name]["category"] == "e911"

    def test_billing_tools(self) -> None:
        for name in ["list_billing_groups", "create_billing_group", "update_billing_group", "delete_billing_group"]:
            assert name in TOOL_DEFINITIONS, f"Missing tool: {name}"
            assert TOOL_DEFINITIONS[name]["category"] == "billing"

    def test_webhook_tools(self) -> None:
        for name in ["list_webhook_deliveries", "get_webhook_delivery"]:
            assert name in TOOL_DEFINITIONS, f"Missing tool: {name}"
            assert TOOL_DEFINITIONS[name]["category"] == "webhooks"

    def test_networking_tools(self) -> None:
        for name in ["list_networks", "create_network", "update_network", "delete_network", "list_network_interfaces"]:
            assert name in TOOL_DEFINITIONS, f"Missing tool: {name}"
            assert TOOL_DEFINITIONS[name]["category"] == "networking"

    def test_fax_extended_tools(self) -> None:
        for name in ["list_faxes", "get_fax", "delete_fax"]:
            assert name in TOOL_DEFINITIONS, f"Missing tool: {name}"
            assert TOOL_DEFINITIONS[name]["category"] == "fax"

    def test_delete_storage_bucket_tool(self) -> None:
        assert "delete_storage_bucket" in TOOL_DEFINITIONS
        assert TOOL_DEFINITIONS["delete_storage_bucket"]["method"] == "DELETE"
        assert TOOL_DEFINITIONS["delete_storage_bucket"]["category"] == "storage"

    def test_storage_object_tools(self) -> None:
        for name in ["upload_storage_object", "get_storage_object", "create_presigned_url"]:
            assert name in TOOL_DEFINITIONS, f"Missing tool: {name}"
            assert TOOL_DEFINITIONS[name]["category"] == "storage"

    def test_bulk_lookup_tool(self) -> None:
        assert "bulk_lookup_numbers" in TOOL_DEFINITIONS
        assert TOOL_DEFINITIONS["bulk_lookup_numbers"]["method"] == "POST"
        assert TOOL_DEFINITIONS["bulk_lookup_numbers"]["category"] == "lookup"

    def test_get_message_tool(self) -> None:
        assert "get_message" in TOOL_DEFINITIONS
        assert TOOL_DEFINITIONS["get_message"]["method"] == "GET"
        assert TOOL_DEFINITIONS["get_message"]["path"] == "/messages/{id}"
        assert TOOL_DEFINITIONS["get_message"]["category"] == "messaging"


class TestToolkitCore:
    @respx.mock
    @pytest.mark.asyncio
    async def test_send_sms(self, core: ToolkitCore) -> None:
        respx.post("https://api.telnyx.com/v2/messages").mock(
            return_value=httpx.Response(200, json={
                "data": {"id": "msg-123", "to": [{"phone_number": "+18005551234"}]}
            })
        )
        result = await core.run_tool_async("send_sms", {
            "from_": "+18005550001",
            "to": "+18005551234",
            "text": "Hello from tests!",
        })
        data = json.loads(result)
        assert data["data"]["id"] == "msg-123"

    @respx.mock
    @pytest.mark.asyncio
    async def test_list_phone_numbers(self, core: ToolkitCore) -> None:
        respx.get("https://api.telnyx.com/v2/phone_numbers").mock(
            return_value=httpx.Response(200, json={
                "data": [{"phone_number": "+18005550001"}],
                "meta": {"total_results": 1},
            })
        )
        result = await core.run_tool_async("list_phone_numbers", {"page_size": 10})
        data = json.loads(result)
        assert len(data["data"]) == 1

    @respx.mock
    @pytest.mark.asyncio
    async def test_search_phone_numbers(self, core: ToolkitCore) -> None:
        respx.get("https://api.telnyx.com/v2/available_phone_numbers").mock(
            return_value=httpx.Response(200, json={
                "data": [{"phone_number": "+14155550100", "cost": "1.00"}],
            })
        )
        result = await core.run_tool_async("search_phone_numbers", {
            "filter_country_code": "US",
            "filter_area_code": "415",
        })
        data = json.loads(result)
        assert data["data"][0]["phone_number"] == "+14155550100"

    @respx.mock
    @pytest.mark.asyncio
    async def test_buy_phone_number(self, core: ToolkitCore) -> None:
        respx.post("https://api.telnyx.com/v2/number_orders").mock(
            return_value=httpx.Response(200, json={
                "data": {"id": "order-123", "status": "pending"},
            })
        )
        result = await core.run_tool_async("buy_phone_number", {
            "phone_numbers": [{"phone_number": "+14155550100"}],
        })
        data = json.loads(result)
        assert data["data"]["status"] == "pending"

    @respx.mock
    @pytest.mark.asyncio
    async def test_get_balance(self, core: ToolkitCore) -> None:
        respx.get("https://api.telnyx.com/v2/balance").mock(
            return_value=httpx.Response(200, json={
                "data": {"balance": "150.00", "currency": "USD", "credit_limit": "0.00"},
            })
        )
        result = await core.run_tool_async("get_balance", {})
        data = json.loads(result)
        assert data["data"]["balance"] == "150.00"

    @respx.mock
    @pytest.mark.asyncio
    async def test_make_call(self, core: ToolkitCore) -> None:
        respx.post("https://api.telnyx.com/v2/calls").mock(
            return_value=httpx.Response(200, json={
                "data": {"call_control_id": "cc-123", "call_session_id": "cs-456"},
            })
        )
        result = await core.run_tool_async("make_call", {
            "to": "+18005551234",
            "from_": "+18005550001",
            "connection_id": "conn-789",
        })
        data = json.loads(result)
        assert data["data"]["call_control_id"] == "cc-123"

    @respx.mock
    @pytest.mark.asyncio
    async def test_ai_chat(self, core: ToolkitCore) -> None:
        respx.post("https://api.telnyx.com/v2/ai/chat/completions").mock(
            return_value=httpx.Response(200, json={
                "choices": [{"message": {"content": "Hello!"}}],
            })
        )
        result = await core.run_tool_async("ai_chat", {
            "model": "meta-llama/Meta-Llama-3.1-70B-Instruct",
            "messages": [{"role": "user", "content": "Hi"}],
        })
        data = json.loads(result)
        assert data["choices"][0]["message"]["content"] == "Hello!"

    @respx.mock
    @pytest.mark.asyncio
    async def test_ai_embed(self, core: ToolkitCore) -> None:
        respx.post("https://api.telnyx.com/v2/ai/embeddings").mock(
            return_value=httpx.Response(200, json={
                "data": [{"embedding": [0.1, 0.2, 0.3]}],
            })
        )
        result = await core.run_tool_async("ai_embed", {
            "model": "thenlper/gte-large",
            "input": "Hello world",
        })
        data = json.loads(result)
        assert len(data["data"][0]["embedding"]) == 3

    @respx.mock
    @pytest.mark.asyncio
    async def test_lookup_number(self, core: ToolkitCore) -> None:
        respx.get("https://api.telnyx.com/v2/number_lookup/+18005551234").mock(
            return_value=httpx.Response(200, json={
                "data": {"carrier": {"name": "AT&T"}, "phone_number": "+18005551234"},
            })
        )
        result = await core.run_tool_async("lookup_number", {
            "phone_number": "+18005551234",
        })
        data = json.loads(result)
        assert data["data"]["carrier"]["name"] == "AT&T"

    @respx.mock
    @pytest.mark.asyncio
    async def test_verify_phone(self, core: ToolkitCore) -> None:
        respx.post("https://api.telnyx.com/v2/verifications").mock(
            return_value=httpx.Response(200, json={
                "data": {"id": "ver-123", "status": "pending"},
            })
        )
        result = await core.run_tool_async("verify_phone", {
            "phone_number": "+18005551234",
            "verify_profile_id": "vp-456",
        })
        data = json.loads(result)
        assert data["data"]["status"] == "pending"

    @respx.mock
    @pytest.mark.asyncio
    async def test_verify_code(self, core: ToolkitCore) -> None:
        respx.post(
            "https://api.telnyx.com/v2/verifications/by_phone_number/+18005551234/actions/verify"
        ).mock(
            return_value=httpx.Response(200, json={
                "data": {"phone_number": "+18005551234", "status": "accepted"},
            })
        )
        result = await core.run_tool_async("verify_code", {
            "phone_number": "+18005551234",
            "verify_profile_id": "vp-456",
            "code": "123456",
        })
        data = json.loads(result)
        assert data["data"]["status"] == "accepted"

    @respx.mock
    @pytest.mark.asyncio
    async def test_unknown_tool(self, core: ToolkitCore) -> None:
        result = await core.run_tool_async("nonexistent_tool", {})
        data = json.loads(result)
        assert "error" in data
        assert "Unknown tool" in data["error"]

    @respx.mock
    @pytest.mark.asyncio
    async def test_api_error_handled(self, core: ToolkitCore) -> None:
        respx.get("https://api.telnyx.com/v2/balance").mock(
            return_value=httpx.Response(401, json={
                "errors": [{"detail": "Unauthorized"}],
            })
        )
        result = await core.run_tool_async("get_balance", {})
        data = json.loads(result)
        assert "error" in data

    @respx.mock
    def test_sync_run_tool(self, core: ToolkitCore) -> None:
        respx.get("https://api.telnyx.com/v2/balance").mock(
            return_value=httpx.Response(200, json={
                "data": {"balance": "99.00"},
            })
        )
        result = core.run_tool("get_balance", {})
        data = json.loads(result)
        assert data["data"]["balance"] == "99.00"

    @respx.mock
    @pytest.mark.asyncio
    async def test_from_underscore_normalized(self, core: ToolkitCore) -> None:
        """Verify that from_ gets sent as 'from' to the API."""
        route = respx.post("https://api.telnyx.com/v2/messages").mock(
            return_value=httpx.Response(200, json={"data": {"id": "msg-test"}})
        )
        await core.run_tool_async("send_sms", {
            "from_": "+18005550001",
            "to": "+18005551234",
            "text": "Test",
        })
        request = route.calls[0].request
        body = json.loads(request.content)
        assert "from" in body
        assert "from_" not in body

    @respx.mock
    @pytest.mark.asyncio
    async def test_none_values_excluded(self, core: ToolkitCore) -> None:
        route = respx.post("https://api.telnyx.com/v2/messages").mock(
            return_value=httpx.Response(200, json={"data": {"id": "msg-test"}})
        )
        await core.run_tool_async("send_sms", {
            "from_": "+18005550001",
            "to": "+18005551234",
            "text": "Test",
            "media_urls": None,
            "messaging_profile_id": None,
        })
        request = route.calls[0].request
        body = json.loads(request.content)
        assert "media_urls" not in body
        assert "messaging_profile_id" not in body
