import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

import { opsManager } from '../index.js';

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
    op.parentTask.rootOp.enqueue(foo, 1);
    return 1;
}

async function blockingOp(op) {
    op.state = 'blocked';
}

suite('opsManager tests', () =>{

  test('task with 3 ops', async () => {
    const p = new MockedPersistence();
    opsManager.registerOp(foo);
    opsManager.registerOp(bar);
    const t = opsManager.createTask('test', bar);
    t.setOpsStore(p);
    t.rootOp.enqueue(foo, 1);
    t.rootOp.enqueue(foo, 10);
    assert.deepEqual(await t.execute(), [ 2, 11 ]);
    assert.deepEqual(p.tasks[t.taskName], [
        { opName: 'bar', opId: 0, args: undefined, inputOpIds: [ 1, 2 ], output: [ 2, 11 ], state: 'done' },
        { opName: 'foo', opId: 1, args: 1, inputOpIds: [], output: 2, state: 'done' },
        { opName: 'foo', opId: 2, args: 10, inputOpIds: [], output: 11, state: 'done' } ]);
  });

  test('Add an op on the fly', async () => {
    opsManager.registerOp(additiveOp);
    opsManager.registerOp(foo);
    opsManager.registerOp(bar);
    const t = opsManager.createTask('test', bar);
    t.rootOp.enqueue(additiveOp);
    assert.deepEqual(await t.execute(), [ 1, 2 ]);
  });

  test('blocked task', async () => {
    opsManager.registerOp(foo);
    opsManager.registerOp(blockingOp);
    const p1 = new MockedPersistence();
    opsManager.setOpsStore(p1);
    const t = opsManager.createTask('test', blockingOp);
    t.rootOp.enqueue(foo, 1);
    await assert.rejects(async () => {
        await t.execute();
    });
    assert.equal(t.rootOp.state, 'blocked');
    assert.deepEqual(p1.tasks[t.taskName], [
        { opName: 'blockingOp', opId: 0, args: undefined, inputOpIds: [ 1 ], state: 'blocked', output: null },
        { opName: 'foo', opId: 1, args: 1, inputOpIds: [], state: 'done', output: 2 } ]);

    // try to re-run the task after hydrating
    const rehydratedTask = await opsManager.hydrateTaskFromStore(t.taskName);
    const p2 = new MockedPersistence();
    rehydratedTask.setOpsStore(p2);
    rehydratedTask.taskName = 'retry'
    await assert.rejects(async () => {
        await rehydratedTask.execute();
    });
    assert.equal(rehydratedTask.rootOp.state, 'blocked');
    assert.deepEqual(p1.tasks[t.taskName], p2.tasks['retry']);
  });

});
