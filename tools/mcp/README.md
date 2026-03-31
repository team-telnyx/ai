# @telnyx/mcp

The Telnyx [Model Context Protocol](https://modelcontextprotocol.com/) server allows you to integrate with Telnyx APIs through function calling. This protocol supports various tools to interact with different Telnyx services.

## Setup

Telnyx hosts a remote MCP server at `https://api.telnyx.com/v2/mcp`.

To run the Telnyx MCP server locally using npx:

```bash
npx -y @telnyx/mcp --api-key=YOUR_TELNYX_API_KEY
```

Or set the environment variable:

```bash
export TELNYX_API_KEY=YOUR_KEY
npx -y @telnyx/mcp
```

## How it works

This package proxies MCP requests to the remote Telnyx MCP server over HTTP. The remote server provides the tools — API endpoint discovery, schema inspection, and endpoint invocation.

The full MCP server implementation lives in [`team-telnyx/telnyx-node/packages/mcp-server`](https://github.com/team-telnyx/telnyx-node/tree/master/packages/mcp-server).
