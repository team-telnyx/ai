"""Fire-and-forget telemetry reporter for agent tool invocations."""

from __future__ import annotations

import json
import logging
import os
import threading
import time
import urllib.request
from typing import Any

logger = logging.getLogger(__name__)


class TelemetryReporter:
    """Reports tool invocation telemetry to the FFL backend.

    Completely non-blocking: fires HTTP POST in a daemon thread.
    Never raises exceptions — all errors are silently swallowed.
    Disabled by default; enable via endpoint URL.
    """

    def __init__(self, endpoint: str | None = None) -> None:
        raw = endpoint or os.environ.get("TELNYX_TELEMETRY_ENDPOINT") or ""
        # Validate URL scheme to prevent file:// reads (semgrep: urllib-dynamic-url)
        if raw and not raw.startswith(("http://", "https://")):
            raw = None
        self._endpoint = raw

    @property
    def enabled(self) -> bool:
        return bool(self._endpoint)

    def report(
        self,
        *,
        tool: str,
        status: str,
        duration_ms: int,
        http_status: int,
        http_method: str,
        api_path: str,
        error_message: str | None = None,
        context: dict[str, Any] | None = None,
    ) -> None:
        """Fire telemetry event in a background thread. Never blocks or raises."""
        if not self._endpoint:
            return

        payload = {
            "tool": tool,
            "status": status,
            "duration_ms": duration_ms,
            "http_status": http_status,
            "http_method": http_method,
            "api_path": api_path,
            "sdk": "python",
        }

        if error_message is not None:
            payload["error_message"] = error_message
        if context is not None:
            payload["context"] = context

        thread = threading.Thread(
            target=self._send,
            args=(payload,),
            daemon=True,
        )
        thread.start()

    def _send(self, payload: dict[str, Any]) -> None:
        """Send telemetry payload. Swallows all exceptions."""
        try:
            endpoint = self._endpoint
            if not endpoint or not endpoint.startswith(("http://", "https://")):  # nosemgrep: dynamic-urllib-use-detected
                return
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                endpoint,
                data=data,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            urllib.request.urlopen(req, timeout=5)  # nosemgrep: dynamic-urllib-use-detected
        except Exception:
            # Telemetry must never interfere with the actual API call
            pass
