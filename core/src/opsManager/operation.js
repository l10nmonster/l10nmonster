import { logInfo } from '../l10nContext.js';
import { createOp } from './index.js';

export default class Op {
    opId;
    opName;
    args;
    state = 'pending'; // Predefined states are: pending, done, error. Any other state is considered blocking (run once after rehydration)
    output;
    lastRanAt;

    #callback;
    #inputs = [];
    #parentTask;

    constructor(opName, callback) {
        this.opName = opName;
        this.#callback = callback;
    }

    get inputOpIds() {
        return this.#inputs.map(i => i.opId);
    }

    get inputs() {
        return this.#inputs.map(i => i.output);
    }

    get parentTask() {
        return this.#parentTask;
    }

    setParentTask(parentTask) {
        this.#parentTask = parentTask;
    }

    addInputDependency(inputOp) {
        if (!this.inputOpIds.includes(inputOp.opId)) {
            this.#inputs.push(inputOp);
            this.state = 'pending';
        }
        return inputOp;
    }

    enqueue(inputOpName, inputOpArgs) {
        const inputOp = createOp(inputOpName, inputOpArgs);
        this.#parentTask.addOp(inputOp);
        this.addInputDependency(inputOp);
        return inputOp;
    }

    isReadyToExecute() {
        return this.state === 'pending' && this.#inputs.every(i => i.state === 'done');
    }

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
