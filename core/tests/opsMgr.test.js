import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

import { OpsMgr } from '../index.js';

async function foo(x) {
    return x + 1;
}

async function bar(args, inputs) {
    return inputs;
}

async function additiveOp() {
    // eslint-disable-next-line no-invalid-this
    const o2 = this.enqueue(foo, 1);
    // eslint-disable-next-line no-invalid-this
    this.addInputDependency(this.rootOpId, o2)
    return 1;
}

suite('OpsMgr tests', () =>{

  test('task with 3 ops', async () => {
    const om = new OpsMgr();
    om.registerOp(foo);
    om.registerOp(bar);
    const t = om.createTask();
    const o1 = t.enqueue(foo, 1);
    const o2 = t.enqueue(foo, 10);
    t.commit(bar, null, [ o1, o2 ]);
    assert.deepEqual(await t.execute(), [ 2, 11 ]);
  });

  test('Add an op on the fly', async () => {
    const om = new OpsMgr();
    om.registerOp(additiveOp);
    om.registerOp(foo);
    om.registerOp(bar);
    const t = om.createTask();
    const o1 = t.enqueue(additiveOp, 1);
    t.commit(bar, null, [ o1 ]);
    assert.deepEqual(await t.execute(), [ 1, 2 ]);
  });

});
