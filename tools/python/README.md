# Telnyx Agent Toolkit

Read-only composed tools `bulk_lookup_numbers` and `get_voice_clone` are available.
See [removed-tool decisions and limits](../removed-tool-decisions.md) for exact result
semantics, charging/bounds, and the three tools not restored in this slice.

Python SDK for building AI agents with [Telnyx](https://telnyx.com) APIs. Works with **OpenAI**, **LangChain**, and **CrewAI**.

## Installation

```bash
# Core (no framework dependency)
pip install telnyx-agent-toolkit

# With OpenAI support
pip install telnyx-agent-toolkit[openai]

# With LangChain support
pip install telnyx-agent-toolkit[langchain]

# With CrewAI support
pip install telnyx-agent-toolkit[crewai]

# Everything
pip install telnyx-agent-toolkit[all]
```

## Quick Start

### Optional Cloud Storage (S3)

Install `pip install 'telnyx-agent-toolkit[storage]'` (also included in `[all]`).
The core package does not import or require boto3 unless an S3 tool is executed.
Enable the separate S3 catalog explicitly; the REST catalog is unchanged:

```python
import os
from telnyx_agent_toolkit import TelnyxAgentToolkit

toolkit = TelnyxAgentToolkit(
    api_key=os.environ["TELNYX_API_KEY"],
    storage=True,
    configuration={"actions": {"storage": {
        "list_storage_buckets": True,
        "get_storage_object": True,
    }}},
)
result = toolkit.core.run_tool("get_storage_object", {
    "bucket_name": "my-bucket", "key": "reports/hello.txt",
    "region": "us-central-1",
})
```

The five tools are `list_storage_buckets`, `create_storage_bucket`,
`delete_storage_bucket`, `upload_storage_object`, and `get_storage_object`.
They use boto3, not `/v2/storage/buckets` REST routes. Every call accepts
`region` (default `us-central-1`): `us-central-1`, `us-east-1`, `us-west-1`,
`eu-central-1`, `ap-southeast-1`, or `ca-central-1`. The endpoint is fixed to
`https://<region>.telnyxcloudstorage.com`, independent of `base_url`.
The supplied toolkit API key is both S3 access key and secret key; AWS
credential environment/profile discovery is not used. Current SDK checksum
defaults are retained. See the official [quick start](https://developers.telnyx.com/docs/cloud-storage/quick-start)
and [Python SDK example](https://developers.telnyx.com/docs/cloud-storage/sdk/python).

Bucket operations except list require `bucket_name`; object operations also
require literal `key` (1–1024 UTF-8 bytes). Keys are never path-normalized:
slashes, repeated slashes, percent signs, spaces, Unicode, `?`, and `#` are
passed as literal keys to the SDK. Dot-only segments (`.`/`..`) are refused.
Uploads additionally require string `content` and explicit `content_encoding`
(`utf-8` or canonical padded `base64`); optional `content_type` defaults to
`application/octet-stream`. Uploading an existing key **overwrites** that object.
No local filename, arbitrary bytes object, URL fetch, or stream is accepted.

All results are JSON strings: `{ "data": ... }` or `{ "error": "..." }`.
Create/delete return `bucket_name`; list returns `buckets` containing `name`
and a nullable `continuation_token` from a single SDK response. Upload returns
`bucket_name`, `key`, nullable `etag`, and `size_bytes`. Download returns
those fields plus `content` (always base64), `content_encoding: "base64"`,
and nullable `content_type`. Both directions are capped at **1 MiB decoded**;
larger downloads fail without returning partial content and close the body.
Use a dedicated S3 client for large objects/multipart or listing pagination.
Missing SDKs produce an actionable install error; SDK failures remain errors.
Delete does not empty a bucket or remove objects. `storage=True` with no action
configuration advertises all five; actions filter the advertised tools, not
the authority of direct core calls. Use appropriately scoped credentials and
explicit agent approval for writes/deletes.

Tests `test_s3_storage.py` and optional `test_s3_sdk.py` are **offline SDK/local
contracts**, not authenticated Telnyx acceptance. Live create/list/upload/read/
empty/delete lifecycle validation, region/checksum compatibility, and toolkit-owner
sign-off remain required under separately scoped authorization. No production
bucket lifecycle is run by these tests.

### OpenAI

```python
import os
from openai import OpenAI
from telnyx_agent_toolkit import TelnyxAgentToolkit

toolkit = TelnyxAgentToolkit(
    api_key=os.environ["TELNYX_API_KEY"],
    configuration={
        "actions": {
            "messaging": {"send_sms": True},
            "numbers": {"list": True, "search": True},
            "account": {"get_balance": True},
        }
    },
)

client = OpenAI()
tools = toolkit.get_openai_tools()
executor = toolkit.get_openai_tool_executor()

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What's my Telnyx balance?"}],
    tools=tools,
)

# Execute tool calls
for tool_call in response.choices[0].message.tool_calls:
    result = executor.execute(tool_call)
    print(result)
```

### LangChain

```python
from telnyx_agent_toolkit import TelnyxAgentToolkit

toolkit = TelnyxAgentToolkit(api_key="KEY...")
tools = toolkit.get_langchain_tools()

# Use with any LangChain agent
from langchain_openai import ChatOpenAI
llm = ChatOpenAI(model="gpt-4o")
llm_with_tools = llm.bind_tools(tools)
```

### CrewAI

```python
from crewai import Agent
from telnyx_agent_toolkit import TelnyxAgentToolkit

toolkit = TelnyxAgentToolkit(api_key="KEY...")
tools = toolkit.get_crewai_tools()

agent = Agent(
    role="Telecom Specialist",
    goal="Help manage phone numbers and messaging",
    tools=tools,
)
```

## Configuration

Control which tools are available to the agent:

```python
toolkit = TelnyxAgentToolkit(
    api_key="KEY...",
    configuration={
        "actions": {
            # Messaging
            "messaging": {
                "send_sms": True,            # Send SMS/MMS
                "list_messaging_profiles": True,
                "create_messaging_profile": True,
            },
            # Phone Numbers
            "numbers": {
                "list": True,    # List account numbers
                "search": True,  # Search available numbers
                "buy": True,     # Purchase numbers (charges account)
            },
            # Account
            "account": {
                "get_balance": True,
            },
            # Voice
            "voice": {
                "make_call": True,
                "list_connections": True,
            },
            # AI
            "ai": {
                "chat": True,              # Chat completions
                "embed": True,             # Embeddings
                "list_ai_assistants": True,
                "create_ai_assistant": True,
            },
            # Fax
            "fax": {
                "send_fax": True,
            },
            # Lookup
            "lookup": {
                "lookup_number": True,     # Carrier/CNAM lookup
            },
            # IoT
            "iot": {
                "list_sim_cards": True,
            },
            # Verification
            "verify": {
                "verify_phone": True,      # Send verification code
                "verify_code": True,       # Check verification code
            },
        }
    },
)
```

> **No configuration = all tools enabled.** Use configuration to restrict which tools the agent can access.

## Available Tools

| Tool | Category | Description |
|------|----------|-------------|
| `send_sms` | Messaging | Send an SMS or MMS message |
| `list_messaging_profiles` | Messaging | List messaging profiles |
| `create_messaging_profile` | Messaging | Create a messaging profile |
| `list_phone_numbers` | Numbers | List phone numbers on the account |
| `search_phone_numbers` | Numbers | Search available numbers to buy |
| `buy_phone_number` | Numbers | Purchase a phone number |
| `get_balance` | Account | Check account balance |
| `make_call` | Voice | Initiate an outbound call |
| `list_connections` | Voice | List voice connections |
| `ai_chat` | AI | Chat completion via Telnyx inference |
| `ai_embed` | AI | Generate embeddings |
| `list_ai_assistants` | AI | List AI assistants |
| `create_ai_assistant` | AI | Create an AI assistant |
| `send_fax` | Fax | Send a fax |
| `lookup_number` | Lookup | Phone number lookup |
| `list_sim_cards` | IoT | List IoT SIM cards |
| `verify_phone` | Verify | Start phone verification |
| `verify_code` | Verify | Check verification code |

## Async Support

All tools support async execution natively:

```python
# Async execution
result = await executor.execute_async(tool_call)

# Direct tool execution
result = await toolkit.core.run_tool_async("get_balance", {})
```

## API Client

Access the underlying HTTP client directly:

```python
# Async
data = await toolkit.api_client.get_async("/phone_numbers")

# Sync
data = toolkit.api_client.get("/phone_numbers")
```

## Requirements

- Python 3.11+
- [Telnyx API key](https://portal.telnyx.com/#/app/api-keys)

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Lint
ruff check .

# Type check
pyright
```

## License

MIT
