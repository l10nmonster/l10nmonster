import { nanoid } from 'nanoid';

/**
 * @typedef {'request' | 'response' | 'error' | 'init' | 'bootstrap' | 'shutdown' | 'ready' | 'log' | 'updateActiveChannels'} MessageType
 */

/**
 * @typedef {Object} RequestMessage
 * @property {'request'} type
 * @property {string} id - Unique request ID
 * @property {string} method - Method name to call
 * @property {any[]} args - Serialized arguments
 * @property {TargetInfo} target - Target DAL info
 */

/**
 * @typedef {Object} TargetInfo
 * @property {'TuDAL' | 'ChannelDAL' | 'Shard'} type
 * @property {string} [sourceLang] - For TuDAL targets
 * @property {string} [targetLang] - For TuDAL targets
 * @property {string} [channelId] - For ChannelDAL targets
 */

/**
 * @typedef {Object} ResponseMessage
 * @property {'response'} type
 * @property {string} id - Matches request ID
 * @property {any} result - Serialized return value
 */

/**
 * @typedef {Object} ErrorMessage
 * @property {'error'} type
 * @property {string} id - Matches request ID
 * @property {ErrorInfo} error
 */

/**
 * @typedef {Object} ErrorInfo
 * @property {string} message
 * @property {string} [code]
 * @property {string} [stack]
 */

/**
 * @typedef {Object} InitMessage
 * @property {'init'} type
 * @property {WorkerConfig} config
 */

/**
 * @typedef {Object} WorkerConfig
 * @property {string} dbFilename - Database filename
 * @property {number} [shardIndex] - For TM shards
 * @property {string} [sourceDBName] - For ATTACH (path to source DB)
 * @property {string} baseDir - Base directory for paths
 * @property {number} verbosity - Log verbosity level
 * @property {boolean} [bootstrapMode] - If true, start directly in bootstrap mode
 */

/**
 * @typedef {Object} BootstrapMessage
 * @property {'bootstrap'} type
 * @property {'start' | 'finalize'} action
 */

/**
 * @typedef {Object} ShutdownMessage
 * @property {'shutdown'} type
 */

/**
 * @typedef {Object} ReadyMessage
 * @property {'ready'} type
 * @property {string} [subtype] - Optional subtype (e.g., 'bootstrap', 'finalized')
 * @property {ErrorInfo} [error] - Optional error info if ready with failure
 */

/**
 * @typedef {Object} LogMessage
 * @property {'log'} type
 * @property {'error' | 'warn' | 'info' | 'verbose'} level
 * @property {string} message
 */

/**
 * @typedef {Object} UpdateActiveChannelsMessage
 * @property {'updateActiveChannels'} type
 * @property {string[]} channelIds
 */

/**
 * Generate a unique request ID.
 * @returns {string}
 */
export function generateRequestId() {
    return nanoid();
}

/**
 * Create a request message.
 * @param {string} method
 * @param {any[]} args
 * @param {TargetInfo} target
 * @returns {RequestMessage}
 */
export function createRequest(method, args, target) {
    return {
        type: 'request',
        id: generateRequestId(),
        method,
        args,
        target,
    };
}

/**
 * Create a success response message.
 * @param {string} id - Request ID
 * @param {any} result
 * @returns {ResponseMessage}
 */
export function createResponse(id, result) {
    return {
        type: 'response',
        id,
        result,
    };
}

/**
 * Create an error response message.
 * @param {string} id - Request ID
 * @param {Error} error
 * @returns {ErrorMessage}
 */
export function createErrorResponse(id, error) {
    return {
        type: 'error',
        id,
        error: {
            message: error.message,
            code: /** @type {any} */ (error).code,
            stack: error.stack,
        },
    };
}

/**
 * Create an init message.
 * @param {WorkerConfig} config
 * @returns {InitMessage}
 */
export function createInitMessage(config) {
    return {
        type: 'init',
        config,
    };
}

/**
 * Create a bootstrap message.
 * @param {'start' | 'finalize'} action
 * @returns {BootstrapMessage}
 */
export function createBootstrapMessage(action) {
    return {
        type: 'bootstrap',
        action,
    };
}

/**
 * Create a shutdown message.
 * @returns {ShutdownMessage}
 */
export function createShutdownMessage() {
    return {
        type: 'shutdown',
    };
}

/**
 * Create a ready message.
 * @param {string} [subtype]
 * @param {Error} [error] - Optional error to include
 * @returns {ReadyMessage}
 */
export function createReadyMessage(subtype, error) {
    return {
        type: 'ready',
        ...(subtype && { subtype }),
        ...(error && { error: { message: error.message, stack: error.stack } }),
    };
}

/**
 * Create a log message.
 * @param {'error' | 'warn' | 'info' | 'verbose'} level
 * @param {string} message
 * @returns {LogMessage}
 */
export function createLogMessage(level, message) {
    return {
        type: 'log',
        level,
        message,
    };
}

/**
 * Create an update active channels message.
 * @param {string[]} channelIds
 * @returns {UpdateActiveChannelsMessage}
 */
export function createUpdateActiveChannelsMessage(channelIds) {
    return {
        type: 'updateActiveChannels',
        channelIds,
    };
}
