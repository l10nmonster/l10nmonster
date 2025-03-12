// Core Interfaces

/**
 * @typedef {Object} Segment
 * @property {string} sid - The segment ID.
 * @property {string} str - The translatable string.
 * @property {string} [notes] - Optional notes associated with the segment.
 * @property {boolean} [isSuffixPluralized] - Indicates if the segment is pluralized.
 */

/**
 * @typedef {string | { t: string; v: string; s: string }} Part
 */

/**
 * @typedef {Object}  SourceAdapter
 * @property {function(): Promise<{ id: string; modified: string }[]>} fetchResourceStats - Fetches resource statistics.
 * @property {function(string): Promise<any>} fetchResource - Fetches a specific resource.
 */

/**
 * @typedef {Object}  TargetAdapter
 * @property {function(string, string): any} translatedResourceId - Retrieves the translated resource ID.
 * @property {function(string, string): Promise<any>} fetchTranslatedResource - Fetches a translated resource.
 * @property {function(string, string, string): Promise<void>} commitTranslatedResource - Commits a translated resource.
 */

/**
 * @typedef {Object} ResourceFilter
 *
 * @property {function(): Promise<{ id: string; modified: string }[]>} fetchResourceStats - Fetches resource statistics.
 * @property {function(string): Promise<any>} fetchResource - Fetches a specific resource.
 */

/**
 * @interface SnapStore
 * @property {function(): Promise<void>} startSnapshot - Starts a snapshot.
 * @property {function(prj: any, chunk: any, resources: any): Promise<void>} commitResources - Commits resources.
 * @property {function(): Promise<void>} endSnapshot - Ends a snapshot.
 * @property {function(): Promise<any>} getResourceStats - Retrieves resource statistics.
 * @property {function(rs: any): Promise<any>} getResource - Retrieves a specific resource.
 * @property {function(): {}} getAllResources - Retrieves all resources.
 */

export { L10nContext, consoleLog } from './src/l10nContext.js';
export { TU } from './src/entities/tu.js';
export { L10nMonsterConfig, ChannelConfig, ResourceFormatConfig, MessageFormatConfig } from './src/l10nMonsterConfig.js';
export { MonsterManager } from './src/monsterManager/index.js';
export { OpsMgr } from './src/opsMgr.js';

export * from './src/helpers/index.js';
export * as actions from './src/actions/index.js';
