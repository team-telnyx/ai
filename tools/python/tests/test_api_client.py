"""Tests for the Telnyx API client."""

import pytest
import httpx
import respx

from telnyx_agent_toolkit.shared.api_client import TelnyxAPIClient, TelnyxAPIError


@pytest.fixture
def client() -> TelnyxAPIClient:
    return TelnyxAPIClient(api_key="test-key-123", base_url="https://api.telnyx.com/v2")


class TestTelnyxAPIClient:
    def test_headers(self, client: TelnyxAPIClient) -> None:
        headers = client._get_headers()
        assert headers["Authorization"] == "Bearer test-key-123"
        assert headers["Content-Type"] == "application/json"
        assert headers["Accept"] == "application/json"

    @respx.mock
    @pytest.mark.asyncio
    async def test_get_async_success(self, client: TelnyxAPIClient) -> None:
        respx.get("https://api.telnyx.com/v2/balance").mock(
            return_value=httpx.Response(200, json={"data": {"balance": "100.00", "currency": "USD"}})
        )
        result = await client.get_async("/balance")
        assert result["data"]["balance"] == "100.00"

    @respx.mock
    @pytest.mark.asyncio
    async def test_get_async_with_params(self, client: TelnyxAPIClient) -> None:
        route = respx.get("https://api.telnyx.com/v2/phone_numbers").mock(
            return_value=httpx.Response(200, json={"data": []})
        )
        await client.get_async("/phone_numbers", params={"page[size]": 10})
        assert route.called

    @respx.mock
    @pytest.mark.asyncio
    async def test_post_async_success(self, client: TelnyxAPIClient) -> None:
        respx.post("https://api.telnyx.com/v2/messages").mock(
            return_value=httpx.Response(200, json={"data": {"id": "msg-123"}})
        )
        result = await client.post_async("/messages", json={"to": "+1234", "text": "Hello"})
        assert result["data"]["id"] == "msg-123"

    @respx.mock
    @pytest.mark.asyncio
    async def test_api_error(self, client: TelnyxAPIClient) -> None:
        respx.get("https://api.telnyx.com/v2/balance").mock(
            return_value=httpx.Response(
                401,
                json={"errors": [{"detail": "Invalid API key", "code": "10001"}]},
            )
        )
        with pytest.raises(TelnyxAPIError) as exc_info:
            await client.get_async("/balance")
        assert exc_info.value.status_code == 401
        assert "Invalid API key" in exc_info.value.detail

    @respx.mock
    @pytest.mark.asyncio
    async def test_api_error_non_json(self, client: TelnyxAPIClient) -> None:
        respx.get("https://api.telnyx.com/v2/balance").mock(
            return_value=httpx.Response(500, text="Internal Server Error")
        )
        with pytest.raises(TelnyxAPIError) as exc_info:
            await client.get_async("/balance")
        assert exc_info.value.status_code == 500

    @respx.mock
    @pytest.mark.asyncio
    async def test_delete_async(self, client: TelnyxAPIClient) -> None:
        respx.delete("https://api.telnyx.com/v2/phone_numbers/123").mock(
            return_value=httpx.Response(204)
        )
        result = await client.delete_async("/phone_numbers/123")
        assert result == {}

    @respx.mock
    @pytest.mark.asyncio
    async def test_close(self, client: TelnyxAPIClient) -> None:
        respx.get("https://api.telnyx.com/v2/balance").mock(
            return_value=httpx.Response(200, json={"data": {}})
        )
        await client.get_async("/balance")  # Force client creation
        await client.close()

    @respx.mock
    def test_sync_get(self, client: TelnyxAPIClient) -> None:
        respx.get("https://api.telnyx.com/v2/balance").mock(
            return_value=httpx.Response(200, json={"data": {"balance": "50.00"}})
        )
        result = client.get("/balance")
        assert result["data"]["balance"] == "50.00"

    @respx.mock
    def test_sync_post(self, client: TelnyxAPIClient) -> None:
        respx.post("https://api.telnyx.com/v2/messages").mock(
            return_value=httpx.Response(200, json={"data": {"id": "msg-456"}})
        )
        result = client.post("/messages", json={"to": "+1234", "text": "Test"})
        assert result["data"]["id"] == "msg-456"
