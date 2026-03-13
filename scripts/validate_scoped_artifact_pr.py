#!/usr/bin/env python3
"""Validate scoped V2 pilot artifact PRs against the current safety boundary."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

import yaml


REPO_ROOT = Path(__file__).resolve().parents[1]
PILOT_PRODUCTS = {"messaging", "voice", "10dlc", "numbers", "ai-assistants"}
PILOT_LANGUAGES = {"curl", "go", "java", "javascript", "python", "ruby"}
ALLOWED_VERSION_PLUGINS = {
    "telnyx-curl",
    "telnyx-go",
    "telnyx-java",
    "telnyx-javascript",
    "telnyx-python",
    "telnyx-ruby",
}


def run(*args: str) -> str:
    return subprocess.check_output(args, cwd=REPO_ROOT, text=True)


def load_changed_files(base_ref: str) -> list[tuple[str, str]]:
    output = run("git", "diff", "--name-status", f"{base_ref}...HEAD")
    changed: list[tuple[str, str]] = []
    for line in output.splitlines():
        if not line.strip():
            continue
        status, path = line.split("\t", 1)
        changed.append((status, path))
    return changed


def pilot_skill_dir(language: str, product: str) -> str:
    return f"telnyx-{language}/skills/telnyx-{product}-{language}"


def allowed_paths() -> set[str]:
    paths = {
        "README.md",
        "skills-index.json",
        ".claude-plugin/marketplace.json",
        ".github/workflows/validate-scoped-artifact-pr.yml",
        "scripts/validate_scoped_artifact_pr.py",
        "docs/platform-distribution.md",
    }
    for language in PILOT_LANGUAGES:
        for product in PILOT_PRODUCTS:
            base = pilot_skill_dir(language, product)
            paths.add(f"{base}/SKILL.md")
            paths.add(f"{base}/references/api-details.md")
    return paths


def validate_changed_paths(changed: list[tuple[str, str]]) -> list[str]:
    issues = []
    allowed = allowed_paths()

    for status, path in changed:
        if path in allowed:
            continue
        issues.append(f"disallowed changed path: {status} {path}")

        if path.endswith("/SKILL.md") and path not in allowed:
            issues.append(f"non-pilot SKILL.md touched: {path}")

    return issues


def validate_no_deletions_outside_pilot(changed: list[tuple[str, str]]) -> list[str]:
    issues = []
    allowed = allowed_paths()
    for status, path in changed:
        if not status.startswith("D"):
            continue
        if path not in allowed:
            issues.append(f"deletion outside allowed pilot scope: {path}")
    return issues


def load_json_at(ref: str, path: str) -> dict:
    content = run("git", "show", f"{ref}:{path}")
    return json.loads(content)


def validate_marketplace(base_ref: str, changed: list[tuple[str, str]]) -> list[str]:
    marketplace_path = ".claude-plugin/marketplace.json"
    if not any(path == marketplace_path for _, path in changed):
        return []

    issues = []
    before = load_json_at(base_ref, marketplace_path)
    after = json.loads((REPO_ROOT / marketplace_path).read_text(encoding="utf-8"))

    if before.get("name") != after.get("name"):
        issues.append("marketplace.json root `name` changed")
    if before.get("owner") != after.get("owner"):
        issues.append("marketplace.json `owner` changed")
    if before.get("metadata") != after.get("metadata"):
        issues.append("marketplace.json `metadata` changed")

    before_plugins = {plugin["name"]: plugin for plugin in before.get("plugins", [])}
    after_plugins = {plugin["name"]: plugin for plugin in after.get("plugins", [])}
    if set(before_plugins) != set(after_plugins):
        issues.append("marketplace.json plugin set changed")
        return issues

    changed_plugins = {
        path.split("/", 1)[0]
        for _, path in changed
        if path.startswith("telnyx-") and "/" in path
    }

    for name, before_plugin in before_plugins.items():
        after_plugin = after_plugins[name]
        if name in ALLOWED_VERSION_PLUGINS:
            before_version = before_plugin.get("version")
            after_version = after_plugin.get("version")
            before_copy = dict(before_plugin)
            after_copy = dict(after_plugin)
            before_copy.pop("version", None)
            after_copy.pop("version", None)
            if before_copy != after_copy:
                issues.append(f"marketplace.json plugin structure changed for {name}; only version may change")
            if name in changed_plugins and before_version == after_version:
                issues.append(f"marketplace.json did not bump version for changed pilot plugin {name}")
            if name not in changed_plugins and before_version != after_version:
                issues.append(f"marketplace.json bumped version for unchanged plugin {name}")
        else:
            if before_plugin != after_plugin:
                issues.append(f"marketplace.json changed non-pilot plugin {name}")

    return issues


def validate_pilot_completeness() -> list[str]:
    issues = []
    for language in PILOT_LANGUAGES:
        for product in PILOT_PRODUCTS:
            base = REPO_ROOT / pilot_skill_dir(language, product)
            if not (base / "SKILL.md").exists():
                issues.append(f"missing pilot SKILL.md: {base / 'SKILL.md'}")
            if not (base / "references" / "api-details.md").exists():
                issues.append(f"missing pilot reference file: {base / 'references' / 'api-details.md'}")
    return issues


def scan_repo_skills() -> list[dict]:
    skills = []
    for skill_md in sorted(REPO_ROOT.glob("telnyx-*/skills/*/SKILL.md")):
        if "node_modules" in skill_md.parts or "build" in skill_md.parts:
            continue
        skill_dir = skill_md.parent
        rel_path = "./" + skill_md.relative_to(REPO_ROOT).as_posix()
        text = skill_md.read_text(encoding="utf-8")
        product = None
        language = None
        if text.startswith("---"):
            end = text.find("---", 3)
            if end != -1:
                frontmatter = yaml.safe_load(text[3:end]) or {}
                metadata = frontmatter.get("metadata", {})
                product = metadata.get("product")
                language = metadata.get("language")
        refs = []
        ref_file = skill_dir / "references" / "api-details.md"
        if ref_file.exists():
            refs.append("./" + ref_file.relative_to(REPO_ROOT).as_posix())
        skills.append({
            "id": skill_dir.name,
            "plugin": skill_dir.parents[1].name,
            "product": product,
            "language": language,
            "path": rel_path,
            "references": refs,
            "format": "agent-skill-v1",
        })
    return skills


def validate_skills_index() -> list[str]:
    issues = []
    index_path = REPO_ROOT / "skills-index.json"
    if not index_path.exists():
        return ["missing top-level skills-index.json"]

    index = json.loads(index_path.read_text(encoding="utf-8"))
    expected = {
        (
            item["id"],
            item["plugin"],
            item["product"],
            item["language"],
            item["path"],
            tuple(item["references"]),
            item["format"],
        )
        for item in scan_repo_skills()
    }
    actual = {
        (
            item.get("id"),
            item.get("plugin"),
            item.get("product"),
            item.get("language"),
            item.get("path"),
            tuple(item.get("references", [])),
            item.get("format"),
        )
        for item in index.get("skills", [])
    }

    if index.get("name") != "telnyx-skills-index":
        issues.append("skills-index.json `name` is invalid")
    if index.get("schema_version") != 1:
        issues.append("skills-index.json `schema_version` must be 1")
    if expected != actual:
        issues.append("skills-index.json does not match the current repository skill tree")
    return issues


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-ref", required=True)
    args = parser.parse_args()

    changed = load_changed_files(args.base_ref)
    issues = []
    issues.extend(validate_changed_paths(changed))
    issues.extend(validate_no_deletions_outside_pilot(changed))
    issues.extend(validate_marketplace(args.base_ref, changed))
    issues.extend(validate_pilot_completeness())
    issues.extend(validate_skills_index())

    if issues:
        print("Scoped artifact PR validation failed:")
        for issue in issues:
            print(f"- {issue}")
        return 1

    print("Scoped artifact PR validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
