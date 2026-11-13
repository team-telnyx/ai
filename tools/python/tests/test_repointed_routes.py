"""Re-pointed tool definitions (AI-3951) and the `query_mode: "flat"` executor
path they rely on."""

import json
from unittest.mock import Mock

import httpx
import pytest
import respx

from telnyx_agent_toolkit.shared.api_client import TelnyxAPIClient
from telnyx_agent_toolkit.shared.constants import TOOL_DEFINITIONS
from telnyx_agent_toolkit.shared.toolkit_core import ToolkitCore

# Tools removed in AI-3951: no REST route exists (tracked for re-add in AI-3974).
REMOVED_TOOLS = ["list_messages", "update_e911_address", "update_mission_step"]

# name -> (method, path) per the OpenAPI spec
REPOINTED = {
    "list_10dlc_brands": ("GET", "/10dlc/brand"),
    "create_10dlc_brand": ("POST", "/10dlc/brand"),
    "get_10dlc_brand": ("GET", "/10dlc/brand/{brand_id}"),
    "list_10dlc_campaigns": ("GET", "/10dlc/campaign"),
    "get_10dlc_campaign": ("GET", "/10dlc/campaign/{campaign_id}"),
    "assign_10dlc_campaign": ("POST", "/10dlc/phone_number_campaigns"),
    "list_verify_profiles": ("GET", "/verify_profiles"),
    "create_verify_profile": ("POST", "/verify_profiles"),
    "get_verify_profile": ("GET", "/verify_profiles/{verify_profile_id}"),
    "list_e911_addresses": ("GET", "/dynamic_emergency_addresses"),
    "create_e911_address": ("POST", "/dynamic_emergency_addresses"),
    "delete_e911_address": ("DELETE", "/dynamic_emergency_addresses/{id}"),
    "list_portout_orders": ("GET", "/portouts"),
    "get_portout_order": ("GET", "/portouts/{id}"),
    "list_portout_comments": ("GET", "/portouts/{id}/comments"),
    "create_portout_comment": ("POST", "/portouts/{id}/comments"),
    "list_portout_documents": ("GET", "/portouts/{id}/supporting_documents"),
    "upload_portout_document": ("POST", "/portouts/{id}/supporting_documents"),
    "list_portout_rejection_codes": ("GET", "/portouts/rejections/{portout_id}"),
    "list_network_interfaces": ("GET", "/networks/{network_id}/network_interfaces"),
    "list_voice_clones": ("GET", "/voice_clones"),
    "create_voice_clone": ("POST", "/voice_clones"),
    "list_voice_designs": ("GET", "/voice_designs"),
    "create_voice_design": ("POST", "/voice_designs"),
    "get_voice_design": ("GET", "/voice_designs/{id}"),
    "list_toll_free_verifications": ("GET", "/messaging_tollfree/verification/requests"),
    "create_toll_free_verification": ("POST", "/messaging_tollfree/verification/requests"),
    "text_to_speech": ("POST", "/text-to-speech/speech"),
    "list_detail_records": ("GET", "/detail_records"),
    "get_whatsapp_template": ("GET", "/whatsapp/message_templates/{id}"),
}


@pytest.fixture
def core() -> ToolkitCore:
    return ToolkitCore(client=TelnyxAPIClient(api_key="test-key"))


def test_removed_tools_are_gone() -> None:
    assert [n for n in REMOVED_TOOLS if n in TOOL_DEFINITIONS] == []


@pytest.mark.parametrize("name,expected", REPOINTED.items())
def test_repointed_tool_targets_real_route(name: str, expected: tuple[str, str]) -> None:
    tool = TOOL_DEFINITIONS[name]
    assert (tool["method"], tool["path"]) == expected
    # every path placeholder must be a declared, required parameter
    import re
    for placeholder in re.findall(r"\{([a-z_]+)\}", tool["path"]):
        assert placeholder in tool["parameters"]["properties"], (name, placeholder)
        assert placeholder in tool["parameters"]["required"], (name, placeholder)


def test_flat_query_mode_only_where_the_api_is_not_jsonapi() -> None:
    flat = {n for n, t in TOOL_DEFINITIONS.items() if t.get("query_mode") == "flat"}
    assert flat == {"list_10dlc_brands", "list_10dlc_campaigns", "list_toll_free_verifications"}


class TestFlatQueryMode:
    @respx.mock
    @pytest.mark.asyncio
    async def test_flat_sends_literal_query_keys(self, core: ToolkitCore) -> None:
        route = respx.get("https://api.telnyx.com/v2/messaging_tollfree/verification/requests").mock(
            return_value=httpx.Response(200, json={"records": [], "total_records": 0})
        )
        await core.run_tool_async("list_toll_free_verifications", {"page": 1, "page_size": 5, "status": "Verified"})
        q = dict(route.calls.last.request.url.params)
        assert q == {"page": "1", "page_size": "5", "status": "Verified"}, q

    @respx.mock
    @pytest.mark.asyncio
    async def test_default_mode_still_rewrites_page_and_filter(self, core: ToolkitCore) -> None:
        route = respx.get("https://api.telnyx.com/v2/voice_clones").mock(
            return_value=httpx.Response(200, json={"data": []})
        )
        await core.run_tool_async("list_voice_clones", {"page_size": 5, "filter_name": "x"})
        q = dict(route.calls.last.request.url.params)
        assert q == {"page[size]": "5", "filter[name]": "x"}, q

    @respx.mock
    @pytest.mark.asyncio
    async def test_10dlc_campaign_list_sends_brand_id_flat(self, core: ToolkitCore) -> None:
        route = respx.get("https://api.telnyx.com/v2/10dlc/campaign").mock(
            return_value=httpx.Response(200, json={"records": []})
        )
        await core.run_tool_async("list_10dlc_campaigns", {"brandId": "b1", "recordsPerPage": 2})
        q = dict(route.calls.last.request.url.params)
        assert q == {"brandId": "b1", "recordsPerPage": "2"}, q

    @respx.mock
    @pytest.mark.asyncio
    async def test_path_placeholders_use_snake_case_props(self, core: ToolkitCore) -> None:
        route = respx.get("https://api.telnyx.com/v2/networks/net-1/network_interfaces").mock(
            return_value=httpx.Response(200, json={"data": []})
        )
        result = await core.run_tool_async("list_network_interfaces", {"network_id": "net-1", "page_size": 1})
        assert route.called
        assert "network_id" not in dict(route.calls.last.request.url.params)
        assert json.loads(result) == {"data": []}


@respx.mock
@pytest.mark.asyncio
async def test_sim_usage_scopes_the_requested_sim(core: ToolkitCore) -> None:
    # AI-4013: wireless-manager's validator reads filter.sim_card_id, not a
    # top-level sim_card_id (6063c227, NetworkDailyDataUsageIndexValidator).
    tool = TOOL_DEFINITIONS["get_sim_card_data_usage"]
    assert "filter_sim_card_id" in tool["parameters"]["required"]
    assert "sim_card_id" not in tool["parameters"]["properties"]
    route = respx.get("https://api.telnyx.com/v2/network_daily_data_usage").mock(
        return_value=httpx.Response(200, json={"data": []})
    )
    await core.run_tool_async("get_sim_card_data_usage", {"filter_sim_card_id": "sim-1"})
    assert dict(route.calls.last.request.url.params) == {"filter[sim_card_id]": "sim-1"}


@respx.mock
@pytest.mark.asyncio
async def test_mdr_report_filters_are_arrays(core: ToolkitCore) -> None:
    # AI-4013: MdrPostDetailReportRequest at tdamonorepo 574700f9 uses
    # EnumSet<Direction> and EnumSet<RecordType>, not scalar strings.
    props = TOOL_DEFINITIONS["create_usage_report"]["parameters"]["properties"]
    for name in ("directions", "record_types"):
        assert props[name]["type"] == "array"
        assert props[name]["items"]["type"] == "string"
        assert "enum" not in props[name]
    route = respx.post("https://api.telnyx.com/v2/reports/batch_mdr_reports").mock(
        return_value=httpx.Response(200, json={"data": {"id": "report-1"}})
    )
    args = {"start_date": "2026-11-01T00:00:00Z", "end_date": "2026-11-02T00:00:00Z",
            "directions": ["inbound", "outbound"], "record_types": ["completed"]}
    await core.run_tool_async("create_usage_report", args)
    assert json.loads(route.calls.last.request.content) == args


def test_text_to_speech_cannot_request_binary_audio() -> None:
    """The API defaults to binary audio and the toolkit parses JSON, so a tool
    call must always send output_type=base64_output (Codex review on #591)."""
    tool = TOOL_DEFINITIONS["text_to_speech"]
    out = tool["parameters"]["properties"]["output_type"]
    assert "output_type" in tool["parameters"]["required"]
    assert out["enum"] == ["base64_output"]
    assert "enum" not in tool["parameters"]["properties"]["provider"]  # provider list is open-ended


# AI-4013: messaging-monorepo 35a466e6, public/verifications.py:68-97,
# 161-165 and schemas/verifications.py:34-51. The legacy route ignores body type.
def test_verify_schema_preserves_optional_sms_default() -> None:
    tool = TOOL_DEFINITIONS["verify_phone"]
    assert tool["method"] == "POST"
    assert tool["path"] == "/verifications/{type}"
    assert tool["parameters"]["required"] == ["phone_number", "verify_profile_id"]
    assert set(tool["parameters"]["properties"]) == {
        "phone_number", "verify_profile_id", "type", "timeout_secs"
    }
    channel = tool["parameters"]["properties"]["type"]
    assert channel["type"] == "string"
    assert channel["enum"] == ["sms", "call", "whatsapp"]
    assert channel["default"] == "sms"


@respx.mock
@pytest.mark.asyncio
@pytest.mark.parametrize("channel", ["sms", "call", "whatsapp", None])
async def test_verify_channel_dispatch_and_actual_body(channel: str | None) -> None:
    body = {"phone_number": "+15555550123", "verify_profile_id": "profile-1", "timeout_secs": 120}
    args = dict(body)
    if channel is not None:
        args["type"] = channel
    original = dict(args)
    route = respx.post(f"https://api.telnyx.com/v2/verifications/{channel or 'sms'}").mock(
        return_value=httpx.Response(200, json={"data": {"id": "verification-1"}})
    )
    core = ToolkitCore(TelnyxAPIClient(api_key="test-key"))
    result = json.loads(await core.run_tool_async("verify_phone", args))
    assert result == {"data": {"id": "verification-1"}}
    assert route.call_count == 1
    request = route.calls.last.request
    assert request.method == "POST"
    assert not request.url.query
    assert json.loads(request.content) == body
    assert args == original


@respx.mock
@pytest.mark.asyncio
@pytest.mark.parametrize("channel", ["flashcall", "email", "SMS", "", "../sms", "sms?x=1", None, 1, False, [], {}])
async def test_invalid_verify_channel_has_zero_http(channel: object) -> None:
    # Catch any transport attempt, including an accidental legacy SMS fallback.
    route = respx.route().mock(return_value=httpx.Response(200, json={"data": {}}))
    telemetry, friction = Mock(), Mock()
    core = ToolkitCore(TelnyxAPIClient(api_key="test-key"), telemetry=telemetry, friction=friction)
    result = json.loads(await core.run_tool_async("verify_phone", {
        "phone_number": "+15555550123", "verify_profile_id": "profile-1", "type": channel,
    }))
    assert "error" in result
    assert "type must be one of: sms, call, whatsapp" in result["error"]
    assert route.call_count == 0
    telemetry.report.assert_not_called()
    friction.report.assert_not_called()
