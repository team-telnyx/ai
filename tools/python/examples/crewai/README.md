# CrewAI Example

Telecom provisioning crew using CrewAI with Telnyx tools.

## Setup

```bash
pip install telnyx-agent-toolkit[crewai]
export TELNYX_API_KEY=KEY...
export OPENAI_API_KEY=sk-...
```

## Run

```bash
python main.py
```

## What it does

1. Creates a Telnyx toolkit with messaging, numbers, and balance permissions
2. Wraps tools as CrewAI `BaseTool` instances
3. Creates a "Telecom Provisioning Specialist" agent
4. Runs a task to check balance and search for phone numbers
