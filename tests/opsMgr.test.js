import { OpsMgr } from '../src/opsMgr.js';

async function foo(x) {
    return x + 1;
}

async function bar(args, inputs) {
    return inputs;
}

async function additiveOp() {
    // eslint-disable-next-line no-invalid-this
    const o2 = await this.enqueue(foo, 1);
    // eslint-disable-next-line no-invalid-this
    this.addInputDependency(this.rootOpId, o2)
    return 1;
}

describe ('OpsMgr tests', () =>{

  test('task with 3 ops', async () => {
    const om = new OpsMgr({ logger: { info: () => true } });
    om.registerOp(foo);
    om.registerOp(bar);
    const t = om.createTask();
    const o1 = await t.enqueue(foo, 1);
    const o2 = await t.enqueue(foo, 10);
    const root = await t.enqueue(bar, null, [ o1, o2 ]);
    expect(await t.execute(root)).toMatchObject([ 2, 11 ]);
  });

  test('Add an op on the fly', async () => {
    const om = new OpsMgr({ logger: { info: () => true } });
    om.registerOp(additiveOp);
    om.registerOp(foo);
    om.registerOp(bar);
    const t = om.createTask();
    const o1 = await t.enqueue(additiveOp, 1);
    const root = await t.enqueue(bar, null, [ o1 ]);
    expect(await t.execute(root)).toMatchObject([ 1, 2 ]);
  });

});
