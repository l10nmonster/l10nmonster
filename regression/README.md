# Regression Tests

This suite of tests should be used for testing that code changes don't introduce regressions.
It can be run from the shell with the `test.zsh` command passing 3 parameters:
1. The first parameter controls whether the test suite is run from the command line (the `regressionScript.zsh` script) or via the JS API (the `regressionScript.cjs` script). The values are respectively `cli` and `js`.
2. The second parameter controls whether the code to test is the locally modified one or the latest one on npm. The values are respectively `local` and `npm`. Please note that in order to run locally, each local package must have its dependencies installed. You can do that by running `find . -maxdepth 2 -name package.json -execdir npm i \;` from the base of the project.
3. The third parameter specifies which regression test to run. Passing `all` runs all tests.

## Overview

Each regression case usually tests a different kind of setup and potentially runs different commands but ultimately they function in the same way:
1. An initial `mint` set of files is copied into a `wd` working directory.
2. A series of l10n monster operations is run.
3. The final wd directory is compared against an `expected` directory, where all files must match.

## How to add a new regression case

1. Add a new folder with the `mint` and `expected` directories.
2. Make sure the `mint` folder contains `regressionScript.cjs` and `regressionScript.zsh` scripts.
3. If needed, add new dependencies to `package-local.json` and `package-npm.json`.
