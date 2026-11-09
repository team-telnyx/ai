"""Every tool definition must target a method+path that exists in the public
Telnyx OpenAPI spec.

Agents cannot recover from a tool that 404s on every call, and the
integration tests tolerate 404 for "feature not enabled" reasons, so this is
the only place a phantom route is caught before release.

Known-broken tools are allowlisted by name with the Linear ticket that tracks
fixing them. Fixing a tool means removing it from the allowlist; adding a new
tool to the allowlist requires a ticket.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

import httpx
import pytest

from telnyx_agent_toolkit.shared.constants import TOOL_DEFINITIONS

SPEC_URL = "https://raw.githubusercontent.com/team-telnyx/openapi/master/openapi/spec3.json"
SPEC_CACHE = Path(os.environ.get("TELNYX_OPENAPI_SPEC", Path(__file__).parent / ".cache" / "spec3.json"))

# Tools whose routes return 404 live and are absent from the spec. All 35
# original entries were fixed or removed in AI-3951; add new entries only with
# a ticket.
KNOWN_PHANTOM_ROUTES: dict[str, str] = {}

# Routes that exist live (401 unauthenticated) but are missing from the public
# spec. Not toolkit bugs; tracked with the spec owners via AI-3951.
KNOWN_SPEC_GAPS: dict[str, str] = {
    name: "AI-3951"
    for name in (
        "verify_phone",
        "update_assistant",
        "list_portout_events",
        "get_sim_card_data_usage",
        "create_usage_report",
        "get_usage_report",
    )
}

METHODS = ("get", "post", "put", "patch", "delete")


def _normalize(path: str) -> str:
    return re.sub(r"\{[^}]+\}", "{}", path.rstrip("/"))


@pytest.fixture(scope="session")
def spec_routes() -> dict[str, set[str]]:
    if SPEC_CACHE.exists():
        spec = json.loads(SPEC_CACHE.read_text())
    else:
        try:
            resp = httpx.get(SPEC_URL, timeout=60, follow_redirects=True)
            resp.raise_for_status()
        except httpx.HTTPError as exc:  # network-only skip; a 404 route is never a skip
            pytest.skip(f"OpenAPI spec unavailable: {exc}")
        spec = resp.json()
        SPEC_CACHE.parent.mkdir(parents=True, exist_ok=True)
        SPEC_CACHE.write_text(json.dumps(spec))
    routes: dict[str, set[str]] = {}
    for path, ops in spec["paths"].items():
        routes.setdefault(_normalize(path), set()).update(m.upper() for m in ops if m in METHODS)
    assert len(routes) > 500, "spec parsed suspiciously few paths"
    return routes


def test_every_tool_route_exists_in_openapi_spec(spec_routes: dict[str, set[str]]) -> None:
    unexpected: list[str] = []
    for name, tool in TOOL_DEFINITIONS.items():
        if name in KNOWN_PHANTOM_ROUTES or name in KNOWN_SPEC_GAPS:
            continue
        method, path = tool["method"].upper(), tool["path"]
        methods = spec_routes.get(_normalize(path))
        if methods is None:
            unexpected.append(f"{name}: {method} {path} — path not in spec")
        elif method not in methods:
            unexpected.append(f"{name}: {method} {path} — path exists, methods={sorted(methods)}")
    assert unexpected == [], (
        "Tool definitions target routes that are not in the OpenAPI spec. Verify the route "
        "live; if it genuinely exists, add to KNOWN_SPEC_GAPS with a ticket, otherwise fix or "
        "remove the tool:\n  " + "\n  ".join(unexpected)
    )


def test_allowlists_only_name_tools_that_still_need_them(spec_routes: dict[str, set[str]]) -> None:
    """Keep the allowlists honest: an entry that now resolves in the spec must be removed."""
    stale: list[str] = []
    for name in list(KNOWN_PHANTOM_ROUTES) + list(KNOWN_SPEC_GAPS):
        tool = TOOL_DEFINITIONS.get(name)
        if tool is None:
            stale.append(f"{name}: no longer defined")
            continue
        methods = spec_routes.get(_normalize(tool["path"]))
        if methods and tool["method"].upper() in methods:
            stale.append(f"{name}: now present in spec, remove from allowlist")
    assert stale == [], "\n".join(stale)
