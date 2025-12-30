import { Worker } from 'node:worker_threads';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getBaseDir, getVerbosity, logError, logWarn, logInfo, logVerbose } from '../l10nContext.js';
import {
    createInitMessage,
    createBootstrapMessage,
    createShutdownMessage,
    createUpdateActiveChannelsMessage,
} from './messageProtocol.js';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * @typedef {import('./messageProtocol.js').ResponseMessage} ResponseMessage
 * @typedef {import('./messageProtocol.js').ErrorMessage} ErrorMessage
 * @typedef {import('./messageProtocol.js').LogMessage} LogMessage
 * @typedef {import('./messageProtocol.js').ReadyMessage} ReadyMessage
 */

const INIT_TIMEOUT = 10000;      // 10s for worker to start (should be fast)
const SHUTDOWN_TIMEOUT = 5000;   // 5s for graceful shutdown (then force terminate)

/**
 * Manages worker threads for DAL operations.
 */
export class WorkerManager {
    #tmWorkers = new Map();  // shardIndex → Worker
    #tmWorkersPending = new Map();  // shardIndex → Promise (for pending spawns)
    #pendingRequests = new Map();  // requestId → { resolve, reject, worker }
    #sourceDBFilename;
    #tmDBFilenames;
    #shardMap;
    #activeChannels;

    /**
     * @param {Object} config
     * @param {string} config.sourceDBFilename - Used for TM worker ATTACH
     * @param {Map<number, string>} config.tmDBFilenames
     * @param {Map<string, number>} config.shardMap
     * @param {Set<string>} activeChannels
     */
    constructor(config, activeChannels) {
        this.#sourceDBFilename = config.sourceDBFilename;
        this.#tmDBFilenames = config.tmDBFilenames;
        this.#shardMap = config.shardMap;
        this.#activeChannels = activeChannels;
    }

    /**
     * Get or spawn a TM worker for a shard.
     * Uses pending map to prevent race conditions when multiple requests
     * for the same shard arrive concurrently.
     * @param {number} shardIndex
     * @returns {Promise<Worker>}
     */
    async getTmWorker(shardIndex) {
        // Return existing worker if available
        if (this.#tmWorkers.has(shardIndex)) {
            return this.#tmWorkers.get(shardIndex);
        }

        // If spawn is already in progress, wait for it
        if (this.#tmWorkersPending.has(shardIndex)) {
            await this.#tmWorkersPending.get(shardIndex);
            return this.#tmWorkers.get(shardIndex);
        }

        // Start spawn and track the promise to prevent duplicate spawns
        const spawnPromise = (async () => {
            const dbFilename = this.#tmDBFilenames.get(shardIndex) ?? this.#tmDBFilenames.get(0);
            const sourceDBName = (dbFilename !== this.#sourceDBFilename && this.#sourceDBFilename !== ':memory:') ?
                this.#sourceDBFilename :
                null;

            const worker = await this.#spawnWorker('tm', {
                dbFilename,
                shardIndex,
                sourceDBName,
                baseDir: getBaseDir(),
                verbosity: getVerbosity(),
            });

            // Update active channels
            worker.postMessage(createUpdateActiveChannelsMessage(Array.from(this.#activeChannels)));

            this.#tmWorkers.set(shardIndex, worker);
        })();

        this.#tmWorkersPending.set(shardIndex, spawnPromise);
        try {
            await spawnPromise;
        } finally {
            this.#tmWorkersPending.delete(shardIndex);
        }

        return this.#tmWorkers.get(shardIndex);
    }

    /**
     * Get the shard index for a language pair.
     * @param {string} sourceLang
     * @param {string} targetLang
     * @returns {number}
     */
    getShardIndex(sourceLang, targetLang) {
        return this.#shardMap.get(`${sourceLang}#${targetLang}`) ?? 0;
    }

    /**
     * Spawn a TM worker and wait for it to be ready.
     * @param {'tm'} type
     * @param {Object} config
     * @returns {Promise<Worker>}
     */
    async #spawnWorker(type, config) {
        const workerPath = path.join(moduleDir, 'workers', 'tmShardWorker.js');

        const worker = new Worker(workerPath);

        // Allow parent process to exit even if this worker is still running
        worker.unref();

        // Wait for worker to be ready with timeout
        /* eslint-disable no-use-before-define */
        await new Promise((resolve, reject) => {

            /** @type {NodeJS.Timeout | undefined} */
            let timeoutId;

            const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId);
                worker.off('message', onMessage);
                worker.off('error', onError);
                worker.off('exit', onExit);
            };

            const onMessage = (/** @type {any} */ msg) => {
                if (msg.type === 'ready') {
                    cleanup();
                    if (msg.error) {
                        const err = new Error(msg.error.message);
                        err.stack = msg.error.stack;
                        reject(err);
                    } else {
                        resolve(undefined);
                    }
                } else if (msg.type === 'log') {
                    this.#forwardLog(msg);
                }
            };

            const onError = (/** @type {Error} */ err) => {
                cleanup();
                reject(err);
            };

            const onExit = (/** @type {number} */ code) => {
                cleanup();
                reject(new Error(`Worker ${type} exited during initialization with code ${code}`));
            };

            timeoutId = setTimeout(() => {
                cleanup();
                worker.terminate();
                reject(new Error(`Worker ${type} initialization timeout`));
            }, INIT_TIMEOUT);

            worker.on('message', onMessage);
            worker.on('error', onError);
            worker.once('exit', onExit);
            worker.postMessage(createInitMessage(config));
        });
        /* eslint-enable no-use-before-define */

        // Set up permanent message handler for responses and logs
        worker.on('message', (msg) => {
            if (msg.type === 'response' || msg.type === 'error') {
                this.#handleResponse(msg);
            } else if (msg.type === 'log') {
                this.#forwardLog(msg);
            }
        });

        worker.on('error', (/** @type {Error} */ err) => {
            logError`Worker error: ${err.message}`;
        });

        // Handle unexpected worker exit - reject all pending requests for this worker
        worker.on('exit', (/** @type {number} */ code) => {
            if (code !== 0) {
                logError`Worker ${type} exited unexpectedly with code ${code}`;
            }
            this.#rejectPendingRequestsForWorker(worker, code);
        });

        logVerbose`Worker ${type}${config.shardIndex !== undefined ? ` shard ${config.shardIndex}` : ''} spawned and ready`;
        return worker;
    }

    /**
     * Reject all pending requests for a specific worker.
     * @param {Worker} worker
     * @param {number} code
     */
    #rejectPendingRequestsForWorker(worker, code) {
        for (const [id, pending] of this.#pendingRequests.entries()) {
            if (pending.worker === worker) {
                pending.reject(new Error(`Worker exited unexpectedly with code ${code}`));
                this.#pendingRequests.delete(id);
            }
        }
    }

    /**
     * Handle a response message from a worker.
     * @param {ResponseMessage | ErrorMessage} msg
     */
    #handleResponse(msg) {
        const pending = this.#pendingRequests.get(msg.id);
        if (pending) {
            this.#pendingRequests.delete(msg.id);
            if (msg.type === 'error') {
                const err = new Error(msg.error.message);
                err.stack = msg.error.stack;
                pending.reject(err);
            } else {
                pending.resolve(msg.result);
            }
        }
    }

    /**
     * Forward a log message from a worker.
     * @param {LogMessage} msg
     */
    #forwardLog(msg) {
        const logFns = { error: logError, warn: logWarn, info: logInfo, verbose: logVerbose };
        const logFn = logFns[msg.level] ?? logInfo;
        logFn`[Worker] ${msg.message}`;
    }

    /**
     * Send a request to a worker and wait for a response.
     * No timeout - matches direct mode behavior. Crash detection via 'exit' event.
     * @param {Worker} worker
     * @param {Object} request - Request message
     * @returns {Promise<any>}
     */
    sendRequest(worker, request) {
        return new Promise((resolve, reject) => {
            this.#pendingRequests.set(request.id, { resolve, reject, worker });
            worker.postMessage(request);
        });
    }

    /**
     * Run a callback in bootstrap mode across all TM workers.
     * Spawns all configured TM shard workers directly in bootstrap mode.
     * @template T
     * @param {() => Promise<T>} callback
     * @returns {Promise<T>}
     */
    async withBootstrapMode(callback) {
        // Spawn all configured TM shard workers directly in bootstrap mode
        // Workers start with initBootstrap() which deletes existing DB and uses MEMORY journal
        const shardIndices = Array.from(this.#tmDBFilenames.keys());
        for (const shardIndex of shardIndices) {
            await this.#spawnTmWorkerForBootstrap(shardIndex);
        }

        try {
            return await callback();
        } finally {
            // Finalize bootstrap on workers sequentially to avoid locking issues
            // (each worker may have the source DB attached, causing conflicts if done in parallel)
            for (const worker of this.#tmWorkers.values()) {
                worker.postMessage(createBootstrapMessage('finalize'));
                await this.#waitForReady(worker, 'finalized');
            }
        }
    }

    /**
     * Spawn a TM worker directly in bootstrap mode.
     * @param {number} shardIndex
     * @returns {Promise<Worker>}
     */
    async #spawnTmWorkerForBootstrap(shardIndex) {
        // If worker already exists, send bootstrap start instead
        if (this.#tmWorkers.has(shardIndex)) {
            const worker = this.#tmWorkers.get(shardIndex);
            worker.postMessage(createBootstrapMessage('start'));
            await this.#waitForReady(worker, 'bootstrap');
            return worker;
        }

        const dbFilename = this.#tmDBFilenames.get(shardIndex) ?? this.#tmDBFilenames.get(0);
        const sourceDBName = (dbFilename !== this.#sourceDBFilename && this.#sourceDBFilename !== ':memory:') ?
            this.#sourceDBFilename :
            null;

        const worker = await this.#spawnWorker('tm', {
            dbFilename,
            shardIndex,
            sourceDBName,
            baseDir: getBaseDir(),
            verbosity: getVerbosity(),
            bootstrapMode: true,  // Start directly in bootstrap mode
        });

        // Update active channels
        worker.postMessage(createUpdateActiveChannelsMessage(Array.from(this.#activeChannels)));

        this.#tmWorkers.set(shardIndex, worker);
        return worker;
    }

    /**
     * Wait for a ready message with a specific subtype.
     * No timeout - matches direct mode behavior. Handles crash via 'exit' event.
     * @param {Worker} worker
     * @param {string} subtype
     * @returns {Promise<void>}
     */
    #waitForReady(worker, subtype) {
        /* eslint-disable no-use-before-define */
        return new Promise((resolve, reject) => {
            const onMessage = (/** @type {any} */ msg) => {
                if (msg.type === 'ready' && msg.subtype === subtype) {
                    worker.off('message', onMessage);
                    worker.off('exit', onExit);
                    if (msg.error) {
                        const err = new Error(msg.error.message);
                        err.stack = msg.error.stack;
                        reject(err);
                    } else {
                        resolve(undefined);
                    }
                }
            };
            const onExit = (/** @type {number} */ code) => {
                worker.off('message', onMessage);
                reject(new Error(`Worker exited during ${subtype} with code ${code}`));
            };
            worker.on('message', onMessage);
            worker.once('exit', onExit);
        });
        /* eslint-enable no-use-before-define */
    }

    /**
     * Shutdown all workers with timeout.
     * @returns {Promise<void>}
     */
    async shutdown() {

        /** @param {Worker} worker */
        const shutdownWorker = (worker) => new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                worker.terminate();  // Force terminate if doesn't exit gracefully
                resolve(undefined);
            }, SHUTDOWN_TIMEOUT);

            worker.once('exit', () => {
                clearTimeout(timeoutId);
                resolve(undefined);
            });
            worker.postMessage(createShutdownMessage());
        });

        const shutdownPromises = [];

        for (const worker of this.#tmWorkers.values()) {
            shutdownPromises.push(shutdownWorker(worker));
        }

        await Promise.all(shutdownPromises);

        // Clean up listeners and force terminate to close MessagePort
        const terminatePromises = [];
        for (const [idx, worker] of this.#tmWorkers.entries()) {
            worker.removeAllListeners();
            const p = worker.terminate();
            terminatePromises.push(p.then((code) => logVerbose`TM worker ${idx} terminate completed with code ${code}`)
                .catch((e) => logVerbose`TM worker ${idx} terminate error: ${e.message}`));
        }
        await Promise.all(terminatePromises);

        // Clear pending requests
        for (const pending of this.#pendingRequests.values()) {
            pending.reject(new Error('Worker shutdown'));
        }
        this.#pendingRequests.clear();

        this.#tmWorkers.clear();
        logVerbose`All TM workers shut down`;

        // Debug: log what's keeping the process alive
        if (process.env.L10N_DEBUG_HANDLES) {
            /* eslint-disable no-underscore-dangle */
            setImmediate(() => {
                const handles = /** @type {any} */ (process)._getActiveHandles();
                const requests = /** @type {any} */ (process)._getActiveRequests();
                logVerbose`Active handles after shutdown: ${handles.length}`;
                for (const h of handles) {
                    let info = h.constructor.name;
                    if (h._idleTimeout) info += ` (timeout: ${h._idleTimeout}ms)`;
                    if (h.fd !== undefined) info += ` (fd: ${h.fd})`;
                    if (h.address) info += ` (addr: ${JSON.stringify(h.address())})`;
                    logVerbose`  Handle: ${info}`;
                }
                if (requests.length > 0) {
                    logVerbose`Active requests: ${requests.length}`;
                }
            });
            /* eslint-enable no-underscore-dangle */
        }
    }

    /**
     * Get the list of active TM shard indices.
     * @returns {number[]}
     */
    getActiveTmShardIndices() {
        return Array.from(this.#tmWorkers.keys());
    }

    /**
     * Get all configured TM DB filenames.
     * @returns {Map<number, string>}
     */
    get tmDBFilenames() {
        return this.#tmDBFilenames;
    }
}
