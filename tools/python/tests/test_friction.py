"""Tests for the friction reporter."""

import json
from unittest.mock import patch, MagicMock

import pytest

from telnyx_agent_toolkit.shared.friction import FrictionReporter, DEFAULT_FRICTION_ENDPOINT


class TestFrictionReporter:
    """Test FrictionReporter behavior."""

    def test_enabled_by_default(self):
        reporter = FrictionReporter()
        assert reporter.enabled is True

    def test_disabled_via_constructor(self):
        reporter = FrictionReporter(enabled=False)
        assert reporter.enabled is False

    def test_disabled_via_env(self):
        with patch.dict("os.environ", {"TELNYX_FRICTION_ENABLED": "false"}):
            reporter = FrictionReporter()
            assert reporter.enabled is False

    def test_custom_endpoint(self):
        reporter = FrictionReporter(endpoint="http://custom:3000/v2/friction")
        assert reporter._endpoint == "http://custom:3000/v2/friction"

    def test_rejects_file_scheme(self):
        reporter = FrictionReporter(endpoint="file:///etc/passwd")
        assert reporter._endpoint == DEFAULT_FRICTION_ENDPOINT

    def test_severity_5xx_is_blocker(self):
        """5xx errors should be reported as blocker severity."""
        reporter = FrictionReporter(enabled=True)
        with patch("telnyx_agent_toolkit.shared.friction.threading.Thread") as mock_thread:
            mock_thread.return_value = MagicMock()
            reporter.report(
                tool="test_tool",
                http_status=500,
                http_method="POST",
                api_path="/v2/test",
                error_message="internal error",
                api_key="test_key",
            )
            mock_thread.assert_called_once()
            call_args = mock_thread.call_args
            payload = call_args[1]["args"][0]
            assert payload["severity"] == "blocker"
            assert payload["type"] == "api"

    def test_severity_4xx_is_major(self):
        """4xx errors should be reported as major severity."""
        reporter = FrictionReporter(enabled=True)
        with patch("telnyx_agent_toolkit.shared.friction.threading.Thread") as mock_thread:
            mock_thread.return_value = MagicMock()
            reporter.report(
                tool="test_tool",
                http_status=422,
                http_method="POST",
                api_path="/v2/test",
                error_message="validation error",
                api_key="test_key",
            )
            payload = mock_thread.call_args[1]["args"][0]
            assert payload["severity"] == "major"
            assert payload["type"] == "api"

    def test_type_auth_for_401(self):
        """401 errors should be reported as auth type."""
        reporter = FrictionReporter(enabled=True)
        with patch("telnyx_agent_toolkit.shared.friction.threading.Thread") as mock_thread:
            mock_thread.return_value = MagicMock()
            reporter.report(
                tool="test_tool",
                http_status=401,
                http_method="GET",
                api_path="/v2/test",
                error_message="unauthorized",
                api_key="test_key",
            )
            payload = mock_thread.call_args[1]["args"][0]
            assert payload["type"] == "auth"
            assert payload["severity"] == "major"

    def test_type_auth_for_403(self):
        """403 errors should be reported as auth type."""
        reporter = FrictionReporter(enabled=True)
        with patch("telnyx_agent_toolkit.shared.friction.threading.Thread") as mock_thread:
            mock_thread.return_value = MagicMock()
            reporter.report(
                tool="test_tool",
                http_status=403,
                http_method="GET",
                api_path="/v2/test",
                error_message="forbidden",
                api_key="test_key",
            )
            payload = mock_thread.call_args[1]["args"][0]
            assert payload["type"] == "auth"

    def test_no_report_when_disabled(self):
        """Should not fire when disabled."""
        reporter = FrictionReporter(enabled=False)
        with patch("telnyx_agent_toolkit.shared.friction.threading.Thread") as mock_thread:
            reporter.report(
                tool="test_tool",
                http_status=500,
                http_method="POST",
                api_path="/v2/test",
                error_message="error",
                api_key="test_key",
            )
            mock_thread.assert_not_called()

    def test_send_failure_swallowed(self):
        """HTTP failures in _send must never propagate."""
        reporter = FrictionReporter(enabled=True)
        with patch("telnyx_agent_toolkit.shared.friction.urllib.request.urlopen") as mock_urlopen:
            mock_urlopen.side_effect = Exception("connection refused")
            # Calling _send directly to test error handling
            reporter._send({"test": "payload"}, "test_key")
            # No exception raised — test passes

    def test_payload_structure(self):
        """Verify the full payload structure sent to the backend."""
        reporter = FrictionReporter(enabled=True)
        with patch("telnyx_agent_toolkit.shared.friction.threading.Thread") as mock_thread:
            mock_thread.return_value = MagicMock()
            reporter.report(
                tool="buy_phone_number",
                http_status=409,
                http_method="POST",
                api_path="/v2/number_orders",
                error_message="number already owned",
                api_key="KEY_test",
            )
            payload = mock_thread.call_args[1]["args"][0]
            assert payload["skill"] == "telnyx-agent-toolkit"
            assert payload["team"] == "agent-portal"
            assert payload["language"] == "python"
            assert payload["message"] == "409 on POST /v2/number_orders: number already owned"
            assert payload["context"]["tool"] == "buy_phone_number"
            assert payload["context"]["sdk"] == "python"
