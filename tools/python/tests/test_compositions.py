"""Read-only compositions through the same public core used by adapters."""

import asyncio
import json

import pytest

from telnyx_agent_toolkit.shared.api_client import TelnyxAPIClient
from telnyx_agent_toolkit.shared.toolkit_core import ToolkitCore


class LookupClient(TelnyxAPIClient):
    def __init__(self):
        super().__init__("test-key")
        self.calls = []
        self.active = 0
        self.peak = 0

    async def get_async(self, path, *, params=None):
        self.calls.append((path, params))
        self.active += 1
        self.peak = max(self.peak, self.active)
        try:
            await asyncio.sleep(0.001)
            if path.endswith("0002"):
                raise RuntimeError("lookup unavailable")
            return {"data": {"phone_number": path.rsplit("/", 1)[-1]}}
        finally:
            self.active -= 1


@pytest.mark.asyncio
async def test_bulk_lookup_order_duplicates_partial_failure_and_concurrency():
    client = LookupClient()
    core = ToolkitCore(client)
    numbers = ["+15550000001", "+15550000002", "+15550000001", "+15550000003"]
    args = {"phone_numbers": numbers, "concurrency": 2, "type": "carrier"}
    result = json.loads(await core.run_tool_async("bulk_lookup_numbers", args))
    assert "error" not in result, result
    assert [r["phone_number"] for r in result["results"]] == numbers
    assert result["results"][0]["response"] == {"data": {"phone_number": numbers[0]}}
    assert result["results"][1]["error"] == "lookup unavailable"
    assert result["results"][2] == result["results"][0]
    assert result["succeeded"] == 3 and result["failed"] == 1
    assert len(client.calls) == 4 and client.peak == 2
    assert all(params == {"type": "carrier"} for _, params in client.calls)
    assert args == {"phone_numbers": numbers, "concurrency": 2, "type": "carrier"}


@pytest.mark.parametrize(
    "args",
    [
        {},
        {"phone_numbers": []},
        {"phone_numbers": ["+15550000001"] * 101},
        {"phone_numbers": "123"},
        {"phone_numbers": ["../balance"]},
        {"phone_numbers": ["+15550000001", "bad"]},
        *[
            {"phone_numbers": ["+15550000001"], "concurrency": n}
            for n in [0, 11, True, 1.5, "2", None]
        ],
        {"phone_numbers": ["+15550000001"], "type": "invalid"},
        {"phone_numbers": ["+15550000001"], "unexpected": True},
    ],
)
@pytest.mark.asyncio
async def test_bulk_invalid_input_has_zero_requests(args):
    client = LookupClient()
    result = json.loads(
        await ToolkitCore(client).run_tool_async("bulk_lookup_numbers", args)
    )
    assert "Invalid bulk_lookup_numbers" in result.get("error", ""), result
    assert client.calls == []


@pytest.mark.asyncio
async def test_bulk_snapshots_validated_input_before_awaiting():
    numbers = ["+15550000001", "+15550000003"]

    class MutatingClient(LookupClient):
        async def get_async(self, path, *, params=None):
            if not self.calls:
                numbers.append("../balance")
            return await super().get_async(path, params=params)

    client = MutatingClient()
    result = json.loads(
        await ToolkitCore(client).run_tool_async(
            "bulk_lookup_numbers", {"phone_numbers": numbers, "concurrency": 1}
        )
    )
    assert "error" not in result, result
    assert len(client.calls) == 2
    assert result["succeeded"] == 2


class CloneClient(TelnyxAPIClient):
    def __init__(self, pages):
        super().__init__("test-key")
        self.pages = pages
        self.calls = []

    async def get_async(self, path, *, params=None):
        self.calls.append((path, params))
        page = self.pages[len(self.calls) - 1]
        if isinstance(page, Exception):
            raise page
        return page


@pytest.mark.asyncio
async def test_clone_searches_later_page_without_id_filter():
    wanted = {"id": "clone-2", "name": "untouched", "status": "active"}
    client = CloneClient(
        [
            {"data": [{"id": "clone-1"}], "meta": {"page_number": 1, "total_pages": 2}},
            {"data": [wanted], "meta": {"page_number": 2, "total_pages": 2}},
        ]
    )
    args = {"id": "clone-2", "page_size": 1, "max_pages": 2}
    result = json.loads(
        await ToolkitCore(client).run_tool_async("get_voice_clone", args)
    )
    assert result == {"data": wanted}
    assert client.calls == [
        ("/voice_clones", {"page[number]": n, "page[size]": 1}) for n in (1, 2)
    ]
    assert args == {"id": "clone-2", "page_size": 1, "max_pages": 2}


@pytest.mark.parametrize(
    "pages,args,expected",
    [
        ([{"data": [], "meta": {"page_number": 1, "total_pages": 0}}], {}, "not_found"),
        (
            [{"data": [{"id": "other"}], "meta": {"page_number": 1, "total_pages": 1}}],
            {},
            "not_found",
        ),
        (
            [{"data": [{"id": "other"}], "meta": {"page_number": 1, "total_pages": 2}}],
            {"max_pages": 1},
            "incomplete",
        ),
        ([{"data": []}], {}, "pagination"),
        (
            [{"data": "bad", "meta": {"page_number": 1, "total_pages": 1}}],
            {},
            "response",
        ),
        (
            [{"data": [{}], "meta": {"page_number": 1, "total_pages": 1}}],
            {},
            "response",
        ),
        (
            [{"data": [], "meta": {"page_number": 2, "total_pages": 2}}],
            {},
            "pagination",
        ),
        ([RuntimeError("rate limited")], {}, "rate limited"),
    ],
)
@pytest.mark.asyncio
async def test_clone_exhaustion_limit_malformed_and_transport_errors(
    pages, args, expected
):
    result = json.loads(
        await ToolkitCore(CloneClient(pages)).run_tool_async(
            "get_voice_clone", {"id": "wanted", **args}
        )
    )
    if expected in ("not_found", "incomplete"):
        assert result["status"] == expected
        assert result["data"] is None
    else:
        assert expected in result.get("error", ""), result


@pytest.mark.parametrize(
    "args",
    [
        {},
        {"id": ""},
        {"id": 1},
        {"id": "x", "filter_id": "x"},
        *[{"id": "x", "page_size": n} for n in [0, 251, True, 1.5, None]],
        *[{"id": "x", "max_pages": n} for n in [0, 101, True, 1.5, None]],
    ],
)
@pytest.mark.asyncio
async def test_clone_invalid_input_has_zero_requests(args):
    client = CloneClient([])
    result = json.loads(
        await ToolkitCore(client).run_tool_async("get_voice_clone", args)
    )
    assert "Invalid get_voice_clone" in result.get("error", ""), result
    assert client.calls == []


@pytest.mark.asyncio
async def test_actions_openai_and_real_http_client_use_only_declared_gets():
    import respx

    from telnyx_agent_toolkit import TelnyxAgentToolkit
    from telnyx_agent_toolkit.shared.constants import TOOL_DEFINITIONS

    toolkit = TelnyxAgentToolkit(
        "test-key",
        configuration={
            "actions": {
                "lookup": {"bulk_lookup_numbers": True},
                "voice": {"get_voice_clone": True},
                "messaging": {"list_messages": True},
            }
        },
        friction_enabled=False,
    )
    assert {t["name"] for t in toolkit.enabled_tools} == {
        "bulk_lookup_numbers",
        "get_voice_clone",
    }
    definitions = toolkit.get_openai_tools()
    assert {t["function"]["name"] for t in definitions} == {
        "bulk_lookup_numbers",
        "get_voice_clone",
    }
    executor = toolkit.get_openai_tool_executor()
    with respx.mock(assert_all_called=True) as router:
        lookup = router.get(
            "https://api.telnyx.com/v2/number_lookup/+15550000001"
        ).respond(200, json={"data": {"valid_number": True}})
        clone = router.get("https://api.telnyx.com/v2/voice_clones").respond(
            200,
            json={
                "data": [{"id": "wanted"}],
                "meta": {"page_number": 1, "total_pages": 1},
            },
        )
        bulk = json.loads(
            await executor.execute_async(
                {
                    "function": {
                        "name": "bulk_lookup_numbers",
                        "arguments": json.dumps({"phone_numbers": ["+15550000001"]}),
                    }
                }
            )
        )
        found = json.loads(
            await executor.execute_async(
                {
                    "function": {
                        "name": "get_voice_clone",
                        "arguments": json.dumps({"id": "wanted"}),
                    }
                }
            )
        )
        assert bulk["results"][0]["response"] == {"data": {"valid_number": True}}
        assert found == {"data": {"id": "wanted"}}
        assert dict(lookup.calls.last.request.url.params) == {}
        assert dict(clone.calls.last.request.url.params) == {
            "page[number]": "1",
            "page[size]": "100",
        }
    await toolkit.api_client.close()
    for name, dependency in [
        ("bulk_lookup_numbers", "lookup_number"),
        ("get_voice_clone", "list_voice_clones"),
    ]:
        composed, atomic = TOOL_DEFINITIONS[name], TOOL_DEFINITIONS[dependency]
        assert composed["execution"] == name
        assert (composed["method"], composed["path"]) == (
            atomic["method"],
            atomic["path"],
        )


@pytest.mark.parametrize("adapter", ["langchain", "crewai"])
@pytest.mark.parametrize(
    "name,args",
    [
        ("bulk_lookup_numbers", {"phone_numbers": ["+15550000001"]}),
        ("get_voice_clone", {"id": "wanted"}),
    ],
)
def test_python_framework_schemas_expose_compositions(adapter, name, args):
    import importlib

    from telnyx_agent_toolkit.shared.constants import TOOL_DEFINITIONS

    module = importlib.import_module(f"telnyx_agent_toolkit.{adapter}.toolkit")
    schema = module._build_args_schema(TOOL_DEFINITIONS[name])
    parsed = schema(**args).model_dump(exclude_unset=True)
    assert parsed == args
