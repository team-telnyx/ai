"""Integration tests against real Telnyx API.

Read-only tests only — no destructive operations.
Skips if TELNYX_API_KEY is not set.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys

# Add the package to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from telnyx_agent_toolkit.configuration import TelnyxAgentToolkit
from telnyx_agent_toolkit.shared.api_client import TelnyxAPIClient, TelnyxAPIError

API_KEY = os.environ.get("TELNYX_API_KEY", "")


def header(text: str) -> None:
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}")


def result(name: str, passed: bool, detail: str = "") -> None:
    icon = "✅" if passed else "❌"
    print(f"  {icon} {name}" + (f" — {detail}" if detail else ""))


def run() -> None:
    if not API_KEY:
        print("⚠️  TELNYX_API_KEY not set, skipping integration tests")
        return

    toolkit = TelnyxAgentToolkit(api_key=API_KEY)
    core = toolkit._core
    passed = 0
    failed = 0
    skipped = 0

    # ─── 1. Account Balance ──────────────────────────────────────
    header("1. get_balance")
    try:
        res = json.loads(core.run_tool("get_balance", {}))
        if "data" in res:
            bal = res["data"]
            result("get_balance", True, f"balance={bal.get('balance', '?')} {bal.get('currency', '?')}")
            passed += 1
        elif "error" in res:
            result("get_balance", False, res["error"])
            failed += 1
        else:
            result("get_balance", False, f"unexpected response: {json.dumps(res)[:200]}")
            failed += 1
    except Exception as e:
        result("get_balance", False, str(e))
        failed += 1

    # ─── 2. List Phone Numbers ───────────────────────────────────
    header("2. list_phone_numbers")
    try:
        res = json.loads(core.run_tool("list_phone_numbers", {"page_size": 5}))
        if "data" in res:
            nums = res["data"]
            result("list_phone_numbers", True, f"returned {len(nums)} numbers")
            if nums:
                first = nums[0]
                result("  first number", True, f"{first.get('phone_number', '?')} (status: {first.get('status', '?')})")
            passed += 1
        elif "error" in res:
            result("list_phone_numbers", False, res["error"])
            failed += 1
        else:
            result("list_phone_numbers", False, f"unexpected: {json.dumps(res)[:200]}")
            failed += 1
    except Exception as e:
        result("list_phone_numbers", False, str(e))
        failed += 1

    # ─── 3. Search Available Numbers ─────────────────────────────
    header("3. search_phone_numbers")
    try:
        res = json.loads(core.run_tool("search_phone_numbers", {
            "filter_country_code": "US",
            "filter_phone_number_type": "local",
            "limit": 3,
        }))
        if "data" in res:
            avail = res["data"]
            result("search_phone_numbers", True, f"found {len(avail)} available numbers")
            for n in avail[:3]:
                pn = n.get("phone_number", "?")
                loc = n.get("region_information", [{}])
                city = loc[0].get("region_name", "?") if loc else "?"
                print(f"      {pn} ({city})")
            passed += 1
        elif "error" in res:
            result("search_phone_numbers", False, res["error"])
            failed += 1
        else:
            result("search_phone_numbers", False, f"unexpected: {json.dumps(res)[:200]}")
            failed += 1
    except Exception as e:
        result("search_phone_numbers", False, str(e))
        failed += 1

    # ─── 4. List Messaging Profiles ──────────────────────────────
    header("4. list_messaging_profiles")
    try:
        res = json.loads(core.run_tool("list_messaging_profiles", {"page_size": 5}))
        if "data" in res:
            profiles = res["data"]
            result("list_messaging_profiles", True, f"returned {len(profiles)} profiles")
            for p in profiles[:3]:
                print(f"      {p.get('name', '?')} (id: {p.get('id', '?')[:20]}...)")
            passed += 1
        elif "error" in res:
            result("list_messaging_profiles", False, res["error"])
            failed += 1
        else:
            result("list_messaging_profiles", False, f"unexpected: {json.dumps(res)[:200]}")
            failed += 1
    except Exception as e:
        result("list_messaging_profiles", False, str(e))
        failed += 1

    # ─── 5. List Connections ─────────────────────────────────────
    header("5. list_connections")
    try:
        res = json.loads(core.run_tool("list_connections", {"page_size": 5}))
        if "data" in res:
            conns = res["data"]
            result("list_connections", True, f"returned {len(conns)} connections")
            for c in conns[:3]:
                print(f"      {c.get('connection_name', c.get('name', '?'))} (id: {str(c.get('id', '?'))[:20]}...)")
            passed += 1
        elif "error" in res:
            result("list_connections", False, res["error"])
            failed += 1
        else:
            result("list_connections", False, f"unexpected: {json.dumps(res)[:200]}")
            failed += 1
    except Exception as e:
        result("list_connections", False, str(e))
        failed += 1

    # ─── 6. List AI Assistants ───────────────────────────────────
    header("6. list_ai_assistants")
    try:
        res = json.loads(core.run_tool("list_ai_assistants", {}))
        if "data" in res:
            assistants = res["data"]
            result("list_ai_assistants", True, f"returned {len(assistants)} assistants")
            for a in assistants[:3]:
                print(f"      {a.get('name', '?')}")
            passed += 1
        elif "error" in res:
            # Might not be enabled on all accounts
            if "not found" in res["error"].lower() or "404" in res["error"]:
                result("list_ai_assistants", True, "endpoint not available on this account (expected)")
                skipped += 1
            else:
                result("list_ai_assistants", False, res["error"])
                failed += 1
        else:
            result("list_ai_assistants", False, f"unexpected: {json.dumps(res)[:200]}")
            failed += 1
    except Exception as e:
        result("list_ai_assistants", False, str(e))
        failed += 1

    # ─── 7. Number Lookup ────────────────────────────────────────
    header("7. lookup_number")
    try:
        res = json.loads(core.run_tool("lookup_number", {
            "phone_number": "+18005551234",
            "type": "carrier",
        }))
        if "data" in res:
            data = res["data"]
            carrier = data.get("carrier", {})
            result("lookup_number", True, f"carrier={carrier.get('name', '?')}, type={carrier.get('type', '?')}")
            passed += 1
        elif "error" in res:
            # Lookup may require paid add-on
            if "402" in res["error"] or "payment" in res["error"].lower() or "not enabled" in res["error"].lower():
                result("lookup_number", True, "requires paid lookup feature (expected)")
                skipped += 1
            else:
                result("lookup_number", False, res["error"])
                failed += 1
        else:
            result("lookup_number", False, f"unexpected: {json.dumps(res)[:200]}")
            failed += 1
    except Exception as e:
        result("lookup_number", False, str(e))
        failed += 1

    # ─── 8. List SIM Cards ───────────────────────────────────────
    header("8. list_sim_cards")
    try:
        res = json.loads(core.run_tool("list_sim_cards", {"page_size": 5}))
        if "data" in res:
            sims = res["data"]
            result("list_sim_cards", True, f"returned {len(sims)} SIM cards")
            passed += 1
        elif "error" in res:
            result("list_sim_cards", False, res["error"])
            failed += 1
        else:
            result("list_sim_cards", False, f"unexpected: {json.dumps(res)[:200]}")
            failed += 1
    except Exception as e:
        result("list_sim_cards", False, str(e))
        failed += 1

    # ─── 9. OpenAI Toolkit Schema ────────────────────────────────
    header("9. OpenAI toolkit schema generation")
    try:
        tools = toolkit.get_openai_tools()
        result("get_openai_tools", True, f"generated {len(tools)} tool schemas")
        for t in tools[:5]:
            fn = t.get("function", {})
            print(f"      {fn.get('name', '?')}: {fn.get('description', '?')[:60]}...")
        passed += 1
    except Exception as e:
        result("get_openai_tools", False, str(e))
        failed += 1

    # ─── 10. LangChain Toolkit ───────────────────────────────────
    header("10. LangChain toolkit generation")
    try:
        lc_tools = toolkit.get_langchain_tools()
        result("get_langchain_tools", True, f"generated {len(lc_tools)} LangChain tools")
        for t in lc_tools[:5]:
            print(f"      {t.name}: {t.description[:60]}...")
        passed += 1
    except ImportError:
        result("get_langchain_tools", True, "langchain not installed (skipped)")
        skipped += 1
    except Exception as e:
        result("get_langchain_tools", False, str(e))
        failed += 1

    # ─── 11. CrewAI Toolkit ──────────────────────────────────────
    header("11. CrewAI toolkit generation")
    try:
        crew_tools = toolkit.get_crewai_tools()
        result("get_crewai_tools", True, f"generated {len(crew_tools)} CrewAI tools")
        for t in crew_tools[:5]:
            print(f"      {t.name}: {t.description[:60]}...")
        passed += 1
    except ImportError:
        result("get_crewai_tools", True, "crewai not installed (skipped)")
        skipped += 1
    except Exception as e:
        result("get_crewai_tools", False, str(e))
        failed += 1

    # ─── 12. Permission filtering ────────────────────────────────
    header("12. Permission-based filtering")
    try:
        restricted = TelnyxAgentToolkit(
            api_key=API_KEY,
            configuration={
                "actions": {
                    "messaging": {"send_sms": True},
                    "numbers": {"list_phone_numbers": True},
                }
            }
        )
        oai_tools = restricted.get_openai_tools()
        tool_names = [t["function"]["name"] for t in oai_tools]
        assert "send_sms" in tool_names, f"send_sms missing from {tool_names}"
        assert "list_phone_numbers" in tool_names, f"list_phone_numbers missing from {tool_names}"
        assert "get_balance" not in tool_names, f"get_balance should be filtered out but got {tool_names}"
        assert "make_call" not in tool_names, f"make_call should be filtered out but got {tool_names}"
        result("permission filtering", True, f"correctly filtered to {len(oai_tools)} tools: {tool_names}")
        passed += 1
    except Exception as e:
        result("permission filtering", False, str(e))
        failed += 1

    # ─── Summary ─────────────────────────────────────────────────
    header("SUMMARY")
    total = passed + failed + skipped
    print(f"  ✅ Passed:  {passed}")
    print(f"  ❌ Failed:  {failed}")
    print(f"  ⏭️  Skipped: {skipped}")
    print(f"  📊 Total:   {total}")
    print()

    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    run()
