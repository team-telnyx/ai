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
SCAN_USAGE_SCRIPT = MIGRATION_SCRIPTS.parent / "scan-twilio-usage.sh"
DEEP_SCAN_SCRIPT = MIGRATION_SCRIPTS.parent / "scan-twilio-deep.py"
VALIDATE_MIGRATION_SCRIPT = MIGRATION_SCRIPTS.parent / "validate-migration.sh"
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

    def test_csharp_twilio_message_send_and_client_init_are_actionable(self) -> None:
        result, payload = self.run_messaging_linter(
            {
                "Program.cs": (
                    "using Twilio;\n"
                    "using Twilio.Rest.Api.V2010.Account;\n"
                    "TwilioClient.Init(accountSid, authToken);\n"
                    "var message = MessageResource.Create(\n"
                    "  from: new PhoneNumber(from),\n"
                    "  to: new PhoneNumber(to),\n"
                    "  body: \"Ahoy from Twilio!\"\n"
                    ");\n"
                )
            }
        )
        self.assertEqual(1, result.returncode)
        statuses = {item["name"]: item["status"] for item in payload["checks"]}
        self.assertEqual("issue", statuses["twilio_messages_create"])
        self.assertEqual("issue", statuses["body_not_text"])
        self.assertEqual("issue", statuses["twilio_client_instantiation"])

    def test_csharp_body_checks_require_sdk_ownership(self) -> None:
        sources = (
            ('class MessageResource { public static void Create(string body) {} }\n'
             'class Queue { void Send() { MessageResource.Create(body: "data"); } }', False),
            ('using Twilio.Rest.Api.V2010.Account;\n'
             'class MessageResource { public static void Create(string body) {} }\n'
             'MessageResource.Create(body: "data");', False),
            ('using MessageResource = Example.Queue;\n'
             'using Twilio.Rest.Api.V2010.Account;\nMessageResource.Create(body: "data");', False),
            ('using Sms = Twilio.Rest.Api.V2010.Account.MessageResource;\nSms.Create(body: "data");', True),
            ('using Api = Twilio.Rest.Api.V2010.Account;\nApi.MessageResource.Create(body: "data");', True),
            ('global::Twilio.Rest.Api.V2010.Account.MessageResource.Create(body: "data");', True),
            ('using static Twilio.Rest.Api.V2010.Account.MessageResource;\nCreate(body: "data");', True),
            ('namespace A { using Twilio.Rest.Api.V2010.Account; }\n'
             'namespace B { class Queue { void Send() { MessageResource.Create(body: "data"); } } }', False),
            ('using Sms = Twilio.Rest.Api.V2010.Account.MessageResource;\n'
             'class X { void Go() { var Sms = new Queue(); Sms.Create(body: "data"); } }', False),
            ('using Api = Twilio.Rest.Api.V2010.Account;\n'
             'class X { void Go() { var Api = new Queue(); Api.MessageResource.Create(body: "data"); } }', False),
            ('using Sms = Twilio.Rest.Api.V2010.Account.MessageResource;\n'
             'class X { void Go(Queue Sms) { Sms.Create(body: "data"); } }', False),
            ('using Sms = Twilio.Rest.Api.V2010.Account.MessageResource;\n'
             'class X { void Other() { var Sms = new Queue(); }\n'
             'void Go() { Sms.Create(body: "data"); } }', True),
            ('using Sms = Twilio.Rest.Api.V2010.Account.MessageResource;\n'
             'class X { void Go() { { var Sms = new Queue(); } Sms.Create(body: "data"); } }', True),
        )
        for source, expected in sources:
            with self.subTest(source=source):
                _, payload = self.run_messaging_linter({"Program.cs": source})
                statuses = {item["name"]: item["status"] for item in payload["checks"]}
                for check in ("twilio_messages_create", "body_not_text"):
                    self.assertEqual("issue" if expected else "pass", statuses[check])

    def test_csharp_generic_body_calls_are_preserved(self) -> None:
        for field, expected in (("Body", "issue"), ("Text", "pass")):
            with self.subTest(field=field):
                _, payload = self.run_messaging_linter({"Program.cs": (
                    'client.Messages.Send(new MessageCreateOptions { '
                    f'{field} = "hello", To = "+1"' + ' });'
                )})
                statuses = {item["name"]: item["status"] for item in payload["checks"]}
                self.assertEqual(expected, statuses["body_not_text"])
                self.assertEqual("pass", statuses["twilio_messages_create"])

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

    def test_php_closing_tags_inside_data_do_not_end_executable_regions(self) -> None:
        """Only a lexical PHP closing tag can return to template markup."""

        send = (
            "$client->post('https://api.telnyx.com/v2/messages/number_pool', "
            "['json' => ['to' => '+1'%s]]);"
        )
        prefixes = {
            "single-quoted": "$value = '?>';\n",
            "double-quoted": '$value = "?>";\n',
            "backtick": "$value = `printf '?>'`;\n",
            "block-comment": "/* ?> is documentation */\n",
            "heredoc": "$value = <<<TEXT\n?>\nTEXT;\n",
            "nowdoc": "$value = <<<'TEXT'\n?>\nTEXT;\n",
        }
        for suffix in (".php", ".phtml"):
            for label, prefix in prefixes.items():
                for polarity, profile in (
                    ("missing", ""),
                    ("present", ", 'messaging_profile_id' => 'mp'"),
                ):
                    with self.subTest(
                        suffix=suffix, data=label, polarity=polarity
                    ):
                        files = {
                            "send" + suffix: "<?php\n" + prefix + send % profile + "\n?>"
                        }
                        if polarity == "missing":
                            _, payload = self.run_messaging_linter(files)
                            self.assert_required_profile_detected(
                                payload, "send" + suffix
                            )
                        else:
                            self.assert_required_profile_passes(files)

        # A real closing tag still excludes call-shaped markup that follows.
        self.assert_required_profile_passes(
            {
                "template.phtml": (
                    "<?php $value = 'safe'; ?>\n"
                    "<pre>client.messages['sendNumberPool']({to: '+1'})</pre>\n"
                )
            }
        )

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

    def test_go_request_constructor_signatures_through_wrapper(self) -> None:
        # net/http.NewRequestWithContext inserts ctx before method, URL, body.
        url = '"https://api.telnyx.com/v2/messages/number_pool"'
        for profile in (False, True):
            files = {}
            for constructor in ("NewRequest", "NewRequestWithContext"):
                for alias in (False, True):
                    context = "ctx, " if constructor.endswith("WithContext") else ""
                    field = ', "messaging_profile_id": "mp"' if profile else ""
                    endpoint = "endpoint" if alias else url
                    name = f"{constructor}_{'alias' if alias else 'direct'}.go"
                    files[name] = (
                        "package main\nfunc send() {\n"
                        + (f"endpoint := {url}\n" if alias else "")
                        + 'payload := map[string]string{"to": "+1", "text": "hi"'
                        + field + "}\nbody, _ := json.Marshal(payload)\n"
                        + f'req, _ := http.{constructor}({context}"POST", '
                        + f"{endpoint}, bytes.NewBuffer(body))\n"
                        + "http.DefaultClient.Do(req)\n}\n"
                    )
            result, payload = self.run_messaging_linter(files)
            with self.subTest(profile=profile):
                self.assertEqual(0 if profile else 1, result.returncode, payload)
            if profile:
                self.assertEqual("pass", next(
                    item["status"] for item in payload["checks"]
                    if item["name"] == "required_messaging_profile_id"
                ), payload)
            else:
                for name in files:
                    with self.subTest(profile=profile, file=name):
                        self.assert_required_profile_detected(payload, name)

    def test_node_request_overloads_attach_body_to_returned_handle(self) -> None:
        # http(s).request supports (options[, callback]) and
        # (url[, options][, callback]); a callback is never the request body.
        for profile in (False, True):
            files = {}
            for transport in ("http", "https"):
                for url_overload in (False, True):
                    for callback in (False, True):
                        for body_method in ("write", "end"):
                            name = (
                                f"{transport}_{'url' if url_overload else 'options'}"
                                f"_{callback}_{body_method}.js"
                            )
                            options = "{method:'POST'"
                            if not url_overload:
                                options += (
                                    ",hostname:'api.telnyx.com',"
                                    "path:'/v2/messages/number_pool'"
                                )
                            options += "}"
                            args = options
                            if url_overload:
                                args = f"'{transport}://api.telnyx.com/v2/messages/number_pool', " + args
                            if callback:
                                args += ", response => response.resume()"
                            field = ",messaging_profile_id:'mp'" if profile else ""
                            files[name] = (
                                f"const {transport} = require('{transport}');\n"
                                f"const payload = JSON.stringify({{to:'+1',text:'hi'{field}}});\n"
                                f"const req = {transport}.request({args});\n"
                                f"req.{body_method}(payload);\n"
                                + ("req.end();\n" if body_method == "write" else "")
                            )
            result, payload = self.run_messaging_linter(files)
            with self.subTest(profile=profile):
                self.assertEqual(0 if profile else 1, result.returncode, payload)
            if profile:
                self.assertEqual("pass", next(
                    item["status"] for item in payload["checks"]
                    if item["name"] == "required_messaging_profile_id"
                ), payload)
            else:
                for name in files:
                    with self.subTest(profile=profile, file=name):
                        self.assert_required_profile_detected(payload, name)

    def test_request_signature_read_only_and_unrelated_handle_controls(self) -> None:
        url = "https://api.telnyx.com/v2/messages/number_pool"
        files = {}
        for constructor in ("NewRequest", "NewRequestWithContext"):
            context = "ctx, " if constructor.endswith("WithContext") else ""
            for label, method in (("get", '"GET"'), ("default", '""')):
                files[f"{constructor}_{label}.go"] = (
                    f'endpoint := "{url}"\n'
                    f"req, _ := http.{constructor}({context}{method}, endpoint, nil)\n"
                    "http.DefaultClient.Do(req)\n"
                )
        for transport in ("http", "https"):
            for options in ("{}", "{method:'GET'}"):
                files[f"{transport}_{'get' if 'GET' in options else 'default'}.js"] = (
                    f"const {transport} = require('{transport}');\n"
                    f"const req = {transport}.request('{url}', {options}, res => res.resume());\n"
                    "req.end();\n"
                )
        self.assert_required_profile_passes(files)

        # A valid profile written to a different request must not satisfy req.
        result, payload = self.run_messaging_linter({"unrelated.js": (
            "const https = require('https');\n"
            f"const req = https.request('{url}', {{method:'POST'}}, res => res.resume());\n"
            "const other = https.request('https://example.com/events', {method:'POST'});\n"
            "other.write(JSON.stringify({messaging_profile_id:'mp'}));\n"
            "other.end();\nreq.end(JSON.stringify({to:'+1',text:'hi'}));\n"
        )})
        self.assertEqual(1, result.returncode, payload)
        self.assert_required_profile_detected(payload, "unrelated.js")

    def test_node_request_handle_lifetime_and_alias_matrix(self) -> None:
        url = "https://api.telnyx.com/v2/messages/number_pool"
        request = f"https.request('{url}', {{method:'POST'}})"
        other = "https.request('https://example.com/events', {method:'POST'})"
        present = "JSON.stringify({to:'+1',messaging_profile_id:'mp'})"
        absent = "JSON.stringify({to:'+1'})"
        prefix = "const https = require('https');\n"
        negatives = {
            "sibling.js": (
                f"function first() {{ const req = {request}; req.write({absent}); }}\n"
                f"function second() {{ const req = {other}; req.end({present}); }}\n"
            ),
            "shadow.js": (
                f"const req = {request};\n"
                f"{{ const req = {other}; req.end({present}); }}\n"
                f"req.end({absent});\n"
            ),
            "reassigned.js": (
                f"let req = {request}; req.write({absent});\n"
                f"req = {other}; req.end({present});\n"
            ),
            "after_end.js": (
                f"const req = {request}; req.end({absent});\n"
                f"req.write({present});\n"
            ),
            "callback_decoy.js": (
                f"const req = https.request('{url}', {{method:'POST'}}, res => {{\n"
                f"  const body = {present}; console.log(body);\n"
                "});\nreq.end();\n"
            ),
            "end_callback.js": (
                f"const req = {request};\n"
                f"req.end(() => {{ const body = {present}; console.log(body); }});\n"
            ),
        }
        result, payload = self.run_messaging_linter({
            name: prefix + source for name, source in negatives.items()
        })
        self.assertEqual(1, result.returncode, payload)
        for name in negatives:
            with self.subTest(case=name):
                self.assert_required_profile_detected(payload, name)

        positives = {}
        for suffix in ("js", "ts"):
            for url_overload in (False, True):
                for body_method in ("write", "end"):
                    options = "{method:'POST'"
                    if not url_overload:
                        options += ",hostname:'api.telnyx.com',path:'/v2/messages/number_pool'"
                    options += "}"
                    args = "endpoint, options" if url_overload else "options"
                    name = f"aliases_{url_overload}_{body_method}.{suffix}"
                    positives[name] = (
                        prefix + f"const endpoint = '{url}';\nconst options = {options};\n"
                        f"const req = https.request({args}, res => res.resume());\n"
                        f"req.{body_method}({present});\n"
                        + ("req.end();\n" if body_method == "write" else "")
                    )
        self.assert_required_profile_passes(positives)

    def test_node_request_execution_paths_and_chained_bodies(self) -> None:
        endpoint = "https://api.telnyx.com/v2/messages/number_pool"
        present = "JSON.stringify({to:'+1',messaging_profile_id:'mp'})"
        absent = "JSON.stringify({to:'+1'})"
        request = f"https.request('{endpoint}', {{method:'POST'}})"
        prefix = "const https = require('node:https');\n"
        cases = {
            "dead_write": (f"const req={request}; if(false){{req.write({present});}} req.end({absent});", False),
            "dead_end": (f"const req={request}; if(false){{req.end();}} req.end({present});", True),
            "optional_write": (f"const req={request}; if(flag){{req.write({present});}} req.end();", False),
            "both_ends_present": (f"const req={request}; if(flag){{req.end({present});}}else{{req.end({present});}}", True),
            "one_end_missing": (f"const req={request}; if(flag){{req.end({present});}}else{{req.end({absent});}}", False),
            "both_writes_present": (f"const req={request}; if(flag){{req.write({present});}}else{{req.write({present});}} req.end();", True),
            "uninvoked_writer": (f"const req={request}; function unused(){{req.write({present});}} req.end({absent});", False),
            "false_and_write": (f"const req={request}; false && req.write({present}); req.end({absent});", False),
            "true_or_write": (f"const req={request}; true || req.write({present}); req.end({absent});", False),
            "ternary_present": (f"const req={request}; flag ? req.end({present}) : req.end({present});", True),
            "ternary_missing": (f"const req={request}; flag ? req.end({present}) : req.end({absent});", False),
            "handle_alias_present": (f"const req={request}; const out=req; out.end({present});", True),
            "handle_alias_missing": (f"const req={request}; const out=req; out.end({absent});", False),
            "dead_reassignment": (f"let req={request}; if(false){{req=other;}} req.end({present});", True),
            "alias_before_reassignment": (f"let req={request}; const out=req; req=other; out.end({present});", True),
            "alias_after_reassignment": (f"let req={request}; req=other; const out=req; out.end({present});", False),
            "chained_present": (f"{request}.end({present});", True),
            "chained_missing": (f"{request}.end({absent});", False),
            "chained_callback_only": (f"{request}.end(()=>{{const body={present};}});", False),
        }
        for expected in (False, True):
            files = {name + ".js": prefix + source for name, (source, compliant) in cases.items()
                     if compliant == expected}
            result, payload = self.run_messaging_linter(files)
            self.assertEqual(0 if expected else 1, result.returncode, payload)
            if expected:
                self.assertEqual("pass", next(check["status"] for check in payload["checks"]
                                             if check["name"] == "required_messaging_profile_id"), payload)
            else:
                for name in files:
                    with self.subTest(file=name):
                        self.assert_required_profile_detected(payload, name)

    def test_request_member_and_execution_siblings(self) -> None:
        endpoint = "https://api.telnyx.com/v2/messages/number_pool"
        present = "JSON.stringify({to:'+1',messaging_profile_id:'mp'})"
        absent = "JSON.stringify({to:'+1'})"
        prefix = f"const https=require('https'); const req=https.request('{endpoint}',{{method:'POST'}});\n"
        cases = {
            "member_decoy": (f"const state={{req:https.request('https://example.com/events',{{method:'POST'}})}};state.req.end({present});req.end({absent});", False),
            "member_decoy_write": (f"const state={{req:https.request('https://example.com/events',{{method:'POST'}})}};state.req.write({present});state.req.end();req.end({absent});", False),
            "comma": (f"flag && sideEffect(), req.end({present});", True),
            "comma_or": (f"flag || sideEffect(), req.end({present});", True),
            "comma_missing": (f"flag && sideEffect(), req.end({absent});", False),
            "iife_arrow": (f"(()=>req.write({present}))();req.end();", True),
            "iife_function": (f"(function(){{req.write({present});}})();req.end();", True),
            "unused_function": (f"const unused=()=>req.write({present});req.end({absent});", False),
            "callback": (f"setTimeout(()=>req.write({present}),0);req.end({absent});", False),
            "parenthesized_callback": (f"run((function(){{req.write({present});}}));req.end({absent});", False),
            "function_callback": (f"run(function(){{req.write({present});}});req.end({absent});", False),
            "stored_function": (f"const unused=(function(){{req.write({present});}});req.end({absent});", False),
        }
        for expected in (False, True):
            files = {name+'.js':prefix+body for name,(body,good) in cases.items() if good==expected}
            result, payload = self.run_messaging_linter(files)
            self.assertEqual(0 if expected else 1, result.returncode, payload)
            if not expected:
                for name in files:
                    self.assert_required_profile_detected(payload, name)
        for body, expected in ((present,True),(absent,False)):
            source = ("const https=require('https');const state={};"
                      +f"state.req=https.request('{endpoint}',{{method:'POST'}});state.req.end({body});")
            result,payload=self.run_messaging_linter({'member-own.js':source})
            self.assertEqual(0 if expected else 1,result.returncode,payload)
        source = ("const https=require('https');const left={},right={};"
                  +f"left.req=https.request('{endpoint}',{{method:'POST'}});"
                  +"right.req=https.request('https://example.com/events',{method:'POST'});"
                  +f"right.req.end({present});left.req.end({absent});")
        result,payload=self.run_messaging_linter({'member-other.js':source})
        self.assertEqual(1,result.returncode,payload)
        self.assert_required_profile_detected(payload,'member-other.js')
        for mutation in ("state.req=other;", "state={};"):
            source=("const https=require('https');let state={};"
                    +f"state.req=https.request('{endpoint}',{{method:'POST'}});"
                    +mutation+f"state.req.end({present});")
            result,payload=self.run_messaging_linter({'member-reset.js':source})
            self.assertEqual(1,result.returncode,payload)
        source=("const https=require('https');const state={};"
                +f"state.req=https.request('{endpoint}',{{method:'POST'}});"
                +f"const alias=state.req;alias.end({present});")
        self.assert_required_profile_passes({'member-alias.js':source})

    def test_request_closure_defaults_and_abrupt_completion_matrix(self) -> None:
        endpoint = "https://api.telnyx.com/v2/messages/number_pool"
        present = "JSON.stringify({messaging_profile_id:'mp'})"
        absent = "JSON.stringify({to:'+1'})"
        prefix = f"const https=require('https');const req=https.request('{endpoint}',{{method:'POST'}});"
        cases = {
            "stored_arrow_default": (f"const later=(x=req.write({present}))=>{{}};req.end({absent});", False),
            "stored_function_default": (f"const later=function(x=req.write({present})){{}};req.end({absent});", False),
            "callback_default": (f"run((x=req.write({present}))=>{{}});req.end({absent});", False),
            "called_arrow_default": (f"((x=req.write({present}))=>{{}})();req.end();", True),
            "called_function_default": (f"(function(x=req.write({present})){{}})();req.end();", True),
            "supplied_arrow_argument": (f"((x=req.write({present}))=>{{}})(1);req.end({absent});", False),
            "supplied_function_argument": (f"(function(x=req.write({present})){{}})(1);req.end({absent});", False),
            "undefined_default": (f"((x=req.write({present}))=>{{}})(undefined);req.end();", True),
            "void_default": (f"((x=req.write({present}))=>{{}})(void 0);req.end();", True),
            "null_skips_default": (f"((x=req.write({present}))=>{{}})(null);req.end({absent});", False),
            "unreachable_arrow_write": (f"(()=>{{return;req.write({present});}})();req.end({absent});", False),
            "unreachable_function_write": (f"(function(){{return;req.write({present});}})();req.end({absent});", False),
            "conditional_return": (f"(()=>{{if(flag)return;req.write({present});}})();req.end({absent});", False),
            "literal_false_return": (f"(()=>{{if(false)return;req.write({present});}})();req.end();", True),
            "return_expression": (f"(()=>{{return req.write({present});}})();req.end();", True),
            "write_before_return": (f"(()=>{{req.write({present});return;}})();req.end();", True),
            "caught_throw": (f"try{{(()=>{{throw Error();req.write({present});}})();}}catch(e){{}}req.end({absent});", False),
            "conditional_throw": (f"try{{(()=>{{if(flag)throw Error();req.write({present});}})();}}catch(e){{}}req.end({absent});", False),
            "async_default": (f"(async(x=req.write({present}))=>{{}})();req.end({absent});", False),
            "async_await": (f"(async()=>{{await tick();req.write({present});}})();req.end({absent});", False),
            "generator": (f"(function*(){{req.write({present});}})();req.end({absent});", False),
            "call_present": (f"(function(){{req.write({present});}}).call(null);req.end();", True),
            "call_absent": (f"(function(){{req.write({absent});}}).call(null);req.end();", False),
            "ternary_comma_present": (f"flag?side():side(),req.end({present});", True),
            "ternary_comma_absent": (f"flag?side():side(),req.end({absent});", False),
            "nested_comma_guard": (f"flag?(side(),req.write({present})):side();req.end({absent});", False),
            "argument_iife": (f"((out)=>out.write({present}))(req);req.end();", True),
            "argument_iife_missing": (f"((out)=>out.write({absent}))(req);req.end();", False),
            "argument_iife_other": (f"((out)=>out.write({present}))(other);req.end({absent});", False),
            "argument_iife_rebound": (f"((out)=>{{out=other;out.write({present});}})(req);req.end({absent});", False),
            "logical_exhaustive": (f"flag&&req.end({present})||req.end({present});", True),
            "logical_missing_first": (f"flag&&req.end({absent})||req.end({present});", False),
            "logical_missing_last": (f"flag&&req.end({present})||req.end({absent});", False),
            "logical_nonexhaustive": (f"flag&&req.end({present})||other&&req.end({present});", False),
            "logical_grouped_exhaustive": (f"(flag&&req.end({present}))||req.end({present});", True),
            "destructured_default_skipped": (f"(({{x=req.write({present})}}={{x:1}})=>{{}})();req.end({absent});", False),
            "finally_write": (f"(()=>{{try{{return;}}finally{{req.write({present});}}}})();req.end();", True),
            "finally_missing": (f"(()=>{{try{{return;}}finally{{req.write({absent});}}}})();req.end();", False),
        }
        for expected in (False, True):
            selected = [(name + '.js', prefix + body) for name, (body, good) in cases.items() if good == expected]
            # The public report deliberately caps issue details at 20 files.
            for start in range(0, len(selected), 12):
                files = dict(selected[start:start + 12])
                result, payload = self.run_messaging_linter(files)
                self.assertEqual(0 if expected else 1, result.returncode, payload)
                if not expected:
                    for name in files:
                        with self.subTest(file=name):
                            self.assert_required_profile_detected(payload, name)
        source = (prefix.replace("const req=", "let req=") + "const saved=req;const other={write(){}};"
                  + f"(()=>{{try{{return;}}finally{{req=other;}}}})();req.write({present});saved.end({absent});")
        result, payload = self.run_messaging_linter({'finally-rebind.js': source})
        self.assertEqual(1, result.returncode, payload)
        self.assert_required_profile_detected(payload, 'finally-rebind.js')
        source = (prefix.replace("const req=", "let req=") + "const saved=req;const other={write(){}};"
                  + f"(()=>{{try{{throw Error();}}catch(e){{req=other;}}}})();req.write({present});saved.end({absent});")
        result, payload = self.run_messaging_linter({'caught-throw-rebind.js': source})
        self.assertEqual(1, result.returncode, payload)
        self.assert_required_profile_detected(payload, 'caught-throw-rebind.js')

    def test_request_owner_alias_lifetime_matrix(self) -> None:
        endpoint = "https://api.telnyx.com/v2/messages/number_pool"
        present = "JSON.stringify({messaging_profile_id:'mp'})"
        absent = "JSON.stringify({to:'+1'})"
        prefix = f"const https=require('https');let state={{}};state.req=https.request('{endpoint}',{{method:'POST'}});"
        cases = {
            "owner_alias": (f"const alias=state;alias.req.end({present});", True),
            "owner_alias_missing": (f"const alias=state;alias.req.end({absent});", False),
            "owner_rebound_alias_retained": (f"const alias=state;state={{}};alias.req.end({present});", True),
            "owner_rebound_original_lost": (f"const alias=state;state={{}};state.req.end({present});alias.req.end({absent});", False),
            "alias_rebound_original_retained": (f"let alias=state;alias={{}};state.req.end({present});", True),
            "alias_rebound_lost": (f"let alias=state;alias={{}};alias.req.end({present});state.req.end({absent});", False),
            "alias_mutates_shared_member": (f"const alias=state;alias.req=other;state.req.end({present});", False),
            "retained_handle_after_member_mutation": (f"const alias=state;const saved=state.req;alias.req=other;saved.end({present});", True),
            "conditional_alias": (f"let alias=other;if(flag)alias=state;alias.req.end({present});", False),
        }
        for expected in (False, True):
            files = {name + '.js': prefix + body for name, (body, good) in cases.items() if good == expected}
            result, payload = self.run_messaging_linter(files)
            self.assertEqual(0 if expected else 1, result.returncode, payload)
            if not expected:
                for name in files:
                    self.assert_required_profile_detected(payload, name)

    def test_alternate_ternary_guards_do_not_certify_missing_paths(self) -> None:
        endpoint = "https://api.telnyx.com/v2/messages/number_pool"
        for operator in ("&&", "||", "??"):
            files = {
                "fetch.js": ("const payload={to:'+1'};flag ? payload.messaging_profile_id='mp' : other "
                             +operator+" (payload.messaging_profile_id='other');"
                             +f"fetch('{endpoint}',{{method:'POST',body:JSON.stringify(payload)}});"),
                "node.js": (f"const https=require('https');const req=https.request('{endpoint}',{{method:'POST'}});"
                            +"flag ? req.write(JSON.stringify({messaging_profile_id:'mp'})) : other "
                            +operator+" req.write(JSON.stringify({messaging_profile_id:'mp'}));req.end();"),
            }
            result,payload=self.run_messaging_linter(files)
            self.assertEqual(1,result.returncode,payload)
            for name in files:
                self.assert_required_profile_detected(payload,name)

    def test_request_parameter_value_and_alias_boundaries(self) -> None:
        endpoint = "https://api.telnyx.com/v2/messages/number_pool"
        prefix = ("const https=require('https');let req=https.request('" + endpoint
                  + "',{method:'POST'});const saved=req;const other={write(){}};")
        for present in (False, True):
            body = "JSON.stringify({messaging_profile_id:'mp'})" if present else "JSON.stringify({to:'+1'})"
            shapes = {
                "prior_default_alias": f"((out=req,x=out.write({body}))=>{{}})();req.end();",
                "prior_default_alias_function": f"(function(out=req,x=out.write({body})){{}})();req.end();",
                "prior_default_chain": f"((out=req,alias=out,x=alias.write({body}))=>{{}})();req.end();",
                "void_call": f"function side(){{}}((x=req.write({body}))=>{{}})(void side());req.end();",
                "void_expression": f"((x=req.write({body}))=>{{}})(void(1+2));req.end();",
                "returned_undefined": f"((x=req.write({body}))=>{{}})((()=>{{return undefined;}})());req.end();",
                "returned_void": f"((x=req.write({body}))=>{{}})((()=>{{return void 0;}})());req.end();",
                "bare_return": f"((x=req.write({body}))=>{{}})((()=>{{return;}})());req.end();",
                "call_alias": f"(function(out){{out.write({body});}}).call(null,req);req.end();",
                "call_default_alias": f"(function(out=req){{out.write({body});}}).call(null);req.end();",
                "call_supplied_default_alias": f"(function(out=other){{out.write({body});}}).call(null,req);req.end();",
                "supplied_alias_next_default": f"((out,x=out.write({body}))=>{{}})(req);req.end();",
                "captured_before_later_void": f"((out)=>out.write({body}))(req,void(req=other));saved.end();",
                "captured_default_before_later_void": f"((out,x=out.write({body}))=>{{}})(req,void(req=other));saved.end();",
                "default_captures_supplied_alias": f"((out,alias=out,x=alias.write({body}))=>{{}})(req);saved.end();",
            }
            result, payload = self.run_messaging_linter({name+'.js':prefix+source for name,source in shapes.items()})
            self.assertEqual(0 if present else 1, result.returncode, payload)
            if not present:
                for name in shapes:
                    self.assert_required_profile_detected(payload, name+'.js')
        p = "JSON.stringify({messaging_profile_id:'mp'})"
        absent = "saved.end(JSON.stringify({to:'+1'}));"
        negatives = {
            "uncalled": f"const later=(out=req,x=out.write({p}))=>{{}};"+absent,
            "supplied_alias_other": f"((out=req,x=out.write({p}))=>{{}})(other);"+absent,
            "call_alias_other": f"(function(out){{out.write({p});}}).call(null,other);"+absent,
            "call_receiver_not_argument": f"(function(out=other){{out.write({p});}}).call(req);"+absent,
            "call_alias_rebound": f"(function(out){{out=other;out.write({p});}}).call(null,req);"+absent,
            "returned_null": f"((x=req.write({p}))=>{{}})((()=>{{return null;}})());"+absent,
            "returned_conditional": f"((x=req.write({p}))=>{{}})((()=>{{return flag?undefined:1;}})());"+absent,
            "shadowed_undefined": f"((undefined)=>{{((x=req.write({p}))=>{{}})((()=>{{return undefined;}})());}})(1);"+absent,
            "unknown_result": f"((x=req.write({p}))=>{{}})(getValue());"+absent,
            "void_reassigns_handle": f"((x=req.write({p}))=>{{}})(void(req=other));"+absent,
            "void_comparison_defined": f"function side(){{}}((x=req.write({p}))=>{{}})(void side() === undefined);"+absent,
            "void_logical_defined": f"function side(){{}}((x=req.write({p}))=>{{}})(void side() || 1);"+absent,
            "void_comma_defined": f"function side(){{}}((x=req.write({p}))=>{{}})((void side(), 1));"+absent,
            "argument_reassigns_handle": f"((out)=>out.write({p}))((req=other));"+absent,
            "default_after_later_argument": f"((out=req,x)=>out.write({p}))(undefined,req=other);"+absent,
            "named_void_helper_reassigns": f"function side(){{req=other;}}((x=req.write({p}))=>{{}})(void side());"+absent,
        }
        result,payload=self.run_messaging_linter({name+'.js':prefix+source for name,source in negatives.items()})
        self.assertEqual(1,result.returncode,payload)
        for name in negatives:
            self.assert_required_profile_detected(payload,name+'.js')

    def test_request_call_parameter_alias_suffix_parity(self) -> None:
        endpoint = "https://api.telnyx.com/v2/messages/number_pool"
        for present in (False, True):
            body = "JSON.stringify({messaging_profile_id:'mp'})" if present else "JSON.stringify({to:'+1'})"
            files = {}
            for suffix in (".js", ".jsx", ".cjs", ".mjs", ".ts", ".tsx", ".cts", ".mts"):
                imported = ("import * as https from 'node:https';" if suffix in {".mjs", ".mts"}
                            else "const https=require('node:https');")
                files['call'+suffix] = (imported+f"const req=https.request('{endpoint}',{{method:'POST'}});"
                                       +f"(function(out){{out.write({body});}}).call(null,req);req.end();")
            result,payload=self.run_messaging_linter(files)
            self.assertEqual(0 if present else 1,result.returncode,payload)
            if not present:
                for name in files:
                    self.assert_required_profile_detected(payload,name)

    def test_request_execution_repairs_cover_js_ts_suffixes(self) -> None:
        endpoint = "https://api.telnyx.com/v2/messages/number_pool"
        write = "req.write(JSON.stringify({messaging_profile_id:'mp'}))"
        absent = "req.end(JSON.stringify({to:'+1'}));"
        shapes = {
            "stored": (f"const later=(x={write})=>{{}};" + absent, False),
            "unreachable": (f"(()=>{{return;{write};}})();" + absent, False),
            "called": (f"((x={write})=>{{}})();req.end();", True),
            "finally": (f"(()=>{{try{{return;}}finally{{{write};}}}})();req.end();", True),
        }
        for good in (False, True):
            files = {}
            for suffix in (".js", ".jsx", ".cjs", ".mjs", ".ts", ".tsx", ".cts", ".mts"):
                imported = ("import * as https from 'node:https';" if suffix in {".mjs", ".mts"}
                            else "const https=require('node:https');")
                prefix = imported + f"const req=https.request('{endpoint}',{{method:'POST'}});"
                for name, (body, expected) in shapes.items():
                    if expected == good:
                        files[name + suffix] = prefix + body
            result, payload = self.run_messaging_linter(files)
            self.assertEqual(0 if good else 1, result.returncode, payload)
            if not good:
                for name in files:
                    self.assert_required_profile_detected(payload, name)

    def test_shell_nested_substitutions_keep_their_own_quote_context(self) -> None:
        endpoint = "https://api.telnyx.com/v2/messages/number_pool"
        for present in (False, True):
            body = '{"to":"+1"' + (',"messaging_profile_id":"mp"' if present else '') + '}'
            curl = f"curl -X POST '{endpoint}' -d '{body}'"
            inert = f'curl -X POST "{endpoint}" -d "{{}}"'
            expressions = {
                "dollar_live": (f'$(printf "%s" "$({curl})")', True),
                "dollar_literal": (f'$(printf "%s" \'$({inert})\')', False),
                "backtick_literal": (f'$(printf "%s" \'`{inert}`\')', False),
                "comment_literal": (f'$(printf safe # $({inert})\n)', False),
                "comment_open_paren": (f'$(printf safe # (\n{curl})', True),
                "comment_close_paren": (f'$(printf safe # )\n{curl})', True),
                "hash_in_word": (f'$(printf word#; {curl})', True),
                "escaped_hash": (f'$(printf \\#; {curl})', True),
                "quoted_hash": (f"$(printf '#('; {curl})", True),
                "escaped_space_hash": (f'$(printf word\\ #; {curl})', True),
                "backtick_live": (f'`{curl}`', True),
                "adjacent_live": (f'$(printf "%s" \'$({inert})\')$({curl})', True),
            }
            for name, (expression, executes) in expressions.items():
                with self.subTest(present=present, shape=name):
                    source = f"cat <<DOC\n{expression}\nDOC\n"
                    result, payload = self.run_messaging_linter({"nested.sh": source})
                    check = next(c for c in payload["checks"] if c["name"] == "required_messaging_profile_id")
                    self.assertEqual("issue" if executes and not present else "pass", check["status"], payload)
                    self.assertEqual(1 if executes and not present else 0, result.returncode, payload)

    def test_shell_heredoc_substitutions_obey_delimiter_quoting(self) -> None:
        openers = (("<<DOC",True),("<< DOC",True),("<<-DOC",True),
                   ("<<'DOC'",False),('<<"DOC"',False),("<<\\DOC",False),("<<D'OC'",False))
        for profile in (False,True):
            files = {}
            required = []
            for index,(opener,expands) in enumerate(openers):
                body = '{"to":"+1"'+(',"messaging_profile_id":"mp"' if profile else '')+'}'
                curl = "curl -X POST 'https://api.telnyx.com/v2/messages/number_pool' -d '"+body+"'"
                for form,command in (("dollar",'$('+curl+')'),("backtick",'`'+curl+'`')):
                    name=f"heredoc_{index}_{form}.sh"
                    files[name]='cat '+opener+'\n'+command+'\nDOC\n'
                    if expands and not profile:
                        required.append(name)
            files['mixed-delimiters.sh'] = 'cat <<FIRST <<\'SECOND\'\n$('+curl+')\nFIRST\n$(curl bogus)\nSECOND\n'
            if not profile:
                required.append('mixed-delimiters.sh')
            files['escaped-substitution.sh'] = 'cat <<DOC\n\\$('+curl+')\nDOC\n'
            result,payload=self.run_messaging_linter(files)
            self.assertEqual(0 if profile else 1,result.returncode,payload)
            check=next(c for c in payload['checks'] if c['name']=='required_messaging_profile_id')
            for name in required:
                self.assert_required_profile_detected(payload,name)
            if not profile:
                details=json.dumps(check)
                for name in files:
                    if name not in required:
                        self.assertNotIn(name,details)

    def test_nested_ternary_profile_writes_remain_conditional(self) -> None:
        endpoint = "https://api.telnyx.com/v2/messages/number_pool"
        for wrapper in ("%s", "(%s)", "console.log(%s)", "console.log((%s))",
                        "flag ?? %s", "flag && %s", "flag || %s"):
            for complete in (False, True):
                alternate = "payload.messaging_profile_id='other'" if complete else "null"
                source = (
                    "const payload={to:'+1'};\n"
                    + wrapper % ("flag ? payload.messaging_profile_id='mp' : " + alternate)
                    + f";\nfetch('{endpoint}',{{method:'POST',body:JSON.stringify(payload)}});\n"
                )
                with self.subTest(wrapper=wrapper, complete=complete):
                    result, payload = self.run_messaging_linter({"ternary.js": source})
                    self.assertEqual(0 if complete else 1, result.returncode, payload)
                    if not complete:
                        self.assert_required_profile_detected(payload, "ternary.js")
        for operator in ("&&", "||", "??", "&&=", "||=", "??="):
            with self.subTest(outer_guard=operator):
                source = (
                    "const payload={to:'+1'}; let flag=getFlag();\n"
                    f"flag {operator} (other ? payload.messaging_profile_id='mp' : payload.messaging_profile_id='other');\n"
                    f"fetch('{endpoint}',{{method:'POST',body:JSON.stringify(payload)}});\n"
                )
                result, payload = self.run_messaging_linter({"outer-guard.js": source})
                self.assertEqual(1, result.returncode, payload)
                self.assert_required_profile_detected(payload, "outer-guard.js")
        for operator in ("&&=", "||=", "??="):
            with self.subTest(assignment_guard=operator):
                source = (
                    "const payload={to:'+1'}; let flag=getFlag();\n"
                    f"flag {operator} other ? payload.messaging_profile_id='mp' : payload.messaging_profile_id='other';\n"
                    f"fetch('{endpoint}',{{method:'POST',body:JSON.stringify(payload)}});\n"
                )
                result, payload = self.run_messaging_linter({"assignment-guard.js": source})
                self.assertEqual(1, result.returncode, payload)
                self.assert_required_profile_detected(payload, "assignment-guard.js")

    def test_node_core_options_cannot_supply_request_body(self) -> None:
        endpoint = "https://api.telnyx.com/v2/messages/number_pool"
        present = "JSON.stringify({to:'+1',messaging_profile_id:'mp'})"
        absent = "JSON.stringify({to:'+1'})"
        imports = (
            ("const https=require('https');", "https.request"),
            ("const transport=require('node:https');", "transport.request"),
            ("import transport from 'node:http';", "transport.request"),
            ("import * as transport from 'https';", "transport.request"),
            ("const {request}=require('node:https');", "request"),
            ("const {request,get}=require('node:https');", "request"),
            ("import {request,get} from 'node:https';", "request"),
            ("import {request as request} from 'node:https';", "request"),
        )
        for actual_profile in (False, True):
            files = {}
            for index, (statement, callee) in enumerate(imports):
                for key in ("body", "data", "json"):
                    files[f"options_{index}_{key}.js"] = (
                        statement + f"\nconst options={{method:'POST',{key}:{present}}};\n"
                        f"const req={callee}('{endpoint}',options);\n"
                        f"req.end({present if actual_profile else absent});\n"
                    )
            # The wrapper intentionally caps displayed findings at 20 files.
            # Keep each batch below that cap so every negative is asserted.
            items = list(files.items())
            for start in range(0, len(items), 12):
                batch = dict(items[start:start + 12])
                result, payload = self.run_messaging_linter(batch)
                self.assertEqual(0 if actual_profile else 1, result.returncode, payload)
                if not actual_profile:
                    for name in batch:
                        with self.subTest(file=name):
                            self.assert_required_profile_detected(payload, name)

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

    def test_razor_nested_markup_does_not_mask_or_invent_csharp(self) -> None:
        declarations = (
            '@{ var payload = new MessageSendNumberPoolParams { To = "+1"%s }; }\n'
        )
        controls = {
            "siblings": (
                "@if (true) {\n"
                "<p>It's ready</p>\n"
                "client.Messages.SendNumberPool(payload);\n"
                "<p>User's result</p>\n}\n"
            ),
            "nested": (
                "@if (true) {\n"
                '<section title="before"><p>Don\'t run prose</p></section>\n'
                "client.Messages.SendNumberPool(payload);\n"
                '<section title="after"><p>Customer\'s result</p></section>\n}\n'
            ),
            "transition-in-markup": (
                "@if (true) {\n"
                "<div>@client.Messages.SendNumberPool(payload)</div>\n}\n"
            ),
            "explicit-transition-in-markup": (
                "@if (true) {\n"
                "<div>@(client.Messages.SendNumberPool(payload))</div>\n}\n"
            ),
            "nested-control-in-markup": (
                "<div>@if (true) { "
                "client.Messages.SendNumberPool(payload); }</div>\n"
            ),
            "line-markup": (
                "@if (true) {\n"
                "@:It's ready\n"
                "client.Messages.SendNumberPool(payload);\n"
                "@:User's result\n}\n"
            ),
            "html-comment": (
                "@if (true) {\n"
                "<!-- It's an old example -->\n"
                "client.Messages.SendNumberPool(payload);\n"
                "<!-- User's result -->\n}\n"
            ),
        }
        for suffix in (".cshtml", ".razor"):
            for label, control in controls.items():
                fixture = f"View{suffix}"
                with self.subTest(suffix=suffix, shape=label, polarity="missing"):
                    _, payload = self.run_messaging_linter(
                        {fixture: declarations % "" + control}
                    )
                    self.assert_required_profile_detected(payload, fixture)
                with self.subTest(suffix=suffix, shape=label, polarity="compliant"):
                    self.assert_required_profile_passes(
                        {
                            fixture: declarations
                            % ', MessagingProfileId = "mp"'
                            + control
                        }
                    )

        # Complete HTML elements containing call-like prose are inert even
        # inside a Razor control body.
        self.assert_required_profile_passes(
            {
                "Docs.cshtml": (
                    "@if (true) {\n"
                    "<p>It's client.Messages.SendNumberPool(payload)</p>\n"
                    "<p>User's example</p>\n}\n"
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

        comment_string_frontmatter = "\n".join(
            (
                "---",
                'const marker = "<!--";',
                'fetch("/v2/messages/number_pool", {method: "POST", body: JSON.stringify({to: "+1"})});',
                "---",
            )
        )
        _, payload = self.run_messaging_linter(
            {"CommentString.astro": comment_string_frontmatter}
        )
        self.assert_required_profile_detected(payload, "CommentString.astro")

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

    def test_ejs_script_type_controls_client_execution(self) -> None:
        url = "https://api.telnyx.com/v2/messages/number_pool"
        missing = (
            f'fetch("{url}", '
            '{method: "POST", body: JSON.stringify({to: "+1"})});'
        )
        valid = missing.replace(
            '{to: "+1"}',
            '{to: "+1", messaging_profile_id: "mp"}',
        )
        executable_openers = {
            "absent": "<script>",
            "empty": '<script type="">',
            "boolean-empty": "<script type>",
            "module": '<script type="module">',
            "classic": '<script type="text/javascript">',
            "legacy": "<script TYPE=application/x-javascript>",
            "data-type-only": '<script data-type="application/json">',
            "dynamic-type": '<script type="<%= scriptType %>">',
            "language-javascript": '<script language="javascript">',
        }
        inert_openers = {
            "json": '<script type="application/json">',
            "json-case": "<SCRIPT TYPE='Application/JSON'>",
            "json-entity": '<script type="application&#x2f;json">',
            "json-ld": "<script type=application/ld+json>",
            "plain": '<script type = "text/plain">',
            "import-map": '<script type="importmap">',
            "speculation-rules": '<script type="speculationrules">',
            "language-non-js": '<script language="vbscript">',
            "duplicate-first": (
                '<script type="application/json" type="text/javascript">'
            ),
            "module-with-parameters": '<script type="module;foo">',
            "empty-essence-with-parameters": (
                '<script type="; charset=utf-8">'
            ),
            "javascript-with-parameters": (
                '<script type="Application/JavaScript; charset=utf-8">'
            ),
        }

        for label, opener in executable_openers.items():
            for polarity, request, should_detect in (
                ("missing", missing, True),
                ("valid", valid, False),
            ):
                name = f"executable-{label}-{polarity}.ejs"
                with self.subTest(label=label, polarity=polarity):
                    result, payload = self.run_messaging_linter(
                        {name: f"{opener}{request}</script>"}
                    )
                    if should_detect:
                        self.assert_required_profile_detected(payload, name)
                    else:
                        checks = [
                            check
                            for check in payload["checks"]
                            if check["name"] == "required_messaging_profile_id"
                        ]
                        self.assertEqual(
                            [
                                {
                                    "name": "required_messaging_profile_id",
                                    "status": "pass",
                                }
                            ],
                            checks,
                        )
                        self.assertEqual(0, result.returncode, result.stdout)

        for label, opener in inert_openers.items():
            name = f"inert-{label}.ejs"
            with self.subTest(label=label):
                self.assert_required_profile_passes(
                    {name: f"{opener}{missing}</script>"}
                )

        self.assert_required_profile_passes(
            {
                "mixed.ejs": (
                    f'<script type="application/json">{missing}</script>'
                    f'<script type="module">{valid}</script>'
                )
            }
        )
        self.assert_required_profile_passes(
            {
                "quoted-angle.ejs": (
                    '<script data-note="1 > 0" type="application/json">'
                    f"{missing}</script>"
                ),
                "commented.ejs": f"<!-- <script>{missing}</script> -->",
                "boundary.ejs": f"<scripture>{missing}</scripture>",
            }
        )
        _, payload = self.run_messaging_linter(
            {"unclosed.ejs": f"<script>{missing}"}
        )
        self.assert_required_profile_detected(payload, "unclosed.ejs")
        _, payload = self.run_messaging_linter(
            {
                "closing-boundary.ejs": (
                    f"<script>const inert = 1;</scripture>{missing}</script>"
                )
            }
        )
        self.assert_required_profile_detected(payload, "closing-boundary.ejs")

        # Tag discovery must preserve original Unicode offsets and follow HTML
        # tag-name/end-tag boundaries.  Inert custom/data/comment regions must
        # not become requests, nor may they consume a later real script.
        _, payload = self.run_messaging_linter(
            {"unicode-offset.ejs": f"İ<script>{missing}</script>"}
        )
        self.assert_required_profile_detected(payload, "unicode-offset.ejs")
        for name, source in {
            "script-dot.ejs": f"<script.foo>{missing}</script.foo>",
            "slash-close.ejs": (
                "<script>const okay = true;</script/>"
                f'<script type="application/json">{missing}</script>'
            ),
            "unterminated-comment.ejs": f"<!--\n<script>{missing}</script>",
            "textarea.ejs": f"<textarea><script>{missing}</script></textarea>",
            "title.ejs": f"<title><script>{missing}</script></title>",
            "style.ejs": f"<style><script>{missing}</script></style>",
            "plaintext.ejs": f"<plaintext><script>{missing}</script>",
            "non-ascii-empty-type.ejs": (
                f'<script type="&nbsp;">{missing}</script>'
            ),
            "attribute.ejs": f'<div data-example="<script>{missing}</script>">x</div>',
            "nested-template.ejs": (
                "<template><template></template>"
                f"<script>{missing}</script></template>"
            ),
        }.items():
            with self.subTest(inert_boundary=name):
                self.assert_required_profile_passes({name: source})

        for name, source in {
            "after-custom.ejs": (
                f"<script.foo>{missing}</script.foo><script>{missing}</script>"
            ),
            "after-comment.ejs": (
                f"<!-- <script>{missing}</script> --><script>{missing}</script>"
            ),
            "after-bang-comment.ejs": (
                f"<!-- inert --!><script>{missing}</script>"
            ),
            "after-abrupt-comment.ejs": f"<!--><script>{missing}</script>",
            "legacy-script-comment.ejs": (
                f"<script><!--\n{missing}\n//--></script>"
            ),
            "comment-text-in-script.ejs": (
                f'<script>const marker = "<!--";\n{missing}</script>'
            ),
            "comment-text-in-attribute.ejs": (
                f'<div data-marker="<!--"></div><script>{missing}</script>'
            ),
            "ascii-end-tag.ejs": (
                f'<script>const marker = "</ſcript>";\n{missing}</script>'
            ),
            "non-ascii-attribute-separator.ejs": (
                f'<script type\u00a0="application/json">{missing}</script>'
            ),
            "slash-close-live.ejs": (
                f"<script>{missing}</script/><p>ordinary</p>"
            ),
        }.items():
            with self.subTest(executable_boundary=name):
                _, payload = self.run_messaging_linter({name: source})
                self.assert_required_profile_detected(payload, name)

        for suffix in (".vue", ".svelte", ".astro"):
            with self.subTest(suffix=suffix, script_type="json"):
                self.assert_required_profile_passes(
                    {
                        f"data{suffix}": (
                            '<script type="application/json">'
                            f"{missing}</script>"
                        )
                    }
                )
            with self.subTest(suffix=suffix, script_type="module"):
                _, payload = self.run_messaging_linter(
                    {
                        f"module{suffix}": (
                            f'<script type="module">{missing}</script>'
                        )
                    }
                )
                self.assert_required_profile_detected(payload, f"module{suffix}")

    def test_template_comment_and_script_scans_are_linear(self) -> None:
        namespace = runpy.run_path(str(MESSAGING_SOURCE_ANALYZER))
        without_comments = namespace["_without_html_comments"]
        script_ranges = namespace["_script_element_body_ranges"]

        # These inputs made the former non-anchored DOTALL regex retry at every
        # opener.  Large bounded fixtures make the regression deterministic:
        # the linear scanners complete comfortably below this generous limit.
        for label, operation, source in (
            ("comments", without_comments, "<!--" * 20_000),
            (
                "script-tags",
                script_ranges,
                "İ" * 20_000 + "<script>const x = 1;</script>" * 2_000,
            ),
        ):
            with self.subTest(label=label):
                started = time.perf_counter()
                operation(source)
                self.assertLess(time.perf_counter() - started, 1.0)

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

    def test_static_computed_sdk_methods_are_analyzed(self) -> None:
        """JS/TS bracket members retain the required-profile SDK contract."""

        shapes = {
            "single": "client.messages['%s']({to: '+1'%s});",
            "double": 'client.messages["%s"]({to: "+1"%s});',
            "template": "client.messages[`%s`]({to: '+1'%s});",
            "optional-member": "client.messages?.['%s']?.({to: '+1'%s});",
            "nested-computed": "client['messages']['%s']({to: '+1'%s});",
        }
        methods = (
            "sendNumberPool",
            "send_number_pool",
            "SendNumberPool",
            "sendWithAlphanumericSender",
            "send_with_alphanumeric_sender",
            "SendWithAlphanumericSender",
        )
        for suffix in (".js", ".ts"):
            for shape, template in shapes.items():
                for method in methods:
                    with self.subTest(
                        suffix=suffix, shape=shape, method=method, polarity="missing"
                    ):
                        result = self.run_required_profile_analyzer(
                            {"send" + suffix: template % (method, "")}
                        )
                        rows = result.stdout.splitlines()
                        self.assertEqual(1, int(rows[0]), result.stdout)
                        self.assertTrue(any(row.strip() for row in rows[1:]))
                    with self.subTest(
                        suffix=suffix, shape=shape, method=method, polarity="present"
                    ):
                        result = self.run_required_profile_analyzer(
                            {
                                "send" + suffix: template
                                % (method, ", messaging_profile_id: 'mp'")
                            }
                        )
                        rows = result.stdout.splitlines()
                        self.assertEqual(1, int(rows[0]), result.stdout)
                        self.assertFalse(
                            any(row.strip() for row in rows[1:]), result.stdout
                        )

        inert = {
            "object-key.js": "const handlers = {'sendNumberPool': fn};",
            "array-item.js": "const handlers = ['sendNumberPool'];",
            "dynamic.js": "client.messages[method]({to: '+1'});",
            "unrelated.js": "client.messages['send']({to: '+1'});",
            "prose.js": "const example = \"client.messages['sendNumberPool']({})\";",
        }
        for name, source in inert.items():
            with self.subTest(inert=name):
                result = self.run_required_profile_analyzer({name: source})
                self.assertEqual("0", result.stdout.splitlines()[0], result.stdout)

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

    def test_python_logical_from_imports_preserve_endpoint_provenance(self) -> None:
        """Parentheses and continuations cannot erase imported endpoints."""

        pool = "https://api.telnyx.com/v2/messages/number_pool"
        safe = "https://api.telnyx.com/v2/messages"
        support = {
            "pkg/__init__.py": "",
            "pkg/endpoints.py": (
                f"pool_url = '{pool}'\n"
                f"safe_url = '{safe}'\n"
                "other = 'unused'\n"
            ),
        }
        forms = {
            "relative-parenthesized": (
                "from .endpoints import (\n"
                "    pool_url,\n"
                ")\n",
                "pool_url",
            ),
            "relative-parenthesized-alias": (
                "from .endpoints import (\n"
                "    safe_url,\n"
                "    pool_url as endpoint,\n"
                ")\n",
                "endpoint",
            ),
            "absolute-parenthesized": (
                "from pkg.endpoints import (\n"
                "    pool_url,\n"
                ")\n",
                "pool_url",
            ),
            "explicit-continuation": (
                "from pkg.endpoints import safe_url, \\\n"
                "    pool_url as endpoint\n",
                "endpoint",
            ),
            "semicolon-small-statement": (
                "import os; from pkg.endpoints import pool_url as endpoint\n",
                "endpoint",
            ),
            "trailing-semicolon-small-statement": (
                "from pkg.endpoints import pool_url as endpoint; import os\n",
                "endpoint",
            ),
        }
        for form, (declaration, endpoint) in forms.items():
            template = (
                declaration
                + "import requests\n"
                + f"requests.post({endpoint}, json={{'to': '+1'%s}})\n"
            )
            with self.subTest(form=form, polarity="missing"):
                result = self.run_required_profile_analyzer(
                    {**support, "pkg/send.py": template % ""}
                )
                rows = result.stdout.splitlines()
                self.assertEqual("1", rows[0], result.stdout)
                self.assertTrue(any("pkg/send.py" in row for row in rows[1:]))
            with self.subTest(form=form, polarity="present"):
                result = self.run_required_profile_analyzer(
                    {
                        **support,
                        "pkg/send.py": template
                        % ", 'messaging_profile_id': 'mp'",
                    }
                )
                rows = result.stdout.splitlines()
                self.assertEqual("1", rows[0], result.stdout)
                self.assertFalse(any(row.strip() for row in rows[1:]), result.stdout)

        self.assert_required_profile_passes(
            {
                **support,
                "pkg/send.py": (
                    "from .endpoints import (safe_url,)\n"
                    "import requests\n"
                    "requests.post(safe_url, json={'to': '+1'})\n"
                ),
            }
        )

    def test_csharp_project_static_endpoint_members_resolve_by_namespace(self) -> None:
        """Same-namespace and fully-qualified C# constants cross files."""

        pool = "https://api.telnyx.com/v2/messages/number_pool"
        safe = "https://api.telnyx.com/v2/messages"
        forms = {
            "file-scoped-const": (
                "namespace Demo;\ninternal static class Endpoints { "
                f'public const string PoolUrl = "{pool}"; }}\n',
                "namespace Demo;\n",
                "Endpoints.PoolUrl",
            ),
            "block-static-readonly": (
                "namespace Demo { internal static class Endpoints { "
                f'public static readonly string PoolUrl = "{pool}"; }} }}\n',
                "namespace Demo { class Send { async Task Go() { BODY } } }\n",
                "Endpoints.PoolUrl",
            ),
            "nested-type": (
                "namespace Demo;\ninternal static class Routes { "
                "internal static class Endpoints { "
                f'public const string PoolUrl = "{pool}"; }} }}\n',
                "namespace Demo;\n",
                "Routes.Endpoints.PoolUrl",
            ),
            "static-readonly-uri": (
                "namespace Demo;\ninternal static class Endpoints { "
                "public static readonly Uri PoolUrl = new Uri("
                f'"{pool}"); }}\n',
                "namespace Demo;\n",
                "Endpoints.PoolUrl",
            ),
            "fully-qualified-other-namespace": (
                "namespace Other;\ninternal static class Endpoints { "
                f'public const string PoolUrl = "{pool}"; }}\n',
                "namespace Demo;\n",
                "Other.Endpoints.PoolUrl",
            ),
            "nested-block-namespace": (
                "namespace Outer { namespace Inner { "
                "internal static class Endpoints { "
                f'public const string PoolUrl = "{pool}"; }} }} }}\n',
                "namespace Demo;\n",
                "Outer.Inner.Endpoints.PoolUrl",
            ),
            "verbatim-const": (
                "namespace Demo; internal static class Endpoints { "
                f'public const string PoolUrl = @"{pool}"; }}\n',
                "namespace Demo;\n",
                "Endpoints.PoolUrl",
            ),
            "target-typed-uri": (
                "namespace Demo; internal static class Endpoints { "
                f'public static readonly Uri PoolUrl = new("{pool}"); }}\n',
                "namespace Demo;\n",
                "Endpoints.PoolUrl",
            ),
            "global-qualified": (
                "namespace Other; internal static class Endpoints { "
                f'public const string PoolUrl = "{pool}"; }}\n',
                "namespace Demo;\n",
                "global::Other.Endpoints.PoolUrl",
            ),
            "containing-parent-namespace": (
                "namespace A { static class Endpoints { "
                f'public const string PoolUrl = "{pool}"; }} }}\n',
                "namespace A.B { class Send { async Task Go() { BODY } } }\n",
                "Endpoints.PoolUrl",
            ),
        }
        for form, (support, send_prefix, endpoint) in forms.items():
            body = (
                "await client.PostAsync("
                + endpoint
                + ", new StringContent(\"{\\\"to\\\":\\\"+1\\\"%s}\"));"
            )
            template = (
                send_prefix.replace("BODY", body)
                if "BODY" in send_prefix
                else send_prefix + "class Send { async Task Go() { " + body + " } }\n"
            )
            with self.subTest(form=form, polarity="missing"):
                result = self.run_required_profile_analyzer(
                    {"Endpoints.cs": support, "Send.cs": template % ""}
                )
                rows = result.stdout.splitlines()
                self.assertEqual("1", rows[0], result.stdout)
                self.assertTrue(any("Send.cs" in row for row in rows[1:]))
            with self.subTest(form=form, polarity="present"):
                result = self.run_required_profile_analyzer(
                    {
                        "Endpoints.cs": support,
                        "Send.cs": template
                        % ',\\\"messaging_profile_id\\\":\\\"mp\\\"',
                    }
                )
                rows = result.stdout.splitlines()
                self.assertEqual("1", rows[0], result.stdout)
                self.assertFalse(any(row.strip() for row in rows[1:]), result.stdout)

        self.assert_required_profile_passes(
            {
                "Endpoints.cs": (
                    "namespace Demo; internal static class Endpoints { "
                    f'public const string SafeUrl = "{safe}"; }}'
                ),
                "Send.cs": (
                    "namespace Demo; await client.PostAsync(Endpoints.SafeUrl, "
                    'new StringContent("{\\"to\\":\\"+1\\"}"));'
                ),
            }
        )

        # Do not cross-product members between namespaces in one source file.
        # Both declaration orders matter because a dict overwrite once made
        # one order false-positive and the reverse order false-negative.
        for reverse in (False, True):
            safe_decl = (
                "namespace SafeNs { static class Endpoints { "
                f'public const string Url = "{safe}"; }} }}\n'
            )
            pool_decl = (
                "namespace PoolNs { static class Endpoints { "
                f'public const string Url = "{pool}"; }} }}\n'
            )
            declarations = (
                pool_decl + safe_decl if reverse else safe_decl + pool_decl
            )
            with self.subTest(namespace_collision_order=reverse):
                self.assert_required_profile_passes(
                    {
                        "Endpoints.cs": declarations,
                        "Send.cs": (
                            "namespace SafeNs { class Send { async Task Go() { "
                            "await client.PostAsync(Endpoints.Url, "
                            'new StringContent("{\\"to\\":\\"+1\\"}")); } }}\n'
                        ),
                    }
                )

        # Each call site in a multi-namespace source resolves against its own
        # lexical namespace, not a file-wide unqualified alias map.
        multi_namespace = self.run_required_profile_analyzer(
            {
                "Endpoints.cs": safe_decl + pool_decl,
                "Send.cs": (
                    "namespace SafeNs { class SafeSend { async Task Go() { "
                    "await client.PostAsync(Endpoints.Url, "
                    'new StringContent("{\\"to\\":\\"+1\\"}")); } }}\n'
                    "namespace PoolNs { class PoolSend { async Task Go() { "
                    "await client.PostAsync(Endpoints.Url, "
                    'new StringContent("{\\"to\\":\\"+1\\"}")); } }}\n'
                ),
            }
        )
        self.assertEqual("1", multi_namespace.stdout.splitlines()[0])
        self.assertEqual(1, multi_namespace.stdout.count("Send.cs:"))

        # A nested type shadows a same-named namespace member. Exercise both
        # URL polarities so external lookup cannot override lexical binding.
        for local_url, expect_missing in ((pool, True), (safe, False)):
            outer_url = safe if expect_missing else pool
            shadow = self.run_required_profile_analyzer(
                {
                    "Global.cs": (
                        "namespace Demo; static class Endpoints { "
                        f'public const string PoolUrl = "{outer_url}"; }}\n'
                    ),
                    "Send.cs": (
                        "namespace Demo; class Send { static class Endpoints { "
                        f'public const string PoolUrl = "{local_url}"; }} '
                        "async Task Go() { await client.PostAsync("
                        "Endpoints.PoolUrl, "
                        'new StringContent("{\\"to\\":\\"+1\\"}")); }}\n'
                    ),
                }
            )
            rows = shadow.stdout.splitlines()
            with self.subTest(nested_shadow_required=expect_missing):
                self.assertEqual("1" if expect_missing else "0", rows[0])
                self.assertEqual(
                    expect_missing,
                    any("Send.cs:" in row for row in rows[1:]),
                    shadow.stdout,
                )

        global_only = self.run_required_profile_analyzer(
            {
                "Endpoints.cs": (
                    "namespace Other { static class Endpoints { "
                    f'public const string Url = "{pool}"; }} }}\n'
                    "namespace Demo.Other { static class Endpoints { "
                    f'public const string Url = "{safe}"; }} }}\n'
                ),
                "Send.cs": (
                    "namespace Demo { class Send { async Task Go() { "
                    "await client.PostAsync(global::Other.Endpoints.Url, "
                    'new StringContent("{\\"to\\":\\"+1\\"}")); } }}\n'
                ),
            }
        )
        self.assertEqual("1", global_only.stdout.splitlines()[0])
        self.assertIn("Send.cs:", global_only.stdout)

        # Method locals shadow same-named members on a partial class.
        for local_url, expect_missing in ((safe, False), (pool, True)):
            field_url = pool if not expect_missing else safe
            local_shadow = self.run_required_profile_analyzer(
                {
                    "Endpoints.cs": (
                        "namespace Demo; partial class Worker { "
                        f'public const string Url = "{field_url}"; }}\n'
                    ),
                    "Send.cs": (
                        "namespace Demo; partial class Worker { async Task Go() { "
                        f'var Url = "{local_url}"; '
                        "await client.PostAsync(Url, "
                        'new StringContent("{\\"to\\":\\"+1\\"}")); }}\n'
                    ),
                }
            )
            with self.subTest(local_binding_required=expect_missing):
                rows = local_shadow.stdout.splitlines()
                self.assertEqual("1" if expect_missing else "0", rows[0])
                self.assertEqual(expect_missing, "Send.cs:" in local_shadow.stdout)

    def test_csharp_project_static_index_is_built_once_per_cli_scan(self) -> None:
        """Cross-file member resolution reads each C# source only linearly."""

        safe = "https://api.telnyx.com/v2/messages"
        namespace = runpy.run_path(
            str(MESSAGING_SOURCE_ANALYZER),
            run_name="telnyx_csharp_project_index_contract",
        )
        with tempfile.TemporaryDirectory(prefix="telnyx-csharp-index-") as directory:
            root = Path(directory)
            paths = []
            for index in range(24):
                path = root / f"Source{index}.cs"
                path.write_text(
                    "namespace Demo; static class Endpoints"
                    f'{index} {{ public const string Safe = "{safe}"; }}\n',
                    encoding="utf-8",
                )
                paths.append(path)

            reads = 0
            original_read = namespace["_read_source_text"]

            def tracked_read(path: Path) -> str:
                nonlocal reads
                reads += 1
                return original_read(path)

            namespace["_csharp_project_static_index"].__globals__[
                "_read_source_text"
            ] = tracked_read
            project_values = namespace["_csharp_project_static_index"](root)
            for path in paths:
                namespace["analyze_file"](path, root, project_values)
            self.assertEqual(2 * len(paths), reads)

            many_calls = root / "ManyCalls.cs"
            many_calls.write_text(
                "namespace Demo; class Send { async Task Go() {\n"
                + "\n".join(
                    "await client.PostAsync(Endpoints0.Safe, "
                    'new StringContent("{}"));'
                    for _ in range(100)
                )
                + "\n} }\n",
                encoding="utf-8",
            )
            globals_map = namespace["analyze_file"].__globals__
            original_namespaces = globals_map["_csharp_namespace_spans"]
            original_types = globals_map["_csharp_type_spans"]
            span_calls = {"namespace": 0, "type": 0}

            def tracked_namespaces(source: str):
                span_calls["namespace"] += 1
                return original_namespaces(source)

            def tracked_types(source: str):
                span_calls["type"] += 1
                return original_types(source)

            globals_map["_csharp_namespace_spans"] = tracked_namespaces
            globals_map["_csharp_type_spans"] = tracked_types
            namespace["analyze_file"](many_calls, root, project_values)
            self.assertEqual({"namespace": 1, "type": 1}, span_calls)

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
            "function-block-start": "function f(){ /[/*]/.test(v); }",
            "arrow-block-start": "const f = () => { /[/*]/.test(v); };",
            "control-block-start": "if (ok) { /[/*]/.test(v); }",
            "try-block-start": "try { /[/*]/.test(v); } finally {}",
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

    def test_jsx_markup_is_inert_but_expression_containers_execute(self) -> None:
        url = "https://api.telnyx.com/v2/messages/number_pool"
        decoy = "client.messages.sendNumberPool({to: '+1'})"
        inert = {
            "text.js": f"export default () => <code>{decoy}</code>;",
            "text.mjs": f"export default () => <code>{decoy}</code>;",
            "text.cjs": f"module.exports = () => <code>{decoy}</code>;",
            "text.jsx": f"export default () => <code>{decoy}</code>;",
            "nested.tsx": (
                f"export default () => <Panel><span>{decoy}</span></Panel>;"
            ),
            "attribute.jsx": f"export default () => <Panel title=\"{decoy}\" />;",
            "braced-attribute.tsx": f"export default () => <Panel title=\"{{{decoy}}}\" />;",
            "comment.tsx": (
                f"export default () => <Panel>{{/* {decoy} */}}</Panel>;"
            ),
            "fragment.jsx": f"export default () => <><code>{decoy}</code></>;",
            "nested-expression.tsx": (
                f"export default () => <Panel>{{ok ? <code>{decoy}</code> : null}}</Panel>;"
            ),
            "control-body.jsx": f"if (ok) <Panel>{decoy}</Panel>;",
            "await-operand.tsx": (
                f"async function render() {{ await <Panel>{decoy}</Panel>; }}"
            ),
            "typeof-operand.jsx": f"const kind = typeof <Panel>{decoy}</Panel>;",
            "underscore-component.jsx": (
                f"export default () => <_Panel>{decoy}</_Panel>;"
            ),
            "dollar-component.tsx": (
                f"export default () => <$Panel>{decoy}</$Panel>;"
            ),
            "unicode-component.tsx": (
                f"export default () => <Élément>{decoy}</Élément>;"
            ),
            "attribute-comment.jsx": (
                f"export default () => <Panel value={{/* }}>"  # nosec B703
                f" */ 1}}>{decoy}</Panel>;"
            ),
            "many-expressions.tsx": (
                "export default () => <Panel>"
                + "{value}" * 400
                + decoy
                + "</Panel>;"
            ),
        }
        for name, source in inert.items():
            with self.subTest(name=name):
                self.assertEqual(
                    "0",
                    self.run_required_profile_analyzer({name: source}).stdout.strip(),
                )

        executable = {
            "child.js": f"export default () => <Panel>{{{decoy}}}</Panel>;",
            "handler.mjs": (
                f"export default () => <Button onClick={{() => {decoy}}} />;"
            ),
            "after.cjs": (
                "const view = <Panel>ordinary text</Panel>;\n"
                f"fetch('{url}',{{method:'POST',body:JSON.stringify({{to:'+1'}})}});"
            ),
            "child.jsx": f"export default () => <Panel>{{{decoy}}}</Panel>;",
            "handler.tsx": (
                f"export default () => <Button onClick={{() => {decoy}}} />;"
            ),
            "spread.tsx": (
                f"export default () => <Panel value={{{{run: () => {decoy}}}}} />;"
            ),
            "regex-brace.jsx": (
                f"export default () => <Panel>{{/[}}]/.test(value) && {decoy}}}</Panel>;"
            ),
            "comment-brace.tsx": (
                f"export default () => <Panel>{{/* }} is inert */ {decoy}}}</Panel>;"
            ),
            "after.jsx": (
                "const view = <Panel>ordinary text</Panel>;\n"
                f"fetch('{url}',{{method:'POST',body:JSON.stringify({{to:'+1'}})}});"
            ),
        }
        for name, source in executable.items():
            with self.subTest(name=name):
                result = self.run_required_profile_analyzer({name: source})
                self.assertTrue(
                    any(name in row for row in result.stdout.splitlines()[1:]),
                    result.stdout,
                )

    def test_ruby_heredoc_literal_text_is_inert_but_interpolation_executes(
        self,
    ) -> None:
        url = "https://api.telnyx.com/v2/messages/number_pool"
        send = f"Net::HTTP.post(URI('{url}'), {{to: '+1'}}.to_json)"
        inert = {
            "plain.rb": f"doc = <<DOC\n{send}\nDOC\n",
            "indented.rb": f"doc = <<~DOC\n  {send}\nDOC\n",
            "double-quoted.rb": f'doc = <<"DOC"\n{send}\nDOC\n',
            "single-quoted.rb": f"doc = <<'DOC'\n#{{{send}}}\nDOC\n",
            "escaped.rb": f"doc = <<DOC\n\\#{{{send}}}\nDOC\n",
        }
        for name, source in inert.items():
            with self.subTest(name=name):
                self.assertEqual(
                    "0",
                    self.run_required_profile_analyzer({name: source}).stdout.strip(),
                )

        for opener in ("<<DOC", "<<-DOC", "<<~DOC", '<<"DOC"'):
            with self.subTest(opener=opener):
                source = f"doc = {opener}\n#{{{send}}}\nDOC\n"
                result = self.run_required_profile_analyzer(
                    {"interpolated-heredoc.rb": source}
                )
                self.assertTrue(
                    any(
                        "interpolated-heredoc.rb" in row
                        for row in result.stdout.splitlines()[1:]
                    ),
                    result.stdout,
                )

        after = f"doc = <<~DOC\nordinary text\nDOC\n{send}\n"
        result = self.run_required_profile_analyzer({"after-heredoc.rb": after})
        self.assertTrue(
            any("after-heredoc.rb" in row for row in result.stdout.splitlines()[1:]),
            result.stdout,
        )

    def test_ruby_multiple_heredocs_preserve_each_body_interpolation_mode(
        self,
    ) -> None:
        url = "https://api.telnyx.com/v2/messages/number_pool"

        def request(profile: bool) -> str:
            field = ", messaging_profile_id: 'mp'" if profile else ""
            return (
                f"Net::HTTP.post(URI('{url}'), "
                f"{{to: '+1'{field}}}.to_json)"
            )

        opener_modes = {
            "plain": lambda tag: f"<<{tag}",
            "indented": lambda tag: f"<<~{tag}",
            "double": lambda tag: f'<<"{tag}"',
            "single": lambda tag: f"<<'{tag}'",
            "command": lambda tag: f"<<`{tag}`",
        }
        for first_mode, first_opener in opener_modes.items():
            for second_mode, second_opener in opener_modes.items():
                for active_body in (0, 1):
                    for polarity, profile in (
                        ("missing", False),
                        ("valid", True),
                    ):
                        modes = (first_mode, second_mode)
                        bodies = ["ordinary first", "ordinary second"]
                        bodies[active_body] = f"#{{{request(profile)}}}"
                        source = "\n".join(
                            (
                                f"puts {first_opener('FIRST')}, {second_opener('SECOND')}",
                                bodies[0],
                                "FIRST",
                                bodies[1],
                                "SECOND",
                                "",
                            )
                        )
                        should_execute = modes[active_body] != "single"
                        name = (
                            f"multi-{first_mode}-{second_mode}-{active_body}-"
                            f"{polarity}.rb"
                        )
                        with self.subTest(
                            first=first_mode,
                            second=second_mode,
                            active_body=active_body,
                            polarity=polarity,
                        ):
                            result = self.run_required_profile_analyzer(
                                {name: source}
                            )
                            detected = any(
                                name in row for row in result.stdout.splitlines()[1:]
                            )
                            self.assertEqual(
                                should_execute and not profile,
                                detected,
                                result.stdout,
                            )

        triple = "\n".join(
            (
                "render <<'ONE', <<~TWO, <<\"THREE\"",
                f"#{{{request(False)}}}",
                "ONE",
                "ordinary second",
                "TWO",
                f"#{{{request(False)}}}",
                "THREE",
                "",
            )
        )
        result = self.run_required_profile_analyzer({"triple.rb": triple})
        self.assertTrue(
            any("triple.rb" in row for row in result.stdout.splitlines()[1:]),
            result.stdout,
        )

    def test_ruby_heredoc_grammar_boundaries(self) -> None:
        url = "https://api.telnyx.com/v2/messages/number_pool"
        send = f"Net::HTTP.post(URI('{url}'), {{to: '+1'}}.to_json)"

        # Ripper classifies these completed operands as shifts rather than
        # heredoc openers.  None may mask the live request that follows.
        shifts = {
            "decimal": "mask = 1 <<OFFSET",
            "hex": "mask = 0x1 <<OFFSET",
            "parenthesized": "mask = value() <<OFFSET",
            "string": 'mask = "x" <<OFFSET',
            "instance": "mask = @value <<OFFSET",
            "class-variable": "mask = @@value <<OFFSET",
            "global": "mask = $value <<OFFSET",
            "nil": "mask = nil <<OFFSET",
            "true": "mask = true <<OFFSET",
            "false": "mask = false <<OFFSET",
            "self": "mask = self <<OFFSET",
            "file-keyword": "mask = __FILE__ <<OFFSET",
            "symbol": "mask = :value <<OFFSET",
            "regexp": "mask = /value/ <<OFFSET",
            "adjacent-local": "buffer<<OFFSET",
            "adjacent-constant": "Buffer<<OFFSET",
            "bound-local": "value = 1; mask = value <<OFFSET",
            "bound-parameter": "def shift(value); mask = value <<OFFSET; end",
            "bound-brace-parameter": "[1].each { |value| mask = value <<OFFSET }",
            "bound-destructured-parameter": (
                "[[1, 2]].each { |(value, other)| mask = value <<OFFSET }"
            ),
            "bound-do-parameter": (
                "[1].each do |value|\n  mask = value <<OFFSET\nend"
            ),
            "multiple-assignment": "value, other = 1, 2; mask = value <<OFFSET",
            "two-bound-shifts": (
                "def first(value); value <<BITS; end\n"
                "def second(other); other <<MASK; end"
            ),
            "multiline-parameter": (
                "def shift(\n  value\n)\n  value <<OFFSET\nend"
            ),
        }
        for label, shift in shifts.items():
            name = f"shift-{label}.rb"
            with self.subTest(shift=label):
                result = self.run_required_profile_analyzer(
                    {name: f"OFFSET = 1\n{shift}\n{send}\n"}
                )
                self.assertTrue(
                    any(name in row for row in result.stdout.splitlines()[1:]),
                    result.stdout,
                )

        # Names mentioned only in parameter defaults or introduced as block
        # parameters are not locals in the surrounding scope. Their `<<DOC`
        # forms remain real heredocs, so requests inside the bodies are inert.
        for label, source in {
            "default-expression": (
                "def render(value = fallback)\n"
                f"  fallback <<DOC\n  {send}\nDOC\nend\n"
            ),
            "block-shadow": (
                "[1].each { |value| value = 1 }\n"
                f"value <<DOC\n{send}\nDOC\n"
            ),
            "block-default": (
                "[1].each { |value = fallback| value }\n"
                f"fallback <<DOC\n{send}\nDOC\n"
            ),
            "nested-block-shadow": (
                "[1].each do |value|\n"
                "  if true\n    :ok\n  end\n"
                "  value = 1\nend\n"
                f"value <<DOC\n{send}\nDOC\n"
            ),
        }.items():
            with self.subTest(binding_scope=label):
                self.assertEqual(
                    "0",
                    self.run_required_profile_analyzer(
                        {f"binding-{label}.rb": source}
                    ).stdout.strip(),
                )

        # Quoted identifiers accept delimiters beyond bare Ruby identifiers.
        # Their bodies remain inert for every quote mode.
        for label, opener, terminator in (
            ("hyphen", '<<"END-HTML"', "END-HTML"),
            ("space", '<<"1 END"', "1 END"),
            ("punctuation", "<<'END/HTML!'", "END/HTML!"),
            ("command", "<<`END-HTML`", "END-HTML"),
            ("backslash", r'<<"END\q"', r"END\q"),
            ("unicode-bare", "<<ÉND", "ÉND"),
        ):
            with self.subTest(delimiter=label):
                self.assertEqual(
                    "0",
                    self.run_required_profile_analyzer(
                        {
                            f"delimiter-{label}.rb": (
                                f"doc = {opener}\n{send}\n{terminator}\n"
                            )
                        }
                    ).stdout.strip(),
                )

        # Plain heredocs terminate only at column zero and only on an exact
        # delimiter line.  Flexible variants accept indentation but still not
        # suffix text.
        for premature in ("  DOC", "DOC.anything", "DOC # comment", "DOC ", "DOC\t"):
            with self.subTest(plain_premature=premature):
                self.assertEqual(
                    "0",
                    self.run_required_profile_analyzer(
                        {"plain-terminator.rb": f"doc = <<DOC\n{premature}\n{send}\nDOC\n"}
                    ).stdout.strip(),
                )
        for opener in ("<<-DOC", "<<~DOC"):
            for trailing in (" ", "\t"):
                with self.subTest(opener=opener, trailing=trailing):
                    self.assertEqual("0", self.run_required_profile_analyzer({
                        "trailing.rb": f"doc = {opener}\n  DOC{trailing}\n{send}\nDOC\n"
                    }).stdout.strip())
            with self.subTest(indented_terminator=opener):
                result = self.run_required_profile_analyzer(
                    {"indented-terminator.rb": f"doc = {opener}\n  DOC\n{send}\n"}
                )
                self.assertTrue(
                    any(
                        "indented-terminator.rb" in row
                        for row in result.stdout.splitlines()[1:]
                    ),
                    result.stdout,
                )

        modified = (
            "puts <<FIRST.upcase, <<'SECOND'\n"
            f"#{{{send}}}\nFIRST\nordinary\nSECOND\n"
        )
        result = self.run_required_profile_analyzer({"modified.rb": modified})
        self.assertTrue(
            any("modified.rb" in row for row in result.stdout.splitlines()[1:]),
            result.stdout,
        )

        # Text that resembles an opener inside a declaration-line string is
        # not a second heredoc and cannot steal a later live send.
        quoted_decoy = f'puts <<FIRST, "not <<SECOND"\nordinary\nFIRST\n{send}\n'
        result = self.run_required_profile_analyzer(
            {"quoted-decoy.rb": quoted_decoy}
        )
        self.assertTrue(
            any("quoted-decoy.rb" in row for row in result.stdout.splitlines()[1:]),
            result.stdout,
        )
        regex_decoy = f"puts <<FIRST, /not <<SECOND/\nordinary\nFIRST\n{send}\n"
        result = self.run_required_profile_analyzer(
            {"regexp-opener-decoy.rb": regex_decoy}
        )
        self.assertTrue(
            any(
                "regexp-opener-decoy.rb" in row
                for row in result.stdout.splitlines()[1:]
            ),
            result.stdout,
        )

    def test_ruby_multiple_heredoc_discovery_is_linear(self) -> None:
        namespace = runpy.run_path(str(MESSAGING_SOURCE_ANALYZER))
        openers_at = namespace["_ruby_heredoc_openers_at"]
        source = ", ".join(f"<<H{index}" for index in range(30_000)) + "\n"
        started = time.perf_counter()
        matches = openers_at(source, 0)
        self.assertEqual(30_000, len(matches))
        self.assertLess(time.perf_counter() - started, 1.0)

        # Guard the complete binding-sensitive second pass too. Its owner
        # lookup once scanned every method span for every assignment, making a
        # large but ordinary Ruby file quadratic even without any heredocs.
        lex_source = namespace["lex_source"]
        methods = "".join(
            f"def method_{index}(value); local = {index}; end\n"
            for index in range(8_000)
        )
        started = time.perf_counter()
        lexed = lex_source(methods, ".rb")
        self.assertEqual(len(methods), len(lexed.code))
        self.assertLess(time.perf_counter() - started, 4.0)

    def test_ruby_interpolation_balancing_ignores_literal_braces(self) -> None:
        url = "https://api.telnyx.com/v2/messages/number_pool"
        literals = {
            "percent-q": "%q[hello}]",
            "percent-Q": "%Q(hello})",
            "regexp": "/hello}/",
            "regexp-class": "/[}]/",
            "quoted": '"hello}"',
        }
        for container in ("heredoc", "string"):
            for literal_name, literal in literals.items():
                for polarity, profile in (
                    ("missing", ""),
                    ("valid", ", messaging_profile_id: 'mp'"),
                ):
                    with self.subTest(
                        container=container,
                        literal=literal_name,
                        polarity=polarity,
                    ):
                        send = (
                            f"Net::HTTP.post(URI('{url}'), "
                            f"{{to: '+1'{profile}}}.to_json)"
                        )
                        expression = f"#{{ {literal} + ({send}).to_s }}"
                        source = (
                            f"doc = <<DOC\n{expression}\nDOC\n"
                            if container == "heredoc"
                            else f'doc = "{expression}"\n'
                        )
                        result = self.run_required_profile_analyzer(
                            {f"{container}-{literal_name}.rb": source}
                        )
                        findings = [
                            row for row in result.stdout.splitlines()[1:] if row
                        ]
                        if polarity == "missing":
                            self.assertTrue(findings, result.stdout)
                        else:
                            self.assertEqual([], findings, result.stdout)

    def test_deep_jsx_expression_nesting_is_stack_safe(self) -> None:
        decoy = "client.messages.sendNumberPool({to: '+1'})"
        source = f"<code>{decoy}</code>"
        for _ in range(1100):
            source = f"<Panel>{{{source}}}</Panel>"
        result = self.run_required_profile_analyzer(
            {"deep-expression.js": f"export default () => {source};"}
        )
        self.assertEqual("0", result.stdout.strip(), result.stdout)

    def test_ruby_slash_regex_literals_do_not_mask_following_sends(self) -> None:
        url = "https://api.telnyx.com/v2/messages/number_pool"
        send = f"Net::HTTP.post(URI('{url}'), {{to: '+1'}}.to_json)"
        prefixes = {
            "apostrophe": "pattern = /don't/",
            "escaped-slash": r"pattern = /a\/b's/",
            "character-class": r"pattern = /[\/'a-z]+/i",
            "argument": "value.match(/don't/)",
            "command-argument": "warn /don't/",
            "receiver-command-argument": "value.match /don't/",
            "indexed-command-argument": "receivers[0].match /don't/",
            "called-command-argument": "factory().match /don't/",
            "constant-command-argument": "Foo::Bar.warn /don't/",
            "block-command-argument": "consume /don't/ do |match|\nend",
            "and-command-argument": "warn /don't/ and puts :ok",
            "or-command-argument": "warn /don't/ or puts :ok",
            "multiline": "pattern = /don't\nstop/",
            "multiline-x": "pattern = /don't # prose\n stop/x",
            "multiline-command": "warn /don't\nstop/",
            "condition": "return unless /don't/.match?(value)",
            "interpolation": r"pattern = /prefix#{helper('x')}don't/",
            "division": "ratio = total / count",
            "division-assignment": "total /= count",
            "chained-division": (
                "total / client.messages.sendNumberPool({to: '+1'}) / divisor"
            ),
            "division-before-url": (
                "total / count\n"
                f"Net::HTTP.post(URI('{url}'), {{to: '+1'}}.to_json)"
            ),
        }
        for name, prefix in prefixes.items():
            with self.subTest(name=name):
                result = self.run_required_profile_analyzer(
                    {f"{name}.rb": prefix + "\n" + send}
                )
                self.assertTrue(
                    any(
                        f"{name}.rb" in row
                        for row in result.stdout.splitlines()[1:]
                    ),
                    result.stdout,
                )

        decoy = (
            r"pattern = /client\.messages\.sendNumberPool\(\{to: 1\}\)/"
            "\n"
        )
        self.assertEqual(
            "0",
            self.run_required_profile_analyzer({"decoy.rb": decoy}).stdout.strip(),
        )
        self.assertEqual(
            "0",
            self.run_required_profile_analyzer(
                {
                    "command-decoy.rb": (
                        r"warn /client\.messages\.sendNumberPool\(\{to: 1\}\)/"
                        "\n"
                    )
                }
            ).stdout.strip(),
        )
        self.assertEqual(
            "0",
            self.run_required_profile_analyzer(
                {
                    "multiline-decoy.rb": (
                        "pattern = /client.messages.\n"
                        "sendNumberPool({to: 1})/x\n"
                    )
                }
            ).stdout.strip(),
        )

        interpolated_send = (
            f"pattern = /prefix#{{Net::HTTP.post(URI('{url}'), "
            "{to: '+1'}.to_json)}}suffix/"
        )
        result = self.run_required_profile_analyzer(
            {"interpolated-send.rb": interpolated_send}
        )
        self.assertTrue(
            any(
                "interpolated-send.rb" in row
                for row in result.stdout.splitlines()[1:]
            ),
            result.stdout,
        )

    def test_jsx_and_ruby_regexp_reviews_hold_through_public_wrapper(self) -> None:
        url = "https://api.telnyx.com/v2/messages/number_pool"
        self.assert_required_profile_passes(
            {
                "docs.tsx": (
                    "export default () => <code>"
                    "client.messages.sendNumberPool({to: '+1'})"
                    "</code>;"
                )
            }
        )

        result, payload = self.run_messaging_linter(
            {
                "send.rb": (
                    "pattern = /don't/\n"
                    f"Net::HTTP.post(URI('{url}'), {{to: '+1'}}.to_json)"
                )
            }
        )
        self.assertEqual(1, result.returncode, payload)
        self.assert_required_profile_detected(payload, "send.rb")

    def test_export_default_regex_literals_preserve_following_sends(self) -> None:
        url = "https://api.telnyx.com/v2/messages/number_pool"
        send = (
            f"fetch('{url}',{{method:'POST',body:JSON.stringify("
            "{to:'+1'PROFILE})});"
        )
        for declaration in (
            "export default /[/*]/;",
            "export /* comment */ default /[//]/gu;",
            "export default\n/[/*]/;",
        ):
            for polarity, profile in (
                ("missing", ""),
                ("valid", ",messaging_profile_id:'mp'"),
            ):
                with self.subTest(declaration=declaration, polarity=polarity):
                    result = self.run_required_profile_analyzer(
                        {"send.js": declaration + "\n" + send.replace("PROFILE", profile)}
                    )
                    rows = result.stdout.splitlines()
                    self.assertGreaterEqual(int(rows[0]), 1, result.stdout)
                    findings = [row for row in rows[1:] if "send.js" in row]
                    self.assertEqual(polarity == "missing", bool(findings), result.stdout)

        # A member named `default` is an operand, not the export keyword.
        result = self.run_required_profile_analyzer(
            {"division.js": "const ratio = config.default / divisor;\n" + send.replace("PROFILE", "")}
        )
        self.assertTrue(any("division.js" in row for row in result.stdout.splitlines()[1:]))

    def test_shell_heredocs_accept_trailing_redirections(self) -> None:
        url = "https://api.telnyx.com/v2/messages/number_pool"
        command_tails = (
            ">sample.txt",
            ">> sample.txt 2>&1",
            "2>/dev/null >'sample file.txt'",
            "3>&1 1>sample.txt",
            "&>sample.txt",
            "&>> sample.txt # generated fixture",
            ">sample.txt # generated fixture",
            r">sample\ file.txt",
            "| sed 's/x/y/'",
            "|& tee sample.txt",
            "&& echo done",
            "; echo done",
        )
        for command_tail in command_tails:
            with self.subTest(command_tail=command_tail):
                inert = (
                    f"cat <<'DOC' {command_tail}\n"
                    "client.messages.sendNumberPool({to:'+1'})\n"
                    "DOC\n"
                )
                result = self.run_required_profile_analyzer({"example.sh": inert})
                self.assertEqual("0", result.stdout.strip(), result.stdout)

                live = inert + f"curl -X POST '{url}' -d '{{\"to\":\"+1\"}}'\n"
                result = self.run_required_profile_analyzer({"send.sh": live})
                rows = result.stdout.splitlines()
                self.assertEqual("1", rows[0], result.stdout)
                self.assertTrue(any("send.sh" in row for row in rows[1:]), result.stdout)

        # Compact shell bit shifts look exactly like unquoted heredoc openers
        # to a regex. They must not mask the real send that follows.
        arithmetic = (
            "mask=$((1<<SHIFT))",
            "((mask=1<<SHIFT))",
            "mask=$[1<<SHIFT]",
            "mask=$((nested(1)<<SHIFT))",
            "mask=$((\n  1<<SHIFT\n))",
            "((\n  mask=1<<SHIFT\n))",
            "mask=$[\n  1<<SHIFT\n]",
        )
        for expression in arithmetic:
            with self.subTest(expression=expression):
                source = (
                    expression
                    + "\n"
                    + f"curl -X POST '{url}' -d '{{\"to\":\"+1\"}}'\n"
                )
                result = self.run_required_profile_analyzer(
                    {"arithmetic.sh": source}
                )
                rows = result.stdout.splitlines()
                self.assertEqual("1", rows[0], result.stdout)
                self.assertTrue(
                    any("arithmetic.sh" in row for row in rows[1:]),
                    result.stdout,
                )

        for here_string in ("cat <<<WORD", "cat <<<'WORD'"):
            with self.subTest(here_string=here_string):
                source = (
                    here_string
                    + "\n"
                    + f"curl -X POST '{url}' -d '{{\"to\":\"+1\"}}'\n"
                )
                result = self.run_required_profile_analyzer(
                    {"here-string.sh": source}
                )
                rows = result.stdout.splitlines()
                self.assertEqual("1", rows[0], result.stdout)
                self.assertTrue(
                    any("here-string.sh" in row for row in rows[1:]),
                    result.stdout,
                )

        multiple = (
            "cat <<'FIRST' <<SECOND\n"
            "client.messages.sendNumberPool({to:'+1'})\n"
            "FIRST\n"
            "client.messages.sendNumberPool({to:'+1'})\n"
            "SECOND\n"
        )
        self.assertEqual(
            "0",
            self.run_required_profile_analyzer(
                {"multiple-inert.sh": multiple}
            ).stdout.strip(),
        )
        result = self.run_required_profile_analyzer(
            {
                "multiple-live.sh": multiple
                + f"curl -X POST '{url}' -d '{{\"to\":\"+1\"}}'\n"
            }
        )
        rows = result.stdout.splitlines()
        self.assertEqual("1", rows[0], result.stdout)
        self.assertTrue(
            any("multiple-live.sh" in row for row in rows[1:]), result.stdout
        )

        continued_live = (
            "cat <<'DOC' \\\n"
            f"| curl -X POST '{url}' -d '{{\"to\":\"+1\"}}'\n"
            "inert\nDOC\n"
        )
        result = self.run_required_profile_analyzer(
            {"continued-live.sh": continued_live}
        )
        rows = result.stdout.splitlines()
        self.assertEqual("1", rows[0], result.stdout)
        self.assertTrue(
            any("continued-live.sh" in row for row in rows[1:]), result.stdout
        )

        continued_multiple = (
            "cat <<'FIRST' \\\n  <<'SECOND'\n"
            "plain\nFIRST\n"
            "client.messages.sendNumberPool({to:'+1'})\nSECOND\n"
        )
        self.assertEqual(
            "0",
            self.run_required_profile_analyzer(
                {"continued-multiple.sh": continued_multiple}
            ).stdout.strip(),
        )

        # Only `<<-` strips leading tabs from delimiter lines. An indented word
        # in an ordinary heredoc body is data, not an early terminator.
        indented_non_terminator = (
            "cat <<DOC\n  DOC\n"
            "client.messages.sendNumberPool({to:'+1'})\nDOC\n"
        )
        self.assertEqual(
            "0",
            self.run_required_profile_analyzer(
                {"indented-delimiter.sh": indented_non_terminator}
            ).stdout.strip(),
        )

    def test_ruby_request_constructors_require_an_execution_link(self) -> None:
        url = "https://api.telnyx.com/v2/messages/number_pool"
        for verb in ("Post", "Put", "Patch"):
            prefix = (
                f"uri = URI('{url}')\n"
                f"req = Net::HTTP::{verb}.new(uri)\n"
                "req.body = {to:'+1'PROFILE}.to_json\n"
            )
            with self.subTest(verb=verb, execution="absent"):
                result = self.run_required_profile_analyzer(
                    {"request.rb": prefix.replace("PROFILE", "")}
                )
                self.assertEqual("0", result.stdout.strip(), result.stdout)
            for execution in ("http.request(req)", "http.request req"):
                for polarity, profile in (
                    ("missing", ""),
                    ("valid", ",messaging_profile_id:mp"),
                ):
                    with self.subTest(
                        verb=verb, execution=execution, polarity=polarity
                    ):
                        result = self.run_required_profile_analyzer(
                            {
                                "request.rb": prefix.replace("PROFILE", profile)
                                + execution
                                + "\n"
                            }
                        )
                        rows = result.stdout.splitlines()
                        self.assertEqual("1", rows[0], result.stdout)
                        findings = [row for row in rows[1:] if "request.rb" in row]
                        self.assertEqual(
                            polarity == "missing", bool(findings), result.stdout
                        )

        for binding in ("@req", "@@req", "$req"):
            with self.subTest(binding=binding):
                source = (
                    f"uri = URI('{url}')\n"
                    f"{binding} = Net::HTTP::Post.new(uri)\n"
                    f"{binding}.body = {{to:'+1'}}.to_json\n"
                    f"http.request({binding})\n"
                )
                result = self.run_required_profile_analyzer({"request.rb": source})
                rows = result.stdout.splitlines()
                self.assertEqual("1", rows[0], result.stdout)
                self.assertTrue(any("request.rb" in row for row in rows[1:]), result.stdout)

        # A later reaching definition or an execution in another method cannot
        # execute the discarded POST constructor.
        rebound = (
            f"pool = URI('{url}')\nother = URI('/health')\n"
            "req = Net::HTTP::Post.new(pool)\n"
            "req.body = {to:'+1'}.to_json\n"
            "req = Net::HTTP::Get.new(other)\nhttp.request(req)\n"
        )
        self.assertEqual(
            "0",
            self.run_required_profile_analyzer({"rebound.rb": rebound}).stdout.strip(),
        )
        cross_scope = (
            f"uri = URI('{url}')\nreq = Net::HTTP::Post.new(uri)\n"
            "req.body = {to:'+1'}.to_json\n"
            "def later\n  http.request(req)\nend\n"
        )
        self.assertEqual(
            "0",
            self.run_required_profile_analyzer(
                {"cross-scope.rb": cross_scope}
            ).stdout.strip(),
        )

        # An out-of-scope execution must not hide a later execution in the
        # constructor's real scope. Rebinding likewise follows exact local
        # identity, not a same-spelled member or an unrelated method local.
        later_in_scope = (
            f"uri = URI('{url}')\nreq = Net::HTTP::Post.new(uri)\n"
            "req.body = {to:'+1'}.to_json\n"
            "def helper\n  http.request(req)\nend\n"
            "http.request(req)\n"
        )
        member_rebind = (
            f"uri = URI('{url}')\nreq = Net::HTTP::Post.new(uri)\n"
            "req.body = {to:'+1'}.to_json\n"
            "self.req = cached_request\nhttp.request(req)\n"
        )
        nested_rebind = (
            f"uri = URI('{url}')\nreq = Net::HTTP::Post.new(uri)\n"
            "req.body = {to:'+1'}.to_json\n"
            "def helper\n  req = cached_request\nend\n"
            "http.request(req)\n"
        )
        compact_hash_rebind = (
            f"uri = URI('{url}')\nreq = Net::HTTP::Post.new(uri)\n"
            "req.body = {to:'+1'}.to_json\n"
            "x = {foo:req = cached_request}\nhttp.request(req)\n"
        )
        for name, source in (
            ("later-in-scope", later_in_scope),
            ("member-rebind", member_rebind),
            ("nested-rebind", nested_rebind),
        ):
            with self.subTest(name=name):
                result = self.run_required_profile_analyzer(
                    {f"{name}.rb": source}
                )
                rows = result.stdout.splitlines()
                self.assertEqual("1", rows[0], result.stdout)
                self.assertTrue(
                    any(f"{name}.rb" in row for row in rows[1:]),
                    result.stdout,
                )

        self.assertEqual(
            "0",
            self.run_required_profile_analyzer(
                {"compact-hash-rebind.rb": compact_hash_rebind}
            ).stdout.strip(),
        )

        # Ruby's sigiled bindings retain identity across method boundaries.
        sigiled_cross_scope = (
            "class Sender\n"
            "  def prepare\n"
            f"    uri = URI('{url}')\n"
            "    @req = Net::HTTP::Post.new(uri)\n"
            "    @req.body = {to:'+1'}.to_json\n"
            "  end\n"
            "  def deliver\n    http.request(@req)\n  end\n"
            "end\n"
        )
        result = self.run_required_profile_analyzer(
            {"sigiled-cross-scope.rb": sigiled_cross_scope}
        )
        rows = result.stdout.splitlines()
        self.assertEqual("1", rows[0], result.stdout)
        self.assertTrue(
            any("sigiled-cross-scope.rb" in row for row in rows[1:]),
            result.stdout,
        )

        compact_scope_decoys = (
            "def helper; http.request(req); end",
            "class Helper; def run; http.request(req); end; end",
            "def helper = http.request(req)",
            "def helper() = http.request(req)",
            "def req=(value); http.request(req); end",
            "def ==(other); http.request(req); end",
            "def []=(key, value); http.request(req); end",
            "private def helper = http.request(req)",
            "class Helper; http.request(req); end",
            "module Helper; http.request(req); end",
        )
        for decoy in compact_scope_decoys:
            with self.subTest(decoy=decoy):
                source = (
                    f"uri = URI('{url}')\n"
                    "req = Net::HTTP::Post.new(uri)\n"
                    "req.body = {to:'+1'}.to_json\n"
                    f"{decoy}\n"
                )
                self.assertEqual(
                    "0",
                    self.run_required_profile_analyzer(
                        {"compact-scope.rb": source}
                    ).stdout.strip(),
                )

        for polarity, profile in (
            ("missing", ""),
            ("valid", ",messaging_profile_id:mp"),
        ):
            with self.subTest(compact_method=polarity):
                source = (
                    f"def deliver; uri = URI('{url}'); "
                    "req = Net::HTTP::Post.new(uri); "
                    f"req.body = {{to:'+1'{profile}}}.to_json; "
                    "http.request(req); end\n"
                )
                result = self.run_required_profile_analyzer(
                    {"compact-method.rb": source}
                )
                rows = result.stdout.splitlines()
                self.assertEqual("1", rows[0], result.stdout)
                findings = [
                    row for row in rows[1:] if "compact-method.rb" in row
                ]
                self.assertEqual(
                    polarity == "missing", bool(findings), result.stdout
                )

        scoped_body_cases = {
            "foreign-present-does-not-satisfy": (
                f"uri = URI('{url}')\n"
                "req = Net::HTTP::Post.new(uri)\n"
                "def helper; req.body = {messaging_profile_id:mp}.to_json; end\n"
                "http.request(req)\n",
                True,
            ),
            "body-after-send-does-not-satisfy": (
                f"uri = URI('{url}')\n"
                "req = Net::HTTP::Post.new(uri)\n"
                "http.request(req)\n"
                "req.body = {messaging_profile_id:mp}.to_json\n",
                True,
            ),
            "foreign-missing-does-not-override-present": (
                f"uri = URI('{url}')\n"
                "req = Net::HTTP::Post.new(uri)\n"
                "def helper; req.body = {to:'+1'}.to_json; end\n"
                "req.body = {messaging_profile_id:mp,to:'+1'}.to_json\n"
                "http.request(req)\n",
                False,
            ),
        }
        for name, (source, should_find) in scoped_body_cases.items():
            with self.subTest(scoped_body=name):
                result = self.run_required_profile_analyzer(
                    {f"{name}.rb": source}
                )
                findings = [
                    row for row in result.stdout.splitlines()[1:]
                    if f"{name}.rb" in row
                ]
                self.assertEqual(should_find, bool(findings), result.stdout)

        for sigil in ("@", "@@", "$"):
            with self.subTest(sigil=sigil):
                source = (
                    f"uri = URI('{url}')\n"
                    f"{sigil}req = Net::HTTP::Post.new(uri)\n"
                    f"{sigil}req.body = "
                    "{messaging_profile_id:mp,to:'+1'}.to_json\n"
                    f"http.request({sigil}req)\n"
                )
                result = self.run_required_profile_analyzer(
                    {"sigiled-request.rb": source}
                )
                self.assertEqual("1", result.stdout.splitlines()[0])
                self.assertFalse(
                    any(
                        "sigiled-request.rb" in row
                        for row in result.stdout.splitlines()[1:]
                    ),
                    result.stdout,
                )

        cross_method_sigil = (
            "class Sender\n"
            f"  def prepare; uri=URI('{url}'); "
            "@req=Net::HTTP::Post.new(uri); "
            "@req.body={messaging_profile_id:mp}.to_json; end\n"
            "  def deliver; http.request(@req); end\n"
            "end\n"
        )
        result = self.run_required_profile_analyzer(
            {"cross-method-sigil.rb": cross_method_sigil}
        )
        self.assertEqual("1", result.stdout.splitlines()[0])
        self.assertFalse(
            any(
                "cross-method-sigil.rb" in row
                for row in result.stdout.splitlines()[1:]
            ),
            result.stdout,
        )

    def test_okhttp_request_lifecycle_requires_network_execution(self) -> None:
        url = "https://api.telnyx.com/v2/messages/number_pool"
        body = 'RequestBody.create("{\\"to\\":\\"+1\\"}", JSON)'
        request = f'new Request.Builder().url("{url}").post({body}).build()'
        inert = {
            "builder-only": request + ";",
            "new-call-only": f"client.newCall({request});",
            "stored-call-only": f"Call pending = client.newCall({request});",
            "bound-request-new-call-only": (
                f"Request req = {request};\nclient.newCall(req);"
            ),
            "rebound-call": (
                f"Request req = {request};\n"
                "Call pending = client.newCall(req);\n"
                "pending = client.newCall(healthRequest);\n"
                "pending.execute();"
            ),
            "stored-inline-call-only": (
                f"Call pending = client.newCall({request});"
            ),
        }
        for name, source in inert.items():
            with self.subTest(name=name):
                self.assertEqual(
                    "0",
                    self.run_required_profile_analyzer(
                        {f"{name}.java": source}
                    ).stdout.strip(),
                )

        live = {
            "inline-execute": f"client.newCall({request}).execute();",
            "inline-enqueue": f"client.newCall({request}).enqueue(callback);",
            "bound-direct": (
                f"Request req = {request};\nclient.newCall(req).execute();"
            ),
            "stored-execute": (
                f"Request req = {request};\n"
                "Call pending = client.newCall(req);\npending.execute();"
            ),
            "stored-enqueue": (
                f"Request req = {request};\n"
                "var pending = client.newCall(req);\npending.enqueue(callback);"
            ),
            "stored-final-execute": (
                f"Request req = {request};\n"
                "final Call pending = client.newCall(req);\npending.execute();"
            ),
            "stored-inline-execute": (
                f"Call pending = client.newCall({request});\npending.execute();"
            ),
            "request-rebound-after-capture": (
                f"Request req = {request};\n"
                "Call pending = client.newCall(req);\n"
                "req = healthRequest;\n"
                "pending.execute();"
            ),
        }
        for name, source in live.items():
            with self.subTest(name=name):
                result = self.run_required_profile_analyzer(
                    {f"{name}.java": source}
                )
                rows = result.stdout.splitlines()
                self.assertEqual("1", rows[0], result.stdout)
                self.assertTrue(
                    any(f"{name}.java" in row for row in rows[1:]),
                    result.stdout,
                )

        compliant_body = body.replace(
            '\\"to\\":\\"+1\\"',
            '\\"messaging_profile_id\\":\\"MP_OK\\",\\"to\\":\\"+1\\"',
        )
        for name, source in live.items():
            with self.subTest(name=name, polarity="compliant"):
                compliant_source = source.replace(body, compliant_body)
                result = self.run_required_profile_analyzer(
                    {f"{name}-compliant.java": compliant_source}
                )
                self.assertEqual(
                    "1",
                    result.stdout.splitlines()[0],
                )
                self.assertFalse(
                    any(
                        f"{name}-compliant.java" in row
                        for row in result.stdout.splitlines()[1:]
                    )
                )

        kotlin_missing = (
            f"val req = {request}\n"
            "client?.newCall(req)?.execute()"
        )
        kotlin_inert = f"client!!.newCall({request})"
        kotlin_result = self.run_required_profile_analyzer(
            {"kotlin-live.kt": kotlin_missing}
        )
        self.assertEqual("1", kotlin_result.stdout.splitlines()[0])
        self.assertTrue(
            any(
                "kotlin-live.kt" in row
                for row in kotlin_result.stdout.splitlines()[1:]
            ),
            kotlin_result.stdout,
        )
        self.assertEqual(
            "0",
            self.run_required_profile_analyzer(
                {"kotlin-inert.kt": kotlin_inert}
            ).stdout.strip(),
        )

    def test_review_regressions_hold_through_public_wrapper(self) -> None:
        url = "https://api.telnyx.com/v2/messages/number_pool"
        missing = {
            "send.js": (
                "export default /[/*]/;\n"
                f"fetch('{url}',{{method:'POST',body:JSON.stringify({{to:'+1'}})}});"
            )
        }
        result, payload = self.run_messaging_linter(missing)
        self.assertEqual(1, result.returncode, payload)
        self.assert_required_profile_detected(payload, "send.js")

        self.assert_required_profile_passes(
            {
                "example.sh": (
                    "cat <<DOC &>sample.txt # generated\n"
                    "client.messages.sendNumberPool({to:'+1'})\nDOC\n"
                ),
                "request.rb": (
                    f"uri=URI('{url}')\nreq=Net::HTTP::Post.new(uri)\n"
                    "req.body={to:'+1'}.to_json\n"
                ),
            }
        )

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

    def test_ruby_percent_literals_mask_data_and_preserve_interpolation(
        self,
    ) -> None:
        call = "client.messages.send_number_pool({to: '+1'})"
        inert_literals = {
            "q-brace": f"%q{{{call}}}",
            "q-paren": f"%q({call})",
            "q-bracket": f"%q[{call}]",
            "q-angle": f"%q<{call}>",
            "q-unpaired": f"%q!{call}!",
            "Q-template": f"%Q{{{call}}}",
            "default": f"%{{{call}}}",
            "words": f"%w[{call}]",
            "symbols": f"%i[{call}]",
            "symbol": f"%s!{call}!",
            "regex": f"%r!{call}!",
            "command": f"%x{{echo {call}}}",
            "escaped-delimiter": rf"%q!example \! {call}!",
        }
        for label, literal in inert_literals.items():
            with self.subTest(literal=label):
                result = self.run_required_profile_analyzer(
                    {"example.rb": f"template = {literal}\n"}
                )
                self.assertEqual("0", result.stdout.strip(), result.stdout)

        interpolating_literals = {
            "Q": f"%Q{{#{{{call}}}}}",
            "default": f"%{{#{{{call}}}}}",
            "W": f"%W[#{{{call}}}]",
            "I": f"%I[#{{{call}}}]",
            "regex": f"%r!#{{{call}}}!",
            "command": f"%x{{#{{{call}}}}}",
            "double-quoted": f'"#{{{call}}}"',
            "backtick": f"`#{{{call}}}`",
        }
        for label, literal in interpolating_literals.items():
            with self.subTest(interpolation=label):
                result = self.run_required_profile_analyzer(
                    {"live.rb": f"value = {literal}\n"}
                )
                rows = result.stdout.splitlines()
                self.assertGreaterEqual(int(rows[0]), 1, result.stdout)

        # Non-interpolating and escaped forms remain data, and scanning resumes
        # after a percent literal so a later real call is still visible.
        result = self.run_required_profile_analyzer(
            {
                "mixed.rb": (
                    f"a = %q{{#{{{call}}}}}\n"
                    f'b = "\\#{{{call}}}"\n'
                    f"{call}\n"
                )
            }
        )
        self.assertEqual("1", result.stdout.splitlines()[0], result.stdout)

        # Public-entry polarity for the originally reported false blocker.
        self.assert_required_profile_passes(
            {"example.rb": f"template = %q{{{call}}}\n"}
        )

    def test_python_and_csharp_interpolation_preserve_only_expressions(
        self,
    ) -> None:
        python_call = "client.messages.send_number_pool({'to': '+1'})"
        python_live = {
            "lower": f'f"{{{python_call}}}"',
            "upper": f'F"{{{python_call}}}"',
            "raw-first": f'rf"{{{python_call}}}"',
            "format-first": f'fr"{{{python_call}}}"',
            "triple": f'f"""{{{python_call}}}"""',
            "nested-format": f'f"{{value:{{{python_call}}}}}"',
        }
        csharp_call = (
            "client.Messages.SendNumberPool(new MessageSendNumberPoolParams "
            '{ To = "+1" })'
        )
        csharp_live = {
            "regular": f'$"{{{csharp_call}}}"',
            "verbatim-dollar-first": f'$@"{{{csharp_call}}}"',
            "verbatim-at-first": f'@$"{{{csharp_call}}}"',
            "raw": f'$"""{{{csharp_call}}}"""',
            "raw-two-dollar": f'$$"""{{{{{csharp_call}}}}}"""',
            "alignment": f'$"{{{csharp_call},10}}"',
        }
        for language, suffix, forms in (
            ("python", ".py", python_live),
            ("csharp", ".cs", csharp_live),
        ):
            for label, literal in forms.items():
                with self.subTest(language=language, shape=label):
                    result = self.run_required_profile_analyzer(
                        {f"live{suffix}": f"value = {literal}\n"}
                    )
                    rows = result.stdout.splitlines()
                    self.assertGreaterEqual(int(rows[0]), 1, result.stdout)

        inert = {
            "python-escaped.py": f'f"{{{{{python_call}}}}}"',
            "python-ordinary.py": f'"{{{python_call}}}"',
            "python-format.py": (
                f'f"{{value:{python_call}}}"'
            ),
            "csharp-escaped.cs": f'$"{{{{{csharp_call}}}}}"',
            "csharp-ordinary.cs": f'"{{{csharp_call}}}"',
            "csharp-format.cs": f'$"{{value:{csharp_call}}}"',
            "csharp-raw.cs": f'"""{{{csharp_call}}}"""',
        }
        for fixture, source in inert.items():
            with self.subTest(inert=fixture):
                result = self.run_required_profile_analyzer(
                    {fixture: f"value = {source};\n"}
                )
                self.assertEqual("0", result.stdout.strip(), result.stdout)

        # The public wrapper must block the reported missing-profile forms and
        # accept their compliant twins in both languages.
        for fixture, source, compliant in (
            (
                "live.py",
                f'value = f"{{{python_call}}}"\n',
                python_call.replace("'to': '+1'", "'to': '+1', 'messaging_profile_id': 'mp'"),
            ),
            (
                "Live.cs",
                f'value = $"{{{csharp_call}}}";\n',
                csharp_call.replace('To = "+1"', 'To = "+1", MessagingProfileId = "mp"'),
            ),
        ):
            with self.subTest(public=fixture, polarity="missing"):
                _, payload = self.run_messaging_linter({fixture: source})
                self.assert_required_profile_detected(payload, fixture)
            with self.subTest(public=fixture, polarity="compliant"):
                self.assert_required_profile_passes(
                    {fixture: source.replace(python_call if fixture.endswith('.py') else csharp_call, compliant)}
                )

    def test_kotlin_and_scala_interpolation_preserve_only_expressions(
        self,
    ) -> None:
        call = (
            "client.messages.sendNumberPool(new MessageSendNumberPoolParams()"
            '.setTo("+1"))'
        )
        alias_call = "client.messages.sendNumberPool(payload)"
        live = {
            "lower.kt": f'val value = "${{{call}}}"\n',
            "script.kts": f'val value = "${{{call}}}"\n',
            "raw.kt": f'val value = """${{{call}}}"""\n',
            "s.scala": f'val value = s"${{{call}}}"\n',
            "f.scala": f'val value = f"${{{call}}}%s"\n',
            "raw.scala": f'val value = raw"""${{{call}}}"""\n',
            "even-backslash.kt": f'val value = "\\\\${{{alias_call}}}"\n',
            "raw-backslash.kt": f'val value = """\\${{{alias_call}}}"""\n',
        }
        for fixture, source in live.items():
            with self.subTest(live=fixture):
                result = self.run_required_profile_analyzer({fixture: source})
                rows = result.stdout.splitlines()
                self.assertGreaterEqual(int(rows[0]), 1, result.stdout)

        inert = {
            # Keep the reviewed payload-variable form: a nested quote in the
            # expression once ended the outer string early and made this test
            # pass without exercising marker restoration at all.
            "escaped.kt": f'val value = "\\${{{alias_call}}}"\n',
            "ordinary.scala": f'val value = "${{{call}}}"\n',
            "escaped.scala": f'val value = s"$${{{call}}}"\n',
            "ordinary.java": f'String value = "${{{call}}}";\n',
        }
        for fixture, source in inert.items():
            with self.subTest(inert=fixture):
                result = self.run_required_profile_analyzer({fixture: source})
                self.assertEqual("0", result.stdout.strip(), result.stdout)

    def test_shell_quoted_command_substitutions_remain_executable(
        self,
    ) -> None:
        command = (
            "curl -X POST https://api.telnyx.com/v2/messages/number_pool "
            "-d '{\"to\":\"+1\"}'"
        )
        live = {
            "dollar.sh": f'result="$({command})"\n',
            "backtick.sh": f"result=`{command}`\n",
            "nested.sh": f'result="$(printf %s "$({command})")"\n',
        }
        for fixture, source in live.items():
            with self.subTest(live=fixture):
                result = self.run_required_profile_analyzer({fixture: source})
                rows = result.stdout.splitlines()
                self.assertGreaterEqual(int(rows[0]), 1, result.stdout)

        inert = {
            "single.sh": f"result='$({command})'\n",
            "escaped.sh": f'result="\\$({command})"\n',
        }
        for fixture, source in inert.items():
            with self.subTest(inert=fixture):
                result = self.run_required_profile_analyzer({fixture: source})
                self.assertEqual("0", result.stdout.strip(), result.stdout)

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


CSHARP_DISCOVERY_RESOURCES = (
    ("Twilio.Rest.Api.V2010.Account.MessageResource", "messaging"),
    ("Twilio.Rest.Api.V2010.Account.CallResource", "voice"),
    ("Twilio.Rest.Verify.V2.Service.VerificationResource", "verify"),
    ("Twilio.Rest.Fax.V1.FaxResource", "fax"),
    ("Twilio.Rest.Supersim.V1.SimResource", "iot"),
    ("Twilio.Rest.Wireless.V1.SimResource", "iot"),
    ("Twilio.Rest.Conversations.V1.ConversationResource", "conversations"),
    ("Twilio.Rest.Conversations.V1.Service.ConversationResource", "conversations"),
    ("Twilio.Rest.Notify.V1.Service.NotificationResource", "notify"),
    ("Twilio.Rest.Taskrouter.V1.Workspace.WorkflowResource", "taskrouter"),
)


class CsharpResourceOwnershipSiblings(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.calls = staticmethod(runpy.run_path(str(DEEP_SCAN_SCRIPT.with_name("sdk-source-ownership.py")))["contextual_calls"])

    def products(self, source: str) -> set[str]:
        return {product for _, product in self.calls(source, ".cs")}

    def test_imported_and_fully_qualified_resources_are_owned(self) -> None:
        for target, product in CSHARP_DISCOVERY_RESOURCES:
            namespace, resource = target.rsplit(".", 1)
            for source in (
                f"using {namespace}; class App {{ void Run() {{ {resource}.CreateAsync(); }} }}",
                f"class App {{ void Run() {{ global::{target}.Fetch(); }} }}",
            ):
                with self.subTest(target=target, source=source):
                    self.assertEqual({product}, self.products(source))

    def test_alias_is_owned(self) -> None:
        source = (
            "using Verify = Twilio.Rest.Verify.V2.Service.VerificationResource; "
            "class App { void Run() { Verify.Create(); } }"
        )
        self.assertEqual({"verify"}, self.products(source))

    def test_namespace_import_does_not_cross_boundary(self) -> None:
        source = (
            "namespace One { using Twilio.Rest.Fax.V1; } "
            "namespace Two { class FaxResource { public static void Create() {} } "
            "class App { void Run() { FaxResource.Create(); } } }"
        )
        self.assertEqual(set(), self.products(source))

    def test_alias_and_resource_are_shadowed_locally(self) -> None:
        fixtures = (
            "using Verify = Twilio.Rest.Verify.V2.Service.VerificationResource; "
            "class App { void Run(Queue Verify) { Verify.Create(); } }",
            "using Twilio.Rest.Conversations.V1; "
            "class ConversationResource { public static void Create() {} } "
            "class App { void Run() { ConversationResource.Create(); } }",
        )
        for source in fixtures:
            with self.subTest(source=source):
                self.assertEqual(set(), self.products(source))

    def test_shallow_scanner_rejects_unowned_bare_resources(self) -> None:
        declarations = "\n".join(
            f"class {target.rsplit('.', 1)[-1]} {{ public static void Create() {{}} }}"
            for target, _ in dict(CSHARP_DISCOVERY_RESOURCES).items()
        )
        calls = "\n".join(
            f"{target.rsplit('.', 1)[-1]}.Create();" for target, _ in CSHARP_DISCOVERY_RESOURCES
        )
        with tempfile.TemporaryDirectory(prefix="csharp-resource-ownership-") as directory:
            (Path(directory) / "App.cs").write_text(
                declarations + "\nclass App { void Run() {\n" + calls + "\n} }\n",
                encoding="utf-8",
            )
            result = subprocess.run(
                [BASH, str(SCAN_USAGE_SCRIPT), directory], cwd=ROOT,
                capture_output=True, text=True, timeout=30, check=False,
            )
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual([], json.loads(result.stdout)["products_used"])



class GradleMapDependencySiblings(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.helper = runpy.run_path(str(DEEP_SCAN_SCRIPT.with_name("inspect-sdk-dependencies.py")))

    def inspect(self, source: str) -> tuple[bool, bool]:
        with tempfile.TemporaryDirectory(prefix="gradle-map-dependency-") as directory:
            root = Path(directory)
            (root / "build.gradle").write_text(source, encoding="utf-8")
            dependencies = self.helper["gradle_dependencies"](root)
            declared = any(
                group == "com.telnyx.sdk" and artifact == "telnyx"
                for group, artifact, _ in dependencies
            )
            return declared, self.helper["gradle_pinned"](root)

    def test_named_map_notation_is_declared_and_pinned(self) -> None:
        sources = (
            "dependencies { implementation group: 'com.telnyx.sdk', "
            "name: 'telnyx', version: '6.89.0' }",
            "dependencies { implementation(version: '6.89.0', "
            "name: 'telnyx', group: 'com.telnyx.sdk') }",
            "dependencies { api name: \"telnyx\", version: \"6.89.0\", "
            "group: \"com.telnyx.sdk\" }",
        )
        for source in sources:
            with self.subTest(source=source):
                self.assertEqual((True, True), self.inspect(source))

    def test_missing_or_dynamic_version_is_declared_but_not_pinned(self) -> None:
        sources = (
            "implementation group: 'com.telnyx.sdk', name: 'telnyx'",
            "implementation group: 'com.telnyx.sdk', name: 'telnyx', "
            "version: sdkVersion",
            "implementation(group: 'com.telnyx.sdk', name: 'telnyx', "
            "version: 'latest.release')",
        )
        for source in sources:
            with self.subTest(source=source):
                self.assertEqual((True, False), self.inspect(source))

    def test_unrelated_coordinates_are_not_telnyx(self) -> None:
        sources = (
            "implementation group: 'com.example', name: 'telnyx', version: '6.89.0'",
            "implementation group: 'com.telnyx.sdk', name: 'other', version: '6.89.0'",
        )
        for source in sources:
            with self.subTest(source=source):
                self.assertEqual((False, False), self.inspect(source))

    def test_map_fields_do_not_cross_statement_boundaries(self) -> None:
        source = (
            "implementation group: 'com.telnyx.sdk'; "
            "implementation name: 'telnyx', version: '6.89.0'"
        )
        self.assertEqual((False, False), self.inspect(source))

    def test_comma_newline_continues_named_map(self) -> None:
        source = (
            "implementation group: 'com.telnyx.sdk',\n"
            "  name: 'telnyx',\n"
            "  version: '6.89.0'"
        )
        self.assertEqual((True, True), self.inspect(source))

    def test_later_dynamic_duplicate_invalidates_literal_version(self) -> None:
        source = (
            "implementation group: 'com.telnyx.sdk', name: 'telnyx', "
            "version: '6.89.0', version: sdkVersion"
        )
        self.assertEqual((True, False), self.inspect(source))

    def test_comments_and_prose_do_not_establish_map_dependency(self) -> None:
        sources = (
            "// implementation group: 'com.telnyx.sdk', name: 'telnyx', version: '6.89.0'",
            "def help = \"implementation group: 'com.telnyx.sdk', name: 'telnyx', "
            "version: '6.89.0'\"",
            "dependencies { /* implementation group: 'com.telnyx.sdk', "
            "name: 'telnyx', version: '6.89.0' */ }",
        )
        for source in sources:
            with self.subTest(source=source):
                self.assertEqual((False, False), self.inspect(source))

    def test_validator_accepts_declared_pinned_map_dependency(self) -> None:
        with tempfile.TemporaryDirectory(prefix="gradle-map-validator-") as directory:
            (Path(directory) / "build.gradle").write_text(
                "dependencies { implementation group: 'com.telnyx.sdk', "
                "name: 'telnyx', version: '6.89.0' }",
                encoding="utf-8",
            )
            result = subprocess.run(
                [BASH, str(VALIDATE_MIGRATION_SCRIPT), directory, "--json"],
                cwd=ROOT, capture_output=True, text=True, timeout=30,
                check=False,
            )
        checks = {
            check["name"]: check["status"]
            for check in json.loads(result.stdout)["checks"]
        }
        self.assertEqual("pass", checks["telnyx_sdk_dependency"])
        self.assertEqual("pass", checks["telnyx_sdk_version_pinned"])



class DeclaredSdkVersionContracts(unittest.TestCase):
    def checks(self, files: dict[str, str | bytes]) -> dict[str, str]:
        with tempfile.TemporaryDirectory(prefix="declared-sdk-version-") as directory:
            for name, content in files.items():
                path = Path(directory) / name
                path.parent.mkdir(parents=True, exist_ok=True)
                if isinstance(content, bytes):
                    path.write_bytes(content)
                else:
                    path.write_text(content, encoding="utf-8")
            result = subprocess.run(
                [BASH, str(VALIDATE_MIGRATION_SCRIPT), directory, "--json"],
                cwd=ROOT, capture_output=True, text=True, timeout=30, check=False,
            )
        self.assertNotIn("Traceback", result.stderr)
        return {item["name"]: item["status"]
                for item in json.loads(result.stdout)["checks"]}

    def assert_manifest(self, files: dict[str, str], declared: bool, pinned: bool) -> None:
        checks = self.checks(files)
        self.assertEqual("pass" if declared else "fail", checks["telnyx_sdk_dependency"])
        self.assertEqual("pass" if pinned else "warn", checks["telnyx_sdk_version_pinned"])

    def test_source_import_fallback_respects_file_filters(self) -> None:
        # Run under GNU grep in CI and BSD grep on macOS: excluded files and
        # non-source manifests must not supply evidence of an SDK import.
        for name, expected in (
            ("app.py", "warn"), ("app.js", "warn"),
            ("notes.txt", "fail"), ("metadata.json", "fail"),
            ("go.mod", "fail"), ("libs.versions.toml", "fail"),
            ("node_modules/app.js", "fail"), (".git/app.py", "fail"),
        ):
            with self.subTest(name=name):
                checks = self.checks({name: "import telnyx\n"})
                self.assertEqual(expected, checks["telnyx_sdk_dependency"])

    def test_node_exact_and_declared_dependency_sections(self) -> None:
        for section in ("dependencies", "devDependencies", "optionalDependencies", "peerDependencies"):
            with self.subTest(section=section):
                self.assert_manifest({"package.json": json.dumps({section: {"telnyx": "6.0.0"}})}, True, True)

    def test_node_metadata_does_not_supply_sdk_or_version(self) -> None:
        for dependencies, declared in (({}, False), ({"telnyx": "*"}, True)):
            with self.subTest(dependencies=dependencies):
                self.assert_manifest({"package.json": json.dumps({
                    "dependencies": dependencies, "config": {"telnyx": "^6.0"}, "version": "1.0.0",
                })}, declared, False)

    def test_node_unbounded_alternative_is_not_a_constraint(self) -> None:
        for value in ("", "*", "latest", "^6.0 || *"):
            with self.subTest(value=value):
                self.assert_manifest({"package.json": json.dumps({"dependencies": {"telnyx": value}})}, True, False)

    def test_python_literal_manifest_forms(self) -> None:
        fixtures = (
            {"requirements.txt": "telnyx == 4.0.0\n"},
            {"Pipfile": '[packages]\ntelnyx = "==4.0.0"\n'},
            {"Pipfile": '[dev-packages]\ntelnyx = {version = ">=4.0,<5.0"}\n'},
            {"pyproject.toml": '[project]\ndependencies = ["telnyx >= 4.0, < 5.0"]\n'},
            {"pyproject.toml": '[tool.poetry.dependencies]\ntelnyx = "^4.0"\n'},
            {"setup.cfg": '[options]\ninstall_requires =\n    telnyx == 4.0.0\n'},
            {"setup.py": 'from setuptools import setup\nsetup(install_requires=["telnyx == 4.0.0"])\n'},
        )
        for files in fixtures:
            with self.subTest(files=files):
                self.assert_manifest(files, True, True)

    def test_python_requirements_hash_options_and_continuations(self) -> None:
        digest = "a" * 64
        for source in (
            f"telnyx==4.0 --hash=sha256:{digest}\n",
            "telnyx==4.0 \\" + f"\n    --hash=sha256:{digest}\n",
            f"telnyx[aiohttp]==4.0 \\\r\n    --hash sha256:{digest} --hash=sha256:{digest}\r\n",
            f'telnyx==4.0; python_version >= "3.10" --hash=sha256:{digest}\n',
            "telnyx>=4.0,\\\n    <5.0 # bounded range\n",
        ):
            with self.subTest(source=source):
                self.assert_manifest({"requirements.txt": source}, True, True)

    def test_python_requirement_options_do_not_supply_version_evidence(self) -> None:
        for source, declared in (
            ("telnyx --hash=sha256:abcd\n", True),
            ("telnyx\nother==4.0 --hash=sha256:abcd\n", True),
            ("# telnyx==4.0 --hash=sha256:abcd\n", False),
            ("other==4.0 --config-settings=telnyx==4.0\n", False),
            ("telnyx>=4banana --hash=sha256:abcd\n", True),
        ):
            with self.subTest(source=source):
                self.assert_manifest({"requirements.txt": source}, declared, False)

    def test_setup_literal_bindings_reach_their_own_call(self) -> None:
        for source in (
            'REQS=["telnyx>=4.0"]\nsetup(install_requires=REQS)',
            'REQS=["telnyx>=4.0"]\nALIAS=REQS\nsetup(install_requires=ALIAS)',
            'BASE=["other"]\nREQS=BASE + ["telnyx>=4.0"]\nsetup(install_requires=REQS)',
            'EXTRAS={"sms": ["telnyx>=4.0"]}\nsetup(extras_require=EXTRAS)',
            'REQS: list[str] = ["telnyx>=4.0"]\nsetup(install_requires=REQS)',
            'def configure():\n    REQS=["telnyx>=4.0"]\n    setup(install_requires=REQS)',
        ):
            with self.subTest(source=source):
                self.assert_manifest({"setup.py": "from setuptools import setup\n" + source}, True, True)

    def test_setup_import_identity_and_alias_siblings(self) -> None:
        for prefix, callee in (
            ("from setuptools import setup as package_setup", "package_setup"),
            ("from setuptools import (find_packages, setup as package_setup)", "package_setup"),
            ("import setuptools as packaging", "packaging.setup"),
            ("import setuptools\npackaging = setuptools", "packaging.setup"),
            ("from setuptools import setup\npackage_setup = setup", "package_setup"),
            ("import setuptools as packaging\npackage_setup = packaging.setup", "package_setup"),
            ("from distutils.core import setup as package_setup", "package_setup"),
        ):
            with self.subTest(prefix=prefix):
                self.assert_manifest({"setup.py": prefix + f'\n{callee}(install_requires=["telnyx>=4.0"])\n'}, True, True)

    def test_setup_equivalent_import_branches_preserve_ownership(self) -> None:
        for prefix, callee in (
            ("try:\n    from setuptools import setup\nexcept ImportError:\n    from distutils.core import setup", "setup"),
            ("if sys.version_info >= (3, 0):\n    from setuptools import setup\nelse:\n    from distutils.core import setup", "setup"),
            ("try:\n    from setuptools import setup as configure\nexcept (ImportError, ModuleNotFoundError):\n    from distutils.core import setup as configure", "configure"),
            ("if version:\n    import setuptools as packaging\nelse:\n    import setuptools as packaging", "packaging.setup"),
            ("try:\n    from setuptools import setup\nexcept ImportError:\n    from distutils.core import setup\nelse:\n    pass\nfinally:\n    pass", "setup"),
            ("if version:\n    try:\n        from setuptools import setup\n    except ImportError:\n        from distutils.core import setup\nelse:\n    from setuptools import setup", "setup"),
            ("if version:\n    from setuptools import setup\n    REQS = ['other']\nelse:\n    from distutils.core import setup\n    REQS = []", "setup"),
        ):
            with self.subTest(prefix=prefix):
                self.assert_manifest({"setup.py": prefix + f'\n{callee}(install_requires=["telnyx>=4.0"])\n'}, True, True)

    def test_setup_submodule_and_public_star_imports(self) -> None:
        for prefix, callee in (
            ("import setuptools.command.sdist", "setuptools.setup"),
            ("import os, setuptools.command.sdist", "setuptools.setup"),
            ("from setuptools import *", "setup"),
            ("REQS=['telnyx>=4.0']\nfrom setuptools import *", "setup"),
        ):
            with self.subTest(prefix=prefix):
                self.assert_manifest({"setup.py": prefix + f'\n{callee}(install_requires=' + ("REQS" if prefix.startswith("REQS") else '["telnyx>=4.0"]') + ')\n'}, True, True)

    def test_setup_import_branch_negatives_stay_unresolved(self) -> None:
        for prefix, callee in (
            ("if version:\n    from setuptools import setup", "setup"),
            ("if version:\n    from setuptools import setup\nelse:\n    from other import setup", "setup"),
            ("try:\n    from setuptools import setup\nexcept ImportError:\n    pass", "setup"),
            ("try:\n    from setuptools import setup\nexcept ImportError as setup:\n    from distutils.core import setup", "setup"),
            ("try:\n    from setuptools import setup\nexcept ImportError:\n    from distutils.core import setup\nfinally:\n    setup = other", "setup"),
            ("if version:\n    from setuptools import setup\n    setup = other\nelse:\n    from setuptools import setup", "setup"),
            ("import setuptools.command.sdist as setuptools", "setuptools.setup"),
            ("from setuptools.command.sdist import *", "setup"),
            ("from .setuptools import *", "setup"),
            ("from setuptools import *\nsetup = other", "setup"),
            ("from setuptools import *\nfrom other import *", "setup"),
            ("import setuptools as a\nimport setuptools as b\nb.setup = other", "a.setup"),
            ("if version:\n    import setuptools as packaging\n    packaging.setup = other\nelse:\n    import setuptools as packaging", "packaging.setup"),
        ):
            with self.subTest(prefix=prefix):
                checks = self.checks({"setup.py": prefix + f'\n{callee}(install_requires=["telnyx>=4.0"])\n'})
                self.assertNotEqual("pass", checks["telnyx_sdk_dependency"])
                self.assertEqual("warn", checks["telnyx_sdk_version_pinned"])

        for alternative in ('[]', '["telnyx>=4.0"]'):
            with self.subTest(conditional_requirements=alternative):
                checks = self.checks({"setup.py": 'if version:\n    from setuptools import setup\n    REQS=["telnyx>=4.0"]\nelse:\n    from distutils.core import setup\n    REQS=' + alternative + '\nsetup(install_requires=REQS)\n'})
                self.assertNotEqual("pass", checks["telnyx_sdk_dependency"])
                self.assertEqual("warn", checks["telnyx_sdk_version_pinned"])

    def test_manifest_encodings_follow_each_format(self) -> None:
        for name, content in (
            ("requirements.txt", b"\xef\xbb\xbftelnyx==4.0.0\n"),
            ("requirements.txt", b"# -*- coding: latin-1 -*-\n# caf\xe9\ntelnyx>=4.0\n"),
            ("requirements.txt", "telnyx>=4.0\n".encode("utf-16")),
            ("requirements.txt", "telnyx>=4.0\n".encode("utf-32")),
            ("requirements.txt", b"# first\n# coding: latin-1\n# caf\xe9\ntelnyx>=4.0\n"),
            ("setup.py", b'\xef\xbb\xbffrom setuptools import setup as s\ns(install_requires=["telnyx>=4.0"])\n'),
            ("setup.py", b'# coding: latin-1\n# caf\xe9\nfrom setuptools import setup as s\ns(install_requires=["telnyx>=4.0"])\n'),
            ("package.json", b'\xef\xbb\xbf{"dependencies":{"telnyx":"^6.0.0"}}'),
        ):
            with self.subTest(name=name, content=content):
                checks = self.checks({name: content})
                self.assertEqual("pass", checks["telnyx_sdk_dependency"])
                self.assertEqual("pass", checks["telnyx_sdk_version_pinned"])

    def test_setup_class_scope_is_not_a_method_closure(self) -> None:
        for source, declared in (
            ('class C:\n    from setuptools import setup as configure\n    def run(self):\n        configure(install_requires=["telnyx>=4.0"])', False),
            ('class C:\n    import setuptools as packaging\n    def run(self):\n        packaging.setup(install_requires=["telnyx>=4.0"])', False),
            ('class C:\n    from setuptools import setup as configure\n    class Inner:\n        configure(install_requires=["telnyx>=4.0"])', False),
            ('class C:\n    from setuptools import setup as configure\n    values = [configure(install_requires=["telnyx>=4.0"]) for x in [1]]', False),
            ('class C:\n    from setuptools import setup as configure\n    values = [x for x in configure(install_requires=["telnyx>=4.0"])]', True),
            ('class C:\n    from setuptools import setup as configure\n    values = [x for configure in configure(install_requires=["telnyx>=4.0"])]', True),
            ('from setuptools import setup as configure\nvalues = [x for configure in configure(install_requires=["telnyx>=4.0"])]', True),
            ('class C:\n    from setuptools import setup as configure\n    configure(install_requires=["telnyx>=4.0"])', True),
            ('from setuptools import setup as configure\nclass C:\n    configure = None\n    def run(self):\n        configure(install_requires=["telnyx>=4.0"])', True),
            ('import setuptools as packaging\nclass C:\n    packaging.setup = other\n    def run(self):\n        packaging.setup(install_requires=["telnyx>=4.0"])', False),
            ('from setuptools import setup as configure\nREQS=["telnyx>=4.0"]\nclass C:\n    REQS.clear()\n    def run(self):\n        configure(install_requires=REQS)', False),
        ):
            with self.subTest(source=source):
                checks = self.checks({"setup.py": source})
                self.assertEqual(declared, checks["telnyx_sdk_dependency"] == "pass")
                self.assertEqual("pass" if declared else "warn", checks["telnyx_sdk_version_pinned"])

    def test_invalid_encoding_does_not_create_dependency_evidence(self) -> None:
        for name, content in (
            ("requirements.txt", b"# coding: unknown-encoding\ntelnyx>=4.0\n"),
            ("setup.py", b'\xef\xbb\xbf# coding: latin-1\nfrom setuptools import setup\nsetup(install_requires=["telnyx>=4.0"])'),
            ("pyproject.toml", b'\xef\xbb\xbf[project]\ndependencies=["telnyx>=4.0"]'),
            ("Pipfile", b'\xef\xbb\xbf[packages]\ntelnyx="==4.0.0"'),
        ):
            with self.subTest(name=name):
                checks = self.checks({name: content})
                self.assertNotEqual("pass", checks["telnyx_sdk_dependency"])
                self.assertEqual("warn", checks["telnyx_sdk_version_pinned"])

    def test_setup_unrelated_and_shadowed_imports_do_not_certify(self) -> None:
        for source in (
            'from unrelated import setup\nsetup(install_requires=["telnyx>=4.0"])',
            'def setup(**kwargs): pass\nsetup(install_requires=["telnyx>=4.0"])',
            'from setuptools import setup as configure\nconfigure = unrelated\nconfigure(install_requires=["telnyx>=4.0"])',
            'from setuptools import setup as configure\ndef run(configure):\n    configure(install_requires=["telnyx>=4.0"])',
            'from setuptools import setup as configure\ndef run():\n    configure(install_requires=["telnyx>=4.0"])\n    from unrelated import configure',
            'from setuptools import setup as configure\ndef run():\n    configure(install_requires=["telnyx>=4.0"])\n    def configure(**kwargs): pass',
            'import setuptools as packaging\nalias = packaging\nalias.setup = unrelated\npackaging.setup(install_requires=["telnyx>=4.0"])',
            'def other():\n    from setuptools import setup as configure\nconfigure(install_requires=["telnyx>=4.0"])',
            'from setuptools import setup as configure\nif enabled:\n    from unrelated import configure\nconfigure(install_requires=["telnyx>=4.0"])',
            'from setuptools import setup as configure\nif enabled:\n    def configure(**kwargs): pass\nconfigure(install_requires=["telnyx>=4.0"])',
            'from setuptools import setup as configure\nfrom unrelated import *\nconfigure(install_requires=["telnyx>=4.0"])',
        ):
            with self.subTest(source=source):
                checks = self.checks({"setup.py": source})
                self.assertNotEqual("pass", checks["telnyx_sdk_dependency"])
                self.assertEqual("warn", checks["telnyx_sdk_version_pinned"])

    def test_setup_binding_scope_reassignment_and_mutation_are_not_stale_evidence(self) -> None:
        for source in (
            'REQS=["telnyx>=4.0"]\nREQS=[]\nsetup(install_requires=REQS)',
            'setup(install_requires=REQS)\nREQS=["telnyx>=4.0"]',
            'def unrelated():\n    REQS=["telnyx>=4.0"]\nsetup(install_requires=REQS)',
            'REQS=["telnyx>=4.0"]\ndef configure(REQS):\n    setup(install_requires=REQS)',
            'REQS=["telnyx>=4.0"]\ndef configure():\n    setup(install_requires=REQS)\n    REQS=[]',
            'REQS=["telnyx>=4.0"]\nREQS.clear()\nsetup(install_requires=REQS)',
            'REQS=["telnyx>=4.0"]\nALIAS=REQS\nALIAS.clear()\nsetup(install_requires=REQS)',
            'REQS=["telnyx>=4.0"]\nCONFIG={"requires": REQS}\nCONFIG["requires"].clear()\nsetup(install_requires=REQS)',
            'REQS=["telnyx>=4.0"]\nCONFIG={"requires": REQS}\nmutate(CONFIG)\nsetup(install_requires=REQS)',
            'REQS=["telnyx>=4.0"]\nfor REQS in [[]]:\n    setup(install_requires=REQS)',
            'REQS=["telnyx>=4.0"]\nwith open("x") as REQS:\n    setup(install_requires=REQS)',
            'REQS=["telnyx>=4.0"]\ntry:\n    load()\nexcept Exception as REQS:\n    setup(install_requires=REQS)',
            'REQS=["telnyx>=4.0"]\nif mutate(REQS):\n    setup(install_requires=REQS)',
            'REQS=["telnyx>=4.0"]\n[setup(install_requires=REQS) for REQS in [[]]]',
            'REQS=["telnyx>=4.0"]\nif dynamic:\n    REQS=[]\nsetup(install_requires=REQS)',
            'REQS=read_requirements()\nsetup(install_requires=REQS)',
        ):
            with self.subTest(source=source):
                self.assert_manifest({"setup.py": "from setuptools import setup\n" + source}, False, False)

    def test_ruby_conditional_modifiers_preserve_argument_ownership(self) -> None:
        for modifier in ("if", "unless"):
            for source, pinned in (
                (f"gem 'telnyx', '~> 4.0' {modifier} ENV['SMS']", True),
                (f"gem('telnyx', '>= 4.0', '< 5.0') {modifier} enabled", True),
                (f"gem 'telnyx' {modifier} enabled('4.0')", False),
                (f"gem 'telnyx', version {modifier} enabled('4.0')", False),
                (f"gem 'telnyx', '~> 4.0' + suffix {modifier} enabled", False),
            ):
                with self.subTest(source=source):
                    self.assert_manifest({"Gemfile": source}, True, pinned)

    def test_python_comments_metadata_and_other_packages_are_not_evidence(self) -> None:
        fixtures = (
            ({"requirements.txt": "telnyx\n# Old: telnyx==4.0.0\n"}, True),
            ({"requirements.txt": "# telnyx==4.0.0\n"}, False),
            ({"requirements.txt": "not-telnyx==4.0.0\n"}, False),
            ({"pyproject.toml": '[project]\ndescription = "telnyx==4.0.0"\n'}, False),
            ({"setup.py": 'from setuptools import setup\nsetup(description="telnyx==4.0.0")\n'}, False),
        )
        for files, declared in fixtures:
            with self.subTest(files=files):
                self.assert_manifest(files, declared, False)

    def test_ruby_exact_ranges_and_multiline_calls(self) -> None:
        for source in ("gem 'telnyx', '5.0.0'", "gem('telnyx', '>= 5.0', '< 6.0')",
                       'gem "telnyx", "5.0.0"', "gem %q{telnyx}, %q{~> 5.0}",
                       "gem 'telnyx',\n  '~> 5.0'"):
            with self.subTest(source=source):
                self.assert_manifest({"Gemfile": source}, True, True)

    def test_ruby_statement_boundaries_and_comments(self) -> None:
        for source, declared in (
            ("gem 'telnyx'; gem 'rake', '~> 13.0'", True),
            ("gem 'telnyx' # previously '~> 5.0'", True),
            ("# gem 'telnyx', '~> 5.0'", False),
            ('help = "gem \'telnyx\', \'~> 5.0\'"', False),
            ("gem 'telnyx', '5.0' + suffix", True),
            ("gem 'telnyx' + suffix, '5.0'", False),
            ("gem `telnyx`, '~> 5.0'", False),
            ("gem 'telnyx', `5.0.0`", True),
            ('gem "telnyx", "#{version}"', True),
        ):
            with self.subTest(source=source):
                self.assert_manifest({"Gemfile": source}, declared, False)

    def test_go_requires_not_comments_or_exclusions(self) -> None:
        for line, declared in (
            ("require github.com/team-telnyx/telnyx-go/v4 v4.98.0", True),
            ("require (\n github.com/team-telnyx/telnyx-go/v4 v4.98.0 // indirect\n)", True),
            ("// require github.com/team-telnyx/telnyx-go/v4 v4.98.0", False),
            ("exclude github.com/team-telnyx/telnyx-go/v4 v4.98.0", False),
        ):
            with self.subTest(line=line):
                self.assert_manifest({"go.mod": "module example.test/app\ngo 1.24\n" + line}, declared, declared)

    def test_python_specifier_grammar_and_poetry_context(self) -> None:
        helper = runpy.run_path(str(DEEP_SCAN_SCRIPT.with_name("inspect-sdk-dependencies.py")))
        for value in (">=4banana", ">=4.*", "==4..0", "~=4", "==4.0.0garbage", "4.0", "^4.0", "~4.0"):
            with self.subTest(value=value):
                self.assertFalse(helper["python_version_is_constrained"](value))
        for value in ("==4.0", ">=4.0, <5.0", "~=4.0", "==4.*", "!=4.1", "==4.0rc1", "==4.0.post1", "==4.0+local"):
            with self.subTest(value=value):
                self.assertTrue(helper["python_version_is_constrained"](value))
        for value in ("4.0", "^4.0", "~4.0", "4.*"):
            with self.subTest(value=value):
                self.assertTrue(helper["python_version_is_constrained"](value, poetry=True))
        self.assert_manifest({"requirements.txt": "telnyx>=4banana\n"}, True, False)

    def test_python_literal_toml_fallback_without_tomllib(self) -> None:
        helper = runpy.run_path(str(DEEP_SCAN_SCRIPT.with_name("inspect-sdk-dependencies.py")))
        globals_ = helper["read_mapping"].__globals__
        original = globals_["tomllib"]
        globals_["tomllib"] = None
        try:
            fixtures = (
                ("Pipfile", '[packages]\ntelnyx = "==4.0"\n', True),
                ("Pipfile", '[packages]\n"telnyx" = { version = ">=4.0,<5.0", extras = ["aiohttp"] }\n', True),
                ("pyproject.toml", '[project]\ndependencies = [\n "telnyx >=4.0,<5.0", # comment\n]\n', True),
                ("pyproject.toml", '[tool.poetry.dependencies]\ntelnyx = {version = "^4.0", optional = true}\n', True),
                ("pyproject.toml", '[project]\ndependencies = ["telnyx\\u003e=4.0"]\n', True),
                ("pyproject.toml", '[project]\ndependencies = ["\\U00000074elnyx>=4.0"]\n', True),
                ("Pipfile", '[packages]\ntelnyx = "==4.0\\t"\n', True),
                ("Pipfile", '["pack\\u0061ges"]\n"tel\\u006eyx" = {"vers\\u0069on" = "==4.0"}\n', True),
                ("Pipfile", '[packages]\ntelnyx = "==4.0\\x20"\n', False),
                ("Pipfile", '[packages]\ntelnyx = "==4.0\\uD800"\n', False),
                ("pyproject.toml", '[project]\ndescription = "telnyx==4.0"\n', False),
                ("Pipfile", '# [packages]\n# telnyx = "==4.0"\n', False),
                ("Pipfile", '[packages]\ntelnyx = "*"\n', False),
                ("Pipfile", '[packages]\ntelnyx = "==4.0" + dynamic\n', False),
                ("pyproject.toml", '[project]\ndependencies = ("telnyx>=4.0",)\n', False),
                ("Pipfile", '[packages]\ntelnyx = {"version": "==4.0"}\n', False),
                ("Pipfile", '[packages]\ntelnyx = {version="*", version="==4.0"}\n', False),
                ("Pipfile", '[packages]\ntelnyx = "==4.0"\n[packages]\nother="*"\n', False),
            )
            for name, contents, expected in fixtures:
                with self.subTest(contents=contents), tempfile.TemporaryDirectory() as directory:
                    (Path(directory) / name).write_text(contents, encoding="utf-8")
                    self.assertEqual(expected, helper["other_pinned"](Path(directory)))
                    if original is not None:
                        globals_["tomllib"] = original
                        self.assertEqual(expected, helper["other_pinned"](Path(directory)))
                        globals_["tomllib"] = None
        finally:
            globals_["tomllib"] = original

    def test_escaped_toml_dependencies_through_public_validator(self) -> None:
        self.assert_manifest({"pyproject.toml": '[project]\ndependencies = ["telnyx\\u003e=4.0"]\n'}, True, True)
        self.assert_manifest({"Pipfile": '[packages]\ntelnyx = "==4.0\\t"\n'}, True, True)
        self.assert_manifest({"Pipfile": '["pack\\u0061ges"]\n"tel\\u006eyx" = {"vers\\u0069on" = "==4.0"}\n'}, True, True)

    def test_maven_hard_exact_and_bounded_ranges(self) -> None:
        for version in ("[6.89.0]", "[6.89.0,7.0)"):
            with self.subTest(version=version):
                self.assert_manifest({"pom.xml": "<project><dependencies><dependency>"
                    "<groupId>com.telnyx.sdk</groupId><artifactId>telnyx</artifactId>"
                    f"<version>{version}</version></dependency></dependencies></project>"}, True, True)

    @unittest.skipIf(sys.version_info < (3, 11), "stdlib tomllib requires Python 3.11")
    def test_consumed_gradle_catalog_rich_versions(self) -> None:
        for version in ('{ strictly = "6.89.0" }', '{ require = "6.89.0" }'):
            with self.subTest(version=version):
                catalog = '[libraries]\ntelnyx = { module = "com.telnyx.sdk:telnyx", version = ' + version + ' }\n'
                self.assert_manifest({"build.gradle.kts": "dependencies { implementation(libs.telnyx) }",
                                      "gradle/libs.versions.toml": catalog}, True, True)
                self.assert_manifest({"build.gradle.kts": "dependencies { implementation(libs.other) }",
                                      "gradle/libs.versions.toml": catalog}, False, False)


class ComposerConstraintContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.helper_path = DEEP_SCAN_SCRIPT.with_name("inspect-sdk-dependencies.py")
        cls.helper = runpy.run_path(str(cls.helper_path))

    def validator_checks(self, manifest: object) -> dict[str, str]:
        with tempfile.TemporaryDirectory(prefix="composer-constraint-") as directory:
            path = Path(directory) / "composer.json"
            if isinstance(manifest, bytes):
                path.write_bytes(manifest)
            else:
                path.write_text(json.dumps(manifest), encoding="utf-8")
            result = subprocess.run(
                [BASH, str(VALIDATE_MIGRATION_SCRIPT), directory, "--json"],
                cwd=ROOT, capture_output=True, text=True, timeout=30, check=False,
            )
        self.assertNotIn("Traceback", result.stderr)
        return {item["name"]: item["status"]
                for item in json.loads(result.stdout)["checks"]}

    def test_validator_accepts_composer_caret_in_both_dependency_sections(self) -> None:
        for section in ("require", "require-dev"):
            with self.subTest(section=section):
                checks = self.validator_checks({section: {"telnyx/telnyx-php": "^7.0"}})
                self.assertEqual("pass", checks["telnyx_sdk_dependency"])
                self.assertEqual("pass", checks["telnyx_sdk_version_pinned"])

    def test_supported_composer_constraint_families(self) -> None:
        constraints = (
            "7", "7.0", "7.0.1", "v7.0.1", "=7.0.1", "== 7.0.1",
            "^7.0", "~7.0.1", "~ 7.0", ">=7.0", "<8.0", "!=7.0.1",
            ">=7.0 <8.0", ">= 7.0, < 8.0", "7.0 - 8.0", "7 - 8",
            "^6.0 || ^7.0", "^6.0 | ^7.0", "7.*", "7.0.x", "7.X",
            "7.*.*", "7.0.0-RC1", "7.0.0-beta.2", "7.0.0-stable",
            "7.0.0-beta2-dev", "7.0.0+build.1", "^7.0.0-beta.2.1",
            "^7.0@beta", "7.*@dev", "dev-main", "dev-feature/sdk-fix",
            "7.x-dev", "v7.x-dev", "dev-main#abc123", "7.x-dev#abc123",
            "* >=7.0", "^7.0 || 8.*@beta",
        )
        for constraint in constraints:
            with self.subTest(constraint=constraint):
                self.assertTrue(self.helper["composer_version_is_constrained"](constraint))

    def test_unbounded_or_unsupported_constraints_do_not_supply_version_evidence(self) -> None:
        constraints = (
            None, True, 7, 7.0, [], {}, "", "  ", "*", "*.*", "x", "X.X",
            "@dev", "@stable", "@RC", "@alpha", "@beta", "*@stable",
            "*.*@beta", "^7.0 || *", "* | ^7.0", "^7.0 || *@dev",
            "^7.0 || @dev", "latest", "stable", "^", ">=", "7..0",
            "7.0 garbage", "^7.0 ||", "|| ^7.0", ">=7.0,", "7.*.1",
            "^7.0@unknown", "dev-", "7.0.0#abc123", "dev-main#",
            "7.0.0-dev3", "7.0.0+", ">=7.0,,<8.0", "dev-main as 7.0.0",
            "7.0.0-beta" + "1" * 2000 + "!",
        )
        for constraint in constraints:
            with self.subTest(constraint=constraint):
                self.assertFalse(self.helper["composer_version_is_constrained"](constraint))

    def test_validator_accepts_other_composer_constraint_families(self) -> None:
        for constraint in ("7.0.1", "~7.0", ">=7.0 <8", "7 - 8", "7.*",
                           "^7@beta", "dev-main", "7.x-dev"):
            with self.subTest(constraint=constraint):
                checks = self.validator_checks({"require": {"telnyx/telnyx-php": constraint}})
                self.assertEqual("pass", checks["telnyx_sdk_dependency"])
                self.assertEqual("pass", checks["telnyx_sdk_version_pinned"])

    def test_validator_warns_for_unbounded_or_malformed_versions(self) -> None:
        for constraint in ("*", "@dev", "^7 || *", "", "latest", None, 7, ["^7"]):
            with self.subTest(constraint=constraint):
                checks = self.validator_checks({"require": {"telnyx/telnyx-php": constraint}})
                self.assertEqual("warn", checks["telnyx_sdk_version_pinned"])

    def test_unrelated_sections_and_packages_cannot_supply_version_evidence(self) -> None:
        for section in ("extra", "suggest", "provide", "replace", "conflict",
                        "repositories", "scripts"):
            with self.subTest(section=section):
                checks = self.validator_checks({
                    "require": {"telnyx/telnyx-php": "*", "other/package": "^7.0"},
                    "version": "7.0.1", section: {"telnyx/telnyx-php": "^7.0"},
                })
                self.assertEqual("pass", checks["telnyx_sdk_dependency"])
                self.assertEqual("warn", checks["telnyx_sdk_version_pinned"])
        checks = self.validator_checks({"extra": {"telnyx/telnyx-php": "^7.0"}})
        self.assertEqual("fail", checks["telnyx_sdk_dependency"])
        self.assertEqual("warn", checks["telnyx_sdk_version_pinned"])

    def test_malformed_composer_files_fail_closed_without_tracebacks(self) -> None:
        for manifest in (b"{broken", b"\xff", [], None, 7,
                         {"require": ["telnyx/telnyx-php", "^7.0"]}):
            with self.subTest(manifest=manifest):
                checks = self.validator_checks(manifest)
                self.assertEqual("fail", checks["telnyx_sdk_dependency"])
                self.assertEqual("warn", checks["telnyx_sdk_version_pinned"])

    def test_cli_preserves_presence_mode_and_checks_require_dev(self) -> None:
        for manifest, declared, constrained in (
            ({"require": {"telnyx/telnyx-php": "*"}}, True, False),
            ({"require-dev": {"telnyx/telnyx-php": "^7.0"}}, True, True),
            ({"require": {"telnyx/telnyx-php": "*"},
              "require-dev": {"telnyx/telnyx-php": "^7.0"}}, True, True),
            ({"extra": {"telnyx/telnyx-php": "^7.0"}}, False, False),
            ({"require": {"other/package": "^7.0"}}, False, False),
        ):
            with self.subTest(manifest=manifest), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                (root / "composer.json").write_text(json.dumps(manifest), encoding="utf-8")
                for mode, expected in (("composer", declared), ("composer-pinned", constrained)):
                    result = subprocess.run(
                        [sys.executable, str(self.helper_path), mode, directory],
                        capture_output=True, text=True, timeout=30, check=False,
                    )
                    self.assertEqual(0 if expected else 1, result.returncode, result.stderr)
                    self.assertEqual("", result.stderr)

    def test_missing_or_nonfile_manifest_has_no_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for is_directory in (False, True):
                if is_directory:
                    (root / "composer.json").mkdir()
                self.assertFalse(self.helper["composer_declared"](root))
                self.assertFalse(self.helper["composer_pinned"](root))


class DiscoveryAndValidationRegressionContracts(unittest.TestCase):
    def test_razor_code_blocks_and_markup_siblings(self) -> None:
        directive = "@using Twilio.Rest.Api.V2010.Account\n"
        self.global_using_scan({
            "Code.razor": directive + "@code { void Send() { MessageResource.Create(args); } }",
            "Block.razor": directive + "@{ CallResource.Create(args); }",
            "Markup.razor": "<p>using Twilio.Rest.Api.V2010.Account; MessageResource.Create(args);</p>",
            "Comment.razor": "@* using Twilio.Rest.Api.V2010.Account; MessageResource.Create(args); *@",
            "Unowned.razor": "@code { void Send() { MessageResource.Create(args); } }",
        }, {"Code.razor": {"messaging"}, "Block.razor": {"voice"},
            "Markup.razor": set(), "Comment.razor": set(), "Unowned.razor": set()})

    def test_razor_global_alias_from_another_file(self) -> None:
        self.global_using_scan({
            "Imports.cs": "global using Sms = Twilio.Rest.Api.V2010.Account.MessageResource;",
            "Code.razor": "@code { void Send() { Sms.Create(args); } }",
            "Block.razor": "@{ Sms.Create(args); }",
            "Markup.razor": "<p>Sms.Create(args);</p>",
            "String.razor": '@code { string example = "Sms.Create(args);"; }',
        }, {"Code.razor": {"messaging"}, "Block.razor": {"messaging"},
            "Markup.razor": set(), "String.razor": set()})

    def test_go_package_clients_cross_file_siblings(self) -> None:
        for declaration in (
            'import "github.com/twilio/twilio-go"\nvar client = twilio.NewRestClient()',
            'import "github.com/twilio/twilio-go"\nvar client *twilio.RestClient = twilio.NewRestClient()',
            'import sdk "github.com/twilio/twilio-go"\nvar client = sdk.NewRestClientWithParams(params)',
            'import (\n sdk "github.com/twilio/twilio-go"\n)\nvar (\n client = sdk.NewRestClient()\n)',
        ):
            with self.subTest(declaration=declaration):
                self.global_using_scan({
                    "client.go": "package app\n" + declaration,
                    "alias.go": "package app\nvar copied = client",
                    "send.go": "package app\nfunc send() { copied.Api.CreateMessage(nil) }",
                    "voice.go": "package app\nfunc call() { client.Api.CreateCall(nil) }",
                    "local.go": "package app\nfunc sendLocal() { alias := client; alias.Api.CreateMessage(nil) }",
                    "shadow.go": "package app\nfunc other(client Other) { client.Api.CreateMessage(nil) }",
                    "uninitialized.go": "package app\nfunc another() { var client Other; client.Api.CreateMessage(nil) }",
                    "rebound.go": "package app\nfunc rebound() { client = other; client.Api.CreateMessage(nil) }",
                    "different.go": "package other\nfunc send() { client.Api.CreateMessage(nil) }",
                    "sub/send.go": "package app\nfunc send() { client.Api.CreateMessage(nil) }",
                }, {"send.go": {"messaging"}, "voice.go": {"voice"}, "local.go": {"messaging"},
                    "shadow.go": set(), "uninitialized.go": set(), "rebound.go": set(),
                    "different.go": set(), "sub/send.go": set()})

    def test_go_package_clients_reject_nonpackage_evidence(self) -> None:
        for name, source in (
            ("client.go", 'package app\nimport "unrelated/sdk"\nvar client = sdk.NewRestClient()'),
            ("client.go", 'package app\nimport "github.com/twilio/twilio-go"\nfunc initClient() { client := twilio.NewRestClient() }'),
            ("client_test.go", 'package app\nimport "github.com/twilio/twilio-go"\nvar client = twilio.NewRestClient()'),
            ("client.go", '//go:build special\npackage app\nimport "github.com/twilio/twilio-go"\nvar client = twilio.NewRestClient()'),
            ("client.go", 'package app\n// var client = twilio.NewRestClient()'),
        ):
            with self.subTest(name=name, source=source):
                self.global_using_scan({name: source, "send.go": "package app\nfunc send() { client.Api.CreateMessage(nil) }"},
                                       {"send.go": set()})

    def test_go_package_clients_respect_typed_and_grouped_local_vars(self) -> None:
        imports = 'package app\nimport "github.com/twilio/twilio-go"\n'
        declarations = {
            "pointer": "var client *Other = other",
            "value": "var client Other = other",
            "group_pointer": "var (\nclient *Other = other\n)",
            "group_value": "var (\nclient Other = other\n)",
            "group_uninitialized": "var (\nclient Other\n)",
            "multiple": "var a, client *Other",
            "multiple_initialized": "var a, client *Other = first, other",
            "group_multiple": "var (\na, client *Other = first, other\n)",
            "sdk_pointer": "var client *twilio.RestClient = twilio.NewRestClient()",
            "sdk_group": "var (\nclient *twilio.RestClient = twilio.NewRestClient()\n)",
        }
        files = {"client.go": imports + "var client = twilio.NewRestClient()"}
        expected = {}
        for name, declaration in declarations.items():
            filename = name + ".go"
            files[filename] = (imports + "func send() {\n" + declaration
                               + "\nclient.Api.CreateMessage(nil)\n}")
            expected[filename] = {"messaging"} if name.startswith("sdk_") else set()
        self.global_using_scan(files, expected)

    def global_using_scan(self, files: dict[str, str], expected: dict[str, set[str]]) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name, text in files.items():
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(text, encoding="utf-8")
            for command in ([BASH, str(SCAN_USAGE_SCRIPT)], [sys.executable, str(DEEP_SCAN_SCRIPT)]):
                result = subprocess.run(command + [str(root)], capture_output=True, text=True, timeout=45)
                self.assertEqual(0, result.returncode, result.stderr)
                report = json.loads(result.stdout)
                found = {item["path"]: set(item["products"]) - {"general"} for item in report["files"]}
                for name, products in expected.items():
                    self.assertEqual(products, found.get(name, set()), (command, name, report))
                    if name.endswith(".razor"):
                        if not products:
                            self.assertNotIn(name, found, report)
                        else:
                            item = next(item for item in report["files"] if item["path"] == name)
                            self.assertEqual("csharp", item["language"], report)

    def test_csharp_global_using_forms_across_files(self) -> None:
        for resource, product in (("MessageResource", "messaging"), ("CallResource", "voice"),
                                  ("IncomingPhoneNumberResource", "phone-numbers")):
            target = "Twilio.Rest.Api.V2010.Account."
            for directive, call in (
                ("global using " + target[:-1] + ";", resource + ".Create(args);"),
                ("global using Resource = global::" + target + resource + ";", "Resource.ReadAsync(args);"),
                ("global using Account = " + target[:-1] + ";", "Account." + resource + ".Fetch(args);"),
                ("global using static " + target + resource + ";", "CreateAsync(args);"),
            ):
                with self.subTest(directive=directive):
                    self.global_using_scan({"Imports.cs": directive, "Send.cs": call,
                                            "View.cshtml": "@{ " + call + " }"},
                                           {"Send.cs": {product}, "View.cshtml": {product}})

    def test_csharp_global_using_negative_and_shadow_siblings(self) -> None:
        directive = "global using Twilio.Rest.Api.V2010.Account;"
        for imports, consumer in (
            ("// " + directive, "MessageResource.Create(args);"),
            ('var text = "' + directive + '";', "MessageResource.Create(args);"),
            ('var text = """' + directive + '""";', "MessageResource.Create(args);"),
            ("using Twilio.Rest.Api.V2010.Account;", "MessageResource.Create(args);"),
            ("#if false\n" + directive + "\n#endif", "MessageResource.Create(args);"),
            ("global using Unrelated;", "MessageResource.Create(args);"),
            (directive, "class MessageResource {}\nMessageResource.Create(args);"),
            ("global using Resource = Twilio.Rest.Api.V2010.Account.MessageResource;",
             "using Resource = Unrelated.MessageResource;\nResource.Create(args);"),
            ("global using Resource = Twilio.Rest.Api.V2010.Account.MessageResource;",
             "var Resource = other;\nResource.Create(args);"),
            ("global using static Twilio.Rest.Api.V2010.Account.MessageResource;",
             "class App { void Create(object x) {} void Run() { Create(args); } }"),
            ("global using static Twilio.Rest.Api.V2010.Account.MessageResource;",
             "Action<object> Create = handler; Create(args);"),
            ("global using static Twilio.Rest.Api.V2010.Account.MessageResource;",
             "var x = new Create(args) { Value = 1 };"),
        ):
            with self.subTest(imports=imports, consumer=consumer):
                self.global_using_scan({"Imports.cs": imports, "Send.cs": consumer}, {"Send.cs": set()})

    def test_csharp_global_usings_stay_in_project(self) -> None:
        call = "MessageResource.Create(args);"
        ownership = runpy.run_path(str(DEEP_SCAN_SCRIPT.parent / "sdk-source-ownership.py"))
        self.assertEqual([(2, "messaging")], ownership["contextual_calls"](
            "var x = new Create(args) { Value = 1 };\nCreate(args);", ".cs",
            "global using static Twilio.Rest.Api.V2010.Account.MessageResource;"))
        self.global_using_scan({"Imports.cs": "global using static Twilio.Rest.Api.V2010.Account.MessageResource;",
                                "Send.cs": "var x = new Create(args) { Value = 1 }; Create(args);"},
                               {"Send.cs": {"messaging"}})
        self.global_using_scan({"Config/Imports.cs": "global using Twilio.Rest.Api.V2010.Account;",
                                "Services/Send.cs": call}, {"Services/Send.cs": {"messaging"}})
        self.global_using_scan({
            "A/A.csproj": '<Project Sdk="Microsoft.NET.Sdk"/>',
            "A/Imports.cs": "global using Twilio.Rest.Api.V2010.Account;",
            "A/Send.cs": call, "A/Sub/Send.cs": call,
            "B/B.csproj": '<Project Sdk="Microsoft.NET.Sdk"/>', "B/Send.cs": call,
            "A/Nested/Nested.csproj": '<Project Sdk="Microsoft.NET.Sdk"/>',
            "A/Nested/Send.cs": call, "Send.cs": call,
        }, {"A/Send.cs": {"messaging"}, "A/Sub/Send.cs": {"messaging"},
            "B/Send.cs": set(), "A/Nested/Send.cs": set(), "Send.cs": set()})

    maxDiff = None

    def test_discovery_pipeline_does_not_certify_failed_or_empty_scans(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            scripts = root / "scripts"
            scripts.mkdir()
            wrapper = scripts / "run-discovery.sh"
            wrapper.write_text(SCAN_USAGE_SCRIPT.with_name("run-discovery.sh").read_text(), encoding="utf-8")
            project = root / "project"
            project.mkdir()
            environment = dict(os.environ)
            environment.pop("TELNYX_API_KEY", None)
            for scan, expected in (
                ('echo "Python 3 is required" >&2; exit 127', 2),
                ('echo "partial output"; echo "cannot read source" >&2; exit 2', 2),
                ('exit 0', 2),
                ('echo \'{"products_used": [], "files": [], "languages_detected": []}\'', 0),
            ):
                with self.subTest(scan=scan):
                    (scripts / "scan-twilio-usage.sh").write_text(scan, encoding="utf-8")
                    result = subprocess.run([BASH, str(wrapper), str(project)],
                        capture_output=True, text=True, timeout=45, env=environment)
                    self.assertEqual(expected, result.returncode, result.stdout + result.stderr)
                    if expected:
                        self.assertIn("Discovery incomplete", result.stderr)
                        self.assertNotIn("Phase 1 Complete", result.stdout)
                        self.assertNotIn("PASS", result.stdout)
                    else:
                        self.assertIn("Phase 1 Complete", result.stdout)
                    if "Python 3" in scan:
                        self.assertIn("Python 3 is required", result.stderr)
                    if "cannot read" in scan:
                        self.assertIn("cannot read source", result.stderr)

    def test_hidden_source_directories_are_not_generated_directories(self) -> None:
        scanner = runpy.run_path(str(DEEP_SCAN_SCRIPT))
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = "using Twilio.Rest.Api.V2010.Account;\nMessageResource.Create(args);"
            for folder in (".github/scripts", ".tools", ".git", ".venv", "node_modules"):
                path = root / folder / "Send.cs"
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(source, encoding="utf-8")
            report = scanner["run_scan"](root)
            self.assertEqual({".github/scripts/Send.cs", ".tools/Send.cs"},
                {item["path"] for item in report["files"]})
            result = subprocess.run([BASH, str(SCAN_USAGE_SCRIPT), str(root)],
                capture_output=True, text=True, timeout=45)
            self.assertEqual(0, result.returncode, result.stderr)
            shallow = json.loads(result.stdout)
            self.assertIn("messaging", shallow["products_used"])

    def test_csharp_resource_discovery_uses_shared_ownership(self) -> None:
        scanner = runpy.run_path(str(DEEP_SCAN_SCRIPT))
        for resource, product in (("MessageResource", "messaging"), ("CallResource", "voice"),
                                  ("IncomingPhoneNumberResource", "phone-numbers")):
            for method in ("Create", "Read", "Update", "Fetch"):
                for source, expected in (
                    (f'class {resource} {{}}\n{resource}.{method}(args);', set()),
                    (f'using Twilio.Rest.Api.V2010.Account;\n{resource}.{method}(args);', {product}),
                    (f'using Resource = Twilio.Rest.Api.V2010.Account.{resource};\nResource.{method}(args);', {product}),
                ):
                    with self.subTest(resource=resource, method=method, source=source):
                        found = scanner["scan_csharp_file"](Path("app.cs"), source.split("\n"))
                        self.assertEqual(expected, {d.product for d in found if d.product != "general"})
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / "app.cs"
            for source, expected in (("class MessageResource {}\nMessageResource.Create(args);", []),
                ('using Twilio.Rest.Api.V2010.Account;\nMessageResource.Create(args);', ["messaging"])):
                path.write_text(source, encoding="utf-8")
                result = subprocess.run([BASH, str(SCAN_USAGE_SCRIPT), str(root)],
                    capture_output=True, text=True, timeout=45)
                self.assertEqual(0, result.returncode, result.stderr)
                self.assertEqual(expected, json.loads(result.stdout)["products_used"])

    def test_discovery_read_errors_are_not_successful_empty_scans(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "app.php"
            source.write_text("<?php use Twilio\\Rest\\Client;", encoding="utf-8")
            source.chmod(0)
            try:
                result = subprocess.run([BASH, str(SCAN_USAGE_SCRIPT), str(root)],
                    capture_output=True, text=True, timeout=45)
                self.assertEqual(2, result.returncode, result.stdout + result.stderr)
                self.assertIn("scan is incomplete", result.stderr)
                self.assertNotIn('"products_used"', result.stdout)
            finally:
                source.chmod(0o644)

    def test_rake_language_and_sip_product_are_unambiguous(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "send.rake").write_text('require "twilio-ruby"\nSipGrant\n', encoding="utf-8")
            result = subprocess.run([BASH, str(SCAN_USAGE_SCRIPT), str(root)],
                capture_output=True, text=True, timeout=45)
            report = json.loads(result.stdout)
            self.assertEqual(["ruby"], report["languages_detected"])
            self.assertEqual(["sip"], report["products_used"])

    def test_go_sdk_product_ownership_siblings(self) -> None:
        helper = runpy.run_path(str(DEEP_SCAN_SCRIPT.with_name("sdk-source-ownership.py")))
        calls = helper["contextual_calls"]
        for service, resource, product in (("Api", "Message", "messaging"), ("Api", "Call", "voice"),
                ("VerifyV2", "Verification", "verify"), ("LookupsV2", "PhoneNumber", "lookup"),
                ("VideoV1", "Room", "video")):
            method = "Fetch" if service == "LookupsV2" else "Create"
            for imported, factory in (("import \"github.com/twilio/twilio-go\"", "twilio"),
                    ('import (\n sms "github.com/twilio/twilio-go"\n)', "sms")):
                prefix = f'package main\n{imported}\nfunc main() {{ c := {factory}.NewRestClient(); '
                for code, expected in (
                    (f'c.{service}.{method}{resource}(p)', {product}),
                    (f'alias := c; alias.{service}.{method}{resource}(p)', {product}),
                    (f'c = queue.New(); c.{service}.{method}{resource}(p)', set()),
                    (f'// c.{service}.{method}{resource}(p)\n', set()),
                    (f'example := "c.{service}.{method}{resource}(p)"', set()),
                ):
                    with self.subTest(service=service, code=code, imported=imported):
                        self.assertEqual(expected, {p for _, p in calls(prefix + code + " }", ".go")})
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "main.go").write_text('package main\nimport "github.com/twilio/twilio-go"\n'
                'func main(){ c := twilio.NewRestClient(); c.Api.CreateMessage(p) }\n', encoding="utf-8")
            result = subprocess.run([BASH, str(SCAN_USAGE_SCRIPT), str(root)],
                capture_output=True, text=True, timeout=45)
            self.assertEqual(0, result.returncode, result.stderr)
            self.assertIn("messaging", json.loads(result.stdout)["products_used"])

    def test_generic_product_names_do_not_establish_sdk_ownership(self) -> None:
        scanner = runpy.run_path(str(DEEP_SCAN_SCRIPT))
        for name, suffix in (("scan_java_file", ".java"), ("scan_php_file", ".php"), ("scan_go_file", ".go")):
            with self.subTest(suffix=suffix):
                found = scanner[name](Path("sample" + suffix), ["verifyToken();", "conversations = [];", "lookups();"])
                self.assertEqual([], found)

    def test_residual_import_extension_siblings(self) -> None:
        # The correctness wrapper already expands families; the migration
        # validator must not silently narrow those same families.
        families = (
            ((".py", ".pyw"), "from twilio.rest import Client", "twilio_python_imports"),
            ((".js", ".mjs", ".cjs", ".ts", ".mts", ".cts", ".jsx", ".tsx"),
             'import Twilio from "twilio";', "twilio_js_imports"),
            ((".rb", ".rake"), 'require "twilio-ruby"', "twilio_ruby_imports"),
            ((".java", ".kt", ".kts", ".scala"),
             "import com.twilio.rest.api.v2010.account.Message;", "twilio_java_imports"),
            ((".php", ".phtml"), "<?php use Twilio\\Rest\\Client;", "twilio_php_imports"),
            ((".cs", ".cshtml"), "using Twilio;", "twilio_csharp_imports"),
        )
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for suffixes, statement, check in families:
                for suffix in suffixes:
                    with self.subTest(suffix=suffix):
                        path = root / ("app" + suffix)
                        for source, expected in ((statement, "fail"), ("", "pass")):
                            path.write_text(source + "\n", encoding="utf-8")
                            result = subprocess.run([BASH, str(VALIDATE_MIGRATION_SCRIPT), str(root), "--json"],
                                capture_output=True, text=True, timeout=30)
                            checks = {item["name"]: item["status"].lower()
                                      for item in json.loads(result.stdout)["checks"]}
                            self.assertEqual(expected, checks[check], result.stdout)
                        path.unlink()

    def test_sdk_ownership_binding_siblings(self) -> None:
        helper = runpy.run_path(str(DEEP_SCAN_SCRIPT.with_name("sdk-source-ownership.py")))
        calls = helper["contextual_calls"]
        for source, suffix, expected in (
            ("import com.twilio.rest.api.v2010.account.*;\nMessage.creator(a,b,c);", ".java", "messaging"),
            ("import com.twilio.rest.api.v2010.account.Message as Sms\nSms.creator(a,b,c)", ".kt", "messaging"),
            ("com.twilio.rest.api.v2010.account.Call.creator(a,b,c);", ".java", "voice"),
            ('String text = "import com.twilio.rest.api.v2010.account.Message";\nMessage.creator();', ".java", None),
            ("<?php use Twilio\\Rest\\Client as Sms;\n$c = new Sms($sid,$token);\n$alias = $c;\n$alias->messages->create($to,[]);", ".php", "messaging"),
            ("<?php $c = new \\Twilio\\Rest\\Client($sid,$token);\n$c->calls->create($to,[]);", ".phtml", "voice"),
            ("<?php use Twilio\\Rest\\Client;\n$c = new Client($sid,$token);\n$c = new Queue();\n$c->messages->create($to,[]);", ".php", None),
            ("<?php use Twilio\\Rest\\Client;\nfunction one(Client $c) {$c->calls->read();}\nfunction two($c) {$c->messages->create($to,[]);}", ".php", "voice"),
            ("import com.twilio.rest.api.v2010.account.*;\nimport com.example.Message;\nMessage.creator();", ".java", None),
            ("import com.example.Message;\nimport com.twilio.rest.api.v2010.account.*;\nMessage.creator();", ".java", None),
            ("import com.twilio.rest.api.v2010.account.Message;\nclass X { void send(Queue Message) { Message.creator(); } }", ".java", None),
            ("import com.twilio.rest.api.v2010.account.Message;\nclass X { void send() { var Message = new Queue(); Message.creator(); } }", ".java", None),
            ("import com.twilio.rest.api.v2010.account.Message as Sms\nfun send() { val Sms = Queue(); Sms.creator() }", ".kt", None),
            ("import com.twilio.rest.api.v2010.account.Message as Sms\nfun send(Sms: Queue) { Sms.creator() }", ".kt", None),
            ("import com.twilio.rest.api.v2010.account.Message as Sms\nfun send(Sms: Queue) = Sms.creator()", ".kt", None),
            ("import com.twilio.rest.api.v2010.account.Message as Sms\nfun other(Sms: Queue) = Sms.creator()\nfun send() = Sms.creator()", ".kts", "messaging"),
            ("import com.twilio.rest.api.v2010.account.Message\nobject X { def send(Message: Queue) = { Message.creator() } }", ".scala", None),
            ("import com.twilio.rest.api.v2010.account.Message as Sms\nfun other(Sms: Queue) {}\nfun send() { Sms.creator() }", ".kt", "messaging"),
            ("import com.twilio.rest.api.v2010.account.Message\nobject X { def other(Message: Queue) = {}\ndef send() = { Message.creator() } }", ".scala", "messaging"),
            ("<?php use Twilio\\Rest\\Client; class A { function send() {$this->client->messages->create($to, []);} function __construct() {$this->client = new Client($sid, $token);} }", ".php", "messaging"),
            ("<?php use Twilio\\Rest\\Client; class A { function send() {$this->client->messages->create($to, []);} private Client $client; }", ".php", "messaging"),
            ("<?php namespace A { use Twilio\\Rest\\Client; } namespace B { class Client {} $c = new Client(); $c->messages->create($to, []); }", ".php", None),
            ("<?php namespace A; use Twilio\\Rest\\Client; namespace B; $c = new Client(); $c->messages->create($to, []);", ".php", None),
            ("<?php namespace B { $c = new \\Twilio\\Rest\\Client(); $c->messages->create($to, []); }", ".php", "messaging"),
            ("<?php namespace { $c = new Twilio\\Rest\\Client(); $c->messages->create($to, []); }", ".php", "messaging"),
            ("<?php use Twilio\\Rest\\Client; function send(Client $client) { return $client->messages->create($to, []); }", ".php", "messaging"),
            ("<?php use Twilio\\Rest\\Client; function send(Client $client, bool $dryRun) { if ($dryRun) return $client; $client->messages->create($to, []); }", ".php", "messaging"),
        ):
            with self.subTest(source=source):
                found = {product for _, product in calls(source, suffix)}
                self.assertEqual({expected} if expected else set(), found)

    def test_scala_import_selector_matrix(self) -> None:
        calls = runpy.run_path(str(DEEP_SCAN_SCRIPT.with_name(
            "sdk-source-ownership.py")))["contextual_calls"]
        prefix = "com.twilio.rest.api.v2010.account"
        for resource, product in (("Message", "messaging"), ("Call", "voice"),
                                  ("IncomingPhoneNumber", "phone-numbers")):
            selectors = (
                ("_", resource, True), ("*", resource, True),
                ("{_}", resource, True), ("{*}", resource, True),
                ("{" + resource + "}", resource, True),
                ("{" + resource + " => Api}", "Api", True),
                ("{" + resource + " as Api}", "Api", True),
                (resource + " as Api", "Api", True),
                ("{" + resource + " => _, _}", resource, False),
                ("{" + resource + " as _, *}", resource, False),
                ("{" + resource + " => Api, _}", resource, False),
                ("{" + resource + " => Api, _}", "Api", True),
                ("\n  {" + resource + " => Api, _}", "Api", True),
                ("\n  _", resource, True), ("\n  *", resource, True),
            )
            for selector, receiver, expected in selectors:
                source = f"import {prefix}.{selector}\nobject X {{ def send() = {{ {receiver}.creator() }} }}"
                with self.subTest(resource=resource, selector=selector, receiver=receiver):
                    self.assertEqual({product} if expected else set(),
                                     {p for _, p in calls(source, ".scala")})

    def test_scala_import_scope_and_negative_controls(self) -> None:
        calls = runpy.run_path(str(DEEP_SCAN_SCRIPT.with_name(
            "sdk-source-ownership.py")))["contextual_calls"]
        prefix = "com.twilio.rest.api.v2010.account"
        for source, expected in (
            (f"// import {prefix}._\nMessage.creator()", False),
            (f'val text = "import {prefix}._"\nMessage.creator()', False),
            (f"import unrelated.{{Message}}\nimport {prefix}._\nMessage.creator()", False),
            (f"import {prefix}._\nimport unrelated.{{Message}}\nMessage.creator()", False),
            (f"object A {{ import {prefix}._ }}\nobject B {{ Message.creator() }}", False),
            (f"object A {{ Message.creator(); import {prefix}._ }}", False),
            (f"object A {{ import {prefix}._; Message.creator() }}", True),
            (f"import {prefix}._\nobject X {{ def send(Message: Queue) = {{ Message.creator() }} }}", False),
            (f"import {prefix}._\nobject X {{ def send() = {{ val Message = new Queue(); Message.creator() }} }}", False),
            (f"import {prefix}._\nobject X {{ def other(Message: Queue) = {{}}; def send() = {{ Message.creator() }} }}", True),
            (f"import {prefix}.{{Message => _, _}}\nCall.creator()", True),
            (f"import {prefix}._\nobject X {{ def send(Message: Queue) = Message.creator() }}", False),
            (f"import {prefix}._\nobject X {{ def other(Message: Queue) = Message.creator(); def send() = {{ Message.creator() }} }}", True),
            (f"object A:\n  import {prefix}.*\n  def noOp() = ()\nobject B:\n  object Message {{ def creator() = 1 }}\n  val x = Message.creator()\n", False),
            (f"object A:\n  import {prefix}._\n  def send() =\n    Message.creator()\n", True),
            (f"import {prefix}._\nobject X:\n  def send(Message: Queue) =\n    Message.creator()\n", False),
            (f"import {prefix}._\nobject X {{ def send(Message: Queue, flag: Boolean) = if (flag) {{ 1 }} else Message.creator() }}", False),
            (f"import {prefix}._\nobject X {{ def send(Message: Queue) = (\nMessage.creator()\n) }}", False),
            (f"object A:\n  val Message = new Queue()\nobject B:\n  import {prefix}.*\n  def send() = Message.creator()\n", True),
            (f"import {prefix}._\nobject X {{ object Message {{ def creator() = 1 }}; val x=Message.creator() }}", False),
            (f"import {prefix}._\nobject A:\n  val Message = new Queue()\n  val x=Message.creator()\nobject B:\n  def send() = Message.creator()\n", True),
        ):
            with self.subTest(source=source):
                self.assertEqual(expected, bool(calls(source, ".scala")))
        for suffix in (".java", ".kt", ".kts"):
            with self.subTest(suffix=suffix):
                self.assertFalse(calls(f"import {prefix}._;\nMessage.creator();", suffix))
                self.assertTrue(calls(f"import {prefix}.*;\nMessage.creator();", suffix))

    def test_scala_selectors_reach_both_public_scanners(self) -> None:
        prefix = "com.twilio.rest.api.v2010.account"
        for selector, receiver, expected in (
            ("_", "Message", True), ("{Message => Sms, _}", "Sms", True),
            ("{Message as Sms, *}", "Sms", True),
            ("{Message => _, _}", "Message", False),
            ("\n  {Message => Sms, _}", "Sms", True),
        ):
            with self.subTest(selector=selector):
                shallow, deep = self._scan({"Send.scala":
                    f"import {prefix}.{selector}\nobject X {{ def send() = {{ {receiver}.creator() }} }}\n"})
                for report in (shallow, deep):
                    self.assertEqual(expected, "messaging" in report["products_used"], report)

    def test_scala_scope_and_other_product_public_controls(self) -> None:
        prefix = "com.twilio.rest.api.v2010.account"
        for source, expected in (
            (f"import {prefix}._\nclass Queue {{ def creator() = 1 }}\nobject X {{ def send(Message: Queue) = Message.creator() }}", False),
            (f"object A:\n  import {prefix}.*\n  def noOp() = ()\nobject B:\n  object Message {{ def creator() = 1 }}\n  val x = Message.creator()\n", False),
            (f"object A:\n  import {prefix}._\n  def send() =\n    Message.creator(to, from, body)\n", True),
        ):
            with self.subTest(source=source):
                for report in self._scan({"Send.scala": source}):
                    self.assertEqual(expected, "messaging" in report["products_used"], report)
        _, deep = self._scan({"Verify.scala": "import com.twilio.rest.verify.v2.{Service}\n"})
        self.assertIn("verify", deep["products_used"])

    def test_scala_comma_continued_imports_reach_public_scanners(self) -> None:
        prefix = "com.twilio.rest.api.v2010.account"
        for selector, receiver in (("_", "Message"), ("*", "Message"),
                                   ("{Message}", "Message"), ("{Message => Sms}", "Sms")):
            with self.subTest(selector=selector):
                for report in self._scan({"Send.scala":
                    f"import scala.util.Try,\n  {prefix}.{selector}\nobject X {{ def send() = {receiver}.creator(to, from, body) }}\n"}):
                    self.assertIn("messaging", report["products_used"], report)

    def test_structured_dependency_pin_siblings(self) -> None:
        helper = runpy.run_path(str(DEEP_SCAN_SCRIPT.with_name("inspect-sdk-dependencies.py")))
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "gradle").mkdir()
            catalogs = (
                '[libraries]\ntelnyx = "com.telnyx.sdk:telnyx:6.89.0"\n',
                '[versions]\nsdk = "6.89.0"\n[libraries]\ntelnyx = { module = "com.telnyx.sdk:telnyx", version.ref = "sdk" }\n',
                '[libraries]\ntelnyx = { group = "com.telnyx.sdk", name = "telnyx", version = "6.89.0" }\n',
            )
            for catalog in catalogs:
                (root / "gradle/libs.versions.toml").write_text(catalog, encoding="utf-8")
                for declaration, expected in (
                    ("dependencies { implementation(libs.telnyx) }", True),
                    ("dependencies { implementation(libs.unrelated) }", False),
                    ("// implementation(libs.telnyx)", False),
                    ("dependencies { // implementation(libs.telnyx)\n}", False),
                    ('val help = """implementation(libs.telnyx)"""', False),
                ):
                    with self.subTest(catalog=catalog, declaration=declaration):
                        (root / "build.gradle.kts").write_text(declaration, encoding="utf-8")
                        self.assertEqual(expected and helper["tomllib"] is not None,
                                         helper["gradle_pinned"](root))
            for version, expected in (("6.89.0", True), ("6.+", False), ("latest.release", False)):
                (root / "build.gradle.kts").write_text(
                    f'dependencies {{ implementation("com.telnyx.sdk:telnyx:{version}") }}', encoding="utf-8")
                self.assertEqual(expected, helper["gradle_pinned"](root))
            for source in ('dependencies { // implementation("com.telnyx.sdk:telnyx:6.89.0")\n}',
                           'val help = """implementation("com.telnyx.sdk:telnyx:6.89.0")"""'):
                (root / "build.gradle.kts").write_text(source, encoding="utf-8")
                self.assertFalse(helper["gradle_pinned"](root))
            (root / "build.gradle.kts").write_text("", encoding="utf-8")
            for delimiter, terminator in (("/", "/"), ("$/", "/$")):
                (root / "build.gradle").write_text(
                    f'def help = {delimiter}implementation("com.telnyx.sdk:telnyx:6.89.0"){terminator}', encoding="utf-8")
                self.assertFalse(helper["gradle_pinned"](root))
            (root / "build.gradle").write_text("dependencies { implementation 'com.telnyx.sdk:telnyx:6.89.0' }", encoding="utf-8")
            self.assertTrue(helper["gradle_pinned"](root))
            (root / "build.gradle").write_text("", encoding="utf-8")
            dependency = "<dependency><groupId>com.telnyx.sdk</groupId><artifactId>telnyx</artifactId>{}</dependency>"
            for managed_version, expected in (("6.89.0", True), ("${unknown}", False)):
                (root / "pom.xml").write_text("<project><dependencyManagement><dependencies>"
                    + dependency.format("<version>" + managed_version + "</version>")
                    + "</dependencies></dependencyManagement><dependencies>"
                    + dependency.format("") + "</dependencies></project>", encoding="utf-8")
                self.assertEqual(expected, helper["maven_pinned"](root / "pom.xml"))
            for contents in ("<project><!-- com.telnyx.sdk:telnyx --></project>",
                             "<project><dependencies><dependency><groupId>com.telnyx.sdk</groupId><artifactId>unrelated</artifactId><version>1.0.0</version></dependency></dependencies></project>"):
                (root / "pom.xml").write_text(contents, encoding="utf-8")
                self.assertFalse(helper["jvm_declared"](root, "telnyx"))

    def test_sdk_ownership_ignores_comments_and_unrelated_receivers(self) -> None:
        for suffix in ("java", "kt", "kts", "scala"):
            with self.subTest(suffix=suffix):
                shallow, deep = self._scan({f"Queue.{suffix}": (
                    "import com.example.queue.Message;\n"
                    "import com.twilio.Twilio;\n"
                    "// com.twilio.rest.api.v2010.account.Message\n"
                    "class Queue { Object send() { return Message.creator(); } }\n"
                )})
                self.assertNotIn("messaging", shallow["products_used"])
                self.assertNotIn("messaging", deep["products_used"])
        for suffix in ("php", "phtml"):
            for context in ("// Twilio\\Rest\\Client", "use Twilio\\Rest\\Client;"):
                with self.subTest(suffix=suffix, context=context):
                    shallow, deep = self._scan({f"Queue.{suffix}": (
                        "<?php\n" + context + "\n"
                        "$client = new \\Example\\Queue();\n"
                        "$client->messages->create($to, $payload);\n"
                    )})
                    self.assertNotIn("messaging", shallow["products_used"])
                    self.assertNotIn("messaging", deep["products_used"])

    def test_maven_pin_belongs_to_dependency(self) -> None:
        dependency = ("<dependency><groupId>com.telnyx.sdk</groupId>"
                      "<artifactId>telnyx</artifactId>{}</dependency>")
        for header, version, expected in (
            ("<version>1.2.3</version>", "", "warn"),
            ("<parent><version>1.2.3</version></parent>", "", "warn"),
            ("", "<version>6.89.0</version>", "pass"),
            ("<properties><sdk.version>6.89.0</sdk.version></properties>",
             "<version>${sdk.version}</version>", "pass"),
            ("", "<version>${missing}</version>", "warn"),
        ):
            with self.subTest(header=header, version=version):
                with tempfile.TemporaryDirectory() as directory:
                    root = Path(directory)
                    (root / "pom.xml").write_text(
                        '<project xmlns="http://maven.apache.org/POM/4.0.0">'
                        + header + "<dependencies>" + dependency.format(version)
                        + "</dependencies></project>", encoding="utf-8")
                    result = subprocess.run(
                        [BASH, str(VALIDATE_MIGRATION_SCRIPT), directory, "--json"],
                        capture_output=True, text=True, timeout=30, check=False)
                    checks = {item["name"]: item["status"]
                              for item in json.loads(result.stdout)["checks"]}
                    self.assertEqual(expected, checks["telnyx_sdk_version_pinned"])

    def test_php_preflight_uses_dependency_sections(self) -> None:
        for section, expected in (("require", True), ("require-dev", True),
                                  ("extra", False)):
            with self.subTest(section=section), tempfile.TemporaryDirectory() as directory:
                (Path(directory) / "composer.json").write_text(
                    json.dumps({section: {"telnyx/telnyx-php": "^7.0"}}),
                    encoding="utf-8")
                result = subprocess.run(
                    [BASH, str(PREFLIGHT_SCRIPT), directory, "--quick"],
                    env={**os.environ, "TELNYX_API_KEY": "KEYlocal-test-only"},
                    capture_output=True, text=True, timeout=30, check=False)
                self.assertEqual(expected, "PHP: telnyx/telnyx-php" in result.stdout)

    def _write_fixture(self, root: Path, files: dict[str, str | bytes]) -> None:
        for relative, contents in files.items():
            path = root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            if isinstance(contents, bytes):
                path.write_bytes(contents)
            else:
                path.write_text(contents, encoding="utf-8")

    def _scan(
        self, files: dict[str, str]
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        with tempfile.TemporaryDirectory(prefix="twilio-discovery-") as directory:
            root = Path(directory)
            self._write_fixture(root, files)
            shallow = subprocess.run(
                [BASH, str(SCAN_USAGE_SCRIPT), str(root)],
                cwd=ROOT,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
            self.assertEqual(0, shallow.returncode, shallow.stderr)
            deep = subprocess.run(
                [sys.executable, "-B", str(DEEP_SCAN_SCRIPT), str(root)],
                cwd=ROOT,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
            self.assertEqual(0, deep.returncode, deep.stderr)
            return json.loads(shallow.stdout), json.loads(deep.stdout)

    def test_public_repo_messaging_shapes_are_discovered_consistently(self) -> None:
        fixtures = {
            "php": {
                "Observer/Send.php": (
                    "<?php\nuse Twilio\\Rest\\ClientFactory;\n"
                    "class Sender { private $clientFactory;\n"
                    "function __construct(ClientFactory $factory) {\n"
                    "$this->clientFactory = $factory; }\n"
                    "function send() { $client = $this->clientFactory->create([]);\n"
                    "$client->messages->create($to, ['body' => $text]); } }\n"
                )
            },
            "go-rest": {
                "main.go": (
                    'package main\nvar endpoint = "https://api.twilio.com/'
                    '2010-04-01/Accounts/AC123/Messages.json"\n'
                )
            },
            "typescript-rest": {
                "src/component/utils.ts": (
                    "export const endpoint = `https://api.twilio.com/"
                    "2010-04-01/Accounts/${sid}/Messages.json`;\n"
                )
            },
            "kotlin-sdk": {
                "src/SmsService.kt": (
                    "import com.twilio.rest.api.v2010.account.Message\n"
                    "import com.twilio.type.PhoneNumber\n"
                    "val creator = Message.creator(to, from, message)\n"
                ),
                "pom.xml": (
                    "<dependency><groupId>com.twilio.sdk</groupId>"
                    "<artifactId>twilio</artifactId></dependency>\n"
                ),
            },
        }
        for label, files in fixtures.items():
            with self.subTest(label=label):
                shallow, deep = self._scan(files)
                self.assertIn("messaging", shallow["products_used"])
                self.assertIn("messaging", deep["products_used"])
                self.assertNotIn("voice-android:webrtc", shallow["products_used"])

    def test_direct_rest_product_siblings_are_classified(self) -> None:
        cases = {
            "voice": "https://api.twilio.com/2010-04-01/Accounts/AC/Calls.json",
            "verify": "https://verify.twilio.com/v2/Services/VA/Verifications",
            "lookup": "https://lookups.twilio.com/v2/PhoneNumbers/+12025550123",
            "video": "https://video.twilio.com/v1/Rooms",
            "fax": "https://fax.twilio.com/v1/Faxes",
            "phone-numbers": (
                "https://api.twilio.com/2010-04-01/Accounts/AC/"
                "IncomingPhoneNumbers.json"
            ),
        }
        for product, endpoint in cases.items():
            with self.subTest(product=product):
                shallow, deep = self._scan(
                    {"client.ts": f"export const endpoint = '{endpoint}';\n"}
                )
                self.assertIn(product, shallow["products_used"])
                self.assertIn(product, deep["products_used"])

    def test_generic_message_method_names_require_twilio_context(self) -> None:
        fixtures = {
            "java": {
                "src/Queue.java": (
                    "import com.example.queue.Message;\n"
                    "class Queue { Object create() { return Message.creator(); } }\n"
                )
            },
            "php": {
                "src/Mailer.php": (
                    "<?php\n$client->messages->create($recipient, $payload);\n"
                )
            },
        }
        for label, files in fixtures.items():
            with self.subTest(label=label):
                shallow, deep = self._scan(files)
                self.assertNotIn("messaging", shallow["products_used"])
                self.assertNotIn("messaging", deep["products_used"])

    def test_mobile_dependency_delimiter_and_binary_exclusion(self) -> None:
        shallow, _ = self._scan(
            {
                "build.gradle": (
                    "implementation 'com.twilio:voice-android:6.6.0'\n"
                )
            }
        )
        self.assertIn("webrtc", shallow["products_used"])
        self.assertNotIn("voice-android:webrtc", shallow["products_used"])

        with tempfile.TemporaryDirectory(prefix="twilio-binary-scan-") as directory:
            root = Path(directory)
            (root / "compiled-app").write_bytes(
                b"\x7fELF\x00https://api.twilio.com/2010-04-01/"
                b"Accounts/AC/Messages.json\x00"
            )
            result = subprocess.run(
                [BASH, str(SCAN_USAGE_SCRIPT), str(root)],
                cwd=ROOT,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
            self.assertEqual(0, result.returncode, result.stderr)
            payload = json.loads(result.stdout)
            self.assertEqual([], payload["products_used"])
            self.assertEqual([], payload["files"])

    def test_validator_ignores_binary_build_artifacts_and_recognizes_pins(self) -> None:
        with tempfile.TemporaryDirectory(prefix="migration-validation-") as directory:
            root = Path(directory)
            self._write_fixture(
                root,
                {
                    "go.mod": (
                        "module example.test/migration\n\n"
                        "go 1.24\n\n"
                        "require github.com/team-telnyx/telnyx-go/v4 v4.98.0\n"
                    ),
                    "src/App.kt": (
                        "import com.telnyx.sdk.client.TelnyxClient\n"
                        "class App(val client: TelnyxClient)\n"
                    ),
                    "build-output": (
                        b"\x7fELF\x00https://api.twilio.com/2010-04-01/"
                        b"\x00X-Twilio-Signature\x00HmacSHA1\x00"
                    ),
                },
            )
            result = subprocess.run(
                [BASH, str(VALIDATE_MIGRATION_SCRIPT), str(root), "--json"],
                cwd=ROOT,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
            self.assertEqual(0, result.returncode, result.stdout + result.stderr)
            checks = {
                item["name"]: item["status"]
                for item in json.loads(result.stdout)["checks"]
            }
            self.assertEqual("pass", checks["twilio_api_urls"])
            self.assertEqual("pass", checks["twilio_signature_validation"])
            self.assertEqual("pass", checks["telnyx_sdk_version_pinned"])
            self.assertEqual("pass", checks["telnyx_source_imports"])

    def test_validator_recognizes_kotlin_telnyx_imports(self) -> None:
        with tempfile.TemporaryDirectory(prefix="kotlin-validation-") as directory:
            root = Path(directory)
            self._write_fixture(
                root,
                {
                    "pom.xml": (
                        "<project><dependencies><dependency>"
                        "<groupId>com.telnyx.sdk</groupId>"
                        "<artifactId>telnyx</artifactId><version>6.89.0</version>"
                        "</dependency></dependencies></project>\n"
                    ),
                    "src/App.kt": (
                        "import com.telnyx.sdk.client.TelnyxClient\n"
                        "class App(val client: TelnyxClient)\n"
                    ),
                },
            )
            result = subprocess.run(
                [BASH, str(VALIDATE_MIGRATION_SCRIPT), str(root), "--json"],
                cwd=ROOT,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
            self.assertEqual(0, result.returncode, result.stdout + result.stderr)
            checks = {
                item["name"]: item["status"]
                for item in json.loads(result.stdout)["checks"]
            }
            self.assertEqual("pass", checks["telnyx_source_imports"])
            self.assertEqual("pass", checks["telnyx_sdk_version_pinned"])

    def test_validator_does_not_infer_maven_pin_from_unrelated_version(self) -> None:
        with tempfile.TemporaryDirectory(prefix="maven-validation-") as directory:
            root = Path(directory)
            (root / "pom.xml").write_text(
                "<project><name>telnyx migration helper</name>"
                "<version>1.2.3</version>"
                "<dependencies><dependency><groupId>com.example</groupId>"
                "<artifactId>example</artifactId><version>4.5.6</version>"
                "</dependency></dependencies></project>\n",
                encoding="utf-8",
            )
            result = subprocess.run(
                [BASH, str(VALIDATE_MIGRATION_SCRIPT), str(root), "--json"],
                cwd=ROOT,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
            self.assertEqual(1, result.returncode, result.stdout + result.stderr)
            checks = {
                item["name"]: item["status"]
                for item in json.loads(result.stdout)["checks"]
            }
            self.assertEqual("fail", checks["telnyx_sdk_dependency"])
            self.assertEqual("warn", checks["telnyx_sdk_version_pinned"])

    def test_project_preflight_does_not_report_host_ruby_gems(self) -> None:
        with tempfile.TemporaryDirectory(prefix="migration-preflight-") as directory:
            root = Path(directory)
            fake_bin = root / "fake-bin"
            fake_bin.mkdir()
            gem = fake_bin / "gem"
            gem.write_text(
                "#!/bin/sh\n"
                "case \"$*\" in\n"
                "  *twilio-ruby*) echo 'twilio-ruby (7.8.4)' ;;\n"
                "  *telnyx*) echo 'telnyx (5.1.0)' ;;\n"
                "esac\n",
                encoding="utf-8",
            )
            gem.chmod(gem.stat().st_mode | stat.S_IXUSR)
            project = root / "project"
            project.mkdir()
            (project / "package.json").write_text(
                '{"dependencies":{"twilio":"^5.0.0","telnyx":"^6.0.0"}}\n',
                encoding="utf-8",
            )
            environment = os.environ.copy()
            environment["PATH"] = f"{fake_bin}{os.pathsep}{environment['PATH']}"
            environment["TELNYX_API_KEY"] = "KEYlocal-test-only"
            result = subprocess.run(
                [BASH, str(PREFLIGHT_SCRIPT), str(project), "--quick"],
                cwd=ROOT,
                env=environment,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
            self.assertEqual(0, result.returncode, result.stdout + result.stderr)
            self.assertNotIn("Ruby: twilio-ruby", result.stdout)
            self.assertNotIn("Ruby: telnyx", result.stdout)
            self.assertIn("Node.js: twilio ^5.0.0 (declared in project)", result.stdout)
            self.assertIn("Node.js: telnyx ^6.0.0 (declared in project)", result.stdout)

    def test_project_preflight_detects_jvm_project_dependencies(self) -> None:
        with tempfile.TemporaryDirectory(prefix="jvm-migration-preflight-") as directory:
            project = Path(directory)
            (project / "pom.xml").write_text(
                "<project><dependencies>"
                "<dependency><groupId>com.twilio.sdk</groupId>"
                "<artifactId>twilio</artifactId><version>7.34.0</version>"
                "</dependency>"
                "<dependency><groupId>com.telnyx.sdk</groupId>"
                "<artifactId>telnyx</artifactId><version>6.89.0</version>"
                "</dependency>"
                "</dependencies></project>\n",
                encoding="utf-8",
            )
            environment = os.environ.copy()
            environment["TELNYX_API_KEY"] = "KEYlocal-test-only"
            result = subprocess.run(
                [BASH, str(PREFLIGHT_SCRIPT), str(project), "--quick"],
                cwd=ROOT,
                env=environment,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
            self.assertEqual(0, result.returncode, result.stdout + result.stderr)
            self.assertIn("Java/Kotlin: Twilio SDK (declared in project)", result.stdout)
            self.assertIn("Java/Kotlin: Telnyx SDK (declared in project)", result.stdout)

    def test_host_preflight_go_module_major_versions(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            fake_bin = root / "bin"
            fake_bin.mkdir()
            go = fake_bin / "go"
            go.write_text('#!/bin/sh\nif [ "$*" = "list -m all" ]; then\n'
                'printf "%s\\n" "$TEST_GO_MODULE"\nelse exit 1; fi\n', encoding="utf-8")
            go.chmod(0o755)
            for module, expected in (("github.com/team-telnyx/telnyx-go/v4 v4.0.0", True),
                    ("github.com/team-telnyx/telnyx-go v1.0.0", True),
                    ("github.com/example/telnyx-go v4.0.0", False),
                    ("github.com/team-telnyx/telnyx-go-tools v1.0.0", False)):
                with self.subTest(module=module):
                    environment = {**os.environ, "PATH": str(fake_bin) + os.pathsep + os.environ["PATH"],
                        "TELNYX_API_KEY": "KEYlocal-test-only", "TEST_GO_MODULE": module}
                    result = subprocess.run([BASH, str(PREFLIGHT_SCRIPT), "--quick"],
                        cwd=root, capture_output=True, text=True, timeout=45, env=environment)
                    self.assertEqual(0, result.returncode, result.stderr + result.stdout)
                    self.assertEqual(expected, "Go: telnyx-go (found in go.mod)" in result.stdout)


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


class PhpSdkOwnershipRegression(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.calls = staticmethod(runpy.run_path(str(DEEP_SCAN_SCRIPT.with_name("sdk-source-ownership.py")))["contextual_calls"])

    def products(self, source: str) -> set[str]:
        return {product for _, product in self.calls(source, ".php")}

    def test_import_lists_and_namespace_aliases(self) -> None:
        for imports, constructor in (
            (r"use Twilio\Rest\Client, Psr\Log\LoggerInterface;", "Client"),
            (r"use Psr\Log\LoggerInterface,Twilio\Rest\Client;", "Client"),
            (r"use Twilio\Rest\Client as Sms,Psr\Log\LoggerInterface;", "Sms"),
            ("use Psr\\Log\\LoggerInterface,\n Twilio\\Rest\\Client as Sms;", "Sms"),
            (r"use Twilio\Rest as Rest, Psr\Log\LoggerInterface;", r"Rest\Client"),
            (r"use Twilio as Sdk;", r"Sdk\Rest\Client"),
            (r"use Twilio\Rest\{Client as Sms, function helper};", "Sms"),
        ):
            for receiver in ("c", "twilio"):
                with self.subTest(imports=imports, receiver=receiver):
                    source = f"<?php namespace App; {imports}\n${receiver} = new {constructor}();\n${receiver}->messages->create($to, []);"
                    self.assertEqual({"messaging"}, self.products(source))

    def test_import_kinds_and_scopes_are_not_interchangeable(self) -> None:
        for imports in (
            r"use function Other\helper, Twilio\Rest\Client;",
            r"use const Other\VALUE, Twilio\Rest\Client;",
            r"use Twilio\Rest\{function Client, const VALUE};",
            r"class Holder { use Twilio\Rest\Client; }",
            r"use Other\Client, Psr\Log\LoggerInterface;",
        ):
            with self.subTest(imports=imports):
                self.assertEqual(set(), self.products("<?php " + imports + " $c = new Client(); $c->messages->create($to, []);"))

    def test_factory_in_import_list_preserves_ownership(self) -> None:
        for imports in (r"use Psr\Log\LoggerInterface, Twilio\Rest\ClientFactory as Factory;",
                        r"use Twilio\Rest\{ClientFactory as Factory, function helper};"):
            with self.subTest(imports=imports):
                self.assertEqual({"messaging"}, self.products("<?php " + imports + " $factory = new Factory(); $c = $factory->create(); $c->messages->create($to, []);"))

    def test_comma_imports_reach_both_public_scanners(self) -> None:
        with tempfile.TemporaryDirectory(prefix="php-import-list-") as directory:
            Path(directory, "send.php").write_text(r'<?php use Twilio\Rest\Client, Psr\Log\LoggerInterface; $c = new Client($sid, $token); $c->messages->create($to, []);', encoding="utf-8")
            for script in (SCAN_USAGE_SCRIPT, DEEP_SCAN_SCRIPT):
                with self.subTest(script=script):
                    command = [BASH, str(script)] if script.suffix == ".sh" else [sys.executable, str(script)]
                    result = subprocess.run([*command, directory, *(["--json"] if script.suffix == ".sh" else [])], capture_output=True, text=True, timeout=30)
                    self.assertEqual(0, result.returncode, result.stderr)
                    self.assertIn("messaging", json.loads(result.stdout)["products_used"])

    def test_grouped_import_alias_owns_client(self) -> None:
        source = (
            "<?php namespace App;\n"
            "use Twilio\\Rest\\{Client as SmsClient, ClientFactory};\n"
            "$client = new SmsClient($sid, $token);\n"
            "$client->messages->create($to, []);\n"
        )
        self.assertEqual({"messaging"}, self.products(source))

    def test_unrelated_group_member_does_not_own_client(self) -> None:
        source = (
            "<?php namespace App;\n"
            "use Twilio\\Rest\\{Queue, ClientFactory};\n"
            "$client = new Queue();\n"
            "$client->messages->create($to, []);\n"
        )
        self.assertEqual(set(), self.products(source))

    def test_grouped_alias_does_not_cross_namespace_boundary(self) -> None:
        source = (
            "<?php namespace One { use Twilio\\Rest\\{Client as SmsClient}; }\n"
            "namespace Two { class SmsClient {} $client = new SmsClient(); "
            "$client->messages->create($to, []); }\n"
        )
        self.assertEqual(set(), self.products(source))

    def test_promoted_client_properties_own_receiver(self) -> None:
        for modifier in (
            "private",
            "protected",
            "public",
            "private readonly",
            "protected readonly",
            "public readonly",
        ):
            with self.subTest(modifier=modifier):
                source = (
                    "<?php namespace App; use Twilio\\Rest\\Client;\n"
                    f"class Sender {{ function __construct({modifier} Client $client) {{}} "
                    "function send() { $this->client->messages->create($to, []); } }\n"
                )
                self.assertEqual({"messaging"}, self.products(source))

    def test_unrelated_promoted_type_does_not_own_receiver(self) -> None:
        source = (
            "<?php namespace App; use Twilio\\Rest\\Client;\n"
            "class Sender { function __construct(private Queue $client) {} "
            "function send() { $this->client->messages->create($to, []); } }\n"
        )
        self.assertEqual(set(), self.products(source))

    def test_promoted_property_does_not_cross_class_boundary(self) -> None:
        source = (
            "<?php namespace App; use Twilio\\Rest\\Client;\n"
            "class TwilioSender { function __construct(private Client $client) {} }\n"
            "class QueueSender { private $client; function send() { "
            "$this->client->messages->create($to, []); } }\n"
        )
        self.assertEqual(set(), self.products(source))



class ValidatorCorpusRegression(unittest.TestCase):
    def run_fixture(self, files, *args, unreadable=None):
        with tempfile.TemporaryDirectory(prefix="validator-corpus-") as directory:
            root = Path(directory)
            for name, text in files.items():
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(text, encoding="utf-8")
            if unreadable:
                (root / unreadable).chmod(0)
            try:
                return subprocess.run(
                    [shutil.which("bash") or "/bin/bash", str(VALIDATE_MIGRATION_SCRIPT), str(root), *args],
                    capture_output=True, text=True, timeout=45,
                )
            finally:
                if unreadable:
                    (root / unreadable).chmod(0o644)

    def status(self, result, name):
        return next((check["status"] for check in json.loads(result.stdout)["checks"]
                     if check["name"] == name), None)

    def test_twimlets_is_residual(self):
        result = self.run_fixture({"app.py": 'url = "http://twimlets.com/forward?PhoneNumber=123"\n'}, "--json")
        self.assertEqual(self.status(result, "twilio_api_urls"), "fail")

    def test_unreadable_file_blocks_unless_excluded(self):
        files = {"skipme/bad.py": "x = 1\n"}
        result = self.run_fixture(files, "--json", unreadable="skipme/bad.py")
        self.assertEqual(self.status(result, "source_readability"), "fail")
        result = self.run_fixture(files, "--json", "--exclude-dir", "skipme", unreadable="skipme/bad.py")
        self.assertIsNone(self.status(result, "source_readability"))
        result = self.run_fixture({"package-lock.json": "{}"}, "--json", unreadable="package-lock.json")
        self.assertIsNone(self.status(result, "source_readability"))

    def test_rust_twilio_is_not_hidden_by_node_telnyx(self):
        files = {"src/main.rs": "use twilio::{Client, OutboundMessage};\n",
                 "Cargo.toml": '[dependencies]\ntwilio = "1.1"\n',
                 "package.json": '{"dependencies":{"telnyx":"^6.0.0"}}',
                 "app.js": "const Telnyx = require('telnyx');\n"}
        result = self.run_fixture(files, "--json")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertEqual(self.status(result, "unsupported_twilio_source"), "fail")
        files["src/main.rs"] = "fn main() {}\n"
        files["Cargo.toml"] = '[dependencies]\nreqwest = "0.12"\n'
        result = self.run_fixture(files, "--json")
        self.assertIsNone(self.status(result, "unsupported_twilio_source"))

    def test_unreadable_path_identity_is_structured(self):
        name = "bad:line\nnext\r.py"
        result = self.run_fixture({name: "x = 1"}, "--json", unreadable=name)
        check = next(item for item in json.loads(result.stdout)["checks"]
                     if item["name"] == "source_readability")
        self.assertEqual(1, len(check["details"]["files"]))
        self.assertTrue(check["details"]["files"][0].endswith("/" + name))

    def test_unrelated_security_names_do_not_certify_telnyx(self):
        result = self.run_fixture({
            "crypto.go": 'package crypto\nimport "crypto/ed25519"\nfunc key() { _ = ed25519.GenerateKey }\n',
            "auth.go": 'package auth\nfunc Auth(t string) string { return "Authorization: Bearer " + t }\n',
            "package.json": '{"dependencies":{"telnyx":"^6.0.0"}}',
        })
        self.assertNotIn("webhook verification pattern found", result.stdout)
        self.assertNotIn("Ed25519 webhook signature validation found", result.stdout)
        self.assertNotIn("Bearer auth pattern found", result.stdout)

    def test_real_telnyx_auth_patterns_remain_visible_without_certification(self):
        result = self.run_fixture({
            "app.py": 'from telnyx import Telnyx\nclient = Telnyx()\nclient.webhooks.unwrap(body, headers=headers)\n',
            "send.sh": 'curl https://api.telnyx.com/v2/messages -H "Authorization: Bearer $TELNYX_API_KEY"\n',
            "requirements.txt": "telnyx>=4.0,<5.0\n",
        })
        self.assertIn("Telnyx webhook verification pattern found", result.stdout)
        self.assertIn("Bearer auth pattern found", result.stdout)
        self.assertIn("static evidence only", result.stdout)



class GoSdkOwnershipSiblings(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.calls = staticmethod(runpy.run_path(str(DEEP_SCAN_SCRIPT.with_name("sdk-source-ownership.py")))["contextual_calls"])

    def products(self, source: str) -> set[str]:
        return {product for _, product in self.calls(source, ".go")}

    def test_import_package_is_shadowed_by_parameter(self) -> None:
        source = 'package app\nimport "github.com/twilio/twilio-go"\n' + (
            "func send(twilio Other) {\n"
            " client := twilio.NewRestClient()\n"
            " client.Api.CreateMessage(params)\n"
            "}\n"
        )
        self.assertEqual(set(), self.products(source))

    def test_outer_sdk_client_is_shadowed_by_parameter(self) -> None:
        source = 'package app\nimport "github.com/twilio/twilio-go"\n' + (
            "var client = twilio.NewRestClient()\n"
            "func send(client Other) { client.Api.CreateMessage(params) }\n"
        )
        self.assertEqual(set(), self.products(source))

    def test_uninitialized_locals_shadow_package_and_client(self) -> None:
        fixtures = (
            'package app\nimport "github.com/twilio/twilio-go"\n' + (
                "func send() { var twilio Other; client := twilio.NewRestClient(); "
                "client.Api.CreateMessage(params) }\n"
            ),
            'package app\nimport "github.com/twilio/twilio-go"\n' + (
                "var client = twilio.NewRestClient()\n"
                "func send() { var client Other; client.Api.CreateMessage(params) }\n"
            ),
        )
        for source in fixtures:
            with self.subTest(source=source):
                self.assertEqual(set(), self.products(source))

    def test_selector_assignment_does_not_rebind_sdk_client(self) -> None:
        source = 'package app\nimport "github.com/twilio/twilio-go"\n' + (
            "func send(holder *Holder) {\n"
            " client := twilio.NewRestClient()\n"
            " holder.client = other\n"
            " client.Api.CreateMessage(params)\n"
            "}\n"
        )
        self.assertEqual({"messaging"}, self.products(source))

    def test_true_assignment_rebinds_sdk_client(self) -> None:
        source = 'package app\nimport "github.com/twilio/twilio-go"\n' + (
            "func send() {\n"
            " client := twilio.NewRestClient()\n"
            " client = queue.New()\n"
            " client.Api.CreateMessage(params)\n"
            "}\n"
        )
        self.assertEqual(set(), self.products(source))

    def test_bindings_in_unrelated_scopes_do_not_hide_sdk_client(self) -> None:
        source = 'package app\nimport "github.com/twilio/twilio-go"\n' + (
            "func unrelated(twilio Other) { _ = twilio }\n"
            "func send() {\n"
            " client := twilio.NewRestClient()\n"
            " { client := queue.New(); _ = client }\n"
            " client.Api.CreateMessage(params)\n"
            "}\n"
        )
        self.assertEqual({"messaging"}, self.products(source))



if __name__ == "__main__":
    unittest.main()
