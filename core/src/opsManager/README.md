#Notes

all ops are aync and either return an object or throw
ops receive an argument object as first parameter and an array of inputs as second param
when enqueuing an op, data can be passed inline as an argument and/or as a dependency to a list of other inputs
an op id is returned and can be used to declare input dependencies
even though ops are enqueued in a linear list, you can compose complex graph by declaring input dependency
it's normal that ops are created bottom up, as the id is needed later in dependent ops
possible states:
- pending: waiting to be executed (could be just created or missing input dependencies)
- done: completed successfully (output saved in 'output' filename)
- error: failed but could be retried. potentially, plan finished but failed to process
the root op (aka task) and all children within the plan is serialized in a json file (if a direcctory is specified)
intermediate outputs are kept into separate files if they exceed a certain size
in normal operation, all json is written and is never read so overhead should be minimal
but in crash situations we can do forensics and potentially also retry
we can also "upgrade" outputs by re-running all idempotent ops with new code
we can also mock non-idempotent ops and easily run regression tests
try to put as much content in idempotent ops as possible so that you can have a higher test coverage
try to pass large objects as input and not as context so that they're saved as separate files
try not passing the same thing over and over as an argument as that will bloat the json and won't be "upgraded"
