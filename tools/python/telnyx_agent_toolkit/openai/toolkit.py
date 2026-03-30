"""OpenAI function-calling adapter for the Telnyx Agent Toolkit."""

from __future__ import annotations

import json
from typing import Any

from telnyx_agent_toolkit.shared.constants import ToolDefinition
from telnyx_agent_toolkit.shared.toolkit_core import ToolkitCore


class OpenAIToolkit:
    """Adapter that provides Telnyx tools in OpenAI function-calling format.

    Usage:
        ```python
        toolkit = TelnyxAgentToolkit(api_key="KEY...")
        openai_tools = toolkit.get_openai_tools()

        # Use with OpenAI
        response = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            tools=openai_tools,
        )

        # Execute tool calls
        executor = toolkit.get_openai_tool_executor()
        for tool_call in response.choices[0].message.tool_calls:
            result = await executor.execute_async(tool_call)
        ```
    """

    def __init__(self, core: ToolkitCore, tools: list[ToolDefinition]) -> None:
        self._core = core
        self._tools = tools

    def get_tools(self) -> list[dict[str, Any]]:
        """Get tool definitions formatted for OpenAI's `tools` parameter."""
        result: list[dict[str, Any]] = []
        for tool_def in self._tools:
            # Build clean parameter schema
            params = dict(tool_def["parameters"])
            # Remove non-JSON-Schema keys and normalize
            properties = params.get("properties", {})

            # Clean up properties for OpenAI (remove defaults from schema)
            clean_props: dict[str, Any] = {}
            for prop_name, prop_schema in properties.items():
                clean_prop = {k: v for k, v in prop_schema.items() if k != "default"}
                clean_props[prop_name] = clean_prop

            result.append({
                "type": "function",
                "function": {
                    "name": tool_def["name"],
                    "description": tool_def["description"],
                    "parameters": {
                        "type": "object",
                        "properties": clean_props,
                        "required": params.get("required", []),
                    },
                },
            })
        return result

    async def execute_async(self, tool_call: Any) -> str:
        """Execute an OpenAI tool call and return the result as a string.

        Args:
            tool_call: An OpenAI ChatCompletionMessageToolCall object,
                       or a dict with 'function.name' and 'function.arguments'.
        """
        if hasattr(tool_call, "function"):
            name = tool_call.function.name
            arguments = json.loads(tool_call.function.arguments)
        else:
            name = tool_call["function"]["name"]
            arguments = json.loads(tool_call["function"]["arguments"])

        return await self._core.run_tool_async(name, arguments)

    def execute(self, tool_call: Any) -> str:
        """Sync wrapper for execute_async."""
        from telnyx_agent_toolkit.shared.api_client import _run_sync

        return _run_sync(self.execute_async(tool_call))
