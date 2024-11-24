# Regression Tests

This suite of tests should be used for testing that code changes don't introduce regressions.
It can be run from the shell with the `zsh test.zsh` command passing 2 parameters:
1. The first parameter controls whether the test suite is run by the command line or via the JS API. The values are respectively `cli` and `js`.
2. The second parameter controls whether the code to test is the locally modified one or the latest one on npm. The values are respectively `local` and `npm`. Please note that in order to run locally, each local package must have its dependencies installed.
