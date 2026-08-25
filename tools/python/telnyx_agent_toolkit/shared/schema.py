"""Generic JSON Schema conversion helpers for framework adapters."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Literal, cast

from pydantic import BaseModel, Field, create_model, model_validator
from pydantic.fields import FieldInfo

from telnyx_agent_toolkit.shared.constants import ToolDefinition

_JSON_TYPE_MAP: dict[str, Any] = {
    "string": str,
    "integer": int,
    "number": float,
    "boolean": bool,
    "object": dict[str, Any],
    "null": type(None),
}


def json_schema_to_python_type(schema: dict[str, Any]) -> Any:
    """Convert the supported JSON Schema type vocabulary to Python types."""
    enum_values: Any = schema.get("enum")
    if (
        schema.get("type") == "string"
        and isinstance(enum_values, list)
        and enum_values
        and all(
            isinstance(value, str) for value in cast(list[Any], enum_values)
        )
    ):
        literal = cast(Any, Literal)
        return literal[tuple(cast(list[Any], enum_values))]

    schema_type: Any = schema.get("type")
    if isinstance(schema_type, list):
        alternatives = [
            json_schema_to_python_type({**schema, "type": alternative})
            for alternative in cast(list[Any], schema_type)
        ]
        return _union_types(alternatives)

    if schema_type == "array":
        items: Any = schema.get("items")
        item_type = (
            json_schema_to_python_type(cast(dict[str, Any], items))
            if isinstance(items, dict)
            else Any
        )
        return list[item_type]

    if isinstance(schema_type, str):
        return _JSON_TYPE_MAP.get(schema_type, Any)

    any_of: Any = schema.get("anyOf")
    if isinstance(any_of, list):
        alternatives = [
            json_schema_to_python_type(cast(dict[str, Any], alternative))
            for alternative in cast(list[Any], any_of)
            if isinstance(alternative, dict)
        ]
        if alternatives:
            return _union_types(alternatives)

    return Any


def json_schema_to_pydantic_field(
    schema: dict[str, Any], *, required: bool
) -> tuple[Any, FieldInfo]:
    """Convert one JSON Schema property to a Pydantic field declaration."""
    python_type = json_schema_to_python_type(schema)
    description = schema.get("description", "")

    if "default" in schema:
        default = schema["default"]
    elif required:
        default = ...
    else:
        # JSON Schema optionality controls presence, not nullability. A non-null
        # annotation with a None default lets Pydantic accept omission while
        # still rejecting an explicit null unless the schema type permits it.
        default = None

    field = Field(default=default, description=description)
    return python_type, cast(FieldInfo, field)


def build_pydantic_args_schema(tool_def: ToolDefinition) -> type[BaseModel]:
    """Build a Pydantic argument model from a tool's JSON Schema parameters."""
    parameters = tool_def["parameters"]
    properties = parameters.get("properties", {})
    required_fields = set(parameters.get("required", []))

    fields: dict[str, Any] = {}
    for property_name, property_schema in properties.items():
        fields[property_name] = json_schema_to_pydantic_field(
            property_schema,
            required=property_name in required_fields,
        )

    validators: dict[str, Any] = {}
    any_of_groups = _any_of_required_groups(parameters.get("anyOf"))
    if any_of_groups is not None:
        validators["validate_any_of_required_fields"] = _make_any_of_validator(
            any_of_groups
        )

    model_name = f"{tool_def['name'].title().replace('_', '')}Input"
    model = create_model(
        model_name,
        __validators__=validators,
        **fields,
    )
    return model


def _union_types(types: list[Any]) -> Any:
    """Build a runtime union while avoiding duplicate alternatives."""
    unique_types = list(dict.fromkeys(types))
    if not unique_types:
        return Any
    if len(unique_types) == 1:
        return unique_types[0]
    union = unique_types[0]
    for python_type in unique_types[1:]:
        union = union | python_type
    return union


def _any_of_required_groups(value: Any) -> tuple[tuple[str, ...], ...] | None:
    """Extract anyOf branches expressible as required-field presence groups."""
    if not isinstance(value, list) or not value:
        return None

    groups: list[tuple[str, ...]] = []
    for branch in cast(list[Any], value):
        if not isinstance(branch, dict):
            return None
        branch_schema = cast(dict[str, Any], branch)
        required: Any = branch_schema.get("required", [])
        if not isinstance(required, list) or not all(
            isinstance(field_name, str)
            for field_name in cast(list[Any], required)
        ):
            return None
        groups.append(tuple(cast(list[str], required)))
    return tuple(groups)


def _make_any_of_validator(any_of_groups: tuple[tuple[str, ...], ...]) -> Any:
    """Create a before-validator that checks raw input field presence."""

    def validate_any_of_required_fields(value: Any) -> Any:
        if not isinstance(value, Mapping):
            return value
        if any(
            all(field_name in value for field_name in required_group)
            for required_group in any_of_groups
        ):
            return cast(Any, value)

        alternatives = " or ".join(
            " + ".join(required_group) if required_group else "no fields"
            for required_group in any_of_groups
        )
        raise ValueError(
            "input must satisfy an anyOf required-field group: " + alternatives
        )

    return model_validator(mode="before")(validate_any_of_required_fields)
