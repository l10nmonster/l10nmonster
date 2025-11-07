# MCP Package Architecture

## Overview

The MCP package provides a Model Context Protocol server that exposes L10n Monster functionality as MCP tools. The architecture separates MCP tools from CLI actions, allowing tools to call underlying MonsterManager functions directly.

## Design Principles

1. **Separation of Concerns**: MCP tools are independent of CLI actions
2. **Direct Function Calls**: Tools call MonsterManager methods directly, not through CLI action wrappers
3. **Structured Data**: Tools return structured objects/arrays, not console-formatted strings
4. **MCP-Optimized Schemas**: Input schemas designed for API use with proper types and descriptions

## Architecture Components

### 1. Base Tool Class (`tools/BaseMcpTool.js`)

All MCP tools extend `McpTool`, which provides:

- **Static metadata** object containing:
  - `name`: MCP tool identifier
  - `description`: Tool description for MCP
  - `inputSchema`: Zod schema for input validation

- **Static methods**:
  - `execute(mm, args)`: Executes the tool logic (must be implemented by subclasses)
  - `handler(mm)`: Returns an async handler function for MCP registration

- **Automatic handling**:
  - Input validation via Zod
  - Error formatting for MCP responses
  - Result formatting for MCP responses (always applied)

### 2. Tool Classes (`tools/*.js`)

Each tool is a class extending `McpTool`:

```javascript
export class SourceQueryTool extends McpTool {
    static metadata = {
        name: 'source_query',
        description: '...',
        inputSchema: z.object({...})
    };
    
    static async execute(mm, args) {
        // Call underlying functions directly
        const tm = mm.tmm.getTM(...);
        // Return structured data (always formatted automatically)
        return { ... };
    }
}
```

### 3. Tool Registration (`tools/index.js`)

All tools are exported from `tools/index.js`. The server automatically discovers and registers all exported tool classes.

### 4. Server Integration (`server.js`)

The `MCPServer` class:

- Discovers all tools from `tools/index.js`
- Registers them with the MCP server
- Supports both HTTP/SSE and stdio transports
- Manages per-session tool registration for HTTP mode

## Comparison: CLI Actions vs MCP Tools

### CLI Actions (Old Approach)
```javascript
export class source_query {
    static help = { /* CLI-focused help */ };
    static async action(mm, options) {
        consoleLog`...`;  // Console output
        // ... logic ...
        if (options.outFile) {
            writeFileSync(...);  // File I/O
        }
        return jobs;  // May return CLI-formatted data
    }
}
```

### MCP Tools (New Approach)
```javascript
export class SourceQueryTool extends McpTool {
    static metadata = {
        name: 'source_query',
        description: '...',
        inputSchema: z.object({
            lang: z.string().describe('...'),
            // MCP-optimized schema
        })
    };
    
    static async execute(mm, args) {
        // Direct function calls
        const tm = mm.tmm.getTM(...);
        const tus = tm.querySource(...);
        
        // Return structured data (always formatted automatically)
        return {
            sourceLang,
            targetLang,
            translationUnits: tus.length,
            jobs: [...]
        };
    }
}
```

## Key Benefits

1. **No CLI Dependencies**: Tools don't depend on CLI action implementations
2. **Better Schemas**: MCP-optimized with proper types, descriptions, and validation
3. **Structured Responses**: Return data structures instead of console output
4. **Easier Testing**: Can test tools independently
5. **Future-Proof**: Can evolve independently from CLI interface
6. **Type Safety**: Zod schemas provide runtime validation and better error messages

## Migration Path

To migrate a CLI action to an MCP tool:

1. Identify the underlying MonsterManager functions being called
2. Create a new tool class extending `BaseMcpTool`
3. Define MCP-optimized schema (not CLI argument parsing)
4. Implement `execute()` to call underlying functions directly
5. Return structured data (not console output)
6. Export from `tools/index.js`

## Example: Source Query Migration

**Before (CLI Action)**:
- Uses `consoleLog` for output
- Writes files with `writeFileSync`
- Parses CLI arguments (`options.lang.split(',')`)
- Returns jobs array (may be written to file)

**After (MCP Tool)**:
- Calls `mm.tmm.getTM()` directly
- Calls `mm.dispatcher.createJobs()` directly
- Validates input with Zod schema
- Returns structured object with all relevant data
- No file I/O or console logging

## Underlying Functions Reference

MCP tools call these MonsterManager methods directly:

- **Translation Memory**: 
  - `mm.tmm.getTM(srcLang, tgtLang)` → returns TM instance
  - `tm.querySource(whereCondition)` → returns TUs
  - `tm.getUntranslatedContent()` → returns untranslated TUs

- **Job Dispatcher**:
  - `mm.dispatcher.createJobs({ sourceLang, targetLang, tus }, { providerList })` → returns jobs
  - `mm.dispatcher.startJobs(jobs, { instructions })` → returns job status

- **Resource Manager**:
  - `mm.rm.getAllResources({ channel, prj })` → returns resource handles
  - `mm.rm.getChannel(channelId)` → returns channel instance

- **Utilities**:
  - `mm.currencyFormatter.format(cost)` → formats currency
  - `mm.getTargetLangs(lang)` → returns target languages

