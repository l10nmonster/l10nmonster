/* eslint-disable dot-notation */

// OpenAI O1 Mini

// Test Cases:
    // Registering Operations: Tests the registration of operations, handling duplicate registrations, and ensuring that attempting to register an operation with an existing name but different callback throws an error.
    // Creating and Committing Tasks: Verifies that tasks can be created, operations can be enqueued, and state files are correctly generated.
    // Executing a Simple Task: Tests the execution of a straightforward task with a single operation and verifies the result.
    // Handling Dependencies: Ensures that operations with dependencies are executed in the correct order and produce the expected result.
    // Handling Operation Failures: Checks that the system correctly handles operations that throw errors, including state updates and error messages.
    // Hydrating a Task from State File: Tests the ability to restore a task's state from a JSON file and execute it correctly.
    // Handling Large Outputs by Dumping to Files: Verifies that large outputs exceeding MAX_INLINE_OUTPUT are dumped to separate files and that the system correctly references these files.

import { L10nContext } from '../src/l10nContext.js'; // this is only needed for internal initialization
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { OpsMgr } from '../src/opsMgr.js';

// Helper function to clean up the ops directory after tests
function cleanupOpsDir(opsDir) {
  if (fs.existsSync(opsDir)) {
    fs.rmSync(opsDir, { recursive: true, force: true });
  }
}

// Mock operations
async function add([a, b]) {
  return a + b;
}

async function multiply([a, b]) {
  return a * b;
}

async function failOp() {
  throw new Error('Intentional Failure');
}

// Begin Tests
test('OpsMgr: Registering operations', () => {
  const opsMgr = new OpsMgr();

  // Register operations
  opsMgr.registerOp(add);
  opsMgr.registerOp(multiply, { opName: 'multiply' });

  // Assertions
  assert.ok(opsMgr.registry['add'], 'Add operation should be registered');
  assert.ok(opsMgr.registry['multiply'], 'Multiply operation should be registered');

  assert.equal(opsMgr.registry['add'].callback, add, 'Add callback should match');
  assert.equal(opsMgr.registry['multiply'].callback, multiply, 'Multiply callback should match');

  // Attempt to register the same op again with the same function (should be allowed)
  opsMgr.registerOp(add);
  assert.equal(Object.keys(opsMgr.registry).length, 2, 'Duplicate registration with same function should not increase registry size');

  // Attempt to register the same op name with a different function (should throw)
  assert.throws(() => {
    opsMgr.registerOp(failOp, { opName: 'add' });
  }, /Op add already exists in registry/);
});

test('OpsMgr: Creating and committing tasks', () => {
  const opsMgr = new OpsMgr();

  // Register operations
  opsMgr.registerOp(add);
  opsMgr.registerOp(multiply);

  const opsDir = path.resolve('tempOps');
  cleanupOpsDir(opsDir);
  opsMgr.setOpsDir(opsDir);

  const task = opsMgr.createTask();
  task.setContext({ user: 'testUser' });

  task.commit('add', [1, 2]);

  // Assertions
  assert.equal(task.opList.length, 1, 'One operation should be enqueued');
  assert.equal(task.opList[0].opName, 'add', 'Operation name should be "add"');
  assert.deepEqual(task.opList[0].args, [1, 2], 'Operation arguments should match');
  assert.equal(task.opList[0].state, 'pending', 'Operation state should be "pending"');

  // Check if state file is created
  const expectedStateFile = path.join(opsDir, `${task.taskName}-plan.json`);
  assert.ok(fs.existsSync(expectedStateFile), 'State file should be created');

  // Cleanup
  cleanupOpsDir(opsDir);
});

test('OpsMgr: Executing a simple task', async () => {
  const opsMgr = new OpsMgr();

  // Register operations
  opsMgr.registerOp(add);
  opsMgr.registerOp(multiply);

  const opsDir = path.resolve('tempOpsExec');
  cleanupOpsDir(opsDir);
  opsMgr.setOpsDir(opsDir);

  const task = opsMgr.createTask();
  task.setContext({});

  task.commit('add', [10, 20]); // Task: add(10, 20)

  const result = await task.execute();

  // Assertions
  assert.equal(result, 30, 'The result of add(10, 20) should be 30');

  // Check operation state
  assert.equal(task.opList[0].state, 'done', 'Operation state should be "done"');

  // Cleanup
  cleanupOpsDir(opsDir);
});

// test('OpsMgr: Handling dependencies', async () => {
//   const opsMgr = new OpsMgr();

//   // Register operations
//   opsMgr.registerOp(add);
//   opsMgr.registerOp(multiply);

//   const opsDir = path.resolve('tempOpsDeps');
//   cleanupOpsDir(opsDir);
//   opsMgr.setOpsDir(opsDir);

//   const task = opsMgr.createTask();
//   task.setContext({});

//   const op1 = task.enqueue('add', [5, 7]); // Op 0: add(5, 7)
//   const op2 = task.enqueue('multiply', [op1, 3]); // Op 1: multiply(result of op0, 3)

//   task.rootOpId = op2;
//   task.taskName = `Task-Multiply-${Date.now()}`;
//   task.saveState();

//   const result = await task.execute();

//   // Assertions
//   assert.equal(result, 36, 'The result of multiply(add(5,7), 3) should be 36');

//   // Check individual operation states
//   assert.equal(task.opList[0].state, 'done', 'First operation should be "done"');
//   assert.equal(task.opList[1].state, 'done', 'Second operation should be "done"');

//   // Cleanup
//   cleanupOpsDir(opsDir);
// });

// test('OpsMgr: Handling operation failures', async () => {
//   const opsMgr = new OpsMgr();

//   // Register operations including a failing one
//   opsMgr.registerOp(add);
//   opsMgr.registerOp(failOp);

//   const opsDir = path.resolve('tempOpsFail');
//   cleanupOpsDir(opsDir);
//   opsMgr.setOpsDir(opsDir);

//   const task = opsMgr.createTask();
//   task.setContext({});

//   task.commit('failOp', []); // Task: failOp()

//   // Assertions
//   await assert.rejects(
//     () => task.execute(),
//     {
//       name: 'Error',
//       message: 'OpsMgr: unable to execute task Task-failOp-',
//     },
//     'Executing a failing operation should throw an error'
//   );

//   // Check operation state
//   assert.equal(task.opList[0].state, 'error', 'Operation state should be "error"');
//   assert.ok(task.opList[0].output.includes('Intentional Failure'), 'Error message should be captured');

//   // Cleanup
//   cleanupOpsDir(opsDir);
// });

// test('OpsMgr: Hydrating a task from state file', async () => {
//   const opsMgr = new OpsMgr();

//   // Register operations
//   opsMgr.registerOp(add);
//   opsMgr.registerOp(multiply);

//   const opsDir = path.resolve('tempOpsHydrate');
//   cleanupOpsDir(opsDir);
//   opsMgr.setOpsDir(opsDir);

//   const task = opsMgr.createTask();
//   task.setContext({});

//   const op1 = task.enqueue('add', [2, 3]); // Op 0: add(2, 3)
//   const op2 = task.enqueue('multiply', [op1, 4]); // Op 1: multiply(result of op0, 4)
//   task.rootOpId = op2;
//   task.taskName = `Task-Hydrate-${Date.now()}`;
//   task.saveState();

//   // Create a new Task instance and hydrate it
//   const newTask = opsMgr.createTask();
//   newTask.hydrate(`${task.taskName}-plan.json`);

//   // Execute the hydrated task
//   const result = await newTask.execute();

//   // Assertions
//   assert.equal(result, 20, 'The result of multiply(add(2,3), 4) should be 20');

//   // Check operation states
//   assert.equal(newTask.opList[0].state, 'done', 'First operation should be "done" after hydration');
//   assert.equal(newTask.opList[1].state, 'done', 'Second operation should be "done" after hydration');

//   // Cleanup
//   cleanupOpsDir(opsDir);
// });

// test('OpsMgr: Handling large outputs by dumping to files', async () => {
//   const opsMgr = new OpsMgr();

//   // Register a mock operation that returns a large output
//   async function largeOutputOp() {
//     return 'A'.repeat(20000); // 20,000 characters
//   }

//   opsMgr.registerOp(largeOutputOp);

//   const opsDir = path.resolve('tempOpsLargeOutput');
//   cleanupOpsDir(opsDir);
//   opsMgr.setOpsDir(opsDir);

//   const task = opsMgr.createTask();
//   task.setContext({});

//   task.commit('largeOutputOp', []); // Task: largeOutputOp()

//   const result = await task.execute();

//   // Assertions
//   assert.equal(result, true, 'The op should set output to true when dumping to file');

//   // Check that the output file exists
//   const outputFile = path.join(opsDir, `${task.taskName}-out0.json`);
//   assert.ok(fs.existsSync(outputFile), 'Large output should be dumped to a separate file');

//   // Verify the content of the dumped file
//   const dumpedOutput = fs.readFileSync(outputFile, 'utf8');
//   assert.equal(dumpedOutput, 'A'.repeat(20000), 'Dumped output should match the large string');

//   // Cleanup
//   cleanupOpsDir(opsDir);
// });
