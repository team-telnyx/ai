#!/usr/bin/env python3
"""
webhook-receiver.py -- Simple HTTP server that logs received Telnyx webhooks

Starts a local HTTP server to capture and display incoming webhook payloads.
Useful for testing webhook handlers during Telnyx migration.

Usage:
    python3 webhook-receiver.py [--port PORT] [--ngrok] [--validate] [--log-file PATH] [--help]

Arguments:
    --port PORT       Port to listen on (default: 8080)
    --ngrok           Auto-start ngrok tunnel and print public URL
    --validate        Attempt Ed25519 signature validation on incoming webhooks
    --log-file PATH   Write logs to file in addition to stdout
    --help            Show this help and exit

Requires: Python 3.8+ (stdlib only, no external dependencies)
          --ngrok requires ngrok binary in PATH
          --validate requires 'nacl' or 'cryptography' package
"""

import argparse
import json
import os
import signal
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Optional, TextIO


# --- Globals ---
log_file_handle: Optional[TextIO] = None
validate_signatures: bool = False
signature_lib: Optional[str] = None  # 'nacl', 'cryptography', or None
ngrok_process: Optional[subprocess.Popen] = None
server_instance: Optional[HTTPServer] = None


def log(msg: str) -> None:
    """Write a log line to stdout and optionally to a log file."""
    print(msg, flush=True)
    if log_file_handle is not None:
        try:
            log_file_handle.write(msg + "\n")
            log_file_handle.flush()
        except Exception:
            pass


def timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def pretty_json(data: str) -> str:
    """Try to pretty-print JSON, return original if not valid JSON."""
    try:
        parsed = json.loads(data)
        return json.dumps(parsed, indent=2)
    except (json.JSONDecodeError, TypeError):
        return data


def validate_ed25519(signature_b64: str, timestamp_header: str, body: bytes) -> bool:
    """Attempt Ed25519 signature validation. Returns True if valid, False otherwise."""
    # The signed content is timestamp + body
    # Telnyx public key would normally be fetched from https://api.telnyx.com/v2/public_key
    if signature_lib == "nacl":
        try:
            import nacl.signing
            import nacl.encoding
            # In production, fetch the public key from Telnyx API
            log("  [validate] Ed25519 validation with nacl is available but requires Telnyx public key")
            log("  [validate] Fetch it from: GET https://api.telnyx.com/v2/public_key")
            return False
        except Exception as e:
            log(f"  [validate] nacl error: {e}")
            return False
    elif signature_lib == "cryptography":
        try:
            from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
            log("  [validate] Ed25519 validation with cryptography is available but requires Telnyx public key")
            log("  [validate] Fetch it from: GET https://api.telnyx.com/v2/public_key")
            return False
        except Exception as e:
            log(f"  [validate] cryptography error: {e}")
            return False
    else:
        return False


class WebhookHandler(BaseHTTPRequestHandler):
    """HTTP request handler that logs incoming webhooks."""

    def log_message(self, format: str, *args) -> None:
        """Override default logging to use our log function."""
        pass  # Suppress default stderr logging; we handle it ourselves

    def _send_response(self, code: int = 200, body: str = '{"status":"ok"}') -> None:
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body.encode("utf-8"))

    def do_POST(self) -> None:
        content_length = int(self.headers.get("Content-Length", 0))
        body_bytes = self.rfile.read(content_length) if content_length > 0 else b""
        body_str = body_bytes.decode("utf-8", errors="replace")

        log("")
        log(f"{'=' * 60}")
        log(f"[{timestamp()}] {self.command} {self.path}")
        log(f"  Client: {self.client_address[0]}:{self.client_address[1]}")
        log(f"  Headers:")
        for key, value in self.headers.items():
            log(f"    {key}: {value}")

        log(f"  Body:")
        pretty = pretty_json(body_str)
        for line in pretty.split("\n"):
            log(f"    {line}")

        # Extract event type if present
        try:
            parsed = json.loads(body_str)
            event_type = parsed.get("data", {}).get("event_type", "unknown")
            log(f"  Event Type: {event_type}")
        except (json.JSONDecodeError, TypeError):
            pass

        # Signature validation
        if validate_signatures:
            sig = self.headers.get("telnyx-signature-ed25519", "")
            ts = self.headers.get("telnyx-timestamp", "")
            if sig and ts:
                if signature_lib:
                    valid = validate_ed25519(sig, ts, body_bytes)
                    log(f"  Signature: {'VALID' if valid else 'COULD NOT VALIDATE (need public key)'}")
                else:
                    log(f"  Signature: SKIPPED (install 'pynacl' or 'cryptography' for validation)")
            else:
                log(f"  Signature: NO HEADERS PRESENT")

        log(f"{'=' * 60}")

        self._send_response(200)

    def do_GET(self) -> None:
        """Respond to GET requests (health check / browser visit)."""
        log(f"[{timestamp()}] GET {self.path} from {self.client_address[0]}")
        self._send_response(200, json.dumps({
            "status": "ok",
            "service": "telnyx-webhook-receiver",
            "message": "Waiting for POST webhooks...",
        }))

    def do_HEAD(self) -> None:
        """Respond to HEAD requests (reachability checks)."""
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()


def start_ngrok(port: int) -> Optional[str]:
    """Start ngrok and return the public URL."""
    global ngrok_process

    if not _which("ngrok"):
        log("ERROR: ngrok binary not found in PATH")
        log("  Install from: https://ngrok.com/download")
        return None

    log(f"Starting ngrok tunnel to port {port}...")
    try:
        ngrok_process = subprocess.Popen(
            ["ngrok", "http", str(port), "--log=stdout", "--log-format=json"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        # Give ngrok a moment to start
        time.sleep(2)

        # Try to get the public URL from the ngrok API
        import urllib.request
        try:
            with urllib.request.urlopen("http://127.0.0.1:4040/api/tunnels", timeout=5) as resp:
                tunnels = json.loads(resp.read().decode("utf-8"))
                for tunnel in tunnels.get("tunnels", []):
                    if tunnel.get("proto") == "https":
                        return tunnel["public_url"]
                # Fallback to first tunnel
                if tunnels.get("tunnels"):
                    return tunnels["tunnels"][0].get("public_url", "")
        except Exception as e:
            log(f"WARNING: Could not get ngrok URL from API: {e}")
            log("  Check ngrok dashboard at http://127.0.0.1:4040")
            return None

    except FileNotFoundError:
        log("ERROR: ngrok binary not found")
        return None
    except Exception as e:
        log(f"ERROR: Failed to start ngrok: {e}")
        return None

    return None


def _which(cmd: str) -> Optional[str]:
    """Find a command in PATH (stdlib-only shutil.which equivalent for 3.8+)."""
    import shutil
    return shutil.which(cmd)


def check_signature_libs() -> Optional[str]:
    """Check if Ed25519 signature validation libraries are available."""
    try:
        import nacl.signing  # noqa: F401
        return "nacl"
    except ImportError:
        pass
    try:
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey  # noqa: F401
        return "cryptography"
    except ImportError:
        pass
    return None


def shutdown(signum=None, frame=None) -> None:
    """Graceful shutdown."""
    log("")
    log("Shutting down...")

    if ngrok_process is not None:
        log("Stopping ngrok...")
        ngrok_process.terminate()
        try:
            ngrok_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            ngrok_process.kill()

    if server_instance is not None:
        # Shut down in a separate thread to avoid deadlock
        threading.Thread(target=server_instance.shutdown, daemon=True).start()

    if log_file_handle is not None:
        try:
            log_file_handle.close()
        except Exception:
            pass


def main() -> int:
    global log_file_handle, validate_signatures, signature_lib, server_instance

    parser = argparse.ArgumentParser(
        description="Simple HTTP server that logs received Telnyx webhooks",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python3 webhook-receiver.py                          # Listen on :8080\n"
            "  python3 webhook-receiver.py --port 3000 --ngrok      # With ngrok tunnel\n"
            "  python3 webhook-receiver.py --validate --log-file w.log\n"
        ),
    )
    parser.add_argument("--port", type=int, default=8080, help="Port to listen on (default: 8080)")
    parser.add_argument("--ngrok", action="store_true", help="Auto-start ngrok tunnel")
    parser.add_argument("--validate", action="store_true", help="Attempt Ed25519 signature validation")
    parser.add_argument("--log-file", type=str, default=None, help="Write logs to file")
    args = parser.parse_args()

    # Set up log file
    if args.log_file:
        try:
            log_file_handle = open(args.log_file, "a", encoding="utf-8")
            log(f"Logging to file: {args.log_file}")
        except OSError as e:
            print(f"ERROR: Cannot open log file: {e}", file=sys.stderr)
            return 1

    # Signature validation setup
    if args.validate:
        validate_signatures = True
        signature_lib = check_signature_libs()
        if signature_lib:
            log(f"Signature validation enabled (using {signature_lib})")
        else:
            log("WARNING: --validate requested but neither 'pynacl' nor 'cryptography' is installed")
            log("  Install one with: pip install pynacl   OR   pip install cryptography")
            log("  Webhooks will still be received but signatures cannot be verified")

    # Register signal handlers
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # Start ngrok if requested
    ngrok_url = None
    if args.ngrok:
        ngrok_url = start_ngrok(args.port)
        if ngrok_url:
            log(f"")
            log(f"  ngrok public URL: {ngrok_url}")
            log(f"  Set this as your webhook URL in the Telnyx portal:")
            log(f"    {ngrok_url}/webhooks")
            log(f"")
        else:
            log("WARNING: ngrok tunnel could not be established")

    # Start server
    try:
        server_instance = HTTPServer(("0.0.0.0", args.port), WebhookHandler)
    except OSError as e:
        log(f"ERROR: Cannot bind to port {args.port}: {e}")
        return 1

    log(f"")
    log(f"Telnyx Webhook Receiver")
    log(f"=======================")
    log(f"Listening on: http://0.0.0.0:{args.port}")
    if ngrok_url:
        log(f"Public URL:   {ngrok_url}/webhooks")
    log(f"Validation:   {'enabled' if validate_signatures else 'disabled'}")
    log(f"Log file:     {args.log_file or 'none'}")
    log(f"")
    log(f"Press Ctrl+C to stop.")
    log(f"")

    try:
        server_instance.serve_forever()
    except Exception:
        pass
    finally:
        shutdown()

    return 0


if __name__ == "__main__":
    sys.exit(main())
