import Op from './operation.js';
import Task from './task.js';

const rndLetter = () => String.fromCharCode(Math.round(Math.random() * 25) + (Math.random() < 0.5 ? 97 : 65));

const registry = {};
let opsStore;

export function setOpsStore(store) {
    opsStore = store;
}

export function registerOp(func, options = {}) {
    options.opName ??= func.name;
    if (registry[options.opName]) {
        if (registry[options.opName].callback !== func) {
            throw `Op ${options.opName} already exists in registry`;
        }
        // if multiple instances of the same class try to register ops, ignore them
    } else {
        options.callback = func;
        options.idempotent ??= false;
        registry[options.opName] = options;
    }
}

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

export function createTask(groupName, rootOpName, rootOpArgs) {
    const rootOp = createOp(rootOpName, rootOpArgs);
    const taskName = `Task-${new Date().getTime()}-${groupName}-${rndLetter()}${rndLetter()}${rndLetter()}`;
    const task = new Task(taskName, rootOp);
    opsStore && task.setOpsStore(opsStore);
    return task;
}

export function deserializeTask(taskName, serializedOpList) {
    return Task.deserialize(taskName, serializedOpList);
}

export async function hydrateTaskFromStore(taskName) {
    return await Task.hydrateFromStore(opsStore, taskName);
}
