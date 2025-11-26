// Core Interfaces

/**
 * @typedef {Object} Segment
 * @property {string} sid - The segment ID.
 * @property {string} str - The translatable string.
 * @property {string} [notes] - Optional notes associated with the segment.
 * @property {string} [pluralForm] - If the segment is pluralized, this is the form of the plural (one, other, zero, two, few, many).
 */

/**
 * @typedef {string | { t: string; v: string; s: string }} Part
 */

/**
 * @typedef {Object}  SourceAdapter
 * @property {function(): AsyncGenerator<[Object, string]>} fetchAllResources - Fetches all resources.
 */

/**
 * @typedef {Object}  TargetAdapter
 * @property {function(string, string): any} translatedResourceId - Retrieves the translated resource ID.
 * @property {function(string, string): Promise<any>} fetchTranslatedResource - Fetches a translated resource.
 * @property {function(string, string, string): Promise<void>} commitTranslatedResource - Commits a translated resource.
 */

/**
 * @typedef {Object} TMStore
 * @property {string} id - The logical id of this store instance.
 * @property {string} access - The store access permissions (readwrite/readonly/writeonly).
 * @property {string} partitioning - The partitioning strategy of the store.
 */

/**
 * @typedef {Object} SnapStore
 * @property {string} id - The logical id of this store instance.
 */

/**
 * @typedef {import('./src/entities/channel.js').Channel} Channel
 */

/**
 * @typedef {import('./src/entities/formatHandler.js').FormatHandler} FormatHandler
 */

/**
 * @typedef {import('./src/entities/normalizer.js').Normalizer} Normalizer
 */

/**
 * @typedef {import('./src/entities/resourceHandle.js').ResourceHandle} ResourceHandle
 */

export { consoleLog, logError, logWarn, logInfo, logVerbose, styleString, setVerbosity, getVerbosity, setRegressionMode, getRegressionMode, setBaseDir, getBaseDir } from './src/l10nContext.js';
export { TU } from './src/entities/tu.js';
export { L10nMonsterConfig, ChannelConfig, ResourceFormatConfig, MessageFormatConfig, config } from './src/l10nMonsterConfig.js';
export { MonsterManager } from './src/monsterManager/index.js';
export * as opsManager from './src/opsManager/index.js';

export * from './src/helpers/index.js';
export * as actions from './src/actions/index.js';

export { requiredPluralForms } from './src/requiredPluralForms.js';

import packageJson from './package.json' with { type: 'json' };
export const coreVersion = packageJson.version;