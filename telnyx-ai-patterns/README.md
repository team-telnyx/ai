# telnyx-ai-patterns

Workflow patterns built on Telnyx's LLM inference API. These are not SDK wrappers or API reference skills. They are reusable problem-solving patterns that use multiple models together to get better results than any single model alone.

## Available Patterns

| Pattern | Description |
|---------|-------------|
| [Council](skills/council/SKILL.md) | Parallel multi-model debugging. When stuck after 2+ failed attempts, spawn 3 models simultaneously with the same problem brief and read all diagnoses before acting. |

## Prerequisites

- A Telnyx account with API access
- `TELNYX_API_KEY` environment variable set
- Python 3.9+ (for the reference implementations)

## API Endpoint

All patterns use the Telnyx AI inference API:

```
https://api.telnyx.com/v2/ai/chat/completions
```

This endpoint is OpenAI-compatible, so you can adapt these patterns to use the OpenAI SDK if you prefer.
