import { logInfo } from '@l10nmonster/core';
import { OpsManager } from './index.js';

export default class Task {
    #persistence;
    #opList = [];

    taskName;

    constructor(taskName) {
        this.taskName = taskName;
    }

    setPersistence(persistence) {
        this.#persistence = persistence;
    }

    get rootOp() {
        return this.#opList[0];
    }

    #createOp(opId, opName, args, inputOps) {
        const op = OpsManager.getOp(opName);
        op.opId = opId;
        op.args = args;
        inputOps && inputOps.forEach(inputOp => op.addInputDependency(inputOp));
        op.setParentTask(this);
        this.#opList[opId] = op;
        return op;
    }

    async save() {
        if (this.#persistence) {
            const serializedOpList = this.#opList.map(op => ({
                opName: op.opName,
                opId: op.opId,
                args: op.args,
                inputOpIds: op.inputOpIds,
                state: op.state,
                output: op.output,
                lastRanAt: op.lastRanAt
            }))
            await this.#persistence.saveOps(this.taskName, serializedOpList);
        } else {
            throw new Error(`OpsManager: Can't save Task if no persistence configured (hint: set opsDir)`);
        }
    }

    async hydrate() {
        if (this.#persistence) {
            const inputs = [];
            for await (const serializedOp of this.#persistence.getTask(this.taskName)) {
                const { opName, opId, args, inputOpIds, state, output, lastRanAt } = serializedOp;
                const op = this.#createOp(opId, opName, args);
                op.state = [ 'pending', 'done', 'error' ].includes(state) ? state : 'pending';
                op.output = output;
                op.lastRanAt = lastRanAt;
                op.setParentTask(this);
                inputOpIds && (inputs[opId] = inputOpIds);
            }
            inputs.forEach((inputOpIds, opId) => inputOpIds.forEach(inputOpId => this.#opList[opId].addInputDependency(this.#opList[inputOpId])));
        } else {
            throw new Error(`OpsManager: Can't hydrate Task if no persistence configured (hint: set opsDir)`);
        }
    }

    enqueue(opName, args, inputOps) {
        const opId = this.#opList.length || 1; // start dependencies at 1 if empty
        const op = this.#createOp(opId, opName, args, inputOps);
        return op;
    }

    async execute(opName, args, inputOps) {
        this.#createOp(0, opName, args, inputOps);
        return this.continue();
    }

    async continue() {
        /*
            create an execution plan.
            start with root op and then enqueue dependencies whose status is not done.
            recurse for each dependency making sure not to enqueue the same op twice.
            save the execution plan into a private field.
            execute the plan using desired parallelism.
        */
        let workToDo = true;
        while (workToDo) {
            const executableOps = this.#opList.filter(op => op.isReadyToExecute());
            if (executableOps.length === 0) {
                workToDo = false;
            } else {
                for (const op of executableOps) {
                    await op.execute();
                }
            }
        }
        this.#persistence && await this.save();
        logInfo`${this.taskName} committed`;
        if (this.rootOp.state === 'done') {
            return this.rootOp.output;
        } else {
            const errorOp = this.#opList.find(op => ![ 'pending', 'done' ].includes(op.state));
            throw new Error(`OpsManager: unable to execute task ${this.taskName} (opId:${errorOp.opId} opName:${errorOp.opName} ${errorOp.state} - ${errorOp.output})`);
        }
    }
}
