#!/usr/bin/env python3
"""No-network contract tests for the hand-authored migration shell scripts.

The test process copies this file to temporary ``curl`` and ``sleep``
executables.  Child scripts therefore exercise their real control flow while
all Telnyx responses, delays, request bodies, and status codes remain local and
deterministic.  Any request not explicitly modeled below fails closed.
"""

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


def _json_response(data: Any) -> str:
    return json.dumps(data, separators=(",", ":"))


def _connection(connection_id: str, *, ovp_id: str | None = None) -> dict[str, Any]:
    return {
        "data": {
            "id": connection_id,
            "record_type": "credential_connection",
            "connection_name": connection_id,
            "active": True,
            "outbound": {"outbound_voice_profile_id": ovp_id},
        }
    }


def _phone_number(
    *,
    phone_id: str = "phone-1",
    phone_number: str = "+12025550123",
) -> dict[str, Any]:
    return {
        "data": [
            {
                "id": phone_id,
                "phone_number": phone_number,
                "status": "active",
                "features": ["sms", "voice", "fax"],
                "connection_id": "fax-app",
            }
        ]
    }


def _delivered_message(message_id: str = "msg-1") -> dict[str, Any]:
    return {
        "data": {
            "id": message_id,
            "to": [{"status": "delivered"}],
            "cost": {"amount": "0.004", "currency": "USD"},
        }
    }


def _queued_message_from_request(
    request: dict[str, Any], message_id: str = "msg-1"
) -> dict[str, Any]:
    payload = json.loads(request["body"] or "{}")
    return {
        "data": {
            "id": message_id,
            "from": {"phone_number": payload.get("from")},
            "to": [
                {"phone_number": payload.get("to"), "status": "queued"}
            ],
            "text": payload.get("text"),
            "messaging_profile_id": payload.get("messaging_profile_id"),
        }
    }


def _parse_curl_args(argv: list[str]) -> dict[str, Any]:
    method = "GET"
    url = ""
    body: str | None = None
    output: str | None = None
    write_out: str | None = None
    query_data: list[str] = []
    index = 0

    options_with_value = {"-H", "--header"}
    while index < len(argv):
        arg = argv[index]
        if arg in {"-X", "--request"}:
            index += 1
            method = argv[index].upper()
        elif arg in {"-d", "--data", "--data-raw", "--data-binary"}:
            index += 1
            body = argv[index]
        elif arg == "--data-urlencode":
            index += 1
            query_data.append(argv[index])
        elif arg in {"-o", "--output"}:
            index += 1
            output = argv[index]
        elif arg in {"-w", "--write-out"}:
            index += 1
            write_out = argv[index]
        elif arg in options_with_value:
            index += 1
        elif arg.startswith("https://") or arg.startswith("http://"):
            url = arg
        index += 1

    if not url:
        raise ValueError(f"fake curl received no URL: {argv!r}")
    return {
        "command": "curl",
        "method": method,
        "url": url,
        "path": urlsplit(url).path,
        "body": body,
        "query_data": query_data,
        "output": output,
        "write_out": write_out,
    }


def _route_fake_request(request: dict[str, Any], scenario: str) -> tuple[int, str]:
    method = request["method"]
    path = request["path"]

    if scenario == "captive_portal_200":
        # A transparent proxy / captive portal answers HTTP 200 with an empty
        # body to every request. No endpoint can confirm authentication.
        if method == "GET":
            return 200, ""

    if scenario in {"diagnostic_balance_429", "diagnostic_malformed_200"}:
        if method == "GET" and path == "/v2/balance":
            if scenario == "diagnostic_balance_429":
                return 429, _json_response(
                    {"errors": [{"code": "10011", "detail": "rate limited"}]}
                )
            return 200, "this is not JSON"
        if method == "GET" and path == "/v2/phone_numbers":
            return 200, _json_response(
                {"data": [{"id": "phone-1"}], "meta": {"total_results": 1}}
            )
        if method == "GET" and path == "/v2/connections":
            return 200, _json_response(
                {"data": [{"id": "conn-1"}], "meta": {"total_results": 1}}
            )
        if method == "GET" and path == "/v2/messaging_profiles":
            return 200, _json_response(
                {"data": [{"id": "mp-1"}], "meta": {"total_results": 1}}
            )

    if scenario in {
        "balance_200_empty",
        "balance_200_malformed",
        "balance_200_error_bearing",
    }:
        if method == "GET" and path == "/v2/balance":
            if scenario == "balance_200_empty":
                return 200, ""
            if scenario == "balance_200_malformed":
                return 200, "not-json"
            return 200, _json_response(
                {
                    "data": {"balance": "1.00"},
                    "errors": [{"code": "10009"}],
                }
            )

    if method == "GET" and path == "/v2/balance":
        return 200, _json_response({"data": {"balance": "1.00"}})

    if scenario in {"country_lookup_mismatch", "country_lookup_error"}:
        if method == "GET" and path.startswith("/v2/number_lookup/"):
            if scenario == "country_lookup_error":
                return 200, _json_response(
                    {"errors": [{"code": "10015", "detail": "lookup failed"}]}
                )
            return 200, _json_response(
                {
                    "data": {
                        "phone_number": "+12025550199",
                        "country_code": "NL",
                    }
                }
            )

    if scenario == "smoke_no_jq":
        if method == "GET" and path in {
            "/v2/phone_numbers",
            "/v2/connections",
            "/v2/messaging_profiles",
        }:
            return 200, _json_response(
                {"data": [{"id": "fixture-1"}], "meta": {"total_results": 1}}
            )

    if scenario == "webrtc_empty_account":
        if method == "GET" and path == "/v2/credential_connections":
            return 200, _json_response({"data": []})
        if method == "POST" and path == "/v2/credential_connections":
            payload = json.loads(request["body"] or "{}")
            return 201, _json_response(
                {
                    "data": {
                        "id": "conn-new",
                        "record_type": "credential_connection",
                        "connection_name": payload.get("connection_name"),
                        "active": True,
                    }
                }
            )
        if method == "GET" and path == "/v2/credential_connections/conn-new":
            return 200, _json_response(_connection("conn-new"))
        if method == "POST" and path == "/v2/telephony_credentials":
            payload = json.loads(request["body"] or "{}")
            return 201, _json_response(
                {
                    "data": {
                        "id": "cred-new",
                        "record_type": "credential",
                        "name": payload.get("name"),
                        "resource_id": f"connection:{payload.get('connection_id')}",
                        "expires_at": payload.get("expires_at"),
                    }
                }
            )
        if method == "POST" and path == "/v2/telephony_credentials/cred-new/token":
            return 200, VALID_JWT
        if method == "DELETE" and path == "/v2/telephony_credentials/cred-new":
            return 204, ""
        if method == "DELETE" and path == "/v2/credential_connections/conn-new":
            return 204, ""

    if scenario in {
        "webrtc_connection_paginated",
        "webrtc_connection_pagination_drift",
    }:
        if method == "GET" and path == "/v2/credential_connections":
            page = 2 if "page[number]=2" in request["query_data"] else 1
            total_pages = (
                3
                if scenario == "webrtc_connection_pagination_drift" and page == 2
                else 2
            )
            return 200, _json_response(
                {
                    "data": [] if page == 1 else [_connection("conn-existing")["data"]],
                    "meta": {
                        "page_number": page,
                        "total_pages": total_pages,
                    },
                }
            )
        if method == "GET" and path == "/v2/credential_connections/conn-existing":
            return 200, _json_response(_connection("conn-existing"))
        if method == "POST" and path == "/v2/telephony_credentials":
            payload = json.loads(request["body"] or "{}")
            return 201, _json_response(
                {
                    "data": {
                        "id": "cred-existing",
                        "record_type": "credential",
                        "name": payload.get("name"),
                        "resource_id": "connection:conn-existing",
                        "expires_at": payload.get("expires_at"),
                    }
                }
            )
        if method == "POST" and path == "/v2/telephony_credentials/cred-existing/token":
            return 200, VALID_JWT
        if method == "DELETE" and path == "/v2/telephony_credentials/cred-existing":
            return 204, ""

    if scenario in {
        "sip_existing_no_opt_in",
        "sip_existing_opt_in",
        "sip_empty_account",
        "sip_cleanup_failure",
        "sip_multiple_connections",
        "sip_connections_paginated",
        "sip_connections_pagination_drift",
        "sip_wrong_connection_detail",
        "sip_detail_with_errors",
        "sip_unreadable_listed_details",
        "sip_wrong_patch_echo",
    }:
        if method == "GET" and path == "/v2/connections":
            if scenario in {"sip_empty_account", "sip_cleanup_failure"}:
                return 200, _json_response({"data": []})
            if scenario in {
                "sip_connections_paginated",
                "sip_connections_pagination_drift",
            }:
                page = 2 if "page[number]=2" in request["query_data"] else 1
                if page == 1:
                    return 200, _json_response(
                        {
                            "data": [
                                {
                                    "id": "conn-page-1",
                                    "record_type": "credential_connection",
                                    "connection_name": "page-1",
                                    "active": True,
                                }
                            ],
                            "meta": {"page_number": 1, "total_pages": 2},
                        }
                    )
                return 200, _json_response(
                    {
                        "data": [
                            {
                                "id": "conn-ready",
                                "record_type": "credential_connection",
                                "connection_name": "ready",
                                "active": True,
                            }
                        ],
                        "meta": {
                            "page_number": 2,
                            "total_pages": (
                                3
                                if scenario == "sip_connections_pagination_drift"
                                else 2
                            ),
                        },
                    }
                )
            if scenario == "sip_multiple_connections":
                return 200, _json_response(
                    {
                        "data": [
                            {
                                "id": "conn-unready",
                                "record_type": "credential_connection",
                                "connection_name": "unready",
                                "active": False,
                            },
                            {
                                "id": "conn-ready",
                                "record_type": "credential_connection",
                                "connection_name": "ready",
                                "active": True,
                            },
                        ]
                    }
                )
            return 200, _json_response(
                {
                    "data": [
                        {
                            "id": "conn-existing",
                            "record_type": "credential_connection",
                            "connection_name": "existing",
                            "active": True,
                        }
                    ]
                }
            )

        if method == "POST" and path == "/v2/credential_connections":
            payload = json.loads(request["body"] or "{}")
            return 201, _json_response(
                {
                    "data": {
                        "id": "conn-new",
                        "record_type": "credential_connection",
                        "connection_name": payload.get("connection_name"),
                        "active": True,
                    }
                }
            )

        if method == "GET" and path.startswith("/v2/credential_connections/"):
            connection_id = path.rsplit("/", 1)[-1]
            if scenario == "sip_unreadable_listed_details":
                return 502, "upstream unavailable"
            if scenario == "sip_wrong_connection_detail":
                return 200, _json_response(_connection("conn-other"))
            ovp_id = "ovp-ready" if connection_id == "conn-ready" else None
            response = _connection(connection_id, ovp_id=ovp_id)
            if scenario == "sip_detail_with_errors":
                response["errors"] = [
                    {"code": "90000", "detail": "ambiguous connection read"}
                ]
            return 200, _json_response(response)

        if method == "GET" and path == "/v2/outbound_voice_profiles/ovp-ready":
            return 200, _json_response(
                {"data": {"id": "ovp-ready", "name": "ready-ovp", "enabled": True}}
            )
        if method == "GET" and path == "/v2/outbound_voice_profiles/ovp-chosen":
            return 200, _json_response(
                {"data": {"id": "ovp-chosen", "name": "chosen-ovp", "enabled": True}}
            )
        if method == "POST" and path == "/v2/outbound_voice_profiles":
            payload = json.loads(request["body"] or "{}")
            return 201, _json_response(
                {
                    "data": {
                        "id": "ovp-new",
                        "record_type": "outbound_voice_profile",
                        "name": payload.get("name"),
                        "enabled": payload.get("enabled"),
                    }
                }
            )
        if method == "PATCH" and path.startswith("/v2/credential_connections/"):
            payload = json.loads(request["body"] or "{}")
            ovp_id = payload.get("outbound", {}).get("outbound_voice_profile_id")
            connection_id = path.rsplit("/", 1)[-1]
            if scenario == "sip_wrong_patch_echo":
                return 200, _json_response(_connection("conn-other", ovp_id=ovp_id))
            return 200, _json_response(_connection(connection_id, ovp_id=ovp_id))
        if (
            scenario in {"sip_empty_account", "sip_cleanup_failure"}
            and method == "DELETE"
            and path
            in {
                "/v2/credential_connections/conn-new",
                "/v2/outbound_voice_profiles/ovp-new",
            }
        ):
            if (
                scenario == "sip_cleanup_failure"
                and path == "/v2/credential_connections/conn-new"
            ):
                return 500, ""
            return 204, ""

    if scenario == "sip_connection_list_error":
        if method == "GET" and path == "/v2/connections":
            return 403, _json_response(
                {"errors": [{"code": "10009", "detail": "forbidden"}]}
            )

    if scenario in {
        "lookup_non_json",
        "lookup_missing_data",
        "lookup_mismatched_number",
        "lookup_error_without_detail",
    }:
        if method == "GET" and path.startswith("/v2/number_lookup/"):
            if scenario == "lookup_non_json":
                return 502, "upstream unavailable"
            if scenario == "lookup_mismatched_number":
                return 200, _json_response(
                    {
                        "data": {
                            "phone_number": "+12025550199",
                            "country_code": "US",
                        }
                    }
                )
            if scenario == "lookup_error_without_detail":
                return 200, _json_response(
                    {
                        "data": {
                            "phone_number": "+31201234567",
                            "country_code": "NL",
                            "carrier": {"name": "Example", "type": "mobile"},
                        },
                        "errors": [{"code": "10009"}],
                    }
                )
            return 200, _json_response({"data": {}})

    if scenario == "verify_unknown_country":
        if method == "GET" and path.startswith("/v2/number_lookup/"):
            return 200, _json_response({"data": {"country_code": None}})

    if scenario in {"verify_profile_paginated", "verify_pagination_drift"}:
        if method == "GET" and path == "/v2/verify_profiles":
            page = 2 if "page[number]=2" in request["query_data"] else 1
            if page == 1:
                return 200, _json_response(
                    {
                        "data": [
                            {
                                "id": "vp-page-1",
                                "name": "US only",
                                "sms": {"whitelisted_destinations": ["US"]},
                            }
                        ],
                        "meta": {"page_number": 1, "total_pages": 2},
                    }
                )
            return 200, _json_response(
                {
                    "data": [
                        {
                            "id": "vp-page-2",
                            "name": "NL ready",
                            "sms": {"whitelisted_destinations": ["NL"]},
                        }
                    ],
                    "meta": {
                        "page_number": 2,
                        "total_pages": 3 if scenario == "verify_pagination_drift" else 2,
                    },
                }
            )
        if method == "GET" and path == "/v2/verify_profiles/vp-page-2":
            return 200, _json_response(
                {
                    "data": {
                        "id": "vp-page-2",
                        "name": "NL ready",
                        "sms": {"whitelisted_destinations": ["NL"]},
                    }
                }
            )

    if scenario == "verify_read_only_preview":
        if method == "GET" and path == "/v2/verify_profiles":
            return 200, _json_response({"data": []})

    if scenario == "verify_no_profile":
        if method == "GET" and path == "/v2/verify_profiles":
            return 200, _json_response({"data": []})
        if method == "POST" and path == "/v2/verify_profiles":
            payload = json.loads(request["body"] or "{}")
            return 201, _json_response(
                {
                    "data": {
                        "id": "vp-new",
                        "name": payload.get("name"),
                        "sms": payload.get("sms"),
                    }
                }
            )
        if method == "POST" and path == "/v2/verifications/sms":
            return 201, _json_response(
                {
                    "data": {
                        "id": "verification-1",
                        "status": "pending",
                        "type": "sms",
                        "phone_number": "+31201234567",
                        "verify_profile_id": "vp-new",
                    }
                }
            )

    if scenario == "verify_interactive_success":
        profile = {
            "id": "vp-existing",
            "name": "interactive-profile",
            "sms": {"whitelisted_destinations": ["NL"]},
        }
        if method == "GET" and path == "/v2/verify_profiles":
            return 200, _json_response({"data": [profile]})
        if method == "GET" and path == "/v2/verify_profiles/vp-existing":
            return 200, _json_response({"data": profile})
        if method == "POST" and path == "/v2/verifications/sms":
            return 201, _json_response(
                {
                    "data": {
                        "id": "verification-interactive",
                        "status": "pending",
                        "type": "sms",
                        "phone_number": "+31201234567",
                        "verify_profile_id": "vp-existing",
                    }
                }
            )
        if method == "POST" and path.startswith(
            "/v2/verifications/by_phone_number/"
        ) and path.endswith("/actions/verify"):
            return 200, _json_response(
                {
                    "data": {
                        "phone_number": "+31201234567",
                        "response_code": "accepted",
                    }
                }
            )

    if scenario == "verify_profile_list_error":
        if method == "GET" and path == "/v2/verify_profiles":
            return 403, _json_response(
                {"errors": [{"code": "10009", "detail": "forbidden"}]}
            )

    if scenario == "verify_profile_detail_with_errors":
        if method == "GET" and path == "/v2/verify_profiles/vp-existing":
            return 200, _json_response(
                {
                    "data": {
                        "id": "vp-existing",
                        "name": "existing",
                        "sms": {"whitelisted_destinations": ["NL"]},
                    },
                    "errors": [{"code": "10015", "detail": "partial failure"}],
                }
            )
        if method == "POST" and path == "/v2/verifications/sms":
            return 201, _json_response(
                {
                    "data": {
                        "id": "verification-1",
                        "status": "pending",
                        "type": "sms",
                        "phone_number": "+31201234567",
                        "verify_profile_id": "vp-existing",
                    }
                }
            )

    if scenario in {"verify_send_failed_status", "verify_wrong_send_identity"}:
        if method == "GET" and path == "/v2/verify_profiles":
            return 200, _json_response({"data": []})
        if method == "POST" and path == "/v2/verify_profiles":
            payload = json.loads(request["body"] or "{}")
            return 201, _json_response(
                {
                    "data": {
                        "id": "vp-new",
                        "name": payload.get("name"),
                        "sms": payload.get("sms"),
                    }
                }
            )
        if method == "POST" and path == "/v2/verifications/sms":
            return 201, _json_response(
                {
                    "data": {
                        "id": "verification-1",
                        "status": (
                            "failed"
                            if scenario == "verify_send_failed_status"
                            else "pending"
                        ),
                        "type": "sms",
                        "phone_number": (
                            "+12025550199"
                            if scenario == "verify_wrong_send_identity"
                            else "+31201234567"
                        ),
                        "verify_profile_id": "vp-new",
                    }
                }
            )

    if scenario in {"verify_patch_error", "verify_patch_missing_echo"}:
        if method == "GET" and path == "/v2/verify_profiles/vp-existing":
            return 200, _json_response(
                {
                    "data": {
                        "id": "vp-existing",
                        "name": "existing",
                        "sms": {
                            "whitelisted_destinations": ["US"],
                            "app_name": "Acme",
                            "messaging_template_id": "tpl-existing",
                            "code_length": 6,
                            "default_verification_timeout_secs": 300,
                        },
                    }
                }
            )
        if method == "PATCH" and path == "/v2/verify_profiles/vp-existing":
            if scenario == "verify_patch_error":
                return 422, _json_response(
                    {"errors": [{"code": "10015", "detail": "invalid whitelist"}]}
                )
            return 200, _json_response(
                {
                    "data": {
                        "id": "vp-other",
                        "sms": {
                            "whitelisted_destinations": ["NL", "US"],
                            "app_name": "Acme",
                            "messaging_template_id": "tpl-existing",
                            "code_length": 6,
                            "default_verification_timeout_secs": 300,
                        },
                    }
                }
            )

    if scenario in {"messaging_profile_paginated", "messaging_pagination_drift"}:
        if method == "GET" and path == "/v2/phone_numbers":
            return 200, _json_response(_phone_number())
        if method == "GET" and path == "/v2/phone_numbers/phone-1/messaging":
            return 200, _json_response(
                {"data": {"id": "phone-1", "messaging_profile_id": None}}
            )
        if method == "GET" and path == "/v2/messaging_profiles":
            page = 2 if "page[number]=2" in request["query_data"] else 1
            if page == 1:
                return 200, _json_response(
                    {
                        "data": [
                            {
                                "id": "mp-page-1",
                                "name": "US only",
                                "enabled": True,
                                "whitelisted_destinations": ["US"],
                            }
                        ],
                        "meta": {"page_number": 1, "total_pages": 2},
                    }
                )
            return 200, _json_response(
                {
                    "data": [
                        {
                            "id": "mp-page-2",
                            "name": "NL ready",
                            "enabled": True,
                            "whitelisted_destinations": ["NL"],
                        }
                    ],
                    "meta": {
                        "page_number": 2,
                        "total_pages": (
                            3 if scenario == "messaging_pagination_drift" else 2
                        ),
                    },
                }
            )
        if method == "GET" and path == "/v2/messaging_profiles/mp-page-2":
            return 200, _json_response(
                {
                    "data": {
                        "id": "mp-page-2",
                        "name": "NL ready",
                        "enabled": True,
                        "whitelisted_destinations": ["NL"],
                    }
                }
            )

    if scenario in {
        "messaging_read_only_preview",
        "messaging_confirmed_send",
        "messaging_sent_timeout",
        "messaging_wrong_status_id",
        "messaging_wrong_create_identity",
    }:
        if method == "GET" and path == "/v2/phone_numbers":
            return 200, _json_response(_phone_number())
        if method == "GET" and path == "/v2/phone_numbers/phone-1/messaging":
            return 200, _json_response(
                {"data": {"id": "phone-1", "messaging_profile_id": "mp-current"}}
            )
        if method == "GET" and path == "/v2/messaging_profiles/mp-current":
            return 200, _json_response(
                {
                    "data": {
                        "id": "mp-current",
                        "name": "current",
                        "enabled": True,
                        "whitelisted_destinations": ["NL"],
                    }
                }
            )
        if scenario in {
            "messaging_confirmed_send",
            "messaging_sent_timeout",
            "messaging_wrong_status_id",
            "messaging_wrong_create_identity",
        }:
            if method == "POST" and path == "/v2/messages":
                if scenario == "messaging_wrong_create_identity":
                    wrong = _queued_message_from_request(request)
                    wrong["data"]["to"][0]["phone_number"] = "+12025550199"
                    return 202, _json_response(wrong)
                return 202, _json_response(_queued_message_from_request(request))
            if method == "GET" and path == "/v2/messages/msg-1":
                if scenario == "messaging_sent_timeout":
                    return 200, _json_response(
                        {"data": {"id": "msg-1", "to": [{"status": "sent"}]}}
                    )
                if scenario == "messaging_wrong_status_id":
                    return 200, _json_response(_delivered_message("msg-other"))
                return 200, _json_response(
                    {
                        "data": {
                            "id": "msg-1",
                            "to": [{"status": "delivered"}],
                            "cost": {"amount": "0.004", "currency": "USD"},
                        }
                    }
                )

    if scenario in {
        "messaging_multiple_senders",
        "messaging_multiple_senders_paginated",
    }:
        if method == "GET" and path == "/v2/phone_numbers":
            if "filter[phone_number]=+12025550124" in request["query_data"]:
                return 200, _json_response(
                    _phone_number(phone_id="phone-2", phone_number="+12025550124")
                )
            if scenario == "messaging_multiple_senders_paginated":
                page = 2 if "page[number]=2" in request["query_data"] else 1
                number = (
                    _phone_number()["data"][0]
                    if page == 1
                    else _phone_number(
                        phone_id="phone-2", phone_number="+12025550124"
                    )["data"][0]
                )
                return 200, _json_response(
                    {
                        "data": [number],
                        "meta": {"page_number": page, "total_pages": 2},
                    }
                )
            return 200, _json_response(
                {
                    "data": [
                        _phone_number()["data"][0],
                        _phone_number(
                            phone_id="phone-2", phone_number="+12025550124"
                        )["data"][0],
                    ]
                }
            )
        if method == "GET" and path == "/v2/phone_numbers/phone-1/messaging":
            return 200, _json_response(
                {"data": {"id": "phone-1", "messaging_profile_id": None}}
            )
        if method == "GET" and path == "/v2/phone_numbers/phone-2/messaging":
            return 200, _json_response(
                {"data": {"id": "phone-2", "messaging_profile_id": "mp-ready"}}
            )
        if method == "GET" and path == "/v2/messaging_profiles/mp-ready":
            return 200, _json_response(
                {
                    "data": {
                        "id": "mp-ready",
                        "name": "NL ready",
                        "enabled": True,
                        "whitelisted_destinations": ["NL"],
                    }
                }
            )

    if scenario == "messaging_prefers_unassigned_sender":
        if method == "GET" and path == "/v2/phone_numbers":
            if "filter[phone_number]=+12025550124" in request["query_data"]:
                return 200, _json_response(
                    _phone_number(phone_id="phone-2", phone_number="+12025550124")
                )
            return 200, _json_response(
                {
                    "data": [
                        _phone_number()["data"][0],
                        _phone_number(
                            phone_id="phone-2", phone_number="+12025550124"
                        )["data"][0],
                    ]
                }
            )
        if method == "GET" and path == "/v2/phone_numbers/phone-1/messaging":
            return 200, _json_response(
                {"data": {"id": "phone-1", "messaging_profile_id": "mp-current"}}
            )
        if method == "GET" and path == "/v2/phone_numbers/phone-2/messaging":
            return 200, _json_response(
                {"data": {"id": "phone-2", "messaging_profile_id": None}}
            )
        if method == "GET" and path == "/v2/messaging_profiles/mp-target":
            return 200, _json_response(
                {
                    "data": {
                        "id": "mp-target",
                        "name": "target",
                        "enabled": True,
                        "whitelisted_destinations": ["NL"],
                    }
                }
            )
        if method == "PATCH" and path == "/v2/phone_numbers/phone-2/messaging":
            return 200, _json_response(
                {"data": {"id": "phone-2", "messaging_profile_id": "mp-target"}}
            )
        if method == "POST" and path == "/v2/messages":
            return 202, _json_response(_queued_message_from_request(request))
        if method == "GET" and path == "/v2/messages/msg-1":
            return 200, _json_response(_delivered_message())

    if scenario in {
        "messaging_inactive_number",
        "messaging_phone_mismatch",
        "messaging_profile_list_error",
    }:
        if method == "GET" and path == "/v2/phone_numbers":
            if scenario == "messaging_phone_mismatch":
                return 200, _json_response(
                    _phone_number(phone_number="+12025550199")
                )
            number = _phone_number()
            if scenario == "messaging_inactive_number":
                number["data"][0]["status"] = "inactive"
            return 200, _json_response(number)
        if method == "GET" and path == "/v2/phone_numbers/phone-1/messaging":
            return 200, _json_response(
                {"data": {"id": "phone-1", "messaging_profile_id": None}}
            )
        if method == "GET" and path == "/v2/messaging_profiles":
            return 403, _json_response(
                {"errors": [{"code": "10009", "detail": "forbidden"}]}
            )

    if scenario == "messaging_no_profile":
        if method == "GET" and path == "/v2/phone_numbers":
            return 200, _json_response(_phone_number())
        if method == "GET" and path == "/v2/phone_numbers/phone-1/messaging":
            return 200, _json_response(
                {"data": {"id": "phone-1", "messaging_profile_id": None}}
            )
        if method == "GET" and path == "/v2/messaging_profiles":
            return 200, _json_response({"data": []})
        if method == "POST" and path == "/v2/messaging_profiles":
            payload = json.loads(request["body"] or "{}")
            return 201, _json_response(
                {
                    "data": {
                        "id": "mp-new",
                        "name": payload.get("name"),
                        "enabled": payload.get("enabled"),
                        "whitelisted_destinations": payload.get(
                            "whitelisted_destinations"
                        ),
                    }
                }
            )
        if method == "PATCH" and path == "/v2/phone_numbers/phone-1/messaging":
            return 200, _json_response(
                {"data": {"id": "phone-1", "messaging_profile_id": "mp-new"}}
            )
        if method == "POST" and path == "/v2/messages":
            return 202, _json_response(_queued_message_from_request(request))
        if method == "GET" and path == "/v2/messages/msg-1":
            return 200, _json_response(_delivered_message())

    if scenario in {
        "messaging_existing_profile_missing_country",
        "messaging_wrong_profile_patch_id",
    }:
        if method == "GET" and path == "/v2/phone_numbers":
            return 200, _json_response(_phone_number())
        if method == "GET" and path == "/v2/phone_numbers/phone-1/messaging":
            return 200, _json_response(
                {"data": {"id": "phone-1", "messaging_profile_id": "mp-existing"}}
            )
        if method == "GET" and path == "/v2/messaging_profiles/mp-existing":
            return 200, _json_response(
                {
                    "data": {
                        "id": "mp-existing",
                        "name": "existing",
                        "enabled": True,
                        "whitelisted_destinations": ["US"],
                    }
                }
            )
        if method == "PATCH" and path == "/v2/messaging_profiles/mp-existing":
            return 200, _json_response(
                {
                    "data": {
                        "id": (
                            "mp-other"
                            if scenario == "messaging_wrong_profile_patch_id"
                            else "mp-existing"
                        ),
                        "enabled": True,
                        "whitelisted_destinations": ["NL", "US"],
                    }
                }
            )
        if method == "POST" and path == "/v2/messages":
            return 202, _json_response(_queued_message_from_request(request))
        if method == "GET" and path == "/v2/messages/msg-1":
            return 200, _json_response(_delivered_message())

    if scenario in {
        "messaging_existing_number_other_profile",
        "messaging_wrong_assignment_id",
    }:
        if method == "GET" and path == "/v2/phone_numbers":
            return 200, _json_response(_phone_number())
        if method == "GET" and path == "/v2/phone_numbers/phone-1/messaging":
            return 200, _json_response(
                {"data": {"id": "phone-1", "messaging_profile_id": "mp-current"}}
            )
        if method == "GET" and path == "/v2/messaging_profiles/mp-target":
            return 200, _json_response(
                {
                    "data": {
                        "id": "mp-target",
                        "name": "target",
                        "enabled": True,
                        "whitelisted_destinations": ["NL"],
                    }
                }
            )
        if method == "PATCH" and path == "/v2/phone_numbers/phone-1/messaging":
            return 200, _json_response(
                {
                    "data": {
                        "id": (
                            "phone-other"
                            if scenario == "messaging_wrong_assignment_id"
                            else "phone-1"
                        ),
                        "messaging_profile_id": "mp-target",
                    }
                }
            )
        if method == "POST" and path == "/v2/messages":
            return 202, _json_response(_queued_message_from_request(request))
        if method == "GET" and path == "/v2/messages/msg-1":
            return 200, _json_response(_delivered_message())

    if scenario in {"messaging_settings_missing", "messaging_settings_mismatched"}:
        if method == "GET" and path == "/v2/phone_numbers":
            return 200, _json_response(_phone_number())
        if method == "GET" and path == "/v2/phone_numbers/phone-1/messaging":
            if scenario == "messaging_settings_missing":
                return 404, _json_response(
                    {"errors": [{"code": "10011", "detail": "settings not found"}]}
                )
            return 200, _json_response(
                {"data": {"id": "phone-other", "messaging_profile_id": "mp-other"}}
            )

    if scenario in {
        "messaging_profile_detail_with_errors",
        "messaging_settings_with_errors",
    }:
        if method == "GET" and path == "/v2/phone_numbers":
            return 200, _json_response(_phone_number())
        if method == "GET" and path == "/v2/phone_numbers/phone-1/messaging":
            response = {
                "data": {"id": "phone-1", "messaging_profile_id": "mp-current"}
            }
            if scenario == "messaging_settings_with_errors":
                response["errors"] = [
                    {"code": "10015", "detail": "partial failure"}
                ]
            return 200, _json_response(response)
        if method == "GET" and path == "/v2/messaging_profiles/mp-current":
            return 200, _json_response(
                {
                    "data": {
                        "id": "mp-current",
                        "name": "current",
                        "enabled": True,
                        "whitelisted_destinations": ["NL"],
                    },
                    "errors": [{"code": "10015", "detail": "partial failure"}],
                }
            )
        if method == "POST" and path == "/v2/messages":
            return 202, _json_response(_queued_message_from_request(request))
        if method == "GET" and path == "/v2/messages/msg-1":
            return 200, _json_response(_delivered_message())

    voice_scenarios = {
        "voice_explicit_ovp_patch",
        "voice_inactive_explicit",
        "voice_temp_success",
        "voice_call_failure",
        "voice_unanswered",
        "voice_tts_failure",
        "voice_cleanup_failure",
        "voice_wrong_status_id",
        "voice_disabled_ovp",
        "voice_inactive_number",
        "voice_wrong_ovp_patch_id",
        "voice_cca_detail_with_errors",
        "voice_tts_2xx_empty_body",
        "voice_tts_2xx_malformed_body",
        "voice_tts_2xx_error_body",
        "voice_tts_2xx_result_not_ok",
        "voice_cca_paginated",
    }
    if scenario in voice_scenarios:
        if method == "GET" and path == "/v2/phone_numbers":
            number = _phone_number()
            if scenario == "voice_inactive_number":
                number["data"][0]["status"] = "inactive"
            return 200, _json_response(number)
        if method == "GET" and path == "/v2/call_control_applications/cca-existing":
            response = {
                "data": {
                    "id": "cca-existing",
                    "application_name": "existing",
                    "active": scenario != "voice_inactive_explicit",
                    "outbound": {"outbound_voice_profile_id": "ovp-existing"},
                }
            }
            if scenario == "voice_cca_detail_with_errors":
                response["errors"] = [
                    {"code": "10015", "detail": "partial failure"}
                ]
            return 200, _json_response(response)
        if method == "GET" and path == "/v2/outbound_voice_profiles/ovp-existing":
            if scenario in {"voice_explicit_ovp_patch", "voice_wrong_ovp_patch_id"}:
                return 200, _json_response(
                    {
                        "data": {
                            "id": "ovp-existing",
                            "name": 'Primary "EU" \\ route',
                            "enabled": True,
                            "whitelisted_destinations": ["US"],
                        }
                    }
                )
            return 200, _json_response(
                {
                    "data": {
                        "id": "ovp-existing",
                        "name": "existing",
                        "enabled": scenario != "voice_disabled_ovp",
                        "whitelisted_destinations": ["NL"],
                    }
                }
            )
        if method == "PATCH" and path == "/v2/outbound_voice_profiles/ovp-existing":
            return 200, _json_response(
                {
                    "data": {
                        "id": (
                            "ovp-other"
                            if scenario == "voice_wrong_ovp_patch_id"
                            else "ovp-existing"
                        ),
                        "name": 'Primary "EU" \\ route',
                        "enabled": True,
                        "whitelisted_destinations": ["NL", "US"],
                    }
                }
            )
        if method == "GET" and path == "/v2/call_control_applications":
            if scenario == "voice_cca_paginated":
                page = 2 if "page[number]=2" in request["query_data"] else 1
                return 200, _json_response(
                    {
                        "data": [] if page == 1 else [
                            {
                                "id": "cca-existing",
                                "active": True,
                                "outbound": {
                                    "outbound_voice_profile_id": "ovp-existing"
                                },
                            }
                        ],
                        "meta": {"page_number": page, "total_pages": 2},
                    }
                )
            return 200, _json_response({"data": []})
        if method == "POST" and path == "/v2/outbound_voice_profiles":
            payload = json.loads(request["body"] or "{}")
            return 201, _json_response(
                {
                    "data": {
                        "id": "ovp-temp",
                        "record_type": "outbound_voice_profile",
                        "name": payload.get("name"),
                        "enabled": payload.get("enabled"),
                        "whitelisted_destinations": payload.get(
                            "whitelisted_destinations"
                        ),
                    }
                }
            )
        if method == "POST" and path == "/v2/call_control_applications":
            payload = json.loads(request["body"] or "{}")
            return 201, _json_response(
                {
                    "data": {
                        "id": "cca-temp",
                        "record_type": "call_control_application",
                        "application_name": payload.get("application_name"),
                        "active": payload.get("active"),
                        "outbound": payload.get("outbound"),
                    }
                }
            )
        if method == "POST" and path == "/v2/calls":
            if scenario == "voice_call_failure":
                return 422, _json_response(
                    {"errors": [{"code": "10015", "detail": "call rejected"}]}
                )
            payload = json.loads(request["body"] or "{}")
            return 201, _json_response(
                {
                    "data": {
                        "call_control_id": "call-voice",
                        "call_leg_id": "leg-voice",
                        "record_type": "call",
                        "client_state": payload.get("client_state"),
                    }
                }
            )
        if method == "GET" and path == "/v2/calls/call-voice":
            if scenario == "voice_unanswered":
                return 200, _json_response(
                    {
                        "data": {
                            "call_control_id": "call-voice",
                            "is_alive": False,
                            "call_duration": 0,
                        }
                    }
                )
            return 200, _json_response(
                {
                    "data": {
                        "call_control_id": (
                            "call-other"
                            if scenario == "voice_wrong_status_id"
                            else "call-voice"
                        ),
                        "is_alive": True,
                        "call_duration": 3,
                    }
                }
            )
        if method == "POST" and path == "/v2/calls/call-voice/actions/speak":
            if scenario == "voice_tts_failure":
                return 500, _json_response(
                    {"errors": [{"code": "90000", "detail": "speak failed"}]}
                )
            if scenario == "voice_tts_2xx_empty_body":
                return 201, ""
            if scenario == "voice_tts_2xx_malformed_body":
                return 201, "not-json"
            if scenario == "voice_tts_2xx_error_body":
                return 201, _json_response(
                    {"errors": [{"code": "90000", "detail": "speak failed"}]}
                )
            if scenario == "voice_tts_2xx_result_not_ok":
                return 201, _json_response({"data": {"result": "queued"}})
            return 201, _json_response({"data": {"result": "ok"}})
        if method == "POST" and path == "/v2/calls/call-voice/actions/hangup":
            return 202, ""
        if method == "DELETE" and path == "/v2/call_control_applications/cca-temp":
            return (500 if scenario == "voice_cleanup_failure" else 204), ""
        if method == "DELETE" and path == "/v2/outbound_voice_profiles/ovp-temp":
            return 204, ""

    if scenario == "voice_cca_list_error":
        if method == "GET" and path == "/v2/phone_numbers":
            return 200, _json_response(_phone_number())
        if method == "GET" and path == "/v2/call_control_applications":
            return 403, _json_response(
                {"errors": [{"code": "10009", "detail": "forbidden"}]}
            )

    if scenario in {"webrtc_invalid_alg", "webrtc_expired_token"}:
        if method == "GET" and path == "/v2/credential_connections/conn-webrtc":
            return 200, _json_response(_connection("conn-webrtc"))
        if method == "POST" and path == "/v2/telephony_credentials":
            payload = json.loads(request["body"] or "{}")
            return 201, _json_response(
                {
                    "data": {
                        "id": "cred-invalid",
                        "record_type": "credential",
                        "name": payload.get("name"),
                        "resource_id": f"connection:{payload.get('connection_id')}",
                        "expires_at": payload.get("expires_at"),
                    }
                }
            )
        if method == "POST" and path == "/v2/telephony_credentials/cred-invalid/token":
            if scenario == "webrtc_invalid_alg":
                return 200, "eyJhbGciOiJub25lIn0.e30.c2ln"
            return 200, "eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjF9.c2ln"
        if method == "DELETE" and path == "/v2/telephony_credentials/cred-invalid":
            return 204, ""

    if scenario == "webrtc_wrong_connection":
        if method == "GET" and path == "/v2/credential_connections/conn-webrtc":
            return 200, _json_response(_connection("conn-other"))

    if scenario == "webrtc_connection_with_errors":
        if method == "GET" and path == "/v2/credential_connections/conn-webrtc":
            response = _connection("conn-webrtc")
            response["errors"] = [
                {"code": "90000", "detail": "ambiguous connection read"}
            ]
            return 200, _json_response(response)

    if scenario == "webrtc_connection_list_error":
        if method == "GET" and path == "/v2/credential_connections":
            return 403, _json_response(
                {"errors": [{"code": "10009", "detail": "forbidden"}]}
            )

    if scenario == "webrtc_cca_list_error":
        if method == "GET" and path == "/v2/phone_numbers":
            return 200, _json_response(_phone_number())
        if method == "GET" and path == "/v2/call_control_applications":
            return 403, _json_response(
                {"errors": [{"code": "10009", "detail": "forbidden"}]}
            )

    webrtc_live_scenarios = {
        "webrtc_live_temp_success",
        "webrtc_live_existing_selection",
        "webrtc_live_call_failure",
        "webrtc_live_unanswered",
        "webrtc_live_cleanup_failure",
        "webrtc_live_wrong_status_id",
        "webrtc_live_tts_2xx_empty_body",
        "webrtc_live_tts_2xx_malformed_body",
        "webrtc_live_tts_2xx_error_body",
        "webrtc_live_tts_2xx_result_not_ok",
        "webrtc_live_cca_paginated",
        "webrtc_live_cca_pagination_drift",
    }
    if scenario in webrtc_live_scenarios:
        if method == "GET" and path == "/v2/credential_connections/conn-webrtc":
            return 200, _json_response(_connection("conn-webrtc"))
        if method == "POST" and path == "/v2/telephony_credentials":
            payload = json.loads(request["body"] or "{}")
            return 201, _json_response(
                {
                    "data": {
                        "id": "cred-webrtc",
                        "record_type": "credential",
                        "name": payload.get("name"),
                        "resource_id": f"connection:{payload.get('connection_id')}",
                        "expires_at": payload.get("expires_at"),
                    }
                }
            )
        if method == "POST" and path == "/v2/telephony_credentials/cred-webrtc/token":
            return 200, VALID_JWT
        if method == "GET" and path == "/v2/phone_numbers":
            return 200, _json_response(_phone_number())
        if method == "GET" and path == "/v2/call_control_applications":
            if scenario in {
                "webrtc_live_cca_paginated",
                "webrtc_live_cca_pagination_drift",
            }:
                page = 2 if "page[number]=2" in request["query_data"] else 1
                total_pages = (
                    3
                    if scenario == "webrtc_live_cca_pagination_drift" and page == 2
                    else 2
                )
                return 200, _json_response(
                    {
                        "data": [] if page == 1 else [
                            {
                                "id": "cca-nl",
                                "active": True,
                                "outbound": {
                                    "outbound_voice_profile_id": "ovp-nl"
                                },
                            }
                        ],
                        "meta": {
                            "page_number": page,
                            "total_pages": total_pages,
                        },
                    }
                )
            if scenario == "webrtc_live_existing_selection":
                return 200, _json_response(
                    {
                        "data": [
                            {
                                "id": "cca-inactive-nl",
                                "active": False,
                                "outbound": {
                                    "outbound_voice_profile_id": "ovp-inactive-nl"
                                },
                            },
                            {
                                "id": "cca-us",
                                "active": True,
                                "outbound": {
                                    "outbound_voice_profile_id": "ovp-us"
                                },
                            },
                            {
                                "id": "cca-nl",
                                "active": True,
                                "outbound": {
                                    "outbound_voice_profile_id": "ovp-nl"
                                },
                            },
                        ]
                    }
                )
            return 200, _json_response({"data": []})
        if method == "GET" and path == "/v2/outbound_voice_profiles/ovp-us":
            return 200, _json_response(
                {
                    "data": {
                        "id": "ovp-us",
                        "enabled": True,
                        "whitelisted_destinations": ["US"],
                    }
                }
            )
        if method == "GET" and path == "/v2/outbound_voice_profiles/ovp-nl":
            return 200, _json_response(
                {
                    "data": {
                        "id": "ovp-nl",
                        "enabled": True,
                        "whitelisted_destinations": ["NL"],
                    }
                }
            )
        if method == "POST" and path == "/v2/outbound_voice_profiles":
            payload = json.loads(request["body"] or "{}")
            return 201, _json_response(
                {
                    "data": {
                        "id": "ovp-webrtc",
                        "record_type": "outbound_voice_profile",
                        "name": payload.get("name"),
                        "enabled": payload.get("enabled"),
                        "whitelisted_destinations": payload.get(
                            "whitelisted_destinations"
                        ),
                    }
                }
            )
        if method == "POST" and path == "/v2/call_control_applications":
            payload = json.loads(request["body"] or "{}")
            return 201, _json_response(
                {
                    "data": {
                        "id": "cca-webrtc",
                        "record_type": "call_control_application",
                        "application_name": payload.get("application_name"),
                        "active": payload.get("active"),
                        "outbound": payload.get("outbound"),
                    }
                }
            )
        if method == "POST" and path == "/v2/calls":
            if scenario == "webrtc_live_call_failure":
                return 422, _json_response(
                    {"errors": [{"code": "10015", "detail": "call rejected"}]}
                )
            payload = json.loads(request["body"] or "{}")
            return 201, _json_response(
                {
                    "data": {
                        "call_control_id": "call-webrtc",
                        "record_type": "call",
                        "client_state": payload.get("client_state"),
                    }
                }
            )
        if method == "GET" and path == "/v2/calls/call-webrtc":
            if scenario == "webrtc_live_unanswered":
                return 200, _json_response(
                    {
                        "data": {
                            "call_control_id": (
                                "call-other"
                                if scenario == "webrtc_live_wrong_status_id"
                                else "call-webrtc"
                            ),
                            "is_alive": False,
                            "call_duration": 0,
                        }
                    }
                )
            return 200, _json_response(
                {
                    "data": {
                        "call_control_id": (
                            "call-other"
                            if scenario == "webrtc_live_wrong_status_id"
                            else "call-webrtc"
                        ),
                        "is_alive": True,
                        "call_duration": 4,
                    }
                }
            )
        if method == "POST" and path == "/v2/calls/call-webrtc/actions/speak":
            if scenario == "webrtc_live_tts_2xx_empty_body":
                return 202, ""
            if scenario == "webrtc_live_tts_2xx_malformed_body":
                return 202, "not-json"
            if scenario == "webrtc_live_tts_2xx_error_body":
                return 202, _json_response(
                    {"errors": [{"code": "90000", "detail": "speak failed"}]}
                )
            if scenario == "webrtc_live_tts_2xx_result_not_ok":
                return 202, _json_response({"data": {"result": "queued"}})
            return 202, _json_response({"data": {"result": "ok"}})
        if method == "POST" and path == "/v2/calls/call-webrtc/actions/hangup":
            return 202, ""
        if method == "DELETE" and path == "/v2/telephony_credentials/cred-webrtc":
            return (500 if scenario == "webrtc_live_cleanup_failure" else 204), ""
        if method == "DELETE" and path == "/v2/call_control_applications/cca-webrtc":
            return 204, ""
        if method == "DELETE" and path == "/v2/outbound_voice_profiles/ovp-webrtc":
            return 204, ""

    if scenario in {
        "fax_timeout",
        "fax_delivered",
        "fax_sent_status",
        "fax_wrong_status_id",
        "fax_cancel_failure",
        "fax_no_features_dry_run",
        "fax_app_with_errors",
        "fax_ovp_with_errors",
        "fax_mixed_inventory",
        "fax_explicit_app_autodetect",
        "fax_explicit_app_no_sender",
        "fax_paginated_sender",
    }:
        if method == "GET" and path == "/v2/phone_numbers":
            if scenario == "fax_paginated_sender":
                page = 2 if "page[number]=2" in request["query_data"] else 1
                return 200, _json_response(
                    {
                        "data": [] if page == 1 else [
                            {
                                "id": "phone-1",
                                "phone_number": "+12025550123",
                                "status": "active",
                                "connection_id": "fax-app",
                            }
                        ],
                        "meta": {"page_number": page, "total_pages": 2},
                    }
                )
            if scenario == "fax_mixed_inventory":
                return 200, _json_response(
                    {
                        "data": [
                            {
                                "id": "phone-voice",
                                "phone_number": "+12025550111",
                                "status": "active",
                                "connection_id": "voice-app",
                            },
                            {
                                "id": "phone-fax-us",
                                "phone_number": "+12025550112",
                                "status": "active",
                                "connection_id": "fax-us",
                            },
                            {
                                "id": "phone-1",
                                "phone_number": "+12025550123",
                                "status": "active",
                                "connection_id": "fax-app",
                            },
                        ]
                    }
                )
            if scenario == "fax_explicit_app_autodetect":
                return 200, _json_response(
                    {
                        "data": [
                            {
                                "id": "phone-other-fax",
                                "phone_number": "+12025550110",
                                "status": "active",
                                "connection_id": "fax-other",
                            },
                            {
                                "id": "phone-1",
                                "phone_number": "+12025550123",
                                "status": "active",
                                "connection_id": "fax-app",
                            },
                        ]
                    }
                )
            if scenario == "fax_explicit_app_no_sender":
                return 200, _json_response(
                    {
                        "data": [
                            {
                                "id": "phone-other-fax",
                                "phone_number": "+12025550110",
                                "status": "active",
                                "connection_id": "fax-other",
                            }
                        ]
                    }
                )
            number = _phone_number()
            if scenario == "fax_no_features_dry_run":
                number["data"][0].pop("features")
            return 200, _json_response(number)
        if method == "GET" and path == "/v2/fax_applications/voice-app":
            return 404, _json_response({"errors": [{"code": "10011"}]})
        if method == "GET" and path == "/v2/fax_applications/fax-us":
            return 200, _json_response(
                {
                    "data": {
                        "id": "fax-us",
                        "active": True,
                        "outbound": {"outbound_voice_profile_id": "ovp-us"},
                    }
                }
            )
        if method == "GET" and path == "/v2/fax_applications/fax-other":
            return 200, _json_response(
                {
                    "data": {
                        "id": "fax-other",
                        "active": True,
                        "outbound": {"outbound_voice_profile_id": "ovp-other"},
                    }
                }
            )
        if method == "GET" and path == "/v2/outbound_voice_profiles/ovp-us":
            return 200, _json_response(
                {
                    "data": {
                        "id": "ovp-us",
                        "enabled": True,
                        "whitelisted_destinations": ["US"],
                    }
                }
            )
        if method == "GET" and path == "/v2/outbound_voice_profiles/ovp-other":
            return 200, _json_response(
                {
                    "data": {
                        "id": "ovp-other",
                        "enabled": True,
                        "whitelisted_destinations": ["NL"],
                    }
                }
            )
        if method == "GET" and path == "/v2/fax_applications/fax-app":
            response = {
                "data": {
                    "id": "fax-app",
                    "active": True,
                    "outbound": {"outbound_voice_profile_id": "ovp-fax"},
                }
            }
            if scenario == "fax_app_with_errors":
                response["errors"] = [
                    {"code": "90000", "detail": "ambiguous fax app read"}
                ]
            return 200, _json_response(response)
        if method == "GET" and path == "/v2/outbound_voice_profiles/ovp-fax":
            response = {
                "data": {
                    "id": "ovp-fax",
                    "enabled": True,
                    "whitelisted_destinations": ["NL"],
                }
            }
            if scenario == "fax_ovp_with_errors":
                response["errors"] = [
                    {"code": "90000", "detail": "ambiguous OVP read"}
                ]
            return 200, _json_response(response)
        if method == "POST" and path == "/v2/faxes":
            return 202, _json_response(
                {
                    "data": {
                        "id": "fax-1",
                        "record_type": "fax",
                        "connection_id": "fax-app",
                        "direction": "outbound",
                        "from": "+12025550123",
                        "to": "+31201234567",
                        "media_url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                        "status": "queued",
                    }
                }
            )
        if method == "GET" and path == "/v2/faxes/fax-1":
            if scenario == "fax_delivered":
                status = "delivered"
            elif scenario == "fax_sent_status":
                status = "sent"
            else:
                status = "queued"
            return 200, _json_response(
                {
                    "data": {
                        "id": (
                            "fax-other"
                            if scenario == "fax_wrong_status_id"
                            else "fax-1"
                        ),
                        "status": status,
                    }
                }
            )
        if method == "POST" and path == "/v2/faxes/fax-1/actions/cancel":
            if scenario == "fax_cancel_failure":
                return 500, _json_response(
                    {"errors": [{"code": "90000", "detail": "cancel failed"}]}
                )
            return 202, _json_response(
                {"data": {"id": "fax-1", "status": "canceling"}}
            )

    raise LookupError(f"unmodeled request for {scenario}: {method} {request['url']}")


def _append_log(entry: dict[str, Any]) -> None:
    log_path = Path(os.environ[LOG_ENV])
    with log_path.open("a", encoding="utf-8") as log_file:
        log_file.write(json.dumps(entry, separators=(",", ":")) + "\n")


def _fake_curl_main(argv: list[str]) -> int:
    scenario = os.environ.get(SCENARIO_ENV, "")
    try:
        request = _parse_curl_args(argv)
        status, response = _route_fake_request(request, scenario)
        request.update({"matched": True, "status": status})
        _append_log(request)
    except Exception as error:  # fail closed, including malformed payloads
        _append_log(
            {
                "command": "curl",
                "argv": argv,
                "matched": False,
                "error": str(error),
            }
        )
        print(f"fake curl: {error}", file=sys.stderr)
        return 97

    output = request["output"]
    if output and output != "/dev/null":
        Path(output).write_text(response, encoding="utf-8")
    elif not output:
        sys.stdout.write(response)

    if request["write_out"]:
        write_out = request["write_out"].replace("%{http_code}", str(status))
        # curl interprets backslash escapes in --write-out format strings.
        sys.stdout.write(write_out.replace(r"\n", "\n"))
    return 0


def _fake_sleep_main(argv: list[str]) -> int:
    _append_log({"command": "sleep", "args": argv, "matched": True})
    return 0


def _fake_date_main(argv: list[str]) -> int:
    scenario = os.environ.get(SCENARIO_ENV, "")
    prior_epoch_calls = 0
    log_path = Path(os.environ[LOG_ENV])
    if log_path.exists():
        prior_epoch_calls = sum(
            1
            for line in log_path.read_text(encoding="utf-8").splitlines()
            if line
            and json.loads(line).get("command") == "date"
            and json.loads(line).get("args") == ["+%s"]
        )

    if argv == ["+%s"]:
        if scenario in {
            "fax_timeout",
            "fax_sent_status",
            "fax_cancel_failure",
            "messaging_sent_timeout",
            "voice_unanswered",
        }:
            # POLL_START, first immediate check, then an elapsed timeout.
            values = ("1000", "1000", "1061")
            output = values[min(prior_epoch_calls, len(values) - 1)]
        else:
            output = "1700000000"
    elif argv == ["-u", "+%Y-%m-%dT%H:%M:%SZ"]:
        output = "2026-08-04T00:00:00Z"
    else:
        _append_log(
            {
                "command": "date",
                "args": argv,
                "matched": False,
                "error": "unsupported fake date invocation",
            }
        )
        print(f"fake date: unsupported arguments: {argv!r}", file=sys.stderr)
        return 98

    _append_log(
        {"command": "date", "args": argv, "matched": True, "output": output}
    )
    print(output)
    return 0


if os.environ.get(FAKE_DRIVER_ENV) == "1":
    fake_command = Path(sys.argv[0]).name
    if fake_command == "curl":
        raise SystemExit(_fake_curl_main(sys.argv[1:]))
    if fake_command == "sleep":
        raise SystemExit(_fake_sleep_main(sys.argv[1:]))
    if fake_command == "date":
        raise SystemExit(_fake_date_main(sys.argv[1:]))
    print(f"unknown fake command: {fake_command}", file=sys.stderr)
    raise SystemExit(98)


class MigrationScriptContracts(unittest.TestCase):
    maxDiff = None

    @classmethod
    def setUpClass(cls) -> None:
        if shutil.which("jq") is None:
            raise RuntimeError("jq is required by the migration script contract tests")

    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory(
            prefix="telnyx-migration-contracts-"
        )
        self.temp_root = Path(self.temporary_directory.name)
        self.fake_bin = self.temp_root / "bin"
        self.fake_bin.mkdir()
        self.log_path = self.temp_root / "requests.jsonl"

        for command in ("curl", "sleep", "date"):
            executable = self.fake_bin / command
            shutil.copy2(Path(__file__).resolve(), executable)
            executable.chmod(executable.stat().st_mode | stat.S_IXUSR)

        # A PATH containing only this directory simulates a machine without jq.
        # Keep the fake driver's interpreter and common shell utilities available
        # so that the exercised script path remains otherwise realistic.
        utility_targets = {"python3": sys.executable}
        for utility in (
            "awk",
            "basename",
            "cat",
            "cut",
            "grep",
            "head",
            "mktemp",
            "od",
            "rm",
            "sed",
            "seq",
            "sort",
            "tail",
            "tr",
            "wc",
        ):
            target = shutil.which(utility)
            if target:
                utility_targets[utility] = target
        for utility, target in utility_targets.items():
            os.symlink(target, self.fake_bin / utility)

    def tearDown(self) -> None:
        self.temporary_directory.cleanup()

    def run_script(
        self,
        script_name: str | Path,
        scenario: str,
        *arguments: str,
        expected_exit: int,
        extra_environment: dict[str, str] | None = None,
        without_jq: bool = False,
        terminal_input: str | None = None,
    ) -> tuple[subprocess.CompletedProcess[str], list[dict[str, Any]]]:
        self.log_path.unlink(missing_ok=True)
        environment = os.environ.copy()
        for name in list(environment):
            if name.startswith("TELNYX_"):
                environment.pop(name)
        environment.update(
            {
                "PATH": (
                    str(self.fake_bin)
                    if without_jq
                    else f"{self.fake_bin}{os.pathsep}{environment['PATH']}"
                ),
                "PYTHONDONTWRITEBYTECODE": "1",
                "TELNYX_API_KEY": "KEY_TEST_ONLY_NOT_REAL",
                FAKE_DRIVER_ENV: "1",
                SCENARIO_ENV: scenario,
                LOG_ENV: str(self.log_path),
            }
        )
        if extra_environment:
            environment.update(extra_environment)

        script_path = Path(script_name)
        if not script_path.is_absolute():
            script_path = MIGRATION_SCRIPTS / script_path

        command = [BASH, str(script_path), *arguments]
        if terminal_input is None:
            result = subprocess.run(
                command,
                cwd=ROOT,
                env=environment,
                stdin=subprocess.DEVNULL,
                capture_output=True,
                text=True,
                timeout=15,
                check=False,
            )
        else:
            master_fd, slave_fd = pty.openpty()
            process = subprocess.Popen(
                command,
                cwd=ROOT,
                env=environment,
                stdin=slave_fd,
                stdout=slave_fd,
                stderr=slave_fd,
                close_fds=True,
            )
            os.close(slave_fd)
            output_chunks: list[bytes] = []
            input_sent = False
            deadline = time.monotonic() + 15
            try:
                while True:
                    remaining = deadline - time.monotonic()
                    if remaining <= 0:
                        process.kill()
                        process.wait()
                        self.fail(f"interactive script timed out for {scenario}")
                    readable, _, _ = select.select(
                        [master_fd], [], [], min(0.1, remaining)
                    )
                    if readable:
                        try:
                            chunk = os.read(master_fd, 4096)
                        except OSError:
                            chunk = b""
                        if chunk:
                            output_chunks.append(chunk)
                            if not input_sent and b"Code:" in b"".join(output_chunks):
                                os.write(master_fd, terminal_input.encode())
                                input_sent = True
                    if process.poll() is not None:
                        while True:
                            readable, _, _ = select.select([master_fd], [], [], 0)
                            if not readable:
                                break
                            try:
                                chunk = os.read(master_fd, 4096)
                            except OSError:
                                break
                            if not chunk:
                                break
                            output_chunks.append(chunk)
                        break
                result = subprocess.CompletedProcess(
                    command,
                    process.returncode,
                    stdout=b"".join(output_chunks).decode(errors="replace"),
                    stderr="",
                )
            finally:
                os.close(master_fd)
        combined_output = result.stdout + result.stderr
        self.assertNotIn("KEY_TEST_ONLY_NOT_REAL", combined_output)
        self.assertNotIn("KEY_TEST", combined_output)
        self.assertEqual(
            expected_exit,
            result.returncode,
            f"unexpected exit for {scenario}\n{combined_output}\nlog:\n{self._raw_log()}",
        )
        requests = self.requests()
        unmatched = [request for request in requests if not request.get("matched", False)]
        self.assertEqual([], unmatched, f"fake transport rejected requests: {unmatched}")
        return result, requests

    def _raw_log(self) -> str:
        return self.log_path.read_text(encoding="utf-8") if self.log_path.exists() else ""

    def requests(self) -> list[dict[str, Any]]:
        if not self.log_path.exists():
            return []
        return [
            json.loads(line)
            for line in self.log_path.read_text(encoding="utf-8").splitlines()
            if line
        ]

    @staticmethod
    def curl_requests(requests: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [request for request in requests if request["command"] == "curl"]

    def assert_no_account_mutations(self, requests: list[dict[str, Any]]) -> None:
        mutations = [
            request
            for request in self.curl_requests(requests)
            if request["method"] in {"POST", "PATCH", "DELETE"}
        ]
        self.assertEqual([], mutations)

    def test_sip_existing_connection_without_ovp_fails_without_mutation(self) -> None:
        result, requests = self.run_script(
            "test-sip.sh",
            "sip_existing_no_opt_in",
            "--confirm",
            expected_exit=1,
        )
        self.assert_no_account_mutations(requests)
        self.assertIn("will NOT modify an existing connection", result.stdout)

    def test_sip_explicit_opt_in_attaches_only_selected_ovp(self) -> None:
        _, requests = self.run_script(
            "test-sip.sh",
            "sip_existing_opt_in",
            "--confirm",
            expected_exit=0,
            extra_environment={
                "TELNYX_SIP_CONNECTION_ID": "conn-existing",
                "TELNYX_OVP_ID": "ovp-chosen",
                "TELNYX_APPROVE_TRUNK_MODIFY": "conn-existing|ovp-chosen",
            },
        )
        mutations = [
            request
            for request in self.curl_requests(requests)
            if request["method"] in {"POST", "PATCH", "DELETE"}
        ]
        self.assertEqual(1, len(mutations))
        self.assertEqual("PATCH", mutations[0]["method"])
        self.assertEqual("/v2/credential_connections/conn-existing", mutations[0]["path"])
        self.assertEqual(
            {"outbound": {"outbound_voice_profile_id": "ovp-chosen"}},
            json.loads(mutations[0]["body"]),
        )

    def test_sip_trunk_approval_requires_explicit_connection_and_exact_pair(self) -> None:
        for environment in (
            {
                "TELNYX_OVP_ID": "ovp-chosen",
                "TELNYX_APPROVE_TRUNK_MODIFY": "conn-existing|ovp-chosen",
            },
            {
                "TELNYX_SIP_CONNECTION_ID": "conn-existing",
                "TELNYX_OVP_ID": "ovp-chosen",
                "TELNYX_APPROVE_TRUNK_MODIFY": "another-connection|ovp-chosen",
            },
        ):
            with self.subTest(environment=environment):
                _, requests = self.run_script(
                    "test-sip.sh",
                    "sip_existing_no_opt_in",
                    "--confirm",
                    expected_exit=1,
                    extra_environment=environment,
                )
                self.assert_no_account_mutations(requests)

    def test_sip_empty_account_mutates_only_resources_created_this_run(self) -> None:
        _, requests = self.run_script(
            "test-sip.sh",
            "sip_empty_account",
            "--confirm",
            expected_exit=0,
        )
        mutations = [
            request
            for request in self.curl_requests(requests)
            if request["method"] in {"POST", "PATCH", "DELETE"}
        ]
        self.assertEqual(
            [
                ("POST", "/v2/credential_connections"),
                ("POST", "/v2/outbound_voice_profiles"),
                ("PATCH", "/v2/credential_connections/conn-new"),
                ("DELETE", "/v2/credential_connections/conn-new"),
                ("DELETE", "/v2/outbound_voice_profiles/ovp-new"),
            ],
            [(request["method"], request["path"]) for request in mutations],
        )
        connection_payload = json.loads(mutations[0]["body"])
        self.assertRegex(connection_payload["user_name"], r"^[A-Za-z0-9]{4,32}$")
        self.assertEqual(32, len(connection_payload["password"]))
        self.assertEqual(
            "ovp-new",
            json.loads(mutations[2]["body"])["outbound"]["outbound_voice_profile_id"],
        )

    def test_sip_cleanup_failure_is_nonzero_and_attempts_every_delete(self) -> None:
        result, requests = self.run_script(
            "test-sip.sh",
            "sip_cleanup_failure",
            "--confirm",
            expected_exit=1,
        )
        deletes = [
            request
            for request in self.curl_requests(requests)
            if request["method"] == "DELETE"
        ]
        self.assertEqual(
            [
                ("/v2/credential_connections/conn-new", 500),
                ("/v2/outbound_voice_profiles/ovp-new", 204),
            ],
            [(request["path"], request["status"]) for request in deletes],
        )
        self.assertIn("Manual cleanup required", result.stdout)
        self.assertIn("connection=conn-new", result.stdout)

    def test_sip_creation_aborts_when_secure_password_generation_fails(self) -> None:
        fake_tr = self.fake_bin / "tr"
        real_tr = fake_tr.resolve()
        fake_tr.unlink()
        fake_tr.write_text(
            "#!/bin/sh\n"
            "if [ \"${1:-}\" = '-dc' ]; then exit 0; fi\n"
            f"exec {real_tr} \"$@\"\n",
            encoding="utf-8",
        )
        fake_tr.chmod(fake_tr.stat().st_mode | stat.S_IXUSR)

        result, requests = self.run_script(
            "test-sip.sh",
            "sip_empty_account",
            "--confirm",
            expected_exit=1,
        )
        self.assertIn("cryptographically secure SIP test password", result.stdout)
        self.assertFalse(
            any(
                request["method"] == "POST"
                and request["url"].endswith("/credential_connections")
                for request in requests
            )
        )

    def test_sip_cleanup_keeps_signal_traps_armed_during_deletion(self) -> None:
        source = (MIGRATION_SCRIPTS / "test-sip.sh").read_text(encoding="utf-8")
        final_cleanup = source.split(
            'echo -e "${BOLD}Cleaning up temporary SIP resources...${NC}"', 1
        )[1].split("TEMP_RESOURCES_REMOVED=true", 1)[0]
        self.assertLess(
            final_cleanup.index("cleanup_sip_resources"),
            final_cleanup.index("trap - EXIT INT TERM"),
        )
        exit_cleanup = source.split("cleanup_sip_on_exit() {", 1)[1].split(
            "}\ntrap cleanup_sip_on_exit", 1
        )[0]
        self.assertIn("trap '' INT TERM", exit_cleanup)
        self.assertLess(
            exit_cleanup.index("trap '' INT TERM"),
            exit_cleanup.index("cleanup_sip_resources"),
        )

    def test_sip_prefers_later_ready_connection_without_mutation(self) -> None:
        result, requests = self.run_script(
            "test-sip.sh",
            "sip_multiple_connections",
            "--confirm",
            expected_exit=0,
        )
        self.assert_no_account_mutations(requests)
        self.assertIn("conn-ready", result.stdout)
        self.assertIn(
            "credential connection with an Outbound Voice Profile attached",
            result.stdout,
        )

    def test_sip_pages_connection_discovery_before_fallback(self) -> None:
        result, requests = self.run_script(
            "test-sip.sh",
            "sip_connections_paginated",
            "--confirm",
            expected_exit=0,
        )
        self.assert_no_account_mutations(requests)
        self.assertIn("conn-ready", result.stdout)
        connection_pages = [
            request["query_data"]
            for request in self.curl_requests(requests)
            if request["method"] == "GET" and request["path"] == "/v2/connections"
        ]
        self.assertEqual(
            [
                ["page[number]=1", "page[size]=100"],
                ["page[number]=2", "page[size]=100"],
            ],
            connection_pages,
        )

    def test_sip_pagination_drift_fails_closed_before_mutation(self) -> None:
        result, requests = self.run_script(
            "test-sip.sh",
            "sip_connections_pagination_drift",
            "--confirm",
            expected_exit=1,
        )
        self.assert_no_account_mutations(requests)
        self.assertIn("Could not read SIP connections", result.stdout)

    def test_sip_rejects_ambiguous_reads_and_mismatched_mutation_echoes(self) -> None:
        cases = (
            (
                "sip_wrong_connection_detail",
                {
                    "TELNYX_SIP_CONNECTION_ID": "conn-existing",
                    "TELNYX_OVP_ID": "ovp-chosen",
                    "TELNYX_APPROVE_TRUNK_MODIFY": "conn-existing|ovp-chosen",
                },
                "did not match conn-existing",
                0,
            ),
            (
                "sip_connection_list_error",
                {},
                "Could not read SIP connections",
                0,
            ),
            (
                "sip_wrong_patch_echo",
                {
                    "TELNYX_SIP_CONNECTION_ID": "conn-existing",
                    "TELNYX_OVP_ID": "ovp-chosen",
                    "TELNYX_APPROVE_TRUNK_MODIFY": "conn-existing|ovp-chosen",
                },
                "PATCH accepted but the connection does not report the profile",
                1,
            ),
        )
        for scenario, environment, expected_output, expected_patches in cases:
            with self.subTest(scenario=scenario):
                result, requests = self.run_script(
                    "test-sip.sh",
                    scenario,
                    "--confirm",
                    expected_exit=1,
                    extra_environment=environment,
                )
                mutations = [
                    request
                    for request in self.curl_requests(requests)
                    if request["method"] in {"POST", "PATCH", "DELETE"}
                ]
                self.assertEqual(
                    expected_patches,
                    sum(request["method"] == "PATCH" for request in mutations),
                )
                self.assertFalse(any(request["method"] != "PATCH" for request in mutations))
                self.assertIn(expected_output, result.stdout)

    def test_sip_rejects_conflicting_modes_before_api_use(self) -> None:
        result, requests = self.run_script(
            "test-sip.sh",
            "conflicting_flags",
            "--confirm",
            "--dry-run",
            expected_exit=2,
        )
        self.assertEqual([], requests)
        self.assertIn("mutually exclusive", result.stderr)

    def test_sip_rejects_ambiguous_balance_responses(self) -> None:
        for scenario in (
            "balance_200_empty",
            "balance_200_malformed",
            "balance_200_error_bearing",
        ):
            with self.subTest(scenario=scenario):
                result, requests = self.run_script(
                    "test-sip.sh", scenario, "--dry-run", expected_exit=1
                )
                self.assert_no_account_mutations(requests)
                self.assertIn("malformed balance response", result.stdout)

    def test_sip_detail_errors_fail_before_mutation(self) -> None:
        _, requests = self.run_script(
            "test-sip.sh",
            "sip_detail_with_errors",
            "--confirm",
            expected_exit=1,
            extra_environment={
                "TELNYX_SIP_CONNECTION_ID": "conn-existing",
                "TELNYX_OVP_ID": "ovp-chosen",
                "TELNYX_APPROVE_TRUNK_MODIFY": "conn-existing|ovp-chosen",
            },
        )
        self.assert_no_account_mutations(requests)

    def test_sip_unreadable_listed_details_fail_before_creation(self) -> None:
        result, requests = self.run_script(
            "test-sip.sh",
            "sip_unreadable_listed_details",
            "--confirm",
            expected_exit=1,
        )
        self.assert_no_account_mutations(requests)
        self.assertIn("details were unreadable", result.stdout)

class TeXMLValidatorContracts(unittest.TestCase):
    def run_validator(
        self, xml: str, *, env: dict[str, str] | None = None
    ) -> subprocess.CompletedProcess[str]:
        with tempfile.TemporaryDirectory() as tmp:
            document = Path(tmp) / "document.xml"
            document.write_text(xml, encoding="utf-8")
            process_env = os.environ.copy()
            if env is not None:
                process_env.update(env)
            return subprocess.run(
                [BASH, str(TEXML_VALIDATOR), str(document)],
                cwd=ROOT,
                env=process_env,
                text=True,
                capture_output=True,
                check=False,
            )

    def test_stop_stream_by_name_is_documented_valid(self) -> None:
        # <Stop><Stream name="..."/></Stop> is the documented way to stop a
        # specific named stream, exactly parallel to <Stop><Siprec name>,
        # which this validator already accepts. ALLOWED_ATTRS["Stop.Stream"]
        # was empty while Stop.Siprec carried {"name"} — the same
        # self-contradiction class as Play ringTone.
        accepted = self.run_validator(
            '<Response><Stop><Stream name="media-1"/></Stop></Response>'
        )
        self.assertEqual(
            0, accepted.returncode, accepted.stdout + accepted.stderr
        )
        # A typo must still be rejected as undocumented.
        rejected = self.run_validator(
            '<Response><Stop><Stream nane="media-1"/></Stop></Response>'
        )
        self.assertEqual(1, rejected.returncode, rejected.stdout)

    def test_stopped_stream_cannot_carry_start_parameters(self) -> None:
        rejected = self.run_validator(
            '<Response><Stop><Stream name="media-1">'
            '<Parameter name="tenant" value="demo"/>'
            '</Stream></Stop></Response>'
        )
        self.assertEqual(1, rejected.returncode, rejected.stdout + rejected.stderr)
        self.assertIn(
            "<Parameter> — Invalid TeXML nesting under <Stream>",
            rejected.stdout,
        )

        accepted = self.run_validator(
            '<Response><Start><Stream url="wss://example.com/audio">'
            '<Parameter name="tenant" value="demo"/>'
            '</Stream></Start></Response>'
        )
        self.assertEqual(0, accepted.returncode, accepted.stdout + accepted.stderr)

    def test_record_transcription_callback_contract_is_consistent(self) -> None:
        missing = self.run_validator(
            '<Response><Record transcription="true"/></Response>'
        )
        self.assertEqual(1, missing.returncode, missing.stdout + missing.stderr)
        self.assertIn("requires transcriptionCallback", missing.stdout)

        accepted = self.run_validator(
            '<Response><Record transcription="true" '
            'transcriptionCallback="/handle-transcription"/></Response>'
        )
        self.assertEqual(0, accepted.returncode, accepted.stdout + accepted.stderr)

        reference = (
            ROOT
            / "skills/telnyx-twilio-migration/references/texml-verbs.md"
        ).read_text(encoding="utf-8")
        self.assertIn(
            'transcription="true"\n  transcriptionCallback="/handle-transcription"',
            reference,
        )

    def test_pay_is_accepted_as_runtime_supported(self) -> None:
        result = self.run_validator(
            '<Response><Pay chargeAmount="25.00"/></Response>'
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn("<Pay> — Supported", result.stdout)

    def test_connect_room_is_rejected_without_a_public_contract(self) -> None:
        # The public TeXML <Connect> contract documents Stream,
        # ConversationRelay, and AIAssistant, but not Room. Runtime source is
        # not a customer contract, so the migration validator must fail closed.
        rejected = self.run_validator(
            "<Response><Connect>"
            '<Room participantIdentity="agent-1">support-room</Room>'
            "</Connect></Response>"
        )
        self.assertEqual(
            1, rejected.returncode, rejected.stdout + rejected.stderr
        )
        self.assertIn("<Room> — No TeXML equivalent", rejected.stdout)

    def test_pay_public_postal_and_card_attributes_are_validated(self) -> None:
        accepted = self.run_validator(
            '<Response><Pay postalCode="true" minPostalCodeLength="5" '
            'validCardTypes="visa mastercard optima enroute"/></Response>'
        )
        self.assertEqual(
            0, accepted.returncode, accepted.stdout + accepted.stderr
        )
        bad_length = self.run_validator(
            '<Response><Pay minPostalCodeLength="0"/></Response>'
        )
        self.assertEqual(1, bad_length.returncode)
        bad_card = self.run_validator(
            '<Response><Pay validCardTypes="visa not-a-card"/></Response>'
        )
        self.assertEqual(1, bad_card.returncode)

    def test_ai_assistant_join_uses_a_conversation_id(self) -> None:
        accepted = self.run_validator(
            '<Response><Connect><AIAssistant join="v3:conversation-id" '
            'participantName="agent" participantRole="assistant"/>'
            '</Connect></Response>'
        )
        self.assertEqual(
            0, accepted.returncode, accepted.stdout + accepted.stderr
        )
        boolean_join = self.run_validator(
            '<Response><Connect><AIAssistant join="true"/>'
            '</Connect></Response>'
        )
        self.assertEqual(1, boolean_join.returncode)
        self.assertIn("existing AI Assistant conversation ID", boolean_join.stdout)
        missing_join = self.run_validator(
            '<Response><Connect><AIAssistant participantName="agent"/>'
            '</Connect></Response>'
        )
        self.assertEqual(1, missing_join.returncode)

    def test_dial_beep_profile_is_scoped_and_enumerated(self) -> None:
        for noun in ("Number", "Sip"):
            with self.subTest(noun=noun):
                value = "+12025550123" if noun == "Number" else "sip:user@example.com"
                accepted = self.run_validator(
                    f'<Response><Dial><{noun} machineDetectionBeepProfile="both">'
                    f'{value}</{noun}></Dial></Response>'
                )
                self.assertEqual(
                    0, accepted.returncode, accepted.stdout + accepted.stderr
                )
                rejected = self.run_validator(
                    f'<Response><Dial><{noun} machineDetectionBeepProfile="invalid">'
                    f'{value}</{noun}></Dial></Response>'
                )
                self.assertEqual(1, rejected.returncode)

    def test_top_level_message_remains_blocked(self) -> None:
        result = self.run_validator(
            '<Response><Message to="+12025550123">hello</Message></Response>'
        )
        self.assertEqual(1, result.returncode, result.stdout + result.stderr)
        self.assertIn(
            "<Message> — Valid only inside <MessageHistory> directly under <AIGather>",
            result.stdout,
        )

    def test_message_history_at_document_root_is_blocked(self) -> None:
        result = self.run_validator(
            '<Response><MessageHistory><Message role="user">Hello</Message>'
            "</MessageHistory></Response>"
        )
        self.assertEqual(1, result.returncode, result.stdout + result.stderr)
        self.assertIn(
            "<MessageHistory> — Valid only as a direct child of <AIGather>",
            result.stdout,
        )

    def test_message_history_under_gather_is_blocked(self) -> None:
        result = self.run_validator(
            '<Response><Gather><MessageHistory><Message role="user">Hello</Message>'
            "</MessageHistory></Gather></Response>"
        )
        self.assertEqual(1, result.returncode, result.stdout + result.stderr)
        self.assertIn(
            "<MessageHistory> — Valid only as a direct child of <AIGather>",
            result.stdout,
        )

    def test_message_directly_under_aigather_is_blocked(self) -> None:
        result = self.run_validator(
            '<Response><AIGather><Message role="user">Hello</Message>'
            "</AIGather></Response>"
        )
        self.assertEqual(1, result.returncode, result.stdout + result.stderr)
        self.assertIn(
            "<Message> — Valid only inside <MessageHistory> directly under <AIGather>",
            result.stdout,
        )

    def test_current_aigather_children_are_accepted(self) -> None:
        result = self.run_validator(
            """<Response>
  <AIGather action="/after-ai-gather">
    <Greeting>Please tell me your age.</Greeting>
    <Parameters><![CDATA[{"type":"object"}]]></Parameters>
    <Voice name="Telnyx.NaturalHD.Astra"/>
    <MessageHistory><Message role="user">Hello</Message></MessageHistory>
    <InterruptionSettings enable="true"/>
    <Assistant model="openai/gpt-4"><Tools><Tool><![CDATA[{"type":"hangup"}]]></Tool></Tools></Assistant>
  </AIGather>
</Response>"""
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)

    def test_current_conversation_relay_language_is_accepted(self) -> None:
        result = self.run_validator(
            """<Response><Connect><ConversationRelay url="wss://example.com">
  <Language code="fr"/><Parameter name="tenant" value="demo"/>
</ConversationRelay></Connect></Response>"""
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)

    def test_conference_noun_is_accepted(self) -> None:
        result = self.run_validator(
            '<Response><Dial><Conference>support</Conference></Dial></Response>'
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)

    def test_dial_recording_does_not_claim_a_dual_channel_default(self) -> None:
        result = self.run_validator(
            '<Response><Dial record="record-from-answer"><Number>+12025550123</Number></Dial></Response>'
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertNotIn("defaults to dual-channel", result.stdout)
        self.assertNotIn("No TwiML equivalent", result.stdout)

    def test_dial_answer_on_bridge_is_preserved(self) -> None:
        result = self.run_validator(
            '<Response><Dial answerOnBridge="true"><Number>+12025550123</Number>'
            "</Dial></Response>"
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertNotIn("answerOnBridge", result.stdout)

    def test_all_documented_integer_attributes_reject_non_integer_values(
        self,
    ) -> None:
        cases = (
            ("Play", "loop"),
            ("Gather", "numDigits"),
            ("Gather", "speechTimeout"),
            ("Dial", "machineDetectionSpeechThreshold"),
            ("Dial", "machineDetectionSpeechEndThreshold"),
            ("Dial", "machineDetectionSilenceTimeout"),
            ("Record", "timeout"),
        )
        for tag, attribute in cases:
            with self.subTest(tag=tag, attribute=attribute):
                if tag == "Dial":
                    document = (
                        f'<Response><Dial {attribute}="abc">'
                        "<Number>+12025550123</Number></Dial></Response>"
                    )
                else:
                    document = f'<Response><{tag} {attribute}="abc"/></Response>'
                result = self.run_validator(document)
                self.assertEqual(1, result.returncode, result.stdout + result.stderr)
                self.assertIn("expected an integer", result.stdout)

    def test_started_services_require_contextual_attributes(self) -> None:
        cases = (
            ("<Start><Stream/></Start>", "requires a non-empty url attribute"),
            ("<Connect><Stream/></Connect>", "requires a non-empty url attribute"),
            ("<Start><Siprec/></Start>", "requires a non-empty connectorName attribute"),
        )
        for fragment, expected in cases:
            with self.subTest(fragment=fragment):
                result = self.run_validator(f"<Response>{fragment}</Response>")
                self.assertEqual(1, result.returncode, result.stdout + result.stderr)
                self.assertIn(expected, result.stdout)

    def test_conversation_relay_requires_a_websocket_url(self) -> None:
        for fragment in (
            "<Connect><ConversationRelay/></Connect>",
            '<Connect><ConversationRelay url="https://example.com"/></Connect>',
            '<Connect><ConversationRelay url="wss://"/></Connect>',
            '<Connect><ConversationRelay url="wss:///path"/></Connect>',
            '<Start><Stream url="https://example.com"/></Start>',
            '<Connect><Stream url="http://example.com"/></Connect>',
            '<Start><Stream url="wss://"/></Start>',
            '<Connect><Stream url="wss:///path"/></Connect>',
            '<Start><Stream url="wss://user@"/></Start>',
            '<Connect><ConversationRelay url="wss://:443"/></Connect>',
            '<Connect><ConversationRelay url="wss://example.com:bad"/></Connect>',
        ):
            with self.subTest(fragment=fragment):
                result = self.run_validator(f"<Response>{fragment}</Response>")
                self.assertEqual(1, result.returncode, result.stdout + result.stderr)
        accepted = self.run_validator(
            '<Response><Connect><ConversationRelay url="wss://example.com"/>'
            "</Connect></Response>"
        )
        self.assertEqual(0, accepted.returncode, accepted.stdout + accepted.stderr)
        uppercase_scheme = self.run_validator(
            '<Response><Start><Stream url="WSS://example.com"/></Start></Response>'
        )
        self.assertEqual(
            0,
            uppercase_scheme.returncode,
            uppercase_scheme.stdout + uppercase_scheme.stderr,
        )

    def test_static_dtmf_attributes_reject_unsupported_characters(self) -> None:
        cases = (
            '<Play digits="X"/>',
            '<Record finishOnKey="garbage"/>',
            '<Gather finishOnKey="X"/>',
            '<Gather validDigits="ABC"/>',
            '<Dial><Number sendDigits="XYZ">+12025550123</Number></Dial>',
        )
        for fragment in cases:
            with self.subTest(fragment=fragment):
                result = self.run_validator(f"<Response>{fragment}</Response>")
                self.assertEqual(1, result.returncode, result.stdout + result.stderr)
                self.assertIn("unsupported DTMF characters", result.stdout)

        accepted = self.run_validator(
            '<Response><Play digits="ww12#*"/><Gather finishOnKey="" '
            'validDigits="123#*"/><Record finishOnKey="#"/>'
            '<Dial><Number sendDigits="ww123#*">+12025550123</Number>'
            '</Dial></Response>'
        )
        self.assertEqual(0, accepted.returncode, accepted.stdout + accepted.stderr)

    def test_ai_assistant_requires_exactly_one_selector(self) -> None:
        for fragment in (
            "<AIAssistant/>",
            '<AIAssistant id="assistant-1" join="conversation-1"/>',
        ):
            with self.subTest(fragment=fragment):
                result = self.run_validator(
                    f"<Response><Connect>{fragment}</Connect></Response>"
                )
                self.assertEqual(1, result.returncode, result.stdout + result.stderr)
                self.assertIn("requires exactly one non-empty id or join", result.stdout)

    def test_suppression_size_is_a_closed_enumeration(self) -> None:
        result = self.run_validator(
            '<Response><Start><Suppression noiseSuppressionEngine="AiCoustics" '
            'family="sparrow" size="garbage"/></Start></Response>'
        )
        self.assertEqual(1, result.returncode, result.stdout + result.stderr)
        self.assertIn("expected one of: l, s, vf", result.stdout)

    def test_reject_must_be_the_first_response_verb(self) -> None:
        result = self.run_validator(
            '<Response><Say>Hello</Say><Reject reason="busy"/></Response>'
        )
        self.assertEqual(1, result.returncode, result.stdout + result.stderr)
        self.assertIn("must be the first verb", result.stdout)

    def test_terminal_verbs_must_be_the_last_response_verb(self) -> None:
        for fragment in (
            '<Reject reason="busy"/><Say>unreachable</Say>',
            '<Redirect>/next</Redirect><Say>unreachable</Say>',
        ):
            with self.subTest(fragment=fragment):
                result = self.run_validator(f"<Response>{fragment}</Response>")
                self.assertEqual(1, result.returncode, result.stdout + result.stderr)
                self.assertIn("is terminal and must be the last verb", result.stdout)

    def test_connect_requires_exactly_one_supported_service(self) -> None:
        cases = (
            "<Connect/>",
            (
                '<Connect><Stream url="wss://one.example"/>'
                '<ConversationRelay url="wss://two.example"/></Connect>'
            ),
        )
        for fragment in cases:
            with self.subTest(fragment=fragment):
                result = self.run_validator(f"<Response>{fragment}</Response>")
                self.assertEqual(1, result.returncode, result.stdout + result.stderr)
                self.assertIn("requires exactly one direct", result.stdout)

    def test_twilio_transcription_attributes_require_texml_names(self) -> None:
        cases = {
            "statusCallbackUrl": "transcriptionCallback",
            "languageCode": "language",
            "partialResults": "interimResults",
        }
        for attribute, replacement in cases.items():
            with self.subTest(attribute=attribute):
                result = self.run_validator(
                    f'<Response><Start><Transcription {attribute}="fixture"/>'
                    "</Start></Response>"
                )
                self.assertEqual(1, result.returncode, result.stdout + result.stderr)
                self.assertIn(
                    f"<Transcription> attribute '{attribute}'", result.stdout
                )
                self.assertIn(f"Use: {replacement}", result.stdout)

    def test_connect_is_not_mislabeled_as_telnyx_only(self) -> None:
        result = self.run_validator(
            '<Response><Connect><Stream url="wss://example.com"/></Connect></Response>'
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertNotIn("<Connect> is Telnyx-only", result.stdout)

    def test_structural_analysis_requires_completion_sentinel(self) -> None:
        with tempfile.TemporaryDirectory(prefix="texml-parser-sentinel-") as tmp:
            root = Path(tmp)
            tools = root / "tools"
            tools.mkdir()
            fake_python = tools / "python3"
            fake_python.write_text(
                "#!/bin/sh\nprintf 'USED\\tResponse\\n'\n",
                encoding="utf-8",
            )
            fake_python.chmod(
                fake_python.stat().st_mode | stat.S_IXUSR
            )

            result = self.run_validator(
                "<Response><Say>Hello</Say></Response>",
                env={
                    "PATH": f"{tools}{os.pathsep}{os.environ.get('PATH', '')}",
                },
            )

            self.assertEqual(2, result.returncode, result.stdout + result.stderr)
            self.assertIn(
                "structural analysis did not complete",
                result.stdout,
            )
            self.assertIn("refusing to pass", result.stdout)


class MigrationGuidanceContracts(unittest.TestCase):
    def test_video_guidance_omits_account_wide_recording_delete(self) -> None:
        guide = (
            ROOT
            / "skills/telnyx-twilio-migration/references/video-migration.md"
        ).read_text(encoding="utf-8")
        self.assertNotIn(
            'curl -X DELETE "https://api.telnyx.com/v2/room_recordings"',
            guide,
        )
        self.assertIn(
            '--data-urlencode "filter[room_id]=$ROOM_ID"',
            guide,
        )

    def test_destructive_guidance_requires_target_bound_approval(self) -> None:
        references = ROOT / "skills" / "telnyx-twilio-migration" / "references"
        video = (references / "video-migration.md").read_text(encoding="utf-8")
        webrtc = (references / "webrtc-migration.md").read_text(encoding="utf-8")
        account = (references / "account-setup-guide.md").read_text(
            encoding="utf-8"
        )
        iot = (references / "iot-migration.md").read_text(encoding="utf-8")
        numbers = (references / "numbers-migration.md").read_text(encoding="utf-8")

        configuring = numbers.split("## Configuring Numbers", 1)[1].split(
            "### Configuration Mapping", 1
        )[0]
        self.assertIn("CURRENT_CONNECTION_ID", configuring)
        self.assertIn("CURRENT_PROFILE_ID", configuring)
        self.assertIn("TELNYX_APPROVE_NUMBER_ASSIGNMENT", configuring)
        self.assertIn(
            '--data-urlencode "filter[phone_number]=$REQUESTED_NUMBER"',
            configuring,
        )
        self.assertLess(
            configuring.index("TELNYX_APPROVE_NUMBER_ASSIGNMENT"),
            configuring.index("curl -fsS -X PATCH"),
        )
        self.assertLess(
            configuring.index('os.environ.get("TELNYX_APPROVE_NUMBER_ASSIGNMENT")'),
            configuring.index("client.phone_numbers.update"),
        )
        self.assertEqual(3, configuring.count("curl -fsS -X PATCH"))
        self.assertIn("/v2/connections/$NEW_CONNECTION_ID", configuring)
        self.assertIn("/v2/messaging_profiles/$NEW_PROFILE_ID", configuring)
        self.assertIn("CURRENT_CONNECTION_JSON", configuring)
        self.assertIn("voice rollback failed", configuring)
        self.assertIn("FINAL_NUMBER=$(curl -fsS", configuring)
        self.assertIn("FINAL_MESSAGING=$(curl -fsS", configuring)
        self.assertIn(".data.connection_id == $id", configuring)
        self.assertIn(".data.messaging_profile_id == $id", configuring)

        for document in (numbers, account):
            assignment = document.split("ASSIGNMENT_APPROVAL=", 1)[1]
            self.assertLess(
                document.index("/v2/connections/$NEW_CONNECTION_ID"),
                document.index("ASSIGNMENT_APPROVAL="),
            )
            self.assertIn("CURRENT_CONNECTION_JSON", assignment)
            self.assertIn("Messaging assignment failed", assignment)
            self.assertIn("CRITICAL: voice rollback failed", assignment)

        self.assertNotIn(
            "POST https://api.telnyx.com/v2/sim_card_orders", iot
        )
        self.assertIn("ambiguous timeout", iot)
        self.assertIn("fresh approval", iot)

        kick = video.split("### Kick Participants", 1)[1].split(
            "### List Participants", 1
        )[0]
        self.assertNotIn('"participants": "all"', kick)
        self.assertIn('$SESSION_ID|$PARTICIPANT_ID', kick)
        self.assertLess(kick.index("TELNYX_APPROVE_ROOM_KICK"), kick.index("curl -fsS"))

        attachment = webrtc.split("attach_push_credential()", 1)[1].split("```", 1)[0]
        self.assertIn('test -n "$CONNECTION_ID" -a -n "$new_id"', attachment)
        self.assertIn("current_id=$(curl -fsS", attachment)
        self.assertIn("$CONNECTION_ID|$field|$current_id|$new_id", attachment)
        self.assertLess(
            attachment.index("TELNYX_APPROVE_PUSH_CREDENTIAL_REPLACEMENT"),
            attachment.index("curl -fsS -X PATCH"),
        )

        assignment = account.split("### Number Assignment", 1)[1].split(
            "### Verify Profile", 1
        )[0]
        self.assertIn("CURRENT_CONNECTION_ID", assignment)
        self.assertIn("CURRENT_PROFILE_ID", assignment)
        self.assertIn("$CURRENT_CONNECTION_ID->$NEW_CONNECTION_ID", assignment)
        self.assertIn("$CURRENT_PROFILE_ID->$NEW_PROFILE_ID", assignment)
        self.assertLess(
            assignment.index("TELNYX_APPROVE_NUMBER_ASSIGNMENT"),
            assignment.index("curl -fsS -X PATCH"),
        )
        self.assertEqual(3, assignment.count("curl -fsS -X PATCH"), assignment)
        self.assertIn("if ! curl -fsS -X PATCH", assignment)
        self.assertIn("CURRENT_CONNECTION_JSON", assignment)
        self.assertIn("CRITICAL: voice rollback failed", assignment)
        self.assertIn("FINAL_NUMBER=$(curl -fsS", assignment)
        self.assertIn("FINAL_MESSAGING=$(curl -fsS", assignment)
        self.assertIn(".data.connection_id == $id", assignment)
        self.assertIn(".data.messaging_profile_id == $id", assignment)

        voice = (references / "voice-migration.md").read_text(encoding="utf-8")
        self.assertIn('"github.com/team-telnyx/telnyx-go/v4"', voice)
        self.assertIn('"github.com/team-telnyx/telnyx-go/v4/option"', voice)
        self.assertNotIn('"github.com/team-telnyx/telnyx-go"', voice)

        fax_assignment = account.split("# Resolve the exact owned sender", 1)[1].split(
            "The owned-number response", 1
        )[0]
        self.assertIn("CURRENT_FAX_CONNECTION_ID", fax_assignment)
        self.assertIn("$CURRENT_FAX_CONNECTION_ID->$NEW_FAX_APPLICATION_ID", fax_assignment)
        self.assertIn("TELNYX_APPROVE_FAX_REROUTE", fax_assignment)
        self.assertLess(
            fax_assignment.index("TELNYX_APPROVE_FAX_REROUTE"),
            fax_assignment.index("curl -fsS -X PATCH"),
        )

        recordings = video.split("### Delete Recordings", 1)[1].split(
            "**Recording comparison:**", 1
        )[0]
        self.assertIn("RECORDING_IDS", recordings)
        self.assertIn(".meta.total_pages == 1", recordings)
        self.assertIn("RECORDING_RECOVERY_PLAN", recordings)
        self.assertIn("TELNYX_APPROVE_RECORDING_DELETE", recordings)
        self.assertIn("$ROOM_ID|delete-recordings|", recordings)
        self.assertNotIn("curl -G -X DELETE", recordings)
        self.assertLess(
            recordings.index("TELNYX_APPROVE_RECORDING_DELETE"),
            recordings.index("curl -fsS -X DELETE"),
        )

        for heading, action in (
            ("### Mute Participants", "mute|all"),
            ("### Unmute Participants", "unmute|all"),
        ):
            section = video.split(heading, 1)[1].split("###", 1)[0]
            self.assertIn(action, section)
            self.assertIn("TELNYX_APPROVE_ROOM_MUTATION", section)
            self.assertLess(
                section.index("TELNYX_APPROVE_ROOM_MUTATION"),
                section.index("curl -fsS -X POST"),
            )

        end_session = video.split("# End a session", 1)[1].split("```", 1)[0]
        self.assertIn("$SESSION_ID|end|all-participants", end_session)
        self.assertIn("TELNYX_APPROVE_ROOM_MUTATION", end_session)
        self.assertLess(
            end_session.index("TELNYX_APPROVE_ROOM_MUTATION"),
            end_session.index("curl -fsS -X POST"),
        )

        supervisor = webrtc.split("// Telnyx: establish a supervisor leg", 1)[1].split(
            "```", 1
        )[0]
        self.assertIn("TELNYX_CURRENT_VOICE_PRICE_USD_PER_MINUTE", supervisor)
        self.assertIn("TELNYX_APPROVED_SUPERVISOR_MAX_USD", supervisor)
        self.assertIn("TELNYX_APPROVE_SUPERVISOR_DIAL", supervisor)
        self.assertIn("maxDurationSeconds", supervisor)
        self.assertIn("time_limit_secs: maxDurationSeconds", supervisor)
        self.assertLess(
            supervisor.index("TELNYX_APPROVE_SUPERVISOR_DIAL"),
            supervisor.index("client.calls.dial"),
        )
        self.assertIn("client.calls.actions.hangup", supervisor)

        for heading in ("### Mute Participants", "### Unmute Participants"):
            section = video.split(heading, 1)[1].split("###", 1)[0]
            self.assertIn("curl -fsS -X POST", section)
            self.assertIn("|| exit 1", section)

    def test_voice_webhook_and_supervisor_examples_are_complete(self) -> None:
        references = ROOT / "skills" / "telnyx-twilio-migration" / "references"
        voice = (references / "voice-migration.md").read_text(encoding="utf-8")
        webrtc = (references / "webrtc-migration.md").read_text(encoding="utf-8")

        self.assertIn("age < -5*time.Minute", voice)
        self.assertIn("telnyx_headers = {", voice)
        self.assertIn("'telnyx-signature-ed25519'", voice)
        self.assertNotIn("signature = request.env", voice)
        self.assertIn("supervise_call_control_id", webrtc)
        self.assertIn("supervisor_role: 'monitor'", webrtc)
        self.assertIn(
            "import { TelnyxRTC, SwEvent, TELNYX_WARNING_CODES }",
            webrtc,
        )
        self.assertIn("app.get('/api/voice-identities/:identity'", webrtc)
        self.assertIn(
            "fetch('/api/voice-identities/agent_jane')",
            webrtc,
        )
        browser_section = webrtc.split(
            "**Telnyx (A) browser-originated", 1
        )[1].split("**Telnyx (B) PSTN-originated", 1)[0]
        self.assertNotIn("sipUriFor(", browser_section)
        self.assertLess(
            webrtc.index("supervise_call_control_id"),
            webrtc.index("switchSupervisorRole"),
        )
        self.assertIn(
            "const supervisorCallId = supervisor.data.call_control_id;",
            webrtc,
        )
        supervisor_example = webrtc.split(
            "const supervisor = await client.calls.dial", 1
        )[1].split("```", 1)[0]
        self.assertLess(
            supervisor_example.index("const supervisorCallId ="),
            supervisor_example.index("switchSupervisorRole"),
        )
        pstn_section = webrtc.split(
            "**Telnyx (B) PSTN-originated", 1
        )[1].split("**Key mapping:**", 1)[0]
        self.assertIn("verify_telnyx_form_webhook", pstn_section)
        self.assertIn("verifyTelnyxFormWebhook", pstn_section)
        self.assertIn("telnyx-signature-ed25519", pstn_section)
        self.assertIn("telnyx-timestamp", pstn_section)
        self.assertIn("function escapeXmlText", pstn_section)
        self.assertLess(
            pstn_section.index("verify_telnyx_form_webhook(raw_body"),
            pstn_section.index("sip_uri_for"),
        )
        self.assertLess(
            pstn_section.index("verifyTelnyxFormWebhook(req.rawBody"),
            pstn_section.index("sipUriFor"),
        )

    def test_inbound_sms_reply_examples_authenticate_before_side_effects(self) -> None:
        messaging_guide = (
            ROOT
            / "skills"
            / "telnyx-twilio-migration"
            / "references"
            / "messaging-migration.md"
        ).read_text(encoding="utf-8")
        code_blocks = re.findall(
            r"```(?:python|javascript)\n(.*?)```", messaging_guide, re.DOTALL
        )
        reply_examples = [
            block
            for block in code_blocks
            if "client.messages.send" in block
            and ("def sms():" in block or "app.post('/sms'" in block)
        ]
        survey_example = next(
            block
            for block in code_blocks
            if "def survey():" in block and "client.messages.send" in block
        )

        self.assertEqual(2, len(reply_examples))
        for example in (*reply_examples, survey_example):
            with self.subTest(first_line=example.splitlines()[0]):
                self.assertIn("webhooks.unwrap", example)
                self.assertLess(
                    example.index("webhooks.unwrap"),
                    example.index("client.messages.send"),
                )
                self.assertIn("TELNYX_PUBLIC_KEY", example)
                self.assertRegex(example, r"(?:abort\(403\)|status\(403\))")
                self.assertIn("message.received", example)
                self.assertLess(
                    example.index("message.received"),
                    example.index("client.messages.send"),
                )
            self.assertIn("40300", example)
            self.assertIn("completed", example)

        python_examples = [
            example for example in (*reply_examples, survey_example) if "def " in example
        ]
        for example in python_examples:
            self.assertIn("request.get_data(as_text=True)", example)
        self.assertLess(
            survey_example.index("message.received"),
            survey_example.index("r.setex"),
        )
        terminal_branch = survey_example.split(
            "if telnyx_error_code(error) == '40300':", 1
        )[1].split("return '', 200", 1)[0]
        self.assertIn("save_survey", terminal_branch)
        self.assertIn("r.setex", terminal_branch)
        self.assertLess(
            terminal_branch.index("r.setex"), terminal_branch.index("completed")
        )
        node_example = next(
            example for example in reply_examples if "app.post('/sms'" in example
        )
        self.assertIn("req.rawBody", node_example)
        self.assertIn("verify: (req, res, buf)", node_example)
        self.assertIn("error?.error?.errors?.[0]?.code", node_example)

    def test_verify_template_creation_fails_before_profile_patch(self) -> None:
        guide = (
            ROOT
            / "skills/telnyx-twilio-migration/references/verify-migration.md"
        ).read_text(encoding="utf-8")
        block = next(
            item
            for item in re.findall(r"```bash\n(.*?)```", guide, re.DOTALL)
            if "/verify_profiles/templates" in item and "TEMPLATE_ID" in item
        )
        self.assertIn("if ! TEMPLATE_ID=$(curl -fsS -X POST", block)
        self.assertIn("exit 1", block.split("CURRENT_SMS=", 1)[0])
        self.assertIn("CURRENT_SMS=$(curl -fsS", block)
        self.assertIn(") || exit 1", block)
        self.assertIn("CURRENT_TEMPLATE_ID", block)
        self.assertIn("TELNYX_APPROVE_VERIFY_TEMPLATE_UPDATE", block)
        self.assertIn("$CURRENT_TEMPLATE_ID->$TEMPLATE_ID", block)
        self.assertLess(
            block.index("TELNYX_APPROVE_VERIFY_TEMPLATE_UPDATE"),
            block.index("curl -fsS -X PATCH"),
        )
        self.assertIn("curl -fsS -X PATCH", block)

    def test_xml_attribute_escaping_matches_the_active_delimiter(self) -> None:
        voice = (
            ROOT
            / "skills/telnyx-twilio-migration/references/voice-migration.md"
        ).read_text(encoding="utf-8")
        self.assertIn("escapeXmlDoubleQuotedAttr", voice)
        self.assertIn("escapeXmlSingleQuotedAttr", voice)
        self.assertIn("replace(/'/g, '&apos;')", voice)
        self.assertIn("active quote delimiter", voice)

    def test_copyable_comparison_mutations_are_gated_before_execution(
        self,
    ) -> None:
        references = (
            ROOT / "skills" / "telnyx-twilio-migration" / "references"
        )
        numbers = (references / "numbers-migration.md").read_text(
            encoding="utf-8"
        )
        voice = (references / "voice-migration.md").read_text(encoding="utf-8")
        contracts = (
            (numbers, "python", "TWILIO_APPROVE_NUMBER_PURCHASE", "client.incoming_phone_numbers.create"),
            (numbers, "python", "TELNYX_APPROVE_NUMBER_ORDER", "client.number_orders.create"),
            (numbers, "javascript", "TWILIO_APPROVE_NUMBER_PURCHASE", "client.incomingPhoneNumbers.create"),
            (numbers, "javascript", "TELNYX_APPROVE_NUMBER_ORDER", "client.numberOrders.create"),
            (numbers, "bash", "TWILIO_APPROVE_NUMBER_PURCHASE", 'curl -fsS -X POST "https://api.twilio.com/2010-04-01/Accounts/$SID/IncomingPhoneNumbers.json"'),
            (numbers, "bash", "TELNYX_APPROVE_NUMBER_ORDER", '"https://api.telnyx.com/v2/number_orders"'),
            (numbers, "python", "TWILIO_CONFIRM_RELEASE_NUMBER", "client.incoming_phone_numbers(twilio_number_sid).delete"),
            (numbers, "python", "TELNYX_CONFIRM_RELEASE_NUMBER", "client.phone_numbers.delete"),
            (numbers, "bash", "TWILIO_CONFIRM_RELEASE_NUMBER", "IncomingPhoneNumbers/$TWILIO_NUMBER_SID.json"),
            (numbers, "bash", "TELNYX_CONFIRM_RELEASE_NUMBER", 'curl -fsS -X DELETE "https://api.telnyx.com/v2/phone_numbers/$NUMBER_ID"'),
            (voice, "bash", "TWILIO_APPROVE_OUTBOUND_CALL", "Accounts/$TWILIO_SID/Calls.json"),
            (voice, "bash", "TELNYX_APPROVE_TEXML_CALL", "Accounts/$TELNYX_ACCOUNT_SID/Calls"),
        )
        for document, language, gate, mutation in contracts:
            blocks = re.findall(
                rf"```{language}\n(.*?)```", document, re.DOTALL
            )
            matches = [block for block in blocks if mutation in block]
            with self.subTest(language=language, mutation=mutation):
                self.assertEqual(1, len(matches))
                self.assertIn(gate, matches[0])
                self.assertLess(matches[0].index(gate), matches[0].index(mutation))

        bash_blocks = [
            block
            for document in (numbers, voice)
            for block in re.findall(r"```bash\n(.*?)```", document, re.DOTALL)
            if any(
                marker in block
                for marker in (
                    'curl -fsS -X POST "https://api.twilio.com/2010-04-01/Accounts/$SID/IncomingPhoneNumbers.json"',
                    'curl -fsS -X DELETE "https://api.twilio.com/2010-04-01/Accounts/$SID/IncomingPhoneNumbers/$TWILIO_NUMBER_SID.json"',
                    'curl -fsS -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_SID/Calls.json"',
                )
            )
        ]
        self.assertEqual(3, len(bash_blocks))
        with tempfile.TemporaryDirectory(prefix="comparison-gates-") as directory:
            root = Path(directory)
            tools = root / "bin"
            tools.mkdir()
            log = root / "curl.log"
            fake_curl = tools / "curl"
            fake_curl.write_text(
                "#!/usr/bin/env bash\n"
                'printf "%s\\n" "$*" >>"$PR318_MUTATION_LOG"\n',
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            for index, block in enumerate(bash_blocks):
                script = root / f"example-{index}.sh"
                script.write_text(block, encoding="utf-8")
                env = os.environ.copy()
                env["PATH"] = f"{tools}{os.pathsep}{env.get('PATH', '')}"
                env["PR318_MUTATION_LOG"] = str(log)
                for name in tuple(env):
                    if "APPROVE" in name or "CONFIRM" in name:
                        env.pop(name)
                for name in (
                    "TWILIO_AUTH_TOKEN",
                    "TWILIO_NUMBER_SID",
                    "TWILIO_SID",
                ):
                    env.pop(name, None)
                result = subprocess.run(
                    [BASH, str(script)],
                    cwd=root,
                    env=env,
                    capture_output=True,
                    text=True,
                    timeout=10,
                    check=False,
                )
                with self.subTest(example=index):
                    self.assertNotEqual(0, result.returncode)
                    self.assertFalse(log.exists() and log.read_text())

    def test_migration_provider_trees_match_canonical(self) -> None:
        canonical = ROOT / "skills" / "telnyx-twilio-migration"
        providers = (
            ROOT
            / "providers"
            / "claude"
            / "plugins"
            / "telnyx-platform"
            / "skills"
            / "telnyx-twilio-migration",
            ROOT
            / "providers"
            / "cursor"
            / "plugin"
            / "skills"
            / "telnyx-twilio-migration",
        )

        def snapshot(root: Path) -> dict[str, tuple[int, bytes]]:
            # Compare SOURCE only. Python writes __pycache__/*.pyc beside any
            # script it imports, and the interpreter stamps those caches with
            # the source path they were compiled from - so the canonical and
            # provider copies of the same script produce DIFFERENT bytes. Since
            # the skill's own docs tell developers to run the linter, anyone
            # who did so before running this suite saw a parity failure that
            # had nothing to do with provider drift. sync-skills.sh never
            # generates these files and they are gitignored, so they are not
            # part of what "the trees match" means.
            return {
                path.relative_to(root).as_posix(): (
                    stat.S_IMODE(path.stat().st_mode),
                    path.read_bytes(),
                )
                for path in root.rglob("*")
                if path.is_file()
                and "__pycache__" not in path.parts
                and path.suffix not in {".pyc", ".pyo"}
            }

        expected = snapshot(canonical)
        for provider in providers:
            with self.subTest(provider=provider):
                self.assertEqual(expected, snapshot(provider))

    def test_texml_call_progress_sequence_number_guidance_is_scoped(self) -> None:
        webhook_migration = (
            ROOT
            / "skills"
            / "telnyx-twilio-migration"
            / "references"
            / "webhook-migration.md"
        ).read_text(encoding="utf-8")

        self.assertIn(
            "Present on TeXML call-progress callbacks; pair with `CallSid`",
            webhook_migration,
        )
        self.assertIn(
            "not a guarantee for every TeXML callback",
            webhook_migration,
        )
        self.assertIn(
            "(`CallSid`, `SequenceNumber`)",
            webhook_migration,
        )

    def test_verify_channel_summaries_include_whatsapp(self) -> None:
        skill_root = ROOT / "skills" / "telnyx-twilio-migration"
        skill = (skill_root / "SKILL.md").read_text(encoding="utf-8")
        product_mapping = (
            skill_root / "references" / "product-mapping.md"
        ).read_text(encoding="utf-8")
        verify_guide = (
            skill_root / "references" / "verify-migration.md"
        ).read_text(encoding="utf-8")

        self.assertIn(
            "POST /v2/verifications/{sms|call|flashcall|whatsapp}",
            skill,
        )
        self.assertNotIn(
            "POST /v2/verifications/{sms|call|flashcall}`",
            skill,
        )
        verify_mapping = next(
            line
            for line in product_mapping.splitlines()
            if "**Twilio Verify**" in line
        )
        self.assertIn("WhatsApp", verify_mapping)
        for channel in ("sms", "call", "flashcall", "whatsapp"):
            self.assertIn(f'"{channel}": {{', verify_guide)
        self.assertIn("TELNYX_APPROVE_VERIFY_PROFILE_UPDATE", verify_guide)
        self.assertIn(
            'WHATSAPP_APPROVAL="$TELNYX_VERIFY_PROFILE_ID|countries:',
            verify_guide,
        )
        create_profile = re.search(
            r'POST https://api\.telnyx\.com/v2/verify_profiles.*?'
            r'-d \'(\{.*?\})\'\n```',
            verify_guide,
            re.DOTALL,
        )
        self.assertIsNotNone(create_profile)
        create_payload = json.loads(create_profile.group(1))
        for channel in ("sms", "call", "flashcall"):
            self.assertEqual(
                ["US"], create_payload[channel]["whitelisted_destinations"]
            )
        flashcall_profile = re.search(
            r'Flash Call Configuration.*?'
            r'POST https://api\.telnyx\.com/v2/verify_profiles.*?'
            r'-d \'(\{.*?\})\'\n```',
            verify_guide,
            re.DOTALL,
        )
        self.assertIsNotNone(flashcall_profile)
        flashcall_payload = json.loads(flashcall_profile.group(1))
        self.assertEqual(
            ["US"],
            flashcall_payload["flashcall"]["whitelisted_destinations"],
        )
        self.assertNotIn("$VERIFY_PROFILE_ID", verify_guide)
        self.assertIn(
            'PATCH "https://api.telnyx.com/v2/verify_profiles/$TELNYX_VERIFY_PROFILE_ID"',
            verify_guide,
        )
        whatsapp_section = verify_guide.split("### WhatsApp Verification", 1)[1].split(
            "### Parameter Mapping", 1
        )[0]
        for field in (
            "whitelisted_destinations",
            "default_verification_timeout_secs",
            "waba_id",
            "sender_phone_number",
            "template_id",
        ):
            self.assertIn(field, whatsapp_section)

    def test_voice_recording_guidance_distinguishes_record_and_dial_defaults(
        self,
    ) -> None:
        voice_migration = (
            ROOT
            / "skills"
            / "telnyx-twilio-migration"
            / "references"
            / "voice-migration.md"
        ).read_text(encoding="utf-8")

        self.assertIn(
            "`<Record>` defaults to dual-channel on Telnyx",
            voice_migration,
        )
        self.assertIn(
            'documents `recordingChannels="single"` and '
            '`recordMaxLength="0"` as the defaults',
            voice_migration,
        )
        self.assertNotIn(
            'set `channels="single"` / `recordingChannels="single"`',
            voice_migration,
        )
        callback_section = voice_migration.split(
            "# Telnyx TeXML callback (form-encoded", 1
        )[1].split("## Migration Checklist", 1)[0]
        self.assertNotIn("client.webhooks.unwrap", callback_section)
        self.assertNotIn("standardwebhooks", callback_section)
        self.assertIn("VerifyKey", callback_section)
        self.assertIn("crypto.verify", callback_section)
        self.assertIn("telnyx-signature-ed25519", callback_section)
        self.assertIn("telnyx-timestamp", callback_section)
        self.assertLess(
            callback_section.index("verify_telnyx_form_webhook(raw_body"),
            callback_section.index("request.form['RecordingSid']"),
        )
        self.assertLess(
            callback_section.index("verifyTelnyxFormWebhook(req.rawBody"),
            callback_section.index("req.body.RecordingSid"),
        )
        self.assertIn("re.fullmatch(r'[A-Za-z0-9_-]+'", callback_section)
        self.assertIn("/^[A-Za-z0-9_-]+$/", callback_section)
        self.assertIn("path.resolve('recordings')", callback_section)

    def test_ruby_webhook_samples_initialize_clients_and_wire_headers(self) -> None:
        webhook_migration = (
            ROOT
            / "skills"
            / "telnyx-twilio-migration"
            / "references"
            / "webhook-migration.md"
        ).read_text(encoding="utf-8")
        self.assertGreaterEqual(
            webhook_migration.count(
                "Telnyx::Client.new(api_key: ENV.fetch('TELNYX_API_KEY'))"
            ),
            2,
        )
        sinatra = webhook_migration.split("### Sinatra (Ruby)", 1)[1].split(
            "### Rails (Ruby on Rails)", 1
        )[0]
        self.assertIn("telnyx_headers = {", sinatra)
        self.assertIn("'telnyx-signature-ed25519'", sinatra)
        self.assertIn("'telnyx-timestamp'", sinatra)

    def test_reply_samples_retry_unfinished_outbound_sends(self) -> None:
        messaging = (
            ROOT
            / "skills"
            / "telnyx-twilio-migration"
            / "references"
            / "messaging-migration.md"
        ).read_text(encoding="utf-8")
        self.assertIn("redis.from_url(os.environ['REDIS_URL'])", messaging)
        self.assertIn("redis_client.delete(event_key)", messaging)
        self.assertIn("redis_client.set(event_key, 'completed'", messaging)
        self.assertIn("return '', 503", messaging)
        self.assertIn("await redis.del(eventKey)", messaging)
        self.assertIn("durable outbox", messaging)
        self.assertIn("claim_survey_event(event['id'])", messaging)
        self.assertIn("r.set(event_key, 'completed'", messaging)
        self.assertIn('with r.lock(f"{key}:lock"', messaging)


class CrossContractConsistency(unittest.TestCase):
    def test_texml_allowlist_covers_every_validated_attribute(self) -> None:
        source = TEXML_VALIDATOR.read_text(encoding="utf-8")
        table = source.split("ALLOWED_ATTRS = {", 1)[1]
        table = table[: table.index("\n}\n")]
        allowed: dict[str, set[str]] = {}
        for match in re.finditer(
            r'"([\w.]+)":\s*frozenset\(\{?([^}]*?)\}?\)', table
        ):
            allowed[match.group(1)] = set(
                re.findall(r'"(\w+)"', match.group(2))
            )
        self.assertTrue(allowed, "could not parse ALLOWED_ATTRS")

        referenced = set(
            re.findall(r'\(\s*"([\w.]+)"\s*,\s*"(\w+)"\s*\)\s*:', source)
        )
        contradictions = sorted(
            f"{tag}.{attribute}"
            for tag, attribute in referenced
            if tag in allowed and attribute not in allowed[tag]
        )
        self.assertEqual([], contradictions, "\n".join(contradictions))

    def test_public_guidance_contains_no_internal_runtime_paths(self) -> None:
        skill_root = ROOT / "skills" / "telnyx-twilio-migration"
        offenders: list[str] = []
        for document in sorted(skill_root.rglob("*.md")):
            if "interpreter/" in document.read_text(encoding="utf-8"):
                offenders.append(str(document.relative_to(ROOT)))
        self.assertEqual([], offenders, "\n".join(offenders))


class RunValidationContracts(unittest.TestCase):
    """Phase-5 orchestrator: what reaches validate-texml.sh and from where."""

    def run_phase5(
        self,
        files: dict[str, str],
        *extra_args: str,
        env_overrides: dict[str, str] | None = None,
        unreadable_files: set[str] | None = None,
    ) -> subprocess.CompletedProcess[str]:
        self._tmp = tempfile.TemporaryDirectory(prefix="run-validation-")
        self.addCleanup(self._tmp.cleanup)
        root = Path(self._tmp.name)
        for relative, contents in files.items():
            path = root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(contents, encoding="utf-8")
            if unreadable_files and relative in unreadable_files:
                path.chmod(0)
        env = {k: v for k, v in os.environ.items() if k != "TELNYX_API_KEY"}
        if env_overrides:
            env.update(env_overrides)
        return subprocess.run(
            [
                BASH,
                str(MIGRATION_SCRIPTS.parent / "run-validation.sh"),
                str(root),
                "--include-texml",
                *extra_args,
            ],
            cwd=ROOT,
            env=env,
            text=True,
            capture_output=True,
            check=False,
        )

    # Valid TeXML kept multi-line: the residual-TwiML grep in
    # validate-migration matches single-line <Response>...<Say only.
    VALID_TEXML = "<Response>\n  <Say>Welcome</Say>\n</Response>\n"

    def run_correctness(
        self,
        files: dict[str, str],
        *extra_args: str,
        env_overrides: dict[str, str] | None = None,
    ) -> subprocess.CompletedProcess[str]:
        self._correctness_tmp = tempfile.TemporaryDirectory(
            prefix="correctness-linter-"
        )
        self.addCleanup(self._correctness_tmp.cleanup)
        root = Path(self._correctness_tmp.name)
        for relative, contents in files.items():
            path = root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(contents, encoding="utf-8")
        env = {k: v for k, v in os.environ.items() if k != "TELNYX_API_KEY"}
        if env_overrides:
            env.update(env_overrides)
        return subprocess.run(
            [BASH, str(CORRECTNESS_LINTER), str(root), *extra_args],
            cwd=root,
            env=env,
            text=True,
            capture_output=True,
            check=False,
        )

    def test_texml_discovery_requires_python(self) -> None:
        with tempfile.TemporaryDirectory(prefix="phase5-no-python-") as tmp:
            tools = Path(tmp) / "bin"
            tools.mkdir()
            for utility in (
                "awk", "basename", "bash", "cat", "dirname", "find", "grep",
                "head", "jq", "mktemp", "rm", "sed", "sort", "tail", "tr", "wc",
            ):
                target = shutil.which(utility)
                if target:
                    os.symlink(target, tools / utility)
            result = self.run_phase5(
                {
                    "src/ivr.xml": self.VALID_TEXML,
                    "src/app.py": "import telnyx\n",
                },
                env_overrides={"PATH": str(tools)},
            )
        self.assertEqual(1, result.returncode, result.stdout + result.stderr)
        self.assertIn(
            "python3 is required for TeXML discovery and validation",
            result.stdout,
        )
        self.assertIn("texml:fail", result.stdout)

    def test_correctness_analysis_requires_python_instead_of_guessing(self) -> None:
        result = self.run_correctness(
            {
                "src/relay.xml": (
                    '<Response><Connect><ConversationRelay '
                    'url="wss://example.com" language="en-US"/></Connect></Response>'
                ),
            },
            env_overrides={"PATH": ""},
        )
        self.assertEqual(2, result.returncode, result.stdout + result.stderr)
        self.assertIn("python3 is required for correctness analysis", result.stderr)

    def test_hybrid_state_is_preserved_in_migration_validation(self) -> None:
        with tempfile.TemporaryDirectory(prefix="phase5-hybrid-state-") as tmp:
            state_file = Path(tmp) / "migration-state.json"
            state_file.write_text(
                '{"kept_on_twilio":{"voice":{"reason":"phased rollout"}}}\n',
                encoding="utf-8",
            )
            result = self.run_phase5(
                {
                    "src/app.py": (
                        "import telnyx\n"
                        "from twilio.twiml.voice_response import VoiceResponse\n"
                        "response = VoiceResponse()\n"
                    ),
                },
                "--state-file",
                str(state_file),
            )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn("migration:pass", result.stdout)

    def test_project_hybrid_state_is_loaded_by_the_prescribed_command(self) -> None:
        result = self.run_phase5(
            {
                "src/app.py": (
                    "import telnyx\n"
                    "from twilio.twiml.voice_response import VoiceResponse\n"
                    "response = VoiceResponse()\n"
                ),
                "migration-state.json": (
                    '{"kept_on_twilio":{"voice":{"reason":"phased rollout"}}}\n'
                ),
            },
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn("migration:pass", result.stdout)

    def test_false_hybrid_state_entry_does_not_waive_phase5_checks(self) -> None:
        with tempfile.TemporaryDirectory(prefix="phase5-false-hybrid-state-") as tmp:
            state_file = Path(tmp) / "migration-state.json"
            state_file.write_text(
                '{"kept_on_twilio":{"voice":false}}\n', encoding="utf-8"
            )
            result = self.run_phase5(
                {
                    "src/app.py": (
                        "from twilio.twiml.voice_response import VoiceResponse\n"
                        "response = VoiceResponse()\n"
                    ),
                },
                "--state-file",
                str(state_file),
            )
        self.assertEqual(1, result.returncode, result.stdout + result.stderr)
        self.assertIn("migration:fail", result.stdout)

    def test_hybrid_state_waives_cross_product_twilio_webhook_checks(self) -> None:
        result = self.run_correctness(
            {
                "src/app.py": (
                    "from twilio.request_validator import RequestValidator\n"
                    "validator = RequestValidator('token')\n"
                ),
                "migration-state.json": (
                    '{"kept_on_twilio":{"voice":{"reason":"phased"}}}\n'
                ),
            },
            "--state-file",
            "migration-state.json",
            "--product",
            "voice",
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn("Twilio webhook middleware/validator remains", result.stdout)

    def test_default_all_scan_loads_state_and_allows_recorded_hybrid_code(self) -> None:
        result = self.run_correctness(
            {
                "src/messaging.py": "from twilio.rest import Client\n",
                "migration-state.json": (
                    '{"kept_on_twilio":{"voice":{"reason":"phased"}}}\n'
                ),
            },
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn("Residual Twilio imports found", result.stdout)

    def test_unsigned_telnyx_webhook_fails_even_when_twilio_was_unsigned(self) -> None:
        files = {
            "src/webhook.js": (
                "app.post('/webhook', (req, res) => {\n"
                "  console.log(req.body.data.payload);\n"
                "  res.sendStatus(200);\n"
                "});\n"
            ),
            "twilio-scan.json": (
                '{"has_webhook_validation":false,"products_used":["messaging"]}\n'
            ),
        }
        lint = self.run_correctness(
            files,
            "--scan-json",
            "twilio-scan.json",
            "--product",
            "messaging",
        )
        self.assertEqual(1, lint.returncode, lint.stdout + lint.stderr)
        self.assertIn("no Ed25519 signature verification", lint.stdout)

        phase5 = self.run_phase5(
            files,
            "--scan-json",
            "twilio-scan.json",
        )
        self.assertEqual(1, phase5.returncode, phase5.stdout + phase5.stderr)
        self.assertIn("NO Ed25519 signature validation", phase5.stdout)

    def test_hybrid_residuals_are_waived_only_outside_migrated_files(self) -> None:
        retained = (
            "const endpoint = 'https://conversations.twilio.com/v1';\n"
            "const validator = new RequestValidator(process.env.TWILIO_AUTH_TOKEN);\n"
        )
        common = {
            "package.json": '{"dependencies":{"telnyx":"^6.0.0"}}\n',
            "src/retained.js": retained,
            "migration-state.json": (
                '{"kept_on_twilio":{"conversations":true},'
                '"migrated_files":{}}\n'
            ),
        }
        passing = self.run_phase5(common)
        self.assertEqual(0, passing.returncode, passing.stdout + passing.stderr)
        self.assertIn("retained hybrid files", passing.stdout)
        lint_passing = self.run_correctness(common)
        self.assertEqual(
            0, lint_passing.returncode, lint_passing.stdout + lint_passing.stderr
        )

        failing = self.run_phase5(
            {
                **common,
                "migration-state.json": (
                    '{"kept_on_twilio":{"conversations":true},'
                    '"migrated_files":{"messaging":["src/retained.js"]}}\n'
                ),
            }
        )
        self.assertEqual(1, failing.returncode, failing.stdout + failing.stderr)
        self.assertIn("inside files recorded as migrated", failing.stdout)
        lint_failing = self.run_correctness(
            {
                **common,
                "migration-state.json": (
                    '{"kept_on_twilio":{"conversations":true},'
                    '"migrated_files":{"messaging":["src/retained.js"]}}\n'
                ),
            }
        )
        self.assertEqual(
            1, lint_failing.returncode, lint_failing.stdout + lint_failing.stderr
        )

    def test_hybrid_migrated_file_scope_accepts_numeric_colons_in_root(self) -> None:
        # Filtered findings can contain `:<digits>:` inside a legal POSIX path.
        # Hybrid scoping must compare the known migrated path, not guess the
        # filename boundary from the formatted finding.
        with tempfile.TemporaryDirectory(prefix="hybrid-colon-") as directory:
            root = Path(directory) / "root:123:part"
            source = root / "src" / "migrated.js"
            source.parent.mkdir(parents=True)
            source.write_text(
                "const twilio = require('twilio');\n",
                encoding="utf-8",
            )
            state = root / "migration-state.json"
            state.write_text(
                json.dumps(
                    {
                        "kept_on_twilio": {"conversations": True},
                        "migrated_files": {"messaging": ["src/migrated.js"]},
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
                ],
                cwd=ROOT,
                capture_output=True,
                text=True,
                check=False,
            )
        self.assertEqual(1, result.returncode, result.stdout + result.stderr)
        self.assertIn("Residual Twilio imports found", result.stdout)

    def test_hybrid_scope_normalizes_absolute_recorded_file_paths(self) -> None:
        with tempfile.TemporaryDirectory(prefix="absolute-migrated-file-") as directory:
            root = Path(directory)
            source = root / "src" / "migrated.js"
            source.parent.mkdir(parents=True)
            source.write_text(
                "const endpoint = 'https://api.twilio.com/2010-04-01';\n",
                encoding="utf-8",
            )
            state = root / "migration-state.json"
            state.write_text(
                json.dumps(
                    {
                        "kept_on_twilio": {"conversations": True},
                        "migrated_files": {"messaging": [str(source)]},
                    }
                ),
                encoding="utf-8",
            )
            result = subprocess.run(
                [
                    BASH,
                    str(MIGRATION_SCRIPTS.parent / "validate-migration.sh"),
                    str(root),
                    "--state-file",
                    str(state),
                ],
                cwd=ROOT,
                capture_output=True,
                text=True,
                check=False,
            )
        self.assertEqual(1, result.returncode, result.stdout + result.stderr)
        self.assertIn("inside files recorded as migrated", result.stdout)

    def test_hybrid_waiver_does_not_apply_to_another_selected_product(self) -> None:
        result = self.run_correctness(
            {
                "src/app.py": "from twilio.rest import Client\n",
                "migration-state.json": (
                    '{"kept_on_twilio":{"voice":{"reason":"phased"}}}\n'
                ),
            },
            "--product",
            "messaging",
            "--state-file",
            "migration-state.json",
        )
        self.assertEqual(1, result.returncode, result.stdout + result.stderr)
        self.assertIn("Residual Twilio imports found", result.stdout)

    def test_hybrid_waiver_does_not_hide_migrated_file_in_twilio_directory(self) -> None:
        result = self.run_correctness(
            {
                "src/twilio_voice/app.py": "from twilio.rest import Client\n",
                "migration-state.json": json.dumps(
                    {
                        "kept_on_twilio": {"voice": {"reason": "phased"}},
                        "migrated_files": {"messaging": ["src/twilio_voice/app.py"]},
                    }
                ),
            },
            "--product",
            "all",
            "--state-file",
            "migration-state.json",
        )
        self.assertEqual(1, result.returncode, result.stdout + result.stderr)
        self.assertIn("Residual Twilio imports found", result.stdout)
        self.assertIn("directory name(s) containing 'twilio'", result.stdout)

        validation = self.run_phase5(
            {
                "src/migrated/app.py": (
                    "from twilio.rest import Client\n"
                    "token = os.environ['TWILIO_AUTH_TOKEN']\n"
                ),
                "migration-state.json": json.dumps(
                    {
                        "kept_on_twilio": {"voice": {"reason": "phased"}},
                        "migrated_files": {"messaging": ["src/migrated"]},
                    }
                ),
            }
        )
        self.assertEqual(
            1, validation.returncode, validation.stdout + validation.stderr
        )
        self.assertIn("inside files recorded as migrated", validation.stdout)

    def test_false_hybrid_state_entry_does_not_waive_checks(self) -> None:
        result = self.run_correctness(
            {
                "src/app.py": (
                    "from twilio.twiml.voice_response import VoiceResponse\n"
                    "response = VoiceResponse()\n"
                ),
                "migration-state.json": '{"kept_on_twilio":{"voice":false}}\n',
            },
            "--product",
            "voice",
            "--state-file",
            "migration-state.json",
        )
        self.assertEqual(1, result.returncode, result.stdout + result.stderr)
        self.assertIn("Residual Twilio imports found", result.stdout)

    def test_hybrid_state_waives_twilio_directory_names(self) -> None:
        result = self.run_correctness(
            {
                "src/twilio_voice/.keep": "",
                "migration-state.json": (
                    '{"kept_on_twilio":{"voice":{"reason":"phased"}}}\n'
                ),
            },
            "--state-file",
            "migration-state.json",
            "--product",
            "voice",
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn("Twilio-named directory", result.stdout)

    def test_prefixed_response_root_reaches_the_texml_validator(self) -> None:
        result = self.run_phase5(
            {
                "src/ivr.xml": (
                    '<t:Response xmlns:t="urn:texml">\n'
                    "  <t:Say>Welcome</t:Say>\n"
                    "</t:Response>\n"
                ),
                "src/app.py": "import telnyx\n",
            }
        )
        self.assertEqual(1, result.returncode, result.stdout + result.stderr)
        self.assertIn("texml:fail", result.stdout)
        self.assertNotIn("texml:skip", result.stdout)

    def test_internal_doctype_entity_is_not_mistaken_for_the_root(self) -> None:
        result = self.run_phase5(
            {
                "src/ivr.texml": (
                    '<!DOCTYPE Response [<!ENTITY b "<Foo>">]>\n'
                    "<Response>\n  <Say>Welcome</Say>\n</Response>\n"
                ),
                "src/app.py": "import telnyx\n",
            }
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn("texml:pass", result.stdout)

    def test_texml_step_ignores_generated_output_and_non_texml_xml(self) -> None:
        """A migrated project must not be blocked by dist/ junk or pom.xml.

        The collector fed EVERY *.xml outside node_modules/.git to
        validate-texml.sh: a stale bundle under dist/ failed the run after
        step 5.1 had excluded that same directory (one run contradicting
        itself), and a Maven pom.xml was validated as TeXML and blocked a
        fully migrated Java project.
        """
        result = self.run_phase5(
            {
                "src/ivr.xml": self.VALID_TEXML,
                "pom.xml": (
                    '<project xmlns="http://maven.apache.org/POM/4.0.0">'
                    "<modelVersion>4.0.0</modelVersion>"
                    "<!-- <Response><Say>not TeXML</Say></Response> -->"
                    "<plugin><Start/><Pay/></plugin></project>"
                ),
                "dist/leftover.xml": "<Response><Garbage/></Response>",
                "src/app.py": "import telnyx\n",
            }
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn("texml:pass", result.stdout)

    def test_texml_root_after_a_large_preamble_is_still_validated(self) -> None:
        # A TeXML file with a big comment/license preamble before <Response>
        # was skipped by the 4 KiB probe, so run-validation reported no TeXML
        # and an invalid file passed. The root detection must not truncate.
        preamble = "<!--\n" + ("x" * 6000) + "\n-->\n"
        result = self.run_phase5(
            {
                # Invalid TeXML (Garbage) hidden behind a large preamble.
                "src/ivr.xml": preamble + "<Response>\n  <Garbage/>\n</Response>\n",
                "src/app.py": "import telnyx\n",
            }
        )
        self.assertEqual(1, result.returncode, result.stdout + result.stderr)
        self.assertIn("texml:fail", result.stdout)

    def test_texml_step_still_fails_on_broken_source_texml(self) -> None:
        # The filter must not become a bypass: genuine TeXML in source that
        # is invalid still fails the phase.
        result = self.run_phase5(
            {
                "src/ivr.xml": "<Response>\n  <Garbage/>\n</Response>\n",
                "src/app.py": "import telnyx\n",
            }
        )
        self.assertEqual(1, result.returncode, result.stdout + result.stderr)
        self.assertIn("texml:fail", result.stdout)

    def test_malformed_texml_shaped_xml_is_not_skipped(self) -> None:
        for contents in (
            "<Respones><Say>hello</Respones>",
            "<Respnse><Play>https://example.com/audio.mp3",
            "<Respnse><Record>",
            "<Respnse><Start><Stream/></Respnse>",
            "<Respnse><Connect>",
            "<Respnse><Pay>",
            "<Response><Say>unterminated",
        ):
            with self.subTest(contents=contents):
                result = self.run_phase5(
                    {
                        "src/ivr.xml": contents,
                        "src/app.py": "import telnyx\n",
                    }
                )
                self.assertEqual(
                    1, result.returncode, result.stdout + result.stderr
                )
                self.assertIn("texml:fail", result.stdout)
                self.assertNotIn("texml:skip", result.stdout)

    def test_unreadable_xml_fails_closed_during_discovery(self) -> None:
        result = self.run_phase5(
            {
                "src/ivr.xml": self.VALID_TEXML,
                "src/app.py": "import telnyx\n",
            },
            unreadable_files={"src/ivr.xml"},
        )
        self.assertEqual(1, result.returncode, result.stdout + result.stderr)
        self.assertIn("could not read or inspect XML", result.stdout)
        self.assertIn("texml:fail", result.stdout)

    def test_language_speech_model_and_polly_contracts_match_linter(self) -> None:
        valid = self.run_correctness(
            {
                "src/relay.xml": (
                    '<Response><Connect><ConversationRelay url="wss://example.com">'
                    '<Language code="en" speechModel="openai/whisper-large-v3"/>'
                    '</ConversationRelay></Connect>'
                    '<Say voice="Polly.Amy">Hello</Say></Response>'
                )
            },
            "--product",
            "voice",
        )
        self.assertEqual(0, valid.returncode, valid.stdout + valid.stderr)
        self.assertNotIn("may fall back", valid.stdout)
        self.assertNotIn("Prefer Neural", valid.stdout)

        invalid = self.run_correctness(
            {
                "src/ivr.xml": (
                    '<Response><Gather speechModel="phone_call">'
                    '<Say>Press one</Say></Gather></Response>'
                )
            },
            "--product",
            "voice",
        )
        self.assertEqual(1, invalid.returncode, invalid.stdout + invalid.stderr)
        self.assertIn("<Gather> speechModel", invalid.stdout)

        generated = self.run_correctness(
            {"src/ivr.js": 'const gather = { speechModel: "phone_call" };\n'},
            "--product",
            "voice",
        )
        self.assertEqual(1, generated.returncode, generated.stdout + generated.stderr)
        self.assertIn("non-XML speechModel", generated.stdout)

    def test_texml_discovery_includes_twiml_and_texml_suffixes(self) -> None:
        # TeXML is also stored as .twiml / .texml, not only .xml. The
        # discovery find only emitted *.xml, so an invalid .twiml was reported
        # texml:skip and Phase 5 could still pass.
        for suffix in ("twiml", "texml"):
            with self.subTest(suffix=suffix):
                result = self.run_phase5(
                    {
                        f"src/ivr.{suffix}": "<Respones><Say>hello</Say></Respones>",
                        "src/app.py": "import telnyx\n",
                    }
                )
                self.assertEqual(
                    1, result.returncode, result.stdout + result.stderr
                )
                self.assertIn("texml:fail", result.stdout)


if __name__ == "__main__":
    unittest.main()
