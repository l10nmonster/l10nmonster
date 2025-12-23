import { logInfo } from '../l10nContext.js';
import { createOp } from './index.js';

/**
 * @typedef {import('../interfaces.js').OpsStoreInterface} OpsStoreInterface
 * @typedef {import('../interfaces.js').SerializedOp} SerializedOp
 * @typedef {import('./operation.js').default} Op
 */

/**
 * Options for task execution.
 * @typedef {Object} ExecuteOptions
 * @property {number} [parallelism=1] - Number of operations to run concurrently.
 */

/**
 * Represents a task containing a DAG of operations to execute.
 * Tasks can be serialized, persisted, and resumed.
 */
export default class Task {

    /** @type {OpsStoreInterface | undefined} */
    #opsStore;

    /** @type {Op[]} */
    #opList;

    /** @type {string} Name/ID of this task. */
    taskName;

    /**
     * Creates a new task with a root operation.
     * @param {string} taskName - Name/ID for the task.
     * @param {Op} rootOp - The root operation of the task.
     */
    constructor(taskName, rootOp) {
        if (!rootOp) {
            throw new Error(`OpsManager: Task must have a rootOp`);
        }
        this.taskName = taskName;
        rootOp.opId = 0;
        rootOp.setParentTask(this);
        this.#opList = [rootOp];
    }

    /**
     * Sets the operations store for persistence.
     * @param {OpsStoreInterface} store - The operations store.
     */
    setOpsStore(store) {
        this.#opsStore = store;
    }

    /**
     * Gets the root operation of this task.
     * @returns {Op} The root operation.
     */
    get rootOp() {
        return this.#opList[0];
    }

    /**
     * Adds an operation to this task.
     * @param {Op} op - The operation to add.
     * @returns {Op} The added operation.
     */
    addOp(op) {
        const opId = this.#opList.length;
        op.opId = opId;
        op.setParentTask(this);
        this.#opList[opId] = op;
        return op;
    }

    /**
     * Serializes the task to a list of serialized operations.
     * @returns {SerializedOp[]} Array of serialized operations.
     */
    serialize() {
        return this.#opList.map(op => ({
            opName: op.opName,
            opId: op.opId,
            args: op.args,
            inputOpIds: op.inputOpIds,
            state: op.state,
            output: op.output,
            lastRanAt: op.lastRanAt
        }));
    }

    /**
     * Saves the task to the operations store.
     * @returns {Promise<void>}
     */
    async save() {
        if (this.#opsStore) {
            const serializedOpList = this.serialize();
            await this.#opsStore.saveOps(this.taskName, serializedOpList);
        } else {
            throw new Error(`OpsManager: Can't save Task if no persistence configured (hint: configure a opsStore)`);
        }
    }

    /**
     * Deserializes a task from a serialized operation list.
     * @param {string} taskName - The task name.
     * @param {SerializedOp[]} serializedOpList - Serialized operations.
     * @returns {Task} The deserialized task.
     */
    static deserialize(taskName, serializedOpList) {
        const ops = [];
        const inputs = [];
        for (const serializedOp of serializedOpList) {
            const { opName, opId, args, inputOpIds, state, output, lastRanAt } = serializedOp;
            const op = createOp(opName, args);
            op.opId = opId;
            op.state = state === 'error' ? 'pending' : state;
            op.output = output;
            op.lastRanAt = lastRanAt;
            inputOpIds && (inputs[opId] = inputOpIds);
            ops[opId] = op;
        }
        const task = new Task(taskName, ops[0]);
        task.#opList = ops;
        ops.forEach(op => op.setParentTask(task));
        inputs.forEach((inputOpIds, opId) => inputOpIds.forEach(inputOpId => ops[opId].addInputDependency(ops[inputOpId])));
        return task;
    }

    /**
     * Hydrates a task from the operations store.
     * @param {OpsStoreInterface} opsStore - The operations store.
     * @param {string} taskName - The task name to hydrate.
     * @returns {Promise<Task>} The hydrated task.
     */
    static async hydrateFromStore(opsStore, taskName) {
        const serializedOps = [];
        for await (const serializedOp of opsStore.getTask(taskName)) {
            serializedOps[serializedOp.opId] = serializedOp;
        }
        return Task.deserialize(taskName, serializedOps);
    }

    /**
     * Executes the task by running all operations in dependency order.
     * @param {ExecuteOptions} [options] - Execution options.
     * @returns {Promise<unknown>} The root operation's output.
     */
    async execute(options = {}) {
        const { parallelism = 1 } = options;
        
        // create an execution plan.
        // start with root op and then enqueue dependencies whose status is not done.
        // recurse for each dependency making sure not to enqueue the same op twice.
        // save the execution plan into a private field.
        // execute the plan using desired parallelism.
        let workToDo = true;
        while (workToDo) {
            const executableOps = this.#opList.filter(op => op.isReadyToExecute());
            if (executableOps.length === 0) {
                workToDo = false;
            } else {
                // Execute operations with controlled parallelism
                const batches = [];
                for (let i = 0; i < executableOps.length; i += parallelism) {
                    batches.push(executableOps.slice(i, i + parallelism));
                }
                
                for (const batch of batches) {
                    const promises = batch.map(op => op.execute());
                    const results = await Promise.allSettled(promises);
                    
                    // Check for any Promise rejections that weren't handled by operation.execute()
                    const rejections = results.filter(result => result.status === 'rejected');
                    if (rejections.length > 0) {
                        // Log the rejections for debugging
                        rejections.forEach((rejection, index) => {
                            const op = batch[index];
                            if (op) {
                                op.state = 'error';
                                op.output = rejection.reason?.message || String(rejection.reason);
                            }
                        });
                    }
                    
                    // Check if any operation failed
                    const hasError = batch.some(op => op.state === 'error');
                    if (hasError) {
                        workToDo = false;
                        break;
                    }
                }
            }
        }
        this.#opsStore && await this.save();
        logInfo`${this.taskName} committed`;
        if (this.rootOp.state === 'done') {
            return this.rootOp.output;
        } else {
            const errorOp = this.#opList.find(op => ![ 'pending', 'done' ].includes(op.state));
            throw new Error(`OpsManager: unable to execute task ${this.taskName} (opId:${errorOp.opId} opName:${errorOp.opName} ${errorOp.state} - ${errorOp.output})`);
        }
    }
}
