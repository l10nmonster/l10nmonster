# MCP Tools

This directory contains dedicated MCP tool classes that call underlying MonsterManager functions directly, separate from CLI actions.

## Architecture

### Base Class: `McpTool`

All MCP tools extend `McpTool`, which provides:

- **Schema-based validation**: Uses Zod  for input validation
- **Error handling**: Automatic error formatting for MCP responses
- **Result formatting**: Always formats resultsschemas to MCP-compatible format
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

## Best Practices

### Schema Design

1. **Use descriptive field descriptions**: Zod's `.describe()` method helps AI agents understand parameters
   ```javascript
   inputSchema: z.object({
       channelId: z.string().describe('Channel ID to fetch source TUs from'),
       guids: z.array(z.string()).min(1).describe('Array of TU GUIDs to translate')
   })
   ```

2. **Provide sensible defaults**: Use `.optional()` and `.default()` to make tools easier to use
   ```javascript
   whereCondition: z.string().optional().default('true').describe('SQL WHERE condition')
   ```

3. **Validate constraints**: Use Zod's validation features (`.min()`, `.max()`, `.regex()`, etc.)
   ```javascript
   guids: z.array(z.string()).min(1).describe('Array of TU GUIDs (at least one required)')
   ```

### Data Return Guidelines

1. **Return structured data, not formatted strings**: Let the MCP client format the response
   ```javascript
   // Good: Return structured object
   return { sourceLang, targetLang, totalSegments: 1234, jobs: [...] };
   
   // Bad: Return pre-formatted string
   return `Found 1234 segments in ${sourceLang}->${targetLang}`;
   ```

2. **Use arrays for lists**: Return arrays of objects, not string tables
   ```javascript
   // Good
   return { translationUnits: tus.map(tu => ({ guid: tu.guid, text: tu.nsrc })) };
   
   // Bad
   return tus.map(tu => `${tu.guid}: ${tu.nsrc}`).join('\n');
   ```

3. **Include metadata**: Provide context about the results
   ```javascript
   return {
       sourceLang,
       targetLang,
       totalResults: tus.length,
       query: args.whereCondition,
       results: tus
   };
   ```

### Error Handling

1. **Let errors bubble up**: The base class handles error formatting automatically
   ```javascript
   static async execute(mm, args) {
       // Don't wrap in try-catch unless you need to add context
       const tm = mm.tmm.getTM(sourceLang, targetLang);
       return tm.querySource(args.whereCondition);
   }
   ```

2. **Add context when catching errors**: If you do catch, provide useful error messages
   ```javascript
   try {
       return await someOperation();
   } catch (error) {
       throw new Error(`Failed to process ${channelId}: ${error.message}`);
   }
   ```

### Performance Considerations

1. **Limit large result sets**: Add pagination or reasonable limits
   ```javascript
   const results = tm.querySource(whereCondition);
   const limited = results.slice(0, 1000); // Reasonable limit
   return {
       results: limited,
       totalCount: results.length,
       truncated: results.length > 1000
   };
   ```

2. **Avoid unnecessary data transformation**: Return data in a format close to the source
   ```javascript
   // Good: Return DB results directly (if structure is reasonable)
   return tm.querySource(whereCondition);
   
   // Bad: Transform every field unnecessarily
   return tus.map(tu => ({ id: tu.guid, source: tu.nsrc, ... }));
   ```

### Tool Design Philosophy

1. **Single responsibility**: Each tool should do one thing well
2. **Composable**: Design tools that can work together (e.g., query → translate)
3. **Idempotent when possible**: Same input should produce same output
4. **No side effects in queries**: Query tools shouldn't modify state
5. **Consistent naming**: Use clear, consistent naming patterns across tools
   - Use verb-noun pattern: `query_source`, `translate_segments`, `create_jobs`
   - Use consistent parameter names: `channelId`, `sourceLang`, `targetLang`

### Documentation

1. **Clear tool descriptions**: Explain what the tool does and when to use it
2. **Parameter descriptions**: Document each parameter's purpose and format
3. **Example values**: Include example values in descriptions when helpful
   ```javascript
   lang: z.string().describe('Source and target language pair in format "srcLang,tgtLang" (e.g., "en,es")')
   ```

4. **Document return structure**: Explain the shape of returned data in the tool description

