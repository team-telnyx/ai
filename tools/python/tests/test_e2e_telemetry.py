"""E2E telemetry tests — exercises the SDK toolkit to trigger real telemetry/friction reports.

Run with: TELNYX_API_KEY=... RUN_WRITE_TESTS=true pytest tests/test_e2e_telemetry.py -v -s

These tests use TelnyxAgentToolkit.run_tool() (not raw HTTP) so telemetry and friction
reporters fire against the deployed endpoints.
"""

from __future__ import annotations

import json
import os
import time
import unittest

API_KEY = os.environ.get("TELNYX_API_KEY", "")
RUN = bool(API_KEY)


@unittest.skipUnless(RUN, "TELNYX_API_KEY not set")
class TestE2ETelemetry(unittest.TestCase):
    """Exercises SDK tools through run_tool() to generate telemetry events."""

    @classmethod
    def setUpClass(cls):
        from telnyx_agent_toolkit import TelnyxAgentToolkit
        # Telemetry + friction both enabled by default (point at deployed services)
        cls.toolkit = TelnyxAgentToolkit(api_key=API_KEY)

    def _run(self, tool: str, args: dict | None = None):
        """Sync wrapper for run_tool."""
        import asyncio
        return asyncio.get_event_loop().run_until_complete(
            self.toolkit.run_tool(tool, args or {})
        )

    def test_get_balance_telemetry(self):
        """Should generate a success telemetry event."""
        result = json.loads(self._run("get_balance"))
        self.assertIn("balance", result.get("data", result))
        print(f"✅ get_balance → telemetry sent")

    def test_list_phone_numbers_telemetry(self):
        """Should generate a success telemetry event."""
        result = json.loads(self._run("list_phone_numbers", {"page_size": 1}))
        self.assertIn("data", result)
        print(f"✅ list_phone_numbers → telemetry sent")

    def test_list_messaging_profiles_telemetry(self):
        result = json.loads(self._run("list_messaging_profiles", {"page_size": 1}))
        self.assertIn("data", result)
        print(f"✅ list_messaging_profiles → telemetry sent")

    def test_list_connections_telemetry(self):
        result = json.loads(self._run("list_connections", {"page_size": 1}))
        self.assertIn("data", result)
        print(f"✅ list_connections → telemetry sent")

    def test_list_ai_assistants_telemetry(self):
        result = json.loads(self._run("list_ai_assistants", {"page_size": 1}))
        self.assertIn("data", result)
        print(f"✅ list_ai_assistants → telemetry sent")

    def test_invalid_tool_telemetry(self):
        """Should generate an error telemetry event for unknown tool."""
        result = json.loads(self._run("nonexistent_tool"))
        self.assertIn("error", result)
        print(f"✅ nonexistent_tool → error telemetry sent")

    def test_lookup_triggers_friction(self):
        """Lookup with invalid number should generate a friction event (4xx)."""
        result = json.loads(self._run("lookup_number", {"phone_number": "+0000000000"}))
        # Whether it fails or not, telemetry fires
        print(f"✅ lookup_number (bad input) → telemetry + possible friction sent")

    @classmethod
    def tearDownClass(cls):
        """Wait briefly for fire-and-forget telemetry threads to complete."""
        print("\n⏳ Waiting 2s for background telemetry threads...")
        time.sleep(2)
        print("Done. Check Grafana: {app=\"aifde-telemetry\"} | json")


if __name__ == "__main__":
    unittest.main()
