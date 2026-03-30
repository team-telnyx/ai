"""
CI Integration tests against real Telnyx API.
Requires TELNYX_API_KEY environment variable.

Naming convention:
- test_readonly_* — safe read-only tests (list, get, search)
- test_write_* — creates then deletes resources (cleanup in finally blocks)
"""

import os

import httpx
import pytest

TELNYX_API_KEY = os.environ.get("TELNYX_API_KEY", "")
BASE_URL = "https://api.telnyx.com/v2"
HEADERS = {
    "Authorization": f"Bearer {TELNYX_API_KEY}",
    "Content-Type": "application/json",
}

RESOURCE_PREFIX = "ci-integration-test-"  # Easy to identify and cleanup

pytestmark = pytest.mark.skipif(not TELNYX_API_KEY, reason="TELNYX_API_KEY not set")


class TestReadonly:
    """Read-only tests — zero side effects, zero cost."""

    def test_readonly_get_balance(self):
        """GET /v2/balance returns valid balance data."""
        r = httpx.get(f"{BASE_URL}/balance", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()["data"]
        assert "balance" in data
        assert "currency" in data
        assert data["currency"] == "USD"
        balance = float(data["balance"])
        assert isinstance(balance, float)

    def test_readonly_list_phone_numbers(self):
        """GET /v2/phone_numbers returns a list."""
        r = httpx.get(
            f"{BASE_URL}/phone_numbers", headers=HEADERS, params={"page[size]": 1}
        )
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert isinstance(data["data"], list)
        assert "meta" in data

    def test_readonly_list_messaging_profiles(self):
        """GET /v2/messaging_profiles returns a list."""
        r = httpx.get(
            f"{BASE_URL}/messaging_profiles",
            headers=HEADERS,
            params={"page[size]": 1},
        )
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert isinstance(data["data"], list)

    def test_readonly_list_connections(self):
        """GET /v2/credential_connections returns a list."""
        r = httpx.get(
            f"{BASE_URL}/credential_connections",
            headers=HEADERS,
            params={"page[size]": 1},
        )
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert isinstance(data["data"], list)

    def test_readonly_list_ai_assistants(self):
        """GET /v2/ai/assistants returns a list."""
        r = httpx.get(
            f"{BASE_URL}/ai/assistants", headers=HEADERS, params={"page[size]": 1}
        )
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert isinstance(data["data"], list)

    def test_readonly_list_ai_models(self):
        """GET /v2/ai/models returns available models."""
        r = httpx.get(f"{BASE_URL}/ai/models", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert len(data["data"]) > 0  # Should have at least one model

    def test_readonly_search_phone_numbers(self):
        """GET /v2/available_phone_numbers can search without buying."""
        r = httpx.get(
            f"{BASE_URL}/available_phone_numbers",
            headers=HEADERS,
            params={
                "filter[country_code]": "US",
                "filter[limit]": 1,
            },
        )
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert len(data["data"]) >= 1
        number = data["data"][0]
        assert "phone_number" in number

    def test_readonly_list_outbound_voice_profiles(self):
        """GET /v2/outbound_voice_profiles returns a list."""
        r = httpx.get(
            f"{BASE_URL}/outbound_voice_profiles",
            headers=HEADERS,
            params={"page[size]": 1},
        )
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert isinstance(data["data"], list)

    def test_readonly_list_messages(self):
        """GET /v2/messages returns a list (or 404 if no messages exist)."""
        r = httpx.get(
            f"{BASE_URL}/messages", headers=HEADERS, params={"page[size]": 1}
        )
        # The messages list endpoint may return 404 on accounts with no message history
        assert r.status_code in (200, 404), f"Unexpected status: {r.status_code}"
        if r.status_code == 200:
            data = r.json()
            assert "data" in data
            assert isinstance(data["data"], list)

    def test_readonly_ai_chat_completion(self):
        """POST /v2/ai/chat/completions works with a tiny request."""
        r = httpx.post(
            f"{BASE_URL}/ai/chat/completions",
            headers=HEADERS,
            json={
                "model": "meta-llama/Meta-Llama-3.1-8B-Instruct",
                "messages": [{"role": "user", "content": "Say OK"}],
                "max_tokens": 3,
            },
            timeout=30,
        )
        assert r.status_code == 200
        data = r.json()
        assert "choices" in data
        assert len(data["choices"]) > 0

    def test_readonly_ai_embeddings(self):
        """POST /v2/ai/generate_embeddings works (requires bucket_name)."""
        # Telnyx embeddings API requires a storage bucket — test that the
        # endpoint responds correctly when we provide known-bad params
        # (validates auth + endpoint existence, not full embedding flow)
        r = httpx.post(
            f"{BASE_URL}/ai/embeddings",
            headers=HEADERS,
            json={
                "model": "thenlper/gte-large",
                "bucket_name": "ci-nonexistent-bucket",
            },
            timeout=30,
        )
        # 400 (missing bucket) or 404 (bucket not found) both confirm
        # the endpoint is reachable and auth works
        assert r.status_code in (400, 404, 422), (
            f"Expected 400/404/422 for nonexistent bucket, got {r.status_code}"
        )

    def test_readonly_number_lookup(self):
        """GET /v2/number_lookup/:number works with a known number format."""
        r = httpx.get(f"{BASE_URL}/number_lookup/+18005551234", headers=HEADERS)
        # 200 or 404 both acceptable — we're testing the endpoint works, not the number
        assert r.status_code in (200, 404, 422)

    def test_readonly_list_sim_cards(self):
        """GET /v2/sim_cards returns a list."""
        r = httpx.get(
            f"{BASE_URL}/sim_cards", headers=HEADERS, params={"page[size]": 1}
        )
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert isinstance(data["data"], list)

    def test_readonly_list_verify_profiles(self):
        """GET /v2/verify/profiles returns a list or valid error."""
        r = httpx.get(
            f"{BASE_URL}/verify/profiles", headers=HEADERS, params={"page[size]": 1}
        )
        # Some accounts may not have verify access
        assert r.status_code in (200, 403, 404), (
            f"Expected 200/403/404, got {r.status_code}"
        )
        if r.status_code == 200:
            data = r.json()
            assert "data" in data
            assert isinstance(data["data"], list)

    def test_readonly_list_storage_buckets(self):
        """GET /v2/storage/buckets returns a list or valid error."""
        r = httpx.get(
            f"{BASE_URL}/storage/buckets", headers=HEADERS, params={"page[size]": 1}
        )
        # Storage may not be enabled on all accounts
        assert r.status_code in (200, 403, 404), (
            f"Expected 200/403/404, got {r.status_code}"
        )
        if r.status_code == 200:
            data = r.json()
            assert "data" in data
            assert isinstance(data["data"], list)

    def test_readonly_list_messages_with_meta(self):
        """GET /v2/messages verifies meta pagination shape when available."""
        r = httpx.get(
            f"{BASE_URL}/messages", headers=HEADERS, params={"page[size]": 1}
        )
        if r.status_code == 200:
            data = r.json()
            assert "data" in data
            assert "meta" in data

    # ─── New tools: 10DLC ────────────────────────────────────────

    def test_readonly_list_10dlc_brands(self):
        """GET /v2/10dlc/brands returns a list or valid error."""
        r = httpx.get(
            f"{BASE_URL}/10dlc/brands", headers=HEADERS, params={"page[size]": 1}
        )
        assert r.status_code in (200, 401, 403, 404), (
            f"Expected 200/401/403/404, got {r.status_code}"
        )
        if r.status_code == 200:
            data = r.json()
            assert "data" in data
            assert isinstance(data["data"], list)

    def test_readonly_list_10dlc_campaigns(self):
        """GET /v2/10dlc/campaigns returns a list or valid error."""
        r = httpx.get(
            f"{BASE_URL}/10dlc/campaigns", headers=HEADERS, params={"page[size]": 1}
        )
        assert r.status_code in (200, 401, 403, 404), (
            f"Expected 200/401/403/404, got {r.status_code}"
        )
        if r.status_code == 200:
            data = r.json()
            assert "data" in data
            assert isinstance(data["data"], list)

    # ─── New tools: IoT / Wireless ───────────────────────────────

    def test_readonly_list_sim_card_groups(self):
        """GET /v2/sim_card_groups returns a list."""
        r = httpx.get(
            f"{BASE_URL}/sim_card_groups", headers=HEADERS, params={"page[size]": 1}
        )
        assert r.status_code in (200, 403, 404), (
            f"Expected 200/403/404, got {r.status_code}"
        )
        if r.status_code == 200:
            data = r.json()
            assert "data" in data
            assert isinstance(data["data"], list)

    # ─── New tools: Porting ──────────────────────────────────────

    def test_readonly_list_porting_orders(self):
        """GET /v2/porting_orders returns a list or valid error."""
        r = httpx.get(
            f"{BASE_URL}/porting_orders", headers=HEADERS, params={"page[size]": 1}
        )
        assert r.status_code in (200, 401, 403, 404), (
            f"Expected 200/401/403/404, got {r.status_code}"
        )
        if r.status_code == 200:
            data = r.json()
            assert "data" in data
            assert isinstance(data["data"], list)

    # ─── New tools: E911 ─────────────────────────────────────────

    def test_readonly_list_e911_addresses(self):
        """GET /v2/e911_addresses returns a list or valid error."""
        r = httpx.get(
            f"{BASE_URL}/e911_addresses", headers=HEADERS, params={"page[size]": 1}
        )
        assert r.status_code in (200, 401, 403, 404), (
            f"Expected 200/401/403/404, got {r.status_code}"
        )
        if r.status_code == 200:
            data = r.json()
            assert "data" in data
            assert isinstance(data["data"], list)

    # ─── New tools: Billing ──────────────────────────────────────

    def test_readonly_list_billing_groups(self):
        """GET /v2/billing_groups returns a list."""
        r = httpx.get(
            f"{BASE_URL}/billing_groups", headers=HEADERS, params={"page[size]": 1}
        )
        assert r.status_code in (200, 401, 403, 404), (
            f"Expected 200/401/403/404, got {r.status_code}"
        )
        if r.status_code == 200:
            data = r.json()
            assert "data" in data
            assert isinstance(data["data"], list)

    # ─── New tools: Webhooks ─────────────────────────────────────

    def test_readonly_list_webhook_deliveries(self):
        """GET /v2/webhook_deliveries returns a list or valid error."""
        r = httpx.get(
            f"{BASE_URL}/webhook_deliveries", headers=HEADERS, params={"page[size]": 1}
        )
        assert r.status_code in (200, 401, 403, 404), (
            f"Expected 200/401/403/404, got {r.status_code}"
        )
        if r.status_code == 200:
            data = r.json()
            assert "data" in data
            assert isinstance(data["data"], list)

    # ─── New tools: Networking ───────────────────────────────────

    def test_readonly_list_networks(self):
        """GET /v2/networks returns a list or valid error."""
        r = httpx.get(
            f"{BASE_URL}/networks", headers=HEADERS, params={"page[size]": 1}
        )
        assert r.status_code in (200, 401, 403, 404), (
            f"Expected 200/401/403/404, got {r.status_code}"
        )
        if r.status_code == 200:
            data = r.json()
            assert "data" in data
            assert isinstance(data["data"], list)

    # ─── New tools: Fax ──────────────────────────────────────────

    def test_readonly_list_faxes(self):
        """GET /v2/faxes returns a list or valid error."""
        r = httpx.get(
            f"{BASE_URL}/faxes", headers=HEADERS, params={"page[size]": 1}
        )
        assert r.status_code in (200, 401, 403, 404), (
            f"Expected 200/401/403/404, got {r.status_code}"
        )
        if r.status_code == 200:
            data = r.json()
            assert "data" in data
            assert isinstance(data["data"], list)


class TestWrite:
    """Write tests — creates and immediately deletes resources.

    Every test cleans up after itself in a finally block.
    Resources are prefixed with 'ci-integration-test-' for identification.
    """

    def test_write_messaging_profile_lifecycle(self):
        """Create → verify → delete messaging profile."""
        profile_id = None
        try:
            # Create
            r = httpx.post(
                f"{BASE_URL}/messaging_profiles",
                headers=HEADERS,
                json={
                    "name": f"{RESOURCE_PREFIX}messaging-profile",
                    "whitelisted_destinations": ["US"],
                },
            )
            assert r.status_code in (200, 201), (
                f"Create failed: {r.status_code} {r.text}"
            )
            data = r.json()["data"]
            profile_id = data["id"]
            assert data["name"] == f"{RESOURCE_PREFIX}messaging-profile"

            # Verify it exists
            r2 = httpx.get(
                f"{BASE_URL}/messaging_profiles/{profile_id}", headers=HEADERS
            )
            assert r2.status_code == 200
            assert r2.json()["data"]["id"] == profile_id

        finally:
            if profile_id:
                httpx.delete(
                    f"{BASE_URL}/messaging_profiles/{profile_id}", headers=HEADERS
                )

    def test_write_credential_connection_lifecycle(self):
        """Create → verify → delete credential connection."""
        conn_id = None
        try:
            r = httpx.post(
                f"{BASE_URL}/credential_connections",
                headers=HEADERS,
                json={
                    "connection_name": f"{RESOURCE_PREFIX}connection",
                    "user_name": "citestuser",
                    "password": "CiT3st1Pass99",
                },
            )
            assert r.status_code in (200, 201), (
                f"Create failed: {r.status_code} {r.text}"
            )
            data = r.json()["data"]
            conn_id = data["id"]
            assert f"{RESOURCE_PREFIX}connection" in data.get(
                "connection_name", data.get("name", "")
            )

            # Verify
            r2 = httpx.get(
                f"{BASE_URL}/credential_connections/{conn_id}", headers=HEADERS
            )
            assert r2.status_code == 200

        finally:
            if conn_id:
                httpx.delete(
                    f"{BASE_URL}/credential_connections/{conn_id}", headers=HEADERS
                )

    def test_write_ai_assistant_lifecycle(self):
        """Create → verify → update → delete AI assistant."""
        assistant_id = None
        try:
            r = httpx.post(
                f"{BASE_URL}/ai/assistants",
                headers=HEADERS,
                json={
                    "name": f"{RESOURCE_PREFIX}assistant",
                    "instructions": "You are a test assistant. Say 'integration test passed' to any input.",
                    "model": "Qwen/Qwen3-235B-A22B",
                },
            )
            assert r.status_code in (200, 201), (
                f"Create failed: {r.status_code} {r.text}"
            )
            # AI assistants endpoint returns object directly (no "data" wrapper)
            body = r.json()
            data = body.get("data", body)
            assistant_id = data["id"]
            assert data["name"] == f"{RESOURCE_PREFIX}assistant"

            # Verify
            r2 = httpx.get(
                f"{BASE_URL}/ai/assistants/{assistant_id}", headers=HEADERS
            )
            assert r2.status_code == 200

            # Update
            r3 = httpx.patch(
                f"{BASE_URL}/ai/assistants/{assistant_id}",
                headers=HEADERS,
                json={
                    "name": f"{RESOURCE_PREFIX}assistant-updated",
                },
            )
            assert r3.status_code == 200
            body3 = r3.json()
            data3 = body3.get("data", body3)
            assert (
                data3["name"] == f"{RESOURCE_PREFIX}assistant-updated"
            )

        finally:
            if assistant_id:
                httpx.delete(
                    f"{BASE_URL}/ai/assistants/{assistant_id}", headers=HEADERS
                )

    def test_write_outbound_voice_profile_lifecycle(self):
        """Create → verify → delete outbound voice profile."""
        profile_id = None
        try:
            r = httpx.post(
                f"{BASE_URL}/outbound_voice_profiles",
                headers=HEADERS,
                json={
                    "name": f"{RESOURCE_PREFIX}voice-profile",
                },
            )
            assert r.status_code in (200, 201), (
                f"Create failed: {r.status_code} {r.text}"
            )
            data = r.json()["data"]
            profile_id = data["id"]

            # Verify
            r2 = httpx.get(
                f"{BASE_URL}/outbound_voice_profiles/{profile_id}", headers=HEADERS
            )
            assert r2.status_code == 200

        finally:
            if profile_id:
                httpx.delete(
                    f"{BASE_URL}/outbound_voice_profiles/{profile_id}", headers=HEADERS
                )


    def test_write_billing_group_lifecycle(self):
        """Create → verify → delete billing group."""
        group_id = None
        try:
            r = httpx.post(
                f"{BASE_URL}/billing_groups",
                headers=HEADERS,
                json={"name": f"{RESOURCE_PREFIX}billing-group"},
            )
            assert r.status_code in (200, 201), (
                f"Create failed: {r.status_code} {r.text}"
            )
            data = r.json()["data"]
            group_id = data["id"]
            assert f"{RESOURCE_PREFIX}billing-group" in data.get("name", "")

            # Verify it exists
            r2 = httpx.get(
                f"{BASE_URL}/billing_groups/{group_id}", headers=HEADERS
            )
            assert r2.status_code == 200

        finally:
            if group_id:
                httpx.delete(
                    f"{BASE_URL}/billing_groups/{group_id}", headers=HEADERS
                )

    def test_write_verify_profile_lifecycle(self):
        """Create → verify → delete verify profile."""
        profile_id = None
        try:
            r = httpx.post(
                f"{BASE_URL}/verify/profiles",
                headers=HEADERS,
                json={"name": f"{RESOURCE_PREFIX}verify-profile"},
            )
            if r.status_code in (403, 404):
                pytest.skip("Verify not available on this account")
            assert r.status_code in (200, 201), (
                f"Create failed: {r.status_code} {r.text}"
            )
            data = r.json()["data"]
            profile_id = data["id"]

            # Verify it exists
            r2 = httpx.get(
                f"{BASE_URL}/verify/profiles/{profile_id}", headers=HEADERS
            )
            assert r2.status_code == 200

        finally:
            if profile_id:
                httpx.delete(
                    f"{BASE_URL}/verify/profiles/{profile_id}", headers=HEADERS
                )

    def test_write_storage_bucket_lifecycle(self):
        """Create → list → delete storage bucket (if storage available)."""
        import time

        bucket_name = f"{RESOURCE_PREFIX}bucket-{int(time.time())}"
        try:
            # Create
            r = httpx.post(
                f"{BASE_URL}/storage/buckets",
                headers=HEADERS,
                json={"name": bucket_name},
            )
            if r.status_code in (403, 404):
                pytest.skip("Storage not available on this account")
            assert r.status_code in (200, 201), (
                f"Create failed: {r.status_code} {r.text}"
            )

            # List and verify
            r2 = httpx.get(
                f"{BASE_URL}/storage/buckets",
                headers=HEADERS,
                params={"page[size]": 100},
            )
            assert r2.status_code == 200
            buckets = r2.json()["data"]
            assert any(b["name"] == bucket_name for b in buckets), (
                f"Bucket {bucket_name} not found in list"
            )

        finally:
            httpx.delete(
                f"{BASE_URL}/storage/buckets/{bucket_name}", headers=HEADERS
            )


class TestWriteNumberLifecycle:
    """Tests that buy phone numbers and clean up. Costs real money but validates the full flow."""

    def test_write_buy_number_and_release(self):
        """Search → buy → verify exists → release number."""
        import time

        phone_number_id = None
        try:
            # Search for multiple cheap US numbers (in case some are already owned)
            r = httpx.get(
                f"{BASE_URL}/available_phone_numbers",
                headers=HEADERS,
                params={
                    "filter[country_code]": "US",
                    "filter[features][]": "sms",
                    "filter[phone_number_type]": "local",
                    "filter[limit]": 5,
                },
            )
            assert r.status_code == 200, f"Search failed: {r.text}"
            numbers = r.json()["data"]
            assert len(numbers) >= 1, "No numbers available"

            # Try each number until one succeeds (409 = already owned, skip it)
            r2 = None
            phone_number = None
            for num in numbers:
                phone_number = num["phone_number"]
                r2 = httpx.post(
                    f"{BASE_URL}/number_orders",
                    headers=HEADERS,
                    json={"phone_numbers": [{"phone_number": phone_number}]},
                )
                if r2.status_code in (200, 201):
                    break
                if r2.status_code == 409:
                    continue  # Already owned, try next
                if r2.status_code == 402:
                    pytest.skip("Insufficient balance to buy numbers (402)")
                if r2.status_code == 429:
                    # Rate limited — wait and retry
                    import time
                    retry_after = int(r2.headers.get("retry-after", "5"))
                    time.sleep(retry_after)
                    r2 = httpx.post(
                        f"{BASE_URL}/number_orders",
                        headers=HEADERS,
                        json={"phone_numbers": [{"phone_number": phone_number}]},
                    )
                    if r2.status_code in (200, 201):
                        break
                    if r2.status_code == 409:
                        continue
                    if r2.status_code == 402:
                        pytest.skip("Insufficient balance to buy numbers (402)")
                pytest.fail(f"Unexpected order error: {r2.status_code} {r2.text}")
            assert r2 is not None and r2.status_code in (200, 201), f"All {len(numbers)} numbers already owned or failed"
            order_id = r2.json()["data"]["id"]

            # Poll order until success (max 30s)
            for _ in range(20):
                time.sleep(1.5)
                r3 = httpx.get(f"{BASE_URL}/number_orders/{order_id}", headers=HEADERS)
                if r3.status_code == 200:
                    status = r3.json()["data"]["status"]
                    if status == "success":
                        break
                    if status == "failed":
                        pytest.fail(f"Number order failed: {r3.text}")

            # Resolve the phone number resource ID
            for _ in range(5):
                r4 = httpx.get(
                    f"{BASE_URL}/phone_numbers",
                    headers=HEADERS,
                    params={"filter[phone_number]": phone_number, "page[size]": 1},
                )
                if r4.status_code == 200 and r4.json()["data"]:
                    phone_number_id = r4.json()["data"][0]["id"]
                    break
                time.sleep(1)

            assert phone_number_id, f"Could not resolve phone number ID for {phone_number}"

            # Verify it exists
            r5 = httpx.get(f"{BASE_URL}/phone_numbers/{phone_number_id}", headers=HEADERS)
            assert r5.status_code == 200

        finally:
            # Release the number
            if phone_number_id:
                httpx.delete(f"{BASE_URL}/phone_numbers/{phone_number_id}", headers=HEADERS)

    def test_write_full_sms_setup_and_teardown(self):
        """Full setup-sms flow: profile → buy number → assign → verify → teardown."""
        import time

        profile_id = None
        phone_number_id = None
        try:
            # Create messaging profile
            r = httpx.post(
                f"{BASE_URL}/messaging_profiles",
                headers=HEADERS,
                json={"name": f"{RESOURCE_PREFIX}sms-e2e-profile", "whitelisted_destinations": ["US"]},
            )
            assert r.status_code in (200, 201)
            profile_id = r.json()["data"]["id"]

            # Search for number
            r2 = httpx.get(
                f"{BASE_URL}/available_phone_numbers",
                headers=HEADERS,
                params={
                    "filter[country_code]": "US",
                    "filter[features][]": "sms",
                    "filter[limit]": 1,
                },
            )
            assert r2.status_code == 200
            phone_number = r2.json()["data"][0]["phone_number"]

            # Buy it (with 429 retry)
            r3 = httpx.post(
                f"{BASE_URL}/number_orders",
                headers=HEADERS,
                json={"phone_numbers": [{"phone_number": phone_number}]},
            )
            if r3.status_code == 429:
                retry_after = int(r3.headers.get("retry-after", "5"))
                time.sleep(retry_after)
                r3 = httpx.post(
                    f"{BASE_URL}/number_orders",
                    headers=HEADERS,
                    json={"phone_numbers": [{"phone_number": phone_number}]},
                )
            if r3.status_code == 402:
                pytest.skip("Insufficient balance to buy numbers (402)")
            assert r3.status_code in (200, 201), f"Order failed: {r3.status_code} {r3.text}"
            order_id = r3.json()["data"]["id"]

            # Poll until success
            for _ in range(20):
                time.sleep(1.5)
                poll = httpx.get(f"{BASE_URL}/number_orders/{order_id}", headers=HEADERS)
                if poll.status_code == 200 and poll.json()["data"]["status"] == "success":
                    break

            # Resolve phone number ID
            for _ in range(5):
                r4 = httpx.get(
                    f"{BASE_URL}/phone_numbers",
                    headers=HEADERS,
                    params={"filter[phone_number]": phone_number, "page[size]": 1},
                )
                if r4.status_code == 200 and r4.json()["data"]:
                    phone_number_id = r4.json()["data"][0]["id"]
                    break
                time.sleep(1)

            assert phone_number_id, "Could not resolve phone number ID"

            # Assign to messaging profile
            r5 = httpx.patch(
                f"{BASE_URL}/phone_numbers/{phone_number_id}/messaging",
                headers=HEADERS,
                json={"messaging_profile_id": profile_id},
            )
            assert r5.status_code == 200, f"Assign failed: {r5.text}"

            # Verify assignment
            r6 = httpx.get(f"{BASE_URL}/phone_numbers/{phone_number_id}", headers=HEADERS)
            assert r6.status_code == 200

        finally:
            if phone_number_id:
                httpx.delete(f"{BASE_URL}/phone_numbers/{phone_number_id}", headers=HEADERS)
            if profile_id:
                httpx.delete(f"{BASE_URL}/messaging_profiles/{profile_id}", headers=HEADERS)


class TestSDKIntegration:
    """Test the actual SDK classes work against real API."""

    def test_sdk_toolkit_get_balance(self):
        """ToolkitCore.run_tool('get_balance') works."""
        from telnyx_agent_toolkit.shared.api_client import TelnyxAPIClient
        from telnyx_agent_toolkit.shared.toolkit_core import ToolkitCore

        client = TelnyxAPIClient(api_key=TELNYX_API_KEY)
        core = ToolkitCore(client=client)
        result = core.run_tool("get_balance", {})
        assert "balance" in result or "data" in result

    def test_sdk_toolkit_list_phone_numbers(self):
        """ToolkitCore.run_tool('list_phone_numbers') works."""
        from telnyx_agent_toolkit.shared.api_client import TelnyxAPIClient
        from telnyx_agent_toolkit.shared.toolkit_core import ToolkitCore

        client = TelnyxAPIClient(api_key=TELNYX_API_KEY)
        core = ToolkitCore(client=client)
        result = core.run_tool("list_phone_numbers", {"page_size": 1})
        assert "data" in result

    def test_sdk_openai_tools_format(self):
        """OpenAI adapter produces valid tool schemas."""
        from telnyx_agent_toolkit import TelnyxAgentToolkit

        toolkit = TelnyxAgentToolkit(api_key=TELNYX_API_KEY)
        tools = toolkit.get_openai_tools()
        assert len(tools) > 0
        for tool in tools:
            assert tool["type"] == "function"
            assert "function" in tool
            assert "name" in tool["function"]
            assert "description" in tool["function"]
            assert "parameters" in tool["function"]
