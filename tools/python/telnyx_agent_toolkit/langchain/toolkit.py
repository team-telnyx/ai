"""LangChain adapter for the Telnyx Agent Toolkit."""

from __future__ import annotations

import asyncio
import json
from typing import Any, Type

from pydantic import BaseModel

from telnyx_agent_toolkit.shared.constants import ToolDefinition
from telnyx_agent_toolkit.shared.schema import (
    build_pydantic_args_schema,
    json_schema_to_pydantic_field,
)
from telnyx_agent_toolkit.shared.toolkit_core import ToolkitCore

# Type alias — actual import deferred to avoid hard dependency
_BaseTool: Any = None


def _get_base_tool() -> Any:
    """Lazy import of LangChain's BaseTool."""
    global _BaseTool
    if _BaseTool is None:
        try:
            from langchain_core.tools import BaseTool

            _BaseTool = BaseTool
        except ImportError as e:
            raise ImportError(
                "LangChain is required for LangChain tools. "
                "Install with: pip install telnyx-agent-toolkit[langchain]"
            ) from e
    return _BaseTool


def _json_schema_to_pydantic_field(name: str, schema: dict[str, Any]) -> tuple[Any, Any]:
    """Convert a JSON Schema property to a Pydantic field type + Field."""
    del name  # Retained for compatibility with the adapter's existing helper API.
    return json_schema_to_pydantic_field(schema, required=True)


def _build_args_schema(tool_def: ToolDefinition) -> Type[BaseModel]:
    """Build a Pydantic model from a tool definition's parameters."""
    return build_pydantic_args_schema(tool_def)


class LangChainToolkit:
    """Adapter that wraps Telnyx tools as LangChain BaseTool instances."""

    def __init__(self, core: ToolkitCore, tools: list[ToolDefinition]) -> None:
        self._core = core
        self._tools = tools

    def get_tools(self) -> list[Any]:
        """Get a list of LangChain BaseTool instances."""
        BaseTool = _get_base_tool()
        result: list[Any] = []

        for tool_def in self._tools:
            args_schema = _build_args_schema(tool_def)
            core = self._core
            name = tool_def["name"]

            # Create a proper tool class to satisfy Pydantic's requirements
            tool_instance = _make_langchain_tool(BaseTool, core, name, tool_def["description"], args_schema)
            result.append(tool_instance)

        return result


def _make_langchain_tool(
    BaseTool: Any,
    core: ToolkitCore,
    tool_name: str,
    tool_description: str,
    tool_args_schema: Any,
) -> Any:
    """Create a LangChain tool instance using class-based approach."""

    # Use closure to capture core reference without making it a Pydantic field
    _name = tool_name
    _desc = tool_description
    _schema = tool_args_schema

    class TelnyxTool(BaseTool):
        name: str = _name
        description: str = _desc
        args_schema: Any = _schema

        class Config:
            arbitrary_types_allowed = True

        def _run(self, **kwargs: Any) -> str:
            return core.run_tool(tool_name, kwargs)

        async def _arun(self, **kwargs: Any) -> str:
            return await core.run_tool_async(tool_name, kwargs)

    TelnyxTool.__name__ = f"Telnyx{tool_name.title().replace('_', '')}Tool"
    TelnyxTool.__qualname__ = TelnyxTool.__name__

    return TelnyxTool()


def _make_run(core: ToolkitCore, tool_name: str) -> Any:
    """Create a sync _run method for a LangChain tool."""

    def _run(self: Any, **kwargs: Any) -> str:
        return core.run_tool(tool_name, kwargs)

    return _run


def _make_arun(core: ToolkitCore, tool_name: str) -> Any:
    """Create an async _arun method for a LangChain tool."""

    async def _arun(self: Any, **kwargs: Any) -> str:
        return await core.run_tool_async(tool_name, kwargs)

    return _arun
