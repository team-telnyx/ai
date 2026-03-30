"""CrewAI + Telnyx Agent Toolkit example — Telecom crew.

This example creates a CrewAI agent with Telnyx tools for
managing telecom resources.

Requirements:
    pip install telnyx-agent-toolkit[crewai]

Usage:
    export TELNYX_API_KEY=KEY...
    export OPENAI_API_KEY=sk-...
    python main.py
"""

import os

from crewai import Agent, Crew, Task

from telnyx_agent_toolkit import TelnyxAgentToolkit


def main() -> None:
    telnyx_api_key = os.environ["TELNYX_API_KEY"]

    toolkit = TelnyxAgentToolkit(
        api_key=telnyx_api_key,
        configuration={
            "actions": {
                "messaging": {"send_sms": True},
                "numbers": {"list": True, "search": True, "buy": True},
                "account": {"get_balance": True},
            }
        },
    )

    tools = toolkit.get_crewai_tools()

    # Create a telecom provisioning agent
    telecom_agent = Agent(
        role="Telecom Provisioning Specialist",
        goal="Help users manage their Telnyx phone numbers and messaging",
        backstory=(
            "You are an expert in telecom provisioning. You help users "
            "search for, purchase, and manage phone numbers on the Telnyx platform."
        ),
        tools=tools,
        verbose=True,
    )

    # Create a task
    task = Task(
        description=(
            "Check the current account balance, then search for "
            "available local phone numbers in area code 415."
        ),
        expected_output="A summary of the account balance and available phone numbers.",
        agent=telecom_agent,
    )

    crew = Crew(
        agents=[telecom_agent],
        tasks=[task],
        verbose=True,
    )

    result = crew.kickoff()
    print(f"\nResult: {result}")


if __name__ == "__main__":
    main()
