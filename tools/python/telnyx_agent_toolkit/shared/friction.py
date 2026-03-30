"""Fire-and-forget friction reporter for API error detection."""

from __future__ import annotations

import json
import logging
import os
import threading
import urllib.request
from typing import Any

logger = logging.getLogger(__name__)

DEFAULT_FRICTION_ENDPOINT = ""


class FrictionReporter:
    """Reports API friction events to the FFL backend.

    Completely non-blocking: fires HTTP POST in a daemon thread.
    Never raises exceptions — all errors are silently swallowed.
    Enabled by default (the FFL endpoint is already live).
    """

    def __init__(self, endpoint: str | None = None, enabled: bool | None = None) -> None:
        raw = endpoint or os.environ.get("TELNYX_FRICTION_ENDPOINT") or DEFAULT_FRICTION_ENDPOINT
        # Validate URL scheme to prevent file:// reads (semgrep: urllib-dynamic-url)
        if not raw.startswith(("http://", "https://")):
            raw = DEFAULT_FRICTION_ENDPOINT
        self._endpoint = raw

        if enabled is not None:
            self._enabled = enabled
        else:
            env_val = os.environ.get("TELNYX_FRICTION_ENABLED", "true").lower()
            self._enabled = env_val not in ("false", "0", "no")

    @property
    def enabled(self) -> bool:
        return self._enabled

    def report(
        self,
        *,
        tool: str,
        http_status: int,
        http_method: str,
        api_path: str,
        error_message: str,
        api_key: str,
    ) -> None:
        """Fire friction event in a background thread. Never blocks or raises."""
        if not self._enabled:
            return

        friction_type = "auth" if http_status in (401, 403) else "api"
        if http_status >= 500:
            severity = "blocker"
        else:
            severity = "major"

        payload: dict[str, Any] = {
            "skill": "telnyx-agent-toolkit",
            "team": "agent-portal",
            "type": friction_type,
            "severity": severity,
            "message": f"{http_status} on {http_method} {api_path}: {error_message}",
            "language": "python",
            "context": {
                "tool": tool,
                "http_status": http_status,
                "http_method": http_method,
                "api_path": api_path,
                "error_detail": error_message,
                "sdk": "python",
                "sdk_version": "0.1.0",
            },
        }

        thread = threading.Thread(
            target=self._send,
            args=(payload, api_key),
            daemon=True,
        )
        thread.start()

    def _send(self, payload: dict[str, Any], api_key: str) -> None:
        """Send friction payload. Swallows all exceptions."""
        try:
            endpoint = self._endpoint
            if not endpoint or not endpoint.startswith(("http://", "https://")):  # nosemgrep: dynamic-urllib-use-detected
                return
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                endpoint,
                data=data,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                method="POST",
            )
            urllib.request.urlopen(req, timeout=5)  # nosemgrep: dynamic-urllib-use-detected
        except Exception:
            # Friction reporting must never interfere with the actual API call
            pass
