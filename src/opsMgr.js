// all ops are aync and either return an object or throw
// ops receive an argument object as first parameter and an array of inputs as second param
// when enqueuing an op, data can be passed inline as an argument and/or as a dependency to a list of other inputs
// an op id is returned and can be used to declare input dependencies
// even though ops are enqueued in a linear list, you can compose complex graph by declaring input dependency
// it's normal that ops are created bottom up, as the id is needed later in dependent ops

// possible states:
// - pending: waiting to be executed (could be just created or missing input dependencies)
// - done: completed successfully (output saved in 'output' filename)
// - error: failed but could be retried. potentially, plan finished but failed to process

// the root op (aka task) and all children within the plan is serialized in a json file (if a direcctory is specified)
// intermediate outputs are kept into separate files if they exceed a certain size
// in normal operation, all json is written and is never read so overhead should be minimal
// but in crash situations we can do forensics and potentially also retry
// we can also "upgrade" outputs by re-running all idempotent ops with new code
// we can also mock non-idempotent ops and easily run regression tests
// try to put as much content in idempotent ops as possible so that you can have a higher test coverage
// try to pass large objects as input and not as context so that they're saved as separate files
// try not passing the same thing over and over as an argument as that will bloat the json and won't be "upgraded"

import * as path from 'path';
import {
    existsSync,
    mkdirSync,
} from 'fs';
import * as fs from 'fs';

const MAX_INLINE_OUTPUT = 16383; // above this length it will dump the output to a file

class Task {
    constructor(opsMgr) {
        this.opsMgr = opsMgr;
        this.opList = [];
    }

    async saveState() {
        if (this.opsMgr.opsDir) {
            const state = {
                taskName: this.taskName,
                rootOpId: this.rootOpId,
                opList: this.opList,
            };
            const fullPath = path.join(this.opsMgr.opsDir, `${this.taskName}-plan.json`);
            return fs.writeFileSync(fullPath, JSON.stringify(state, null, '\t'), 'utf8');
        }
    }

    async enqueue(opName, args, inputs) {
        inputs ??= [];
        const opId = this.opList.length;
        opName = typeof opName === 'function' ? opName.name : opName;
        this.opList.push({ opId, opName, args, inputs, state: 'pending' });
        return opId;
    }

    async addInputDependency(opId, input) {
        const op = this.opList[opId];
        op.inputs ??= [];
        if (!op.inputs.includes(input)) {
            op.inputs.push(input);
            op.state = 'pending';
        }
    }

    getOutputByOpId(opId) {
        const out = this.opList[opId].output;
        if (typeof out === 'boolean') {
            const fullPath = path.join(this.opsMgr.opsDir, `${this.taskName}-out${opId}.json`);
            const outJSON = fs.readFileSync(fullPath, 'utf8');
            return JSON.parse(outJSON);
        } else {
            return out;
        }
    }

    async execute(rootOpId) {
        if (this.rootOpId === undefined) { // the first time we call it we also persist
            this.rootOpId = rootOpId;
            this.taskName = `Task-${this.opList[rootOpId].opName}-${new Date().getTime()}`;
            await this.saveState();
            this.opsMgr.verbose && console.log(`${this.taskName} committed`);
        }
        let doneOps;
        let progress = 1;
        let noErrorOps = true;
        while (progress > 0) {
            doneOps = 0;
            progress = 0;
            for (const op of this.opList) {
                if (op.state === 'done') {
                    doneOps++;
                } else if (op.state === 'pending' && noErrorOps) {
                    const doneInputs = op.inputs.filter(id => this.opList[id].state === 'done');
                    if (doneInputs.length === op.inputs.length) {
                        try {
                            const func = this.opsMgr.registry[op.opName].callback;
                            if (!func) {
                                throw `Op ${op.opName} not found in registry`;
                            }
                            const inputs = op.inputs.map(this.getOutputByOpId.bind(this));
                            const boundFunc = op.bind ? func.bind(op.bind) : func;
                            op.lastRanAt = new Date().toISOString();
                            this.opsMgr.verbose && console.log(`Executing opId: ${op.opId} opName: ${op.opName}...`);
                            const response = await boundFunc(op.args, inputs);
                            const responseJSON = JSON.stringify(response, null, '\t');
                            if (responseJSON.length > MAX_INLINE_OUTPUT && this.opsMgr.opsDir) {
                                const fullPath = path.join(this.opsMgr.opsDir, `${this.taskName}-out${op.opId}.json`);
                                fs.writeFileSync(fullPath, responseJSON, 'utf8');
                                op.output = true;
                            } else {
                                op.output = response;
                            }
                            op.state = 'done';
                        } catch (error) {
                            op.state = 'error';
                            op.output = error;
                            noErrorOps = false;
                        }
                        await this.saveState();
                        progress++;
                    }
                }
            }
        }
        if (doneOps === this.opList.length) {
            return this.getOutputByOpId(this.rootOpId);
        } else {
            throw `OpsMgr: unable to execute task ${this.taskName}`;
        }
    }

    async hydrate(filename) {
        const state = JSON.parse(fs.readFileSync(filename));
        this.taskName = state.taskName;
        this.rootOpId = state.rootOpId;
        this.opList = state.opList;
    }
}

export class OpsMgr {
    constructor(params) {
        if (params?.opsDir) {
            this.opsDir = params.opsDir;
            if (!existsSync(this.opsDir)) {
                mkdirSync(this.opsDir, {recursive: true});
            }
        }
        this.registry = {};
        this.verbose = Boolean(params?.verbose);
    }

    registerOp(func, options = {}) {
        options.opName ??= func.name;
        if (this.registry[options.opName]) {
            throw `Op ${options.opName} already exists in registry`;
        }
        options.callback = func;
        options.idempotent ??= false;
        options.bind ??= null;
        this.registry[options.opName] = options;
    }

    createTask() {
        return new Task(this);
    }
}
