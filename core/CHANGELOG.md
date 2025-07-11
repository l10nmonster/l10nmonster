## v.2.0.0

This is the third major refactor, from v0 that was a monolyth, to v1 that tried to decomponetize everything and support older versions of Node with CJS (mostly to support the VS Code extension). These are the major architecural changes:
* Move away from a paradigm of a global `l10n` command (with its own dependencies) that required a config that brought additional dependencies. That effectively forced Node to use 2 parallel search trees for node_modules causing potential version mismatches. It also required to spin out helpers as a separate module and a global object to make parallel modules communicate.
* Now the paradigm is that you start from your config, add all required dependencies, and if you need the `l10n` command you can install it as part of your config. This allows multiple versions to co-exist (one version per config) and there's a single dependency to `core` from every module.
* All l10nmonster files (config, node_modules, cache) should now be all contained in their own explicit directory rather than hiding them under .l10nmonster.
* Require Node 20 and remove support for CJS. This means that complex interrelated esbuild on multiple packages is no longer required.
* Introduce TypeScript declarations to provide better validation by eslint and autocompletion in VS Code.
* The main access point to l10n monster is now `L10nMonsterConfig`. From the config, you can `run()` a request session and execute either "actions" (equivalent to CLI commands, exposed through an `l10n` object) or have access to `MonsterManager` and its direct methods methods or convenience functions that take an instance of MonsterManager as a parameter.

### Jobstore refactor

* Multiple job stores can be configured but none of them are the source of truth anymore. Source of truth is the local DB and syncronization to and from job stores is optional and relegated to the new `l10n tm` command and `syncup/syncdown` actions.
* The job store interface is no longer public and it's now consumed only by the TM manager. Equivalent functionality is exposed through the TM manager (against the local DB) for commands to use.
* The old job store interface has changed to a streaming one so that job file sizes are not limited by memory anymore (e.g. tm exports can be quite large). This introduced a new "TM Store" interface.
* TM stores are no longer limited to storing "jobs" (i.e. unit of work that go in and out translation providers) but can aggregate multiple TU's that span multiple jobs.
