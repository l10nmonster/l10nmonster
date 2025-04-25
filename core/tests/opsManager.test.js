import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

import { OpsManager } from '../index.js';

class MockedPersistence {
    tasks = {};

    async saveOps(taskName, opList) {
        this.tasks[taskName] = opList.map(op => {
            const { lastRanAt, ...rest } = op;
            return rest;
        });
    }

    async *getTask(taskName) {
        for (const op of this.tasks[taskName]) {
            yield op;
        }
    }
}

async function foo(op) {
    return op.args + 1;
}

async function bar(op) {
    return op.inputs;
}

async function additiveOp(op) {
    const o2 = op.parentTask.enqueue(foo, 1);
    op.parentTask.rootOp.addInputDependency(o2);
    return 1;
}

async function blockingOp(op) {
    op.state = 'blocked';
}

suite('OpsManager tests', () =>{

  test('task with 3 ops', async () => {
    OpsManager.registerOp(foo);
    OpsManager.registerOp(bar);
    const t = OpsManager.createTask();
    const p = new MockedPersistence();
    t.setPersistence(p);
    const o1 = t.enqueue(foo, 1);
    const o2 = t.enqueue(foo, 10);
    assert.deepEqual(await t.execute(bar, null, [ o1, o2 ]), [ 2, 11 ]);
    assert.deepEqual(p.tasks[t.taskName], [
        { opName: 'bar', opId: 0, args: null, inputOpIds: [ 1, 2 ], output: [ 2, 11 ], state: 'done' },
        { opName: 'foo', opId: 1, args: 1, inputOpIds: [], output: 2, state: 'done' },
        { opName: 'foo', opId: 2, args: 10, inputOpIds: [], output: 11, state: 'done' } ]);
  });

  test('Add an op on the fly', async () => {
    OpsManager.registerOp(additiveOp);
    OpsManager.registerOp(foo);
    OpsManager.registerOp(bar);
    const t = OpsManager.createTask();
    const o1 = t.enqueue(additiveOp);
    assert.deepEqual(await t.execute(bar, null, [ o1 ]), [ 1, 2 ]);
  });

  test('blocked task', async () => {
    OpsManager.registerOp(foo);
    OpsManager.registerOp(blockingOp);
    const p1 = new MockedPersistence();
    OpsManager.setPersistence(p1);
    const t = OpsManager.createTask();
    const o1 = t.enqueue(foo, 1);
    await assert.rejects(async () => {
        await t.execute(blockingOp, null, [ o1 ]);
    });
    assert.equal(t.rootOp.state, 'blocked');
    assert.deepEqual(p1.tasks[t.taskName], [
        { opName: 'blockingOp', opId: 0, args: null, inputOpIds: [ 1 ], state: 'blocked', output: null },
        { opName: 'foo', opId: 1, args: 1, inputOpIds: [], state: 'done', output: 2 } ]);

    // try to re-run the task after hydrating
    const rehydratedTask = await OpsManager.hydrateTask(t.taskName);
    const p2 = new MockedPersistence();
    rehydratedTask.setPersistence(p2);
    await assert.rejects(async () => {
        await rehydratedTask.continue();
    });
    assert.equal(rehydratedTask.rootOp.state, 'blocked');
    assert.deepEqual(p1.tasks[t.taskName], p2.tasks[t.taskName]);
  });

});
