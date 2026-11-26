#!/usr/bin/env python3
"""Validate the repository-owned Codex developer-kit release candidate."""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
PLUGIN = ROOT / "plugins" / "telnyx-developer-kit"
MANIFEST = PLUGIN / ".codex-plugin" / "plugin.json"
MCP_CONFIG = PLUGIN / ".mcp.json"
MARKETPLACE = ROOT / ".agents" / "plugins" / "marketplace.json"
SUBMISSION = ROOT / "submission" / "telnyx-developer-kit"
CONTRACT = SUBMISSION / "connector-contract.json"
WORKFLOW = ROOT / ".github" / "workflows" / "telnyx-developer-kit-review.yml"

CONNECTOR_URL = "https://api.telnyx.com/v2/ai/mcp"
CONTRACT_SHA256 = "f14d578ce1f36f339ee9c506009f678b49dace1fda6dee288f131f91082e2fad"
ICON_SHA256 = "de304ddafa033ec73d619b27123f6891262f726919046d37b1f989ad47160599"
SKILLS = {
    "telnyx-kit-architecture-patterns",
    "telnyx-kit-debugging",
    "telnyx-kit-guardrails",
    "telnyx-kit-product-navigator",
}
TOOLS = {
    "list_api_endpoints",
    "get_api_endpoint_schema",
    "get_call_status",
    "list_call_events",
    "search_recordings",
}
LEGACY_NAMES = {
    "invoke_api_endpoint",
    "open_number_intelligence",
    "open_voice_monitor",
    "number_intelligence_analyze",
    "number_intelligence_batch_analyze",
    "voice_monitor_dashboard",
}


class ValidationError(RuntimeError):
    pass


def load_json(path: Path) -> Any:
    def unique(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key, value in pairs:
            if key in result:
                raise ValidationError(f"duplicate JSON key {key!r} in {path}")
            result[key] = value
        return result

    try:
        return json.loads(path.read_text(), object_pairs_hook=unique)
    except (OSError, json.JSONDecodeError) as error:
        raise ValidationError(f"cannot parse {path}: {error}") from error


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValidationError(message)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate_plugin() -> None:
    manifest = load_json(MANIFEST)
    for description in (manifest.get("description", ""), manifest.get("interface", {}).get("longDescription", "")):
        require("five" in description and "Number Lookup" not in description,
                "manifest descriptions must advertise the five-tool catalog without Number Lookup")
    require(manifest.get("name") == PLUGIN.name, "manifest name must match plugin directory")
    require(manifest.get("mcpServers") == "./.mcp.json", "manifest must reference ./.mcp.json")
    require(manifest.get("skills") == "./skills/", "manifest must reference ./skills/")
    require("apps" not in manifest, "the five-tool connector must not bundle MCP Apps")
    require("hooks" not in manifest, "unsupported hooks field must not be present")
    require(re.fullmatch(r"\d+\.\d+\.\d+", manifest.get("version", "")) is not None,
            "plugin version must be strict semver")
    interface = manifest.get("interface", {})
    require(interface.get("composerIcon") == "./assets/telnyx-mark.png", "missing composer icon")
    require(interface.get("logo") == "./assets/telnyx-mark.png", "missing plugin logo")
    require(len(interface.get("defaultPrompt", [])) <= 3, "at most three default prompts are allowed")
    require(all(len(prompt) <= 128 for prompt in interface.get("defaultPrompt", [])),
            "default prompts must be at most 128 characters")
    require(digest(PLUGIN / "assets" / "telnyx-mark.png") == ICON_SHA256,
            "Telnyx icon bytes changed without review")

    mcp = load_json(MCP_CONFIG)
    require(mcp == {"mcpServers": {"telnyx": {"type": "http", "url": CONNECTOR_URL}}},
            "MCP config must contain only the OAuth connector")

    skill_names = {item.name for item in (PLUGIN / "skills").iterdir() if item.is_dir()}
    require(skill_names == SKILLS, f"packaged skills mismatch: {sorted(skill_names)}")
    for skill in SKILLS:
        packaged = PLUGIN / "skills" / skill / "SKILL.md"
        canonical = ROOT / "skills" / skill / "SKILL.md"
        require(packaged.read_bytes() == canonical.read_bytes(), f"{skill} differs from canonical source")

    for path in PLUGIN.rglob("*"):
        require(not path.is_symlink(), f"plugin archive contains symlink: {path.relative_to(ROOT)}")


def validate_marketplace() -> None:
    marketplace = load_json(MARKETPLACE)
    entries = [item for item in marketplace.get("plugins", []) if item.get("name") == PLUGIN.name]
    require(len(entries) == 1, "marketplace must contain exactly one developer-kit entry")
    entry = entries[0]
    require(entry.get("source") == {"source": "local", "path": "./plugins/telnyx-developer-kit"},
            "marketplace source must be the repository plugin")
    require(entry.get("policy") == {"installation": "NOT_AVAILABLE", "authentication": "ON_INSTALL"},
            "release candidate must remain unavailable and authenticate on install")
    require(entry.get("category") == "Developer Tools", "unexpected marketplace category")


def validate_contract() -> None:
    require(digest(CONTRACT) == CONTRACT_SHA256,
            "embedded connector contract differs from the reviewed server contract")
    contract = load_json(CONTRACT)
    require(contract.get("id") == "telnyx-ai-connector", "unexpected connector id")
    require(contract.get("version") == "1.0.0-preview.7", "unexpected connector version")
    require(contract.get("hosts") == ["claude", "codex"], "connector host contract drifted")
    require(contract.get("protocolVersions") == ["2026-07-28", "2025-11-25"],
            "protocol compatibility contract drifted")
    contract_tools = {tool.get("name") for tool in contract.get("tools", [])}
    require(contract_tools == TOOLS, f"five-tool contract mismatch: {sorted(contract_tools)}")
    require(all("number_lookup" not in endpoint["path"] for endpoint in contract["endpoints"]),
            "deferred Number Lookup must not be executable")

    annotations = load_json(SUBMISSION / "annotation-justifications.json")
    require(annotations.get("contractVersion") == contract["version"],
            "annotation justification contract version drifted")
    require({item.get("name") for item in annotations.get("tools", [])} == TOOLS,
            "annotation justifications must cover exactly the five tools")
    expected = {tool["name"]: tool["annotations"] for tool in contract["tools"]}
    for item in annotations["tools"]:
        require(item.get("annotations") == expected[item["name"]],
                f"annotation justification drift for {item['name']}")

    cases = load_json(SUBMISSION / "review-cases.json")
    covered = {
        tool
        for section in ("positive", "negative")
        for case in cases.get(section, [])
        for tool in case.get("toolsUnderTest", [])
    }
    require(covered == TOOLS, f"review cases do not cover exactly the five tools: {sorted(covered)}")
    require(any(case.get("id") == "N1-deferred-number-lookup" and not case.get("toolsUnderTest")
                for case in cases["negative"]), "review cases must reject deferred lookup")


def validate_messaging_error_guidance() -> None:
    guidance_roots = {
        "canonical": ROOT / "skills",
        "codex": ROOT / "plugins" / "telnyx-developer-kit" / "skills",
        "claude": ROOT / "providers" / "claude" / "plugins" / "telnyx-platform" / "skills",
        "cursor": ROOT / "providers" / "cursor" / "plugin" / "skills",
    }
    stale_guidance = {
        "STOP/40008": "guardrails must not map STOP to asynchronous delivery code 40008",
        "40008 | Number opted out": "debugging skill must not map 40008 to an opt-out",
        "40300 | Carrier rejected": "debugging skill must not map 40300 to a carrier rejection",
    }
    for label, root in guidance_roots.items():
        architecture = (root / "telnyx-kit-architecture-patterns" / "SKILL.md").read_text()
        require(re.search(r"WebSocket state on the received\s+`stream_id`", architecture) is not None,
                f"{label} media state must use the WebSocket stream_id")
        require("stream state on `StreamSid`" not in architecture,
                f"{label} must distinguish HTTP callbacks from media WebSocket events")
        debugging = (root / "telnyx-kit-debugging" / "SKILL.md").read_text()
        guardrails = (root / "telnyx-kit-guardrails" / "SKILL.md").read_text()
        navigator = (root / "telnyx-kit-product-navigator" / "SKILL.md").read_text()
        require("lookup_phone_number" not in navigator,
                f"{label} navigator must not advertise removed hosted Number Lookup")
        require("confirm_billable_lookup" not in guardrails,
                f"{label} guardrails must not teach the removed lookup parameter")
        require("Number Lookup is not available through this connector" in navigator,
                f"{label} navigator must disclose hosted lookup unavailability")
        require("catalog covers only three reviewed endpoints" in navigator,
                f"{label} navigator must disclose the bounded catalog")
        require("Messaging, TeXML, Verify and Numbers require separate API documentation" in navigator,
                f"{label} navigator must route unsupported products outside the connector catalog")
        require("even with approval" in guardrails,
                f"{label} guardrails must not imply approval enables hosted lookup")
        require("| Messaging SMS/MMS API request | 40300 | Recipient opted out (STOP) |" in debugging,
                f"{label} debugging skill must map synchronous SMS opt-outs to 40300")
        require("| Messaging SMS/MMS delivery | 40300 | Context-dependent delivery error |" in debugging,
                f"{label} debugging skill must preserve asynchronous 40300 context handling")
        require("| Messaging SMS/MMS delivery | 40008 | Undeliverable |" in debugging,
                f"{label} debugging skill must map asynchronous 40008 to undeliverable")
        require("STOP/40300" in guardrails,
                f"{label} guardrails must treat synchronous STOP/40300 as terminal")
        require("every asynchronous delivery\n  event with code 40300" in guardrails,
                f"{label} guardrails must classify asynchronous 40300 by title and detail")
        require("Error 40008 is a general asynchronous" in guardrails,
                f"{label} guardrails must not treat SMS delivery 40008 as an opt-out")
        combined = f"{debugging}\n{guardrails}"
        for stale_text, message in stale_guidance.items():
            require(stale_text not in combined, f"{label} {message}")


def validate_text_and_workflow() -> None:
    release_files = [
        MANIFEST,
        MCP_CONFIG,
        *(PLUGIN / "skills").rglob("*.md"),
        *(SUBMISSION.rglob("*.md")),
        *(SUBMISSION.rglob("*.json")),
    ]
    combined = "\n".join(path.read_text(errors="replace") for path in release_files)
    require("https://api.telnyx.com/v2/mcp" not in combined, "legacy MCP URL remains in package")
    for name in LEGACY_NAMES:
        require(re.search(rf"\b{re.escape(name)}\b", combined) is None,
                f"legacy tool or app name remains: {name}")
    require(re.search(r"(?:sk|KEY)[-_][A-Za-z0-9]{20,}", combined) is None,
            "possible credential material found")

    workflow = WORKFLOW.read_text()
    require("pull_request_target:" not in workflow, "workflow must not run with target privileges")
    require(re.search(r"permissions:\s*\n\s+contents:\s+read", workflow) is not None,
            "workflow permissions must be read-only")
    uses = re.findall(r"^\s*-?\s*uses:\s*([^\s#]+)", workflow, flags=re.MULTILINE)
    require(uses, "workflow must declare its actions")
    for action in uses:
        require(action.startswith("./") or re.fullmatch(r"[^@]+@[0-9a-f]{40}", action) is not None,
                f"workflow action is not pinned by commit: {action}")
    require("TELNYX_MCP_OAUTH_TOKEN" in workflow, "hosted audit must use an OAuth token")
    require("TELNYX_API_KEY" not in workflow, "hosted connector audit must not use an API key")


def main() -> int:
    try:
        validate_plugin()
        validate_marketplace()
        validate_contract()
        validate_messaging_error_guidance()
        validate_text_and_workflow()
    except (ValidationError, KeyError, StopIteration) as error:
        print(f"Developer Kit validation failed: {error}", file=sys.stderr)
        return 1
    print("Codex developer-kit package: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
