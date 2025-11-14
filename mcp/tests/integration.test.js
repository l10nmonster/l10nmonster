import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { registerTool, McpTool, McpInputError } from '../index.js';
import { registry } from '../tools/registry.js';
import { z } from 'zod';

// Create a custom tool for testing
class CustomTestTool extends McpTool {
    static metadata = {
        name: 'custom_test_tool',
        description: 'A custom tool for integration testing',
        inputSchema: z.object({
            message: z.string().describe('A test message')
        })
    };

    static async execute(mm, args) {
        return {
            tool: 'custom_test_tool',
            message: args.message,
            timestamp: new Date().toISOString()
        };
    }
}

// Create a tool that overrides a built-in tool name
class OverrideStatusTool extends McpTool {
    static metadata = {
        name: 'status',
        description: 'Custom status tool override',
        inputSchema: z.object({})
    };

    static async execute() {
        return { custom: true, overridden: true };
    }
}

describe('MCP Integration Tests', () => {
    beforeEach(() => {
        registry.clear();
    });

    it('should allow registering and using custom tools', async () => {
        // Register the custom tool
        registerTool(CustomTestTool);
        
        // Verify it's registered
        assert.strictEqual(registry.hasTool('custom_test_tool'), true);
        
        // Get the tool and create a handler
        const ToolClass = registry.getTool('custom_test_tool');
        const handler = ToolClass.handler({});
        
        // Execute the handler
        const result = await handler({ message: 'Hello from custom tool' });
        
        // Verify the result
        assert.ok(result.content);
        assert.strictEqual(result.content[0].type, 'text');
        const data = JSON.parse(result.content[0].text);
        assert.strictEqual(data.tool, 'custom_test_tool');
        assert.strictEqual(data.message, 'Hello from custom tool');
    });

    it('should allow overriding built-in tools', () => {
        // Register an override tool
        registerTool(OverrideStatusTool);
        
        // Verify it's registered with the same name
        assert.strictEqual(registry.hasTool('status'), true);
        
        // Get the tool and verify it's the override
        const ToolClass = registry.getTool('status');
        assert.strictEqual(ToolClass.metadata.description, 'Custom status tool override');
    });

    it('should handle tool execution errors gracefully', async () => {
        class ErrorTool extends McpTool {
            static metadata = {
                name: 'error_tool',
                description: 'Tool that throws errors',
                inputSchema: z.object({
                    shouldError: z.boolean()
                })
            };

            static async execute(mm, args) {
                if (args.shouldError) {
                    throw new McpInputError('Test error', {
                        hints: ['Try setting shouldError to false']
                    });
                }
                return { success: true };
            }
        }

        registerTool(ErrorTool);
        
        const ToolClass = registry.getTool('error_tool');
        const handler = ToolClass.handler({});
        
        // Execute with error
        const errorResult = await handler({ shouldError: true });
        
        // Verify error response
        assert.strictEqual(errorResult.isError, true);
        assert.ok(errorResult.content);
        assert.ok(errorResult.content[0].text.includes('Test error'));
        
        // Execute without error
        const successResult = await handler({ shouldError: false });
        
        // Verify success response
        assert.strictEqual(successResult.isError, undefined);
        const data = JSON.parse(successResult.content[0].text);
        assert.strictEqual(data.success, true);
    });

    it('should validate input schemas', async () => {
        class StrictTool extends McpTool {
            static metadata = {
                name: 'strict_tool',
                description: 'Tool with strict validation',
                inputSchema: z.object({
                    required: z.string().min(1),
                    optional: z.number().optional()
                })
            };

            static async execute(mm, args) {
                return args;
            }
        }

        registerTool(StrictTool);
        
        const ToolClass = registry.getTool('strict_tool');
        const handler = ToolClass.handler({});
        
        // Test with missing required field
        const invalidResult = await handler({});
        assert.strictEqual(invalidResult.isError, true);
        
        // Test with valid input
        const validResult = await handler({ required: 'test' });
        assert.strictEqual(validResult.isError, undefined);
        const data = JSON.parse(validResult.content[0].text);
        assert.strictEqual(data.required, 'test');
    });

    it('should support multiple tool registrations via function', () => {
        class Tool1 extends McpTool {
            static metadata = {
                name: 'tool_1',
                description: 'First tool',
                inputSchema: z.object({})
            };
            static async execute() { return { id: 1 }; }
        }

        class Tool2 extends McpTool {
            static metadata = {
                name: 'tool_2',
                description: 'Second tool',
                inputSchema: z.object({})
            };
            static async execute() { return { id: 2 }; }
        }

        class Tool3 extends McpTool {
            static metadata = {
                name: 'tool_3',
                description: 'Third tool',
                inputSchema: z.object({})
            };
            static async execute() { return { id: 3 }; }
        }

        // Register tools individually
        registerTool(Tool1);
        registerTool(Tool2);
        registerTool(Tool3);
        
        // Verify all are registered
        assert.strictEqual(registry.getAllTools().length, 3);
        assert.strictEqual(registry.hasTool('tool_1'), true);
        assert.strictEqual(registry.hasTool('tool_2'), true);
        assert.strictEqual(registry.hasTool('tool_3'), true);
    });

    it('should maintain tool isolation between registrations', () => {
        class IsolatedTool extends McpTool {
            static metadata = {
                name: 'isolated',
                description: 'Isolated tool',
                inputSchema: z.object({})
            };
            static async execute() { return { isolated: true }; }
        }

        // Register tool
        registerTool(IsolatedTool);
        assert.strictEqual(registry.getAllTools().length, 1);
        
        // Clear registry
        registry.clear();
        assert.strictEqual(registry.getAllTools().length, 0);
        
        // Register again
        registerTool(IsolatedTool);
        assert.strictEqual(registry.getAllTools().length, 1);
    });
});

