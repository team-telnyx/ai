"""Object-valued tool arguments survive framework validation and HTTP encoding."""

import json
from typing import Any

import httpx
import pytest
import respx
from pydantic import ValidationError

from telnyx_agent_toolkit.openai.toolkit import OpenAIToolkit
from telnyx_agent_toolkit.shared.api_client import TelnyxAPIClient
from telnyx_agent_toolkit.shared.constants import TOOL_DEFINITIONS
from telnyx_agent_toolkit.shared.schema import build_pydantic_args_schema
from telnyx_agent_toolkit.shared.toolkit_core import ToolkitCore

CASES = [
    (
        "update_mission_run",
        "result_payload",
        {"mission_id": "mission", "run_id": "run"},
        {"nested": {"count": 2}, "list": [True, None, "ok"]},
    ),
    (
        "log_mission_event",
        "payload",
        {
            "mission_id": "mission",
            "run_id": "run",
            "type": "status_change",
            "summary": "Done",
        },
        {"nested": {"count": 2}, "list": [True, None, "ok"]},
    ),
    (
        "create_insight",
        "json_schema",
        {"name": "Outcome", "instructions": "Extract outcome"},
        {"type": "object", "properties": {"outcome": {"type": "string"}}},
    ),
    (
        "schedule_call",
        "dynamic_variables",
        {
            "assistant_id": "assistant",
            "to": "+15555550100",
            "from_": "+15555550101",
            "scheduled_at_fixed_datetime": "2030-01-01T00:00:00Z",
        },
        {"customer": "Ada", "reference": "123"},
    ),
]


@pytest.mark.parametrize("name,field,args,value", CASES)
async def test_objects_survive_adapters_and_http(
    name: str, field: str, args: dict[str, Any], value: dict[str, Any]
) -> None:
    definition = TOOL_DEFINITIONS[name]
    assert definition["parameters"]["properties"][field]["type"] == "object"
    inputs = {**args, field: value}
    # LangChain and CrewAI use this real shared Pydantic argument builder.
    schema = build_pydantic_args_schema(definition)
    assert schema.model_validate(inputs).model_dump(exclude_unset=True) == inputs
    for invalid in (json.dumps(value), [value], None):
        with pytest.raises(ValidationError):
            schema.model_validate({**inputs, field: invalid})
    schema.model_validate(args)  # These fields are optional; omission remains valid.

    client = TelnyxAPIClient("test-key", base_url="https://toolkit.invalid/v2")
    adapter = OpenAIToolkit(ToolkitCore(client=client), [definition])
    function = adapter.get_tools()[0]["function"]
    assert function["parameters"]["properties"][field]["type"] == "object"
    assert function.get("strict") is not True
    path = definition["path"].format(**args)
    expected_body = {
        key: val
        for key, val in inputs.items()
        if "{" + key + "}" not in definition["path"]
    }
    if "from_" in expected_body:
        expected_body["from"] = expected_body.pop("from_")
    try:
        with respx.mock(assert_all_called=True) as router:
            route = router.request(
                definition["method"], f"https://toolkit.invalid/v2{path}"
            ).mock(return_value=httpx.Response(200, json={"data": {"id": "accepted"}}))
            result = await adapter.execute_async(
                {"function": {"name": name, "arguments": json.dumps(inputs)}}
            )
            assert json.loads(result) == {"data": {"id": "accepted"}}
            assert route.call_count == 1
            body = json.loads(route.calls[0].request.content)
            assert body == expected_body
            assert body[field] == value
    finally:
        await client.close()
