# MCP Tools

This directory contains dedicated MCP tool classes that call underlying MonsterManager functions directly, separate from CLI actions.

## Architecture

### Base Class: `McpTool`

All MCP tools extend `McpTool`, which provides:

- **Schema-based validation**: Uses Zod schemas for input validation
- **Error handling**: Automatic error formatting for MCP responses
- **Result formatting**: Always formats results to MCP-compatible format
- **Tool registration**: `handler()` method returns an async handler function for MCP registration

### Key Differences from CLI Actions

MCP tools differ from CLI actions in several important ways:

1. **No CLI-specific concerns**: No console logging (`consoleLog`), no file I/O (`writeFileSync`)
2. **Structured data return**: Return structured objects/arrays, not formatted strings
3. **MCP-optimized schemas**: Schemas designed for API use, not CLI argument parsing
4. **Direct function calls**: Call underlying MonsterManager methods directly

### Example: SourceQueryTool

```javascript
import { z } from 'zod';
import { McpTool } from './BaseMcpTool.js';

export class SourceQueryTool extends McpTool {
    static metadata = {
        name: 'source_query',
        description: 'Query sources in the local cache...',
        inputSchema: z.object({
            lang: z.string().describe('Language pair "srcLang,tgtLang"'),
            whereCondition: z.string().optional(),
            // ... more fields
        })
    };

    static async execute(mm, args) {
        // Call underlying functions directly
        const tm = mm.tmm.getTM(sourceLang, targetLang);
        const tus = tm.querySource(args.whereCondition ?? 'true');
        
        // Return structured data (will be automatically formatted)
        return {
            sourceLang,
            targetLang,
            translationUnits: tus.length,
            jobs: [...]
        };
    }
}
```

## Creating New Tools

1. **Create a new tool class** extending `McpTool`:
   ```javascript
   export class MyNewTool extends McpTool {
       static metadata = {
           name: 'my_new_tool',
           description: '...',
           inputSchema: z.object({...})
       };
       
       static async execute(mm, args) { 
           // Return structured data
           return { ... };
       }
   }
   ```

2. **Export it** from `tools/index.js`:
   ```javascript
   export { MyNewTool } from './MyNewTool.js';
   ```

3. **The tool will be automatically registered** when the MCP server starts.

## Underlying Functions

MCP tools call MonsterManager methods directly:

- **Translation Memory**: `mm.tmm.getTM(srcLang, tgtLang)` → `tm.querySource()`, `tm.getUntranslatedContent()`
- **Job Dispatcher**: `mm.dispatcher.createJobs()`, `mm.dispatcher.startJobs()`
- **Resource Manager**: `mm.rm.getAllResources()`, `mm.rm.getChannel()`
- **Operations**: `mm.ops.*` methods
- **Currency Formatting**: `mm.currencyFormatter.format()`

## Benefits

1. **Separation of concerns**: MCP tools don't depend on CLI action implementations
2. **Better schemas**: MCP-optimized schemas with proper types and descriptions
3. **Structured responses**: Return data structures instead of console output
4. **Easier testing**: Can test tools independently of CLI actions
5. **Future-proof**: Can evolve independently from CLI interface

