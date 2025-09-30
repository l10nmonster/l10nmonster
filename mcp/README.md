# L10n Monster MCP Server

Model Context Protocol (MCP) server for L10n Monster, exposing translation management functionality to Claude Code and other MCP clients.

## Usage

```bash
# Start with HTTP/SSE transport (default)
npx l10n mcp

# Start with custom port
npx l10n mcp --port 8080

# Start with stdio transport
npx l10n mcp --stdio
```

## Available Tools

- `source_query` - Query source content and translation memory

## Transport Options

- **HTTP/SSE** (default): Standards-compliant Streamable HTTP transport with per-request isolation
- **Stdio**: Standard input/output transport for direct integration

## Development

When developing, the best way to test the MCP server is by running it and using the inspector.

```
npx @modelcontextprotocol/inspector
```
