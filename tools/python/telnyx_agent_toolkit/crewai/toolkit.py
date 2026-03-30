"""CrewAI adapter for the Telnyx Agent Toolkit."""

from __future__ import annotations

from typing import Any, Type

from pydantic import BaseModel, Field, create_model

from telnyx_agent_toolkit.shared.constants import ToolDefinition
from telnyx_agent_toolkit.shared.toolkit_core import ToolkitCore

_BaseCrewTool: Any = None


def _get_base_tool() -> Any:
    """Lazy import of CrewAI's BaseTool."""
    global _BaseCrewTool
    if _BaseCrewTool is None:
        try:
            from crewai.tools import BaseTool

            _BaseCrewTool = BaseTool
        except ImportError as e:
            raise ImportError(
                "CrewAI is required for CrewAI tools. "
                "Install with: pip install telnyx-agent-toolkit[crewai]"
            ) from e
    return _BaseCrewTool


def _json_schema_to_field(name: str, schema: dict[str, Any], required: bool) -> tuple[Any, Any]:
    """Convert JSON Schema property to Pydantic field."""
    type_map: dict[str, type] = {
        "string": str,
        "integer": int,
        "number": float,
        "boolean": bool,
    }

    schema_type = schema.get("type", "string")

    if isinstance(schema_type, list):
        py_type: Any = str
    elif schema_type == "array":
        items_type = schema.get("items", {}).get("type", "string")
        inner = type_map.get(items_type, str)
        py_type = list[inner]  # type: ignore[valid-type]
    elif schema_type == "object":
        py_type = dict[str, Any]
    else:
        py_type = type_map.get(schema_type, str)

    description = schema.get("description", "")
    default = schema.get("default", ...)

    if not required and default is ...:
        py_type = py_type | None  # type: ignore[operator]
        return (py_type, Field(default=None, description=description))

    return (py_type, Field(default=default, description=description))


def _build_args_schema(tool_def: ToolDefinition) -> Type[BaseModel]:
    """Build Pydantic model from tool definition parameters."""
    properties = tool_def["parameters"].get("properties", {})
    required_fields = set(tool_def["parameters"].get("required", []))

    fields: dict[str, Any] = {}
    for prop_name, prop_schema in properties.items():
        is_required = prop_name in required_fields
        py_type, field = _json_schema_to_field(prop_name, prop_schema, is_required)
        fields[prop_name] = (py_type, field)

    model_name = f"{tool_def['name'].title().replace('_', '')}Input"
    return create_model(model_name, **fields)  # type: ignore[call-overload]


class CrewAIToolkit:
    """Adapter that wraps Telnyx tools as CrewAI BaseTool instances."""

    def __init__(self, core: ToolkitCore, tools: list[ToolDefinition]) -> None:
        self._core = core
        self._tools = tools

    def get_tools(self) -> list[Any]:
        """Get a list of CrewAI BaseTool instances."""
        BaseTool = _get_base_tool()
        result: list[Any] = []

        for tool_def in self._tools:
            args_schema = _build_args_schema(tool_def)
            core = self._core
            name = tool_def["name"]
            description = tool_def["description"]

            tool_cls = type(
                f"Telnyx{name.title().replace('_', '')}Tool",
                (BaseTool,),
                {
                    "name": name,
                    "description": description,
                    "args_schema": args_schema,
                    "_core": core,
                    "_tool_name": name,
                    "_run": _make_run(core, name),
                },
            )
            result.append(tool_cls())

        return result


def _make_run(core: ToolkitCore, tool_name: str) -> Any:
    """Create a _run method for a CrewAI tool."""

    def _run(self: Any, **kwargs: Any) -> str:
        return core.run_tool(tool_name, kwargs)

    return _run
