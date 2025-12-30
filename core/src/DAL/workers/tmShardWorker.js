import { parentPort } from 'node:worker_threads';
import { TmShard } from '../tmShard.js';
import { setBaseDir, setVerbosity } from '../../l10nContext.js';
import { createResponse, createErrorResponse, createReadyMessage, createLogMessage } from '../messageProtocol.js';

/**
 * @typedef {import('../messageProtocol.js').RequestMessage} RequestMessage
 */

let shard = null;
let shardIndex = 0;
let activeChannels = new Set();

// Forward console.log to parent as log messages
console.log = (...args) => parentPort.postMessage(createLogMessage('info', args.join(' ')));
console.error = (...args) => parentPort.postMessage(createLogMessage('error', args.join(' ')));
console.warn = (...args) => parentPort.postMessage(createLogMessage('warn', args.join(' ')));

// Mock DAL manager for TuDAL (since we're in a worker, we can't access the real one)
const mockDALManager = {
    activeChannels,
    channel: (channelId) => {
        // For cross-shard queries, TuDAL uses ATTACH to access source DB directly
        // This mock is only used for activeChannels check
        throw new Error(`Cannot access channel ${channelId} from TM worker - use ATTACH queries instead`);
    },
};

// eslint-disable-next-line no-use-before-define
parentPort.on('message', async (msg) => {
    try {
        switch (msg.type) {
            case 'init':
                await handleInit(msg.config);
                break;
            case 'request':
                await handleRequest(msg);
                break;
            case 'bootstrap':
                await handleBootstrap(msg);
                break;
            case 'updateActiveChannels':
                activeChannels = new Set(msg.channelIds);
                mockDALManager.activeChannels = activeChannels;
                break;
            case 'shutdown':
                handleShutdown();
                break;
            default:
                parentPort.postMessage(createLogMessage('warn', `Unknown message type: ${msg.type}`));
        }
    } catch (error) {
        parentPort.postMessage(createLogMessage('error', `Worker error: ${error.message}`));
        if (msg.id) {
            parentPort.postMessage(createErrorResponse(msg.id, error));
        } else if (msg.type === 'init') {
            // Send ready with error so main thread doesn't hang waiting
            parentPort.postMessage(createReadyMessage(undefined, /** @type {Error} */ (error)));
        }
    }
});

/**
 * Initialize the TM shard.
 * @param {Object} config
 */
async function handleInit(config) {
    const { dbFilename, shardIndex: idx, sourceDBName, baseDir, verbosity, bootstrapMode } = config;
    shardIndex = idx ?? 0;

    setBaseDir(baseDir);
    setVerbosity(verbosity);

    shard = new TmShard(shardIndex, dbFilename, sourceDBName);

    if (bootstrapMode) {
        // Start directly in bootstrap mode - deletes existing DB and uses MEMORY journal
        await shard.initBootstrap();
        parentPort.postMessage(createLogMessage('verbose', `TM shard ${shardIndex} worker initialized in bootstrap mode with ${dbFilename}`));
    } else {
        shard.init();
        parentPort.postMessage(createLogMessage('verbose', `TM shard ${shardIndex} worker initialized with ${dbFilename}`));
    }

    parentPort.postMessage(createReadyMessage());
}

/**
 * Handle a method call request.
 * @param {RequestMessage} msg
 */
async function handleRequest(msg) {
    const { id, method, args, target } = msg;

    if (!shard) {
        parentPort.postMessage(createErrorResponse(id, new Error('Shard not initialized')));
        return;
    }

    try {
        let result;

        if (target.type === 'TuDAL') {
            // Get TuDAL for the language pair
            const tuDAL = shard.getTuDAL(target.sourceLang, target.targetLang, mockDALManager);
            if (typeof tuDAL[method] !== 'function') {
                throw new Error(`Unknown TuDAL method: ${method}`);
            }
            result = await tuDAL[method](...args);
        } else if (target.type === 'Shard') {
            // Direct shard method call
            if (method === 'getAvailableLangPairs') {
                result = await shard.getAvailableLangPairs(mockDALManager);
            } else if (typeof shard[method] !== 'function') {
                throw new Error(`Unknown TmShard method: ${method}`);
            } else {
                result = await shard[method](...args);
            }
        } else {
            throw new Error(`Unknown target type: ${target.type}`);
        }

        parentPort.postMessage(createResponse(id, result));
    } catch (error) {
        parentPort.postMessage(createErrorResponse(id, error));
    }
}

/**
 * Handle bootstrap mode messages.
 * @param {Object} msg
 */
async function handleBootstrap(msg) {
    if (!shard) {
        parentPort.postMessage(createLogMessage('error', 'Cannot bootstrap: shard not initialized'));
        return;
    }

    try {
        if (msg.action === 'start') {
            await shard.initBootstrap();
            parentPort.postMessage(createLogMessage('verbose', `TM shard ${shardIndex} entered bootstrap mode`));
            parentPort.postMessage(createReadyMessage('bootstrap'));
        } else if (msg.action === 'finalize') {
            shard.finalizeBootstrap();
            parentPort.postMessage(createLogMessage('verbose', `TM shard ${shardIndex} finalized bootstrap mode`));
            parentPort.postMessage(createReadyMessage('finalized'));
        }
    } catch (error) {
        parentPort.postMessage(createLogMessage('error', `Bootstrap ${msg.action} failed: ${error.message}`));
        // Send ready message with error so main thread can reject
        const subtype = msg.action === 'start' ? 'bootstrap' : 'finalized';
        parentPort.postMessage(createReadyMessage(subtype, /** @type {Error} */ (error)));
    }
}

/**
 * Shutdown the worker.
 */
function handleShutdown() {
    if (shard) {
        shard.shutdown();
        shard = null;
    }
    parentPort.postMessage(createLogMessage('verbose', `TM shard ${shardIndex} worker shutting down`));
    process.exit(0);
}
