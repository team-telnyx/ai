#!/usr/bin/env python3
"""
scan-twilio-deep.py -- AST-level deep scanner for Twilio usage.

Scans a project directory for Twilio SDK usage, environment variables,
webhook handlers, and configuration files. Uses Python's ast module for
.py files and regex heuristics for .js/.ts/.jsx/.tsx files.

Outputs structured JSON compatible with scan-twilio-usage.sh but with
additional fields: detection_method, context, and confidence.

Requires: Python 3.8+, stdlib only (no external dependencies).
"""

from __future__ import annotations

import argparse
import ast
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

SCAN_VERSION = "1.0.0"
SCANNER_NAME = "deep"

# ---------------------------------------------------------------------------
# Product mapping -- Twilio module path fragment -> product name
# ---------------------------------------------------------------------------
TWILIO_PRODUCT_MAP: Dict[str, str] = {
    "twilio.rest": "general",
    "twilio.base": "general",
    "twilio.http": "general",
    "twilio.jwt": "general",
    "twilio.jwt.access_token": "general",
    "twilio.jwt.client": "voice",
    "twilio.jwt.taskrouter": "taskrouter",
    "twilio.rest.api": "general",
    "twilio.rest.messaging": "messaging",
    "twilio.rest.voice": "voice",
    "twilio.rest.video": "video",
    "twilio.rest.chat": "conversations",
    "twilio.rest.conversations": "conversations",
    "twilio.rest.verify": "verify",
    "twilio.rest.lookups": "lookup",
    "twilio.rest.lookup": "lookup",
    "twilio.rest.notify": "notify",
    "twilio.rest.sync": "sync",
    "twilio.rest.taskrouter": "taskrouter",
    "twilio.rest.trunking": "trunking",
    "twilio.rest.flex_api": "flex",
    "twilio.rest.studio": "studio",
    "twilio.rest.serverless": "serverless",
    "twilio.rest.autopilot": "autopilot",
    "twilio.rest.wireless": "iot",
    "twilio.rest.supersim": "iot",
    "twilio.rest.proxy": "proxy",
    "twilio.rest.numbers": "phone-numbers",
    "twilio.rest.pricing": "phone-numbers",
    "twilio.rest.intelligence": "voice-intelligence",
    "twilio.twiml": "twiml",
    "twilio.twiml.voice_response": "voice",
    "twilio.twiml.messaging_response": "messaging",
    "twilio.twiml.fax_response": "fax",
}

# JS/TS package -> product
JS_PACKAGE_PRODUCT_MAP: Dict[str, str] = {
    "twilio": "general",
    "twilio-video": "video",
    "twilio-chat": "conversations",
    "twilio-sync": "sync",
    "twilio-notify": "notify",
    "twilio-common": "general",
    "@twilio/voice-sdk": "voice",
    "@twilio/conversations": "conversations",
    "@twilio/video-processors": "video",
    "twilio-flex-webchat-ui": "flex",
    "twilio-taskrouter": "taskrouter",
}

# Method call patterns -> product (used for both Python and JS)
METHOD_PRODUCT_MAP: Dict[str, str] = {
    "messages.create": "messaging",
    "calls.create": "voice",
    "send_message": "messaging",
    "make_call": "voice",
    "video.rooms": "video",
    "conversations": "conversations",
    "verify": "verify",
    "lookups": "lookup",
    "VoiceResponse": "voice",
    "MessagingResponse": "messaging",
    "VoiceGrant": "voice",
    "VideoGrant": "video",
    "ChatGrant": "conversations",
    "SyncGrant": "sync",
    "TaskRouterGrant": "taskrouter",
    # Go-specific patterns (PascalCase API methods)
    "CreateMessage": "messaging",
    "CreateCall": "voice",
    "CreateVerification": "verify",
    "FetchMessage": "messaging",
    "FetchCall": "voice",
}

# Twilio env var patterns
TWILIO_ENV_VARS = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_API_KEY",
    "TWILIO_API_SECRET",
    "TWILIO_PHONE_NUMBER",
    "TWILIO_MESSAGING_SERVICE_SID",
    "TWILIO_TWIML_APP_SID",
    "TWILIO_WORKSPACE_SID",
    "TWILIO_FLEX_FLOW_SID",
    "TWILIO_SYNC_SERVICE_SID",
    "TWILIO_CHAT_SERVICE_SID",
    "TWILIO_VERIFY_SERVICE_SID",
    "TWILIO_CONVERSATIONS_SERVICE_SID",
    "TWILIO_VIDEO_API_KEY",
]

# Config file names that may contain Twilio settings
CONFIG_FILE_NAMES = {
    ".env",
    ".env.local",
    ".env.example",
    ".env.sample",
    ".env.development",
    ".env.production",
    "twilio.json",
    "twilio.yaml",
    "twilio.yml",
    "twilio.toml",
    ".twiliorc",
    "config.yml",
    "config.yaml",
    "application.yml",
    "application.yaml",
    "appsettings.json",
}

# Dependency files that may reference Twilio
DEPENDENCY_FILE_NAMES = {
    "requirements.txt",
    "Pipfile",
    "pyproject.toml",
    "setup.py",
    "setup.cfg",
    "package.json",
    "go.mod",
    "Gemfile",
    "pom.xml",
    "build.gradle",
    "composer.json",
}

# File extensions to scan
PY_EXTENSIONS = {".py"}
JS_EXTENSIONS = {".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs"}
GO_EXTENSIONS = {".go"}
RUBY_EXTENSIONS = {".rb"}
JAVA_EXTENSIONS = {".java", ".kt", ".scala"}
PHP_EXTENSIONS = {".php"}
CSHARP_EXTENSIONS = {".cs"}
OTHER_TEXT_EXTENSIONS = {".xml", ".yaml", ".yml"}

# Directories to skip
SKIP_DIRS = {
    "node_modules",
    ".git",
    "__pycache__",
    ".venv",
    "venv",
    "env",
    ".env",
    ".tox",
    ".mypy_cache",
    ".pytest_cache",
    "dist",
    "build",
    ".next",
    ".nuxt",
    "coverage",
    ".idea",
    ".vscode",
}


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------
class Detection:
    """A single detected Twilio usage."""

    def __init__(
        self,
        pattern: str,
        line: int,
        detection_method: str,
        context: List[str],
        confidence: str,
        product: str,
    ):
        self.pattern = pattern
        self.line = line
        self.detection_method = detection_method  # ast | regex | heuristic
        self.context = context
        self.confidence = confidence  # high | medium | low
        self.product = product

    def to_dict(self) -> Dict[str, Any]:
        return {
            "pattern": self.pattern,
            "line": self.line,
            "detection_method": self.detection_method,
            "context": self.context,
            "confidence": self.confidence,
            "product": self.product,
        }


class FileResult:
    """Aggregated results for a single file."""

    def __init__(self, path: str, language: str):
        self.path = path
        self.language = language
        self.detections: List[Detection] = []

    @property
    def products(self) -> List[str]:
        seen: Set[str] = set()
        result: List[str] = []
        for d in self.detections:
            if d.product not in seen:
                seen.add(d.product)
                result.append(d.product)
        return result

    def to_dict(self) -> Dict[str, Any]:
        return {
            "path": self.path,
            "language": self.language,
            "products": self.products,
            "detections": [d.to_dict() for d in self.detections],
        }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def get_context_lines(lines: List[str], line_no: int, radius: int = 2) -> List[str]:
    """Return surrounding lines (1-indexed line_no)."""
    start = max(0, line_no - 1 - radius)
    end = min(len(lines), line_no + radius)
    return lines[start:end]


def resolve_product(module_path: str) -> str:
    """Map a Twilio module path to a product name, longest prefix wins."""
    best = "general"
    best_len = 0
    lower = module_path.lower()
    for prefix, product in TWILIO_PRODUCT_MAP.items():
        if lower.startswith(prefix) and len(prefix) > best_len:
            best = product
            best_len = len(prefix)
    return best


def infer_product_from_text(text: str) -> str:
    """Best-effort product inference from arbitrary text."""
    for pattern, product in METHOD_PRODUCT_MAP.items():
        if pattern in text:
            return product
    return "general"


def language_for_ext(ext: str) -> str:
    if ext in PY_EXTENSIONS:
        return "python"
    if ext in JS_EXTENSIONS:
        return "javascript"
    if ext in GO_EXTENSIONS:
        return "go"
    if ext in RUBY_EXTENSIONS:
        return "ruby"
    if ext in JAVA_EXTENSIONS:
        return "java"
    if ext in PHP_EXTENSIONS:
        return "php"
    if ext in CSHARP_EXTENSIONS:
        return "csharp"
    return "unknown"


# ---------------------------------------------------------------------------
# Python AST scanner
# ---------------------------------------------------------------------------
def scan_python_ast(filepath: Path, lines: List[str]) -> List[Detection]:
    """Parse a Python file with ast and extract Twilio-related detections."""
    detections: List[Detection] = []
    source = "\n".join(lines)

    try:
        tree = ast.parse(source, filename=str(filepath))
    except SyntaxError as exc:
        print(
            f"WARNING: Could not parse {filepath}: {exc}",
            file=sys.stderr,
        )
        return detections

    for node in ast.walk(tree):
        # --- Import / ImportFrom ---
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name and "twilio" in alias.name.lower():
                    pattern = f"import {alias.name}"
                    if alias.asname:
                        pattern += f" as {alias.asname}"
                    detections.append(
                        Detection(
                            pattern=pattern,
                            line=node.lineno,
                            detection_method="ast",
                            context=get_context_lines(lines, node.lineno),
                            confidence="high",
                            product=resolve_product(alias.name),
                        )
                    )

        elif isinstance(node, ast.ImportFrom):
            module = node.module or ""
            if "twilio" in module.lower():
                names_str = ", ".join(
                    (a.name + (f" as {a.asname}" if a.asname else ""))
                    for a in node.names
                )
                pattern = f"from {module} import {names_str}"
                detections.append(
                    Detection(
                        pattern=pattern,
                        line=node.lineno,
                        detection_method="ast",
                        context=get_context_lines(lines, node.lineno),
                        confidence="high",
                        product=resolve_product(module),
                    )
                )

        # --- os.environ / os.getenv for TWILIO_* ---
        elif isinstance(node, ast.Call):
            # Detect env var accesses
            call_str = _reconstruct_call(node)
            if call_str:
                for env_var in TWILIO_ENV_VARS:
                    if env_var in call_str:
                        detections.append(
                            Detection(
                                pattern=call_str,
                                line=node.lineno,
                                detection_method="ast",
                                context=get_context_lines(lines, node.lineno),
                                confidence="high",
                                product="general",
                            )
                        )
                        break
            # Detect Twilio API method calls (e.g. client.messages.create)
            func_str = _node_to_string(node.func)
            if func_str:
                inferred = infer_product_from_text(func_str)
                if inferred != "general":
                    detections.append(
                        Detection(
                            pattern=func_str,
                            line=node.lineno,
                            detection_method="ast",
                            context=get_context_lines(lines, node.lineno),
                            confidence="high",
                            product=inferred,
                        )
                    )

        # --- Subscript: os.environ['TWILIO_*'] ---
        elif isinstance(node, ast.Subscript):
            sub_str = _reconstruct_subscript(node)
            if sub_str:
                for env_var in TWILIO_ENV_VARS:
                    if env_var in sub_str:
                        detections.append(
                            Detection(
                                pattern=sub_str,
                                line=node.lineno,
                                detection_method="ast",
                                context=get_context_lines(lines, node.lineno),
                                confidence="high",
                                product="general",
                            )
                        )
                        break

        # --- Decorator-based webhook routes ---
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            for decorator in node.decorator_list:
                route_str = _extract_route_string(decorator)
                if route_str and "twilio" in route_str.lower():
                    detections.append(
                        Detection(
                            pattern=f"@route('{route_str}') def {node.name}",
                            line=node.lineno,
                            detection_method="ast",
                            context=get_context_lines(lines, node.lineno),
                            confidence="high",
                            product=_infer_product_from_route(route_str),
                        )
                    )

        # --- Class definitions subclassing twilio ---
        elif isinstance(node, ast.ClassDef):
            for base in node.bases:
                base_str = _node_to_string(base)
                if base_str and "twilio" in base_str.lower():
                    detections.append(
                        Detection(
                            pattern=f"class {node.name}({base_str})",
                            line=node.lineno,
                            detection_method="ast",
                            context=get_context_lines(lines, node.lineno),
                            confidence="high",
                            product="general",
                        )
                    )

    return detections


def _node_to_string(node: ast.AST) -> Optional[str]:
    """Best-effort conversion of an AST node to source-like string."""
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        value = _node_to_string(node.value)
        if value:
            return f"{value}.{node.attr}"
    if isinstance(node, ast.Constant):
        return repr(node.value)
    return None


def _reconstruct_call(node: ast.Call) -> Optional[str]:
    """Reconstruct a function call string for env-var detection."""
    func_str = _node_to_string(node.func)
    if not func_str:
        return None
    if func_str not in (
        "os.environ.get",
        "os.getenv",
        "os.environ.setdefault",
        "environ.get",
        "getenv",
    ):
        return None
    args_strs = []
    for arg in node.args:
        s = _node_to_string(arg)
        if s:
            args_strs.append(s)
    return f"{func_str}({', '.join(args_strs)})"


def _reconstruct_subscript(node: ast.Subscript) -> Optional[str]:
    """Reconstruct os.environ['KEY'] patterns."""
    value_str = _node_to_string(node.value)
    if not value_str:
        return None
    if "environ" not in value_str:
        return None
    slice_node = node.slice
    # Python 3.8 uses ast.Index wrapper; 3.9+ uses the value directly
    if isinstance(slice_node, ast.Index):
        slice_node = slice_node.value  # type: ignore[attr-defined]
    key_str = _node_to_string(slice_node)
    if key_str:
        return f"{value_str}[{key_str}]"
    return None


def _extract_route_string(decorator: ast.AST) -> Optional[str]:
    """Pull the route path from decorators like @app.route('/path')."""
    if not isinstance(decorator, ast.Call):
        return None
    func_str = _node_to_string(decorator.func)
    if not func_str:
        return None
    route_funcs = {"app.route", "bp.route", "router.route", "app.post", "app.get"}
    if not any(func_str.endswith(rf) for rf in route_funcs):
        return None
    if decorator.args:
        s = _node_to_string(decorator.args[0])
        if s:
            return s.strip("'\"")
    return None


def _infer_product_from_route(route: str) -> str:
    """Guess product from a webhook route path."""
    r = route.lower()
    if "voice" in r or "call" in r:
        return "voice"
    if "sms" in r or "messag" in r:
        return "messaging"
    if "status" in r:
        return "general"
    return "general"


# ---------------------------------------------------------------------------
# Python regex fallback (for lines the AST doesn't surface directly)
# ---------------------------------------------------------------------------
_PY_TWILIO_RE = re.compile(r"\btwilio\b", re.IGNORECASE)
_PY_ENV_RE = re.compile(
    r"""(?:os\.environ(?:\.get)?\s*[\[\(]\s*['"]|os\.getenv\s*\(\s*['"])(TWILIO_\w+)""",
    re.IGNORECASE,
)


def scan_python_regex(filepath: Path, lines: List[str], already_detected_lines: Set[int]) -> List[Detection]:
    """Catch anything the AST pass might have missed (comments, strings, etc.)."""
    detections: List[Detection] = []
    for i, line in enumerate(lines, start=1):
        if i in already_detected_lines:
            continue
        if _PY_TWILIO_RE.search(line):
            stripped = line.strip()
            # Skip pure comments unless they contain a URL or config hint
            if stripped.startswith("#") and "twilio" in stripped.lower():
                detections.append(
                    Detection(
                        pattern=stripped,
                        line=i,
                        detection_method="heuristic",
                        context=get_context_lines(lines, i),
                        confidence="low",
                        product="general",
                    )
                )
            elif not stripped.startswith("#"):
                detections.append(
                    Detection(
                        pattern=stripped,
                        line=i,
                        detection_method="regex",
                        context=get_context_lines(lines, i),
                        confidence="medium",
                        product=infer_product_from_text(stripped),
                    )
                )
    return detections


# ---------------------------------------------------------------------------
# JS / TS regex scanner
# ---------------------------------------------------------------------------
_JS_REQUIRE_RE = re.compile(
    r"""(?:require\s*\(\s*['"]|from\s+['"]|import\s+['"])([^'"]*twilio[^'"]*)['"]""",
    re.IGNORECASE,
)
_JS_ENV_RE = re.compile(r"process\.env\.(TWILIO_\w+)", re.IGNORECASE)
_JS_ENV_BRACKET_RE = re.compile(
    r"""process\.env\[['"]?(TWILIO_\w+)['"]?\]""", re.IGNORECASE
)
_JS_CLIENT_RE = re.compile(
    r"""(?:new\s+)?(?:Twilio|twilio)\s*\(""", re.IGNORECASE
)
_JS_ROUTE_RE = re.compile(
    r"""\.(?:get|post|put|delete|patch|all|use)\s*\(\s*['"]([^'"]*twilio[^'"]*)['"]""",
    re.IGNORECASE,
)
_JS_TWILIO_GENERIC_RE = re.compile(r"\btwilio\b", re.IGNORECASE)


def scan_js_file(filepath: Path, lines: List[str]) -> List[Detection]:
    """Regex-based scanning for JS/TS files."""
    detections: List[Detection] = []
    detected_lines: Set[int] = set()

    for i, line in enumerate(lines, start=1):
        stripped = line.strip()

        # require / import
        m = _JS_REQUIRE_RE.search(stripped)
        if m:
            pkg = m.group(1).strip()
            product = "general"
            for key, prod in JS_PACKAGE_PRODUCT_MAP.items():
                if key in pkg:
                    product = prod
                    break
            detections.append(
                Detection(
                    pattern=stripped,
                    line=i,
                    detection_method="regex",
                    context=get_context_lines(lines, i),
                    confidence="high",
                    product=product,
                )
            )
            detected_lines.add(i)
            continue

        # process.env.TWILIO_*
        m = _JS_ENV_RE.search(stripped) or _JS_ENV_BRACKET_RE.search(stripped)
        if m:
            detections.append(
                Detection(
                    pattern=stripped,
                    line=i,
                    detection_method="regex",
                    context=get_context_lines(lines, i),
                    confidence="high",
                    product="general",
                )
            )
            detected_lines.add(i)
            continue

        # new Twilio(...)
        if _JS_CLIENT_RE.search(stripped):
            detections.append(
                Detection(
                    pattern=stripped,
                    line=i,
                    detection_method="regex",
                    context=get_context_lines(lines, i),
                    confidence="high",
                    product="general",
                )
            )
            detected_lines.add(i)
            continue

        # Route handlers with twilio paths
        m = _JS_ROUTE_RE.search(stripped)
        if m:
            route_path = m.group(1)
            detections.append(
                Detection(
                    pattern=stripped,
                    line=i,
                    detection_method="regex",
                    context=get_context_lines(lines, i),
                    confidence="high",
                    product=_infer_product_from_route(route_path),
                )
            )
            detected_lines.add(i)
            continue

    # Method call detection: client.messages.create, etc.
    for i, line in enumerate(lines, start=1):
        if i in detected_lines:
            continue
        stripped = line.strip()
        inferred = infer_product_from_text(stripped)
        if inferred != "general":
            detections.append(
                Detection(
                    pattern=stripped,
                    line=i,
                    detection_method="regex",
                    context=get_context_lines(lines, i),
                    confidence="high",
                    product=inferred,
                )
            )
            detected_lines.add(i)

    # Second pass: catch remaining twilio references
    for i, line in enumerate(lines, start=1):
        if i in detected_lines:
            continue
        stripped = line.strip()
        if _JS_TWILIO_GENERIC_RE.search(stripped):
            # Skip comments
            is_comment = stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*")
            confidence = "low" if is_comment else "medium"
            detections.append(
                Detection(
                    pattern=stripped,
                    line=i,
                    detection_method="heuristic",
                    context=get_context_lines(lines, i),
                    confidence=confidence,
                    product=infer_product_from_text(stripped),
                )
            )

    return detections


# ---------------------------------------------------------------------------
# Config file scanner
# ---------------------------------------------------------------------------
_CONFIG_TWILIO_RE = re.compile(r"TWILIO_\w+", re.IGNORECASE)


def scan_config_file(filepath: Path) -> Tuple[List[str], List[Detection]]:
    """Scan a config/env file for Twilio references. Returns (env_vars, detections)."""
    env_vars: List[str] = []
    detections: List[Detection] = []
    try:
        text = filepath.read_text(errors="replace")
    except (OSError, PermissionError) as exc:
        print(f"WARNING: Could not read {filepath}: {exc}", file=sys.stderr)
        return env_vars, detections

    lines = text.splitlines()
    for i, line in enumerate(lines, start=1):
        matches = _CONFIG_TWILIO_RE.findall(line)
        for var in matches:
            upper_var = var.upper()
            if upper_var not in env_vars:
                env_vars.append(upper_var)
            detections.append(
                Detection(
                    pattern=line.strip(),
                    line=i,
                    detection_method="regex",
                    context=get_context_lines(lines, i),
                    confidence="high",
                    product="general",
                )
            )
    return env_vars, detections


# ---------------------------------------------------------------------------
# Go / Ruby / generic regex scanners
# ---------------------------------------------------------------------------
_GO_TWILIO_IMPORT_RE = re.compile(r'"github\.com/twilio/twilio-go(?:/[^"]*)?"|"twilio"', re.IGNORECASE)
_GO_ENV_RE = re.compile(r'os\.Getenv\s*\(\s*"(TWILIO_\w+)"', re.IGNORECASE)
_GO_TWILIO_RE = re.compile(r"\btwilio\b", re.IGNORECASE)

_RUBY_REQUIRE_RE = re.compile(r"""require\s+['"]twilio-ruby['"]""", re.IGNORECASE)
_RUBY_GEM_RE = re.compile(r"""gem\s+['"]twilio-ruby['"]""", re.IGNORECASE)
_RUBY_ENV_RE = re.compile(r"""ENV\[['"]?(TWILIO_\w+)['"]?\]""", re.IGNORECASE)
_RUBY_TWILIO_RE = re.compile(r"\btwilio\b", re.IGNORECASE)

# Java / Kotlin / Scala patterns
_JAVA_IMPORT_RE = re.compile(r"import\s+(com\.twilio\.[^\s;]+)", re.IGNORECASE)
_JAVA_INIT_RE = re.compile(r"Twilio\.init\s*\(", re.IGNORECASE)
_JAVA_CREATOR_RE = re.compile(
    r"com\.twilio\.rest\.api\.v2010\.account\.(Call|Message|IncomingPhoneNumber)\.creator",
    re.IGNORECASE,
)
_JAVA_TWIML_RE = re.compile(r"com\.twilio\.twiml\.(VoiceResponse|MessagingResponse)", re.IGNORECASE)
_JAVA_ENV_RE = re.compile(r'System\.getenv\s*\(\s*"(TWILIO_\w+)"', re.IGNORECASE)
_JAVA_WEBHOOK_RE = re.compile(r"X-Twilio-Signature|RequestValidator", re.IGNORECASE)
_JAVA_TWILIO_RE = re.compile(r"\btwilio\b", re.IGNORECASE)

# PHP patterns
_PHP_USE_RE = re.compile(r"use\s+Twilio\\([^\s;]+)", re.IGNORECASE)
_PHP_CLIENT_RE = re.compile(r"new\s+Client\s*\(\s*\$\w+\s*,\s*\$\w+", re.IGNORECASE)
_PHP_METHOD_RE = re.compile(r"\$twilio->\s*(\w+)", re.IGNORECASE)
_PHP_ENV_RE = re.compile(r"""(?:getenv\s*\(\s*['"]|\$_ENV\[['"])(TWILIO_\w+)""", re.IGNORECASE)
_PHP_WEBHOOK_RE = re.compile(r"RequestValidator", re.IGNORECASE)
_PHP_TWILIO_RE = re.compile(r"\btwilio\b", re.IGNORECASE)

# C# patterns
_CSHARP_USING_RE = re.compile(r"using\s+(Twilio[^\s;]*)", re.IGNORECASE)
_CSHARP_INIT_RE = re.compile(r"TwilioClient\.Init\s*\(", re.IGNORECASE)
_CSHARP_RESOURCE_RE = re.compile(
    r"(MessageResource|CallResource|IncomingPhoneNumberResource|AccountResource)\.(Create|Read|Update|Fetch)",
    re.IGNORECASE,
)
_CSHARP_ENV_RE = re.compile(
    r'Environment\.GetEnvironmentVariable\s*\(\s*"(TWILIO_\w+)"', re.IGNORECASE
)
_CSHARP_TWILIO_RE = re.compile(r"\btwilio\b", re.IGNORECASE)


def scan_go_file(filepath: Path, lines: List[str]) -> List[Detection]:
    """Regex-based scanning for Go files."""
    detections: List[Detection] = []
    detected_lines: Set[int] = set()

    for i, line in enumerate(lines, start=1):
        stripped = line.strip()

        # Import statements
        if _GO_TWILIO_IMPORT_RE.search(stripped):
            product = "general"
            sl = stripped.lower()
            if "api/v2010" in sl or "rest/api" in sl:
                product = infer_product_from_text(stripped)
            elif "messaging" in sl:
                product = "messaging"
            elif "verify" in sl:
                product = "verify"
            elif "voice" in sl:
                product = "voice"
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="regex",
                    context=get_context_lines(lines, i), confidence="high", product=product,
                )
            )
            detected_lines.add(i)
            continue

        # Env vars
        m = _GO_ENV_RE.search(stripped)
        if m:
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="regex",
                    context=get_context_lines(lines, i), confidence="high", product="general",
                )
            )
            detected_lines.add(i)
            continue

    # Second pass: catch method calls and remaining twilio references
    for i, line in enumerate(lines, start=1):
        if i in detected_lines:
            continue
        stripped = line.strip()
        if stripped.startswith("//"):
            continue
        # Check for API method calls (e.g. CreateMessage, messages.create)
        inferred = infer_product_from_text(stripped)
        if inferred != "general":
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="regex",
                    context=get_context_lines(lines, i), confidence="high",
                    product=inferred,
                )
            )
            detected_lines.add(i)
        elif _GO_TWILIO_RE.search(stripped):
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="heuristic",
                    context=get_context_lines(lines, i), confidence="medium",
                    product="general",
                )
            )

    return detections


def scan_ruby_file(filepath: Path, lines: List[str]) -> List[Detection]:
    """Regex-based scanning for Ruby files."""
    detections: List[Detection] = []
    detected_lines: Set[int] = set()

    for i, line in enumerate(lines, start=1):
        stripped = line.strip()

        # require / gem
        if _RUBY_REQUIRE_RE.search(stripped) or _RUBY_GEM_RE.search(stripped):
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="regex",
                    context=get_context_lines(lines, i), confidence="high", product="general",
                )
            )
            detected_lines.add(i)
            continue

        # Env vars
        m = _RUBY_ENV_RE.search(stripped)
        if m:
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="regex",
                    context=get_context_lines(lines, i), confidence="high", product="general",
                )
            )
            detected_lines.add(i)
            continue

    # Second pass: method calls and remaining twilio references
    for i, line in enumerate(lines, start=1):
        if i in detected_lines:
            continue
        stripped = line.strip()
        if stripped.startswith("#"):
            continue
        inferred = infer_product_from_text(stripped)
        if inferred != "general":
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="regex",
                    context=get_context_lines(lines, i), confidence="high",
                    product=inferred,
                )
            )
            detected_lines.add(i)
        elif _RUBY_TWILIO_RE.search(stripped) and not stripped.startswith("#"):
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="heuristic",
                    context=get_context_lines(lines, i), confidence="medium",
                    product="general",
                )
            )

    return detections


def scan_java_file(filepath: Path, lines: List[str]) -> List[Detection]:
    """Regex-based scanning for Java / Kotlin / Scala files."""
    detections: List[Detection] = []
    detected_lines: Set[int] = set()

    for i, line in enumerate(lines, start=1):
        stripped = line.strip()

        # import com.twilio.*
        m = _JAVA_IMPORT_RE.search(stripped)
        if m:
            pkg = m.group(1).lower()
            product = "general"
            if "messaging" in pkg or "message" in pkg:
                product = "messaging"
            elif "voice" in pkg or "call" in pkg:
                product = "voice"
            elif "verify" in pkg:
                product = "verify"
            elif "video" in pkg:
                product = "video"
            elif "chat" in pkg or "conversation" in pkg:
                product = "conversations"
            elif "lookup" in pkg:
                product = "lookup"
            elif "twiml.voice" in pkg:
                product = "voice"
            elif "twiml.messaging" in pkg:
                product = "messaging"
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="regex",
                    context=get_context_lines(lines, i), confidence="high", product=product,
                )
            )
            detected_lines.add(i)
            continue

        # Twilio.init(
        if _JAVA_INIT_RE.search(stripped):
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="regex",
                    context=get_context_lines(lines, i), confidence="high", product="general",
                )
            )
            detected_lines.add(i)
            continue

        # Creator patterns: Call.creator, Message.creator
        m = _JAVA_CREATOR_RE.search(stripped)
        if m:
            resource = m.group(1).lower()
            product = "general"
            if resource == "call":
                product = "voice"
            elif resource == "message":
                product = "messaging"
            elif resource == "incomingphonenumber":
                product = "phone-numbers"
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="regex",
                    context=get_context_lines(lines, i), confidence="high", product=product,
                )
            )
            detected_lines.add(i)
            continue

        # TwiML responses
        m = _JAVA_TWIML_RE.search(stripped)
        if m:
            twiml_class = m.group(1)
            product = "voice" if "Voice" in twiml_class else "messaging"
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="regex",
                    context=get_context_lines(lines, i), confidence="high", product=product,
                )
            )
            detected_lines.add(i)
            continue

        # Env vars: System.getenv("TWILIO_*")
        m = _JAVA_ENV_RE.search(stripped)
        if m:
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="regex",
                    context=get_context_lines(lines, i), confidence="high", product="general",
                )
            )
            detected_lines.add(i)
            continue

        # Webhook patterns: X-Twilio-Signature, RequestValidator
        if _JAVA_WEBHOOK_RE.search(stripped):
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="regex",
                    context=get_context_lines(lines, i), confidence="high", product="webhook-validation",
                )
            )
            detected_lines.add(i)
            continue

    # Second pass: method calls and remaining twilio references
    for i, line in enumerate(lines, start=1):
        if i in detected_lines:
            continue
        stripped = line.strip()
        if stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*"):
            continue
        inferred = infer_product_from_text(stripped)
        if inferred != "general":
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="regex",
                    context=get_context_lines(lines, i), confidence="high",
                    product=inferred,
                )
            )
            detected_lines.add(i)
        elif _JAVA_TWILIO_RE.search(stripped):
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="heuristic",
                    context=get_context_lines(lines, i), confidence="medium",
                    product="general",
                )
            )

    return detections


def scan_php_file(filepath: Path, lines: List[str]) -> List[Detection]:
    """Regex-based scanning for PHP files."""
    detections: List[Detection] = []
    detected_lines: Set[int] = set()

    for i, line in enumerate(lines, start=1):
        stripped = line.strip()

        # use Twilio\* namespace imports
        m = _PHP_USE_RE.search(stripped)
        if m:
            ns = m.group(1).lower()
            product = "general"
            if "messaging" in ns or "message" in ns:
                product = "messaging"
            elif "voice" in ns or "call" in ns:
                product = "voice"
            elif "verify" in ns:
                product = "verify"
            elif "video" in ns:
                product = "video"
            elif "chat" in ns or "conversation" in ns:
                product = "conversations"
            elif "lookup" in ns:
                product = "lookup"
            elif "twiml" in ns:
                if "voice" in ns:
                    product = "voice"
                elif "messaging" in ns:
                    product = "messaging"
                else:
                    product = "twiml"
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="regex",
                    context=get_context_lines(lines, i), confidence="high", product=product,
                )
            )
            detected_lines.add(i)
            continue

        # new Client($sid, $token)
        if _PHP_CLIENT_RE.search(stripped):
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="regex",
                    context=get_context_lines(lines, i), confidence="high", product="general",
                )
            )
            detected_lines.add(i)
            continue

        # $twilio-> method calls
        m = _PHP_METHOD_RE.search(stripped)
        if m:
            method = m.group(1).lower()
            product = "general"
            if method in ("messages", "message"):
                product = "messaging"
            elif method in ("calls", "call"):
                product = "voice"
            elif method in ("verify", "verification"):
                product = "verify"
            elif method in ("video",):
                product = "video"
            elif method in ("lookups", "lookup"):
                product = "lookup"
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="regex",
                    context=get_context_lines(lines, i), confidence="high", product=product,
                )
            )
            detected_lines.add(i)
            continue

        # Env vars: getenv('TWILIO_*'), $_ENV['TWILIO_*']
        m = _PHP_ENV_RE.search(stripped)
        if m:
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="regex",
                    context=get_context_lines(lines, i), confidence="high", product="general",
                )
            )
            detected_lines.add(i)
            continue

        # RequestValidator for webhooks
        if _PHP_WEBHOOK_RE.search(stripped) and _PHP_TWILIO_RE.search(stripped):
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="regex",
                    context=get_context_lines(lines, i), confidence="high", product="webhook-validation",
                )
            )
            detected_lines.add(i)
            continue

    # Second pass: method calls and remaining twilio references
    for i, line in enumerate(lines, start=1):
        if i in detected_lines:
            continue
        stripped = line.strip()
        if stripped.startswith("//") or stripped.startswith("#") or stripped.startswith("/*") or stripped.startswith("*"):
            continue
        inferred = infer_product_from_text(stripped)
        if inferred != "general":
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="regex",
                    context=get_context_lines(lines, i), confidence="high",
                    product=inferred,
                )
            )
            detected_lines.add(i)
        elif _PHP_TWILIO_RE.search(stripped):
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="heuristic",
                    context=get_context_lines(lines, i), confidence="medium",
                    product="general",
                )
            )

    return detections


def scan_csharp_file(filepath: Path, lines: List[str]) -> List[Detection]:
    """Regex-based scanning for C# files."""
    detections: List[Detection] = []
    detected_lines: Set[int] = set()

    for i, line in enumerate(lines, start=1):
        stripped = line.strip()

        # using Twilio* imports
        m = _CSHARP_USING_RE.search(stripped)
        if m:
            ns = m.group(1).lower()
            product = "general"
            if "messaging" in ns or "message" in ns:
                product = "messaging"
            elif "voice" in ns or "call" in ns:
                product = "voice"
            elif "verify" in ns:
                product = "verify"
            elif "video" in ns:
                product = "video"
            elif "chat" in ns or "conversation" in ns:
                product = "conversations"
            elif "lookup" in ns:
                product = "lookup"
            elif "twiml" in ns:
                if "voice" in ns:
                    product = "voice"
                elif "messaging" in ns:
                    product = "messaging"
                else:
                    product = "twiml"
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="regex",
                    context=get_context_lines(lines, i), confidence="high", product=product,
                )
            )
            detected_lines.add(i)
            continue

        # TwilioClient.Init(
        if _CSHARP_INIT_RE.search(stripped):
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="regex",
                    context=get_context_lines(lines, i), confidence="high", product="general",
                )
            )
            detected_lines.add(i)
            continue

        # Resource method calls: MessageResource.Create, CallResource.Create, etc.
        m = _CSHARP_RESOURCE_RE.search(stripped)
        if m:
            resource = m.group(1).lower()
            product = "general"
            if "message" in resource:
                product = "messaging"
            elif "call" in resource:
                product = "voice"
            elif "incomingphonenumber" in resource:
                product = "phone-numbers"
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="regex",
                    context=get_context_lines(lines, i), confidence="high", product=product,
                )
            )
            detected_lines.add(i)
            continue

        # Env vars: Environment.GetEnvironmentVariable("TWILIO_*")
        m = _CSHARP_ENV_RE.search(stripped)
        if m:
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="regex",
                    context=get_context_lines(lines, i), confidence="high", product="general",
                )
            )
            detected_lines.add(i)
            continue

    # Second pass: method calls and remaining twilio references
    for i, line in enumerate(lines, start=1):
        if i in detected_lines:
            continue
        stripped = line.strip()
        if stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*"):
            continue
        inferred = infer_product_from_text(stripped)
        if inferred != "general":
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="regex",
                    context=get_context_lines(lines, i), confidence="high",
                    product=inferred,
                )
            )
            detected_lines.add(i)
        elif _CSHARP_TWILIO_RE.search(stripped):
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="heuristic",
                    context=get_context_lines(lines, i), confidence="medium",
                    product="general",
                )
            )

    return detections


def scan_generic_text_file(filepath: Path, lines: List[str]) -> List[Detection]:
    """Regex-based scanning for XML, YAML, and other text files."""
    detections: List[Detection] = []
    twilio_re = re.compile(r"\btwilio\b|api\.twilio\.com|TWILIO_\w+", re.IGNORECASE)

    for i, line in enumerate(lines, start=1):
        stripped = line.strip()
        if twilio_re.search(stripped):
            product = "general"
            sl = stripped.lower()
            if "<response>" in sl or "<say>" in sl or "<gather>" in sl or "<dial>" in sl:
                product = "twiml"
            elif "api.twilio.com" in sl:
                product = "general"
            detections.append(
                Detection(
                    pattern=stripped, line=i, detection_method="heuristic",
                    context=get_context_lines(lines, i), confidence="medium", product=product,
                )
            )

    return detections


# ---------------------------------------------------------------------------
# Directory walker
# ---------------------------------------------------------------------------
def walk_project(root: Path):
    """Yield file paths, skipping common non-source directories."""
    for dirpath, dirnames, filenames in os.walk(root):
        # Prune skip dirs in-place
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
        for fname in filenames:
            yield Path(dirpath) / fname


# ---------------------------------------------------------------------------
# Main scan orchestration
# ---------------------------------------------------------------------------
def run_scan(project_root: Path) -> Dict[str, Any]:
    """Execute the full scan and return the result dict."""
    file_results: List[FileResult] = []
    all_env_vars: List[str] = []
    config_files_found: List[str] = []
    webhook_handlers: List[Dict[str, Any]] = []
    languages_seen: Set[str] = set()
    all_products: Set[str] = set()
    method_counts: Dict[str, int] = {"ast": 0, "regex": 0, "heuristic": 0}
    confidence_counts: Dict[str, int] = {"high": 0, "medium": 0, "low": 0}

    for filepath in walk_project(project_root):
        ext = filepath.suffix.lower()
        name = filepath.name

        # --- Config files ---
        if name in CONFIG_FILE_NAMES:
            env_vars, cfg_detections = scan_config_file(filepath)
            if env_vars or cfg_detections:
                rel = str(filepath.relative_to(project_root))
                config_files_found.append(rel)
                for v in env_vars:
                    if v not in all_env_vars:
                        all_env_vars.append(v)
                if cfg_detections:
                    fr = FileResult(rel, "config")
                    fr.detections = cfg_detections
                    file_results.append(fr)
                    for d in cfg_detections:
                        method_counts[d.detection_method] = method_counts.get(d.detection_method, 0) + 1
                        confidence_counts[d.confidence] = confidence_counts.get(d.confidence, 0) + 1
            continue

        # --- Python files ---
        if ext in PY_EXTENSIONS:
            try:
                text = filepath.read_text(errors="replace")
            except (OSError, PermissionError) as exc:
                print(f"WARNING: Could not read {filepath}: {exc}", file=sys.stderr)
                continue

            # Quick pre-filter: skip files with no twilio reference at all
            if "twilio" not in text.lower():
                continue

            lines = text.splitlines()
            rel = str(filepath.relative_to(project_root))

            # AST pass
            ast_detections = scan_python_ast(filepath, lines)
            ast_lines = {d.line for d in ast_detections}

            # Regex fallback pass
            regex_detections = scan_python_regex(filepath, lines, ast_lines)

            all_detections = ast_detections + regex_detections
            if all_detections:
                fr = FileResult(rel, "python")
                fr.detections = all_detections
                file_results.append(fr)
                languages_seen.add("python")
                for d in all_detections:
                    all_products.add(d.product)
                    method_counts[d.detection_method] = method_counts.get(d.detection_method, 0) + 1
                    confidence_counts[d.confidence] = confidence_counts.get(d.confidence, 0) + 1
                    if "route" in d.pattern.lower() or "webhook" in d.pattern.lower():
                        webhook_handlers.append({
                            "file": rel,
                            "line": d.line,
                            "pattern": d.pattern,
                            "product": d.product,
                        })

            # Collect env vars from Python source
            for match in _PY_ENV_RE.finditer(text):
                var = match.group(1).upper()
                if var not in all_env_vars:
                    all_env_vars.append(var)
            continue

        # --- JS/TS files ---
        if ext in JS_EXTENSIONS:
            try:
                text = filepath.read_text(errors="replace")
            except (OSError, PermissionError) as exc:
                print(f"WARNING: Could not read {filepath}: {exc}", file=sys.stderr)
                continue

            if "twilio" not in text.lower():
                continue

            lines = text.splitlines()
            rel = str(filepath.relative_to(project_root))
            js_detections = scan_js_file(filepath, lines)
            if js_detections:
                lang = "typescript" if ext in {".ts", ".tsx"} else "javascript"
                fr = FileResult(rel, lang)
                fr.detections = js_detections
                file_results.append(fr)
                languages_seen.add(lang)
                for d in js_detections:
                    all_products.add(d.product)
                    method_counts[d.detection_method] = method_counts.get(d.detection_method, 0) + 1
                    confidence_counts[d.confidence] = confidence_counts.get(d.confidence, 0) + 1
                    if "route" in d.pattern.lower() or "webhook" in d.pattern.lower():
                        webhook_handlers.append({
                            "file": rel,
                            "line": d.line,
                            "pattern": d.pattern,
                            "product": d.product,
                        })

            # Collect env vars from JS source
            for match in _JS_ENV_RE.finditer(text):
                var = match.group(1).upper()
                if var not in all_env_vars:
                    all_env_vars.append(var)
            for match in _JS_ENV_BRACKET_RE.finditer(text):
                var = match.group(1).upper()
                if var not in all_env_vars:
                    all_env_vars.append(var)
            continue

        # --- Go files ---
        if ext in GO_EXTENSIONS:
            try:
                text = filepath.read_text(errors="replace")
            except (OSError, PermissionError):
                continue
            if "twilio" not in text.lower():
                continue
            lines = text.splitlines()
            rel = str(filepath.relative_to(project_root))
            go_detections = scan_go_file(filepath, lines)
            if go_detections:
                fr = FileResult(rel, "go")
                fr.detections = go_detections
                file_results.append(fr)
                languages_seen.add("go")
                for d in go_detections:
                    all_products.add(d.product)
                    method_counts[d.detection_method] = method_counts.get(d.detection_method, 0) + 1
                    confidence_counts[d.confidence] = confidence_counts.get(d.confidence, 0) + 1
            # Go env vars
            for match in _GO_ENV_RE.finditer(text):
                var = match.group(1).upper()
                if var not in all_env_vars:
                    all_env_vars.append(var)
            continue

        # --- Ruby files ---
        if ext in RUBY_EXTENSIONS:
            try:
                text = filepath.read_text(errors="replace")
            except (OSError, PermissionError):
                continue
            if "twilio" not in text.lower():
                continue
            lines = text.splitlines()
            rel = str(filepath.relative_to(project_root))
            ruby_detections = scan_ruby_file(filepath, lines)
            if ruby_detections:
                fr = FileResult(rel, "ruby")
                fr.detections = ruby_detections
                file_results.append(fr)
                languages_seen.add("ruby")
                for d in ruby_detections:
                    all_products.add(d.product)
                    method_counts[d.detection_method] = method_counts.get(d.detection_method, 0) + 1
                    confidence_counts[d.confidence] = confidence_counts.get(d.confidence, 0) + 1
            # Ruby env vars
            for match in _RUBY_ENV_RE.finditer(text):
                var = match.group(1).upper()
                if var not in all_env_vars:
                    all_env_vars.append(var)
            continue

        # --- Java / Kotlin / Scala files ---
        if ext in JAVA_EXTENSIONS:
            try:
                text = filepath.read_text(errors="replace")
            except (OSError, PermissionError):
                continue
            if "twilio" not in text.lower():
                continue
            lines = text.splitlines()
            rel = str(filepath.relative_to(project_root))
            java_detections = scan_java_file(filepath, lines)
            if java_detections:
                lang = "kotlin" if ext == ".kt" else "scala" if ext == ".scala" else "java"
                fr = FileResult(rel, lang)
                fr.detections = java_detections
                file_results.append(fr)
                languages_seen.add(lang)
                for d in java_detections:
                    all_products.add(d.product)
                    method_counts[d.detection_method] = method_counts.get(d.detection_method, 0) + 1
                    confidence_counts[d.confidence] = confidence_counts.get(d.confidence, 0) + 1
                    if "route" in d.pattern.lower() or "webhook" in d.pattern.lower():
                        webhook_handlers.append({
                            "file": rel,
                            "line": d.line,
                            "pattern": d.pattern,
                            "product": d.product,
                        })
            # Java env vars
            for match in _JAVA_ENV_RE.finditer(text):
                var = match.group(1).upper()
                if var not in all_env_vars:
                    all_env_vars.append(var)
            continue

        # --- PHP files ---
        if ext in PHP_EXTENSIONS:
            try:
                text = filepath.read_text(errors="replace")
            except (OSError, PermissionError):
                continue
            if "twilio" not in text.lower():
                continue
            lines = text.splitlines()
            rel = str(filepath.relative_to(project_root))
            php_detections = scan_php_file(filepath, lines)
            if php_detections:
                fr = FileResult(rel, "php")
                fr.detections = php_detections
                file_results.append(fr)
                languages_seen.add("php")
                for d in php_detections:
                    all_products.add(d.product)
                    method_counts[d.detection_method] = method_counts.get(d.detection_method, 0) + 1
                    confidence_counts[d.confidence] = confidence_counts.get(d.confidence, 0) + 1
                    if "route" in d.pattern.lower() or "webhook" in d.pattern.lower():
                        webhook_handlers.append({
                            "file": rel,
                            "line": d.line,
                            "pattern": d.pattern,
                            "product": d.product,
                        })
            # PHP env vars
            for match in _PHP_ENV_RE.finditer(text):
                var = match.group(1).upper()
                if var not in all_env_vars:
                    all_env_vars.append(var)
            continue

        # --- C# files ---
        if ext in CSHARP_EXTENSIONS:
            try:
                text = filepath.read_text(errors="replace")
            except (OSError, PermissionError):
                continue
            if "twilio" not in text.lower():
                continue
            lines = text.splitlines()
            rel = str(filepath.relative_to(project_root))
            csharp_detections = scan_csharp_file(filepath, lines)
            if csharp_detections:
                fr = FileResult(rel, "csharp")
                fr.detections = csharp_detections
                file_results.append(fr)
                languages_seen.add("csharp")
                for d in csharp_detections:
                    all_products.add(d.product)
                    method_counts[d.detection_method] = method_counts.get(d.detection_method, 0) + 1
                    confidence_counts[d.confidence] = confidence_counts.get(d.confidence, 0) + 1
                    if "route" in d.pattern.lower() or "webhook" in d.pattern.lower():
                        webhook_handlers.append({
                            "file": rel,
                            "line": d.line,
                            "pattern": d.pattern,
                            "product": d.product,
                        })
            # C# env vars
            for match in _CSHARP_ENV_RE.finditer(text):
                var = match.group(1).upper()
                if var not in all_env_vars:
                    all_env_vars.append(var)
            continue

        # --- Dependency files ---
        if name in DEPENDENCY_FILE_NAMES:
            try:
                text = filepath.read_text(errors="replace")
            except (OSError, PermissionError):
                continue
            if "twilio" not in text.lower():
                continue
            rel = str(filepath.relative_to(project_root))
            config_files_found.append(rel)
            lines = text.splitlines()
            for i, line in enumerate(lines, start=1):
                if "twilio" in line.lower():
                    fr_dep = FileResult(rel, "config")
                    fr_dep.detections.append(Detection(
                        pattern=line.strip(), line=i, detection_method="regex",
                        context=get_context_lines(lines, i), confidence="high", product="general",
                    ))
                    file_results.append(fr_dep)
                    break
            continue

        # --- Generic text files (XML, YAML, etc.) ---
        if ext in OTHER_TEXT_EXTENSIONS:
            try:
                text = filepath.read_text(errors="replace")
            except (OSError, PermissionError):
                continue
            if "twilio" not in text.lower():
                continue
            lines = text.splitlines()
            rel = str(filepath.relative_to(project_root))
            gen_detections = scan_generic_text_file(filepath, lines)
            if gen_detections:
                lang_name = "xml" if ext == ".xml" else "yaml"
                fr = FileResult(rel, lang_name)
                fr.detections = gen_detections
                file_results.append(fr)
                for d in gen_detections:
                    all_products.add(d.product)
                    method_counts[d.detection_method] = method_counts.get(d.detection_method, 0) + 1
                    confidence_counts[d.confidence] = confidence_counts.get(d.confidence, 0) + 1

    # --- Post-processing: improve webhook handler detection ---
    _webhook_keywords = re.compile(
        r"RequestValidator|validateRequest|X-Twilio-Signature|"
        r"webhook|request_validator|validate_request|@app\.(route|post|get)",
        re.IGNORECASE,
    )
    for fr in file_results:
        for d in fr.detections:
            if _webhook_keywords.search(d.pattern):
                if not any(wh["file"] == fr.path and wh["line"] == d.line for wh in webhook_handlers):
                    webhook_handlers.append({
                        "file": fr.path,
                        "line": d.line,
                        "pattern": d.pattern,
                        "product": d.product,
                    })
                    if d.product == "general":
                        d.product = "webhook-validation"
                        all_products.add("webhook-validation")

    # --- Post-processing: improve product inference from method calls ---
    for fr in file_results:
        for d in fr.detections:
            if d.product == "general":
                inferred = infer_product_from_text(d.pattern)
                if inferred != "general":
                    d.product = inferred
                    all_products.add(inferred)

    total_detections = sum(len(fr.detections) for fr in file_results)

    return {
        "scan_version": SCAN_VERSION,
        "scanner": SCANNER_NAME,
        "project_root": str(project_root.resolve()),
        "scan_time": datetime.now(timezone.utc).isoformat(),
        "languages_detected": sorted(languages_seen),
        "products_used": sorted(all_products),
        "files": [fr.to_dict() for fr in file_results],
        "env_vars": all_env_vars,
        "config_files": config_files_found,
        "webhook_handlers": webhook_handlers,
        "summary": {
            "total_files": len(file_results),
            "total_detections": total_detections,
            "by_method": {k: v for k, v in method_counts.items() if v > 0},
            "by_confidence": {k: v for k, v in confidence_counts.items() if v > 0},
        },
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main() -> int:
    parser = argparse.ArgumentParser(
        prog="scan-twilio-deep",
        description=(
            "AST-level deep scanner for Twilio SDK usage.\n\n"
            "Scans a project directory for Twilio imports, environment variables,\n"
            "webhook handlers, config files, and SDK usage patterns.\n"
            "Uses Python's ast module for .py files and regex heuristics for\n"
            ".js/.ts/.jsx/.tsx files.\n\n"
            "Outputs structured JSON to stdout."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "examples:\n"
            "  %(prog)s /path/to/project\n"
            "  %(prog)s /path/to/project | jq '.summary'\n"
            "  %(prog)s /path/to/project -o report.json\n"
        ),
    )
    parser.add_argument(
        "project_root",
        metavar="<project-root>",
        help="Root directory of the project to scan",
    )
    parser.add_argument(
        "-o",
        "--output",
        metavar="FILE",
        default=None,
        help="Write JSON output to FILE instead of stdout",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        default=True,
        help="Pretty-print JSON output (default: true)",
    )
    parser.add_argument(
        "--compact",
        action="store_true",
        default=False,
        help="Compact JSON output (overrides --pretty)",
    )
    parser.add_argument(
        "--version",
        action="version",
        version=f"%(prog)s {SCAN_VERSION}",
    )

    args = parser.parse_args()

    project_root = Path(args.project_root)
    if not project_root.is_dir():
        print(
            f"ERROR: '{project_root}' is not a directory or does not exist.",
            file=sys.stderr,
        )
        return 1

    result = run_scan(project_root)

    indent = None if args.compact else 2
    json_str = json.dumps(result, indent=indent, ensure_ascii=False)

    if args.output:
        try:
            Path(args.output).write_text(json_str + "\n")
            print(f"Output written to {args.output}", file=sys.stderr)
        except OSError as exc:
            print(f"ERROR: Could not write to {args.output}: {exc}", file=sys.stderr)
            return 1
    else:
        print(json_str)

    return 0


if __name__ == "__main__":
    sys.exit(main())
