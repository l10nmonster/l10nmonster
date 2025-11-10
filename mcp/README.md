# L10n Monster MCP Server

Model Context Protocol (MCP) server for L10n Monster, exposing translation management functionality to Claude Code and other MCP clients.

## Usage

Register MCP as an extension to be served and then start an l10n monster server as usual.

### Example

`l10nmonster.config.json`:
```javascript
import serve from '@l10nmonster/server';
import { createMcpRoutes } from '@l10nmonster/mcp';
serve.registerExtension('mcp', createMcpRoutes);

export default config.l10nMonster(import.meta.dirname).action(serve)

```

With above config, you can start the l10n server via:
```shell
$ npx l10n serve
```

The server then exposes an mcp at `http://localhost:9000/api/ext/mcp` which can be leveraged by any LLM agent.


## Available Tools

- `source_query` - Query source content and translation memory
- `translate` - Translate segments using configured providers
- `translation_status` - Get translation memory statistics and provider information

## Transport Options

- **HTTP/SSE** (default): Standards-compliant Streamable HTTP transport with per-request isolation
- **Stdio**: Standard input/output transport for direct integration

## Development

When developing, the best way to test the MCP server is by running it and using the inspector.

```
npx @modelcontextprotocol/inspector
```

## MCP Tools

This directory contains MCP tool classes that interface directly with MonsterManager, providing structured access to L10n Monster functionality through the Model Context Protocol. Unlike CLI actions, these tools return structured data optimized for programmatic consumption rather than console output.

### Architecture

All MCP tools inherit from the `McpTool` base class, which handles schema validation with Zod, automatic error formatting, and MCP response serialization. Tools are automatically discovered and registered at server startup by scanning exports from `tools/index.js`.


## Creating New Tools

New tools should focus on a single responsibility while remaining composable with existing tools. Design them to be idempotent where possible, especially for query operations that shouldn't modify state.

Use consistent naming conventions: prefer verb-noun patterns like `source_query` or `translate_segments`, and standardize parameter names such as `channelId`, `sourceLang`, and `targetLang`. Write clear descriptions for both the tool and its parameters, as these directly influence how AI agents discover and use your tools. Include example values in parameter descriptions when they help clarify expected formats.

Remember that tool description and schema descriptions serve different purposes and audiences. Descriptions help with tool selection and understanding, while schema descriptions guide proper usage. So
   - Aim to have good sensible default for variables to make it easy out-of-the-box usage. Users should be able to get started without extensive configuration.
   - In case of error emit  a helpful message to the caller with information to potentially recover. For example if a provided parameter is not valid in the error return a list of valid values so LLM can recover.
   - Optional paramter should have their default explained.



Additional reading:
 - https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1382
 - https://steipete.me/posts/2025/mcp-best-practices#tool--parameter-descriptions 



### Schema Design

Define input schemas using Zod with descriptive field documentation. Use `.describe()` to explain each parameter's purpose and format, and leverage Zod's validation features like `.min()`, `.max()`, and `.optional()` to enforce constraints and provide sensible defaults.

```javascript
inputSchema: z.object({
    channelId: z.string().describe('Channel ID to fetch source TUs from'),
    guids: z.array(z.string()).min(1).describe('Array of TU GUIDs to translate'),
    whereCondition: z.string().optional().default('true').describe('SQL WHERE condition against sources')
})
```

### Implementation

Create a tool class that extends `McpTool` with static `metadata` and `execute` method:

```javascript
export class MyNewTool extends McpTool {
    static metadata = {
        name: 'my_new_tool',
        description: 'Tool description for MCP discovery',
        inputSchema: z.object({...})
    };

    static async execute(mm, args) {
        // Call MonsterManager methods directly
        // Return structured data - the base class handles MCP formatting
        return { ... };
    }
}
```

Export the tool from `tools/index.js` to make it available for automatic registration:

```javascript
export { MyNewTool } from './MyNewTool.js';
```

### Output Guidelines

Return structured objects rather than formatted strings, letting MCP clients handle presentation. Use arrays of objects for lists instead of concatenated strings, and include contextual metadata with results to help consumers understand what they're receiving.

The base class automatically formats results for MCP compatibility, so focus on returning clean, structured data that represents your tool's output naturally.

### Error Handling

The base class provides structured error handling with specific error types (`McpInputError`, `McpNotFoundError`, `McpProviderError`) that include machine-readable codes, retry hints, and detailed context. Let errors bubble up naturally unless you need to add domain-specific context.

When catching errors, use the structured error types to provide actionable information:

```javascript
try {
    return await someOperation();
} catch (error) {
    throw new McpInputError(`Invalid channel: ${channelId}`, {
        hints: ['Call translation_status to see available channels'],
        cause: error
    });
}
```