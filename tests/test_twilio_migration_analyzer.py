#!/usr/bin/env python3
"""No-network contracts for the Twilio migration static analyzers."""

from __future__ import annotations

import json
import os
import pty
import re
import runpy
import select
import shutil
import stat
import subprocess
import sys
import tempfile
import time
import unittest
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
BASH = shutil.which("bash") or "/bin/bash"
MIGRATION_SCRIPTS = (
    ROOT
    / "skills"
    / "telnyx-twilio-migration"
    / "scripts"
    / "test-migration"
)
CORRECTNESS_LINTER = MIGRATION_SCRIPTS.parent / "lint-telnyx-correctness.sh"
MESSAGING_SOURCE_ANALYZER = (
    MIGRATION_SCRIPTS.parent / "lint-required-messaging-profile.py"
)
PREFLIGHT_SCRIPT = MIGRATION_SCRIPTS.parent / "preflight-check.sh"
TEXML_VALIDATOR = MIGRATION_SCRIPTS.parent / "validate-texml.sh"
FILTER_SOURCE_SCRIPT = MIGRATION_SCRIPTS.parent / "filter-source-matches.py"
SMOKE_SCRIPT = MIGRATION_SCRIPTS / "smoke-test.sh"
WEBHOOK_FIXTURE_SCRIPT = MIGRATION_SCRIPTS / "test-webhooks-local.py"
FAKE_DRIVER_ENV = "TELNYX_MIGRATION_FAKE_DRIVER"
SCENARIO_ENV = "TELNYX_MIGRATION_FAKE_SCENARIO"
LOG_ENV = "TELNYX_MIGRATION_FAKE_LOG"
VALID_JWT = (
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJleHAiOjQxMDI0NDQ4MDB9.c2ln"
)

class CorrectnessLinterProductArgument(unittest.TestCase):
    """--product must fail loudly. An unrecognised value matches no check's
    product list, so every product-scoped check silently disappears and the
    linter still exits 0 — a typo certifies the migration."""

    maxDiff = None

    def run_product(self, product: str) -> subprocess.CompletedProcess[str]:
        with tempfile.TemporaryDirectory(prefix="telnyx-linter-product-") as directory:
            (Path(directory) / "noop.txt").write_text("noop\n", encoding="utf-8")
            return subprocess.run(
                [BASH, str(CORRECTNESS_LINTER), directory, "--product", product],
                cwd=ROOT,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )

    def test_shell_endpoint_unknown_product_exits_two(self) -> None:
        result = self.run_product("mesaging")
        self.assertEqual(2, result.returncode, result.stdout + result.stderr)
        self.assertIn("Unknown product 'mesaging'", result.stderr)

    def test_shell_endpoint_known_products_are_accepted(self) -> None:
        for product in (
            "voice",
            "messaging",
            "verify",
            "webrtc",
            "sip",
            "fax",
            "video",
            "iot",
            "lookup",
            "numbers",
            "phone-numbers",
            "porting",
        ):
            with self.subTest(product=product):
                result = self.run_product(product)
                self.assertEqual(
                    0, result.returncode, result.stdout + result.stderr
                )


class CorrectnessLinterContracts(unittest.TestCase):
    maxDiff = None

    @classmethod
    def setUpClass(cls) -> None:
        if shutil.which("jq") is None:
            raise RuntimeError("jq is required by the correctness-linter contract tests")

    def run_messaging_linter(
        self, files: dict[str, str], *, product: str = "messaging"
    ) -> tuple[subprocess.CompletedProcess[str], dict[str, Any]]:
        with tempfile.TemporaryDirectory(prefix="telnyx-linter-contracts-") as directory:
            project_root = Path(directory)
            for relative_path, contents in files.items():
                fixture_path = project_root / relative_path
                fixture_path.parent.mkdir(parents=True, exist_ok=True)
                fixture_path.write_text(contents, encoding="utf-8")

            result = subprocess.run(
                [
                    BASH,
                    str(CORRECTNESS_LINTER),
                    str(project_root),
                    "--product",
                    product,
                    "--json",
                ],
                cwd=ROOT,
                capture_output=True,
                text=True,
                timeout=15,
                check=False,
            )
            self.assertIn(
                result.returncode,
                {0, 1},
                f"linter execution failed\nstdout:\n{result.stdout}\nstderr:\n{result.stderr}",
            )
            try:
                payload = json.loads(result.stdout)
            except json.JSONDecodeError as error:
                self.fail(
                    f"linter did not emit valid JSON: {error}\n"
                    f"stdout:\n{result.stdout}\nstderr:\n{result.stderr}"
                )
            return result, payload

    def run_required_profile_analyzer(
        self, files: dict[str, str]
    ) -> subprocess.CompletedProcess[str]:
        with tempfile.TemporaryDirectory(prefix="telnyx-source-analyzer-") as directory:
            project_root = Path(directory)
            for relative_path, contents in files.items():
                fixture_path = project_root / relative_path
                fixture_path.parent.mkdir(parents=True, exist_ok=True)
                fixture_path.write_text(contents, encoding="utf-8")
            return subprocess.run(
                [sys.executable, "-B", str(MESSAGING_SOURCE_ANALYZER), str(project_root)],
                cwd=ROOT,
                capture_output=True,
                text=True,
                timeout=15,
                check=False,
            )

    def test_documented_mapping_prose_is_not_residual_twilio(self) -> None:
        result, payload = self.run_messaging_linter(
            {
                # Mixed casing matters on Linux even though macOS resolves it.
                "Readme.md": (
                    "A Messaging Profile is the Telnyx equivalent of a "
                    "Twilio Messaging Service.\n"
                    "Behavior change from the Twilio integration: national "
                    "number normalization is no longer automatic.\n"
                    "Badge: https://github.com/TwilioDevEd/example/actions/"
                    "workflows/test.yml/badge.svg\n"
                    "Clone: git@github.com:TwilioDevEd/example.git\n"
                )
            }
        )
        check = next(
            item
            for item in payload["checks"]
            if item["name"] == "docs_still_twilio"
        )
        self.assertEqual("pass", check["status"], payload)
        self.assertEqual(0, result.returncode, result.stdout)

    def run_filter_source_matches(
        self, filename: str, source: str, mode: str, pattern: str
    ) -> str:
        with tempfile.TemporaryDirectory(prefix="filter-source-") as directory:
            path = Path(directory) / filename
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(source, encoding="utf-8")
            # Match the producer contract exactly: grep --null terminates the
            # filename with NUL and counts only LF as a source-line boundary.
            grep_output = b"".join(
                os.fsencode(path)
                + b"\0"
                + str(i + 1).encode("ascii")
                + b":"
                + line.encode("utf-8")
                + b"\n"
                for i, line in enumerate(source.split("\n"))
                if line.strip()
            )
            result = subprocess.run(
                [
                    sys.executable,
                    "-B",
                    str(FILTER_SOURCE_SCRIPT),
                    "--mode",
                    mode,
                    "--pattern",
                    pattern,
                    "--analyzer",
                    str(MESSAGING_SOURCE_ANALYZER),
                ],
                input=grep_output,
                capture_output=True,
                timeout=15,
                check=False,
            )
            self.assertEqual(0, result.returncode, result.stderr.decode())
            return result.stdout.decode()

    def test_filter_source_matches_strips_comments_keeps_strings(self) -> None:
        # A comment-only match is filtered; a string match is preserved.
        output = self.run_filter_source_matches(
            "app.js",
            "// from twilio import Client\n"
            'const msg = "from twilio removed";\n'
            "from twilio.rest import Client\n",
            "comments",
            "from twilio",
        )
        kept_lines = [line for line in output.splitlines() if line.strip()]
        # Line 1 (comment) should be stripped; lines 2 and 3 kept.
        self.assertEqual(2, len(kept_lines), output)
        self.assertNotIn(":1:", kept_lines[0])
        self.assertIn(":2:", kept_lines[0])
        self.assertIn(":3:", kept_lines[1])

    def test_filter_source_matches_code_mode_masks_strings(self) -> None:
        # In code mode, string content is masked so VoiceResponse in a
        # string literal is not reported as live code.
        output = self.run_filter_source_matches(
            "app.js",
            'const msg = "VoiceResponse() removed";\n'
            "const x = VoiceResponse();\n",
            "code",
            "VoiceResponse",
        )
        kept_lines = [line for line in output.splitlines() if line.strip()]
        # Only the live code line (2) should survive.
        self.assertEqual(1, len(kept_lines), output)
        self.assertIn(":2:", kept_lines[0])

    def test_filter_source_matches_uses_grep_lf_line_boundaries(self) -> None:
        # str.splitlines() also splits form-feed and vertical-tab characters,
        # while grep -n does not. That disagreement used to index the wrong
        # lexed line and silently discard the live match after either byte.
        for separator in ("\f", "\v"):
            with self.subTest(separator=repr(separator)):
                output = self.run_filter_source_matches(
                    "app.js",
                    f"const marker = 1;{separator}\nconst x = VoiceResponse();\n",
                    "code",
                    "VoiceResponse",
                )
                self.assertIn(":2:", output)
                self.assertIn("VoiceResponse", output)

        # grep counts only LF. A preceding bare CR must stay inside the same
        # grep record instead of becoming a synthetic lexer line.
        output = self.run_filter_source_matches(
            "app.py",
            "# removed VoiceResponse()\rVoiceResponse()\n",
            "code",
            "VoiceResponse",
        )
        self.assertIn(":1:", output)
        self.assertIn("VoiceResponse", output)

    def test_filter_source_matches_preserves_numeric_colons_in_paths(self) -> None:
        # The old `<path>:<line>:<text>` regex treated `:123:` inside a valid
        # path as the locator, then fell back to filtering the raw comment.
        output = self.run_filter_source_matches(
            "root:123:part/app.js",
            "// VoiceResponse() removed\nconst x = VoiceResponse();\n",
            "code",
            "VoiceResponse",
        )
        kept_lines = [line for line in output.splitlines() if line.strip()]
        self.assertEqual(1, len(kept_lines), output)
        self.assertIn("root:123:part/app.js:2:", kept_lines[0])

    def test_filter_source_matches_keeps_numeric_colons_in_match_text(self) -> None:
        output = self.run_filter_source_matches(
            "app.js",
            "const x = VoiceResponse({code:123:value});\n",
            "code",
            "VoiceResponse",
        )
        self.assertIn("code:123:value", output)

    def test_filter_source_matches_rejects_legacy_ambiguous_records(self) -> None:
        result = subprocess.run(
            [
                sys.executable,
                "-B",
                str(FILTER_SOURCE_SCRIPT),
                "--mode",
                "code",
                "--pattern",
                "VoiceResponse",
                "--analyzer",
                str(MESSAGING_SOURCE_ANALYZER),
            ],
            input=b"/tmp/app.js:1:VoiceResponse()\n",
            capture_output=True,
            timeout=15,
            check=False,
        )
        self.assertEqual(2, result.returncode, result.stderr.decode())
        self.assertIn("malformed NUL-delimited grep input", result.stderr.decode())

    def test_filter_source_matches_fails_closed_for_missing_source(self) -> None:
        missing = Path(tempfile.gettempdir()) / "missing-filter-source.js"
        missing.unlink(missing_ok=True)
        record = os.fsencode(missing) + b"\0" + b"1:VoiceResponse()\n"
        result = subprocess.run(
            [
                sys.executable,
                "-B",
                str(FILTER_SOURCE_SCRIPT),
                "--mode",
                "code",
                "--pattern",
                "VoiceResponse",
                "--analyzer",
                str(MESSAGING_SOURCE_ANALYZER),
            ],
            input=record,
            capture_output=True,
            timeout=15,
            check=False,
        )
        self.assertEqual(2, result.returncode, result.stderr.decode())
        self.assertIn("could not filter", result.stderr.decode())

    def test_filter_source_matches_fails_closed_for_invalid_pattern(self) -> None:
        with tempfile.TemporaryDirectory(prefix="filter-pattern-") as directory:
            path = Path(directory) / "app.js"
            path.write_text("VoiceResponse()\n", encoding="utf-8")
            record = os.fsencode(path) + b"\0" + b"1:VoiceResponse()\n"
            result = subprocess.run(
                [
                    sys.executable,
                    "-B",
                    str(FILTER_SOURCE_SCRIPT),
                    "--mode",
                    "code",
                    "--pattern",
                    "[",
                    "--analyzer",
                    str(MESSAGING_SOURCE_ANALYZER),
                ],
                input=record,
                capture_output=True,
                timeout=15,
                check=False,
            )
        self.assertEqual(2, result.returncode, result.stderr.decode())
        self.assertIn("could not evaluate", result.stderr.decode())

    def assert_required_profile_detected(
        self, payload: dict[str, Any], fixture_name: str
    ) -> None:
        checks = [
            check
            for check in payload["checks"]
            if check["name"] == "required_messaging_profile_id"
        ]
        self.assertTrue(checks, "required-profile check was not emitted")
        self.assertTrue(
            any(check["status"] in {"warn", "issue"} for check in checks),
            f"required-profile misuse was incorrectly reported as passing: {checks}",
        )
        self.assertIn(fixture_name, json.dumps(checks))

    def test_dead_comments_and_quoted_prose_are_not_live_voice_code(self) -> None:
        result, payload = self.run_messaging_linter(
            {
                "app.js": (
                    "// old endpoint: https://api.twilio.com/2010-04-01\n"
                    "const active = true; // VoiceResponse() was removed\n"
                    '"VoiceResponse() removed";\n'
                )
            },
            product="voice",
        )
        statuses = {check["name"]: check["status"] for check in payload["checks"]}
        self.assertEqual("pass", statuses.get("voice_response_builder"), statuses)
        self.assertEqual(0, result.returncode, result.stdout)

    def assert_required_profile_passes(self, files: dict[str, str]) -> None:
        result, payload = self.run_messaging_linter(files)
        checks = [
            check
            for check in payload["checks"]
            if check["name"] == "required_messaging_profile_id"
        ]
        self.assertEqual(
            [{"name": "required_messaging_profile_id", "status": "pass"}],
            checks,
        )
        self.assertEqual(0, result.returncode)

    def assert_required_profile_flagged(self, files: dict[str, str]) -> None:
        result, payload = self.run_messaging_linter(files)
        self.assertEqual(1, result.returncode, payload)
        self.assert_required_profile_detected(payload, next(iter(files)))

    def test_compact_control_flow_guards_are_language_complete(self) -> None:
        fixtures = {
            "compact.py": (
                "import requests\npayload={'to': '+1', 'text': 'hi'}\n"
                "if use_pool: payload['messaging_profile_id'] = profile\n"
                "requests.post('https://api.telnyx.com/v2/messages/number_pool', json=payload)\n"
            ),
            "modifier.rb": (
                "payload = {to: '+1', text: 'hi'}\n"
                "payload[:messaging_profile_id] = profile if use_pool\n"
                "client.post('https://api.telnyx.com/v2/messages/number_pool', payload)\n"
            ),
            "alternate.php": (
                "<?php\n$payload = ['to' => '+1', 'text' => 'hi'];\n"
                "if ($usePool):\n  $payload['messaging_profile_id'] = $profile;\nendif;\n"
                "$client->post('https://api.telnyx.com/v2/messages/number_pool', $payload);\n"
            ),
            "compact.sh": (
                "payload='{\"to\":\"+1\",\"text\":\"hi\"}'\n"
                "enabled && payload='{\"to\":\"+1\",\"text\":\"hi\",\"messaging_profile_id\":\"MP\"}'\n"
                "curl -X POST https://api.telnyx.com/v2/messages/number_pool -d \"$payload\"\n"
            ),
            "short-circuit.js": (
                "const payload = {to: '+1', text: 'hi'};\n"
                "usePool && (payload.messaging_profile_id = profile);\n"
                "fetch('https://api.telnyx.com/v2/messages/number_pool', "
                "{method: 'POST', body: JSON.stringify(payload)});\n"
            ),
            "ternary.ts": (
                "const payload = {to: '+1', text: 'hi'};\n"
                "usePool ? (payload.messaging_profile_id = profile) : null;\n"
                "fetch('https://api.telnyx.com/v2/messages/number_pool', "
                "{method: 'POST', body: JSON.stringify(payload)});\n"
            ),
        }
        for filename, source in fixtures.items():
            with self.subTest(filename=filename):
                analyzer = self.run_required_profile_analyzer({filename: source})
                lines = analyzer.stdout.splitlines()
                self.assertEqual(0, analyzer.returncode, analyzer.stderr)
                self.assertGreater(int(lines[0]), 0, analyzer.stdout)
                self.assertGreater(len(lines), 1, analyzer.stdout)
                self.assert_required_profile_flagged({filename: source})

    def test_required_endpoint_builder_family_is_fail_safe(self) -> None:
        fixtures = {
            "urljoin.py": (
                "from urllib.parse import urljoin\nimport requests\n"
                "requests.post(urljoin('https://api.telnyx.com/v2/', 'messages/number_pool'), "
                "json={'to': '+1', 'text': 'hi'})\n"
            ),
            "percent.py": (
                "import requests\n"
                "requests.post('%s/v2/messages/number_pool' % host, "
                "json={'to': '+1', 'text': 'hi'})\n"
            ),
            "encode.js": (
                "fetch(encodeURI('https://api.telnyx.com/v2/messages/number_pool'), "
                "{method: 'POST', body: JSON.stringify({to: '+1', text: 'hi'})});\n"
            ),
            "concat.js": (
                "const base = 'https://api.telnyx.com/v2';\n"
                "fetch(base.concat('/messages/number_pool'), "
                "{method: 'POST', body: JSON.stringify({to: '+1', text: 'hi'})});\n"
            ),
            "join.js": (
                "fetch(['https://api.telnyx.com/v2/messages', 'number_pool'].join('/'), "
                "{method: 'POST', body: JSON.stringify({to: '+1', text: 'hi'})});\n"
            ),
            "path-join-commonjs.js": (
                "const {join} = require('path');\n"
                "fetch(join('https://api.telnyx.com/v2', 'messages', 'number_pool'), "
                "{method: 'POST', body: JSON.stringify({to: '+1', text: 'hi'})});\n"
            ),
            "path-join-posix.cjs": (
                "const {join: pathJoin} = require('node:path').posix;\n"
                "fetch(pathJoin('https://api.telnyx.com/v2', 'messages', 'number_pool'), "
                "{method: 'POST', body: JSON.stringify({to: '+1', text: 'hi'})});\n"
            ),
            "path-join-esm.mjs": (
                "import {join as pathJoin} from 'node:path';\n"
                "fetch(pathJoin('https://api.telnyx.com/v2', 'messages', 'number_pool'), "
                "{method: 'POST', body: JSON.stringify({to: '+1', text: 'hi'})});\n"
            ),
            "path-join-assigned.js": (
                "const pathJoin = require('path').posix.join;\n"
                "fetch(pathJoin('https://api.telnyx.com/v2', 'messages', 'number_pool'), "
                "{method: 'POST', body: JSON.stringify({to: '+1', text: 'hi'})});\n"
            ),
            "sprintf.go": (
                "package main\nimport (\"bytes\"; \"fmt\"; \"net/http\")\n"
                "func send(host string) { http.Post(fmt.Sprintf(\"%s/v2/messages/number_pool\", host), "
                "\"application/json\", bytes.NewBuffer([]byte(`{\"to\":\"+1\",\"text\":\"hi\"}`))) }\n"
            ),
            "format.java": (
                "client.post(String.format(\"%s/v2/messages/number_pool\", host), payload);\n"
            ),
            "guzzle.php": (
                "<?php\n$client = new Client(['base_uri' => 'https://api.telnyx.com/v2/messages/']);\n"
                "$client->post('number_pool', ['json' => ['to' => '+1', 'text' => 'hi']]);\n"
            ),
            "faraday.rb": (
                "client = Faraday.new(url: 'https://api.telnyx.com/v2/messages/')\n"
                "client.post('number_pool', {to: '+1', text: 'hi'}.to_json)\n"
            ),
            "base-address.cs": (
                "var client = new HttpClient();\n"
                "client.BaseAddress = new Uri(\"https://api.telnyx.com/v2/messages/\");\n"
                "client.PostAsync(\"number_pool\", new StringContent(\"{}\"));\n"
            ),
        }
        for filename, source in fixtures.items():
            with self.subTest(filename=filename):
                analyzer = self.run_required_profile_analyzer({filename: source})
                lines = analyzer.stdout.splitlines()
                self.assertEqual(0, analyzer.returncode, analyzer.stderr)
                self.assertGreater(int(lines[0]), 0, analyzer.stdout)
                self.assertGreater(len(lines), 1, analyzer.stdout)
                self.assert_required_profile_flagged({filename: source})

    def test_node_path_join_aliases_respect_binding_identity(self) -> None:
        endpoint_args = (
            "'https://api.telnyx.com/v2', 'messages', 'number_pool'"
        )
        request = (
            "fetch(join(%s), {method:'POST', "
            "body:JSON.stringify({to:'+1'})});" % endpoint_args
        )
        # The imported/CommonJS binding is a URL builder.
        self.assert_required_profile_flagged(
            {"bound.js": "const {join}=require('path');\n" + request}
        )
        derived_bindings = {
            "cjs-module.js": (
                "const path=require('path'); const {join}=path;\n" + request
            ),
            "esm-module.mjs": (
                "import path from 'node:path'; const {join}=path;\n" + request
            ),
            "copied.js": (
                "const path=require('path'); const join=path.join;\n" + request
            ),
        }
        for filename, source in derived_bindings.items():
            with self.subTest(filename=filename):
                self.assert_required_profile_flagged({filename: source})
        # A parameter, local declaration, or later assignment with the same
        # spelling is a different value and must not inherit path.join's
        # identity merely because an earlier import exists in the file.
        safe = {
            "parameter.js": (
                "const {join}=require('path');\n"
                "function send(join) {" + request + "}\n"
            ),
            "local.js": (
                "const {join}=require('path');\n"
                "function send() { const join=customJoin; " + request + "}\n"
            ),
            "reassigned.js": (
                "let {join}=require('path'); join=customJoin;\n" + request
            ),
            "unrelated.js": (
                "const {join}=require('other-library');\n" + request
            ),
        }
        for filename, source in safe.items():
            with self.subTest(filename=filename):
                self.assert_required_profile_passes({filename: source})

        self.assert_required_profile_passes({
            "unrelated-join.js": (
                "const {join} = require('other-library');\n"
                "fetch(join('/v2/messages', 'number_pool'), "
                "{method: 'POST', body: JSON.stringify({to: '+1', text: 'hi'})});\n"
            )
        })

    def test_profile_value_evidence_rejects_empty_expression_family(self) -> None:
        values = ("'   '", "String()", "'' + ''", "process.env.MP || ''")
        for value in values:
            with self.subTest(value=value):
                self.assert_required_profile_flagged({
                    "send.js": (
                        "fetch('https://api.telnyx.com/v2/messages/number_pool', {"
                        "method: 'POST', body: JSON.stringify({to: '+1', text: 'hi', "
                        f"messaging_profile_id: {value}" + "})});\n"
                    )
                })

        self.assert_required_profile_flagged({
            "send.py": (
                "import os, requests\n"
                "requests.post('https://api.telnyx.com/v2/messages/number_pool', "
                "json={'to': '+1', 'text': 'hi', "
                "'messaging_profile_id': os.environ.get('MP')})\n"
            )
        })
        self.assert_required_profile_passes({
            "send.py": (
                "import os, requests\n"
                "requests.post('https://api.telnyx.com/v2/messages/number_pool', "
                "json={'to': '+1', 'text': 'hi', "
                "'messaging_profile_id': os.environ.get('MP', 'MP_default')})\n"
            )
        })

    def test_valid_guzzle_json_profile_is_not_reported_missing(self) -> None:
        result, payload = self.run_messaging_linter({
            "send.php": (
                "<?php\n$client->post('https://api.telnyx.com/v2/messages/number_pool', "
                "['json' => ['to' => '+1', 'text' => 'hi', "
                "'messaging_profile_id' => 'MP_valid']]);\n"
            )
        })
        self.assertEqual(0, result.returncode, payload)

    # An extension is not a language. Node resolves .cjs/.mjs and TypeScript
    # resolves .cts/.mts as the same source, and SKILL.md documents a CommonJS
    # flow, so a check that globs only the bare extension silently approves a
    # broken migration. Both linters must see every member of the family.
    JS_TS_FAMILY = (
        ".cjs",
        ".cts",
        ".js",
        ".jsx",
        ".mjs",
        ".mts",
        ".ts",
        ".tsx",
    )

    JS_COMPONENT_FAMILY = (".astro", ".svelte", ".vue")

    def test_mixed_templates_scan_only_executable_host_code(self) -> None:
        for suffix in self.JS_COMPONENT_FAMILY:
            with self.subTest(suffix=suffix):
                result, payload = self.run_messaging_linter(
                    {f"Component{suffix}": "<template><p>VoiceResponse()</p></template>\n"},
                    product="voice",
                )
                self.assertEqual(0, result.returncode, payload)

                result, payload = self.run_messaging_linter(
                    {
                        f"Component{suffix}": (
                            '<template><Gather speechModel="phone_call"/></template>\n'
                        )
                    },
                    product="voice",
                )
                self.assertEqual(1, result.returncode, payload)
                self.assertTrue(
                    any(check["status"] == "issue" for check in payload["checks"]),
                    payload,
                )

        for suffix in (".ejs", ".jsp"):
            with self.subTest(suffix=suffix):
                result, payload = self.run_messaging_linter(
                    {f"view{suffix}": '<% // <Gather speechModel="phone_call"/> %>\n'},
                    product="voice",
                )
                self.assertEqual(0, result.returncode, payload)

        native_comments = {
            "view.ejs": '<%# <Gather speechModel="phone_call"/> %>\n',
            "view.erb": '<%# <Gather speechModel="phone_call"/> %>\n',
            "view.jsp": '<%-- <Gather speechModel="phone_call"/> --%>\n',
            "view.hbs": '{{!-- <Gather speechModel="phone_call"/> --}}\n',
            "view.handlebars": '{{! <Gather speechModel="phone_call"/> }}\n',
            "view.mustache": '{{! <Gather speechModel="phone_call"/> }}\n',
            "view.jinja": '{# <Gather speechModel="phone_call"/> #}\n',
            "view.jinja2": '{# <Gather speechModel="phone_call"/> #}\n',
            "view.twig": '{# <Gather speechModel="phone_call"/> #}\n',
        }
        for filename, contents in native_comments.items():
            with self.subTest(native_comment=filename):
                result, payload = self.run_messaging_linter(
                    {filename: contents}, product="voice"
                )
                self.assertEqual(0, result.returncode, payload)

        result, payload = self.run_messaging_linter(
            {"View.cshtml": "<p>using Twilio is the old example</p>\n"}
        )
        self.assertEqual(0, result.returncode, payload)
        result, payload = self.run_messaging_linter(
            {
                "View.cshtml": (
                    "<p>preview</p>\n"
                    "@using Twilio\n"
                )
            }
        )
        self.assertEqual(1, result.returncode, payload)
        self.assertTrue(
            any(
                check["name"] == "residual_twilio_imports"
                and check["status"] == "issue"
                for check in payload["checks"]
            ),
            payload,
        )

    def test_template_literal_interpolation_remains_executable(self) -> None:
        source = (
            "async function send(to, text) {\n"
            "  return `result: ${await client.messages.sendNumberPool({to, text})}`;\n"
            "}\n"
        )
        _, payload = self.run_messaging_linter({"send.js": source})
        check = next(
            item
            for item in payload["checks"]
            if item["name"] == "required_messaging_profile_id"
        )
        self.assertEqual("issue", check["status"], json.dumps(payload["checks"]))

    def test_script_end_tag_variants_preserve_executable_boundaries(self) -> None:
        # HTML parsers tolerate whitespace and ignored junk after an end-tag
        # name. The template extractor must therefore recognize the same
        # boundary: code before it remains executable, while markup after it
        # must not be scanned as host-language source.
        closing_tags = (
            "</script>",
            "</SCRIPT   >",
            "</script\t\n data-ignored>",
            "</ScRiPt ignored=value>",
        )
        for suffix in (*self.JS_COMPONENT_FAMILY, ".ejs"):
            for closing_tag in closing_tags:
                with self.subTest(suffix=suffix, closing_tag=closing_tag):
                    source = (
                        "<script>\n"
                        "client.messages.sendNumberPool({to, text});\n"
                        f"{closing_tag}\n"
                        "<p>client.messages.sendNumberPool({to, text});</p>\n"
                    )
                    _, payload = self.run_messaging_linter(
                        {f"Component{suffix}": source}
                    )
                    check = next(
                        item
                        for item in payload["checks"]
                        if item["name"] == "required_messaging_profile_id"
                    )
                    self.assertEqual(
                        "issue", check["status"], json.dumps(payload["checks"])
                    )
                    self.assertEqual(
                        1,
                        len(check["details"]["files"]),
                        json.dumps(check),
                    )

    def test_body_field_modes_continue_after_one_unreadable_file(self) -> None:
        with tempfile.TemporaryDirectory(
            prefix="telnyx-body-field-fail-safe-"
        ) as directory:
            root = Path(directory)
            unreadable = root / "unreadable.js"
            unreadable.write_text("client.messages.send({body});\n", encoding="utf-8")
            unreadable.chmod(0)
            valid = root / "valid.js"
            valid.write_text("client.messages.send({body});\n", encoding="utf-8")
            try:
                result = subprocess.run(
                    [
                        sys.executable,
                        str(MESSAGING_SOURCE_ANALYZER),
                        "--message-body-fields",
                        str(root),
                    ],
                    cwd=ROOT,
                    capture_output=True,
                    text=True,
                    timeout=30,
                    check=False,
                )
            finally:
                unreadable.chmod(stat.S_IRUSR | stat.S_IWUSR)

        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn("valid.js:1", result.stdout)
        self.assertIn("unreadable.js:1", result.stdout)
        self.assertIn("could not analyze this file", result.stdout)

    def test_extensionless_rakefile_is_ruby_source(self) -> None:
        for name in ("Rakefile", "rakefile"):
            with self.subTest(name=name):
                _, payload = self.run_messaging_linter(
                    {
                        name: (
                            "client.send_number_pool(to: '+1', from: '+2', text: 'hi')\n"
                        )
                    }
                )
                self.assert_required_profile_detected(payload, name)

    def test_project_state_is_loaded_without_repeating_the_flag(self) -> None:
        result, payload = self.run_messaging_linter(
            {
                "app.py": "from twilio.rest import Client\n",
                "migration-state.json": '{"kept_on_twilio":{"messaging":true}}\n',
            }
        )
        self.assertEqual(0, result.returncode, payload)

    def test_kept_conversations_calls_do_not_waive_telnyx_messaging_errors(
        self,
    ) -> None:
        kept_result, kept_payload = self.run_messaging_linter(
            {
                "conversation.js": "\n".join(
                    (
                        "conversation.messages.create({body: 'kept one'});",
                        "channel.messages.create({body: 'kept two'});",
                        "client.conversations('CH1').messages.create({body: 'kept three'});",
                        "client.conversations('CH2')\n  .messages.create({body: 'kept four'});",
                    )
                ),
                "migration-state.json": (
                    '{"kept_on_twilio":{"conversations":true}}\n'
                ),
            }
        )
        self.assertEqual(0, kept_result.returncode, kept_payload)

        failing_result, failing_payload = self.run_messaging_linter(
            {
                "mixed.js": (
                    "conversation.messages.create({body: 'kept'});\n"
                    "client.messages.send({body: 'wrong Telnyx field'});\n"
                ),
                "migration-state.json": (
                    '{"kept_on_twilio":{"conversations":true}}\n'
                ),
            }
        )
        self.assertEqual(1, failing_result.returncode, failing_payload)
        body_check = next(
            check
            for check in failing_payload["checks"]
            if check["name"] == "body_not_text"
        )
        self.assertEqual("issue", body_check["status"])
        details = json.dumps(body_check["details"])
        self.assertIn("wrong Telnyx field", details)
        self.assertNotIn("kept", details)

        messaging_result, messaging_payload = self.run_messaging_linter(
            {
                "twilio.js": "client.messages.create({body: 'kept messaging'});\n",
                "migration-state.json": (
                    '{"kept_on_twilio":{"messaging":true}}\n'
                ),
            }
        )
        self.assertEqual(0, messaging_result.returncode, messaging_payload)
        messaging_checks = [
            check
            for check in messaging_payload["checks"]
            if check["name"] == "twilio_messages_create"
        ]
        self.assertEqual([], messaging_checks)

        decoy_result, decoy_payload = self.run_messaging_linter(
            {
                "decoy.js": (
                    "if (conversationEnabled) "
                    "client.messages.send({body: 'must remain an issue'});\n"
                ),
                "migration-state.json": (
                    '{"kept_on_twilio":{"conversations":true}}\n'
                ),
            }
        )
        self.assertEqual(1, decoy_result.returncode, decoy_payload)
        self.assertIn("must remain an issue", json.dumps(decoy_payload))

    def test_every_product_reports_missing_python_consistently(self) -> None:
        with tempfile.TemporaryDirectory(prefix="telnyx-no-python-") as directory:
            result = subprocess.run(
                [
                    BASH,
                    str(CORRECTNESS_LINTER),
                    directory,
                    "--product",
                    "voice",
                ],
                cwd=ROOT,
                env={"PATH": ""},
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
            )
        self.assertEqual(2, result.returncode, result.stdout + result.stderr)
        self.assertIn("Python 3.10+ is required for correctness analysis", result.stderr)

    def test_python_older_than_310_is_rejected_before_analysis(self) -> None:
        with tempfile.TemporaryDirectory(prefix="telnyx-old-python-") as directory:
            tools = Path(directory) / "bin"
            tools.mkdir()
            fake_python = tools / "python3"
            fake_python.write_text("#!/bin/sh\nexit 1\n", encoding="utf-8")
            fake_python.chmod(fake_python.stat().st_mode | stat.S_IXUSR)
            project = Path(directory) / "project"
            project.mkdir()
            result = subprocess.run(
                [BASH, str(CORRECTNESS_LINTER), str(project), "--product", "voice"],
                cwd=ROOT,
                env={"PATH": str(tools)},
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
            )
        self.assertEqual(2, result.returncode, result.stdout + result.stderr)
        self.assertIn("Python 3.10+ is required", result.stderr)

    def test_full_validation_invokes_the_profile_analyzer(self) -> None:
        with tempfile.TemporaryDirectory(prefix="telnyx-full-validation-") as directory:
            project = Path(directory)
            (project / "send.js").write_text(
                "client.sendNumberPool({to: '+1', from: '+2', text: 'hi'});\n",
                encoding="utf-8",
            )
            result = subprocess.run(
                [BASH, str(MIGRATION_SCRIPTS.parent / "run-validation.sh"), directory],
                cwd=ROOT,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
                env={**os.environ, "TELNYX_API_KEY": ""},
            )
        self.assertEqual(1, result.returncode, result.stdout + result.stderr)
        self.assertIn("Correctness checks failed", result.stdout)
        self.assertIn("Step 5.3: Smoke Test", result.stdout)
        self.assertIn("Phase 5 Summary", result.stdout)

    def test_endpoint_candidates_exclude_source_fixtures_and_assertions(self) -> None:
        _, payload = self.run_messaging_linter(
            {
                "fixture.py": (
                    "snippet = 'api.post(\"messages/number_pool\",'\n"
                    "self.assertTrue(\n"
                    "    required_endpoint('/v2/messages/number_pool')\n"
                    ")\n"
                )
            }
        )
        check = next(
            item
            for item in payload["checks"]
            if item["name"] == "required_messaging_profile_id"
        )
        self.assertEqual("pass", check["status"], json.dumps(payload["checks"]))

    def test_full_validation_does_not_waive_unsigned_webhooks(self) -> None:
        with tempfile.TemporaryDirectory(prefix="telnyx-scan-context-") as directory:
            project = Path(directory)
            (project / "handler.js").write_text(
                "app.post('/hook', (req, res) => { const event = req.body.data.payload; res.sendStatus(200); });\n",
                encoding="utf-8",
            )
            (project / "twilio-scan.json").write_text(
                json.dumps(
                    {
                        "products_used": ["messaging"],
                        "summary": {"has_webhook_validation": False},
                    }
                ),
                encoding="utf-8",
            )
            result = subprocess.run(
                [BASH, str(MIGRATION_SCRIPTS.parent / "run-validation.sh"), directory],
                cwd=ROOT,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
                env={**os.environ, "TELNYX_API_KEY": ""},
            )
        self.assertNotIn("original code did not validate webhooks either", result.stdout)
        self.assertIn("no Ed25519 signature verification", result.stdout)
        self.assertIn("Correctness checks failed", result.stdout)

    def test_messaging_profile_linter_reads_every_js_module_extension(self) -> None:
        for suffix in self.JS_TS_FAMILY:
            with self.subTest(suffix=suffix):
                name = f"send{suffix}"
                files = {
                    name: (
                        "const telnyx = require('telnyx')(process.env.KEY);\n"
                        "async function send(to, text) {\n"
                        "  return await telnyx.messages.sendNumberPool("
                        "{ to: to, text: text });\n"
                        "}\n"
                    )
                }
                _, payload = self.run_messaging_linter(files)
                self.assert_required_profile_detected(payload, name)

    def test_correctness_linter_reads_javascript_component_files(self) -> None:
        for suffix in self.JS_COMPONENT_FAMILY:
            with self.subTest(suffix=suffix):
                _, payload = self.run_messaging_linter(
                    {
                        f"Component{suffix}": (
                            "<script>\n"
                            "const twilio = require('twilio');\n"
                            "</script>\n"
                        )
                    }
                )
                flagged = [
                    check
                    for check in payload["checks"]
                    if check["name"] == "residual_twilio_imports"
                    and check["status"] in {"warn", "issue"}
                ]
                self.assertTrue(flagged, json.dumps(payload["checks"]))

    def test_shell_checks_scan_executable_server_template_regions(self) -> None:
        fixtures = {
            "view.ejs": "<% const twilio = require('twilio'); %>\n",
            "view.erb": "<% require 'twilio-ruby' %>\n",
            "view.jsp": "<% import com.twilio.Twilio; %>\n",
            "directive.jsp": '<%@ page import="com.twilio.Twilio" %>\n',
        }
        for name, source in fixtures.items():
            with self.subTest(name=name):
                _, payload = self.run_messaging_linter({name: source})
                check = next(
                    item
                    for item in payload["checks"]
                    if item["name"] == "residual_twilio_imports"
                )
                self.assertIn(check["status"], {"warn", "issue"})

    def test_client_component_markup_is_not_a_server_webhook(self) -> None:
        for suffix in (".vue", ".svelte", ".astro", ".ejs"):
            with self.subTest(suffix=suffix):
                source = (
                    '<script>app.post("/preview", () => data.payload)</script>\n'
                    if suffix == ".ejs"
                    else '<button @click="postTodo">{{ data.payload }}</button>\n'
                )
                _, payload = self.run_messaging_linter(
                    {f"Component{suffix}": source}
                )
                findings = [
                    item
                    for item in payload["checks"]
                    if item["name"] == "webhook_ed25519_missing"
                    and item["status"] in {"warn", "issue"}
                ]
                self.assertEqual([], findings, json.dumps(payload["checks"]))

        _, payload = self.run_messaging_linter(
            {"server.ejs": '<% app.post("/sms", () => data.payload); %>'}
        )
        findings = [
            item
            for item in payload["checks"]
            if item["name"] == "webhook_ed25519_missing"
            and item["status"] in {"warn", "issue"}
        ]
        self.assertEqual(1, len(findings), json.dumps(payload["checks"]))

        # Exclusions apply to the source suffix, never to matching text. The
        # old formatted-output regex discarded this real server handler merely
        # because its route happened to contain a component-like locator.
        _, payload = self.run_messaging_linter(
            {
                "server.js": (
                    'app.post("/callback.vue:123:test", '
                    "() => data.payload);\n"
                )
            }
        )
        findings = [
            item
            for item in payload["checks"]
            if item["name"] == "webhook_ed25519_missing"
            and item["status"] in {"warn", "issue"}
        ]
        self.assertEqual(1, len(findings), json.dumps(payload["checks"]))

    def test_language_aliases_are_analysed_as_their_canonical_language(self) -> None:
        # An extension is not a language. A .bash file is a shell script and a
        # .phtml file is PHP, but every downstream check compares against the
        # canonical suffix, so an alias was read as an unknown language and
        # produced no findings at all — the migration passed while broken.
        shell_body = (
            "#!/usr/bin/env bash\n"
            'curl -X POST "https://api.telnyx.com/v2/messages/number_pool" \\\n'
            '  -H "Content-Type: application/json" \\\n'
            "  -d '{\"to\":\"+15551234567\",\"text\":\"hi\"%s}'\n"
        )
        php_body = (
            "<?php\n"
            '$client->post("https://api.telnyx.com/v2/messages/number_pool", '
            '["json" => ["to" => "+1", "text" => "hi"%s]]);\n'
        )
        families = (
            (".sh", (".bash", ".ksh", ".zsh"), shell_body,
             ',"messaging_profile_id":"abc"'),
            (".php", (".phtml",), php_body,
             ', "messaging_profile_id" => "abc"'),
        )

        def statuses(suffix: str, body: str) -> list:
            _, payload = self.run_messaging_linter({f"send{suffix}": body})
            return [
                check["status"]
                for check in payload["checks"]
                if check["name"] == "required_messaging_profile_id"
            ]

        for canonical, aliases, template, profile in families:
            violating = template % ""
            compliant = template % profile
            # Parity, not an absolute verdict. This linter is deliberately
            # conservative and reports some compliant shapes it cannot prove;
            # asserting "alias passes" would encode that conservatism as a
            # requirement. What must hold is that an alias is analysed exactly
            # as its canonical language — same verdict, same input.
            for body, label in ((violating, "violating"), (compliant, "compliant")):
                expected = statuses(canonical, body)
                for alias in aliases:
                    with self.subTest(alias=alias, body=label):
                        self.assertEqual(
                            expected,
                            statuses(alias, body),
                            f"{alias} is not analysed as {canonical}",
                        )
            # The violating case must genuinely be caught, or the parity above
            # would be satisfied by both being silent.
            self.assertTrue(
                any(status in {"warn", "issue"} for status in statuses(canonical, violating)),
                f"{canonical} did not flag a missing profile at all",
            )

    def test_phtml_markup_cannot_mask_php_request(self) -> None:
        source = (
            "<p>Don't forget to send this message.</p>\n"
            "<?php\n"
            '$client->post("https://api.telnyx.com/v2/messages/number_pool", '
            '["json" => ["to" => "+1", "text" => "hi"]]);\n'
            "?>\n"
        )
        _, payload = self.run_messaging_linter({"send.phtml": source})
        check = next(
            item
            for item in payload["checks"]
            if item["name"] == "required_messaging_profile_id"
        )
        self.assertEqual("issue", check["status"], json.dumps(payload["checks"]))

    def test_php_attributes_do_not_mask_required_sends(self) -> None:
        missing = "$client->send_number_pool(['to' => '+1'%s]);"
        wrappers = {
            "same-line": "#[Route('/send')] function handler() { %s }\n",
            "stacked": "#[Route('/send')]\n#[Audit('message')]\nfunction handler() { %s }\n",
            "method": "class Sender { #[Route('/send')] public function run() { %s } }\n",
            "parameter": "function handler(#[SensitiveParameter] $to) { %s }\n",
        }
        for label, wrapper in wrappers.items():
            with self.subTest(shape=label, polarity="missing"):
                _, payload = self.run_messaging_linter(
                    {"send.php": "<?php\n" + wrapper % (missing % "")}
                )
                self.assert_required_profile_detected(payload, "send.php")
            with self.subTest(shape=label, polarity="compliant"):
                self.assert_required_profile_passes(
                    {
                        "send.php": "<?php\n"
                        + wrapper
                        % (missing % ", 'messaging_profile_id' => 'mp'")
                    }
                )

        # Legacy PHP hash comments remain comments, and call-like text inside
        # an attribute string remains data rather than an executable send.
        self.assert_required_profile_passes(
            {
                "comments.php": (
                    "<?php\n# $client->send_number_pool(['to' => '+1']);\n"
                    "#[Example(\"send_number_pool(['to' => '+1'])\")]\n"
                    "function handler() {}\n"
                )
            }
        )

    def test_phtml_php_tag_family_preserves_only_executable_regions(self) -> None:
        missing = (
            '$client->post("https://api.telnyx.com/v2/messages/number_pool", '
            '["json" => ["to" => "+1", "text" => "hi"]]);'
        )
        valid = missing.replace(
            '"text" => "hi"',
            '"text" => "hi", "messaging_profile_id" => "mp"',
        )
        for label, opening in (("normal", "<?php "), ("short", "<? ")):
            for polarity, body in (("missing", missing), ("valid", valid)):
                with self.subTest(tag=label, polarity=polarity):
                    files = {"send.phtml": opening + body + " ?>\n"}
                    if polarity == "missing":
                        _, payload = self.run_messaging_linter(files)
                        self.assert_required_profile_detected(payload, "send.phtml")
                    else:
                        self.assert_required_profile_passes(files)

        # An XML processing instruction is markup, not a PHP short tag.
        self.assert_required_profile_passes(
            {
                "feed.phtml": (
                    '<?xml version="1.0" note="client.sendNumberPool({to: 1})"?>\n'
                    "<feed/>\n"
                )
            }
        )

    def test_mixed_php_tag_family_preserves_only_executable_regions(self) -> None:
        missing = (
            "$client->post('https://api.telnyx.com/v2/messages/number_pool', "
            "['json' => ['to' => '+1', 'text' => 'hi']]);"
        )
        valid = missing.replace(
            "'text' => 'hi'",
            "'text' => 'hi', 'messaging_profile_id' => 'mp'",
        )
        wrappers = {
            "normal": ("<?php ", " ?>"),
            "short": ("<? ", " ?>"),
            "echo": ("<?= ", " ?>"),
            "unclosed": ("<?php ", ""),
            "multiple-blocks": ("<?php $title = 'ready'; ?>\n<?php ", " ?>"),
        }
        for tag, (opening, closing) in wrappers.items():
            for polarity, body in (("missing", missing), ("valid", valid)):
                with self.subTest(tag=tag, polarity=polarity):
                    files = {
                        "send.php": (
                            "<p>It's ready</p>\n"
                            + opening
                            + body
                            + closing
                            + "\n"
                        )
                    }
                    if polarity == "missing":
                        _, payload = self.run_messaging_linter(files)
                        self.assert_required_profile_detected(payload, "send.php")
                    else:
                        self.assert_required_profile_passes(files)

        # Markup examples outside PHP tags are prose, while raw tagless PHP is
        # retained for generated snippets and the analyzer's documented input
        # convention.
        self.assert_required_profile_passes(
            {"example.php": "<code>" + missing + "</code>\n"}
        )
        _, payload = self.run_messaging_linter({"raw.php": missing + "\n"})
        self.assert_required_profile_detected(payload, "raw.php")

    def test_multiline_template_comments_preserve_speech_model_line(self) -> None:
        source = (
            "<!-- comment\n"
            "     spanning\n"
            "     lines -->\n"
            '<Response><Gather speechModel="phone_call"/></Response>\n'
        )
        _, payload = self.run_messaging_linter(
            {"ivr.xml": source}, product="voice"
        )
        check = next(
            item
            for item in payload["checks"]
            if item["name"] == "speech_model_attr"
        )
        self.assertIn("ivr.xml:4", json.dumps(check), json.dumps(payload["checks"]))

    # Each entry: (label, filename, violating, compliant). Violating sends to
    # /v2/messages/number_pool without messaging_profile_id and must be
    # flagged; the compliant twin adds the profile and must pass. These are
    # the stdlib HTTP clients of each ecosystem — no third-party SDK — which
    # is exactly what hand-rolled migrated code uses.
    STDLIB_CLIENT_SHAPES = (
        (
            "go_new_request",
            "notify.go",
            'package main\n\nfunc sendPoolSMS(to, text string) error {\n'
            '\tpayload := map[string]string{"to": to, "text": text%s}\n'
            "\tbody, _ := json.Marshal(payload)\n"
            '\treq, err := http.NewRequest("POST", "https://api.telnyx.com/v2/messages/number_pool", bytes.NewBuffer(body))\n'
            "\t_, err = http.DefaultClient.Do(req)\n\treturn err\n}\n",
            ', "messaging_profile_id": os.Getenv("PROFILE")',
        ),
        (
            "ruby_net_http_post",
            "notify.rb",
            "require 'net/http'\n\ndef send_pool_sms(to, text)\n"
            "  Net::HTTP.post(\n"
            "    URI('https://api.telnyx.com/v2/messages/number_pool'),\n"
            "    { to: to, text: text%s }.to_json,\n"
            "    'Content-Type' => 'application/json'\n  )\nend\n",
            ", messaging_profile_id: ENV['PROFILE']",
        ),
        (
            "ruby_post_form",
            "notify.rb",
            "require 'net/http'\n\ndef send_pool_sms(to, text)\n"
            "  Net::HTTP.post_form(\n"
            "    URI('https://api.telnyx.com/v2/messages/number_pool'),\n"
            "    'to' => to, 'text' => text%s\n  )\nend\n",
            ", 'messaging_profile_id' => ENV['PROFILE']",
        ),
        (
            "java_builder",
            "Notify.java",
            "import java.net.URI;\nimport java.net.http.HttpRequest;\n\n"
            "public class Notify {\n"
            "    public void sendPoolSms(String to, String text) throws Exception {\n"
            '        String json = "{\\"to\\": \\"+1\\", \\"text\\": \\"hi\\"%s}";\n'
            "        HttpRequest request = HttpRequest.newBuilder()\n"
            '            .uri(URI.create("https://api.telnyx.com/v2/messages/number_pool"))\n'
            '            .header("Content-Type", "application/json")\n'
            "            .POST(HttpRequest.BodyPublishers.ofString(json))\n"
            "            .build();\n    }\n}\n",
            ', \\"messaging_profile_id\\": \\"abc\\"',
        ),
        (
            "php_curl",
            "notify.php",
            "<?php\nfunction send_pool_sms($to, $text) {\n"
            '    $payload = ["to" => $to, "text" => $text%s];\n'
            "    $ch = curl_init();\n"
            '    curl_setopt($ch, CURLOPT_URL, "https://api.telnyx.com/v2/messages/number_pool");\n'
            "    curl_setopt($ch, CURLOPT_POST, true);\n"
            "    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));\n"
            "    return curl_exec($ch);\n}\n",
            ', "messaging_profile_id" => getenv("PROFILE")',
        ),
        (
            "node_https_request",
            "notify.js",
            "const https = require('https');\n\nfunction sendPoolSms(to, text) {\n"
            "  const payload = JSON.stringify({ to, text%s });\n"
            "  const req = https.request({\n"
            "    hostname: 'api.telnyx.com',\n"
            "    path: '/v2/messages/number_pool',\n"
            "    method: 'POST',\n"
            "  });\n  req.write(payload);\n  req.end();\n}\n",
            ", messaging_profile_id: process.env.PROFILE",
        ),
    )

    def test_stdlib_http_clients_are_visible_to_the_profile_check(self) -> None:
        for label, name, template, profile in self.STDLIB_CLIENT_SHAPES:
            with self.subTest(shape=label, body="violating"):
                _, payload = self.run_messaging_linter({name: template % ""})
                self.assert_required_profile_detected(payload, name)
            with self.subTest(shape=label, body="compliant"):
                self.assert_required_profile_passes({name: template % profile})

    def test_extensionless_shebang_send_is_analyzed(self) -> None:
        # package.json "bin" entry points have no extension; the analyzer
        # refused to open them while the Phase-1 scanner reported them.
        body = (
            "#!/usr/bin/env node\n"
            "fetch('https://api.telnyx.com/v2/messages/number_pool', "
            "{method: 'POST', body: JSON.stringify({to: '+1'%s})});\n"
        )
        _, payload = self.run_messaging_linter({"bin/send-pool": body % ""})
        self.assert_required_profile_detected(payload, "send-pool")
        self.assert_required_profile_passes(
            {"bin/send-pool": body % ", messaging_profile_id: 'abc'"}
        )

    def test_extensionless_node_findings_are_not_duplicated(self) -> None:
        _, payload = self.run_messaging_linter(
            {
                "bin/respond": (
                    "#!/usr/bin/env node\n"
                    "const response = new MessagingResponse();\n"
                )
            }
        )
        check = next(
            item
            for item in payload["checks"]
            if item["name"] == "messaging_response_builder"
        )
        self.assertEqual(1, len(check["details"]["files"]))

    def test_extensionless_shebang_paths_keep_structured_identity(self) -> None:
        """Shebang discovery preserves every legal path byte except NUL."""

        clean = "#!/usr/bin/env node\nconsole.log('ok');\n"
        missing = (
            "#!/usr/bin/env node\n"
            "client.messages.sendNumberPool({to:'+1'});\n"
        )
        compliant = missing.replace("to:'+1'", "to:'+1',messaging_profile_id:'mp'")
        for relative in (
            "bin/send\nnow",
            "bin/send\rnow",
            r"bin/send\nnow",
        ):
            with self.subTest(path=repr(relative), polarity="clean"):
                result, _ = self.run_messaging_linter({relative: clean})
                self.assertEqual(0, result.returncode, result.stdout + result.stderr)
            with self.subTest(path=repr(relative), polarity="missing"):
                result, payload = self.run_messaging_linter({relative: missing})
                self.assertEqual(1, result.returncode, result.stdout + result.stderr)
                check = next(
                    item
                    for item in payload["checks"]
                    if item["name"] == "required_messaging_profile_id"
                )
                self.assertEqual("issue", check["status"], check)
                self.assertEqual(1, len(check["details"]["files"]), check)
                escaped_name = (
                    Path(relative).name.replace("\\", r"\\")
                    .replace("\r", r"\r")
                    .replace("\n", r"\n")
                )
                self.assertIn(escaped_name, check["details"]["files"][0])
            with self.subTest(path=repr(relative), polarity="compliant"):
                result, _ = self.run_messaging_linter({relative: compliant})
                self.assertEqual(0, result.returncode, result.stdout + result.stderr)

    def test_component_template_handlers_are_executable_javascript(self) -> None:
        violating = {
            "Send.vue": (
                '<template><button @click="client.sendNumberPool('
                "{to: '+1', text: 'hi'})\">Send</button></template>\n"
            ),
            "Submit.vue": (
                "<template><form v-on:submit='client.sendNumberPool("
                '{to: "+1", text: "hi"})\'></form></template>\n'
            ),
            "Modified.vue": (
                '<button @click.prevent.stop="client.sendNumberPool('
                "{to: '+1', text: 'hi'})\">Send</button>\n"
            ),
            "Send.svelte": (
                '<button on:click={() => client.sendNumberPool('
                "{to: '+1', text: 'hi'})}>Send</button>\n"
            ),
            "Modern.svelte": (
                '<button onclick={() => client.sendNumberPool('
                "{to: '+1', text: 'hi'})}>Send</button>\n"
            ),
            "Send.astro": (
                '<button onclick={() => client.sendNumberPool('
                "{to: '+1', text: 'hi'})}>Send</button>\n"
            ),
        }
        for name, source in violating.items():
            with self.subTest(name=name):
                _, payload = self.run_messaging_linter({name: source})
                self.assert_required_profile_detected(payload, name)

        compliant = {
            name: source.replace(
                "text: 'hi'", "text: 'hi', messaging_profile_id: 'profile'"
            ).replace(
                'text: "hi"', 'text: "hi", messaging_profile_id: "profile"'
            )
            for name, source in violating.items()
        }
        self.assert_required_profile_passes(compliant)

        _, payload = self.run_messaging_linter(
            {
                "Nested.vue": (
                    "{{ client.sendNumberPool({to, metadata: {campaign}}) }}"
                )
            }
        )
        self.assert_required_profile_detected(payload, "Nested.vue")

    def test_vue_directive_expression_family_is_executable_javascript(self) -> None:
        missing = "{to: '+1', text: 'hi'}"
        valid = "{to: '+1', text: 'hi', messaging_profile_id: 'mp'}"
        directives = {
            "if": 'v-if="client.sendNumberPool(%s)"',
            "show": 'v-show="client.sendNumberPool(%s)"',
            "bind": 'v-bind:data-result="client.sendNumberPool(%s)"',
            "bind-shorthand": ':data-result="client.sendNumberPool(%s)"',
            "prop-shorthand": '.dataResult="client.sendNumberPool(%s)"',
            "unquoted": "v-if=client.sendNumberPool(payload)",
        }
        for label, directive in directives.items():
            for polarity, body in (("missing", missing), ("valid", valid)):
                with self.subTest(directive=label, polarity=polarity):
                    if label == "unquoted":
                        profile = (
                            ",messaging_profile_id:'mp'"
                            if polarity == "valid"
                            else ""
                        )
                        prefix = (
                            "<script>const payload={to:'+1',text:'hi'"
                            f"{profile}}};</script>\n"
                        )
                        attribute = directive
                    else:
                        prefix = ""
                        attribute = directive % body
                    source = (
                        prefix
                        + f"<template><div {attribute}>x</div></template>\n"
                    )
                    if polarity == "missing":
                        _, payload = self.run_messaging_linter(
                            {"Send.vue": source}
                        )
                        self.assert_required_profile_detected(payload, "Send.vue")
                    else:
                        self.assert_required_profile_passes({"Send.vue": source})

        # Directive-looking documentation is text, not an opening-tag
        # attribute, and HTML comments are not executable Vue templates.
        self.assert_required_profile_passes(
            {
                "Docs.vue": (
                    '<template><pre>v-if="client.sendNumberPool('
                    "{to: '+1', text: 'hi'})\"</pre>\n"
                    '<!-- <div v-bind:x="client.sendNumberPool('
                    "{to: '+1', text: 'hi'})\"></div> -->\n"
                    '<div title=\'example v-if="client.sendNumberPool('
                    "{to: 1})\"\'>documentation</div>\n"
                    '<div data-v-if="client.sendNumberPool({to: 1})">'
                    "ordinary attribute</div>\n"
                    "</template>\n"
                )
            }
        )

    def test_razor_implicit_expression_family_is_executable_csharp(self) -> None:
        declarations = {
            "missing": (
                '@{ var payload = new MessageSendNumberPoolParams { To = "+1" }; }\n'
            ),
            "valid": (
                '@{ var payload = new MessageSendNumberPoolParams { To = "+1", '
                'MessagingProfileId = "mp" }; }\n'
            ),
        }
        expressions = {
            "member": "@client.Messages.SendNumberPool(payload)",
            "indexer": "@clients[0].Messages.SendNumberPool(payload)",
            "conditional": "@client?.Messages.SendNumberPool(payload)",
            "await": "@await client.Messages.SendNumberPool(payload)",
        }
        for suffix in (".cshtml", ".razor"):
            for label, expression in expressions.items():
                for polarity in ("missing", "valid"):
                    with self.subTest(
                        suffix=suffix, expression=label, polarity=polarity
                    ):
                        fixture = f"View{suffix}"
                        files = {
                            fixture: (
                                declarations[polarity]
                                + f"<div>{expression}</div>\n"
                            )
                        }
                        if polarity == "missing":
                            _, payload = self.run_messaging_linter(files)
                            self.assert_required_profile_detected(payload, fixture)
                        else:
                            self.assert_required_profile_passes(files)

        continuations = {
            "else": (
                "@if (false) { Work(); } else { "
                "client.Messages.SendNumberPool(payload); }\n"
            ),
            "catch": (
                "@try { Work(); } catch (Exception) { "
                "client.Messages.SendNumberPool(payload); }\n"
            ),
            "finally": (
                "@try { Work(); } finally { "
                "client.Messages.SendNumberPool(payload); }\n"
            ),
            "do": (
                "@do { client.Messages.SendNumberPool(payload); } while (false);\n"
            ),
        }
        for suffix in (".cshtml", ".razor"):
            for label, control in continuations.items():
                for polarity in ("missing", "valid"):
                    with self.subTest(
                        suffix=suffix, control=label, polarity=polarity
                    ):
                        fixture = f"Control{suffix}"
                        files = {fixture: declarations[polarity] + control}
                        if polarity == "missing":
                            _, payload = self.run_messaging_linter(files)
                            self.assert_required_profile_detected(payload, fixture)
                        else:
                            self.assert_required_profile_passes(files)

        # Razor comments and escaped transitions render as text and must not
        # turn SDK examples into live calls.
        self.assert_required_profile_passes(
            {
                "Docs.cshtml": (
                    "@* @client.Messages.SendNumberPool(payload) *@\n"
                    "<code>@@client.Messages.SendNumberPool(payload)</code>\n"
                    "<p>support@client.Messages.SendNumberPool(payload)</p>\n"
                )
            }
        )

    def test_typescript_component_scripts_keep_typescript_resolution(self) -> None:
        source = "\n".join(
            (
                '<script lang="ts">',
                'const endpoint = "/v2/messages/number_pool" as const;',
                'fetch(endpoint, {method: "POST", body: JSON.stringify({to: "+1"})});',
                "</script>",
            )
        )
        for suffix in (".vue", ".svelte", ".astro"):
            with self.subTest(suffix=suffix):
                _, payload = self.run_messaging_linter({f"Typed{suffix}": source})
                self.assert_required_profile_detected(payload, f"Typed{suffix}")

        unquoted = source.replace('lang="ts"', "lang=ts")
        for suffix in (".vue", ".svelte"):
            with self.subTest(unquoted_suffix=suffix):
                _, payload = self.run_messaging_linter({f"Typed{suffix}": unquoted})
                self.assert_required_profile_detected(payload, f"Typed{suffix}")

        astro_frontmatter = "\n".join(
            (
                "---",
                'const endpoint = "/v2/messages/number_pool" as const;',
                'fetch(endpoint, {method: "POST", body: JSON.stringify({to: "+1"})});',
                "---",
            )
        )
        _, payload = self.run_messaging_linter({"Frontmatter.astro": astro_frontmatter})
        self.assert_required_profile_detected(payload, "Frontmatter.astro")

    def test_ejs_client_script_blocks_are_executable(self) -> None:
        name = "send.ejs"
        _, payload = self.run_messaging_linter(
            {
                name: (
                    '<script>fetch("/v2/messages/number_pool", '
                    '{method: "POST", body: JSON.stringify({to: "+1"})});</script>'
                )
            }
        )
        self.assert_required_profile_detected(payload, name)

    def test_component_style_blocks_are_not_executable_requests(self) -> None:
        for suffix in (".svelte", ".astro"):
            with self.subTest(suffix=suffix):
                self.assert_required_profile_passes(
                    {
                        f"Styled{suffix}": (
                            '<style>.hero { background: url("/v2/messages/number_pool"); }</style>'
                        )
                    }
                )

    def test_commented_component_handlers_are_not_executable(self) -> None:
        for suffix in (".vue", ".svelte", ".astro"):
            with self.subTest(suffix=suffix):
                self.assert_required_profile_passes(
                    {
                        f"Commented{suffix}": (
                            '<!-- <button onclick={() => client.sendNumberPool('
                            "{to: '+1', text: 'hi'})}>Send</button> -->\n"
                        )
                    }
                )

    def test_uppercase_and_extensionless_python_sources_are_linted(self) -> None:
        # SMSBOT.PY and an extensionless #!/usr/bin/env python3 executable are
        # the same Python module as smsbot.py; both passed every check.
        body = (
            "from twilio.twiml.messaging_response import MessagingResponse\n"
            "resp = MessagingResponse()\n"
        )
        for name, contents in (
            ("SMSBOT.PY", body),
            ("smsbot", "#!/usr/bin/env python3\n" + body),
        ):
            with self.subTest(file=name):
                _, payload = self.run_messaging_linter({name: contents})
                flagged = [
                    c
                    for c in payload["checks"]
                    if c["status"] in {"warn", "issue"}
                    and "messaging_response" in c["name"]
                ]
                self.assertTrue(
                    flagged,
                    f"{name} passed every check: {json.dumps(payload['checks'])}",
                )

    def test_embedded_texml_analyzer_skips_generated_output(self) -> None:
        # The shell EXCLUDE_DIRS was aligned to the canonical list, but the
        # embedded Python analyzer walks the tree itself with its own
        # excluded_dirs — a stale .next bundle re-entered through that side
        # door and failed a corrected project. Same one-layer-fixed class as
        # the original finding.
        gather = (
            "export const x = `<Gather speechModel=\"phone_call\" "
            'input="speech"></Gather>`;\n'
        )
        _, payload = self.run_messaging_linter(
            {".next/server/pages/voice.js": gather}, product="voice"
        )
        flagged = [
            c
            for c in payload["checks"]
            if c["status"] in {"warn", "issue"} and "speech_model" in c["name"]
        ]
        self.assertEqual([], flagged, json.dumps(flagged))

        # Same content in source must still be flagged.
        _, payload = self.run_messaging_linter(
            {"src/voice.js": gather}, product="voice"
        )
        flagged = [
            c
            for c in payload["checks"]
            if c["status"] in {"warn", "issue"} and "speech_model" in c["name"]
        ]
        self.assertTrue(flagged, json.dumps(payload["checks"]))

    def test_every_generated_directory_is_excluded_by_every_linter_phase(self) -> None:
        shell = CORRECTNESS_LINTER.read_text(encoding="utf-8")
        declared = re.search(r'^EXCLUDE_DIRS="([^"]*)"', shell, re.MULTILINE)
        self.assertIsNotNone(declared)
        violating = (
            "#!/usr/bin/env node\n"
            "client.messages.sendNumberPool({to: '+1', text: 'hi'});\n"
        )
        for directory in declared.group(1).split():
            with self.subTest(directory=directory):
                result, payload = self.run_messaging_linter(
                    {f"{directory}/twilio-generated/send": violating}
                )
                statuses = {
                    check["name"]: check["status"] for check in payload["checks"]
                }
                self.assertEqual(
                    "pass", statuses.get("required_messaging_profile_id"), payload
                )
                self.assertEqual(
                    "pass", statuses.get("twilio_directory_names"), payload
                )
                self.assertEqual(0, result.returncode, payload)

    def test_state_file_does_not_cross_waive_selected_product(self) -> None:
        # A retained TaskRouter product must not waive residual checks while
        # validating Messaging. Hybrid state is scoped to the selected product;
        # otherwise an unrelated retained product could hide live Twilio code.
        files = {
            "taskrouter_client.py": (
                "from twilio.request_validator import RequestValidator\n"
                "validator = RequestValidator(token)\n"
            ),
            "migration-state.json": json.dumps(
                {"kept_on_twilio": {"taskrouter": "no equivalent"}}
            ),
        }
        with tempfile.TemporaryDirectory(prefix="lint-hybrid-") as directory:
            root = Path(directory)
            for relative, contents in files.items():
                (root / relative).write_text(contents, encoding="utf-8")
            result = subprocess.run(
                [
                    BASH,
                    str(CORRECTNESS_LINTER),
                    str(root),
                    "--product",
                    "messaging",
                    "--json",
                    "--state-file",
                    str(root / "migration-state.json"),
                ],
                cwd=ROOT,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
            self.assertEqual(1, result.returncode, result.stdout + result.stderr)
            payload = json.loads(result.stdout)
            issues = {
                c["name"] for c in payload["checks"] if c["status"] == "issue"
            }
            self.assertIn("twilio_webhook_middleware", issues)
            self.assertIn("residual_twilio_imports", issues)

    def test_migration_comment_is_not_a_residual_import_in_linter(self) -> None:
        files = {
            "app.py": (
                "import telnyx\n"
                "# NOTE: migrated from twilio to telnyx 2026-08\n"
            )
        }
        _, payload = self.run_messaging_linter(files)
        flagged = [
            c
            for c in payload["checks"]
            if c["status"] in {"warn", "issue"}
            and c["name"] == "residual_twilio_imports"
        ]
        self.assertEqual([], flagged, json.dumps(flagged))

    def test_residual_import_filter_protocol_handles_path_and_line_boundaries(
        self,
    ) -> None:
        # Exercise the real grep -> NUL-record -> lexer pipeline, not just the
        # parser helper. Numeric colons in paths and non-LF control bytes in a
        # prior physical line must neither invent nor hide a residual import.
        _, comment_payload = self.run_messaging_linter(
            {"root:123:part/app.py": "# from twilio.rest import Client\n"}
        )
        comment_check = next(
            c
            for c in comment_payload["checks"]
            if c["name"] == "residual_twilio_imports"
        )
        self.assertEqual("pass", comment_check["status"], comment_payload)

        for marker in ("\f", "\v", "\0"):
            with self.subTest(marker=repr(marker)):
                result, payload = self.run_messaging_linter(
                    {
                        "root:123:part/app.py": (
                            f"sentinel = 1{marker}\n"
                            "from twilio.rest import Client\n"
                        )
                    }
                )
                check = next(
                    c
                    for c in payload["checks"]
                    if c["name"] == "residual_twilio_imports"
                )
                self.assertEqual("issue", check["status"], payload)
                self.assertEqual(1, result.returncode, result.stdout)

        # A bare CR is a Python source line terminator but not a grep -n record
        # delimiter. The live builder after it must not inherit the comment.
        result, payload = self.run_messaging_linter(
            {"app.py": "# removed VoiceResponse()\rVoiceResponse()\n"},
            product="voice",
        )
        self.assertEqual(1, result.returncode, payload)
        self.assertTrue(
            any(
                check["name"] == "voice_response_builder"
                and check["status"] == "issue"
                for check in payload["checks"]
            ),
            payload,
        )

    def test_factory_created_rest_clients_are_scanned(self) -> None:
        # requests.Session().post(...) and axios.create(...).post(...) have a
        # factory-call receiver, so call_receiver() returns None and the
        # anonymous-receiver guard dropped them before URL/payload analysis —
        # a number-pool send through a very common client shape passed clean.
        url = "https://api.telnyx.com/v2/messages/number_pool"
        cases = {
            "session.py": (
                "import requests\n"
                "def send(to, text):\n"
                f"    return requests.Session().post('{url}', "
                "json={'to': to, 'text': text%s})\n"
            ),
            # requests.session() is the documented lowercase alias.
            "session_lower.py": (
                "import requests\n"
                "def send(to, text):\n"
                f"    return requests.session().post('{url}', "
                "json={'to': to, 'text': text%s})\n"
            ),
            "httpx_client.py": (
                "import httpx\n"
                "def send(to, text):\n"
                f"    return httpx.Client().post('{url}', "
                "json={'to': to, 'text': text%s})\n"
            ),
            "axios.js": (
                "const axios = require('axios');\n"
                "const api = axios.create({ baseURL: 'https://api.telnyx.com/v2' });\n"
                "async function send(to, text) {\n"
                "  return api.post('/messages/number_pool', "
                "{ to, text%s });\n"
                "}\n"
            ),
            "inline_axios.js": (
                "const axios = require('axios');\n"
                "async function send(to, text) {\n"
                f"  return axios.create({{}}).post('{url}', "
                "{ to, text%s });\n"
                "}\n"
            ),
            "new_client.js": (
                "async function send(to, text) {\n"
                f"  return new Client().post('{url}', "
                "{ to, text%s });\n"
                "}\n"
            ),
        }
        for name, template in cases.items():
            with self.subTest(shape=name, body="violating"):
                _, payload = self.run_messaging_linter({name: template % ""})
                self.assert_required_profile_detected(payload, name)
            with self.subTest(shape=name, body="compliant"):
                profile = (
                    ", 'messaging_profile_id': 'abc'"
                    if name.endswith(".py")
                    else ", messaging_profile_id: 'abc'"
                )
                self.assert_required_profile_passes({name: template % profile})

    def test_statically_unusable_profile_values_are_rejected(self) -> None:
        # messaging_profile_id present but falsy/empty (false, true, 0, [], {},
        # '') is unusable — the Messages API receives an invalid profile — so
        # it must be treated as missing (shape vs value).
        url = "https://api.telnyx.com/v2/messages/number_pool"
        for value in ("false", "true", "0", "[]", "{}", "''", '""'):
            with self.subTest(js_value=value):
                name = "send.js"
                _, payload = self.run_messaging_linter(
                    {
                        name: (
                            f"fetch('{url}', {{method:'POST', body: "
                            f"JSON.stringify({{to:'+1', messaging_profile_id: {value}}})}});"
                        )
                    }
                )
                self.assert_required_profile_detected(payload, name)
        for value in ("False", "[]", "{}", "0"):
            with self.subTest(py_value=value):
                name = "send.py"
                _, payload = self.run_messaging_linter(
                    {name: f"requests.post('{url}', json={{'to':'+1','messaging_profile_id': {value}}})"}
                )
                self.assert_required_profile_detected(payload, name)
        # Numeric literals are not UUID strings, regardless of radix, sign,
        # exponent or language suffix.
        for value in ("42", "-1", "+2.5", "1e3", "0x2a", "0b10", "0o52", "42n"):
            with self.subTest(numeric=value):
                name = "send.js"
                _, payload = self.run_messaging_linter(
                    {
                        name: (
                            f"fetch('{url}', {{method:'POST', body: "
                            f"JSON.stringify({{to:'+1', messaging_profile_id: {value}}})}});"
                        )
                    }
                )
                self.assert_required_profile_detected(payload, name)
        # A usable value must still pass: non-empty string or dynamic value.
        for value in ("'abc'", "process.env.MP"):
            with self.subTest(valid=value):
                self.assert_required_profile_passes(
                    {
                        "ok.js": (
                            f"fetch('{url}', {{method:'POST', body: "
                            f"JSON.stringify({{to:'+1', messaging_profile_id: {value}}})}});"
                        )
                    }
                )

    def test_required_sdk_method_aliases_are_analyzed(self) -> None:
        """Method values/delegates retain the required-profile contract."""

        cases = {
            "send.py": (
                "send_pool = client.messages.send_number_pool\n"
                "send_pool({'to': '+1'%s})\n"
            ),
            "send.js": (
                "const sendPool = client.messages.sendNumberPool.bind(client.messages);\n"
                "sendPool({to: '+1'%s});\n"
            ),
            "destructured.ts": (
                "const {sendNumberPool: sendPool} = client.messages;\n"
                "sendPool({to: '+1'%s});\n"
            ),
            "send.go": (
                "sendPool := client.Messages.SendNumberPool\n"
                "sendPool(map[string]any{\"to\": \"+1\"%s})\n"
            ),
            "Send.cs": (
                "var sendPool = client.Messages.SendNumberPool;\n"
                "sendPool(new { To = \"+1\"%s });\n"
            ),
            "send.rb": (
                "send_pool = client.messages.method(:send_number_pool)\n"
                "send_pool.call({to: '+1'%s})\n"
            ),
            "send.php": (
                "<?php\n$sendPool = [$client->messages, 'sendNumberPool'];\n"
                "$sendPool(['to' => '+1'%s]);\n"
            ),
            "Send.java": (
                "var sendPool = client.messages::sendNumberPool;\n"
                "sendPool.apply(Map.of(\"to\", \"+1\"%s));\n"
            ),
        }
        for name, template in cases.items():
            if name.endswith(".py"):
                separator = ", 'messaging_profile_id': 'abc'"
            elif name.endswith(".go"):
                separator = ', "messaging_profile_id": "abc"'
            elif name.endswith(".cs"):
                separator = ', MessagingProfileId = "abc"'
            elif name.endswith(".rb"):
                separator = ", messaging_profile_id: 'abc'"
            elif name.endswith(".php"):
                separator = ", 'messaging_profile_id' => 'abc'"
            elif name.endswith(".java"):
                separator = ', "messaging_profile_id", "abc"'
            else:
                separator = ", messaging_profile_id: 'abc'"
            with self.subTest(language=name, polarity="missing"):
                result = self.run_required_profile_analyzer(
                    {name: template % ""}
                )
                rows = result.stdout.splitlines()
                self.assertGreaterEqual(int(rows[0]), 1, result.stdout)
                self.assertTrue(any(name in row for row in rows[1:]), result.stdout)
            with self.subTest(language=name, polarity="present"):
                result = self.run_required_profile_analyzer(
                    {name: template % separator}
                )
                rows = result.stdout.splitlines()
                self.assertGreaterEqual(int(rows[0]), 1, result.stdout)
                self.assertFalse(any(row.strip() for row in rows[1:]), result.stdout)

        # Nearest reassignment invalidates an earlier SDK method alias.
        result = self.run_required_profile_analyzer(
            {
                "shadow.js": "let send = client.messages.sendNumberPool;\n"
                "send = localPreview;\n"
                "send({to: '+1'});\n"
            }
        )
        self.assertEqual("0", result.stdout.strip(), result.stdout)

    def test_external_endpoint_provenance_fails_closed_across_languages(self) -> None:
        """Imported mutating endpoints never disappear at a file boundary."""

        url = "https://api.telnyx.com/v2/messages/number_pool"
        cases = {
            "ruby": (
                {"config.rb": f"POOL_URL = '{url}'\n"},
                "send.rb",
                "require_relative './config'\n"
                "Net::HTTP.post(URI(POOL_URL), %s.to_json)\n",
                "{to: '+1'}",
                "{to: '+1', messaging_profile_id: 'abc'}",
            ),
            "go": (
                {"config/endpoints.go": f'package config\nconst PoolURL = "{url}"\n'},
                "send.go",
                'package main\nimport "example/config"\nfunc send() { '
                'http.Post(config.PoolURL, "application/json", strings.NewReader(`%s`)) }\n',
                '{"to":"+1"}',
                '{"to":"+1","messaging_profile_id":"abc"}',
            ),
            "java": (
                {"Config.java": f'class Config {{ static final String POOL_URL = "{url}"; }}\n'},
                "Send.java",
                "import example.Config;\nHttpRequest.newBuilder()"
                ".uri(URI.create(Config.POOL_URL))"
                '.POST(BodyPublishers.ofString("%s")).build();\n',
                '{\\"to\\":\\"+1\\"}',
                '{\\"to\\":\\"+1\\",\\"messaging_profile_id\\":\\"abc\\"}',
            ),
            "csharp": (
                {"Config.cs": f'class Config {{ public const string PoolUrl = "{url}"; }}\n'},
                "Send.cs",
                "using Project;\nawait client.PostAsync(Config.PoolUrl, "
                'new StringContent("%s"));\n',
                '{\\"to\\":\\"+1\\"}',
                '{\\"to\\":\\"+1\\",\\"messaging_profile_id\\":\\"abc\\"}',
            ),
            "php": (
                {"config.php": f"<?php const POOL_URL = '{url}';\n"},
                "send.php",
                "<?php require 'config.php';\nfile_get_contents(POOL_URL, false, "
                "stream_context_create(['http' => ['method' => 'POST', "
                "'content' => '%s']]));\n",
                '{"to":"+1"}',
                '{"to":"+1","messaging_profile_id":"abc"}',
            ),
            "shell": (
                {"config.sh": f"POOL_URL='{url}'\n"},
                "send.sh",
                ". ./config.sh\ncurl -X POST \"$POOL_URL\" -d '%s'\n",
                '{"to":"+1"}',
                '{"to":"+1","messaging_profile_id":"abc"}',
            ),
        }
        for language, (support, filename, template, missing, present) in cases.items():
            with self.subTest(language=language, polarity="missing"):
                result = self.run_required_profile_analyzer(
                    {**support, filename: template % missing}
                )
                rows = result.stdout.splitlines()
                self.assertGreaterEqual(int(rows[0]), 1, result.stdout)
                self.assertTrue(
                    any(filename in row for row in rows[1:]), result.stdout
                )
            with self.subTest(language=language, polarity="present"):
                result = self.run_required_profile_analyzer(
                    {**support, filename: template % present}
                )
                rows = result.stdout.splitlines()
                self.assertGreaterEqual(int(rows[0]), 1, result.stdout)
                self.assertFalse(
                    any(row.strip() for row in rows[1:]), result.stdout
                )

    def test_relative_module_scalar_endpoints_are_resolved(self) -> None:
        pool = "https://api.telnyx.com/v2/messages/number_pool"
        for files in (
            {
                "config.js": f"export const POOL_URL = '{pool}';\n",
                "send.js": (
                    "import { POOL_URL } from './config.js';\n"
                    "fetch(POOL_URL, {method:'POST', body: JSON.stringify({to:'+1'})});\n"
                ),
            },
            {
                "config.js": f"exports.POOL_URL = '{pool}';\n",
                "send.js": (
                    "const {POOL_URL: endpoint} = require('./config');\n"
                    "fetch(endpoint, {method:'POST', body: JSON.stringify({to:'+1'})});\n"
                ),
            },
            {
                "config.py": f"POOL_URL = '{pool}'\n",
                "send.py": (
                    "from config import POOL_URL as endpoint\n"
                    "requests.post(endpoint, json={'to': '+1'})\n"
                ),
            },
        ):
            with self.subTest(files=tuple(files)):
                result, payload = self.run_messaging_linter(files)
                self.assertEqual(1, result.returncode, payload)
                self.assert_required_profile_detected(
                    payload,
                    next(name for name in files if name.startswith("send.")),
                )

        self.assert_required_profile_passes(
            {
                "config.js": "export const SEND_URL = '/v2/messages';\n",
                "send.js": (
                    "import { SEND_URL } from './config.js';\n"
                    "fetch(SEND_URL, {method:'POST', body: JSON.stringify({to:'+1'})});\n"
                ),
            }
        )

    def test_javascript_nonrelative_import_endpoints_fail_closed(self) -> None:
        """Configured aliases and package imports retain URL provenance."""

        forms = {
            "named-at": "import { poolUrl } from '@/endpoints';\n",
            "named-tilde": "import { poolUrl } from '~/endpoints';\n",
            "named-hash": "import { poolUrl } from '#endpoints';\n",
            "default": "import poolUrl from '#endpoints';\n",
            "namespace": "import * as routes from '@/endpoints';\n",
            "require-default": "const poolUrl = require('~/endpoints');\n",
            "require-member": "const {poolUrl} = require('@/endpoints');\n",
            "require-renamed": (
                "const {poolUrl: endpoint} = require('#endpoints');\n"
            ),
        }
        suffixes = (".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts")
        for suffix in suffixes:
            for form, declaration in forms.items():
                name = "routes.poolUrl" if form == "namespace" else (
                    "endpoint" if form == "require-renamed" else "poolUrl"
                )
                source = declaration + (
                    f"fetch({name}, {{method:'POST', "
                    "body:JSON.stringify({to:'+1'})}});\n"
                )
                with self.subTest(suffix=suffix, form=form):
                    result = self.run_required_profile_analyzer(
                        {"send" + suffix: source}
                    )
                    rows = result.stdout.splitlines()
                    self.assertEqual("1", rows[0], result.stdout)
                    self.assertTrue(
                        any(
                            "could not resolve the imported endpoint" in row
                            for row in rows[1:]
                        ),
                        result.stdout,
                    )

        # The provenance guard is method-aware: importing an identifier and
        # merely reading it with fetch's default GET is not a message send.
        result = self.run_required_profile_analyzer(
            {
                "read.ts": (
                    "import { poolUrl } from '@/endpoints';\n"
                    "fetch(poolUrl);\n"
                )
            }
        )
        self.assertEqual("0", result.stdout.strip(), result.stdout)

        configured = self.run_required_profile_analyzer(
            {
                "tsconfig.json": json.dumps(
                    {
                        "compilerOptions": {
                            "paths": {"@app/*": ["src/*"]}
                        }
                    }
                ),
                "configured.ts": (
                    "import { poolUrl } from '@app/endpoints';\n"
                    "fetch(poolUrl,{method:'POST',"
                    "body:JSON.stringify({to:'+1'})});\n"
                ),
            }
        )
        self.assertIn(
            "could not resolve the imported endpoint", configured.stdout
        )

        non_object_config = self.run_required_profile_analyzer(
            {
                "tsconfig.json": "null\n",
                "package.json": "[]\n",
                "package.js": (
                    "import endpoint from 'third-party-config';\n"
                    "fetch(endpoint,{method:'POST',"
                    "body:JSON.stringify({to:'+1'})});\n"
                ),
            }
        )
        self.assertEqual("0", non_object_config.stdout.strip(), non_object_config.stdout)

    def test_javascript_default_module_endpoint_provenance_matrix(self) -> None:
        pool = "https://api.telnyx.com/v2/messages/number_pool"
        normal = "https://api.telnyx.com/v2/messages"
        forms = {
            "esm-direct": (
                "export default '%s';\n",
                "import endpoint from './config.js';\n",
            ),
            "esm-template": (
                "export default `%s`;\n",
                "import endpoint from './config.js';\n",
            ),
            "esm-alias": (
                "const pool = '%s'; export default pool;\n",
                "import endpoint from './config.js';\n",
            ),
            "esm-braced-alias": (
                "const pool = '%s'; const other = '/health'; "
                "export {other, pool as default};\n",
                "import endpoint from './config.js';\n",
            ),
            "esm-default-plus-named": (
                "export default '%s'; export const other = '/health';\n",
                "import endpoint, {other} from './config.js';\n",
            ),
            "esm-default-plus-namespace": (
                "export default '%s'; export const other = '/health';\n",
                "import endpoint, * as config from './config.js';\n",
            ),
            "commonjs-module": (
                "module.exports = '%s';\n",
                "const endpoint = require('./config');\n",
            ),
            "commonjs-default-member": (
                "exports.default = '%s';\n",
                "const endpoint = require('./config').default;\n",
            ),
            "commonjs-default-destructure": (
                "module.exports.default = '%s';\n",
                "const {default: endpoint} = require('./config');\n",
            ),
        }

        def run_form(exporter: str, importer: str, url: str, profile: bool):
            payload = "{to:'+1'"
            if profile:
                payload += ",messaging_profile_id:'mp'"
            payload += "}"
            return self.run_required_profile_analyzer(
                {
                    "config.js": exporter % url,
                    "send.js": importer
                    + "fetch(endpoint,{method:'POST',body:JSON.stringify("
                    + payload
                    + ")});\n",
                }
            )

        for label, (exporter, importer) in forms.items():
            with self.subTest(form=label, polarity="missing"):
                result = run_form(exporter, importer, pool, False)
                rows = result.stdout.splitlines()
                self.assertGreaterEqual(int(rows[0]), 1, result.stdout)
                self.assertTrue(
                    any("send.js" in row for row in rows[1:]), result.stdout
                )
            with self.subTest(form=label, polarity="valid"):
                result = run_form(exporter, importer, pool, True)
                rows = result.stdout.splitlines()
                self.assertGreaterEqual(int(rows[0]), 1, result.stdout)
                self.assertFalse(any(row.strip() for row in rows[1:]), result.stdout)
            with self.subTest(form=label, polarity="non-required"):
                result = run_form(exporter, importer, normal, False)
                self.assertEqual("0", result.stdout.strip(), result.stdout)

        # A dynamic local default export cannot be classified statically, but
        # its mutating use must fail closed rather than certify the migration.
        result = self.run_required_profile_analyzer(
            {
                "config.js": "export default chooseEndpoint();\n",
                "send.js": (
                    "import endpoint from './config.js';\n"
                    "fetch(endpoint,{method:'POST',body:JSON.stringify({to:'+1'})});\n"
                ),
            }
        )
        self.assertIn("could not resolve the imported endpoint", result.stdout)

        result = self.run_required_profile_analyzer(
            {
                "config.js": (
                    f"export default '/health'; export const pool = '{pool}';\n"
                ),
                "send.js": (
                    "import health, * as config from './config.js';\n"
                    "fetch(config.pool,{method:'POST',"
                    "body:JSON.stringify({to:'+1'})});\n"
                ),
            }
        )
        self.assertIn("could not resolve the imported endpoint", result.stdout)

        # Package defaults are outside this bounded local-module contract and
        # must not be guessed to be customer endpoints.
        result = self.run_required_profile_analyzer(
            {
                "send.js": (
                    "import endpoint from 'third-party-config';\n"
                    "fetch(endpoint,{method:'POST',body:JSON.stringify({to:'+1'})});\n"
                )
            }
        )
        self.assertEqual("0", result.stdout.strip(), result.stdout)

    def test_default_esm_endpoint_is_enforced_by_public_wrapper(self) -> None:
        pool = "https://api.telnyx.com/v2/messages/number_pool"
        support = {"config.js": f"export default '{pool}';\n"}
        missing = (
            "import endpoint from './config.js';\n"
            "fetch(endpoint,{method:'POST',body:JSON.stringify({to:'+1'})});\n"
        )
        result, payload = self.run_messaging_linter(
            {**support, "send.js": missing}
        )
        self.assertEqual(1, result.returncode, payload)
        self.assert_required_profile_detected(payload, "send.js")

        self.assert_required_profile_passes(
            {
                **support,
                "send.js": missing.replace(
                    "{to:'+1'}", "{to:'+1',messaging_profile_id:'mp'}"
                ),
            }
        )

    def test_javascript_line_comment_terminators_do_not_hide_sends(self) -> None:
        url = "https://api.telnyx.com/v2/messages/number_pool"
        for terminator in ("\r", "\u2028", "\u2029"):
            with self.subTest(terminator=repr(terminator)):
                self.assert_required_profile_flagged(
                    {
                        "send.js": (
                            "// old send"
                            + terminator
                            + f"fetch('{url}', {{method:'POST', body: JSON.stringify({{to:'+1'}})}});\n"
                        )
                    }
                )

    def test_javascript_regex_literals_do_not_become_comments(self) -> None:
        url = "https://api.telnyx.com/v2/messages/number_pool"
        contexts = {
            "character-class-block-marker": "const r = /[/*]/gu;",
            "character-class-line-marker": "const r = /[//]/;",
            "escaped-block-marker": r"const r = /\/\*/;",
            "escaped-url-slashes": r"const r = /https?:\/\/[^/]+/;",
            "return-expression": "function f(){ return /[/*]/; }",
            "control-body": "if (ok) /[/*]/.test(value);",
            "array-element": "const xs = [/[/*]/];",
            "call-argument": "use(/[/*]/);",
            "template-interpolation": "const x = `${/[/*]/.test(v)}`;",
            "after-block": "if(ok) {}\n/[/*]/.test(v);",
            "arrow-expression": "const f = () => /[/*]/;",
            "ternary-arms": "const x = ok ? /[/*]/ : /[//]/;",
            "throw-expression": "function f(){ throw /[/*]/; }",
            "yield-expression": "function* f(){ yield /[/*]/; }",
            "await-expression": "async function f(){ await /[/*]/.test(v); }",
            "else-body": "if(ok) use(); else /[/*]/.test(v);",
            "do-body": "do /[/*]/.test(v); while(false);",
            "while-body": "while(false) /[/*]/.test(v);",
            "for-body": "for(;false;) /[/*]/.test(v);",
            "catch-body": "try{} catch(e) /[/*]/.test(e);",
            "logical-rhs": "const x = ok && /[/*]/.test(v);",
            "unary-operand": "const x = !/[/*]/.test(v);",
            "case-body": "switch(x){case 1: /[/*]/.test(x); break;}",
            "object-value": "const o = {r: /[/*]/};",
        }
        send = (
            f"fetch('{url}',{{method:'POST',body:JSON.stringify("
            "{to:'+1'PROFILE})});"
        )
        for context, prefix in contexts.items():
            for polarity, profile in (
                ("missing", ""),
                ("valid", ",messaging_profile_id:'mp'"),
            ):
                with self.subTest(context=context, polarity=polarity):
                    result = self.run_required_profile_analyzer(
                        {"send.js": prefix + "\n" + send.replace("PROFILE", profile)}
                    )
                    rows = result.stdout.splitlines()
                    self.assertGreaterEqual(int(rows[0]), 1, result.stdout)
                    findings = [row for row in rows[1:] if "send.js" in row]
                    if polarity == "missing":
                        self.assertTrue(findings, result.stdout)
                    else:
                        self.assertEqual([], findings, result.stdout)

    def test_javascript_division_and_comments_remain_distinct_from_regex(
        self,
    ) -> None:
        url = "https://api.telnyx.com/v2/messages/number_pool"
        prefixes = {
            "division": "const ratio = total / count;",
            "division-assignment": "total /= count;",
            "parenthesized-operand": "const ratio = (total + 1) / count;",
            "string-operand": 'const ratio = "xx".length / count;',
            "regex-operand": "const ratio = /x/.source.length / count;",
            "postfix-operand": "const ratio = value++ / count;",
            "object-operand": "const ratio = ({n: 1}).n / count;",
            "call-operand": "const ratio = fn() / count;",
            "array-operand": "const ratio = arr[0] / count;",
            "number-operand": "const ratio = 10 / count;",
            "boolean-operand": "const ratio = true / count;",
            "null-operand": "const ratio = null / count;",
            "template-operand": "const ratio = `xx`.length / count;",
            "regex-direct-operand": "const ratio = /x/ / count;",
            "block-comment": "/* regex example: /[/*]/ */",
            "line-comment": "// regex example: /[/*]/",
        }
        send = (
            f"fetch('{url}',{{method:'POST',"
            "body:JSON.stringify({to:'+1'})});"
        )
        for context, prefix in prefixes.items():
            with self.subTest(context=context):
                result = self.run_required_profile_analyzer(
                    {"send.js": prefix + "\n" + send}
                )
                rows = result.stdout.splitlines()
                self.assertGreaterEqual(int(rows[0]), 1, result.stdout)
                self.assertTrue(
                    any("send.js" in row for row in rows[1:]), result.stdout
                )

        # Regex text is data, not an SDK call or endpoint-bearing request.
        result = self.run_required_profile_analyzer(
            {
                "decoy.js": (
                    r"const example = /client\.messages\.sendNumberPool\(\{to:1\}\)/;"
                    "\n"
                )
            }
        )
        self.assertEqual("0", result.stdout.strip(), result.stdout)

        # JSX closing tags also use slash but cannot begin regexp literals.
        result = self.run_required_profile_analyzer(
            {
                "view.jsx": (
                    "const view = <Panel><span>/[/*]/</span></Panel>;\n"
                    + send
                )
            }
        )
        rows = result.stdout.splitlines()
        self.assertGreaterEqual(int(rows[0]), 1, result.stdout)
        self.assertTrue(any("view.jsx" in row for row in rows[1:]), result.stdout)

    def test_javascript_regex_comment_ambiguity_is_blocked_by_public_wrapper(
        self,
    ) -> None:
        source = (
            "const separator = /[/*]/;\n"
            "client.messages.sendNumberPool({to:'+1',text:'hi'PROFILE});\n"
        )
        result, payload = self.run_messaging_linter(
            {"send.js": source.replace("PROFILE", "")}
        )
        self.assertEqual(1, result.returncode, payload)
        self.assert_required_profile_detected(payload, "send.js")
        self.assert_required_profile_passes(
            {
                "send.js": source.replace(
                    "PROFILE", ",messaging_profile_id:'mp'"
                )
            }
        )

    def test_finding_rows_escape_newline_bearing_paths(self) -> None:
        result = self.run_required_profile_analyzer(
            {
                "odd\nname.js": (
                    "client.messages.sendNumberPool({to:'+1'});\n"
                )
            }
        )
        rows = result.stdout.splitlines()
        self.assertEqual("1", rows[0], result.stdout)
        self.assertEqual(2, len(rows), result.stdout)
        self.assertIn(r"odd\nname.js:1:", rows[1])

        shell_result, payload = self.run_messaging_linter(
            {"odd\nname.js": "client.messages.sendNumberPool({to:'+1'});\n"}
        )
        check = next(
            item
            for item in payload["checks"]
            if item["name"] == "required_messaging_profile_id"
        )
        self.assertEqual(1, shell_result.returncode, payload)
        self.assertEqual(1, len(check["details"]["files"]), check)
        self.assertIn(r"odd\nname.js:1:", check["details"]["files"][0])

        literal_backslash = self.run_required_profile_analyzer(
            {
                r"literal\nname.js": (
                    "client.messages.sendNumberPool({to:'+1'});\n"
                )
            }
        )
        self.assertIn(r"literal\\nname.js:1:", literal_backslash.stdout)

    def test_hybrid_migrated_paths_keep_structured_identity(self) -> None:
        """Hybrid waivers never split or alias legal POSIX path bytes."""

        for relative in (
            "src/odd\nname.js",
            "src/odd\rname.js",
            r"src/literal\nname.js",
        ):
            with self.subTest(relative=repr(relative)):
                with tempfile.TemporaryDirectory(
                    prefix="telnyx-hybrid-structured-path-"
                ) as directory:
                    root = Path(directory)
                    source = root / relative
                    source.parent.mkdir(parents=True, exist_ok=True)
                    source.write_text(
                        "const twilio = require('twilio');\n",
                        encoding="utf-8",
                    )
                    state = root / "migration-state.json"
                    state.write_text(
                        json.dumps(
                            {
                                "kept_on_twilio": {"conversations": True},
                                "migrated_files": {"messaging": [relative]},
                            }
                        ),
                        encoding="utf-8",
                    )
                    result = subprocess.run(
                        [
                            BASH,
                            str(CORRECTNESS_LINTER),
                            str(root),
                            "--product",
                            "all",
                            "--state-file",
                            str(state),
                            "--json",
                        ],
                        cwd=ROOT,
                        capture_output=True,
                        text=True,
                        timeout=30,
                        check=False,
                    )
                self.assertEqual(1, result.returncode, result.stdout + result.stderr)
                payload = json.loads(result.stdout)
                residual = next(
                    check
                    for check in payload["checks"]
                    if check["name"] == "residual_twilio_imports"
                )
                self.assertEqual("issue", residual["status"], residual)

    def test_url_constructor_base_is_combined_with_the_path(self) -> None:
        # new URL(path, base) resolves the path relative to the base, so
        # new URL('number_pool', 'https://.../messages/') targets number_pool.
        # Unwrapping to the first arg alone classified the send as safe.
        base = "https://api.telnyx.com/v2/messages/"
        template = (
            "fetch(new URL('number_pool', '%s'), {method:'POST', "
            "body: JSON.stringify({to:'+1'%%s})});" % base
        )
        with self.subTest(body="violating"):
            _, payload = self.run_messaging_linter({"send.js": template % ""})
            self.assert_required_profile_detected(payload, "send.js")
        with self.subTest(body="compliant"):
            self.assert_required_profile_passes(
                {"send.js": template % ", messaging_profile_id:'a'"}
            )
        # A base to /messages with a non-pool path is not a number-pool send.
        self.assert_required_profile_passes(
            {
                "other.js": (
                    "fetch(new URL('/', 'https://api.telnyx.com/v2/messages/'), "
                    "{method:'POST', body: JSON.stringify({to:'+1'})});"
                )
            }
        )
        # RFC 3986: a base WITHOUT a trailing slash drops its last segment, so
        # new URL('number_pool', '.../messages') resolves to .../number_pool —
        # NOT a number-pool send. Naive concatenation would false-positive.
        self.assert_required_profile_passes(
            {
                "noslash.js": (
                    "fetch(new URL('number_pool', 'https://api.telnyx.com/v2/messages'), "
                    "{method:'POST', body: JSON.stringify({to:'+1'})});"
                )
            }
        )
        # Java's new URI(scheme, ssp) is not (path, base); combining its
        # arguments must not misclassify it.
        self.assert_required_profile_passes(
            {
                "Send.java": (
                    'HttpRequest.newBuilder().uri(new URI("number_pool", '
                    '"https://api.telnyx.com/v2/messages/")).POST('
                    'HttpRequest.BodyPublishers.ofString("{}")).build();'
                )
            }
        )

    def test_client_base_url_is_combined_with_the_request_path(self) -> None:
        # A client base URL makes the request path relative. The effective
        # endpoint is base + path, so a base ending in /messages with a
        # /number_pool path is a number-pool send. Both the inline and the
        # idiomatic variable form must resolve.
        base = "https://api.telnyx.com/v2/messages"
        forms = {
            "inline.js": f"axios.create({{baseURL:'{base}'}}).post('/number_pool', {{to:'+1'%s}});",
            "variable.js": (
                f"const api = axios.create({{baseURL:'{base}'}});\n"
                "api.post('/number_pool', {to:'+1'%s});\n"
            ),
            "defaults-instance.js": (
                "const api = axios.create();\n"
                f"api.defaults.baseURL = '{base}';\n"
                "api.post('/number_pool', {to:'+1'%s});\n"
            ),
            "defaults-global.js": (
                f"axios.defaults.baseURL = '{base}';\n"
                "axios.post('/number_pool', {to:'+1'%s});\n"
            ),
            "httpx.py": (
                f"httpx.Client(base_url='{base}')"
                ".post('/number_pool', json={'to':'+1'%s})"
            ),
        }
        for name, template in forms.items():
            with self.subTest(shape=name, body="violating"):
                _, payload = self.run_messaging_linter({name: template % ""})
                self.assert_required_profile_detected(payload, name)
            with self.subTest(shape=name, body="compliant"):
                profile = (
                    ", 'messaging_profile_id': 'a'"
                    if name.endswith(".py")
                    else ", messaging_profile_id: 'a'"
                )
                self.assert_required_profile_passes({name: template % profile})

    def test_base_url_to_a_different_endpoint_is_not_flagged(self) -> None:
        # The base-URL combination must not over-fire: a base ending in
        # /messages with a non-pool path is not a number-pool send.
        self.assert_required_profile_passes(
            {
                "other.js": (
                    "axios.create({baseURL:'https://api.telnyx.com/v2/messages'})"
                    ".post('/', {to: '+1'});"
                ),
                "defaults-other.js": (
                    "axios.defaults.baseURL = "
                    "'https://api.telnyx.com/v2/messages';\n"
                    "axios.post('/other', {to: '+1'});"
                ),
            }
        )

    def test_mock_factory_post_is_not_treated_as_a_send(self) -> None:
        # The factory discrimination must keep mocking/assertion libraries out
        # of scope: nock(...).post(url) sets up an expectation, it does not
        # send. Analysing it would false-positive on test files.
        url = "https://api.telnyx.com/v2/messages/number_pool"
        for name, code in (
            ("nock.spec.js", f"nock(API).post('{url}').reply(200);\n"),
            ("sinon.spec.js", f"sinon.stub().post('{url}');\n"),
        ):
            with self.subTest(mock=name):
                self.assert_required_profile_passes({name: code})

    def test_unbraced_conditional_profile_write_is_guarded(self) -> None:
        # `if (flag) payload.messaging_profile_id = pid;` sets the profile
        # only conditionally, so a number-pool send below it can run without
        # the profile. The control-flow index skipped unbraced bodies, so the
        # write looked unconditional and the send passed. It must be flagged.
        js = (
            "async function send(to, text, usePool) {\n"
            "  const payload = { to, text };\n"
            "  if (usePool) payload.messaging_profile_id = 'abc';\n"
            "  return fetch('https://api.telnyx.com/v2/messages/number_pool', "
            "{ method: 'POST', body: JSON.stringify(payload) });\n"
            "}\n"
        )
        _, payload = self.run_messaging_linter({"send.js": js})
        self.assert_required_profile_detected(payload, "send.js")

    def test_every_unbraced_control_body_guards_a_profile_write(self) -> None:
        # The whole unbraced-body class, not just the `if` that was reported
        # first. In each case the profile is set only inside an unbraced
        # control body that may not run (or runs only on one branch), so the
        # number-pool send below can execute without the profile and must be
        # flagged. Bodies: if, else, else-if, for, while, foreach.
        send = (
            "  return fetch('https://api.telnyx.com/v2/messages/number_pool', "
            "{ method: 'POST', body: JSON.stringify(payload) });\n"
        )
        bodies = {
            "unbraced_if":
                "  if (opt) payload.messaging_profile_id = 'p';\n",
            "unbraced_else":
                "  if (skip) { doThing(); } else payload.messaging_profile_id = 'p';\n",
            "unbraced_else_if":
                "  if (a) doA(); else if (b) payload.messaging_profile_id = 'p';\n",
            "unbraced_for":
                "  for (const x of items) payload.messaging_profile_id = x.id;\n",
            "unbraced_while":
                "  while (more()) payload.messaging_profile_id = next();\n",
            "unbraced_foreach_java":
                "  for (Item x : items) payload.messaging_profile_id = x.id;\n",
        }
        for label, body in bodies.items():
            suffix = ".java" if "java" in label else ".js"
            name = f"send{suffix}"
            source = (
                "function send(items, opt, skip) {\n"
                "  const payload = { to, text };\n"
                + body + send + "}\n"
            )
            with self.subTest(shape=label):
                _, payload = self.run_messaging_linter({name: source})
                self.assert_required_profile_detected(payload, name)

    def test_braced_exhaustive_if_else_still_passes(self) -> None:
        # Both branches set the profile: the send is guaranteed compliant and
        # must NOT be flagged. Guards against the fix over-firing on exhaustive
        # if/else, including an unbraced else.
        compliant = (
            "function send(opt) {\n"
            "  const payload = { to, text };\n"
            "  if (opt) payload.messaging_profile_id = 'a';"
            " else payload.messaging_profile_id = 'b';\n"
            "  return fetch('https://api.telnyx.com/v2/messages/number_pool', "
            "{ method: 'POST', body: JSON.stringify(payload) });\n"
            "}\n"
        )
        self.assert_required_profile_passes({"send.js": compliant})

    def test_do_while_body_runs_and_is_not_a_guard(self) -> None:
        # A do-while body always executes at least once, so a profile write
        # there IS guaranteed and the send must pass. Confirms _body_arm does
        # not spuriously guard the trailing `while (cond);`.
        compliant = (
            "function send() {\n"
            "  const payload = { to, text };\n"
            "  do payload.messaging_profile_id = 'p'; while (retry());\n"
            "  return fetch('https://api.telnyx.com/v2/messages/number_pool', "
            "{ method: 'POST', body: JSON.stringify(payload) });\n"
            "}\n"
        )
        self.assert_required_profile_passes({"send.js": compliant})

    def test_unconditional_profile_write_still_passes(self) -> None:
        # The guard must not over-fire: an unconditional write is compliant.
        js = (
            "async function send(to, text) {\n"
            "  const payload = { to, text };\n"
            "  payload.messaging_profile_id = 'abc';\n"
            "  return fetch('https://api.telnyx.com/v2/messages/number_pool', "
            "{ method: 'POST', body: JSON.stringify(payload) });\n"
            "}\n"
        )
        self.assert_required_profile_passes({"send.js": js})

    def test_request_style_config_object_urls_are_resolved(self) -> None:
        """post({url: ..., json: {...}}) must be seen as a number-pool send.

        The URL lives in an object member rather than a named argument, so the
        resolver evaluated the whole object and the call was not recognised as
        targeting the endpoint at all — a send missing messaging_profile_id
        passed. Both halves are covered here: the URL side must find the call,
        and the payload side must be able to prove a compliant body, or fixing
        the miss would just convert it into a false report.
        """

        url = "https://api.telnyx.com/v2/messages/number_pool"
        shapes = {
            "inline": "request.post({{{key}: '%s', json: {{{body}}}}});" % url,
            "inline_with_callback":
                "request.post({{{key}: '%s', json: {{{body}}}}}, cb);" % url,
            "variable": (
                "const cfg = {{{key}: '%s', json: {{{body}}}}};\n"
                "request.post(cfg);" % url
            ),
            "variable_with_callback": (
                "const cfg = {{{key}: '%s', json: {{{body}}}}};\n"
                "request.post(cfg, cb);" % url
            ),
        }
        violating_body = "to: '+1', text: 'hi'"
        compliant_body = violating_body + ", messaging_profile_id: 'abc'"

        for label, template in shapes.items():
            # Every spelling the named-argument path already accepted. `uri`
            # worked as a named argument but not as an object member, which is
            # how the two paths drifted apart.
            for key in ("url", "uri", "requestUri"):
                with self.subTest(shape=label, key=key, body="violating"):
                    name = "send.js"
                    _, payload = self.run_messaging_linter(
                        {name: template.format(key=key, body=violating_body)}
                    )
                    self.assert_required_profile_detected(payload, name)

                with self.subTest(shape=label, key=key, body="compliant"):
                    self.assert_required_profile_passes(
                        {"send.js": template.format(key=key, body=compliant_body)}
                    )

    def test_config_object_url_does_not_displace_a_positional_endpoint(self) -> None:
        # A url-shaped key inside the BODY must not be mistaken for the
        # endpoint. post(url, {callback_url: ...}) still resolves the
        # positional string, and a base-URL client passing only a body keeps
        # its previous treatment rather than being newly misread.
        url = "https://api.telnyx.com/v2/messages/number_pool"
        _, payload = self.run_messaging_linter(
            {
                "send.js": (
                    f"client.post('{url}', "
                    "{to: '+1', callback_url: 'https://example.test/cb'});"
                )
            }
        )
        self.assert_required_profile_detected(payload, "send.js")

        self.assert_required_profile_passes(
            {
                "send.js": (
                    f"client.post('{url}', {{to: '+1', "
                    "messaging_profile_id: 'abc', "
                    "callback_url: 'https://example.test/cb'});"
                )
            }
        )

    def test_go_client_post_body_is_read_from_the_third_argument(self) -> None:
        # (*http.Client).Post has the same (url, contentType, body) signature
        # as net/http.Post, but the branch handling it was gated on the
        # receiver being literally "http". Every client.Post /
        # http.DefaultClient.Post call fell through to the generic
        # post(url, body, config) rule, which inspected "application/json" as
        # the payload and reported a compliant send as missing the profile.
        url = "https://api.telnyx.com/v2/messages/number_pool"
        for receiver in ("http", "client", "http.DefaultClient", "httpClient"):
            with self.subTest(receiver=receiver):
                compliant = {
                    "send.go": (
                        "package main\n\nfunc send() {\n"
                        f'\t{receiver}.Post("{url}", "application/json", '
                        'strings.NewReader(`{"to":"+1",'
                        '"messaging_profile_id":"abc"}`))\n}\n'
                    )
                }
                self.assert_required_profile_passes(compliant)

                violating = {
                    "send.go": (
                        "package main\n\nfunc send() {\n"
                        f'\t{receiver}.Post("{url}", "application/json", '
                        'strings.NewReader(`{"to":"+1"}`))\n}\n'
                    )
                }
                _, payload = self.run_messaging_linter(violating)
                self.assert_required_profile_detected(payload, "send.go")

    def test_correctness_linter_scans_every_js_module_extension(self) -> None:
        for suffix in self.JS_TS_FAMILY:
            with self.subTest(suffix=suffix):
                name = f"voice{suffix}"
                files = {
                    name: (
                        "const twilio = require('twilio');\n"
                        "const VoiceResponse = twilio.twiml.VoiceResponse;\n"
                        "const response = new VoiceResponse();\n"
                    )
                }
                _, payload = self.run_messaging_linter(files, product="voice")
                leftovers = [
                    check
                    for check in payload["checks"]
                    if check["status"] in {"warn", "issue"}
                    and "voice" in json.dumps(check).lower()
                ]
                self.assertTrue(
                    leftovers,
                    f"TwiML leftover in {name} was reported as clean: "
                    f"{json.dumps(payload['checks'])}",
                )

    # The member-net contract: a required path the call-centric resolver never
    # evaluates stays reported unless PROVABLY unused. Each flow below was a
    # reproduced silent miss before member_net_contexts existed. A miss is
    # worse than an extra report — none of these may ever pass again.
    def test_member_net_reports_flows_the_resolver_cannot_see(self) -> None:
        pool = '"/v2/messages/number_pool"'
        flows = {
            "spread-benign-ref.js": (
                f"var endpoints = {{ pool: {pool},"
                " normal: '/v2/messages' };\n"
                "fetch(endpoints.normal, {method: 'POST'});\n"
                "const urls = { ...endpoints };\n"
                "fetch(urls.pool, {method: 'POST'});"
            ),
            "helper-param.ts": (
                f"const endpoints = {{ pool: {pool} }};\n"
                "function send(url, payload) { return post(url, payload); }\n"
                'send(endpoints.pool, { to: "+1" });'
            ),
            "later-definition.ts": (
                'function go() { return post(endpoints.pool,'
                ' { to: "+1" }); }\n'
                f"const endpoints = {{ pool: {pool} }};"
            ),
            "same-member-unmodelled.ts": (
                f"const endpoints = {{ pool: {pool},"
                " normal: '/v2/messages' };\n"
                'myClient.send(endpoints.pool, { to: "+1" });\n'
                'axios.post(endpoints.normal, { to: "+1" });'
            ),
            "globalthis-dotted.js": (
                f"var endpoints = {{ pool: {pool},"
                " normal: '/v2/messages' };\n"
                "fetch(endpoints.normal, {method: 'POST'});\n"
                "fetch(globalThis.endpoints.pool, {method: 'POST'});"
            ),
            "ancestor-handoff.js": (
                f"const endpoints = {{ grp: {{ pool: {pool},"
                " normal: '/v2/messages' } };\n"
                "function sendIt(g) { return fetch(g.pool,"
                " {method: 'POST'}); }\n"
                "sendIt(endpoints.grp);"
            ),
            "export-equals.ts": (
                f"const endpoints = {{ pool: {pool},"
                " normal: '/v2/messages' };\n"
                "fetch(endpoints.normal, {method: 'POST'});\n"
                "export = endpoints;"
            ),
            "class-attribute.py": (
                "class Config:\n"
                f"    endpoints = {{ 'pool': {pool},"
                " 'normal': '/v2/messages' }\n"
                "    default = endpoints['normal']\n"
                "def send_pool(p):\n"
                "    requests.post(Config.endpoints['pool'], json=p)"
            ),
            "destructured-required.ts": (
                f"const endpoints = {{ pool: {pool} }};\n"
                "const { pool } = endpoints;\n"
                'await post(pool, { to: "+1" });'
            ),
            "renamed-into-other.ts": (
                f"const endpoints = {{ poolUrl: {pool},"
                " normal: '/v2/messages' };\n"
                "const alt = { normal: endpoints.poolUrl };\n"
                'await post(alt.normal, { to: "+1" });'
            ),
            "relative-in-container.ts": (
                "const endpoints = { pool: 'messages/number_pool' };\n"
                "myClient.send(endpoints.pool, { to: '+1' });"
            ),
        }
        for name, source in flows.items():
            with self.subTest(flow=name):
                self.assert_required_profile_flagged({name: source})

    def test_member_net_reports_cross_file_definition(self) -> None:
        self.assert_required_profile_flagged(
            {
                "endpoints.js": (
                    "export const ENDPOINTS = { pool:"
                    ' "https://api.telnyx.com/v2/messages/number_pool" };'
                ),
                "send.js": (
                    'import { ENDPOINTS } from "./endpoints.js";\n'
                    'await post(ENDPOINTS.pool, { to: "+1" });'
                ),
            }
        )

    def test_member_net_defers_to_the_resolver_where_it_is_proven(
        self,
    ) -> None:
        # The resolver's corpus pins these as its domain; the net must not
        # duplicate or contradict it.
        pool = '"/v2/messages/number_pool"'
        clears = {
            "member-divergent.ts": (
                f"const endpoints = {{ pool: {pool},"
                " normal: '/v2/messages' };\n"
                "axios.post(endpoints.normal, {from, to, text});"
            ),
            "exported-divergent.ts": (
                f"export const endpoints = {{ pool: {pool},"
                " normal: '/v2/messages' };\n"
                "axios.post(endpoints.normal, {from, to, text});"
            ),
            "toplevel-divergent.py": (
                f"endpoints = {{ 'pool': {pool},"
                " 'normal': '/v2/messages' }\n"
                "requests.post(endpoints['normal'], json={'from': 1})"
            ),
            "dynamic-key.ts": (
                f"const endpoints = {{ pool: {pool},"
                " normal: '/v2/messages' };\n"
                "axios.post(endpoints[whichever], {from, to});"
            ),
        }
        for name, source in clears.items():
            with self.subTest(flow=name):
                self.assert_required_profile_passes({name: source})

    def test_relative_base_url_paths_are_required(self) -> None:
        self.assert_required_profile_flagged(
            {
                "base-url.ts": (
                    "const api = axios.create({ baseURL:"
                    " 'https://api.telnyx.com/v2/' });\n"
                    "api.post('messages/number_pool',"
                    " { to: '+1', text: 'hi' });"
                )
            }
        )
        self.assert_required_profile_passes(
            {
                "base-url-ok.ts": (
                    "const api = axios.create({ baseURL:"
                    " 'https://api.telnyx.com/v2/' });\n"
                    "api.post('messages/number_pool', { to: '+1',"
                    " text: 'hi', messaging_profile_id: 'mp-1' });"
                )
            }
        )
        self.assert_required_profile_passes(
            {
                "base-url-ordinary.ts": (
                    "const api = axios.create({ baseURL:"
                    " 'https://api.telnyx.com/v2/' });\n"
                    "api.post('messages', { to: '+1', text: 'hi' });"
                )
            }
        )

    def test_telnyx_messages_create_with_text_is_not_classified_as_twilio(
        self,
    ) -> None:
        result, payload = self.run_messaging_linter(
            {
                "telnyx-client.js": "\n".join(
                    (
                        "await client.messages.create({",
                        "  from: sender,",
                        "  to: recipient,",
                        "  text: 'hello from Telnyx',",
                        "});",
                    )
                ),
                "telnyx-client.rb": "\n".join(
                    (
                        "client.messages.create(",
                        "  from: sender,",
                        "  to: recipient,",
                        "  text: 'hello from Telnyx'",
                        ")",
                    )
                ),
            }
        )
        checks = [
            check
            for check in payload["checks"]
            if check["name"] == "twilio_messages_create"
        ]
        self.assertEqual(
            [{"name": "twilio_messages_create", "status": "pass"}], checks
        )
        self.assertEqual(0, result.returncode)

    def test_twilio_body_field_detection_is_quote_and_comment_aware(self) -> None:
        result, payload = self.run_messaging_linter(
            {
                "valid-text.js": "\n".join(
                    (
                        "await client.messages.create({",
                        "  text: 'The body: hello // still message text',",
                        "  webhookUrl: 'https://example.test/status',",
                        "  metadata: {body: 'not message content'},",
                        "});",
                    )
                ),
                "valid-same-line.js": (
                    "await client.messages.create({text: "
                    "'The body: hello // still message text'});"
                ),
                "valid-nested-shorthand.js": (
                    "const body = 'metadata'; "
                    "await client.messages.create({text, metadata: {body}});"
                ),
                "valid-payload-variable.js": (
                    "const body = {text: 'hello'}; "
                    "await client.messages.create(body);"
                ),
                "real-body-after-url.js": (
                    "await client.messages.create({webhookUrl: "
                    "'https://example.test/status', body: 'legacy'});"
                ),
                "quoted-body.ts": (
                    'await client.messages.create({"body": "legacy"});'
                ),
                "shorthand-create.js": (
                    "await client.messages.create({from, to, body});"
                ),
                "shorthand-send.ts": "await client.messages.send({body});",
                "send-body.py": "client.messages.send(to=to, body='legacy')",
            }
        )
        check = next(
            item
            for item in payload["checks"]
            if item["name"] == "twilio_messages_create"
        )
        self.assertEqual("issue", check["status"])
        details = json.dumps(check["details"])
        self.assertNotIn("valid-text.js", details)
        self.assertNotIn("valid-same-line.js", details)
        self.assertNotIn("valid-nested-shorthand.js", details)
        self.assertNotIn("valid-payload-variable.js", details)
        self.assertIn("real-body-after-url.js", details)
        self.assertIn("quoted-body.ts", details)
        self.assertIn("shorthand-create.js", details)
        body_check = next(
            item for item in payload["checks"] if item["name"] == "body_not_text"
        )
        body_details = json.dumps(body_check["details"])
        self.assertNotIn("valid-text.js", body_details)
        self.assertNotIn("valid-same-line.js", body_details)
        self.assertNotIn("valid-nested-shorthand.js", body_details)
        self.assertNotIn("valid-payload-variable.js", body_details)
        self.assertIn("shorthand-send.ts", body_details)
        self.assertIn("send-body.py", body_details)
        self.assertEqual(1, result.returncode)

    def test_javascript_body_detector_resolves_static_payload_forms(self) -> None:
        positive = {
            "computed-double.js": (
                'client.messages.create({["body"]: legacy});'
            ),
            "computed-single.ts": (
                "client.messages.send({['body']: legacy});"
            ),
            "computed-template.tsx": (
                "client.messages.send({[`body`]: legacy});"
            ),
            "optional-member.jsx": (
                "client.messages?.create({body});"
            ),
            "optional-call.ts": "client.messages.send?.({body});",
            "payload-explicit.js": (
                "const payload = {body: legacy};\n"
                "client.messages.create(payload);"
            ),
            "payload-shorthand.ts": (
                "const payload = {body};\nclient.messages.send(payload);"
            ),
            "payload-computed.tsx": (
                'const payload = {["body"]: legacy};\n'
                "client.messages.send(payload);"
            ),
            "payload-alias.js": (
                "const original = {body};\nconst payload = original;\n"
                "client.messages.create(payload);"
            ),
            "payload-spread.jsx": (
                "const payload = {body};\n"
                "client.messages.create({...payload, text});"
            ),
            "payload-dot-mutation.ts": (
                "const payload = {text};\npayload.body = legacy;\n"
                "client.messages.send(payload);"
            ),
            "payload-computed-mutation.js": (
                'const payload = {text};\npayload["body"] = legacy;\n'
                "client.messages.create(payload);"
            ),
            "payload-second-spread.js": (
                "const metadata = {source};\nconst payload = {body};\n"
                "client.messages.create({...metadata, ...payload});"
            ),
            "outer-payload-in-closure.js": (
                "const payload = {body};\n"
                "function send() { client.messages.create(payload); }"
            ),
            "outer-mutation-after-shadow.js": (
                "const payload = {text};\n"
                "function unrelated() { const payload = {body}; }\n"
                "payload.body = legacy;\n"
                "client.messages.create(payload);"
            ),
        }
        negative = {
            "nested-shorthand.js": (
                "client.messages.create({text, metadata: {body}});"
            ),
            "nested-computed.ts": (
                'client.messages.send({text, metadata: {["body"]: legacy}});'
            ),
            "payload-variable-named-body.js": (
                "const body = {text};\nclient.messages.create(body);"
            ),
            "body-as-text-value.ts": (
                "client.messages.send({text: body});"
            ),
            "body-computed-value.jsx": (
                'client.messages.create({text: source["body"]});'
            ),
            "mutation-after-call.tsx": (
                "const payload = {text};\nclient.messages.send(payload);\n"
                "payload.body = legacy;"
            ),
            "stale-payload-assignment.js": (
                "let payload = {body};\npayload = {text};\n"
                "client.messages.create(payload);"
            ),
            "mutation-string-decoy.js": (
                "const payload = {text};\n"
                "console.log('payload[\"body\"] = legacy');\n"
                "client.messages.create(payload);"
            ),
            "nested-scope-mutation-decoy.js": (
                "const payload = {text};\n"
                "function unrelated() {\n"
                "  const payload = {text};\n"
                "  payload.body = legacy;\n"
                "}\n"
                "client.messages.create(payload);"
            ),
            "sibling-scope-assignment-decoy.js": (
                "function unrelated() { const payload = {body}; }\n"
                "function send() {\n"
                "  const payload = {text};\n"
                "  client.messages.create(payload);\n"
                "}"
            ),
        }
        _, payload = self.run_messaging_linter({**positive, **negative})
        check = next(
            item for item in payload["checks"] if item["name"] == "body_not_text"
        )
        details = {
            Path(detail.split(":", 1)[0]).name
            for detail in check["details"]["files"]
        }
        self.assertEqual(set(positive), details)

    def test_javascript_body_detector_exhaustive_finite_grammar(self) -> None:
        """Exhaust every production in the declared direct-call grammar.

        Whitespace and comments are unbounded languages, so the grammar uses
        four lexer-equivalence classes. Assignment, alias, spread, and mutation
        productions are covered separately by the static-payload-form oracle.
        """

        namespace = runpy.run_path(
            str(MESSAGING_SOURCE_ANALYZER),
            run_name="telnyx_messaging_source_analyzer_contract",
        )
        detect = namespace["message_body_fields"]
        all_calls = namespace["MESSAGE_BODY_CALL_RE"]
        create_calls = namespace["TWILIO_MESSAGE_CREATE_RE"]

        key_forms = (
            "body",
            "body: legacy",
            "'body': legacy",
            '"body": legacy',
            "['body']: legacy",
            '["body"]: legacy',
            "[`body`]: legacy",
        )
        positions = {
            "sole": lambda key: [key],
            "first": lambda key: [key, "text"],
            "middle": lambda key: ["from", key, "text"],
            "last": lambda key: ["from", "text", key],
        }
        layouts = {
            "compact": lambda members: "{" + ",".join(members) + "}",
            "spaced": lambda members: "{ " + ", ".join(members) + " }",
            "multiline": lambda members: "{\n  "
            + ",\n  ".join(members)
            + "\n}",
            "comments": lambda members: "{/* gap */ "
            + " /* member */ , /* gap */ ".join(members)
            + " /* end */}",
        }
        decoys = (
            "{text: body}",
            "{text, metadata: {body}}",
            "{text, metadata: {'body': legacy}}",
            '{text, metadata: {["body"]: legacy}}',
            '{text: source["body"]}',
            "body",
            "body, requestOptions",
            "{somebody: legacy}",
            "{bodyText: legacy}",
            "{text: 'body: legacy'}",
            "{text /* body */}",
        )

        with tempfile.TemporaryDirectory(
            prefix="telnyx-body-grammar-"
        ) as temp_dir:
            temp_root = Path(temp_dir)
            for extension in ("js", "jsx", "ts", "tsx"):
                lines: list[str] = []
                expected_all: set[int] = set()
                expected_create: set[int] = set()
                next_line = 1

                def append_call(
                    method: str,
                    root_optional: bool,
                    member_optional: bool,
                    call_optional: bool,
                    arguments: str,
                    *,
                    expected: bool,
                ) -> None:
                    nonlocal next_line
                    root = "?." if root_optional else "."
                    member = "?." if member_optional else "."
                    invocation = "?." if call_optional else ""
                    statement = (
                        f"client{root}messages{member}{method}{invocation}"
                        f"({arguments});"
                    )
                    statement_line = next_line
                    lines.append(statement)
                    next_line += statement.count("\n") + 1
                    if expected:
                        expected_all.add(statement_line)
                        if method == "create":
                            expected_create.add(statement_line)

                for method in ("create", "send"):
                    for root_optional in (False, True):
                        for member_optional in (False, True):
                            for call_optional in (False, True):
                                for key in key_forms:
                                    for make_members in positions.values():
                                        members = make_members(key)
                                        for render in layouts.values():
                                            append_call(
                                                method,
                                                root_optional,
                                                member_optional,
                                                call_optional,
                                                render(members),
                                                expected=True,
                                            )
                                for decoy in decoys:
                                    append_call(
                                        method,
                                        root_optional,
                                        member_optional,
                                        call_optional,
                                        decoy,
                                        expected=False,
                                    )
                                append_call(
                                    method,
                                    root_optional,
                                    member_optional,
                                    call_optional,
                                    "{text}, {body: transportOption}",
                                    expected=False,
                                )

                access_forms = 2 * 2 * 2
                positive_count = (
                    2
                    * access_forms
                    * len(key_forms)
                    * len(positions)
                    * len(layouts)
                )
                negative_count = 2 * access_forms * (len(decoys) + 1)
                self.assertEqual(
                    positive_count + negative_count, len(lines)
                )
                self.assertEqual(positive_count, len(expected_all))
                self.assertEqual(positive_count // 2, len(expected_create))
                fixture = temp_root / f"matrix.{extension}"
                fixture.write_text("\n".join(lines) + "\n", encoding="utf-8")
                prefix = f"{fixture}:"

                def finding_lines(pattern: re.Pattern[str]) -> set[int]:
                    return {
                        int(detail[len(prefix) :].split(":", 1)[0])
                        for detail in detect(fixture, pattern)
                    }

                self.assertEqual(expected_all, finding_lines(all_calls))
                self.assertEqual(
                    expected_create, finding_lines(create_calls)
                )

    def test_python_ruby_body_detector_static_payload_grammar(self) -> None:
        positive = {
            "python-keyword.py": (
                "client.messages.create(to=recipient, body=legacy)"
            ),
            "python-dict.py": (
                'client.messages.send({"to": recipient, "body": legacy})'
            ),
            "python-payload.py": (
                'payload = {"body": legacy}\n'
                "client.messages.create(**payload)"
            ),
            "python-mutation.py": (
                'payload = {"text": text}\npayload["body"] = legacy\n'
                "client.messages.send(**payload)"
            ),
            "ruby-keyword.rb": (
                "client.messages.create(to: recipient, body: legacy)"
            ),
            "ruby-hash-rocket.rb": (
                'client.messages.send({"to" => recipient, "body" => legacy})'
            ),
            "ruby-payload.rb": (
                "payload = { body: legacy }\n"
                "client.messages.create(**payload)"
            ),
            "ruby-symbol-mutation.rb": (
                "payload = { text: text }\npayload[:body] = legacy\n"
                "client.messages.send(**payload)"
            ),
        }
        negative = {
            "python-text-value.py": (
                "client.messages.create(text=body)"
            ),
            "python-nested.py": (
                'client.messages.send({"text": text, "metadata": {"body": legacy}})'
            ),
            "python-stale.py": (
                'payload = {"body": legacy}\npayload = {"text": text}\n'
                "client.messages.create(**payload)"
            ),
            "python-variable-named-body.py": (
                'body = {"text": text}\nclient.messages.send(**body)'
            ),
            "ruby-text-value.rb": (
                "client.messages.create(text: body)"
            ),
            "ruby-nested.rb": (
                "client.messages.send(text: text, metadata: {body: legacy})"
            ),
            "ruby-stale.rb": (
                "payload = {body: legacy}\npayload = {text: text}\n"
                "client.messages.create(**payload)"
            ),
            "ruby-variable-named-body.rb": (
                "body = {text: text}\nclient.messages.send(**body)"
            ),
        }
        _, payload = self.run_messaging_linter({**positive, **negative})
        check = next(
            item for item in payload["checks"] if item["name"] == "body_not_text"
        )
        details = {
            Path(detail.split(":", 1)[0]).name
            for detail in check["details"]["files"]
        }
        self.assertEqual(set(positive), details)

    def test_supported_non_neural_polly_voice_is_preserved_without_warning(
        self,
    ) -> None:
        result, payload = self.run_messaging_linter(
            {
                "voice.xml": (
                    '<Response><Say voice="Polly.Mizuki">Hello</Say></Response>'
                )
            },
            product="voice",
        )
        check = next(
            item for item in payload["checks"] if item["name"] == "polly_non_neural"
        )
        self.assertEqual("pass", check["status"])
        self.assertNotIn("woman", json.dumps(payload))
        self.assertEqual(0, result.returncode)

    def test_twilio_messages_create_with_body_is_still_an_issue(self) -> None:
        result, payload = self.run_messaging_linter(
            {
                "twilio-client.js": "\n".join(
                    (
                        "await client.messages.create({",
                        "  from: sender,",
                        "  to: recipient,",
                        "  body: 'legacy Twilio field',",
                        "});",
                    )
                ),
                "twilio-client.rb": "\n".join(
                    (
                        "client.messages.create(",
                        "  from: sender,",
                        "  to: recipient,",
                        "  body: 'legacy Twilio field'",
                        ")",
                    )
                ),
            }
        )
        checks = [
            check
            for check in payload["checks"]
            if check["name"] == "twilio_messages_create"
        ]
        self.assertEqual(1, len(checks))
        self.assertEqual("issue", checks[0]["status"])
        details = json.dumps(checks[0]["details"])
        self.assertIn("twilio-client.js", details)
        self.assertIn("twilio-client.rb", details)
        self.assertEqual(1, result.returncode)

    def test_generated_alphanumeric_sender_path_is_detected_in_js_and_ts_variants(
        self,
    ) -> None:
        for extension in ("js", "jsx", "ts", "tsx"):
            fixture_name = f"sender.{extension}"
            with self.subTest(extension=extension):
                _, payload = self.run_messaging_linter(
                    {
                        fixture_name: "\n".join(
                            (
                                'const endpoint = "/v2/messages/alphanumeric_sender_id";',
                                "export const send = () => fetch(endpoint, { method: \"POST\" });",
                            )
                        )
                    }
                )
                self.assert_required_profile_detected(payload, fixture_name)

    def test_composed_rest_endpoint_alias_is_checked_at_request(self) -> None:
        fixture_name = "composed-endpoint.ts"
        _, payload = self.run_messaging_linter(
            {
                fixture_name: "\n".join(
                    (
                        'const path = "/v2/messages/number_pool";',
                        "const url = API_BASE + path;",
                        "axios.post(url, {from, to, text});",
                    )
                )
            }
        )
        self.assert_required_profile_detected(payload, fixture_name)

    def test_composed_rest_endpoint_alias_with_profile_passes(self) -> None:
        self.assert_required_profile_passes(
            {
                "valid-composed-endpoint.ts": "\n".join(
                    (
                        'const path = "/v2/messages/number_pool";',
                        "const url = API_BASE + path;",
                        "axios.post(url, {from, to, text, messaging_profile_id: profileId});",
                    )
                )
            }
        )

    def test_rest_endpoint_object_members_keep_distinct_identity(self) -> None:
        fixtures = {
            "dot-member.ts": "\n".join(
                (
                    "const endpoints = {",
                    '  pool: "/v2/messages/number_pool",',
                    '  normal: "/v2/messages",',
                    "};",
                    "axios.post(endpoints.normal, {from, to, text});",
                )
            ),
            "bracket-member.js": "\n".join(
                (
                    "const endpoints = {",
                    '  "pool": "/v2/messages/number_pool",',
                    '  "normal": "/v2/messages",',
                    "};",
                    'fetch(endpoints["normal"], {method: "POST", body: JSON.stringify({from, to, text})});',
                )
            ),
            "nested-member.tsx": "\n".join(
                (
                    "const routes = {messages: {",
                    '  pool: "/v2/messages/number_pool",',
                    '  normal: "/v2/messages",',
                    "}};",
                    "axios.post(routes.messages.normal, {from, to, text});",
                )
            ),
            "destructured-member.ts": "\n".join(
                (
                    "const endpoints = {",
                    '  pool: "/v2/messages/number_pool",',
                    '  normal: "/v2/messages",',
                    "};",
                    "const {normal: endpoint} = endpoints;",
                    "axios.post(endpoint, {from, to, text});",
                )
            ),
            "shadowed-member.ts": "\n".join(
                (
                    'const endpoints = {pool: "/v2/messages/number_pool"};',
                    "function send() {",
                    '  const endpoints = {pool: "/v2/messages"};',
                    "  axios.post(endpoints.pool, {from, to, text});",
                    "}",
                )
            ),
            "reassigned-member.ts": "\n".join(
                (
                    'const endpoints = {pool: "/v2/messages/number_pool"};',
                    'endpoints.pool = "/v2/messages";',
                    "axios.post(endpoints.pool, {from, to, text});",
                )
            ),
            "reassigned-bracket-member.js": "\n".join(
                (
                    'const endpoints = {pool: "/v2/messages/number_pool"};',
                    'endpoints["pool"] = "/v2/messages";',
                    'fetch(endpoints["pool"], {method: "POST", body: payload});',
                )
            ),
        }
        self.assert_required_profile_passes(fixtures)

    def test_rest_endpoint_object_member_aliases_preserve_required_path(self) -> None:
        fixtures = {
            "dot-member.ts": "\n".join(
                (
                    'const endpoints = {pool: "/v2/messages/number_pool"};',
                    "axios.post(endpoints.pool, {from, to, text});",
                )
            ),
            "bracket-member.js": "\n".join(
                (
                    'const endpoints = {"pool": "/v2/messages/number_pool"};',
                    'fetch(endpoints["pool"], {method: "POST", body: JSON.stringify({from, to, text})});',
                )
            ),
            "nested-member.tsx": "\n".join(
                (
                    "const routes = {messages: {",
                    '  pool: "/v2/messages/number_pool",',
                    "}};",
                    "const endpoint = routes.messages.pool;",
                    "axios.post(endpoint, {from, to, text});",
                )
            ),
            "destructured-member.ts": "\n".join(
                (
                    'const endpoints = {pool: "/v2/messages/number_pool"};',
                    "const {pool: endpoint} = endpoints;",
                    "axios.post(endpoint, {from, to, text});",
                )
            ),
            "requests-method-first.py": "\n".join(
                (
                    'endpoints = {"pool": "/v2/messages/number_pool"}',
                    'requests.request("POST", endpoints["pool"], json={"text": text})',
                )
            ),
            "request-method-first.ts": "\n".join(
                (
                    'const endpoints = {pool: "/v2/messages/number_pool"};',
                    'request("POST", endpoints.pool, {text});',
                )
            ),
            "ky-member.ts": "\n".join(
                (
                    'const endpoints = {pool: "/v2/messages/number_pool"};',
                    'ky.post(endpoints.pool, {json: {text}});',
                )
            ),
            "axios-request-member.ts": "\n".join(
                (
                    'const endpoints = {pool: "/v2/messages/number_pool"};',
                    'axios.request({method: "post", url: endpoints.pool, data: {text}});',
                )
            ),
            "assigned-member.ts": "\n".join(
                (
                    "const endpoints = {};",
                    'endpoints.pool = "/v2/messages/number_pool";',
                    "axios.post(endpoints.pool, {text});",
                )
            ),
            "assigned-bracket-member.js": "\n".join(
                (
                    "const endpoints = {};",
                    'endpoints["pool"] = "/v2/messages/number_pool";',
                    'fetch(endpoints["pool"], {method: "POST", body: payload});',
                )
            ),
            "sibling-scope-does-not-shadow.ts": "\n".join(
                (
                    'const endpoints = {pool: "/v2/messages/number_pool"};',
                    "function unrelated() {",
                    '  const endpoints = {pool: "/v2/messages"};',
                    "  return endpoints.pool;",
                    "}",
                    "axios.post(endpoints.pool, {text});",
                )
            ),
        }
        _, payload = self.run_messaging_linter(fixtures)
        for fixture_name in fixtures:
            self.assert_required_profile_detected(payload, fixture_name)

    def test_rest_endpoint_resolution_exhaustive_finite_grammar(self) -> None:
        """Exhaust the declared bounded endpoint-reference grammar.

        The oracle covers static map/array identity, aliases and request
        signatures in every supported suffix, lexical shadowing, JS/TS
        destructuring and template aliases, and fail-closed dynamic keys.
        It intentionally excludes computed expressions and interprocedural
        data flow: those remain outside this non-parser's finite grammar.
        """

        namespace = runpy.run_path(
            str(MESSAGING_SOURCE_ANALYZER),
            run_name="telnyx_endpoint_resolution_contract",
        )
        analyze_file = namespace["analyze_file"]
        suffixes = (
            ".cjs",
            ".cs",
            ".cts",
            ".go",
            ".java",
            ".js",
            ".jsx",
            ".mjs",
            ".mts",
            ".php",
            ".py",
            ".rb",
            ".sh",
            ".ts",
            ".tsx",
        )
        javascript_suffixes = (
            ".cjs",
            ".cts",
            ".js",
            ".jsx",
            ".mjs",
            ".mts",
            ".ts",
            ".tsx",
        )
        inline_suffixes = tuple(
            suffix for suffix in suffixes if suffix != ".sh"
        )
        routes = ("number_pool", "alphanumeric_sender_id")
        normal_url = "https://api.telnyx.com/v2/messages"
        counts = {
            "static": 0,
            "container_source": 0,
            "inline": 0,
            "scope": 0,
            "mutation_scope": 0,
            "destructuring": 0,
            "dynamic": 0,
            "template": 0,
        }

        def quoted(value: str, quote: str = '"') -> str:
            return f"{quote}{value}{quote}"

        def static_container(
            suffix: str,
            name: str,
            shape: str,
            values: tuple[str, str],
            selected: int,
            alternate: bool,
        ) -> tuple[str, str]:
            rendered = tuple(quoted(value) for value in values)
            key = ("first", "second")[selected]
            if suffix in javascript_suffixes:
                if shape == "keyed" and alternate:
                    literal = (
                        f'{{["first"]: {rendered[0]}, '
                        f'["second"]: {rendered[1]}}}'
                    )
                    member = f'{name}?.["{key}"]'
                elif shape == "keyed":
                    literal = (
                        f"{{first: {rendered[0]}, second: {rendered[1]}}}"
                    )
                    member = f"{name}.{key}"
                else:
                    literal = f"[{rendered[0]}, {rendered[1]}]"
                    member = f"{name}[{selected}]"
                return f"const {name} = {literal};", member
            if suffix == ".py":
                quote = '"' if alternate else "'"
                rendered = tuple(quoted(value, quote) for value in values)
                if shape == "keyed":
                    literal = (
                        f"{{{quote}first{quote}: {rendered[0]}, "
                        f"{quote}second{quote}: {rendered[1]}}}"
                    )
                    member = f"{name}[{quote}{key}{quote}]"
                else:
                    literal = f"[{rendered[0]}, {rendered[1]}]"
                    member = f"{name}[{selected}]"
                return f"{name} = {literal}", member
            if suffix == ".rb":
                if shape == "keyed" and alternate:
                    literal = (
                        f'{{"first" => {rendered[0]}, '
                        f'"second" => {rendered[1]}}}'
                    )
                    member = f'{name}["{key}"]'
                elif shape == "keyed":
                    literal = (
                        f"{{first: {rendered[0]}, second: {rendered[1]}}}"
                    )
                    member = f"{name}[:{key}]"
                else:
                    literal = f"[{rendered[0]}, {rendered[1]}]"
                    member = f"{name}[{selected}]"
                return f"{name} = {literal}", member
            if suffix == ".php":
                items = (
                    f'"first" => {rendered[0]}, '
                    f'"second" => {rendered[1]}'
                    if shape == "keyed"
                    else f"{rendered[0]}, {rendered[1]}"
                )
                literal = f"array({items})" if alternate else f"[{items}]"
                member = (
                    f'${name}["{key}"]'
                    if shape == "keyed"
                    else f"${name}[{selected}]"
                )
                return f"${name} = {literal};", member
            if suffix == ".java":
                if shape == "keyed":
                    literal = (
                        f'Map.of("first", {rendered[0]}, '
                        f'"second", {rendered[1]})'
                    )
                    member = f'{name}.get("{key}")'
                elif alternate:
                    literal = f"List.of({rendered[0]}, {rendered[1]})"
                    member = f"{name}.get({selected})"
                else:
                    literal = (
                        f"new String[] {{{rendered[0]}, {rendered[1]}}}"
                    )
                    member = f"{name}[{selected}]"
                return f"var {name} = {literal};", member
            if suffix == ".cs":
                if shape == "keyed":
                    literal = (
                        "new Dictionary<string, string> "
                        f'{{["first"] = {rendered[0]}, '
                        f'["second"] = {rendered[1]}}}'
                    )
                    member = f'{name}["{key}"]'
                elif alternate:
                    literal = (
                        f"new List<string> {{{rendered[0]}, {rendered[1]}}}"
                    )
                    member = f"{name}[{selected}]"
                else:
                    literal = f"new[] {{{rendered[0]}, {rendered[1]}}}"
                    member = f"{name}[{selected}]"
                return f"var {name} = {literal};", member
            if suffix == ".go":
                quote = "`" if alternate else '"'
                rendered = tuple(quoted(value, quote) for value in values)
                if shape == "keyed":
                    literal = (
                        f"map[string]string{{{quote}first{quote}: {rendered[0]}, "
                        f"{quote}second{quote}: {rendered[1]}}}"
                    )
                    member = f"{name}[{quote}{key}{quote}]"
                else:
                    kind = "[2]string" if alternate else "[]string"
                    literal = f"{kind}{{{rendered[0]}, {rendered[1]}}}"
                    member = f"{name}[{selected}]"
                return f"{name} := {literal}", member
            if suffix == ".sh":
                if shape == "keyed":
                    first_key = '["first"]' if alternate else "[first]"
                    second_key = '["second"]' if alternate else "[second]"
                    literal = (
                        f"declare -A {name}=({first_key}={rendered[0]} "
                        f"{second_key}={rendered[1]})"
                    )
                    access_key = f'"{key}"' if alternate else key
                    member = f'"${{{name}[{access_key}]}}"'
                else:
                    prefix = "declare -a " if alternate else ""
                    literal = (
                        f"{prefix}{name}=({rendered[0]} {rendered[1]})"
                    )
                    member = f'"${{{name}[{selected}]}}"'
                return literal, member
            raise AssertionError(f"unsupported suffix: {suffix}")

        def alias_assignment(
            suffix: str, name: str, expression: str
        ) -> tuple[str, str]:
            if suffix in javascript_suffixes:
                return f"const {name} = {expression};", name
            if suffix in {".java", ".cs"}:
                return f"var {name} = {expression};", name
            if suffix == ".go":
                return f"{name} := {expression}", name
            if suffix == ".php":
                return f"${name} = {expression};", f"${name}"
            if suffix == ".sh":
                return f'{name}={expression}', f'"${name}"'
            return f"{name} = {expression}", name

        def scalar_endpoint_source(
            suffix: str, name: str, value: str
        ) -> tuple[str, str]:
            if suffix in javascript_suffixes:
                return f'const {name} = "{value}";', name
            if suffix in {".java", ".cs"}:
                return f'var {name} = "{value}";', name
            if suffix == ".go":
                return f'{name} := "{value}"', name
            if suffix == ".php":
                return f'${name} = "{value}";', f"${name}"
            if suffix == ".sh":
                return f'{name}="{value}"', f'"${name}"'
            return f'{name} = "{value}"', name

        def member_source_assignment(
            suffix: str,
            root: str,
            shape: str,
            slot: int,
            source: str,
        ) -> str:
            key = ("first", "second")[slot]
            if suffix in javascript_suffixes:
                target = f"{root}.{key}" if shape == "keyed" else f"{root}[{slot}]"
                return f"{target} = {source};"
            if suffix == ".py":
                target = f'{root}["{key}"]' if shape == "keyed" else f"{root}[{slot}]"
                return f"{target} = {source}"
            if suffix == ".rb":
                target = f"{root}[:{key}]" if shape == "keyed" else f"{root}[{slot}]"
                return f"{target} = {source}"
            if suffix == ".php":
                target = f'${root}["{key}"]' if shape == "keyed" else f"${root}[{slot}]"
                return f"{target} = {source};"
            if suffix == ".java" and shape == "keyed":
                return f'{root}.put("{key}", {source});'
            if suffix == ".sh":
                target = f"{root}[{key}]" if shape == "keyed" else f"{root}[{slot}]"
                return f"{target}={source}"
            target = f'{root}["{key}"]' if shape == "keyed" else f"{root}[{slot}]"
            terminator = ";" if suffix in {".cs", ".java"} else ""
            return f"{target} = {source}{terminator}"

        def bare_root_mutation(suffix: str, declaration: str) -> str:
            if suffix in javascript_suffixes:
                return re.sub(r"^(?:const|let|var)\s+", "", declaration)
            if suffix in {".java", ".cs"}:
                return re.sub(r"^var\s+", "", declaration)
            if suffix == ".go":
                return declaration.replace(":=", "=", 1)
            raise AssertionError(f"unsupported mutation suffix: {suffix}")

        def inline_container_expression(
            suffix: str,
            root: str,
            assignment: str,
            member: str,
        ) -> str:
            separator = ":=" if suffix == ".go" else "="
            literal = assignment.split(separator, 1)[1].strip()
            if literal.endswith(";"):
                literal = literal[:-1]
            marker = f"${root}" if suffix == ".php" else root
            self.assertTrue(member.startswith(marker))
            return f"({literal}){member[len(marker):]}"

        def request_call(
            suffix: str, expression: str, signature: str
        ) -> str:
            if signature == "method_first":
                if suffix == ".sh":
                    return f"curl --request POST {expression} -d '{{}}'"
                return f'request("POST", {expression}, {{}});'
            if suffix in javascript_suffixes:
                return f"fetch({expression}, {{method: \"POST\", body: \"{{}}\"}});"
            if suffix == ".py":
                return f"requests.post({expression}, json={{}})"
            if suffix == ".rb":
                return f"client.post({expression}, {{}})"
            if suffix == ".php":
                return f"$client->post({expression}, []);"
            if suffix == ".java":
                return f"client.post({expression}, payload);"
            if suffix == ".cs":
                return f"client.PostAsync({expression}, payload);"
            if suffix == ".go":
                return f'http.Post({expression}, "application/json", body)'
            if suffix == ".sh":
                return f"curl {expression} -d '{{}}'"
            raise AssertionError(f"unsupported suffix: {suffix}")

        def scoped_function(
            suffix: str, name: str, body: list[tuple[str, bool]]
        ) -> list[tuple[str, bool]]:
            if suffix == ".py":
                return [(f"def {name}():", False)] + [
                    (f"    {line}", expected) for line, expected in body
                ]
            if suffix == ".rb":
                return [(f"def {name}", False)] + [
                    (f"  {line}", expected) for line, expected in body
                ] + [("end", False)]
            opener = (
                f"func {name}() {{"
                if suffix == ".go"
                else f"function {name}() {{"
                if suffix in javascript_suffixes or suffix in {".php", ".sh"}
                else f"void {name}() {{"
            )
            return [(opener, False)] + [
                (f"  {line}", expected) for line, expected in body
            ] + [("}", False)]

        def run_batch(
            temp_root: Path,
            category: str,
            suffix: str,
            cases: list[list[tuple[str, bool]]],
        ) -> None:
            # Small batches keep this binding-aware lexical oracle fast: the
            # analyzer intentionally compares every required literal with
            # later request calls in the same file.
            batch_size = 8
            for batch_start in range(0, len(cases), batch_size):
                lines: list[str] = []
                expected_lines: set[int] = set()
                batch = cases[batch_start:batch_start + batch_size]
                for case in batch:
                    counts[category] += 1
                    for line, expected in case:
                        lines.append(line)
                        if expected:
                            expected_lines.add(len(lines))
                    lines.append("")
                fixture = temp_root / (
                    f"{category}-matrix-{batch_start // batch_size}{suffix}"
                )
                fixture.write_text("\n".join(lines), encoding="utf-8")
                count, details = analyze_file(fixture, temp_root)
                prefix = f"{fixture}:"
                actual_lines = {
                    int(detail[len(prefix):].split(":", 1)[0])
                    for detail in details
                    if detail.startswith(prefix)
                }
                self.assertEqual(
                    expected_lines,
                    actual_lines,
                    f"{category}{suffix} endpoint-oracle mismatch",
                )
                self.assertEqual(len(actual_lines), count)
                self.assertEqual(len(actual_lines), len(details))

        with tempfile.TemporaryDirectory(
            prefix="telnyx-endpoint-grammar-"
        ) as temp_dir:
            temp_root = Path(temp_dir)

            for suffix in suffixes:
                cases = []
                case_id = 0
                for route in routes:
                    required_url = (
                        f"https://api.telnyx.com/v2/messages/{route}"
                    )
                    for shape in ("keyed", "indexed"):
                        for required_slot in (0, 1):
                            values = [normal_url, normal_url]
                            values[required_slot] = required_url
                            for selected_required in (False, True):
                                selected = (
                                    required_slot
                                    if selected_required
                                    else 1 - required_slot
                                )
                                for access in ("direct", "alias"):
                                    for signature in ("native", "method_first"):
                                        case_id += 1
                                        root = f"routes_static_{case_id}"
                                        assignment, expression = static_container(
                                            suffix,
                                            root,
                                            shape,
                                            tuple(values),
                                            selected,
                                            access == "alias",
                                        )
                                        rendered = [(assignment, False)]
                                        if access == "alias":
                                            alias, expression = alias_assignment(
                                                suffix,
                                                f"url_static_{case_id}",
                                                expression,
                                            )
                                            rendered.append((alias, False))
                                        rendered.append(
                                            (
                                                request_call(
                                                    suffix, expression, signature
                                                ),
                                                selected_required,
                                            )
                                        )
                                        cases.append(rendered)
                run_batch(temp_root, "static", suffix, cases)

            for suffix in suffixes:
                cases = []
                case_id = 0
                for route in routes:
                    required_url = (
                        f"https://api.telnyx.com/v2/messages/{route}"
                    )
                    for shape in ("keyed", "indexed"):
                        for required_slot in (0, 1):
                            for selected_required in (False, True):
                                selected = (
                                    required_slot
                                    if selected_required
                                    else 1 - required_slot
                                )
                                for source_style in ("literal", "member"):
                                    for signature in ("native", "method_first"):
                                        case_id += 1
                                        root = f"routes_source_{case_id}"
                                        source_name = f"required_source_{case_id}"
                                        source_line, source_ref = scalar_endpoint_source(
                                            suffix, source_name, required_url
                                        )
                                        if source_style == "literal":
                                            values = [normal_url, normal_url]
                                            values[required_slot] = required_url
                                            assignment, expression = static_container(
                                                suffix,
                                                root,
                                                shape,
                                                tuple(values),
                                                selected,
                                                False,
                                            )
                                            assignment = re.sub(
                                                rf'(["\'`]){re.escape(required_url)}\1',
                                                source_ref,
                                                assignment,
                                                count=1,
                                            )
                                            rendered = [
                                                (source_line, False),
                                                (assignment, False),
                                            ]
                                        else:
                                            assignment, expression = static_container(
                                                suffix,
                                                root,
                                                shape,
                                                (normal_url, normal_url),
                                                selected,
                                                False,
                                            )
                                            rendered = [
                                                (source_line, False),
                                                (assignment, False),
                                                (
                                                    member_source_assignment(
                                                        suffix,
                                                        root,
                                                        shape,
                                                        required_slot,
                                                        source_ref,
                                                    ),
                                                    False,
                                                ),
                                            ]
                                        rendered.append(
                                            (
                                                request_call(
                                                    suffix, expression, signature
                                                ),
                                                selected_required,
                                            )
                                        )
                                        cases.append(rendered)
                run_batch(
                    temp_root, "container_source", suffix, cases
                )

            for suffix in inline_suffixes:
                cases = []
                case_id = 0
                for route in routes:
                    required_url = (
                        f"https://api.telnyx.com/v2/messages/{route}"
                    )
                    for shape in ("keyed", "indexed"):
                        for selected_required in (False, True):
                            for alternate in (False, True):
                                for signature in ("native", "method_first"):
                                    case_id += 1
                                    root = f"routes_inline_{case_id}"
                                    selected = 0 if selected_required else 1
                                    assignment, member = static_container(
                                        suffix,
                                        root,
                                        shape,
                                        (required_url, normal_url),
                                        selected,
                                        alternate,
                                    )
                                    expression = inline_container_expression(
                                        suffix, root, assignment, member
                                    )
                                    cases.append(
                                        [
                                            (
                                                request_call(
                                                    suffix, expression, signature
                                                ),
                                                selected_required,
                                            )
                                        ]
                                    )
                run_batch(temp_root, "inline", suffix, cases)

            scope_states = (
                "sibling_shadow",
                "active_shadow",
                "inner_required",
                "same_scope_reassignment",
            )
            for suffix in suffixes:
                cases = []
                case_id = 0
                for route in routes:
                    required_url = (
                        f"https://api.telnyx.com/v2/messages/{route}"
                    )
                    for shape in ("keyed", "indexed"):
                        for state in scope_states:
                            case_id += 1
                            root = f"routes_scope_{case_id}"
                            outer_required, outer_expression = static_container(
                                suffix,
                                root,
                                shape,
                                (required_url, normal_url),
                                0,
                                False,
                            )
                            outer_normal, _ = static_container(
                                suffix,
                                root,
                                shape,
                                (normal_url, normal_url),
                                0,
                                False,
                            )
                            inner_required, inner_expression = static_container(
                                suffix,
                                root,
                                shape,
                                (required_url, normal_url),
                                0,
                                False,
                            )
                            inner_normal, _ = static_container(
                                suffix,
                                root,
                                shape,
                                (normal_url, normal_url),
                                0,
                                False,
                            )
                            call = request_call(
                                suffix, outer_expression, "native"
                            )
                            function_name = f"scope_case_{case_id}"
                            if state == "sibling_shadow":
                                rendered = [(outer_required, False)]
                                rendered.extend(
                                    scoped_function(
                                        suffix,
                                        function_name,
                                        [(inner_normal, False), (call, False)],
                                    )
                                )
                                rendered.append((call, True))
                            elif state == "active_shadow":
                                rendered = [(outer_required, False)]
                                rendered.extend(
                                    scoped_function(
                                        suffix,
                                        function_name,
                                        [(inner_normal, False), (call, False)],
                                    )
                                )
                            elif state == "inner_required":
                                rendered = [(outer_normal, False)]
                                rendered.extend(
                                    scoped_function(
                                        suffix,
                                        function_name,
                                        [
                                            (inner_required, False),
                                            (
                                                request_call(
                                                    suffix,
                                                    inner_expression,
                                                    "native",
                                                ),
                                                True,
                                            ),
                                        ],
                                    )
                                )
                            else:
                                rendered = [
                                    (outer_required, False),
                                    (outer_normal, False),
                                    (call, False),
                                ]
                            cases.append(rendered)
                run_batch(temp_root, "scope", suffix, cases)

            for suffix in (".js", ".java", ".go"):
                cases = []
                case_id = 0
                for route in routes:
                    required_url = (
                        f"https://api.telnyx.com/v2/messages/{route}"
                    )
                    for shape in ("keyed", "indexed"):
                        for inner_required in (False, True):
                            for mutation_kind in ("root", "member"):
                                case_id += 1
                                root = f"routes_mutation_{case_id}"
                                outer_url = (
                                    normal_url if inner_required else required_url
                                )
                                inner_url = (
                                    required_url if inner_required else normal_url
                                )
                                outer, expression = static_container(
                                    suffix,
                                    root,
                                    shape,
                                    (outer_url, normal_url),
                                    0,
                                    False,
                                )
                                rendered = [(outer, False)]
                                if mutation_kind == "root":
                                    inner, _ = static_container(
                                        suffix,
                                        root,
                                        shape,
                                        (inner_url, normal_url),
                                        0,
                                        False,
                                    )
                                    mutation = bare_root_mutation(suffix, inner)
                                else:
                                    source_line, source_ref = scalar_endpoint_source(
                                        suffix,
                                        f"inner_source_{case_id}",
                                        inner_url,
                                    )
                                    rendered.append((source_line, False))
                                    mutation = member_source_assignment(
                                        suffix,
                                        root,
                                        shape,
                                        0,
                                        source_ref,
                                    )
                                rendered.append((f"{{ {mutation} }}", False))
                                rendered.append(
                                    (
                                        request_call(
                                            suffix, expression, "native"
                                        ),
                                        inner_required,
                                    )
                                )
                                cases.append(rendered)
                run_batch(
                    temp_root, "mutation_scope", suffix, cases
                )

            for suffix in javascript_suffixes:
                cases = []
                case_id = 0
                for route in routes:
                    required_url = (
                        f"https://api.telnyx.com/v2/messages/{route}"
                    )
                    for shape in ("object", "array"):
                        for nested in (False, True):
                            for binding_style in ("direct", "renamed"):
                                for selected_required in (False, True):
                                    for signature in ("native", "method_first"):
                                        case_id += 1
                                        root = f"routes_destructure_{case_id}"
                                        endpoint = f"endpoint_{case_id}"
                                        required_key = f"required_{case_id}"
                                        normal_key = f"normal_{case_id}"
                                        selected_key = (
                                            required_key
                                            if selected_required
                                            else normal_key
                                        )
                                        if shape == "object":
                                            members = (
                                                f"{required_key}: "
                                                f'"{required_url}", '
                                                f"{normal_key}: "
                                                f'"{normal_url}"'
                                            )
                                            literal = (
                                                f"{{nested: {{{members}}}}}"
                                                if nested
                                                else f"{{{members}}}"
                                            )
                                            if binding_style == "direct":
                                                leaf = selected_key
                                                expression = selected_key
                                            else:
                                                leaf = (
                                                    f"{selected_key}: {endpoint}"
                                                )
                                                expression = endpoint
                                            pattern = (
                                                f"{{nested: {{{leaf}}}}}"
                                                if nested
                                                else f"{{{leaf}}}"
                                            )
                                            rendered = [
                                                (
                                                    f"const {root} = {literal};",
                                                    False,
                                                ),
                                                (
                                                    f"const {pattern} = {root};",
                                                    False,
                                                ),
                                            ]
                                        else:
                                            literal = (
                                                f'[["{required_url}"], '
                                                f'["{normal_url}"]]'
                                                if nested
                                                else (
                                                    f'["{required_url}", '
                                                    f'"{normal_url}"]'
                                                )
                                            )
                                            selected = 0 if selected_required else 1
                                            chosen = (
                                                endpoint
                                                if binding_style == "direct"
                                                else f"selected_{case_id}"
                                            )
                                            other = f"unused_{case_id}"
                                            leaves = [other, other]
                                            leaves[selected] = chosen
                                            pattern = (
                                                f"[[{leaves[0]}], [{leaves[1]}]]"
                                                if nested
                                                else f"[{leaves[0]}, {leaves[1]}]"
                                            )
                                            rendered = [
                                                (
                                                    f"const {root} = {literal};",
                                                    False,
                                                ),
                                                (
                                                    f"const {pattern} = {root};",
                                                    False,
                                                ),
                                            ]
                                            expression = chosen
                                            if binding_style == "renamed":
                                                alias, expression = alias_assignment(
                                                    suffix, endpoint, chosen
                                                )
                                                rendered.append((alias, False))
                                        rendered.append(
                                            (
                                                request_call(
                                                    suffix, expression, signature
                                                ),
                                                selected_required,
                                            )
                                        )
                                        cases.append(rendered)
                run_batch(temp_root, "destructuring", suffix, cases)

            for suffix in suffixes:
                cases = []
                case_id = 0
                for route in routes:
                    required_url = (
                        f"https://api.telnyx.com/v2/messages/{route}"
                    )
                    for shape in ("keyed", "indexed"):
                        for signature in ("native", "method_first"):
                            case_id += 1
                            root = f"routes_dynamic_{case_id}"
                            key = f"dynamic_key_{case_id}"
                            assignment, static_member = static_container(
                                suffix,
                                root,
                                shape,
                                (required_url, normal_url),
                                0,
                                False,
                            )
                            if suffix == ".php":
                                key_assignment = f"${key} = $runtime_key;"
                                expression = f"${root}[${key}]"
                            elif suffix == ".sh":
                                key_assignment = f'{key}="$RUNTIME_KEY"'
                                expression = f'"${{{root}[${key}]}}"'
                            elif suffix == ".java" and shape == "keyed":
                                key_assignment = f"var {key} = runtimeKey;"
                                expression = f"{root}.get({key})"
                            elif suffix in {".java", ".cs"}:
                                key_assignment = f"var {key} = runtimeKey;"
                                expression = f"{root}[{key}]"
                            elif suffix == ".go":
                                key_assignment = f"{key} := runtimeKey"
                                expression = f"{root}[{key}]"
                            else:
                                prefix = "const " if suffix in javascript_suffixes else ""
                                key_assignment = f"{prefix}{key} = runtime_key"
                                key_assignment += ";" if prefix else ""
                                expression = f"{root}[{key}]"
                            cases.append(
                                [
                                    (assignment, False),
                                    (key_assignment, False),
                                    (
                                        request_call(
                                            suffix, expression, signature
                                        ),
                                        False,
                                    ),
                                ]
                            )
                            if suffix != ".sh":
                                inline_expression = inline_container_expression(
                                    suffix, root, assignment, static_member
                                )
                                dynamic_key = (
                                    f"${key}" if suffix == ".php" else key
                                )
                                if suffix == ".java" and shape == "keyed":
                                    inline_expression = re.sub(
                                        r"\.get\([^)]*\)$",
                                        f".get({dynamic_key})",
                                        inline_expression,
                                    )
                                else:
                                    inline_expression, replacements = re.subn(
                                        r"\[[^][]+\]$",
                                        f"[{dynamic_key}]",
                                        inline_expression,
                                    )
                                    if replacements == 0:
                                        inline_expression = re.sub(
                                            r"\.[A-Za-z_]\w*$",
                                            f"[{dynamic_key}]",
                                            inline_expression,
                                        )
                                cases.append(
                                    [
                                        (key_assignment, False),
                                        (
                                            request_call(
                                                suffix,
                                                inline_expression,
                                                signature,
                                            ),
                                            False,
                                        ),
                                    ]
                                )
                run_batch(temp_root, "dynamic", suffix, cases)

            for suffix in javascript_suffixes:
                cases = []
                case_id = 0
                for route in routes:
                    required_url = (
                        f"https://api.telnyx.com/v2/messages/{route}"
                    )
                    for shape in ("keyed", "indexed"):
                        for signature in ("native", "method_first"):
                            case_id += 1
                            root = f"routes_template_{case_id}"
                            url = f"url_template_{case_id}"
                            assignment, expression = static_container(
                                suffix,
                                root,
                                shape,
                                (required_url, normal_url),
                                0,
                                False,
                            )
                            cases.append(
                                [
                                    (assignment, False),
                                    (f"const {url} = `${{{expression}}}`;", False),
                                    (
                                        request_call(suffix, url, signature),
                                        True,
                                    ),
                                ]
                            )
                run_batch(temp_root, "template", suffix, cases)

        # Derived from the suffix tuples rather than written as literals: the
        # leading factor is "how many languages this category enumerates", so
        # hardcoding it meant widening a tuple failed here for arithmetic
        # reasons and hid whether coverage had actually grown. mutation_scope
        # keeps its own literal because it enumerates its own three suffixes.
        all_suffixes = len(suffixes)
        inline_only = len(inline_suffixes)
        js_only = len(javascript_suffixes)
        self.assertEqual(
            {
                "static": all_suffixes * 2 * 2 * 2 * 2 * 2 * 2,
                "container_source": all_suffixes * 2 * 2 * 2 * 2 * 2 * 2,
                "inline": inline_only * 2 * 2 * 2 * 2 * 2,
                "scope": all_suffixes * 2 * 2 * 4,
                "mutation_scope": 3 * 2 * 2 * 2 * 2,
                "destructuring": js_only * 2 * 2 * 2 * 2 * 2 * 2,
                "dynamic": (all_suffixes * 2 * 2 * 2) + (inline_only * 2 * 2 * 2),
                "template": js_only * 2 * 2 * 2,
            },
            counts,
        )
        # Grew from 2,408 when the JS module extensions joined the matrix.
        self.assertEqual(3_464, sum(counts.values()))

    def test_c_function_header_index_is_declaration_first(self) -> None:
        namespace = runpy.run_path(
            str(MESSAGING_SOURCE_ANALYZER),
            run_name="telnyx_function_header_contract",
        )
        lex_source = namespace["lex_source"]
        c_function_headers = namespace["c_function_headers"]

        rejected = {
            ".java": [
                "Object x = new Runnable(callback()) { };",
                "synchronized(lock) { work(); }",
                "try(resource) { work(); }",
                "if ready(path) { work(); }",
            ],
            ".cs": [
                "var x = new Widget(callback()) { Value = 1 };",
                "using(resource) { Work(); }",
                "lock(gate) { Work(); }",
            ],
            ".js": ["class X extends mixin(Base) { }"],
        }
        for suffix, sources in rejected.items():
            for source in sources:
                with self.subTest(suffix=suffix, source=source):
                    lexed = lex_source(source, suffix)
                    self.assertEqual({}, c_function_headers(lexed, suffix))

        accepted = {
            (".cs", "class C { C(string path) { } }"): ["string path"],
            (
                ".cs",
                "class C { C(string path) : base(transform(path)) { } }",
            ): ["string path"],
            (
                ".php",
                "$fn = function($path) use ($client) { return $path; };",
            ): ["$path"],
            (".js", "foo(); path => { use(path); };"): ["path"],
            (
                ".go",
                "func send(path string) error { return nil }",
            ): ["path string"],
            (
                ".go",
                "func send(path string) (error, int) { return nil, 0 }",
            ): ["path string"],
            (
                ".java",
                "void send(String path) throws IOException { use(path); }",
            ): ["String path"],
            (
                ".ts",
                "send(path: string): Promise<void> { use(path); }",
            ): ["path: string"],
            (
                ".js",
                "const handlers = { send(path) { use(path); } };",
            ): ["path"],
            (
                ".java",
                "Object x = new Runnable(callback()) { public void run() { } };",
            ): [""],
        }
        for (suffix, source), expected in accepted.items():
            with self.subTest(suffix=suffix, source=source):
                lexed = lex_source(source, suffix)
                headers = c_function_headers(lexed, suffix)
                parameters = [
                    source[start:end].strip()
                    for start, end in headers.values()
                ]
                self.assertEqual(expected, parameters)

    def test_indexed_endpoint_resolver_closes_cross_dimension_regressions(
        self,
    ) -> None:
        required = "/v2/messages/number_pool"
        detected = {
            "container-source.js": (
                f'const required = "{required}";\n'
                "const routes = {pool: required};\n"
                "axios.post(routes.pool, {});"
            ),
            "array-source.ts": (
                f'const required = "{required}";\n'
                "const routes = [required];\n"
                "fetch(routes[0], {method: \"POST\", body: \"{}\"});"
            ),
            "member-source.java": (
                f'var required = "{required}";\n'
                "var routes = new HashMap<String, String>();\n"
                "routes.put(\"pool\", required);\n"
                "client.post(routes.get(\"pool\"), payload);"
            ),
            "inline-source.tsx": (
                f'const required = "{required}";\n'
                "axios.post(({pool: required, normal: \"/v2/messages\"}).pool, {});"
            ),
            "live-alias-mutation.js": (
                'const routes = {pool: "/v2/messages"};\n'
                "const alias = routes;\n"
                f'routes.pool = "{required}";\n'
                "axios.post(alias.pool, {});"
            ),
            "reverse-alias-mutation.js": (
                'const routes = {pool: "/v2/messages"};\n'
                "const alias = routes;\n"
                f'alias.pool = "{required}";\n'
                "axios.post(routes.pool, {});"
            ),
            "axios-config.js": (
                f'const endpoint = "{required}";\n'
                "const config = {url: endpoint, method: \"post\", data: {}};\n"
                "axios.request(config);"
            ),
            "keyword-request.py": (
                f'endpoint = "{required}"\n'
                'requests.request(method="POST", url=endpoint, json={})'
            ),
            "session-request.py": (
                f'endpoint = "{required}"\n'
                'session.request("POST", endpoint, json={})'
            ),
            "ruby-request.rb": (
                f'endpoint = "{required}"\n'
                "client.request(:post, endpoint, {})"
            ),
            "php-request.php": (
                f'$endpoint = "{required}";\n'
                '$client->request("POST", $endpoint, []);'
            ),
            "typed-destructure.ts": (
                f'const routes = {{pool: "{required}"}};\n'
                "const {pool: endpoint}: Routes = routes;\n"
                "axios.post(endpoint, {});"
            ),
            "default-destructure.js": (
                f'const fallback = "{required}";\n'
                f'const routes = {{pool: "{required}"}};\n'
                "const {pool: endpoint = fallback} = routes;\n"
                "axios.post(endpoint, {});"
            ),
            "block-mutation.js": (
                'let endpoint = "/v2/messages";\n'
                f'{{ endpoint = "{required}"; }}\n'
                "axios.post(endpoint, {});"
            ),
            "block-mutation.java": (
                'String endpoint = "/v2/messages";\n'
                f'{{ endpoint = "{required}"; }}\n'
                "client.post(endpoint, payload);"
            ),
            "block-mutation.go": (
                'endpoint := "/v2/messages"\n'
                f'{{ endpoint = "{required}" }}\n'
                'http.Post(endpoint, "application/json", body)'
            ),
            "var-function-scope.js": (
                'var endpoint = "/v2/messages";\n'
                f'{{ var endpoint = "{required}"; }}\n'
                "axios.post(endpoint, {});"
            ),
            "python-class.py": (
                f'endpoint = "{required}"\n'
                "class Routes:\n"
                '    endpoint = "/v2/messages"\n'
                "    def send(self):\n"
                "        requests.post(endpoint, json={})"
            ),
            "java-anonymous-capture.java": (
                f'String endpoint = "{required}";\n'
                "Object worker = new Runnable(callback()) {\n"
                "  public void run() { client.post(endpoint, payload); }\n"
                "};"
            ),
            "js-mixin-class-capture.js": (
                f'const endpoint = "{required}";\n'
                "class Sender extends mixin(Base) {\n"
                "  send() { axios.post(endpoint, {}); }\n"
                "}"
            ),
            "python-interpolation.py": (
                f'path = "{required}"\n'
                'url = f"https://api.telnyx.com{path}"\n'
                "requests.post(url, json={})"
            ),
            "ruby-interpolation.rb": (
                f'path = "{required}"\n'
                'url = "https://api.telnyx.com#{path}"\n'
                "client.post(url, {})"
            ),
            "shell-container.sh": (
                f'required="{required}"\n'
                'declare -A routes=([pool]="$required")\n'
                'curl "${routes[pool]}" -d \'{}\''
            ),
            "shell-indexed-unquoted.sh": (
                f'required="{required}"\n'
                "routes=($required)\n"
                'curl "${routes[0]}" -d \'{}\''
            ),
        }
        detected_items = list(detected.items())
        for batch_start in range(0, len(detected_items), 12):
            batch = dict(detected_items[batch_start:batch_start + 12])
            _, payload = self.run_messaging_linter(batch)
            for fixture_name in batch:
                with self.subTest(fixture=fixture_name):
                    self.assert_required_profile_detected(
                        payload, fixture_name
                    )

        self.assert_required_profile_passes(
            {
                "dynamic-key.js": (
                    f'const pool = "{required}";\n'
                    'const routes = {[pool]: "/v2/messages", normal: "/v2/messages"};\n'
                    "const key = runtimeKey;\n"
                    "axios.post(routes[key], {});"
                ),
                "inline-normal.js": (
                    f'const required = "{required}";\n'
                    'axios.post(({pool: required, normal: "/v2/messages"}).normal, {});'
                ),
                "live-alias-kill.js": (
                    f'const routes = {{pool: "{required}"}};\n'
                    "const alias = routes;\n"
                    'routes.pool = "/v2/messages";\n'
                    "axios.post(alias.pool, {});"
                ),
                "reverse-alias-kill.js": (
                    f'const routes = {{pool: "{required}"}};\n'
                    "const alias = routes;\n"
                    'alias.pool = "/v2/messages";\n'
                    "axios.post(routes.pool, {});"
                ),
                "unsupported-transform.js": (
                    f'const required = "{required}";\n'
                    "const endpoint = chooseEndpoint(required);\n"
                    "axios.post(endpoint, {});"
                ),
                "parameter-shadow.js": (
                    f'const endpoint = "{required}";\n'
                    "function send(endpoint) { axios.post(endpoint, {}); }"
                ),
                "parameter-shadow.py": (
                    f'endpoint = "{required}"\n'
                    "def send(endpoint):\n"
                    "    requests.post(endpoint, json={})"
                ),
                "parameter-shadow.java": (
                    f'var endpoint = "{required}";\n'
                    "void send(String endpoint) { client.post(endpoint, payload); }"
                ),
                "parameter-shadow.cs": (
                    f'var endpoint = "{required}";\n'
                    "void Send(string endpoint) { client.PostAsync(endpoint, payload); }"
                ),
                "parameter-shadow.go": (
                    f'endpoint := "{required}"\n'
                    'func send(endpoint string) { http.Post(endpoint, "application/json", body) }'
                ),
                "parameter-shadow.php": (
                    f'$endpoint = "{required}";\n'
                    "function send($endpoint) { $client->post($endpoint, []); }"
                ),
                "php-closure-capture.php": (
                    f'$endpoint = "{required}";\n'
                    "$fn = function($endpoint) use ($client) {\n"
                    "  $client->post($endpoint, []);\n"
                    "};"
                ),
                "csharp-constructor-base.cs": (
                    f'var endpoint = "{required}";\n'
                    "class Sender {\n"
                    "  Sender(string endpoint) : base(transform(endpoint)) {\n"
                    "    client.PostAsync(endpoint, payload);\n"
                    "  }\n"
                    "}"
                ),
                "go-tuple-return-parameter.go": (
                    f'endpoint := "{required}"\n'
                    "func send(endpoint string) (error, int) {\n"
                    '  http.Post(endpoint, "application/json", body)\n'
                    "  return nil, 0\n"
                    "}"
                ),
                "single-arrow-parameter.js": (
                    f'const endpoint = "{required}";\n'
                    "prepare();\n"
                    "const send = endpoint => { axios.post(endpoint, {}); };"
                ),
                "parameter-shadow.rb": (
                    f'endpoint = "{required}"\n'
                    "def send(endpoint)\n"
                    "  client.post(endpoint, {})\n"
                    "end"
                ),
                "block-parameter-shadow.rb": (
                    f'endpoint = "{required}"\n'
                    "items.each do |endpoint|\n"
                    "  client.post(endpoint, {})\n"
                    "end"
                ),
                "catch-parameter-shadow.js": (
                    f'const endpoint = "{required}";\n'
                    "try { work(); } catch (endpoint) { axios.post(endpoint, {}); }"
                ),
                "loop-binding-shadow.js": (
                    f'const endpoint = "{required}";\n'
                    "for (const endpoint of endpoints) { axios.post(endpoint, {}); }"
                ),
                "block-kill.js": (
                    f'let endpoint = "{required}";\n'
                    '{ endpoint = "/v2/messages"; }\n'
                    "axios.post(endpoint, {});"
                ),
                "mixed-default.js": (
                    f'const fallback = "{required}";\n'
                    'const routes = {pool: "/v2/messages"};\n'
                    "const {pool: endpoint = fallback} = routes;\n"
                    "axios.post(endpoint, {});"
                ),
                "python-class-safe.py": (
                    'endpoint = "/v2/messages"\n'
                    "class Routes:\n"
                    f'    endpoint = "{required}"\n'
                    "    def send(self):\n"
                    "        requests.post(endpoint, json={})"
                ),
            }
        )

    def test_endpoint_resolver_common_static_syntax_corpus(self) -> None:
        required = "/v2/messages/number_pool"
        safe = "/v2/messages"
        detected = {
            "default-existing.js": (
                f'const r = {{pool: "{required}"}};\n'
                f'const {{pool: url = "{safe}"}} = r;\n'
                "axios.post(url, {});"
            ),
            "default-missing.js": (
                "const r = {};\n"
                f'const {{pool: url = "{required}"}} = r;\n'
                "axios.post(url, {});"
            ),
            "array-default.js": (
                f'const r = ["{required}"];\n'
                f'const [url = "{safe}"] = r;\n'
                "axios.post(url, {});"
            ),
            "nested-default.js": (
                f'const r = {{messages: {{pool: "{required}"}}}};\n'
                f'const {{messages: {{pool: url = "{safe}"}}}} = r;\n'
                "axios.post(url, {});"
            ),
            "ts-inline-type.ts": (
                f'const r = {{pool: "{required}"}};\n'
                "const {pool}: {pool: string} = r;\n"
                "axios.post(pool, {});"
            ),
            "ts-rhs-as.ts": (
                f'const r = {{pool: "{required}"}};\n'
                "const {pool} = (r as Routes);\n"
                "axios.post(pool, {});"
            ),
            "ts-as-const.ts": (
                f'const r = {{pool: "{required}"}} as const;\n'
                "const {pool} = r;\n"
                "axios.post(pool, {});"
            ),
            "destructuring-assignment.js": (
                f'const r = {{pool: "{required}"}};\n'
                "let url;\n"
                "({pool: url} = r);\n"
                "axios.post(url, {});"
            ),
            "wrapper-parentheses.js": (
                f'const r = {{pool: "{required}"}};\n'
                "axios.post((r).pool, {});"
            ),
            "wrapper-nonnull.ts": (
                f'const r = {{pool: "{required}"}};\n'
                "axios.post(r!.pool, {});"
            ),
            "wrapper-as.ts": (
                f'const r = {{pool: "{required}"}};\n'
                "axios.post((r as Routes).pool, {});"
            ),
            "computed-key.js": (
                f'const r = {{pool: "{required}"}};\n'
                'const key = "pool";\n'
                "axios.post(r[key], {});"
            ),
            "computed-key.py": (
                f'r = {{"pool": "{required}"}}\n'
                'key = "pool"\n'
                "requests.post(r[key], json={})"
            ),
            "computed-key.rb": (
                f'r = {{pool: "{required}"}}\n'
                "key = :pool\n"
                "client.post(r[key], {})"
            ),
            "computed-key.sh": (
                f'declare -A r=([pool]="{required}")\n'
                "key=pool\n"
                'curl "${r[$key]}" -d \'{}\''
            ),
            "named-requests.py": (
                f'endpoint = "{required}"\n'
                "requests.post(url=endpoint, json={})"
            ),
            "named-session.py": (
                f'endpoint = "{required}"\n'
                "session.post(url=endpoint, json={})"
            ),
            "named-csharp.cs": (
                f'var endpoint = "{required}";\n'
                "client.PostAsync(requestUri: endpoint, content: payload);"
            ),
            "named-php.php": (
                f'$endpoint = "{required}";\n'
                "$client->post(uri: $endpoint, options: []);"
            ),
            "lookup-python.py": (
                f'r = {{"pool": "{required}"}}\n'
                f'requests.post(r.get("pool", "{safe}"), json={{}})'
            ),
            "lookup-ruby.rb": (
                f'r = {{pool: "{required}"}}\n'
                f'client.post(r.fetch(:pool, "{safe}"), {{}})'
            ),
            "lookup-java.java": (
                f'var r = Map.of("pool", "{required}");\n'
                f'client.post(r.getOrDefault("pool", "{safe}"), payload);'
            ),
            "lookup-csharp.cs": (
                f'var r = new Dictionary<string, string> '
                f'{{ ["pool"] = "{required}" }};\n'
                f'client.PostAsync(r.GetValueOrDefault("pool", "{safe}"), payload);'
            ),
            "lookup-missing.py": (
                "r = {}\n"
                f'requests.post(r.get("pool", "{required}"), json={{}})'
            ),
            "dig-ruby.rb": (
                f'r = {{messages: {{pool: "{required}"}}}}\n'
                "client.post(r.dig(:messages, :pool), {})"
            ),
            "interpolation-php.php": (
                '$BASE = "https://api.telnyx.com";\n'
                f'$endpoint = "{required}";\n'
                '$url = "{$BASE}{$endpoint}";\n'
                "$client->post($url, []);"
            ),
            "interpolation-csharp.cs": (
                'var BASE = "https://api.telnyx.com";\n'
                f'var endpoint = "{required}";\n'
                'var url = $"{BASE}{endpoint}";\n'
                "client.PostAsync(url, payload);"
            ),
            "interpolation-format.py": (
                'BASE = "https://api.telnyx.com"\n'
                f'endpoint = "{required}"\n'
                'url = "{}{}".format(BASE, endpoint)\n'
                "requests.post(url, json={})"
            ),
        }
        split_literals = {
            ".js": "axios.post(PATH, {});",
            ".ts": "axios.post(PATH, {});",
            ".py": "requests.post(PATH, json={})",
            ".rb": "client.post(PATH, {})",
            ".java": "client.post(PATH, payload);",
            ".cs": "client.PostAsync(PATH, payload);",
            ".go": 'http.Post(PATH, "application/json", body)',
        }
        for suffix, call in split_literals.items():
            detected[f"split-literal{suffix}"] = call.replace(
                "PATH", '"/v2/messages/" + "number_pool"'
            )

        safe_cases = {
            "lambda-shadow.js": (
                f'const endpoint = "{required}";\n'
                f'["{safe}"].forEach(endpoint => axios.post(endpoint, {{}}));'
            ),
            "lambda-shadow.java": (
                f'String endpoint = "{required}";\n'
                "items.forEach(endpoint -> client.post(endpoint, payload));"
            ),
            "lambda-shadow.cs": (
                f'var endpoint = "{required}";\n'
                "items.ForEach(endpoint => client.PostAsync(endpoint, payload));"
            ),
            "runtime-key.js": (
                f'const r = {{pool: "{required}"}};\n'
                "const key = runtimeKey();\n"
                "axios.post(r[key], {});"
            ),
            "runtime-key.py": (
                f'r = {{"pool": "{required}"}}\n'
                "key = runtime_key()\n"
                "requests.post(r[key], json={})"
            ),
            "runtime-key.rb": (
                f'r = {{pool: "{required}"}}\n'
                "key = runtime_key()\n"
                "client.post(r[key], {})"
            ),
            "runtime-key.sh": (
                f'declare -A r=([pool]="{required}")\n'
                'key="$RUNTIME_KEY"\n'
                'curl "${r[$key]}" -d \'{}\''
            ),
            "bash-bare-shorthand.sh": (
                f'r=("{required}")\n'
                'curl "$r" -d \'{}\''
            ),
            "negative-index.js": (
                f'const r = ["{required}"];\n'
                "axios.post(r[-1], {});"
            ),
            "spread-only.js": (
                "const r = {...runtimeRoutes};\n"
                "axios.post(r.pool, {});"
            ),
            "loop-result.js": (
                "let endpoint;\n"
                "for (endpoint of endpoints) { consume(endpoint); }\n"
                "axios.post(endpoint, {});"
            ),
            "uri-builder.js": (
                f'const endpoint = new URL("{required}", base);\n'
                "axios.post(endpoint, {});"
            ),
            "runtime-concat.js": (
                'const endpoint = "/v2/messages/" + runtimeSuffix;\n'
                "axios.post(endpoint, {});"
            ),
            "runtime-primary-default.js": (
                "const r = runtimeRoutes;\n"
                f'const {{pool: endpoint = "{required}"}} = r;\n'
                "axios.post(endpoint, {});"
            ),
        }

        detected_items = list(detected.items())
        for batch_start in range(0, len(detected_items), 12):
            batch = dict(detected_items[batch_start:batch_start + 12])
            _, payload = self.run_messaging_linter(batch)
            for fixture_name in batch:
                with self.subTest(fixture=fixture_name):
                    self.assert_required_profile_detected(
                        payload, fixture_name
                    )
        self.assert_required_profile_passes(safe_cases)
        self.assertEqual(49, len(detected) + len(safe_cases))

    def test_indexed_endpoint_resolver_is_iterative_and_call_linear(self) -> None:
        namespace = runpy.run_path(
            str(MESSAGING_SOURCE_ANALYZER),
            run_name="telnyx_endpoint_scaling_contract",
        )
        analyze_file = namespace["analyze_file"]
        with tempfile.TemporaryDirectory(
            prefix="telnyx-endpoint-scaling-"
        ) as temp_dir:
            temp_root = Path(temp_dir)
            chain = temp_root / "chain.js"
            chain_lines = [
                'const endpoint_0 = "/v2/messages/number_pool";'
            ]
            chain_lines.extend(
                f"const endpoint_{index} = endpoint_{index - 1};"
                for index in range(1, 2_001)
            )
            chain_lines.append("axios.post(endpoint_2000, {});")
            chain.write_text("\n".join(chain_lines), encoding="utf-8")
            self.assertEqual(1, analyze_file(chain, temp_root)[0])

            cycle = temp_root / "cycle.js"
            cycle.write_text(
                "\n".join(
                    (
                        'let required = "/v2/messages/number_pool";',
                        "let first = required;",
                        "let second = first;",
                        "first = second;",
                        "axios.post(first, {});",
                    )
                ),
                encoding="utf-8",
            )
            self.assertEqual(1, analyze_file(cycle, temp_root)[0])

            scaling = temp_root / "scaling.js"
            scaling.write_text(
                "\n".join(
                    [
                        f'const unused_{index} = "/v2/messages/number_pool";'
                        for index in range(200)
                    ]
                    + [
                        f'axios.post("/v2/messages", {{id: {index}}});'
                        for index in range(200)
                    ]
                ),
                encoding="utf-8",
            )
            started = time.perf_counter()
            self.assertEqual(0, analyze_file(scaling, temp_root)[0])
            self.assertLess(time.perf_counter() - started, 2.0)

    def test_required_rest_path_must_derive_from_the_request_url(self) -> None:
        self.assert_required_profile_passes(
            {
                "axios-data-decoy.ts": (
                    'axios({method: "post", url: "/v2/messages", '
                    'data: {audit: "/v2/messages/number_pool"}});'
                ),
                "axios-post-data-decoy.ts": (
                    'axios.post("/v2/messages", '
                    '{audit: "/v2/messages/number_pool"});'
                ),
                "fetch-header-decoy.ts": (
                    'fetch("/v2/messages", {method: "POST", headers: '
                    '{audit: "/v2/messages/number_pool"}, body: payload});'
                ),
                "method-first-data-decoy.py": (
                    'requests.request("POST", "/v2/messages", '
                    'json={"audit": "/v2/messages/number_pool"})'
                ),
                "inline-normal-member.ts": (
                    'axios.post(({pool: "/v2/messages/number_pool", '
                    'normal: "/v2/messages"}).normal, {text});'
                ),
                "expect-decoy.ts": (
                    'expect(endpoint).toBe("/v2/messages/number_pool");'
                ),
                "assert-decoy.py": (
                    'assert endpoint == "/v2/messages/number_pool"'
                ),
                "return-decoy.ts": (
                    'function endpoint() { return "/v2/messages/number_pool"; }'
                ),
                "router-decoy.ts": (
                    'router.post("/v2/messages/number_pool", handler);'
                ),
                "express-decoy.ts": (
                    'app.post("/v2/messages/number_pool", handler);'
                ),
                "nock-decoy.ts": (
                    'nock(API).post("/v2/messages/number_pool").reply(200);'
                ),
                "console-decoy.ts": (
                    'console.log("/v2/messages/number_pool");'
                ),
                "curl-header-decoy.sh": (
                    "curl https://example.invalid/audit -H "
                    "'X-Endpoint: https://api.telnyx.com/v2/messages/number_pool'"
                ),
                "curl-body-decoy.sh": (
                    "curl https://example.invalid/audit --data "
                    "'https://api.telnyx.com/v2/messages/number_pool'"
                ),
                "curl-write-out-decoy.sh": (
                    "curl https://example.invalid/audit --write-out "
                    "'https://api.telnyx.com/v2/messages/number_pool'"
                ),
            }
        )
        fixture_name = "inline-pool-member.ts"
        _, payload = self.run_messaging_linter(
            {
                fixture_name: (
                    'axios.post(({pool: "/v2/messages/number_pool", '
                    'normal: "/v2/messages"}).pool, {text});'
                )
            }
        )
        self.assert_required_profile_detected(payload, fixture_name)

    def test_rest_profile_must_be_in_request_body_not_query_or_config(self) -> None:
        fixtures = {
            "axios-config.ts": "\n".join(
                (
                    'const path = "/v2/messages/number_pool";',
                    "axios.post(path, {from, to, text}, {params: {messaging_profile_id: profile}});",
                )
            ),
            "fetch-query.ts": (
                'fetch("/v2/messages/alphanumeric_sender_id", '
                '{method: "POST", body: JSON.stringify({from, to, text}), '
                'params: {messaging_profile_id: profile}});'
            ),
            "requests-query.py": (
                'requests.post("/v2/messages/number_pool", '
                'json={"from": sender, "to": recipient, "text": text}, '
                'params={"messaging_profile_id": profile})'
            ),
        }
        result, payload = self.run_messaging_linter(fixtures)
        self.assertEqual(1, result.returncode)
        for fixture_name in fixtures:
            self.assert_required_profile_detected(payload, fixture_name)

    def test_javascript_profile_shorthand_is_accepted_only_in_payloads(self) -> None:
        self.assert_required_profile_passes(
            {
                "axios-shorthand.ts": "\n".join(
                    (
                        'const url = "/v2/messages/number_pool";',
                        "axios.post(url, {from, to, text, messaging_profile_id});",
                    )
                ),
                "fetch-shorthand.js": (
                    'fetch("/v2/messages/alphanumeric_sender_id", '
                    '{method: "POST", body: JSON.stringify({from, to, text, messagingProfileId})});'
                ),
                "variable-shorthand.tsx": "\n".join(
                    (
                        "const payload = {from, to, text, messagingProfileID};",
                        'axios.post("/v2/messages/number_pool", payload);',
                    )
                ),
            }
        )
        fixture_name = "config-shorthand.ts"
        result, payload = self.run_messaging_linter(
            {
                fixture_name: (
                    'axios.post("/v2/messages/number_pool", {from, to, text}, '
                    "{params: {messaging_profile_id}});"
                )
            }
        )
        self.assertEqual(1, result.returncode)
        self.assert_required_profile_detected(payload, fixture_name)

    def test_javascript_options_object_payload_shorthand_is_resolved(self) -> None:
        self.assert_required_profile_passes(
            {
                "fetch-inline-options.ts": "\n".join(
                    (
                        'const url = "/v2/messages/number_pool";',
                        "const body = JSON.stringify({from, to, text, messaging_profile_id});",
                        "fetch(url, {method: 'POST', body});",
                    )
                ),
                "fetch-assigned-options.js": "\n".join(
                    (
                        'const url = "/v2/messages/alphanumeric_sender_id";',
                        "const body = JSON.stringify({from, to, text, messagingProfileId});",
                        "const options = {method: 'POST', body};",
                        "fetch(url, options);",
                    )
                ),
                "axios-inline-options.tsx": "\n".join(
                    (
                        'const url = "/v2/messages/number_pool";',
                        "const data = {from, to, text, messagingProfileID};",
                        "axios({url, method: 'POST', data});",
                    )
                ),
            }
        )

    def test_shell_profile_must_be_in_curl_body_and_accepts_inline_json(self) -> None:
        fixture_name = "query-only.sh"
        result, payload = self.run_messaging_linter(
            {
                fixture_name: (
                    "curl -X POST "
                    "https://api.telnyx.com/v2/messages/number_pool?messaging_profile_id=mp-query"
                )
            }
        )
        self.assertEqual(1, result.returncode)
        self.assert_required_profile_detected(payload, fixture_name)
        self.assert_required_profile_passes(
            {
                "inline-json.sh": (
                    "curl -X POST --json "
                    "'{\"from\":\"pool\",\"to\":\"+12025550123\","
                    "\"messaging_profile_id\":\"mp-body\"}' "
                    "https://api.telnyx.com/v2/messages/number_pool"
                )
            }
        )

    def test_shell_jq_built_profile_is_resolved_from_the_output_filter(self) -> None:
        self.assert_required_profile_passes(
            {
                "jq-payload.sh": "\n".join(
                    (
                        "url='https://api.telnyx.com/v2/messages/number_pool'",
                        "payload=$(jq -cn \\",
                        "  --arg p \"$PROFILE\" \\",
                        "  '{from:$ENV.FROM,to:$ENV.TO,text:\"hello\",messaging_profile_id:$p}')",
                        'curl --json "$payload" "$url"',
                    )
                )
            }
        )

        fixtures = {
            "jq-arg-name-decoy.sh": "\n".join(
                (
                    "url='https://api.telnyx.com/v2/messages/number_pool'",
                    'payload=$(jq -cn --arg messaging_profile_id "$PROFILE" '
                    "'{from:$ENV.FROM,to:$ENV.TO,text:\"hello\"}')",
                    'curl --json "$payload" "$url"',
                )
            ),
            "jq-nested-decoy.sh": "\n".join(
                (
                    "url='https://api.telnyx.com/v2/messages/alphanumeric_sender_id'",
                    'payload=$(jq -cn --arg p "$PROFILE" '
                    "'{text:\"hello\",metadata:{messaging_profile_id:$p}}')",
                    'curl --json "$payload" "$url"',
                )
            ),
        }
        result, payload = self.run_messaging_linter(fixtures)
        self.assertEqual(1, result.returncode)
        for fixture_name in fixtures:
            self.assert_required_profile_detected(payload, fixture_name)

    def test_shell_get_data_is_not_a_message_send(self) -> None:
        fixtures = {
            "get-long.sh": (
                "curl --get --data-urlencode messaging_profile_id=mp-query "
                "https://api.telnyx.com/v2/messages/number_pool"
            ),
            "get-short-cluster.sh": "\n".join(
                (
                    "url='https://api.telnyx.com/v2/messages/alphanumeric_sender_id'",
                    "curl -sG \"$url\" --json "
                    "'{\"messaging_profile_id\":\"mp-query\"}'",
                )
            ),
        }
        fixtures.update(
            {
                "get-disabled.sh": (
                    "curl -G --no-get --json "
                    "'{\"messaging_profile_id\":\"mp-body\"}' "
                    "https://api.telnyx.com/v2/messages/number_pool"
                )
            }
        )
        self.assert_required_profile_passes(fixtures)

    def test_shell_endpoint_variables_resolve_to_their_curl_calls(self) -> None:
        fixture_name = "endpoint-variable.sh"
        result, payload = self.run_messaging_linter(
            {
                fixture_name: "\n".join(
                    (
                        "url='https://api.telnyx.com/v2/messages/number_pool'",
                        "curl -X POST \"$url\" -d '{\"text\":\"missing\"}'",
                    )
                )
            }
        )
        self.assertEqual(1, result.returncode)
        self.assert_required_profile_detected(payload, fixture_name)
        self.assert_required_profile_passes(
            {
                "endpoint-alias.sh": "\n".join(
                    (
                        "endpoint='https://api.telnyx.com/v2/messages/number_pool'",
                        "url=$endpoint",
                        "curl -X POST \"${url}\" --json "
                        "'{\"messaging_profile_id\":\"mp-1\"}'",
                    )
                )
            }
        )

    def test_shell_endpoint_aliases_cover_common_command_forms(self) -> None:
        fixtures = {
            "quoted-command-substitution.sh": "\n".join(
                (
                    "endpoint='https://api.telnyx.com/v2/messages/number_pool'",
                    'url="$endpoint"',
                    "response=$(curl -X POST \"${url}\" --json "
                    "'{\"text\":\"missing\"}')",
                )
            ),
            "if-command.sh": "\n".join(
                (
                    "url='https://api.telnyx.com/v2/messages/alphanumeric_sender_id'",
                    "if curl -X POST \"$url\" -d '{\"text\":\"missing\"}'; then",
                    "  echo sent",
                    "fi",
                )
            ),
        }
        result, payload = self.run_messaging_linter(fixtures)
        self.assertEqual(1, result.returncode)
        for fixture_name in fixtures:
            self.assert_required_profile_detected(payload, fixture_name)

    def test_shell_curl_payloads_do_not_bleed_across_commands(self) -> None:
        fixture_name = "two-curls.sh"
        result, payload = self.run_messaging_linter(
            {
                fixture_name: "\n".join(
                    (
                        "url='https://api.telnyx.com/v2/messages/number_pool'",
                        "curl -X POST \"$url\" -d '{\"text\":\"missing\"}'; "
                        "curl https://example.invalid/audit --json "
                        "'{\"messaging_profile_id\":\"decoy\"}'",
                    )
                )
            }
        )
        self.assertEqual(1, result.returncode)
        self.assert_required_profile_detected(payload, fixture_name)

    def test_single_quoted_shell_alias_is_not_treated_as_an_endpoint(self) -> None:
        result, payload = self.run_messaging_linter(
            {
                "literal-alias.sh": "\n".join(
                    (
                        "url='https://api.telnyx.com/v2/messages/number_pool'",
                        "curl -X POST '$url' -d '{\"text\":\"not a Telnyx send\"}'",
                    )
                )
            }
        )
        self.assertEqual(0, result.returncode)
        checks = [
            check
            for check in payload["checks"]
            if check["name"] == "required_messaging_profile_id"
        ]
        self.assertEqual(
            [{"name": "required_messaging_profile_id", "status": "pass"}],
            checks,
        )

    def test_shell_endpoint_alias_must_be_the_curl_url(self) -> None:
        files = {
            "payload-only.sh": "\n".join(
                (
                    "url='https://api.telnyx.com/v2/messages/number_pool'",
                    "curl https://example.invalid/audit -d \"$url\"",
                )
            ),
            "header-only.sh": "\n".join(
                (
                    "url='https://api.telnyx.com/v2/messages/alphanumeric_sender_id'",
                    "curl -H \"X-Decoy: $url\" https://example.invalid/audit",
                )
            ),
            "prose-only.sh": "\n".join(
                (
                    "url='https://api.telnyx.com/v2/messages/number_pool'",
                    "echo curl \"$url\"",
                )
            ),
        }
        result, payload = self.run_messaging_linter(files)
        self.assertEqual(0, result.returncode)
        checks = [
            check
            for check in payload["checks"]
            if check["name"] == "required_messaging_profile_id"
        ]
        self.assertEqual(
            [{"name": "required_messaging_profile_id", "status": "pass"}],
            checks,
        )

    def test_profile_must_be_a_top_level_payload_member(self) -> None:
        fixtures = {
            "nested-axios.ts": (
                'axios.post("/v2/messages/number_pool", '
                "{from, to, text, metadata: {messaging_profile_id: profile}});"
            ),
            "nested-fetch.js": (
                'fetch("/v2/messages/alphanumeric_sender_id", '
                "{method: 'POST', body: JSON.stringify({from, to, text, metadata: "
                "{messagingProfileId: profile}})});"
            ),
            "nested-sdk.ts": (
                "client.messages.sendNumberPool({from, to, text, metadata: "
                "{messagingProfileID: profile}});"
            ),
            "nested-python.py": (
                "client.messages.send_number_pool(to=recipient, "
                'metadata={"messaging_profile_id": profile})'
            ),
            "nested-request.py": (
                'requests.post("/v2/messages/number_pool", '
                'json={"from": sender, "metadata": '
                '{"messaging_profile_id": profile}})'
            ),
            "nested-go.go": (
                "client.Messages.SendNumberPool(ctx, Params{Metadata: "
                'map[string]any{"messaging_profile_id": profile}})'
            ),
            "nested-csharp.cs": (
                "client.Messages.SendNumberPool(new Params { Metadata = "
                "new { MessagingProfileId = profile } });"
            ),
            "nested-php.php": (
                "<?php\n$client->messages()->sendNumberPool("
                "['metadata' => ['messaging_profile_id' => $profile]]);"
            ),
            "nested-ruby.rb": (
                "client.messages.send_number_pool(metadata: "
                "{ messaging_profile_id: profile })"
            ),
            "nested-java.java": (
                "client.messages().sendNumberPool(Params.builder().metadata("
                "new Metadata().messagingProfileId(profile)).build());"
            ),
        }
        result, payload = self.run_messaging_linter(fixtures)
        self.assertEqual(1, result.returncode)
        for fixture_name in fixtures:
            self.assert_required_profile_detected(payload, fixture_name)

    def test_fetch_options_variable_resolves_only_its_body(self) -> None:
        self.assert_required_profile_passes(
            {
                "options-body.ts": "\n".join(
                    (
                        'const endpoint = "/v2/messages/number_pool";',
                        "const payload = {from, to, text, messaging_profile_id};",
                        "const options = {method: 'POST', body: JSON.stringify(payload)};",
                        "fetch(endpoint, options);",
                    )
                ),
                "aliased-options-body.ts": "\n".join(
                    (
                        'const endpoint = "/v2/messages/number_pool";',
                        "const payload = {from, to, text, messaging_profile_id};",
                        "const baseOptions = {method: 'POST', body: JSON.stringify(payload)};",
                        "const options = baseOptions;",
                        "fetch(endpoint, options);",
                    )
                ),
                "mutated-options-body.ts": "\n".join(
                    (
                        'const endpoint = "/v2/messages/number_pool";',
                        "const payload = {from, to, text, messaging_profile_id};",
                        "const options = {method: 'POST'};",
                        "options.body = JSON.stringify(payload);",
                        "fetch(endpoint, options);",
                    )
                ),
            }
        )
        fixture_name = "options-query.ts"
        result, payload = self.run_messaging_linter(
            {
                fixture_name: "\n".join(
                    (
                        'const endpoint = "/v2/messages/number_pool";',
                        "const options = {method: 'POST', params: {messaging_profile_id}};",
                        "fetch(endpoint, options);",
                    )
                )
            }
        )
        self.assertEqual(1, result.returncode)
        self.assert_required_profile_detected(payload, fixture_name)

        stale_fixture = "options-stale-body.ts"
        result, payload = self.run_messaging_linter(
            {
                stale_fixture: "\n".join(
                    (
                        'const endpoint = "/v2/messages/number_pool";',
                        "const options = {method: 'POST', body: JSON.stringify("
                        "{messaging_profile_id})};",
                        "options.body = JSON.stringify({to, text});",
                        "fetch(endpoint, options);",
                    )
                )
            }
        )
        self.assertEqual(1, result.returncode)
        self.assert_required_profile_detected(payload, stale_fixture)

    def test_javascript_payload_spreads_resolve_only_at_payload_root(self) -> None:
        self.assert_required_profile_passes(
            {
                "spread-sdk.ts": "\n".join(
                    (
                        "const base = {messaging_profile_id};",
                        "client.messages.sendNumberPool({...base, to, text});",
                    )
                ),
                "spread-rest.ts": "\n".join(
                    (
                        "const base = {messagingProfileId};",
                        'axios.post("/v2/messages/number_pool", {...base, to, text});',
                    )
                ),
                "spread-fetch.ts": "\n".join(
                    (
                        "const base = {messagingProfileID};",
                        'fetch("/v2/messages/alphanumeric_sender_id", '
                        "{method: 'POST', body: JSON.stringify({...base, to, text})});",
                    )
                ),
            }
        )
        fixture_name = "nested-spread.ts"
        result, payload = self.run_messaging_linter(
            {
                fixture_name: "\n".join(
                    (
                        "const base = {messaging_profile_id};",
                        'axios.post("/v2/messages/number_pool", '
                        "{to, text, metadata: {...base}});",
                    )
                )
            }
        )
        self.assertEqual(1, result.returncode)
        self.assert_required_profile_detected(payload, fixture_name)

    def test_serialized_payload_must_be_the_body_not_json_looking_text(self) -> None:
        self.assert_required_profile_passes(
            {
                "serialized-body.js": "\n".join(
                    (
                        'const payload = \'{"messaging_profile_id":"mp-real"}\';',
                        'fetch("/v2/messages/number_pool", {method: "POST", body: payload});',
                    )
                ),
                "escaped-serialized-body.js": "\n".join(
                    (
                        'const payload = "{\\"messaging_profile_id\\":'
                        '\\"mp-real\\"}";',
                        'fetch("/v2/messages/number_pool", {method: "POST", body: payload});',
                    )
                ),
            }
        )
        fixture_name = "json-looking-text.js"
        result, payload = self.run_messaging_linter(
            {
                fixture_name: "\n".join(
                    (
                        "const payload = {text: "
                        "'{\"messaging_profile_id\":\"mp-fake\"}'};",
                        "client.messages.sendNumberPool(payload);",
                    )
                )
            }
        )
        self.assertEqual(1, result.returncode)
        self.assert_required_profile_detected(payload, fixture_name)

    def test_axios_config_object_selects_only_its_request_body(self) -> None:
        self.assert_required_profile_passes(
            {
                "axios-config-body.ts": (
                    'axios({method: "post", url: "/v2/messages/number_pool", '
                    "data: {to, text, messaging_profile_id}});"
                ),
                "axios-config-variable.ts": "\n".join(
                    (
                        "const config = {",
                        '  url: "/v2/messages/alphanumeric_sender_id",',
                        '  method: "post",',
                        "  data: {to, text, messaging_profile_id},",
                        "};",
                        "axios(config);",
                    )
                ),
                "axios-config-alias.ts": "\n".join(
                    (
                        "const baseConfig = {",
                        '  url: "/v2/messages/number_pool",',
                        '  method: "post",',
                        "  data: {to, text, messaging_profile_id},",
                        "};",
                        "const config = baseConfig;",
                        "axios(config);",
                    )
                ),
            }
        )
        fixtures = {
            "axios-config-params.ts": (
                'axios({method: "post", url: '
                '"/v2/messages/alphanumeric_sender_id", data: {to, text}, '
                "params: {messaging_profile_id}});"
            ),
            "axios-config-variable-params.ts": "\n".join(
                (
                    "const config = {",
                    '  url: "/v2/messages/number_pool",',
                    '  method: "post",',
                    "  data: {to, text},",
                    "  params: {messaging_profile_id},",
                    "};",
                    "axios(config);",
                )
            ),
        }
        result, payload = self.run_messaging_linter(
            fixtures
        )
        self.assertEqual(1, result.returncode)
        for fixture_name in fixtures:
            self.assert_required_profile_detected(payload, fixture_name)

    def test_axios_config_combines_base_url_and_honors_method(self) -> None:
        """One-shot Axios configs use both URL fields and default to GET."""

        forms = {
            "inline.js": (
                "axios({method:'post', "
                "baseURL:'https://api.telnyx.com/v2/messages/', "
                "url:'./number_pool', data:{to:'+1'%s}});"
            ),
            "variable.js": (
                "const cfg={method:'post', "
                "baseURL:'https://api.telnyx.com/v2/messages/', "
                "url:'./number_pool', data:{to:'+1'%s}}; axios(cfg);"
            ),
            "request-inline.js": (
                "axios.request({method:'post', "
                "baseURL:'https://api.telnyx.com/v2/messages/', "
                "url:'./number_pool', data:{to:'+1'%s}});"
            ),
            "request-variable.js": (
                "const cfg={method:'post', "
                "baseURL:'https://api.telnyx.com/v2/messages/', "
                "url:'./number_pool', data:{to:'+1'%s}}; "
                "axios.request(cfg);"
            ),
        }
        for filename, template in forms.items():
            with self.subTest(filename=filename, body="violating"):
                self.assert_required_profile_flagged({filename: template % ""})
            with self.subTest(filename=filename, body="compliant"):
                self.assert_required_profile_passes(
                    {
                        filename: template
                        % ", messaging_profile_id:'MP_valid'"
                    }
                )

        # Axios defaults to GET; a static GET is not a message send and does
        # not acquire a request-body profile requirement merely because its
        # URL names the collection. A dynamic method remains fail-safe.
        self.assert_required_profile_passes(
            {
                "get.js": (
                    "axios({method:'get', "
                    "url:'/v2/messages/number_pool'});"
                ),
                "default-get.js": (
                    "axios({url:'/v2/messages/number_pool'});"
                ),
            }
        )
        self.assert_required_profile_flagged(
            {
                "dynamic.js": (
                    "axios({method:verb, "
                    "url:'/v2/messages/number_pool', data:{to:'+1'}});"
                )
            }
        )
        self.assert_required_profile_flagged(
            {
                "shorthand.js": (
                    "const method='POST'; "
                    "const baseURL='https://api.telnyx.com/v2/messages/'; "
                    "axios({method, baseURL, url:'number_pool', "
                    "data:{to:'+1'}});"
                )
            }
        )

    def test_http_method_gate_is_consistent_across_transports(self) -> None:
        """GET-like reads stay safe; mutating or unknown methods are checked."""

        required = "https://api.telnyx.com/v2/messages/number_pool"
        safe = {
            "fetch-default.js": f"fetch('{required}');",
            "fetch-empty.js": f"fetch('{required}', {{}});",
            "fetch-get.js": f"fetch('{required}', {{method:'GET'}});",
            "fetch-alias.js": (
                f"const method='GET'; fetch('{required}', {{method}});"
            ),
            "fetch-options.js": (
                f"const options={{}}; fetch('{required}', options);"
            ),
            "fetch-undefined.js": (
                f"fetch('{required}', {{method:undefined}});"
            ),
            "request-get.js": f"request('GET', '{required}', {{}});",
            "request-config-get.js": (
                f"request({{method:'GET', url:'{required}'}});"
            ),
            "request-config-callback.js": (
                f"request({{url:'{required}'}}, callback);"
            ),
            "request-url-options.js": (
                f"request('{required}', {{}}, callback);"
            ),
            "request-mutated-get.js": (
                f"const options={{url:'{required}'}}; "
                "options.method='GET'; request(options);"
            ),
            "fetch-dynamic-compliant.js": (
                f"fetch('{required}', {{method:verb, body:JSON.stringify("
                "{messaging_profile_id})}});"
            ),
            "request-dynamic-compliant.js": (
                f"request(verb, '{required}', {{messaging_profile_id}});"
            ),
            "curl-dynamic-compliant.sh": (
                f"curl -X \"$METHOD\" -d '{{\"messaging_profile_id\":\"mp\"}}' "
                f"'{required}'\n"
            ),
            "curl-dynamic-compliant.php": (
                "<?php\n$ch = curl_init();\n"
                f"curl_setopt($ch, CURLOPT_URL, '{required}');\n"
                "curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);\n"
                "curl_setopt($ch, CURLOPT_POSTFIELDS, "
                "'{\"messaging_profile_id\":\"mp\"}');\n"
                "curl_exec($ch);\n"
            ),
            "go-method-get.go": (
                "package main\nimport \"net/http\"\n"
                f"func read() {{ http.NewRequest(http.MethodGet, \"{required}\", nil) }}\n"
            ),
            "curl-default.sh": f"curl '{required}'\n",
            "curl-get.sh": f"curl -X GET '{required}'\n",
            "curl-data-as-query.sh": f"curl -G -d 'to=+1' '{required}'\n",
            "curl-default.php": (
                "<?php\n$ch = curl_init();\n"
                f"curl_setopt($ch, CURLOPT_URL, '{required}');\n"
                "curl_exec($ch);\n"
            ),
            "curl-httpget.php": (
                "<?php\n$ch = curl_init();\n"
                f"curl_setopt($ch, CURLOPT_URL, '{required}');\n"
                "curl_setopt($ch, CURLOPT_HTTPGET, true);\n"
                "curl_exec($ch);\n"
            ),
        }
        for method in ("GET", "HEAD", "OPTIONS", "DELETE"):
            safe[f"fetch-{method.lower()}.mjs"] = (
                f"fetch('{required}', {{method:'{method}'}});"
            )
            safe[f"request-{method.lower()}.cjs"] = (
                f"request('{method}', '{required}', {{}});"
            )
            safe[f"curl-{method.lower()}.bash"] = (
                f"curl -X {method} '{required}'\n"
            )
            safe[f"curl-{method.lower()}.phtml"] = (
                "<?php\n$ch = curl_init();\n"
                f"curl_setopt($ch, CURLOPT_URL, '{required}');\n"
                f"curl_setopt($ch, CURLOPT_CUSTOMREQUEST, '{method}');\n"
                "curl_exec($ch);\n"
            )
        self.assert_required_profile_passes(safe)

        sends = {
            "fetch-post.js": (
                f"fetch('{required}', {{method:'POST', body:'{{}}'}});"
            ),
            "fetch-put.js": (
                f"fetch('{required}', {{method:'PUT', body:'{{}}'}});"
            ),
            "fetch-mutated-options.js": (
                "const options={}; options.method='POST'; options.body='{}'; "
                f"fetch('{required}', options);"
            ),
            "fetch-dynamic.js": (
                f"fetch('{required}', {{method:verb, body:'{{}}'}});"
            ),
            "request-dynamic.js": (
                f"request(verb, '{required}', {{}});"
            ),
            "go-method-post.go": (
                "package main\nimport \"net/http\"\n"
                f"func send() {{ http.NewRequest(http.MethodPost, \"{required}\", nil) }}\n"
            ),
            "request-config-mutated.js": (
                f"const options={{url:'{required}'}}; "
                "options.method='POST'; request(options, callback);"
            ),
            "request-url-options-post.js": (
                f"request('{required}', {{method:'POST'}}, callback);"
            ),
            "axios-config-mutated.js": (
                f"const options={{url:'{required}'}}; "
                "options.method='POST'; axios(options);"
            ),
            "curl-data.sh": f"curl -d '{{}}' '{required}'\n",
            "curl-attached-data.sh": f"curl -d'{{}}' '{required}'\n",
            "curl-form.sh": f"curl -F 'text=hello' '{required}'\n",
            "curl-upload.sh": f"curl -T payload.json '{required}'\n",
            "curl-post.sh": f"curl -X POST '{required}'\n",
            "curl-dynamic.sh": f"curl -X \"$METHOD\" '{required}'\n",
            "curl-post.php": (
                "<?php\n$ch = curl_init();\n"
                f"curl_setopt($ch, CURLOPT_URL, '{required}');\n"
                "curl_setopt($ch, CURLOPT_POST, true);\n"
                "curl_setopt($ch, CURLOPT_POSTFIELDS, '{}');\n"
                "curl_exec($ch);\n"
            ),
            "curl-custom.php": (
                "<?php\n$ch = curl_init();\n"
                f"curl_setopt($ch, CURLOPT_URL, '{required}');\n"
                "curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');\n"
                "curl_exec($ch);\n"
            ),
            "curl-upload.php": (
                "<?php\n$ch = curl_init();\n"
                f"curl_setopt($ch, CURLOPT_URL, '{required}');\n"
                "curl_setopt($ch, CURLOPT_UPLOAD, true);\n"
                "curl_exec($ch);\n"
            ),
            "curl-dynamic.php": (
                "<?php\n$ch = curl_init();\n"
                f"curl_setopt($ch, CURLOPT_URL, '{required}');\n"
                "curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);\n"
                "curl_exec($ch);\n"
            ),
            "curl-reused-handle.php": (
                "<?php\n$ch = curl_init();\n"
                f"curl_setopt($ch, CURLOPT_URL, '{required}');\n"
                "curl_setopt($ch, CURLOPT_POST, true);\n"
                "curl_setopt($ch, CURLOPT_POSTFIELDS, '{}');\n"
                "curl_exec($ch);\n"
                f"curl_setopt($ch, CURLOPT_URL, '{required}');\n"
                "curl_setopt($ch, CURLOPT_POSTFIELDS, "
                "'{\"messaging_profile_id\":\"mp\"}');\n"
                "curl_exec($ch);\n"
            ),
        }
        for method in ("POST", "PUT", "PATCH"):
            sends[f"fetch-{method.lower()}.mjs"] = (
                f"fetch('{required}', {{method:'{method}', body:'{{}}'}});"
            )
            sends[f"request-{method.lower()}.cjs"] = (
                f"request('{method}', '{required}', {{}});"
            )
            sends[f"curl-{method.lower()}.bash"] = (
                f"curl -X {method} '{required}'\n"
            )
            sends[f"curl-{method.lower()}.phtml"] = (
                "<?php\n$ch = curl_init();\n"
                f"curl_setopt($ch, CURLOPT_URL, '{required}');\n"
                f"curl_setopt($ch, CURLOPT_CUSTOMREQUEST, '{method}');\n"
                "curl_exec($ch);\n"
            )
        for filename, source in sends.items():
            with self.subTest(filename=filename):
                self.assert_required_profile_flagged({filename: source})

    def test_rest_client_signatures_select_the_request_body_argument(self) -> None:
        self.assert_required_profile_passes(
            {
                "requests.py": (
                    'requests.post("/v2/messages/number_pool", '
                    'json={"messaging_profile_id": profile})'
                ),
                "request.py": (
                    'requests.request("POST", "/v2/messages/number_pool", '
                    'json={"messaging_profile_id": profile})'
                ),
                "request-positional.js": (
                    'request("POST", "/v2/messages/number_pool", '
                    "{messaging_profile_id});"
                ),
                "post.ts": (
                    'post("/v2/messages/number_pool", {messaging_profile_id});'
                ),
                "ky.ts": (
                    'ky.post("/v2/messages/number_pool", '
                    "{json: {messaging_profile_id}});"
                ),
                "axios-request.ts": (
                    'axios.request({url: "/v2/messages/number_pool", '
                    "data: {messaging_profile_id}});"
                ),
            }
        )

    def test_curl_body_option_matrix_rejects_header_and_nested_decoys(self) -> None:
        self.assert_required_profile_passes(
            {
                "json-equals.sh": (
                    "curl --json='{\"messaging_profile_id\":\"mp\"}' "
                    "https://api.telnyx.com/v2/messages/number_pool"
                ),
                "data-raw-equals.sh": (
                    "curl --data-raw='{\"messaging_profile_id\":\"mp\"}' "
                    "https://api.telnyx.com/v2/messages/number_pool"
                ),
                "data-binary-equals.sh": (
                    "curl --data-binary='{\"messaging_profile_id\":\"mp\"}' "
                    "https://api.telnyx.com/v2/messages/number_pool"
                ),
                "short-attached.sh": (
                    "curl -d'{\"messaging_profile_id\":\"mp\"}' "
                    "https://api.telnyx.com/v2/messages/number_pool"
                ),
            }
        )
        fixtures = {
            "header-decoy.sh": (
                "curl -H 'messaging_profile_id: mp' -d '{\"text\":\"x\"}' "
                "https://api.telnyx.com/v2/messages/number_pool"
            ),
            "nested-inline.sh": (
                "curl --json '{\"metadata\":{\"messaging_profile_id\":\"mp\"}}' "
                "https://api.telnyx.com/v2/messages/number_pool"
            ),
            "nested-file.sh": (
                "curl --data-binary @nested.json "
                "https://api.telnyx.com/v2/messages/number_pool"
            ),
            "nested.json": '{"metadata":{"messaging_profile_id":"mp"}}',
        }
        result, payload = self.run_messaging_linter(fixtures)
        self.assertEqual(1, result.returncode)
        for fixture_name in ("header-decoy.sh", "nested-inline.sh", "nested-file.sh"):
            self.assert_required_profile_detected(payload, fixture_name)

    def test_profile_on_one_send_does_not_mask_second_missing_profile(self) -> None:
        fixture_name = "two-sends.tsx"
        _, payload = self.run_messaging_linter(
            {
                fixture_name: "\n".join(
                    (
                        "async function sendBoth() {",
                        '  await fetch("/v2/messages/alphanumeric_sender_id", {method: "POST", body: JSON.stringify({from: "GOOD", to, text, messaging_profile_id: "mp-1"})});',
                        '  await fetch("/v2/messages/alphanumeric_sender_id", {method: "POST", body: JSON.stringify({from: "MISSING", to, text})});',
                        "}",
                    )
                )
            }
        )
        self.assert_required_profile_detected(payload, fixture_name)

    def test_recognized_call_does_not_mask_unrecognized_required_send(self) -> None:
        fixtures = {
            "mixed.ts": "\n".join(
                (
                    "client.sendNumberPool({to, messaging_profile_id: profileId});",
                    'custom.fire("https://api.telnyx.com/v2/messages/number_pool", {to});',
                )
            ),
            "multiline.ts": "\n".join(
                (
                    "custom.fire(",
                    '  "https://api.telnyx.com/v2/messages/number_pool",',
                    "  {to}",
                    ");",
                )
            ),
        }
        result, payload = self.run_messaging_linter(fixtures)
        self.assertEqual(1, result.returncode)
        for fixture_name in fixtures:
            self.assert_required_profile_detected(payload, fixture_name)

    def test_unrelated_requests_comments_and_strings_do_not_mask_missing_profile(
        self,
    ) -> None:
        fixtures = {
            "next-curl.sh": "\n".join(
                (
                    "curl -X POST -d '{\"text\":\"missing\"}' https://api.telnyx.com/v2/messages/alphanumeric_sender_id",
                    "curl -X POST -d '{\"messaging_profile_id\":\"mp-unrelated\"}' https://example.com/unrelated",
                )
            ),
            "next-statement.ts": "\n".join(
                (
                    "fetch('/v2/messages/alphanumeric_sender_id', {method: 'POST', body: JSON.stringify({text})});",
                    "const unrelated = {messaging_profile_id: 'mp-unrelated'};",
                )
            ),
            "comment-mask.ts": "\n".join(
                (
                    "fetch('/v2/messages/alphanumeric_sender_id', {method: 'POST', body: JSON.stringify({text})});",
                    "// TODO: add messaging_profile_id",
                    "const debug = 'messaging_profile_id';",
                )
            ),
            "block-comment-mask.ts": "\n".join(
                (
                    "fetch('/v2/messages/alphanumeric_sender_id', {",
                    "  method: 'POST',",
                    "  /* this example is intentionally disabled:",
                    "     messaging_profile_id: 'mp-comment-only',",
                    "  */",
                    "  body: JSON.stringify({text}),",
                    "});",
                )
            ),
        }
        result, payload = self.run_messaging_linter(fixtures)
        self.assertEqual(1, result.returncode)
        self.assertNotEqual("clean", payload["result"])
        for fixture_name in fixtures:
            self.assert_required_profile_detected(payload, fixture_name)

    def test_valid_multiline_required_profile_sends_pass(self) -> None:
        _, payload = self.run_messaging_linter(
            {
                "valid-sdk.tsx": "\n".join(
                    (
                        "export async function send() {",
                        "  return client.messages.sendWithAlphanumericSender({",
                        '    from: "TELNYX",',
                        "    to,",
                        "    text,",
                        '    messagingProfileId: "mp-1",',
                        "  });",
                        "}",
                    )
                ),
                "valid-curl.sh": "\n".join(
                    (
                        "curl -X POST \\",
                        "  -H 'Content-Type: application/json' \\",
                        "  -d '{\"from\":\"TELNYX\",\"to\":\"+31201234567\",\"text\":\"hi\",\"messaging_profile_id\":\"mp-1\"}' \\",
                        "  https://api.telnyx.com/v2/messages/alphanumeric_sender_id",
                    )
                ),
            }
        )
        checks = [
            check
            for check in payload["checks"]
            if check["name"] == "required_messaging_profile_id"
        ]
        self.assertEqual(
            [{"name": "required_messaging_profile_id", "status": "pass"}],
            checks,
        )

    def test_shell_curl_payload_variables_and_files_resolve_before_send(self) -> None:
        self.assert_required_profile_passes(
            {
                "payload-variable.sh": "\n".join(
                    (
                        "payload='{\"to\":\"+12025550123\",\"messaging_profile_id\":\"mp-1\"}'",
                        'curl -X POST --data "$payload" https://api.telnyx.com/v2/messages/number_pool',
                    )
                ),
                "braced-alias.sh": "\n".join(
                    (
                        "payload='{\"messaging_profile_id\":\"mp-2\"}'",
                        "request_body=$payload",
                        'curl --json "${request_body}" https://api.telnyx.com/v2/messages/alphanumeric_sender_id',
                    )
                ),
                "file-payload.sh": (
                    "curl --data-binary @payload.json "
                    "https://api.telnyx.com/v2/messages/number_pool"
                ),
                "payload.json": '{"messaging_profile_id":"mp-3"}',
            }
        )

    def test_shell_curl_payload_resolution_does_not_accept_stale_or_decoy_data(
        self,
    ) -> None:
        fixtures = {
            "reassigned-payload.sh": "\n".join(
                (
                    "payload='{\"messaging_profile_id\":\"mp-stale\"}'",
                    "payload='{\"text\":\"missing\"}'",
                    'curl -d "$payload" https://api.telnyx.com/v2/messages/number_pool',
                )
            ),
            "missing-file.sh": (
                "curl --data @missing.json "
                "https://api.telnyx.com/v2/messages/alphanumeric_sender_id"
            ),
            "decoy-text.sh": "\n".join(
                (
                    "payload='remember messaging_profile_id before shipping'",
                    'curl --json "$payload" https://api.telnyx.com/v2/messages/number_pool',
                )
            ),
        }
        result, payload = self.run_messaging_linter(fixtures)
        self.assertEqual(1, result.returncode)
        for fixture_name in fixtures:
            self.assert_required_profile_detected(payload, fixture_name)

    def test_required_profile_lexer_preserves_source_boundaries(self) -> None:
        cases = {
            "absolute-url.ts": (
                'fetch("https://api.telnyx.com/v2/messages/alphanumeric_sender_id", '
                '{method: "POST", body: JSON.stringify({messaging_profile_id: "mp-1"})});'
            ),
            "endpoint-variable.ts": (
                'const endpoint = "/v2/messages/alphanumeric_sender_id";\n'
                "fetch(endpoint, {method: 'POST', body: JSON.stringify({messaging_profile_id: "
                '"mp-1"})});'
            ),
            "reassigned-endpoint.ts": (
                'let endpoint = "/v2/messages/alphanumeric_sender_id";\n'
                'endpoint = "/v2/messages";\nfetch(endpoint, {method: "POST"});'
            ),
            "metadata-only-endpoint.ts": (
                'const endpoint = "/v2/messages/alphanumeric_sender_id";\n'
                'fetch("/v2/other", {method: "POST", metadata: endpoint});'
            ),
            "curl-url-first.sh": (
                "curl https://api.telnyx.com/v2/messages/number_pool "
                "-d '{\"messaging_profile_id\":\"mp-1\"}'"
            ),
            "hash-in-text.py": (
                'client.messages.send_number_pool(text="ticket #42", '
                'messaging_profile_id="mp-1")'
            ),
            "java-decoys.java": "\n".join(
                (
                    "MessageSendNumberPoolParams params = MessageSendNumberPoolParams.builder()",
                    '    .messagingProfileId("mp-real").build();',
                    'String note = "params = MessageSendNumberPoolParams.builder().build();";',
                    "// params = MessageSendNumberPoolParams.builder().build();",
                    "holder.params = MessageSendNumberPoolParams.builder().build();",
                    "client.messages().sendNumberPool(params);",
                )
            ),
            "semicolons-in-text.js": (
                'client.messages.sendNumberPool({text: "first; message", '
                'messagingProfileId: "mp-1"}); '
                'client.messages.sendNumberPool({text: "second; message", '
                'messagingProfileId: "mp-2"});'
            ),
        }
        for fixture_name, source in cases.items():
            with self.subTest(fixture=fixture_name):
                self.assert_required_profile_passes({fixture_name: source})

    def test_profile_field_name_inside_message_text_does_not_satisfy_request(
        self,
    ) -> None:
        cases = {
            "profile-name-in-text.js": (
                'client.messages.sendNumberPool({text: '
                '"remember messaging_profile_id: before shipping"});'
            ),
            "json-looking-text.js": (
                "client.messages.sendNumberPool({text: "
                "'{\"messaging_profile_id\":\"fake\"}'});"
            ),
            "go-context-mask.go": (
                'ctx := Context{MessagingProfileID: "mp-not-payload"}\n'
                "params := MessageSendNumberPoolParams{}\n"
                "client.Messages.SendNumberPool(ctx, params)"
            ),
            "go-inline-context-mask.go": (
                'client.Messages.SendNumberPool(Context{MessagingProfileID: "mp-not-payload"}, '
                "MessageSendNumberPoolParams{})"
            ),
            "cli-name-in-text.sh": (
                "curl -d '{\"text\":\"--messaging-profile-id fake\"}' "
                "https://api.telnyx.com/v2/messages/number_pool"
            ),
        }
        for fixture_name, source in cases.items():
            with self.subTest(fixture=fixture_name):
                result, payload = self.run_messaging_linter(
                    {fixture_name: source}
                )
                self.assert_required_profile_detected(payload, fixture_name)
                self.assertEqual(1, result.returncode)

    def test_variable_payloads_resolve_in_supported_sdk_languages(self) -> None:
        fixtures = {
            "variable.js": (
                'const payload = {messagingProfileId: "mp-js"};\n'
                "client.messages.sendNumberPool(payload);"
            ),
            "variable.py": (
                'payload = {"messaging_profile_id": "mp-py"}\n'
                "client.messages.send_number_pool(**payload)"
            ),
            "variable.rb": (
                'payload = { messaging_profile_id: "mp-rb" }\n'
                "client.messages.send_number_pool(**payload)"
            ),
            "variable.go": (
                'params := MessageSendNumberPoolParams{MessagingProfileID: "mp-go"}\n'
                "client.Messages.SendNumberPool(ctx, params)"
            ),
            "variable.php": (
                "<?php\n$payload = ['messaging_profile_id' => 'mp-php'];\n"
                "$client->messages()->sendNumberPool($payload);"
            ),
            "variable.cs": (
                'var payload = new MessageSendNumberPoolParams { MessagingProfileId = "mp-cs" };\n'
                "client.Messages.SendNumberPool(payload);"
            ),
            "rest-variable.py": (
                'payload = {"messaging_profile_id": "mp-rest"}\n'
                'requests.post("/v2/messages/number_pool", json=payload)'
            ),
        }
        self.assert_required_profile_passes(fixtures)

    def test_profile_fields_added_to_payload_variables_before_send_pass(self) -> None:
        fixtures = {
            "mutated-subscript.py": (
                'payload = {"to": recipient, "text": "hello"}\n'
                'payload["messaging_profile_id"] = profile_id\n'
                "client.messages.send_number_pool(**payload)"
            ),
            "mutated-property.js": (
                'const payload = {to: recipient, text: "hello"};\n'
                'payload.messagingProfileId = "mp-js";\n'
                "client.messages.sendNumberPool(payload);"
            ),
            "mutated-symbol.rb": (
                'payload = { to: recipient, text: "hello" }\n'
                'payload[:messaging_profile_id] = "mp-rb"\n'
                "client.messages.send_number_pool(**payload)"
            ),
        }
        self.assert_required_profile_passes(fixtures)

    def test_profile_mutation_after_send_does_not_mask_missing_profile(self) -> None:
        fixture_name = "late-mutation.py"
        result, payload = self.run_messaging_linter(
            {
                fixture_name: (
                    'payload = {"to": recipient, "text": "hello"}\n'
                    "client.messages.send_number_pool(**payload)\n"
                    'payload["messaging_profile_id"] = profile_id'
                )
            }
        )
        self.assert_required_profile_detected(payload, fixture_name)
        self.assertEqual(1, result.returncode)

    def test_profile_mutation_decoys_do_not_mask_missing_profile(self) -> None:
        fixtures = {
            "other-object.py": (
                'payload = {"to": recipient, "text": "hello"}\n'
                'metadata["messaging_profile_id"] = profile_id\n'
                "client.messages.send_number_pool(**payload)"
            ),
            "before-reassignment.js": (
                "let payload = {};\n"
                'payload.messagingProfileId = "mp-stale";\n'
                'payload = {to: recipient, text: "hello"};\n'
                "client.messages.sendNumberPool(payload);"
            ),
            "comment-and-comparison.rb": (
                "payload = { to: recipient, text: 'hello' }\n"
                "# payload[:messaging_profile_id] = 'mp-comment'\n"
                "if payload[:messaging_profile_id] == 'mp-decoy'\n"
                "  warn 'missing'\n"
                "end\n"
                "client.messages.send_number_pool(**payload)"
            ),
        }
        for fixture_name, source in fixtures.items():
            with self.subTest(fixture=fixture_name):
                result, payload = self.run_messaging_linter(
                    {fixture_name: source}
                )
                self.assert_required_profile_detected(payload, fixture_name)
                self.assertEqual(1, result.returncode)

    def test_php_required_sender_invocation_without_profile_is_detected(
        self,
    ) -> None:
        fixture_name = "missing-number-pool.php"
        result, payload = self.run_messaging_linter(
            {
                fixture_name: "\n".join(
                    (
                        "<?php",
                        "$client->messages()->sendNumberPool(",
                        '  to: "+12025550123",',
                        ");",
                    )
                )
            }
        )
        self.assert_required_profile_detected(payload, fixture_name)
        self.assertEqual(1, result.returncode)

    def test_php_required_sender_invocation_with_profile_passes(self) -> None:
        result, payload = self.run_messaging_linter(
            {
                "valid-alphanumeric-sender.php": "\n".join(
                    (
                        "<?php",
                        "$client->messages()->sendWithAlphanumericSender(",
                        '  to: "+12025550123",',
                        '  messagingProfileID: "mp-1",',
                        ");",
                    )
                )
            }
        )
        checks = [
            check
            for check in payload["checks"]
            if check["name"] == "required_messaging_profile_id"
        ]
        self.assertEqual(
            [{"name": "required_messaging_profile_id", "status": "pass"}],
            checks,
        )
        self.assertEqual(0, result.returncode)

    def test_same_line_javascript_sends_are_checked_per_invocation(self) -> None:
        fixture_name = "same-line-number-pools.js"
        result, payload = self.run_messaging_linter(
            {
                fixture_name: (
                    'client.messages.sendNumberPool({to: "+12025550123"}); '
                    'client.messages.sendNumberPool({to: "+12025550124", '
                    'messagingProfileId: "mp-1"});'
                )
            }
        )
        self.assert_required_profile_detected(payload, fixture_name)
        details = next(
            check["details"]["files"]
            for check in payload["checks"]
            if check["name"] == "required_messaging_profile_id"
        )
        self.assertEqual(1, len(details), details)
        self.assertIn('+12025550123', details[0])
        self.assertNotIn('+12025550124', details[0])
        self.assertEqual(1, result.returncode)

    def test_same_line_javascript_sends_all_pass_with_profiles(self) -> None:
        result, payload = self.run_messaging_linter(
            {
                "valid-same-line-number-pools.js": (
                    'client.messages.sendNumberPool({to: "+12025550123", '
                    'messagingProfileId: "mp-1"}); '
                    'client.messages.sendNumberPool({to: "+12025550124", '
                    'messagingProfileId: "mp-2"});'
                )
            }
        )
        checks = [
            check
            for check in payload["checks"]
            if check["name"] == "required_messaging_profile_id"
        ]
        self.assertEqual(
            [{"name": "required_messaging_profile_id", "status": "pass"}],
            checks,
        )
        self.assertEqual(0, result.returncode)

    def test_same_line_go_sends_are_checked_per_invocation(self) -> None:
        fixture_name = "same-line-number-pools.go"
        result, payload = self.run_messaging_linter(
            {
                fixture_name: (
                    'client.Messages.SendNumberPool(ctx, Params{To: "+12025550123"}); '
                    'client.Messages.SendNumberPool(ctx, Params{To: "+12025550124", '
                    'MessagingProfileID: "mp-1"})'
                )
            }
        )
        self.assert_required_profile_detected(payload, fixture_name)
        details = next(
            check["details"]["files"]
            for check in payload["checks"]
            if check["name"] == "required_messaging_profile_id"
        )
        self.assertEqual(1, len(details), details)
        self.assertIn('+12025550123', details[0])
        self.assertNotIn('+12025550124', details[0])
        self.assertEqual(1, result.returncode)

    def test_same_line_go_sends_all_pass_with_profiles(self) -> None:
        result, payload = self.run_messaging_linter(
            {
                "valid-same-line-number-pools.go": (
                    'client.Messages.SendNumberPool(ctx, Params{MessagingProfileID: "mp-1"}); '
                    'client.Messages.SendNumberPool(ctx, Params{MessagingProfileID: "mp-2"})'
                )
            }
        )
        checks = [
            check
            for check in payload["checks"]
            if check["name"] == "required_messaging_profile_id"
        ]
        self.assertEqual(
            [{"name": "required_messaging_profile_id", "status": "pass"}],
            checks,
        )
        self.assertEqual(0, result.returncode)

    def test_go_request_options_do_not_replace_or_satisfy_request_body(
        self,
    ) -> None:
        self.assert_required_profile_passes(
            {
                "go-request-option.go": (
                    "client.Messages.SendNumberPool(ctx, "
                    'MessageSendNumberPoolParams{MessagingProfileID: "mp-1"}, '
                    'option.WithHeader("X-Request-ID", requestID))'
                ),
                "go-alphanumeric-request-option.go": (
                    "client.Messages.SendWithAlphanumericSender(ctx, "
                    'MessageSendWithAlphanumericSenderParams{MessagingProfileID: "mp-2"}, '
                    'option.WithHeader("X-Request-ID", requestID))'
                )
            }
        )
        fixture_name = "go-request-option-decoy.go"
        result, payload = self.run_messaging_linter(
            {
                fixture_name: (
                    "client.Messages.SendNumberPool(ctx, "
                    "MessageSendNumberPoolParams{}, "
                    "customOption(OptionMetadata{MessagingProfileID: profile}))"
                )
            }
        )
        self.assert_required_profile_detected(payload, fixture_name)
        self.assertEqual(1, result.returncode)

    def test_same_line_python_and_ruby_sends_are_checked_per_invocation(
        self,
    ) -> None:
        fixtures = {
            "same-line.py": (
                'client.messages.send_number_pool(to="+12025550123"); '
                'client.messages.send_number_pool(to="+12025550124", '
                'messaging_profile_id="mp-1")'
            ),
            "same-line.rb": (
                'client.messages.send_number_pool(to: "+12025550123"); '
                'client.messages.send_number_pool(to: "+12025550124", '
                'messaging_profile_id: "mp-1")'
            ),
        }
        for fixture_name, source in fixtures.items():
            with self.subTest(fixture=fixture_name):
                result, payload = self.run_messaging_linter({fixture_name: source})
                self.assert_required_profile_detected(payload, fixture_name)
                details = next(
                    check["details"]["files"]
                    for check in payload["checks"]
                    if check["name"] == "required_messaging_profile_id"
                )
                self.assertEqual(1, len(details), details)
                self.assertIn('+12025550123', details[0])
                self.assertNotIn('+12025550124', details[0])
                self.assertEqual(1, result.returncode)

    def test_same_line_python_and_ruby_sends_all_pass_with_profiles(self) -> None:
        fixtures = {
            "valid-same-line.py": (
                'client.messages.send_number_pool(messaging_profile_id="mp-1"); '
                'client.messages.send_number_pool(messaging_profile_id="mp-2")'
            ),
            "valid-same-line.rb": (
                'client.messages.send_number_pool(messaging_profile_id: "mp-1"); '
                'client.messages.send_number_pool(messaging_profile_id: "mp-2")'
            ),
        }
        for fixture_name, source in fixtures.items():
            with self.subTest(fixture=fixture_name):
                result, payload = self.run_messaging_linter({fixture_name: source})
                checks = [
                    check
                    for check in payload["checks"]
                    if check["name"] == "required_messaging_profile_id"
                ]
                self.assertEqual(
                    [{"name": "required_messaging_profile_id", "status": "pass"}],
                    checks,
                )
                self.assertEqual(0, result.returncode)

    def test_java_number_pool_builder_profile_is_resolved_from_call_variable(
        self,
    ) -> None:
        result, payload = self.run_messaging_linter(
            {
                "valid-number-pool.java": "\n".join(
                    (
                        "import com.telnyx.sdk.models.messages.MessageSendNumberPoolParams;",
                        "",
                        "MessageSendNumberPoolParams params = MessageSendNumberPoolParams.builder()",
                        '    .from("pool-1")',
                        '    .to("+12025550123")',
                        '    .text("hello")',
                        '    .messagingProfileId("mp-1")',
                        "    .build();",
                        "client.messages().sendNumberPool(params);",
                    )
                )
            }
        )
        checks = [
            check
            for check in payload["checks"]
            if check["name"] == "required_messaging_profile_id"
        ]
        self.assertEqual(
            [{"name": "required_messaging_profile_id", "status": "pass"}],
            checks,
        )
        self.assertEqual(0, result.returncode)

    def test_java_number_pool_builder_without_profile_is_detected_at_call(
        self,
    ) -> None:
        fixture_name = "missing-number-pool.java"
        result, payload = self.run_messaging_linter(
            {
                fixture_name: "\n".join(
                    (
                        "import com.telnyx.sdk.models.messages.MessageSendNumberPoolParams;",
                        "",
                        "MessageSendNumberPoolParams params = MessageSendNumberPoolParams.builder()",
                        '    .from("pool-1")',
                        '    .to("+12025550123")',
                        '    .text("hello")',
                        "    .build();",
                        "client.messages().sendNumberPool(params);",
                    )
                )
            }
        )
        checks = [
            check
            for check in payload["checks"]
            if check["name"] == "required_messaging_profile_id"
        ]
        self.assertEqual(1, len(checks))
        self.assertEqual("issue", checks[0]["status"])
        matches = checks[0]["details"]["files"]
        self.assertEqual(1, len(matches), matches)
        self.assertIn(
            "client.messages().sendNumberPool(params);",
            matches[0],
        )
        self.assertEqual(1, result.returncode)

    def test_java_number_pool_builders_are_isolated_by_invocation_variable(
        self,
    ) -> None:
        fixture_name = "two-number-pools.java"
        result, payload = self.run_messaging_linter(
            {
                fixture_name: "\n".join(
                    (
                        "import com.telnyx.sdk.models.messages.MessageSendNumberPoolParams;",
                        "",
                        "MessageSendNumberPoolParams missingParams = MessageSendNumberPoolParams.builder()",
                        '    .from("pool-missing")',
                        '    .to("+12025550123")',
                        '    .text("missing")',
                        "    .build();",
                        "MessageSendNumberPoolParams validParams = MessageSendNumberPoolParams.builder()",
                        '    .from("pool-valid")',
                        '    .to("+12025550124")',
                        '    .text("valid")',
                        '    .messagingProfileId("mp-1")',
                        "    .build();",
                        "client.messages().sendNumberPool(missingParams);",
                        "client.messages().sendNumberPool(validParams);",
                    )
                )
            }
        )
        checks = [
            check
            for check in payload["checks"]
            if check["name"] == "required_messaging_profile_id"
        ]
        self.assertEqual(1, len(checks))
        self.assertEqual("issue", checks[0]["status"])
        matches = checks[0]["details"]["files"]
        self.assertEqual(1, len(matches), matches)
        self.assertIn(
            "client.messages().sendNumberPool(missingParams);",
            matches[0],
        )
        self.assertNotIn("validParams", matches[0])
        self.assertEqual(1, result.returncode)

    def test_java_same_line_sends_are_checked_per_invocation(self) -> None:
        fixture_name = "same-line-number-pools.java"
        result, payload = self.run_messaging_linter(
            {
                fixture_name: "\n".join(
                    (
                        "MessageSendNumberPoolParams missingParams = MessageSendNumberPoolParams.builder()",
                        '    .to("+12025550123")',
                        '    .text("missing")',
                        "    .build();",
                        "MessageSendNumberPoolParams validParams = MessageSendNumberPoolParams.builder()",
                        '    .to("+12025550124")',
                        '    .text("valid")',
                        '    .messagingProfileId("mp-1")',
                        "    .build();",
                        "client.messages().sendNumberPool(missingParams); client.messages().sendNumberPool(validParams);",
                    )
                )
            }
        )
        checks = [
            check
            for check in payload["checks"]
            if check["name"] == "required_messaging_profile_id"
        ]
        self.assertEqual(1, len(checks))
        self.assertEqual("issue", checks[0]["status"])
        matches = checks[0]["details"]["files"]
        self.assertEqual(1, len(matches), matches)
        self.assertIn("sendNumberPool(missingParams)", matches[0])
        self.assertNotIn("validParams", matches[0])
        self.assertEqual(1, result.returncode)

    def test_java_same_line_sends_all_pass_when_each_builder_has_profile(
        self,
    ) -> None:
        result, payload = self.run_messaging_linter(
            {
                "valid-same-line-number-pools.java": "\n".join(
                    (
                        "MessageSendNumberPoolParams firstParams = MessageSendNumberPoolParams.builder()",
                        '    .messagingProfileId("mp-1")',
                        "    .build();",
                        "MessageSendNumberPoolParams secondParams = MessageSendNumberPoolParams.builder()",
                        '    .messagingProfileId("mp-2")',
                        "    .build();",
                        "client.messages().sendNumberPool(firstParams); client.messages().sendNumberPool(secondParams);",
                    )
                )
            }
        )
        checks = [
            check
            for check in payload["checks"]
            if check["name"] == "required_messaging_profile_id"
        ]
        self.assertEqual(
            [{"name": "required_messaging_profile_id", "status": "pass"}],
            checks,
        )
        self.assertEqual(0, result.returncode)


    def test_payload_state_official_sdk_shapes_and_body_keys(self) -> None:
        self.assert_required_profile_passes(
            {
                "official.js": (
                    "client.messages.sendNumberPool({messagingProfileId: profile});"
                ),
                "official.py": (
                    "client.messages.send_number_pool("
                    "messaging_profile_id=profile)"
                ),
                "official.rb": (
                    "client.messages.send_with_alphanumeric_sender("
                    "messaging_profile_id: profile)"
                ),
                "official.java": (
                    "client.messages().sendNumberPool(Params.builder()"
                    ".messagingProfileId(profile).build());"
                ),
                "official.go": (
                    "client.Messages.SendNumberPool(ctx, "
                    "Params{MessagingProfileID: profile})"
                ),
            }
        )
        positive = {
            "body.js": "client.messages.send({body: legacy});",
            "body.py": "client.messages.send(body=legacy)",
            "body.rb": "client.messages.send_(body: legacy)",
            "body.java": (
                "Params p = Params.builder().body(legacy).build();\n"
                "client.messages().send(p);"
            ),
            "body.go": (
                "p := Params{Body: legacy}\nclient.Messages.Send(ctx, p)"
            ),
        }
        negative = {
            "text.js": "client.messages.send({text: body});",
            "nested.py": (
                'client.messages.send(metadata={"body": legacy}, text=text)'
            ),
            "nested.java": (
                "client.messages().send(Params.builder().metadata("
                "new Metadata().body(legacy)).build());"
            ),
            "text.go": (
                "p := Params{Text: body}\nclient.Messages.Send(ctx, p)"
            ),
        }
        _, payload = self.run_messaging_linter({**positive, **negative})
        check = next(
            item for item in payload["checks"]
            if item["name"] == "body_not_text"
        )
        details = json.dumps(check.get("details", {}))
        for fixture in positive:
            self.assertIn(fixture, details)
        for fixture in negative:
            self.assertNotIn(fixture, details)

    def test_payload_state_alias_copy_branch_and_merge_semantics(self) -> None:
        self.assert_required_profile_passes(
            {
                "shared-alias.js": "\n".join(
                    (
                        "const source = {};",
                        "const sent = source;",
                        "source.messagingProfileId = profile;",
                        "client.messages.sendNumberPool(sent);",
                    )
                ),
                "alias-survives-rebind.js": "\n".join(
                    (
                        "let source = {messagingProfileId: profile};",
                        "const sent = source;",
                        "source = {};",
                        "client.messages.sendNumberPool(sent);",
                    )
                ),
                "spread-snapshot.js": "\n".join(
                    (
                        "const source = {messagingProfileId: profile};",
                        "const sent = {...source};",
                        "delete source.messagingProfileId;",
                        "client.messages.sendNumberPool(sent);",
                    )
                ),
                "exhaustive-branches.js": "\n".join(
                    (
                        "const sent = {};",
                        "if (flag) { sent.messagingProfileId = 'a'; }",
                        "else { sent.messagingProfileId = 'b'; }",
                        "client.messages.sendNumberPool(sent);",
                    )
                ),
                "finally-write.js": "\n".join(
                    (
                        "const sent = {};",
                        "try { work(); } finally {",
                        "  sent.messagingProfileId = profile;",
                        "}",
                        "client.messages.sendNumberPool(sent);",
                    )
                ),
                "object-assign.js": "\n".join(
                    (
                        "const sent = {};",
                        "Object.assign(sent, {messagingProfileId: profile});",
                        "client.messages.sendNumberPool(sent);",
                    )
                ),
                "dict-update.py": "\n".join(
                    (
                        "sent = {}",
                        'sent.update({"messaging_profile_id": profile})',
                        "client.messages.send_number_pool(**sent)",
                    )
                ),
                "ruby-merge.rb": "\n".join(
                    (
                        "sent = {}",
                        "sent.merge!({messaging_profile_id: profile})",
                        "client.messages.send_number_pool(**sent)",
                    )
                ),
            }
        )
        warnings = {
            "may-alias.js": "\n".join(
                (
                    "const left = {};",
                    "const right = {};",
                    "const selected = flag ? left : right;",
                    "selected.messagingProfileId = profile;",
                    "client.messages.sendNumberPool(left);",
                )
            ),
            "nonexhaustive.js": "\n".join(
                (
                    "const sent = {};",
                    "if (flag) { sent.messagingProfileId = profile; }",
                    "client.messages.sendNumberPool(sent);",
                )
            ),
            "conditional-delete.py": "\n".join(
                (
                    'sent = {"messaging_profile_id": profile}',
                    "if flag:",
                    '    del sent["messaging_profile_id"]',
                    "client.messages.send_number_pool(**sent)",
                )
            ),
        }
        _, payload = self.run_messaging_linter(warnings)
        for fixture in warnings:
            self.assert_required_profile_detected(payload, fixture)

    def test_payload_state_body_deletes_aliases_and_snapshots(self) -> None:
        positive = {
            "conditional-delete.js": "\n".join(
                (
                    "const payload = {body: legacy};",
                    "if (flag) { delete payload.body; }",
                    "client.messages.send(payload);",
                )
            ),
            "alias-source-add.js": "\n".join(
                (
                    "const source = {};",
                    "const payload = source;",
                    "source.body = legacy;",
                    "client.messages.send(payload);",
                )
            ),
            "copy-survives-delete.js": "\n".join(
                (
                    "const source = {body: legacy};",
                    "const payload = {...source};",
                    "delete source.body;",
                    "client.messages.send(payload);",
                )
            ),
            "delete-after.py": "\n".join(
                (
                    'payload = {"body": legacy}',
                    "client.messages.send(**payload)",
                    'del payload["body"]',
                )
            ),
        }
        negative = {
            "dominating-delete.js": "\n".join(
                (
                    "const payload = {body: legacy};",
                    "delete payload.body;",
                    "client.messages.send(payload);",
                )
            ),
            "nested-callable.rb": "\n".join(
                (
                    "payload = {text: text}",
                    "def unrelated(payload)",
                    "  payload[:body] = legacy",
                    "end",
                    "client.messages.send_(**payload)",
                )
            ),
        }
        _, payload = self.run_messaging_linter({**positive, **negative})
        check = next(
            item for item in payload["checks"]
            if item["name"] == "body_not_text"
        )
        details = json.dumps(check.get("details", {}))
        for fixture in positive:
            self.assertIn(fixture, details)
        for fixture in negative:
            self.assertNotIn(fixture, details)

    def test_payload_state_optional_values_fail_closed_without_body_noise(self) -> None:
        warnings = {
            "conditional.js": (
                "client.messages.sendNumberPool({messagingProfileId: "
                "flag ? profile : null});"
            ),
            "null.py": (
                "client.messages.send_number_pool(messaging_profile_id=None)"
            ),
            "empty.rb": (
                "client.messages.send_number_pool(messaging_profile_id: '')"
            ),
            "optional-call.ts": (
                "client?.messages?.sendNumberPool?.({"
                "messagingProfileId: maybeProfile ?? null});"
            ),
        }
        _, payload = self.run_messaging_linter(warnings)
        for fixture in warnings:
            self.assert_required_profile_detected(payload, fixture)
        _, body_payload = self.run_messaging_linter(
            {"opaque.js": "client.messages.send(runtimePayload);"}
        )
        body_check = next(
            item for item in body_payload["checks"]
            if item["name"] == "body_not_text"
        )
        self.assertEqual("pass", body_check["status"])

    def test_payload_state_cross_language_matrix_regressions(self) -> None:
        self.assert_required_profile_passes(
            {
                "go-net-http.go": "\n".join(
                    (
                        "payload := map[string]any{}",
                        'payload["messaging_profile_id"] = profileID',
                        'http.Post("/v2/messages/number_pool", '
                        '"application/json", payload)',
                    )
                ),
                "go-uninvoked-delete.go": "\n".join(
                    (
                        "payload := map[string]any{",
                        '  "messaging_profile_id": profileID,',
                        "}",
                        "mutate := func() {",
                        '  delete(payload, "messaging_profile_id")',
                        "}",
                        'http.Post("/v2/messages/number_pool", '
                        '"application/json", payload)',
                    )
                ),
                "shell-uninvoked-delete.sh": "\n".join(
                    (
                        "payload='{\"messaging_profile_id\":\"mp-1\"}'",
                        "mutate() {",
                        "  payload='{}'",
                        "}",
                        'curl --json "${payload}" '
                        '"/v2/messages/number_pool"',
                    )
                ),
            }
        )
        warnings = {
            "ruby-loop.rb": "\n".join(
                (
                    "payload = {}",
                    "items.each do |item|",
                    "  payload[:messaging_profile_id] = profile_id",
                    "end",
                    'client.post("/v2/messages/number_pool", json: payload)',
                )
            ),
            "go-if.go": "\n".join(
                (
                    "payload := map[string]any{}",
                    "if flag {",
                    '  payload["messaging_profile_id"] = profileID',
                    "}",
                    'http.Post("/v2/messages/number_pool", '
                    '"application/json", payload)',
                )
            ),
            "go-range.go": "\n".join(
                (
                    "payload := map[string]any{}",
                    "for _, item := range items {",
                    '  payload["messaging_profile_id"] = profileID',
                    "}",
                    'http.Post("/v2/messages/number_pool", '
                    '"application/json", payload)',
                )
            ),
            "java-remove.java": "\n".join(
                (
                    "var payload = new HashMap<String, Object>();",
                    'payload.put("messaging_profile_id", profileId);',
                    'payload.remove("messaging_profile_id");',
                    'client.post("/v2/messages/number_pool", payload);',
                )
            ),
            "csharp-remove.cs": "\n".join(
                (
                    "var payload = new Dictionary<string, object>();",
                    'payload["MessagingProfileId"] = profileId;',
                    'payload.Remove("MessagingProfileId");',
                    'client.PostAsync("/v2/messages/number_pool", payload);',
                )
            ),
            "shell-uninvoked-add.sh": "\n".join(
                (
                    "payload='{}'",
                    "mutate() {",
                    "  payload='{\"messaging_profile_id\":\"mp-1\"}'",
                    "}",
                    'curl --json "${payload}" '
                    '"/v2/messages/number_pool"',
                )
            ),
        }
        _, payload = self.run_messaging_linter(warnings)
        for fixture in warnings:
            self.assert_required_profile_detected(payload, fixture)

        positive_body = {
            "ruby-dup.rb": "\n".join(
                (
                    "source = {body: legacy}",
                    "payload = source.dup",
                    "source.delete(:body)",
                    "client.messages.send_(**payload)",
                )
            ),
            "csharp-copy.cs": "\n".join(
                (
                    "var source = new Dictionary<string, object>();",
                    'source["Body"] = legacy;',
                    "var payload = new Dictionary<string, object>(source);",
                    'source.Remove("Body");',
                    "client.Messages.Send(payload);",
                )
            ),
            "go-copy.go": "\n".join(
                (
                    'source := map[string]any{"Body": legacy}',
                    "payload := maps.Clone(source)",
                    'delete(source, "Body")',
                    "client.Messages.Send(ctx, payload)",
                )
            ),
            "java-copy.java": "\n".join(
                (
                    "var source = new HashMap<String, Object>();",
                    'source.put("body", legacy);',
                    "var payload = new HashMap<String, Object>(source);",
                    'source.remove("body");',
                    "client.messages().send(payload);",
                )
            ),
            "go-conditional-delete.go": "\n".join(
                (
                    'payload := map[string]any{"Body": legacy}',
                    "if flag {",
                    '  delete(payload, "Body")',
                    "}",
                    "client.Messages.Send(ctx, payload)",
                )
            ),
        }
        negative_body = {
            "csharp-delete.cs": "\n".join(
                (
                    "var payload = new Dictionary<string, object>();",
                    'payload["Body"] = legacy;',
                    'payload.Remove("Body");',
                    "client.Messages.Send(payload);",
                )
            ),
            "go-alias-delete.go": "\n".join(
                (
                    'source := map[string]any{"Body": legacy}',
                    "payload := source",
                    'delete(source, "Body")',
                    "client.Messages.Send(ctx, payload)",
                )
            ),
            "java-alias-delete.java": "\n".join(
                (
                    "var source = new HashMap<String, Object>();",
                    'source.put("body", legacy);',
                    "var payload = source;",
                    'source.remove("body");',
                    "client.messages().send(payload);",
                )
            ),
        }
        _, body_payload = self.run_messaging_linter(
            {**positive_body, **negative_body}
        )
        body_check = next(
            item for item in body_payload["checks"]
            if item["name"] == "body_not_text"
        )
        body_details = json.dumps(body_check.get("details", {}))
        for fixture in positive_body:
            self.assertIn(fixture, body_details)
        for fixture in negative_body:
            self.assertNotIn(fixture, body_details)

    def test_payload_state_index_scaling_and_json_no_crash(self) -> None:
        namespace = runpy.run_path(
            str(MESSAGING_SOURCE_ANALYZER),
            run_name="telnyx_payload_state_scaling_contract",
        )
        analyze = namespace["analyze_file"]
        body_fields = namespace["message_body_fields"]
        body_calls = namespace["MESSAGE_BODY_CALL_RE"]
        with tempfile.TemporaryDirectory(
            prefix="telnyx-payload-state-"
        ) as temp_dir:
            root = Path(temp_dir)

            def elapsed(count: int) -> float:
                fixture = root / f"scale-{count}.js"
                fixture.write_text(
                    "const payload = {};\n"
                    + "\n".join(
                        f"payload.value_{index} = {index};"
                        for index in range(count)
                    )
                    + "\npayload.messagingProfileId = profile;\n"
                    + "client.messages.sendNumberPool(payload);\n",
                    encoding="utf-8",
                )
                started = time.perf_counter()
                self.assertEqual((1, []), analyze(fixture, root))
                return time.perf_counter() - started

            small = min(elapsed(64) for _ in range(2))
            medium = min(elapsed(128) for _ in range(2))
            self.assertLess(medium, max(0.05, small * 3))
            self.assertLess(elapsed(512), 3.0)

            crash = root / "json-shapes.js"
            crash.write_text(
                "client.messages.sendNumberPool([null, {}, [], "
                "{messagingProfileId: null}]);\n"
                "const listPayload = '{\"messagingProfileId\":[]}';\n"
                "client.messages.sendNumberPool(listPayload);\n"
                "const dictPayload = '{\"messagingProfileId\":{}}';\n"
                "client.messages.sendNumberPool(dictPayload);\n"
                "client.messages.send({items: [null, {}, []]});\n",
                encoding="utf-8",
            )
            total, missing = analyze(crash, root)
            self.assertEqual(3, total)
            self.assertEqual(3, len(missing))
            self.assertEqual([], body_fields(crash, body_calls))

    def test_required_endpoint_normalizes_interior_dot_segments(self) -> None:
        # axios combineURLs does not normalize dot segments: a trailing-slash
        # baseURL joined with a relative path leaves interior "." / ".."
        # segments that the HTTP layer resolves before the request is sent.
        # required_endpoint() only stripped a LEADING "./", so a number-pool
        # send reached through such a join was silently treated as safe.
        namespace = runpy.run_path(
            str(MESSAGING_SOURCE_ANALYZER),
            run_name="telnyx_required_endpoint_dot_segments_contract",
        )
        required_endpoint = namespace["required_endpoint"]
        # Interior "." and ".." that resolve back to the required path.
        self.assertTrue(required_endpoint("/v2/messages/./number_pool"))
        self.assertTrue(required_endpoint("/v2/messages/foo/../number_pool"))
        self.assertTrue(
            required_endpoint(
                "https://api.telnyx.com/v2/messages/./alphanumeric_sender_id"
            )
        )
        # The plain and base-URL-relative forms still match.
        self.assertTrue(required_endpoint("/v2/messages/number_pool"))
        self.assertTrue(required_endpoint("messages/number_pool"))
        # A ".." that resolves to a DIFFERENT path must not match.
        self.assertFalse(
            required_endpoint("/v2/messages/../calls/number_pool")
        )
        self.assertFalse(required_endpoint("/v2/messages/number_pool_export"))

    def test_empty_constant_alias_profile_is_treated_as_absent(self) -> None:
        # A messaging_profile_id assigned through a local constant that holds an
        # empty string is present in shape but unusable. The direct empty
        # literal was already caught; the aliased form passed because the
        # identifier text is non-empty. Resolving the nearest single static
        # assignment (and any alias chain) closes that gap WITHOUT flagging a
        # genuinely populated or reassigned alias.
        namespace = runpy.run_path(
            str(MESSAGING_SOURCE_ANALYZER),
            run_name="telnyx_static_alias_profile_contract",
        )
        analyze = namespace["analyze_file"]
        base = (
            "import axios from 'axios';\n"
            "const api = axios.create({ baseURL: 'https://api.telnyx.com/v2' });\n"
        )
        send = (
            "export const send = (mp) => api.post('/messages/number_pool', "
            "{ messaging_profile_id: mp, to: '+1', from: '+1' });\n"
        )

        def run(source: str) -> tuple[int, int]:
            with tempfile.TemporaryDirectory(
                prefix="telnyx-static-alias-"
            ) as temp_dir:
                root = Path(temp_dir)
                fixture = root / "index.js"
                fixture.write_text(source, encoding="utf-8")
                total, missing = analyze(fixture, root)
                return total, len(missing)

        # Empty constant alias -> flagged as missing.
        self.assertEqual(
            (1, 1),
            run(base + "const mp = '';\n" + send.replace("(mp)", "()")),
        )
        # Alias chain to an empty constant -> flagged.
        self.assertEqual(
            (1, 1),
            run(base + "const a = ''; const b = a;\n"
                + send.replace("(mp)", "()").replace("mp", "b")),
        )
        # A genuinely populated constant alias -> NOT flagged.
        self.assertEqual(
            (1, 0),
            run(base + "const mp = 'MP_abc123';\n" + send.replace("(mp)", "()")),
        )
        # Reassigned to a non-empty value before use -> NOT flagged.
        self.assertEqual(
            (1, 0),
            run(base + "let mp = ''; mp = 'MP_real';\n"
                + send.replace("(mp)", "()")),
        )

    def _analyze_source(self, filename: str, source: str) -> tuple[int, int]:
        namespace = runpy.run_path(
            str(MESSAGING_SOURCE_ANALYZER),
            run_name="telnyx_send_shape_contract",
        )
        analyze = namespace["analyze_file"]
        with tempfile.TemporaryDirectory(prefix="telnyx-send-shape-") as tmp:
            root = Path(tmp)
            fixture = root / filename
            fixture.write_text(source, encoding="utf-8")
            total, missing = analyze(fixture, root)
            return total, len(missing)

    def test_axios_method_helper_per_request_baseurl_is_combined(self) -> None:
        # axios.post(url, data, {baseURL}) sets the effective base and OVERRIDES
        # the instance one. Only the one-shot axios(config) form was read, so
        # this shape resolved to the bare path and passed with zero required
        # sends even though the effective POST is /v2/messages/number_pool.
        head = "const axios=require('axios');\n"
        cfg = "{baseURL:'https://api.telnyx.com/v2/messages/'}"
        # Missing profile through the helper config -> counted AND flagged.
        self.assertEqual(
            (1, 1),
            self._analyze_source(
                "a.js",
                head + f"module.exports=()=>axios.post('/number_pool',{{to:'+1'}},{cfg});\n",
            ),
        )
        # Same shape WITH a usable profile -> counted, not flagged.
        self.assertEqual(
            (1, 0),
            self._analyze_source(
                "b.js",
                head
                + "module.exports=()=>axios.post('/number_pool',"
                + f"{{messaging_profile_id:'MP_x',to:'+1'}},{cfg});\n",
            ),
        )
        # A non-required path through the same shape stays safe.
        self.assertEqual(
            (0, 0),
            self._analyze_source(
                "c.js",
                head + f"module.exports=()=>axios.post('/other',{{to:'+1'}},{cfg});\n",
            ),
        )

    def test_csharp_httpclient_json_extension_contract_matrix(self) -> None:
        """Cover the official mutating System.Net.Http.Json call surface.

        Microsoft exposes Post/Put/PatchAsJsonAsync with string and Uri URLs,
        inferred or explicit TValue, JsonSerializerOptions or JsonTypeInfo, and
        cancellation-token overloads.  Extension methods can also be invoked
        through an instance, the static class (including using-static/type
        aliases), a null-safe receiver, or an expression receiver.  Every
        supported shape is checked in missing, compliant, and non-required
        polarities so adding a call name without selecting its value argument
        cannot turn the fail-safe into a false block.
        """

        namespace = runpy.run_path(
            str(MESSAGING_SOURCE_ANALYZER),
            run_name="telnyx_csharp_json_extension_contract",
        )
        analyze = namespace["analyze_file"]
        fetch_pattern = namespace["FETCH_CALL_RE"]
        declared = (
            namespace["CSHARP_HTTP_CONTENT_METHODS"]
            + namespace["CSHARP_JSON_MUTATING_METHOD_NAMES"]
        )
        for method in declared:
            with self.subTest(method=method, inventory="direct"):
                self.assertIsNotNone(fetch_pattern.search(method + "(url, value)"))
        for method in namespace["CSHARP_JSON_MUTATING_METHOD_NAMES"]:
            with self.subTest(method=method, inventory="explicit-generic"):
                self.assertIsNotNone(
                    fetch_pattern.search(
                        method + "<Dictionary<string, Payload>>(url, value)"
                    )
                )

        def run(source: str) -> tuple[int, int]:
            with tempfile.TemporaryDirectory(
                prefix="telnyx-csharp-json-extension-"
            ) as temp_dir:
                root = Path(temp_dir)
                fixture = root / "Send.cs"
                fixture.write_text(source, encoding="utf-8")
                total, missing = analyze(fixture, root)
                return total, len(missing)

        required = "https://api.telnyx.com/v2/messages/number_pool"
        safe = "https://api.telnyx.com/v2/messages"
        present = (
            'new { to = "+1", messaging_profile_id = '
            '"00000000-0000-4000-8000-000000000001" }'
        )
        absent = 'new { to = "+1" }'

        def forms(method: str, url: str, payload: str) -> dict[str, str]:
            return {
                "instance-string": (
                    f'await client.{method}("{url}", {payload});'
                ),
                "instance-uri-cancellation": (
                    f'await client.{method}(new Uri("{url}"), {payload}, ct);'
                ),
                "instance-options": (
                    f'await client.{method}("{url}", {payload}, options, ct);'
                ),
                "instance-type-info": (
                    "JsonTypeInfo<object> typeInfo = GetTypeInfo();\n"
                    f'await client.{method}(new Uri("{url}"), {payload}, '
                    "typeInfo, ct);"
                ),
                "explicit-generic": (
                    f'await client.{method}<object>('
                    f'"{url}", {payload}, options, ct);'
                ),
                "qualified-static": (
                    "await System.Net.Http.Json.HttpClientJsonExtensions."
                    f'{method}(client, new Uri("{url}"), {payload}, options, ct);'
                ),
                "using-static": (
                    "using static System.Net.Http.Json.HttpClientJsonExtensions;\n"
                    f'await {method}(client, "{url}", {payload}, ct);'
                ),
                "aliased-static": (
                    "using JsonHttp = System.Net.Http.Json.HttpClientJsonExtensions;\n"
                    f'await JsonHttp.{method}(client, "{url}", {payload}, '
                    "options, ct);"
                ),
                "global-aliased-static": (
                    "global using JsonHttp = "
                    "System.Net.Http.Json.HttpClientJsonExtensions;\n"
                    f'await JsonHttp.{method}(client, "{url}", {payload}, '
                    "options, ct);"
                ),
                "named-reordered": (
                    f"await client.{method}(value: {payload}, "
                    f'requestUri: new Uri("{url}"), cancellationToken: ct);'
                ),
                "null-safe-instance": (
                    f'await client?.{method}("{url}", {payload});'
                ),
                "expression-instance": (
                    f'await GetClient().{method}("{url}", {payload});'
                ),
            }

        for verb in ("Post", "Put", "Patch"):
            method = verb + "AsJsonAsync"
            for form, source in forms(method, required, absent).items():
                with self.subTest(verb=verb, form=form, polarity="missing"):
                    self.assertEqual((1, 1), run(source))
            for form, source in forms(method, required, present).items():
                with self.subTest(verb=verb, form=form, polarity="present"):
                    self.assertEqual((1, 0), run(source))
            for form, source in forms(method, safe, absent).items():
                with self.subTest(verb=verb, form=form, polarity="safe"):
                    self.assertEqual((0, 0), run(source))

            for path, expected in (
                ("number_pool", (1, 0)),
                ("messages", (0, 0)),
            ):
                source = (
                    "client.BaseAddress = new Uri("
                    '"https://api.telnyx.com/v2/messages/");\n'
                    f'await client.{method}("{path}", {present});'
                )
                with self.subTest(verb=verb, form="base-address", path=path):
                    self.assertEqual(expected, run(source))

        # The same inventory omission also hid HttpClient's ordinary PUT/PATCH
        # body overloads. They share the URL/body signature with PostAsync.
        encoded_present = (
            'new StringContent("{\\"messaging_profile_id\\":'
            '\\"00000000-0000-4000-8000-000000000001\\",'
            '\\"to\\":\\"+1\\"}")'
        )
        encoded_absent = 'new StringContent("{\\"to\\":\\"+1\\"}")'
        for method in ("PostAsync", "PutAsync", "PatchAsync"):
            with self.subTest(method=method, polarity="missing"):
                self.assertEqual(
                    (1, 1),
                    run(f'await client.{method}("{required}", {encoded_absent});'),
                )
            with self.subTest(method=method, polarity="present"):
                self.assertEqual(
                    (1, 0),
                    run(f'await client.{method}("{required}", {encoded_present});'),
                )
            with self.subTest(method=method, polarity="safe"):
                self.assertEqual(
                    (0, 0),
                    run(f'await client.{method}("{safe}", {encoded_absent});'),
                )

        # The newly advertised PascalCase methods belong to .NET. An unrelated
        # method with the same spelling in another advertised language must not
        # become a transport call merely because it appears in the shared call
        # inventory.
        with tempfile.TemporaryDirectory(
            prefix="telnyx-csharp-json-extension-language-scope-"
        ) as temp_dir:
            root = Path(temp_dir)
            fixture = root / "Unrelated.java"
            fixture.write_text(
                f'helper.PutAsJsonAsync("{required}", payload);',
                encoding="utf-8",
            )
            total, findings = analyze(fixture, root)
            self.assertEqual(1, total)
            self.assertEqual(1, len(findings))
            self.assertIn("could not verify this send", findings[0])

        # Pin the real public entry point from the review, not only the Python
        # analyzer API: compliant JSON sends must unblock the migration, while
        # the missing-profile polarity remains an actionable issue.
        result, payload = self.run_messaging_linter(
            {
                "Send.cs": (
                    f'await client.PostAsJsonAsync("{required}", {present});'
                )
            }
        )
        profile_check = next(
            check
            for check in payload["checks"]
            if check["name"] == "required_messaging_profile_id"
        )
        self.assertEqual(0, result.returncode)
        self.assertEqual("pass", profile_check["status"])

        result, payload = self.run_messaging_linter(
            {
                "Send.cs": (
                    f'await client.PostAsJsonAsync("{required}", {absent});'
                )
            }
        )
        profile_check = next(
            check
            for check in payload["checks"]
            if check["name"] == "required_messaging_profile_id"
        )
        self.assertEqual(1, result.returncode)
        self.assertEqual("issue", profile_check["status"])

    def test_required_send_contract_matrix(self) -> None:
        """Cross-product contract matrix over the SUPPORTED SURFACE.

        Built from the code's own inventory (FETCH_CALL_RE call forms, the
        base-URL/payload resolution branches, JS_TS_SUFFIXES and
        SUFFIX_LANGUAGE_ALIASES) rather than from cases we happened to imagine,
        so every client signature is exercised in both polarities. Earlier
        suites were exhaustive only over the branches already implemented, which
        is why array/per-request-config/handle-reuse forms went missing.
        """
        url = "https://api.telnyx.com/v2/messages/number_pool"
        other = "https://api.telnyx.com/v2/messages/other"
        base = "https://api.telnyx.com/v2/messages/"
        forms = {
            ("js.fetch", ".js"): lambda p: f"fetch('{url}',{{method:'POST',body:JSON.stringify({{{p}to:'+1'}})}});",
            ("js.axios.abs", ".js"): lambda p: f"const axios=require('axios');axios.post('{url}',{{{p}to:'+1'}});",
            ("js.axios.cfg", ".js"): lambda p: f"const axios=require('axios');axios({{method:'post',baseURL:'{base}',url:'./number_pool',data:{{{p}to:'+1'}}}});",
            ("js.axios.helper", ".js"): lambda p: f"const axios=require('axios');axios.post('/number_pool',{{{p}to:'+1'}},{{baseURL:'{base}'}});",
            ("js.axios.factory", ".js"): lambda p: f"const axios=require('axios');const api=axios.create({{baseURL:'{base}'}});api.post('/number_pool',{{{p}to:'+1'}});",
            ("py.requests", ".py"): lambda p: f"import requests\nrequests.post('{url}', json={{{p}'to':'+1'}})",
            ("php.guzzle.abs", ".php"): lambda p: f'<?php\n$c=new GuzzleHttp\\Client();\n$c->post("{url}",["json"=>[{p}"to"=>"+1"]]);',
            ("php.curl.setopt", ".php"): lambda p: f'<?php\n$ch=curl_init();\ncurl_setopt($ch,CURLOPT_URL,"{url}");\ncurl_setopt($ch,CURLOPT_POST,true);\ncurl_setopt($ch,CURLOPT_POSTFIELDS,json_encode([{p}"to"=>"+1"]));\ncurl_exec($ch);',
            ("php.curl.array", ".php"): lambda p: f'<?php\n$ch=curl_init();\ncurl_setopt_array($ch,[CURLOPT_URL=>"{url}",CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>json_encode([{p}"to"=>"+1"])]);\ncurl_exec($ch);',
            ("php.curl.reuse", ".php"): lambda p: f'<?php\n$ch=curl_init();\ncurl_setopt($ch,CURLOPT_URL,"{other}");\ncurl_setopt($ch,CURLOPT_POST,true);\ncurl_setopt($ch,CURLOPT_POSTFIELDS,json_encode([{p}"to"=>"+1"]));\ncurl_exec($ch);\ncurl_setopt($ch,CURLOPT_URL,"{url}");\ncurl_exec($ch);',
            ("rb.nethttp", ".rb"): lambda p: f'Net::HTTP.post(URI("{url}"), {{{p}to: "+1"}}.to_json)',
            ("rb.faraday", ".rb"): lambda p: f'conn = Faraday.new(url: "{base}")\nconn.post("number_pool", {{{p}to: "+1"}}.to_json)',
            ("go.post", ".go"): lambda p: f'body := []byte(`{{{p}"to":"+1"}}`)\nhttp.Post("{url}","application/json",bytes.NewBuffer(body))',
            # NewRequest builds; client.Do(req) sends. The execution link is
            # required or a request that is merely constructed is reported.
            ("go.newrequest", ".go"): lambda p: f'body := []byte(`{{{p}"to":"+1"}}`)\nreq, _ := http.NewRequest("POST","{url}", bytes.NewBuffer(body))\nclient.Do(req)',
            ("java.httpclient", ".java"): lambda p: f'String json = "{{{p}\\"to\\":\\"+1\\"}}";\nHttpRequest.newBuilder().uri(URI.create("{url}")).POST(HttpRequest.BodyPublishers.ofString(json)).build();',
            ("cs.postasync", ".cs"): lambda p: f'var content = new StringContent("{{{p}\\"to\\":\\"+1\\"}}");\nawait client.PostAsync("{url}", content);',
        }
        profiles = {
            ".js": 'messaging_profile_id:"MP_x",',
            ".py": "'messaging_profile_id':'MP_x',",
            ".php": '"messaging_profile_id"=>"MP_x",',
            ".rb": 'messaging_profile_id: "MP_x", ',
            ".go": '"messaging_profile_id":"MP_x",',
            ".java": '\\"messaging_profile_id\\":\\"MP_x\\",',
            ".cs": '\\"messaging_profile_id\\":\\"MP_x\\",',
        }
        for (form_id, ext), build in forms.items():
            with self.subTest(form=form_id, profile=False):
                total, missing = self._analyze_source("x" + ext, build(""))
                self.assertGreaterEqual(total, 1, form_id)
                self.assertGreaterEqual(missing, 1, form_id)
            with self.subTest(form=form_id, profile=True):
                total, missing = self._analyze_source(
                    "x" + ext, build(profiles[ext])
                )
                self.assertGreaterEqual(total, 1, form_id)
                self.assertEqual(0, missing, form_id)

        # Non-mutating and non-required shapes must not be counted at all.
        zero = {
            ("get.js.method", ".js"): f"fetch('{url}',{{method:'GET'}});",
            ("get.js.default", ".js"): f"fetch('{url}');",
            ("get.py", ".py"): f"import requests\nrequests.get('{url}')",
            ("get.php.curlarray", ".php"): f'<?php\n$ch=curl_init();\ncurl_setopt_array($ch,[CURLOPT_URL=>"{url}",CURLOPT_HTTPGET=>true]);\ncurl_exec($ch);',
            ("get.php.reuse_reset", ".php"): f'<?php\n$ch=curl_init();\ncurl_setopt($ch,CURLOPT_URL,"{other}");\ncurl_setopt($ch,CURLOPT_POST,true);\ncurl_setopt($ch,CURLOPT_POSTFIELDS,"{{}}");\ncurl_exec($ch);\ncurl_reset($ch);\ncurl_setopt($ch,CURLOPT_URL,"{url}");\ncurl_exec($ch);',
            ("get.go", ".go"): f'http.Get("{url}")',
            ("nonreq.js", ".js"): f"fetch('{other}',{{method:'POST',body:'{{}}'}});",
        }
        for (form_id, ext), source in zero.items():
            with self.subTest(form=form_id):
                total, _ = self._analyze_source("x" + ext, source)
                self.assertEqual(0, total, form_id)

    def test_try_body_is_a_guard_in_every_language(self) -> None:
        # A `try` body is not unconditional: when a sibling handler swallows the
        # error, execution continues past the statement with the profile write
        # skipped, so a send AFTER the statement can go out without it. Ruby's
        # begin/rescue was already treated as an arm; Python `try:` and the
        # braced `try { }` of PHP/JS/Java/C# were not — the same defect class in
        # every other supported language.
        url = "https://api.telnyx.com/v2/messages/number_pool"
        guarded = {
            "a.py": (
                "import requests\npl={\"to\":\"+1\"}\ntry:\n"
                "    pl[\"messaging_profile_id\"]=mp\nexcept Exception:\n    pass\n"
                f"requests.post(\"{url}\", json=pl)\n"
            ),
            "b.js": (
                "const p={to:'+1'};\ntry { p.messaging_profile_id=mp; } catch(e) {}\n"
                f"fetch('{url}',{{method:'POST',body:JSON.stringify(p)}});\n"
            ),
            "c.php": (
                '<?php\n$p=["to"=>"+1"];\n'
                'try { $p["messaging_profile_id"]=$mp; } catch (Exception $e) {}\n'
                '$c=new GuzzleHttp\\Client();\n'
                f'$c->post("{url}",["json"=>$p]);\n'
            ),
        }
        for name, source in guarded.items():
            self.assertEqual(
                (1, 1), self._analyze_source(name, source), name
            )

        # A send INSIDE the same try body shares the arm — not a guard, and must
        # not be reported (the write cannot be skipped while the send happens).
        self.assertEqual(
            (1, 0),
            self._analyze_source(
                "d.js",
                "try {\n const p={messaging_profile_id:mp,to:'+1'};\n"
                f" fetch('{url}',{{method:'POST',body:JSON.stringify(p)}});\n"
                "} catch(e) {}\n",
            ),
        )
        # `finally` always runs, so a write there is still unconditional.
        self.assertEqual(
            (1, 0),
            self._analyze_source(
                "e.py",
                "import requests\npl={\"to\":\"+1\"}\ntry:\n    pass\nfinally:\n"
                "    pl[\"messaging_profile_id\"]=mp\n"
                f"requests.post(\"{url}\", json=pl)\n",
            ),
        )

    def test_reraising_handler_leaves_the_try_body_unconditional(self) -> None:
        # A handler that RE-RAISES does not swallow the error, so execution can
        # never continue past the statement with the profile write skipped — a
        # later send is unreachable without it. Log-and-rethrow
        # (`catch (e) { log(e); throw e; }` / `except: log(e); raise`) is the
        # standard idiom, and treating it as a guard reported compliant
        # migrations as missing the profile.
        url = "https://api.telnyx.com/v2/messages/number_pool"
        unconditional = {
            "a.py": (
                "import requests\npl={\"to\":\"+1\"}\ntry:\n"
                "    pl[\"messaging_profile_id\"]=mp\nexcept Exception as e:\n"
                "    log(e)\n    raise\n"
                f"requests.post(\"{url}\", json=pl)\n"
            ),
            "b.js": (
                "const p={to:'+1'};\n"
                "try { p.messaging_profile_id=mp; } catch(e) { log(e); throw e; }\n"
                f"fetch('{url}',{{method:'POST',body:JSON.stringify(p)}});\n"
            ),
            "c.php": (
                '<?php\n$p=["to"=>"+1"];\n'
                'try { $p["messaging_profile_id"]=$mp; }'
                ' catch (Exception $e) { log($e); throw $e; }\n'
                '$c=new GuzzleHttp\\Client();\n'
                f'$c->post("{url}",["json"=>$p]);\n'
            ),
        }
        for name, source in unconditional.items():
            self.assertEqual((1, 0), self._analyze_source(name, source), name)

        # ONE swallowing handler is enough to make the body conditional again,
        # so a mixed handler list stays flagged.
        self.assertEqual(
            (1, 1),
            self._analyze_source(
                "d.py",
                "import requests\npl={\"to\":\"+1\"}\ntry:\n"
                "    pl[\"messaging_profile_id\"]=mp\nexcept ValueError:\n"
                "    raise\nexcept Exception:\n    pass\n"
                f"requests.post(\"{url}\", json=pl)\n",
            ),
        )
        # A re-raise nested under a condition can be skipped, so it swallows.
        self.assertEqual(
            (1, 1),
            self._analyze_source(
                "e.py",
                "import requests\npl={\"to\":\"+1\"}\ntry:\n"
                "    pl[\"messaging_profile_id\"]=mp\nexcept Exception:\n"
                "    if fatal:\n        raise\n"
                f"requests.post(\"{url}\", json=pl)\n",
            ),
        )

    def test_php_curl_setopt_array_and_carried_handle_state(self) -> None:
        # (1) curl_setopt_array is as idiomatic as repeated curl_setopt calls,
        # but the array form was never visited, so a number-pool send configured
        # this way escaped the requirement entirely.
        array_post = (
            '<?php\n$ch=curl_init();\n'
            'curl_setopt_array($ch,[CURLOPT_URL=>'
            '"https://api.telnyx.com/v2/messages/number_pool",'
            'CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>"{}"]);\ncurl_exec($ch);\n'
        )
        self.assertEqual((1, 1), self._analyze_source("a.php", array_post))
        # The array form carrying a usable profile is not flagged.
        self.assertEqual(
            (1, 0),
            self._analyze_source(
                "b.php",
                array_post.replace(
                    'CURLOPT_POSTFIELDS=>"{}"',
                    'CURLOPT_POSTFIELDS=>'
                    'json_encode(["messaging_profile_id"=>"MP_x"])',
                ),
            ),
        )
        # An array that configures a GET is not a send at all.
        self.assertEqual(
            (0, 0),
            self._analyze_source(
                "c.php",
                '<?php\n$ch=curl_init();\n'
                'curl_setopt_array($ch,[CURLOPT_URL=>'
                '"https://api.telnyx.com/v2/messages/number_pool",'
                'CURLOPT_HTTPGET=>true]);\ncurl_exec($ch);\n',
            ),
        )
        # (2) ext-curl options PERSIST across curl_exec until overwritten or
        # reset. A handle that posts, then changes only CURLOPT_URL, is still
        # POSTing — starting state after the previous exec made it look like a
        # fresh GET and the required send was reported clean.
        reused = (
            '<?php\n$ch=curl_init();\n'
            'curl_setopt($ch,CURLOPT_URL,"https://api.telnyx.com/v2/other");\n'
            'curl_setopt($ch,CURLOPT_POST,true);\n'
            'curl_setopt($ch,CURLOPT_POSTFIELDS,"{}");\ncurl_exec($ch);\n'
            'curl_setopt($ch,CURLOPT_URL,'
            '"https://api.telnyx.com/v2/messages/number_pool");\n'
            'curl_exec($ch);\n'
        )
        self.assertEqual((1, 1), self._analyze_source("d.php", reused))
        # curl_reset clears the carried state -> the second call is a GET.
        self.assertEqual(
            (0, 0),
            self._analyze_source(
                "e.php", reused.replace("curl_exec($ch);\ncurl_setopt($ch,CURLOPT_URL,"
                                        '"https://api.telnyx.com/v2/messages/number_pool");',
                                        "curl_exec($ch);\ncurl_reset($ch);\n"
                                        'curl_setopt($ch,CURLOPT_URL,'
                                        '"https://api.telnyx.com/v2/messages/number_pool");',
                                        1)
            ),
        )
        # Explicitly switching the reused handle back to GET is also clean.
        self.assertEqual(
            (0, 0),
            self._analyze_source(
                "f.php",
                reused.replace(
                    'curl_setopt($ch,CURLOPT_URL,'
                    '"https://api.telnyx.com/v2/messages/number_pool");',
                    'curl_setopt($ch,CURLOPT_HTTPGET,true);\n'
                    'curl_setopt($ch,CURLOPT_URL,'
                    '"https://api.telnyx.com/v2/messages/number_pool");',
                    1,
                ),
            ),
        )

    def test_inline_language_speech_model_requires_conversation_relay_parent(
        self,
    ) -> None:
        _, payload = self.run_messaging_linter(
            {
                "valid-language.js": (
                    "const texml = `<tw:Response><tw:Connect>"
                    "<tw:ConversationRelay><tw:Language "
                    "speechModel=\"phone_call\"/></tw:ConversationRelay>"
                    "</tw:Connect></tw:Response>`;"
                ),
                "invalid-language.js": (
                    "const texml = `<Response><Language "
                    "speechModel=\"phone_call\"/></Response>`;"
                ),
            },
            product="voice",
        )
        checks = [
            check
            for check in payload["checks"]
            if check["name"] == "speech_model_attr"
        ]
        self.assertEqual(1, len(checks))
        finding_files = checks[0]["details"]["files"]
        self.assertTrue(
            any("/invalid-language.js:" in finding for finding in finding_files)
        )
        self.assertFalse(
            any("/valid-language.js:" in finding for finding in finding_files)
        )


class AnalyzerConsistencyContracts(unittest.TestCase):
    def test_texml_runtime_guidance_matches_analyzer_contracts(self) -> None:
        skill = (ROOT / "skills/telnyx-twilio-migration/SKILL.md").read_text(
            encoding="utf-8"
        )
        verbs = (
            ROOT / "skills/telnyx-twilio-migration/references/texml-verbs.md"
        ).read_text(encoding="utf-8")
        self.assertNotIn("`speechModel` does NOT exist in TeXML", skill)
        self.assertIn("<Language speechModel", skill)
        self.assertIn("map to the corresponding TeXML element's `model`", skill)
        self.assertNotIn("non-Neural voices may fall back", skill)
        self.assertNotIn("non-Neural voices may fall back", verbs)
        self.assertIn("Preserve a documented provider-prefixed voice", verbs)

    def test_analyzer_and_shell_exclude_the_same_generated_directories(self) -> None:
        canonical = {
            ".next", ".nuxt", "coverage", ".tox", "node_modules", "dist", "build"
        }
        shell = CORRECTNESS_LINTER.read_text(encoding="utf-8")
        declared = re.search(
            r'^EXCLUDE_DIRS="([^"]*)"', shell, re.MULTILINE
        )
        self.assertIsNotNone(declared, "shell linter has no EXCLUDE_DIRS")
        shell_dirs = set(declared.group(1).split())
        self.assertEqual(set(), canonical - shell_dirs)
        self.assertGreaterEqual(
            shell.count('\\( "${FIND_EXCLUDE_EXPR[@]}" \\) -prune'),
            2,
            "every shell find traversal must derive pruning from EXCLUDE_DIRS",
        )
        self.assertIn(
            "excluded_dirs = set(sys.argv[3].split())",
            shell,
            "the embedded Python traversal must derive the same policy",
        )

        analyzer = MESSAGING_SOURCE_ANALYZER.read_text(encoding="utf-8")
        block = analyzer.split("EXCLUDED_DIRS = {", 1)[1]
        analyzer_dirs = set(
            re.findall(r'"([^"]+)"', block[: block.index("}")])
        )
        self.assertEqual(shell_dirs, analyzer_dirs)


if __name__ == "__main__":
    unittest.main()
