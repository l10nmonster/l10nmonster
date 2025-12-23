import Op from './operation.js';
import Task from './task.js';

/**
 * @typedef {import('../interfaces.js').OpsStoreInterface} OpsStoreInterface
 * @typedef {import('../interfaces.js').SerializedOp} SerializedOp
 */

const rndLetter = () => String.fromCharCode(Math.round(Math.random() * 25) + (Math.random() < 0.5 ? 97 : 65));

const registry = {};

/** @type {OpsStoreInterface | undefined} */
let opsStore;

/**
 * Sets the operations store for persisting task state.
 * @param {OpsStoreInterface} store - The operations store instance.
 */
export function setOpsStore(store) {
    opsStore = store;
}

/**
 * Registers an operation function in the registry.
 * @param {Function} func - The operation callback function.
 * @param {{ opName?: string, idempotent?: boolean, callback?: Function }} [options] - Registration options.
 */
export function registerOp(func, options = {}) {
    options.opName ??= func.name;
    if (registry[options.opName]) {
        if (/** @type {{ callback?: Function }} */ (registry[options.opName]).callback !== func) {
            throw new Error(`Op ${options.opName} already exists in registry`);
        }
        // if multiple instances of the same class try to register ops, ignore them
    } else {
        options.callback = func;
        options.idempotent ??= false;
        registry[options.opName] = options;
    }
}

/**
 * Creates an operation instance.
 * @param {string | Function} opName - Operation name or function.
 * @param {Record<string, unknown>} args - Arguments to pass to the operation.
 * @returns {Op} The created operation.
 */
export function createOp(opName, args) {
    typeof opName === 'function' && (opName = opName.name);
    const callback = registry[opName]?.callback;
    if (!callback) {
        throw new Error(`OpsManager: Op ${opName} not found in registry`);
    }
    const op = new Op(opName, callback);
    op.args = args;
    return op;
}

/**
 * Creates a new task with a root operation.
 * @param {string} groupName - Name group for the task.
 * @param {string | Function} rootOpName - Root operation name or function.
 * @param {Record<string, unknown>} [rootOpArgs] - Arguments for the root operation.
 * @returns {Task} The created task.
 */
export function createTask(groupName, rootOpName, rootOpArgs) {
    const rootOp = createOp(rootOpName, rootOpArgs);
    const taskName = `Task-${new Date().getTime()}-${groupName}-${rndLetter()}${rndLetter()}${rndLetter()}`;
    const task = new Task(taskName, rootOp);
    opsStore && task.setOpsStore(opsStore);
    return task;
}

/**
 * Deserializes a task from a serialized operation list.
 * @param {string} taskName - The task name/ID.
 * @param {SerializedOp[]} serializedOpList - Serialized list of operations.
 * @returns {Task} The deserialized task.
 */
export function deserializeTask(taskName, serializedOpList) {
    return Task.deserialize(taskName, serializedOpList);
}

/**
 * Hydrates a task from the operations store.
 * @param {string} taskName - The task name/ID to hydrate.
 * @returns {Promise<Task>} The hydrated task.
 */
export async function hydrateTaskFromStore(taskName) {
    const task = await Task.hydrateFromStore(opsStore, taskName);
    opsStore && task.setOpsStore(opsStore);
    return task;
}
