import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { registry } from '../tools/registry.js';
import { McpTool } from '../tools/mcpTool.js';
import { z } from 'zod';

// Mock tool classes for testing
class TestTool1 extends McpTool {
    static metadata = {
        name: 'test_tool_1',
        description: 'Test tool 1',
        inputSchema: z.object({})
    };

    static async execute() {
        return { result: 'test1' };
    }

    static handler() {
        return async () => this.formatResult({ result: 'test1' });
    }
}

class TestTool2 extends McpTool {
    static metadata = {
        name: 'test_tool_2',
        description: 'Test tool 2',
        inputSchema: z.object({})
    };

    static async execute() {
        return { result: 'test2' };
    }

    static handler() {
        return async () => this.formatResult({ result: 'test2' });
    }
}

class OverrideTool extends McpTool {
    static metadata = {
        name: 'test_tool_1', // Same name as TestTool1
        description: 'Override tool',
        inputSchema: z.object({})
    };

    static async execute() {
        return { result: 'override' };
    }

    static handler() {
        return async () => this.formatResult({ result: 'override' });
    }
}

describe('MCP Registry', () => {
    beforeEach(() => {
        // Clear registry before each test
        registry.clear();
    });

    it('should register a single tool', () => {
        registry.registerTool(TestTool1);
        
        assert.strictEqual(registry.hasTool('test_tool_1'), true);
        assert.strictEqual(registry.getTool('test_tool_1'), TestTool1);
    });

    it('should register multiple tools', () => {
        registry.registerTools([TestTool1, TestTool2]);
        
        assert.strictEqual(registry.hasTool('test_tool_1'), true);
        assert.strictEqual(registry.hasTool('test_tool_2'), true);
        
        const allTools = registry.getAllTools();
        assert.strictEqual(allTools.length, 2);
    });

    it('should override existing tool with same name', () => {
        registry.registerTool(TestTool1);
        registry.registerTool(OverrideTool);
        
        const tool = registry.getTool('test_tool_1');
        assert.strictEqual(tool, OverrideTool);
        assert.notStrictEqual(tool, TestTool1);
    });

    it('should return all registered tools', () => {
        registry.registerTools([TestTool1, TestTool2]);
        
        const allTools = registry.getAllTools();
        assert.strictEqual(allTools.length, 2);
        assert.ok(allTools.includes(TestTool1));
        assert.ok(allTools.includes(TestTool2));
    });

    it('should return undefined for non-existent tool', () => {
        const tool = registry.getTool('non_existent');
        assert.strictEqual(tool, undefined);
    });

    it('should return false for non-existent tool check', () => {
        assert.strictEqual(registry.hasTool('non_existent'), false);
    });

    it('should clear all registered tools', () => {
        registry.registerTools([TestTool1, TestTool2]);
        assert.strictEqual(registry.getAllTools().length, 2);
        
        registry.clear();
        assert.strictEqual(registry.getAllTools().length, 0);
    });

    it('should throw error for invalid tool class', () => {
        assert.throws(
            () => registry.registerTool(null),
            /ToolClass must be a class\/function/
        );
        
        assert.throws(
            () => registry.registerTool('not a class'),
            /ToolClass must be a class\/function/
        );
    });

    it('should throw error for tool without metadata', () => {
        class InvalidTool {}
        
        assert.throws(
            () => registry.registerTool(InvalidTool),
            /must have static metadata property/
        );
    });

    it('should throw error for tool without name in metadata', () => {
        class InvalidTool {
            static metadata = {
                description: 'No name'
            };
        }
        
        assert.throws(
            () => registry.registerTool(InvalidTool),
            /metadata must have a string 'name' property/
        );
    });

    it('should throw error for tool without handler method', () => {
        class InvalidTool {
            static metadata = {
                name: 'invalid',
                description: 'No handler'
            };
        }
        
        assert.throws(
            () => registry.registerTool(InvalidTool),
            /must have static handler method/
        );
    });

    it('should throw error when registerTools receives non-array', () => {
        assert.throws(
            () => registry.registerTools('not an array'),
            /toolClasses must be an array/
        );
    });
});

