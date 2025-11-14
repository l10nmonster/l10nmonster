/**
 * MCP Tool Registry
 * 
 * Provides a registration mechanism for extending MCP with custom tools.
 * External packages can register their own McpTool subclasses which will be
 * automatically discovered and registered when the MCP server starts.
 */

class Registry {
    constructor() {
        this.registeredTools = new Map(); // toolName -> ToolClass
    }

    registerTool(ToolClass) {
        if (!ToolClass || typeof ToolClass !== 'function') {
            throw new Error('registerTool: ToolClass must be a class/function');
        }

        if (!ToolClass.metadata || typeof ToolClass.metadata !== 'object') {
            throw new Error(`registerTool: ${ToolClass.name} must have static metadata property`);
        }

        if (!ToolClass.metadata.name || typeof ToolClass.metadata.name !== 'string') {
            throw new Error(`registerTool: ${ToolClass.name} metadata must have a string 'name' property`);
        }

        if (typeof ToolClass.handler !== 'function') {
            throw new Error(`registerTool: ${ToolClass.name} must have static handler method`);
        }

        const toolName = ToolClass.metadata.name;
        
        if (this.registeredTools.has(toolName)) {
            console.warn(`MCP tool "${toolName}" is already registered. Overwriting with new implementation.`);
        }

        this.registeredTools.set(toolName, ToolClass);
        console.info(`Registered MCP tool: ${toolName}`);
    }

    registerTools(toolClasses) {
        if (!Array.isArray(toolClasses)) {
            throw new Error('registerTools: toolClasses must be an array');
        }

        for (const ToolClass of toolClasses) {
            this.registerTool(ToolClass);
        }
    }

    getAllTools() {
        return Array.from(this.registeredTools.values());
    }

    getTool(toolName) {
        return this.registeredTools.get(toolName);
    }

    hasTool(toolName) {
        return this.registeredTools.has(toolName);
    }

    clear() {
        this.registeredTools.clear();
    }
}

export const registry = new Registry();

