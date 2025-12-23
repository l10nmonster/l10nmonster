# CLAUDE.md - Kitchensink Package

This is the `l10nmonster` umbrella package that re-exports all L10n Monster functionality.

## Purpose

Provides a single unscoped package name (`l10nmonster`) that includes all workspace packages as dependencies. Users install one package and get everything with proper transitive dependency resolution.

## Architecture

This package is a simple pass-through - no bundling or code transformation:

- **src/index.js** - Re-exports `@l10nmonster/core`
- **src/cli.js** - Re-exports CLI runner from `@l10nmonster/cli`
- **src/*.js** - Each file re-exports a specific helper package

All @l10nmonster/* packages are regular dependencies, so npm handles transitive dependency resolution (e.g., zod versions for mcp vs openai).

## Entry Points

Each entry point corresponds to a workspace package:

| Entry Point | Re-exports |
|-------------|------------|
| `l10nmonster` | `@l10nmonster/core` |
| `l10nmonster/android` | `@l10nmonster/helpers-android` |
| `l10nmonster/ios` | `@l10nmonster/helpers-ios` |
| `l10nmonster/java` | `@l10nmonster/helpers-java` |
| `l10nmonster/json` | `@l10nmonster/helpers-json` |
| `l10nmonster/html` | `@l10nmonster/helpers-html` |
| `l10nmonster/po` | `@l10nmonster/helpers-po` |
| `l10nmonster/xliff` | `@l10nmonster/helpers-xliff` |
| `l10nmonster/demo` | `@l10nmonster/helpers-demo` |
| `l10nmonster/openai` | `@l10nmonster/helpers-openai` |
| `l10nmonster/anthropic` | `@l10nmonster/helpers-anthropic` |
| `l10nmonster/deepl` | `@l10nmonster/helpers-deepl` |
| `l10nmonster/googlecloud` | `@l10nmonster/helpers-googlecloud` |
| `l10nmonster/translated` | `@l10nmonster/helpers-translated` |
| `l10nmonster/lqaboss` | `@l10nmonster/helpers-lqaboss` |
| `l10nmonster/server` | `@l10nmonster/server` |
| `l10nmonster/mcp` | `@l10nmonster/mcp` |
| `l10nmonster/config-mancer` | `@l10nmonster/config-mancer` |

## Why No Bundling

Previous attempts to bundle with Rollup caused issues:
1. **Singleton state** - Core module has singleton state (regressionMode, logger) that must be shared
2. **Conflicting transitive deps** - Different packages need different versions (e.g., zod@3 vs zod@4)
3. **Class name mangling** - Terser minification broke provider IDs (which use `constructor.name`)

By keeping packages as regular dependencies without bundling:
- npm handles version resolution with nested node_modules
- Singleton state is naturally shared
- No build step required

## Version Management

Version is managed by semantic-release. When updating:
1. Update version in package.json
2. Update dependency versions for @l10nmonster/* packages

## Files

- **src/** - Entry point files (published)
- **package.json** - Package config with all dependencies
- **README.md** - User documentation (published)
- **.npmignore** - Excludes dev files from npm publish
- **CLAUDE.md** - This file (excluded from npm publish)

## Testing

Run kitchensink regression tests:

```bash
cd /regression
./test.zsh js kitchensink all
```

This uses the `package-kitchensink.json` and `l10nmonster.config.kitchensink.mjs` configs in each test case.
