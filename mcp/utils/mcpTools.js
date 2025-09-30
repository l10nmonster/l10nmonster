import { cliToZodSchema } from './schemaUtils.js';
import { z } from 'zod';


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

/**
 * Convert action class to an  MCP tools for a given action class
 * @param {Class} ActionClass - Action class with static help and action methods
 * @param {Object} mm - MonsterManager instance
 */
export function convertToMcpTool(ActionClass, mm) {
    // Only process actions that have help definitions
    if (!ActionClass.help) {
        console.warn(`Action ${ActionClass.name} does not have help defined, skipping...`);
        return;
    }

    const toolName = ActionClass.name;
    const zodSchema = cliToZodSchema(ActionClass.help);
    

    // Create the tool handler
    const handler = async (args) => {
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
            let text = `Error executing ${toolName}: ${error.message}`;
            if (error instanceof z.ZodError) {
                const details = error.issues?.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
                if (details) text += ` | ${details}`;
            }
            return {
                content: [{
                    type: 'text',
                    text
                }],
                isError: true
            };
        }
    };


    return {
        name: toolName,
        description: ActionClass.help.description,
        inputSchema: zodSchema,
        handler
    }
}
