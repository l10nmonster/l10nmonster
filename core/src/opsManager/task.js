import { logInfo } from '@l10nmonster/core';
import { createOp } from './index.js';

export default class Task {
    #opsStore;
    #opList;

    taskName;

    constructor(taskName, rootOp) {
        if (!rootOp) {
            throw new Error(`OpsManager: Task must have a rootOp`);
        }
        this.taskName = taskName;
        rootOp.opId = 0;
        rootOp.setParentTask(this);
        this.#opList = [rootOp];
    }

    setOpsStore(store) {
        this.#opsStore = store;
    }

    get rootOp() {
        return this.#opList[0];
    }

    addOp(op) {
        const opId = this.#opList.length;
        op.opId = opId;
        op.setParentTask(this);
        this.#opList[opId] = op;
        return op;
    }

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

    async save() {
        if (this.#opsStore) {
            const serializedOpList = this.serialize();
            await this.#opsStore.saveOps(this.taskName, serializedOpList);
        } else {
            throw new Error(`OpsManager: Can't save Task if no persistence configured (hint: configure a opsStore)`);
        }
    }

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

    static async hydrateFromStore(opsStore, taskName) {
        const serializedOps = [];
        for await (const serializedOp of opsStore.getTask(taskName)) {
            serializedOps[serializedOp.opId] = serializedOp;
        }
        return Task.deserialize(taskName, serializedOps);
    }

    async execute(options = {}) {
        const { parallelism = 1 } = options;
        
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
                // Execute operations with controlled parallelism
                const batches = [];
                for (let i = 0; i < executableOps.length; i += parallelism) {
                    batches.push(executableOps.slice(i, i + parallelism));
                }
                
                for (const batch of batches) {
                    const promises = batch.map(op => op.execute());
                    await Promise.all(promises);
                    
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
