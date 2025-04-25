import { FsPersistence } from './fsPersistence.js';
import Op from './operation.js';
import Task from './task.js';

const rndLetter = () => String.fromCharCode(Math.round(Math.random() * 25) + (Math.random() < 0.5 ? 97 : 65));

export class OpsManager {
    static #registry = {};
    static #persistence;

    static setOpsDir(opsDir) {
        OpsManager.#persistence = new FsPersistence(opsDir);
    }

    static setPersistence(persistence) {
        OpsManager.#persistence = persistence;
    }

    static registerOp(func, options = {}) {
        options.opName ??= func.name;
        if (this.#registry[options.opName]) {
            if (this.#registry[options.opName].callback !== func) {
                throw `Op ${options.opName} already exists in registry`;
            }
            // if multiple instances of the same class try to register ops, ignore them
        } else {
            options.callback = func;
            options.idempotent ??= false;
            this.#registry[options.opName] = options;
        }
    }

    static getOp(opName) {
        typeof opName === 'function' && (opName = opName.name);
        const callback = this.#registry[opName]?.callback;
        if (!callback) {
            throw new Error(`OpsManager: Op ${opName} not found in registry`);
        }
        return new Op(opName, callback);
    }

    static createTask(groupName = 'default') {
        const taskName = `Task-${new Date().getTime()}-${groupName}-${rndLetter()}${rndLetter()}${rndLetter()}`;
        const task = new Task(taskName);
        OpsManager.#persistence && task.setPersistence(OpsManager.#persistence);
        return task;
    }

    static async hydrateTask(taskName) {
        const task = new Task(taskName);
        OpsManager.#persistence && task.setPersistence(OpsManager.#persistence);
        await task.hydrate();
        return task;
    }
}
