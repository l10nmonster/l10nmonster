import { OpsMgr } from '../src/opsMgr.js';

async function foo(x) {
    return x + 1;
}

async function bar(args, inputs) {
    return inputs;
}

describe ('OpsMgr tests', () =>{

  test('task with 3 ops', async () => {
    const om = new OpsMgr();
    om.registerOp(foo);
    om.registerOp(bar);
    const t = om.createTask();
    const o1 = await t.enqueue(foo, 1);
    const o2 = await t.enqueue(foo, 10);
    const root = await t.enqueue(bar, null, [ o1, o2 ]);
    expect(await t.execute(root)).toMatchObject([ 2, 11 ]);
  });

});
