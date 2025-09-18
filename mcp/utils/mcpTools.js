import { cliToZodSchema } from './schemaUtils.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Configures MCP tools for a given action class
 * @param {Object} server - MCP server instance
 * @param {Class} ActionClass - Action class with static help and action methods
 * @param {Object} mm - MonsterManager instance
 * @param {Map} toolHandlers - Map to store tool handlers
 */
export function configureMcpTools(server, ActionClass, mm, toolHandlers) {
    // Only process actions that have help definitions
    if (!ActionClass.help) {
        return;
    }

    const toolName = ActionClass.name;
    const zodSchema = cliToZodSchema(ActionClass.help);
    const jsonSchema = zodToJsonSchema(zodSchema);
    
    // Store tool metadata for the MCP server (tools are registered via handlers)
    if (!server._tools) {
        server._tools = new Map();
    }
    
    server._tools.set(toolName, {
        name: toolName,
        description: ActionClass.help.description,
        inputSchema: jsonSchema
    });

    // Create the tool handler
    toolHandlers.set(toolName, async (args) => {
        try {
            // Validate args with Zod before calling action
            const validatedArgs = zodSchema.parse(args);
            
            // Call custom MCP handler or default to CLI action
            let result;
            if (ActionClass.mcpAction) {
                result = await ActionClass.mcpAction(toolName, validatedArgs, mm);
            } else {
                result = await ActionClass.action(mm, validatedArgs);
                result = formatCliResultForMcp(result);
            }
            
            return result;
        } catch (error) {
            return {
                content: [{
                    type: 'text',
                    text: `Error executing ${toolName}: ${error.message}`
                }],
                isError: true
            };
        }
    });
}

/**
 * Formats CLI action result for MCP response
 * @param {*} result - Result from CLI action
 * @returns {Object} MCP-formatted response
 */
function formatCliResultForMcp(result) {
    let text;
    
    if (typeof result === 'string') {
        text = result;
    } else if (result && typeof result === 'object') {
        text = JSON.stringify(result, null, 2);
    } else {
        text = String(result);
    }
    
    return {
        content: [{
            type: 'text',
            text
        }]
    };
}