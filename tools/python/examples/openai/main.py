"""OpenAI + Telnyx Agent Toolkit example — SMS assistant.

This example creates an AI assistant that can send SMS messages,
search for phone numbers, and check account balance using Telnyx APIs.

Requirements:
    pip install telnyx-agent-toolkit[openai]

Usage:
    export TELNYX_API_KEY=KEY...
    export OPENAI_API_KEY=sk-...
    python main.py
"""

import json
import os

from openai import OpenAI

from telnyx_agent_toolkit import TelnyxAgentToolkit


def main() -> None:
    telnyx_api_key = os.environ["TELNYX_API_KEY"]
    openai_client = OpenAI()

    # Create toolkit with specific permissions
    toolkit = TelnyxAgentToolkit(
        api_key=telnyx_api_key,
        configuration={
            "actions": {
                "messaging": {"send_sms": True},
                "numbers": {"list": True, "search": True},
                "account": {"get_balance": True},
            }
        },
    )

    # Get OpenAI-formatted tools
    tools = toolkit.get_openai_tools()
    executor = toolkit.get_openai_tool_executor()

    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful telecom assistant powered by Telnyx. "
                "You can send SMS messages, search for phone numbers, "
                "and check account balance."
            ),
        },
        {
            "role": "user",
            "content": "What's my current account balance?",
        },
    ]

    print("Sending request to OpenAI...")
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        tools=tools,
    )

    message = response.choices[0].message

    # Handle tool calls
    if message.tool_calls:
        messages.append(message)  # type: ignore[arg-type]

        for tool_call in message.tool_calls:
            print(f"Calling tool: {tool_call.function.name}")
            print(f"  Arguments: {tool_call.function.arguments}")

            result = executor.execute(tool_call)
            print(f"  Result: {result}")

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result,
            })

        # Get final response
        final_response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
        )
        print(f"\nAssistant: {final_response.choices[0].message.content}")
    else:
        print(f"\nAssistant: {message.content}")


if __name__ == "__main__":
    main()
