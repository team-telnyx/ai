#!/usr/bin/env python3
"""
test-webhooks-local.py -- Generate and send mock Telnyx webhook payloads

Sends mock webhook payloads to a local (or remote) endpoint for testing
that your webhook handler correctly parses Telnyx event formats.

NOTE: This tests payload FORMAT only, not cryptographic signature
validation. Signatures use a placeholder value since Ed25519 signing
requires external libraries (cryptography/nacl).

Usage:
    python3 test-webhooks-local.py [--url URL] [--event TYPE] [--delay SECS] [--help]

Arguments:
    --url URL         Webhook endpoint (default: http://localhost:8080/webhooks)
    --event TYPE      Send only this event type, or 'all' (default: all)
    --delay SECONDS   Delay between events in seconds (default: 0.5)
    --list            List available event types and exit
    --help            Show this help and exit

Requires: Python 3.8+ (stdlib only, no external dependencies)
"""

import argparse
import json
import sys
import time
import uuid
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple


# --- Mock Webhook Payloads ---

def _make_event(event_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Wrap a payload in the standard Telnyx webhook event envelope."""
    return {
        "data": {
            "event_type": event_type,
            "id": str(uuid.uuid4()),
            "occurred_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "+00:00",
            "payload": payload,
            "record_type": "event",
        },
        "meta": {
            "attempt": 1,
            "delivered_to": "http://localhost:8080/webhooks",
        },
    }


def _call_control_payload(state: str, direction: str = "incoming") -> Dict[str, Any]:
    return {
        "call_control_id": str(uuid.uuid4()),
        "call_leg_id": str(uuid.uuid4()),
        "call_session_id": str(uuid.uuid4()),
        "connection_id": "1234567890",
        "client_state": None,
        "from": "+15551234567",
        "to": "+15559876543",
        "direction": direction,
        "state": state,
        "record_type": "call",
    }


MOCK_EVENTS: Dict[str, callable] = {
    "call.initiated": lambda: _make_event("call.initiated", _call_control_payload("initiated")),

    "call.answered": lambda: _make_event("call.answered", _call_control_payload("answered")),

    "call.hangup": lambda: _make_event("call.hangup", {
        **_call_control_payload("hangup"),
        "hangup_cause": "normal_clearing",
        "hangup_source": "caller",
        "sip_hangup_cause": "200",
    }),

    "message.received": lambda: _make_event("message.received", {
        "id": str(uuid.uuid4()),
        "record_type": "message",
        "direction": "inbound",
        "type": "SMS",
        "from": {"phone_number": "+15551234567", "carrier": "T-Mobile", "line_type": "wireless"},
        "to": [{"phone_number": "+15559876543", "status": "delivered"}],
        "text": "Hello from test-webhooks-local!",
        "messaging_profile_id": str(uuid.uuid4()),
        "encoding": "GSM-7",
        "parts": 1,
        "cost": {"amount": "0.0040", "currency": "USD"},
    }),

    "message.sent": lambda: _make_event("message.sent", {
        "id": str(uuid.uuid4()),
        "record_type": "message",
        "direction": "outbound",
        "type": "SMS",
        "from": {"phone_number": "+15559876543"},
        "to": [{"phone_number": "+15551234567", "status": "sent"}],
        "text": "Reply from Telnyx!",
        "messaging_profile_id": str(uuid.uuid4()),
        "parts": 1,
        "cost": {"amount": "0.0040", "currency": "USD"},
    }),

    "message.finalized": lambda: _make_event("message.finalized", {
        "id": str(uuid.uuid4()),
        "record_type": "message",
        "direction": "outbound",
        "type": "SMS",
        "from": {"phone_number": "+15559876543"},
        "to": [{"phone_number": "+15551234567", "status": "delivered"}],
        "text": "Reply from Telnyx!",
        "completed_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "+00:00",
        "parts": 1,
        "cost": {"amount": "0.0040", "currency": "USD"},
    }),

    "verify.verification": lambda: _make_event("verify.verification", {
        "id": str(uuid.uuid4()),
        "record_type": "verification",
        "phone_number": "+15551234567",
        "verify_profile_id": str(uuid.uuid4()),
        "status": "accepted",
        "type": "sms",
        "timeout_secs": 300,
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "+00:00",
        "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "+00:00",
    }),

    "fax.received": lambda: _make_event("fax.received", {
        "id": str(uuid.uuid4()),
        "record_type": "fax",
        "connection_id": "1234567890",
        "direction": "inbound",
        "from": "+15551234567",
        "to": "+15559876543",
        "status": "received",
        "media_url": "https://api.telnyx.com/v2/faxes/test/media",
        "quality": "normal",
        "page_count": 2,
    }),

    "fax.failed": lambda: _make_event("fax.failed", {
        "id": str(uuid.uuid4()),
        "record_type": "fax",
        "connection_id": "1234567890",
        "direction": "outbound",
        "from": "+15559876543",
        "to": "+15551234567",
        "status": "failed",
        "failure_reason": "destination_busy",
    }),
}

# Placeholder signature header (Ed25519 requires external libraries)
PLACEHOLDER_SIGNATURE = "dGVzdC1zaWduYXR1cmUtcGxhY2Vob2xkZXI="
PLACEHOLDER_TIMESTAMP = str(int(time.time()))


def send_webhook(url: str, event: Dict[str, Any]) -> Tuple[int, str, float]:
    """Send a single webhook payload. Returns (status_code, body, elapsed_ms)."""
    body = json.dumps(event).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "telnyx-signature-ed25519": PLACEHOLDER_SIGNATURE,
            "telnyx-timestamp": PLACEHOLDER_TIMESTAMP,
            "User-Agent": "telnyx-test-webhooks/1.0",
        },
    )

    start = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            elapsed = (time.monotonic() - start) * 1000
            resp_body = resp.read().decode("utf-8", errors="replace")
            return resp.status, resp_body, elapsed
    except urllib.error.HTTPError as e:
        elapsed = (time.monotonic() - start) * 1000
        resp_body = e.read().decode("utf-8", errors="replace") if e.fp else ""
        return e.code, resp_body, elapsed
    except urllib.error.URLError as e:
        elapsed = (time.monotonic() - start) * 1000
        return 0, str(e.reason), elapsed
    except Exception as e:
        elapsed = (time.monotonic() - start) * 1000
        return 0, str(e), elapsed


def truncate(text: str, max_len: int = 200) -> str:
    if len(text) <= max_len:
        return text
    return text[:max_len] + "... (truncated)"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Send mock Telnyx webhook payloads for local testing",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "NOTE: Signatures are placeholders. This tests payload FORMAT, not crypto.\n\n"
            "Available event types:\n  " + "\n  ".join(sorted(MOCK_EVENTS.keys()))
        ),
    )
    parser.add_argument(
        "--url", default="http://localhost:8080/webhooks",
        help="Webhook endpoint URL (default: http://localhost:8080/webhooks)",
    )
    parser.add_argument(
        "--event", default="all",
        help="Event type to send, or 'all' (default: all)",
    )
    parser.add_argument(
        "--delay", type=float, default=0.5,
        help="Delay in seconds between events (default: 0.5)",
    )
    parser.add_argument(
        "--list", action="store_true",
        help="List available event types and exit",
    )
    args = parser.parse_args()

    if args.list:
        print("Available event types:")
        for name in sorted(MOCK_EVENTS.keys()):
            print(f"  {name}")
        return 0

    # Determine which events to send
    if args.event == "all":
        event_names = list(MOCK_EVENTS.keys())
    elif args.event in MOCK_EVENTS:
        event_names = [args.event]
    else:
        print(f"Error: unknown event type '{args.event}'", file=sys.stderr)
        print(f"Available types: {', '.join(sorted(MOCK_EVENTS.keys()))}", file=sys.stderr)
        return 1

    print(f"Telnyx Webhook Test")
    print(f"===================")
    print(f"Target URL:  {args.url}")
    print(f"Events:      {len(event_names)}")
    print(f"Delay:       {args.delay}s")
    print(f"")
    print(f"NOTE: Signatures are placeholders — this tests payload format, not crypto.")
    print(f"")

    passed = 0
    failed = 0

    for i, name in enumerate(event_names):
        event = MOCK_EVENTS[name]()
        status, body, elapsed = send_webhook(args.url, event)

        if status >= 200 and status < 300:
            result = "PASS"
            passed += 1
        elif status == 0:
            result = "FAIL"
            failed += 1
        else:
            result = "WARN"
            failed += 1

        print(f"  [{result}] {name}")
        print(f"         Status: {status if status > 0 else 'connection error'} | {elapsed:.0f}ms")
        if body:
            print(f"         Body:   {truncate(body.strip())}")

        # Delay between events (but not after the last one)
        if i < len(event_names) - 1 and args.delay > 0:
            time.sleep(args.delay)

    print(f"")
    print(f"===================")
    print(f"Results: {passed} passed, {failed} failed out of {len(event_names)}")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
