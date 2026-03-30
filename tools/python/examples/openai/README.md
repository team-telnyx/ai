# OpenAI Example

SMS assistant using OpenAI function calling with Telnyx tools.

## Setup

```bash
pip install telnyx-agent-toolkit[openai]
export TELNYX_API_KEY=KEY...
export OPENAI_API_KEY=sk-...
```

## Run

```bash
python main.py
```

## What it does

1. Creates a Telnyx toolkit with messaging, numbers, and balance permissions
2. Converts tools to OpenAI function-calling format
3. Sends a user query to GPT-4o
4. Automatically executes any Telnyx tool calls
5. Returns the final response
