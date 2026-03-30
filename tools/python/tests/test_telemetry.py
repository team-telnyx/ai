"""Tests for the telemetry reporter."""

import json
import threading
import time
from unittest.mock import MagicMock, patch

import pytest

from telnyx_agent_toolkit.shared.telemetry import TelemetryReporter


class TestTelemetryReporter:
    def test_disabled_by_default(self) -> None:
        reporter = TelemetryReporter()
        assert not reporter.enabled

    def test_enabled_with_endpoint(self) -> None:
        reporter = TelemetryReporter(endpoint="http://localhost:3000/v2/telemetry")
        assert reporter.enabled

    def test_enabled_via_env_var(self) -> None:
        with patch.dict("os.environ", {"TELNYX_TELEMETRY_ENDPOINT": "http://localhost:3000/v2/telemetry"}):
            reporter = TelemetryReporter()
            assert reporter.enabled

    def test_report_does_nothing_when_disabled(self) -> None:
        reporter = TelemetryReporter()
        # Should not raise
        reporter.report(
            tool="test_tool",
            status="success",
            duration_ms=100,
            http_status=200,
            http_method="GET",
            api_path="/v2/test",
        )

    @patch("urllib.request.urlopen")
    def test_report_fires_on_success(self, mock_urlopen: MagicMock) -> None:
        mock_urlopen.return_value = MagicMock()
        reporter = TelemetryReporter(endpoint="http://localhost:3000/v2/telemetry")

        reporter.report(
            tool="buy_phone_number",
            status="success",
            duration_ms=1230,
            http_status=200,
            http_method="POST",
            api_path="/v2/number_orders",
        )

        # Wait for background thread to complete
        time.sleep(0.5)

        mock_urlopen.assert_called_once()
        call_args = mock_urlopen.call_args
        request = call_args[0][0]
        payload = json.loads(request.data.decode("utf-8"))

        assert payload["tool"] == "buy_phone_number"
        assert payload["status"] == "success"
        assert payload["duration_ms"] == 1230
        assert payload["http_status"] == 200
        assert payload["http_method"] == "POST"
        assert payload["api_path"] == "/v2/number_orders"
        assert payload["sdk"] == "python"

    @patch("urllib.request.urlopen")
    def test_report_fires_on_error(self, mock_urlopen: MagicMock) -> None:
        mock_urlopen.return_value = MagicMock()
        reporter = TelemetryReporter(endpoint="http://localhost:3000/v2/telemetry")

        reporter.report(
            tool="send_sms",
            status="error",
            duration_ms=500,
            http_status=422,
            http_method="POST",
            api_path="/v2/messages",
            error_message="Invalid phone number",
        )

        time.sleep(0.5)

        mock_urlopen.assert_called_once()
        call_args = mock_urlopen.call_args
        request = call_args[0][0]
        payload = json.loads(request.data.decode("utf-8"))

        assert payload["status"] == "error"
        assert payload["error_message"] == "Invalid phone number"

    @patch("urllib.request.urlopen")
    def test_report_swallows_exceptions(self, mock_urlopen: MagicMock) -> None:
        mock_urlopen.side_effect = Exception("Connection refused")
        reporter = TelemetryReporter(endpoint="http://localhost:3000/v2/telemetry")

        # Should not raise
        reporter.report(
            tool="test_tool",
            status="success",
            duration_ms=100,
            http_status=200,
            http_method="GET",
            api_path="/v2/test",
        )

        # Wait for background thread
        time.sleep(0.5)

        # Exception was raised inside _send but swallowed
        mock_urlopen.assert_called_once()
