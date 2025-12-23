import { logInfo } from '../l10nContext.js';
import { createOp } from './index.js';

/**
 * @typedef {import('../interfaces.js').OpsStoreInterface} OpsStoreInterface
 */

/**
 * Callback function for an operation.
 * @callback OpCallback
 * @param {Op} op - The operation instance.
 * @returns {Promise<unknown>} The operation result.
 */

/**
 * Represents an operation in the task execution system.
 * Operations can have dependencies on other operations and execute asynchronously.
 */
export default class Op {

    /** @type {number | undefined} Unique identifier for this operation within a task. */
    opId;

    /** @type {string} Name of the operation (used for registry lookup). */
    opName;

    /** @type {Record<string, unknown>} Arguments passed to the operation callback. */
    args;

    /** @type {string} Current state: 'pending', 'done', 'error', or custom blocking state. */
    state = 'pending'; // Predefined states are: pending, done, error. Any other state is considered blocking (run once after rehydration)
    /** @type {unknown} Output from the operation execution. */
    output;

    /** @type {string | undefined} ISO timestamp of last execution. */
    lastRanAt;

    /** @type {OpCallback} */
    #callback;

    /** @type {Op[]} */
    #inputs = [];

    /** @type {import('./task.js').default | undefined} */
    #parentTask;

    /**
     * Creates a new operation.
     * @param {string} opName - Name of the operation.
     * @param {OpCallback} callback - Function to execute for this operation.
     */
    constructor(opName, callback) {
        this.opName = opName;
        this.#callback = callback;
    }

    /**
     * Gets the IDs of all input dependency operations.
     * @returns {(number | undefined)[]} Array of input operation IDs.
     */
    get inputOpIds() {
        return this.#inputs.map(i => i.opId);
    }

    /**
     * Gets the outputs of all input dependency operations.
     * @returns {unknown[]} Array of input operation outputs.
     */
    get inputs() {
        return this.#inputs.map(i => i.output);
    }

    /**
     * Gets the parent task that owns this operation.
     * @returns {import('./task.js').default | undefined} The parent task.
     */
    get parentTask() {
        return this.#parentTask;
    }

    /**
     * Sets the parent task for this operation.
     * @param {import('./task.js').default} parentTask - The parent task.
     */
    setParentTask(parentTask) {
        this.#parentTask = parentTask;
    }

    /**
     * Adds an input dependency to this operation.
     * @param {Op} inputOp - The operation to depend on.
     * @returns {Op} The input operation.
     */
    addInputDependency(inputOp) {
        if (!this.inputOpIds.includes(inputOp.opId)) {
            this.#inputs.push(inputOp);
            this.state = 'pending';
        }
        return inputOp;
    }

    /**
     * Creates and enqueues a new input operation as a dependency.
     * @param {string | Function} inputOpName - Name or function of the operation.
     * @param {Record<string, unknown>} inputOpArgs - Arguments for the new operation.
     * @returns {Op} The newly created input operation.
     */
    enqueue(inputOpName, inputOpArgs) {
        const inputOp = createOp(inputOpName, inputOpArgs);
        this.#parentTask.addOp(inputOp);
        this.addInputDependency(inputOp);
        return inputOp;
    }

    /**
     * Checks if this operation is ready to execute (pending with all inputs done).
     * @returns {boolean} True if ready to execute.
     */
    isReadyToExecute() {
        return this.state === 'pending' && this.#inputs.every(i => i.state === 'done');
    }

    /**
     * Executes this operation.
     * @returns {Promise<Op>} This operation after execution.
     */
    async execute() {
        this.lastRanAt = new Date().toISOString();
        logInfo`Executing opId: ${this.opId} opName: ${this.opName}...`;
        if (!this.isReadyToExecute()) {
            this.state = 'error';
            this.output = 'Some input dependency not met';
            return this;
        }
        try {
            this.state = 'done';
            this.output = (await this.#callback(this)) ?? null;
        } catch (error) {
            this.state = 'error';
            this.output = error.message ?? error;
        }
        return this;
    }
}
