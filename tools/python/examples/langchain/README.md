# LangChain Example

Telecom agent using LangChain with Telnyx tools.

## Setup

```bash
pip install telnyx-agent-toolkit[langchain] langchain-openai
export TELNYX_API_KEY=KEY...
export OPENAI_API_KEY=sk-...
```

## Run

```bash
python main.py
```

## What it does

1. Creates a Telnyx toolkit with messaging, numbers, balance, and AI permissions
2. Wraps tools as LangChain `BaseTool` instances
3. Binds tools to a ChatOpenAI model
4. Executes tool calls from the LLM response
