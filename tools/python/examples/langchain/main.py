"""LangChain + Telnyx Agent Toolkit example — Telecom agent.

This example creates a LangChain agent that can interact with
Telnyx APIs to manage phone numbers and send messages.

Requirements:
    pip install telnyx-agent-toolkit[langchain] langchain-openai

Usage:
    export TELNYX_API_KEY=KEY...
    export OPENAI_API_KEY=sk-...
    python main.py
"""

import os

from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI

from telnyx_agent_toolkit import TelnyxAgentToolkit


def main() -> None:
    telnyx_api_key = os.environ["TELNYX_API_KEY"]

    toolkit = TelnyxAgentToolkit(
        api_key=telnyx_api_key,
        configuration={
            "actions": {
                "messaging": {"send_sms": True, "list_messaging_profiles": True},
                "numbers": {"list": True, "search": True},
                "account": {"get_balance": True},
                "ai": {"chat": True},
            }
        },
    )

    tools = toolkit.get_langchain_tools()
    llm = ChatOpenAI(model="gpt-4o", temperature=0)
    llm_with_tools = llm.bind_tools(tools)

    messages = [HumanMessage(content="Search for available toll-free numbers in the US")]

    print("Sending request to LangChain agent...")
    response = llm_with_tools.invoke(messages)
    print(f"\nResponse: {response.content}")

    if hasattr(response, "tool_calls") and response.tool_calls:
        for tc in response.tool_calls:
            print(f"\nTool call: {tc['name']}")
            print(f"  Args: {tc['args']}")

            # Find and execute the matching tool
            for tool in tools:
                if tool.name == tc["name"]:
                    result = tool.invoke(tc["args"])
                    print(f"  Result: {result[:200]}...")


if __name__ == "__main__":
    main()
