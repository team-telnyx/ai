"""Tests for generic JSON Schema to Pydantic conversion."""

import pytest
from pydantic import ValidationError

from telnyx_agent_toolkit.shared.constants import ToolDefinition
from telnyx_agent_toolkit.shared.schema import build_pydantic_args_schema


def test_optional_field_omission_is_distinct_from_explicit_null() -> None:
    tool_def: ToolDefinition = {
        "name": "schema_fidelity",
        "description": "Exercise optional and nullable field semantics.",
        "parameters": {
            "type": "object",
            "properties": {
                "typed_optional": {"type": "integer"},
                "nullable_optional": {"type": ["integer", "null"]},
            },
        },
        "method": "POST",
        "path": "/schema-fidelity",
        "category": "test",
    }
    schema_cls = build_pydantic_args_schema(tool_def)

    omitted = schema_cls()
    assert omitted.model_fields_set == set()
    assert omitted.model_dump()["typed_optional"] is None

    with pytest.raises(ValidationError):
        schema_cls(typed_optional=None)

    assert schema_cls(nullable_optional=None).model_dump()["nullable_optional"] is None


def test_typed_any_of_fields_reject_null_and_accept_valid_alternatives() -> None:
    tool_def: ToolDefinition = {
        "name": "schema_any_of",
        "description": "Exercise typed anyOf alternatives.",
        "parameters": {
            "type": "object",
            "properties": {
                "alpha": {"type": "string"},
                "beta": {"type": "integer"},
            },
            "anyOf": [
                {"required": ["alpha"]},
                {"required": ["beta"]},
            ],
        },
        "method": "POST",
        "path": "/schema-any-of",
        "category": "test",
    }
    schema_cls = build_pydantic_args_schema(tool_def)

    with pytest.raises(ValidationError, match="anyOf"):
        schema_cls()
    with pytest.raises(ValidationError):
        schema_cls(alpha=None)
    with pytest.raises(ValidationError):
        schema_cls(beta=None)

    assert schema_cls(alpha="value").model_dump()["alpha"] == "value"
    assert schema_cls(beta=7).model_dump()["beta"] == 7
