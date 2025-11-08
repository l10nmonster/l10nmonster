import { createMcpRoutes } from './server.js';

/**
 * Register MCP routes with the serve action extension mechanism.
 * This allows MCP to be served alongside the main L10n Monster server.
 * 
 * @param {typeof import('@l10nmonster/server').default} ServeAction - The ServeAction class from @l10nmonster/server
 */
export function register(ServeAction) {
    ServeAction.registerExtension('mcp', createMcpRoutes, '/');
}