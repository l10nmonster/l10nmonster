/**
 * Central type definitions for @l10nmonster/server
 * This is the single source of truth for server-related interfaces.
 */

/**
 * Express-compatible route handler function.
 */
export type RouteHandler = (req: unknown, res: unknown) => Promise<void> | void;

/**
 * Route definition tuple: [method, path, handler].
 * Method is HTTP method (get, post, put, delete, etc.).
 */
export type RouteDefinition = [string, string, RouteHandler];

/**
 * Server extension route factory function.
 * Creates routes for a server extension given a MonsterManager instance.
 */
export type ServerExtensionRouteMaker = (mm: unknown) => RouteDefinition[];
