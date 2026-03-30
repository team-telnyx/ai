"""Tests for x402 payment tools (get_payment_quote and submit_payment)."""

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


class TestPaymentToolDefinitions:
    """Verify x402 tool definitions are correctly structured."""

    def test_get_payment_quote_exists(self) -> None:
        assert "get_payment_quote" in TOOL_DEFINITIONS

    def test_submit_payment_exists(self) -> None:
        assert "submit_payment" in TOOL_DEFINITIONS

    def test_get_payment_quote_schema(self) -> None:
        tool = TOOL_DEFINITIONS["get_payment_quote"]
        assert tool["method"] == "POST"
        assert tool["path"] == "/x402/credit_account/quote"
        assert tool["category"] == "payments"
        assert "amount_usd" in tool["parameters"]["properties"]
        assert "amount_usd" in tool["parameters"]["required"]

    def test_submit_payment_schema(self) -> None:
        tool = TOOL_DEFINITIONS["submit_payment"]
        assert tool["method"] == "POST"
        assert tool["path"] == "/x402/credit_account"
        assert tool["category"] == "payments"
        assert "id" in tool["parameters"]["properties"]
        assert "payment_signature" in tool["parameters"]["properties"]
        assert "id" in tool["parameters"]["required"]
        assert "payment_signature" in tool["parameters"]["required"]


class TestPaymentToolExecution:
    """Test x402 tool execution with mocked API responses."""

    @respx.mock
    @pytest.mark.asyncio
    async def test_get_payment_quote(self, core: ToolkitCore) -> None:
        mock_response = {
            "data": {
                "id": "quote_abc123",
                "amount_usd": "50.00",
                "amount_crypto": "50000000",
                "network": "eip155:8453",
                "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                "expires_at": "2026-03-20T12:05:00Z",
            }
        }
        respx.post("https://api.telnyx.com/v2/x402/credit_account/quote").mock(
            return_value=httpx.Response(200, json=mock_response)
        )

        result_str = await core.run_tool_async("get_payment_quote", {"amount_usd": "50.00"})
        result = json.loads(result_str)
        assert result["data"]["id"] == "quote_abc123"
        assert result["data"]["amount_crypto"] == "50000000"

    @respx.mock
    @pytest.mark.asyncio
    async def test_submit_payment(self, core: ToolkitCore) -> None:
        mock_response = {
            "data": {
                "id": "txn_xyz789",
                "status": "settled",
                "amount_usd": "50.00",
            }
        }
        respx.post("https://api.telnyx.com/v2/x402/credit_account").mock(
            return_value=httpx.Response(200, json=mock_response)
        )

        result_str = await core.run_tool_async(
            "submit_payment",
            {"id": "quote_abc123", "payment_signature": "dGVzdA=="},
        )
        result = json.loads(result_str)
        assert result["data"]["status"] == "settled"

    @respx.mock
    @pytest.mark.asyncio
    async def test_get_payment_quote_validation_error(self, core: ToolkitCore) -> None:
        """ToolkitCore catches exceptions and returns error JSON."""
        mock_error = {
            "errors": [{"detail": "amount_usd must be between 5.00 and 10000.00"}]
        }
        respx.post("https://api.telnyx.com/v2/x402/credit_account/quote").mock(
            return_value=httpx.Response(422, json=mock_error)
        )

        result_str = await core.run_tool_async("get_payment_quote", {"amount_usd": "1.00"})
        result = json.loads(result_str)
        assert "error" in result
        assert "422" in result["error"]
