# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Testing
```bash
npm test
```
Runs the complete test suite including both unit tests and regression tests:
- **Unit tests**: 200+ tests across 18 workspace packages using Node.js built-in test runner (`node --test`)
- **Regression tests**: End-to-end tests for 8 different project configurations (Android, iOS, Java, PO, HTML, etc.)

```bash
npm run test --workspaces --if-present
```
Runs only unit tests across all workspaces.

```bash
npm run test:regression
```
Runs only regression tests using both JavaScript API and CLI modes.

### Linting
```bash
npm run eslint
```
Lints JavaScript files in core/src and cli directories using ESLint with comprehensive rules.

### Running CLI
```bash
npx l10n
```
Executes the L10n Monster CLI tool for localization operations.

### Individual Regression Testing
```bash
cd regression && ./test.zsh js local all      # Test using JavaScript API
cd regression && ./test.zsh cli local all    # Test using CLI
cd regression && ./test.zsh js local android # Test specific case
```
Runs comprehensive regression tests from the /regression directory.

### Server Development
```bash
cd server
npm run dev      # Run Vite dev server on port 5173
npm run build    # Build production UI
npm run preview  # Preview production build
npm run test     # Run frontend tests
npm run test:server  # Run server tests
npm run lint     # Lint frontend code
npm run format   # Format frontend code with Prettier
```

To run the L10n Monster server with UI:
```bash
cd samples/CardboardSDK/l10nmonster  # Navigate to a project with l10nmonster.config.mjs
npx l10n serve --port 9691 --ui      # Start server with web UI
```

## Architecture

L10n Monster is a headless, serverless Translation Management System (TMS) designed for continuous localization workflows. The codebase is organized as a monorepo with workspaces.

### Core Components

**@l10nmonster/core**: The foundational module containing:
- **Translation Pipeline**: 4-stage modular pipeline (Source Adapter → Format Filter → Translator → Target Adapter)
- **Entity Management**: Jobs, translation units (TUs), sources, and translation memory blocks
- **Managers**: MonsterManager (analysis), OpsManager (operations), ResourceManager, TmManager (translation memory)
- **Data Access Layer (DAL)**: SQLite-based storage with three main DALs:
  - `ChannelDAL`: Source content and snapshots
  - `TuDAL`: Translation memory entries per language pair
  - `JobDAL`: Job metadata and history
- **Plugin System**: Extensible adapters, filters, normalizers, providers, and stores

**@l10nmonster/cli**: Command-line interface built with Commander.js providing the `l10n` command for localization operations.

**Helper Modules**: Format-specific and platform-specific extensions:
- `helpers-android`, `helpers-ios`: Mobile platform support
- `helpers-json`, `helpers-po`, `helpers-xliff`: File format handlers  
- `helpers-openai`, `helpers-anthropic`, `helpers-googlecloud`: AI/ML translation providers
- `helpers-lqaboss`: LQA Boss flow capture for visual translation review

**@l10nmonster/server**: Web-based management UI:
- **Backend**: Express.js server implemented as L10n Monster action, serves RESTful API endpoints
- **Frontend**: React 19 + Chakra UI v3 + React Router v6 + React Query, built with Vite
- **Architecture**:
  - Server must run within L10n Monster project directory to access MonsterManager instance
  - Pure React Router navigation (no tab system)
  - React Query for all data fetching with automatic caching and deduplication
  - Code-split pages with hybrid Vite chunking (vendor + pages)
- **API Endpoints**:
  - `/api/info` - System information and provider list
  - `/api/status` - Project status and statistics
  - `/api/channel/:channelId` - Channel metadata and content stats
  - `/api/channel/:channelId/:prj` - Project table of contents with pagination
  - `/api/resource/:channelId?rid=<rid>` - Resource details with segments
  - `/api/tm/stats` - Available language pairs
  - `/api/tm/stats/:sourceLang/:targetLang` - TM statistics for language pair
  - `/api/tm/search` - Advanced TM search with filtering and pagination (supports text search with quotes, date range filtering with minTS/maxTS)
  - `/api/tm/lowCardinalityColumns/:sourceLang/:targetLang` - Available filter options
  - `/api/tm/job/:jobGuid` - Job details by GUID
  - `/api/dispatcher/createJobs` - Create translation jobs (POST)
  - `/api/dispatcher/startJobs` - Start created jobs (POST)
  - `/api/providers` - Detailed provider information

### Configuration System

Projects use `l10nmonster.config.mjs` files to configure:
- **Channels**: Source/target adapter pairs for content flow
- **Content Types**: Format filters and normalizers for different file types
- **Translation Providers**: MT engines, human translation services, or AI providers
- **Stores**: Optional custom stores (system defaults to SQLite databases)

### Storage Architecture

The system uses SQLite databases for local storage:
- **`l10nmonsterSource.db`**: Source content snapshots and channel metadata
  - Stores resource snapshots per channel
  - Tracks project structure and segments
  - Enables fast content queries and diffing
- **`l10nmonsterTM.db`**: Translation memory and job history
  - Stores TUs (Translation Units) per language pair
  - Maintains job metadata and provenance
  - Supports advanced filtering and search queries
  - Can be the same database as source DB for simpler projects
- **WAL mode**: Both databases use Write-Ahead Logging for better concurrency
- **Custom functions**: SQLite extended with JavaScript functions for normalization

### Translation Memory Design

Translation units (TUs) are identified by GUIDs derived from:
- Resource ID (file/location)
- String ID (logical identifier)  
- Source text content

TM entries include quality scores, timestamps, and job provenance for intelligent translation reuse.

### Key Technologies

- **Node.js ES Modules**: Requires Node.js >=22.11.0
- **SQLite**: Better-sqlite3 for local storage
- **Winston**: Structured logging
- **Nanoid**: Unique ID generation
- **ESLint**: Comprehensive code quality rules with strict error handling

### ESLint Rules

The project enforces strict ESLint rules. Key rules to be aware of:

- **no-use-before-define**: Functions must be defined before use. In ES modules with hoisted function declarations, use `// eslint-disable-next-line no-use-before-define` if necessary.
- **no-unused-vars**: All variables must be used. Prefix intentionally unused parameters with underscore (e.g., `raw: _raw` in destructuring).
- **function-paren-newline**: Filter/map callbacks with JSDoc type annotations should be on the same line as the opening parenthesis.
- **complexity** (max 20): Functions with cyclomatic complexity over 20 require refactoring or `// eslint-disable-next-line complexity`.
- **lines-around-comment**: Block comments require blank lines before them. Run `eslint --fix` to auto-fix.

```javascript
// ✅ CORRECT: Unused parameter prefixed with underscore
async generateResource({ translator, segments, raw: _raw, ...resHandle }) { }

// ✅ CORRECT: JSDoc type guard on same line
const res = array.filter(/** @returns {x is T} */ (x) => x !== null);

// ✅ CORRECT: Disable complex function
// eslint-disable-next-line complexity
#processJob(provider, jobResponse, jobRequest) { }
```

### Development Patterns

- **Workspace Architecture**: Each helper is an independent package managed with npm workspaces
- **Plugin Pattern**: Extensible adapters, filters, and providers
- **Async/Promise-based**: All I/O operations are asynchronous
- **Configuration over Convention**: Flexible config system for diverse use cases
- **Quality-aware Translation**: TUs carry quality scores for intelligent selection

### TypeScript Types

**IMPORTANT**: All shared types MUST be defined in `core/src/interfaces.d.ts` as the single source of truth. When using types in JavaScript files:

- **DO**: Import types from interfaces using `@typedef {import('../../index.js').TypeName} TypeName`
- **DON'T**: Define duplicate `@typedef` or `@callback` for types that already exist in interfaces.d.ts

Defining the same type in multiple places causes `dts-bundle-generator` to emit duplicate types with `$1`, `$2` suffixes in `core/types/index.d.ts`.

Common types already in interfaces.d.ts:
- `StructuredNotes`, `Segment`, `NormalizedSegment`, `Part`, `PlaceholderPart`, `NormalizedString`
- `EncodeFlags`, `DecoderFunction`, `TextEncoderFunction`, `CodeEncoderFunction`, `PartTransformer`
- `SourceAdapter`, `TargetAdapter`, `ResourceFilter`, `TMStore`, `SnapStore`
- `TranslationProvider`, `Analyzer`, `SegmentDecoratorFactory`, `L10nAction`

#### Type Checking Commands
```bash
# Core package only (fast, used by eslint)
npm run check:types

# Workspace-wide type checking (all packages, may have pre-existing issues)
npm run check:types:all

# Rebuild bundled types after changes to interfaces.d.ts
cd core && npm run build:types
```

#### JSDoc Best Practices

When extending classes or implementing interfaces:
```javascript
// ✅ CORRECT: Import the type first, then reference it
/**
 * @typedef {import('@l10nmonster/core').stores.BaseJsonlTmStore} BaseJsonlTmStore
 */

/**
 * @extends {BaseJsonlTmStore}
 */
export class MyTmStore extends stores.BaseJsonlTmStore { ... }

// ❌ WRONG: Referencing undefined types
/**
 * @extends BaseJsonlTmStore  // Error: type is undefined
 */
export class MyTmStore extends stores.BaseJsonlTmStore { ... }
```

When implementing interfaces:
```javascript
// ✅ CORRECT: Import then implement
/** @typedef {import('@l10nmonster/core').TMStore} _TMStore */

/**
 * @implements {_TMStore}
 */
export class MyTmStore { ... }
```

## Kitchensink Package (`l10nmonster`)

The `/kitchensink` directory contains the `l10nmonster` umbrella package that bundles all workspace packages with merged exports.

### Building

```bash
cd kitchensink
NODE_OPTIONS="--max-old-space-size=8192" npm run build
```

### Helper Export Patterns

**CRITICAL**: When exporting providers from helper packages, you must import from the `providers` sub-export, not the root export. Many helpers have two versions of classes:

1. **Root export** (`./className.js`) - Simplified class without BaseTranslationProvider inheritance (for backwards compatibility)
2. **Providers sub-export** (`./providers/className.js`) - Full class extending BaseTranslationProvider

```javascript
// ❌ WRONG: Imports simplified class without proper inheritance
import { PigLatinizer } from '@l10nmonster/helpers-demo';
import { XliffBridge } from '@l10nmonster/helpers-xliff';

// ✅ CORRECT: Imports full class that extends BaseTranslationProvider
import { providers as demoProviders } from '@l10nmonster/helpers-demo';
import { providers as xliffProviders } from '@l10nmonster/helpers-xliff';

export const providers = {
    ...coreProviders,
    PigLatinizer: demoProviders.PigLatinizer,
    XliffBridge: xliffProviders.XliffBridge,
};
```

This pattern exists in:
- `@l10nmonster/helpers-demo` (PigLatinizer)
- `@l10nmonster/helpers-xliff` (XliffBridge)

### Rollup Configuration

The kitchensink uses Rollup to bundle ALL `@l10nmonster/*` packages together, producing a single bundle with tree-shaking.

#### What Gets Bundled

All `@l10nmonster/*` packages are bundled together. This ensures:
- Single copy of base classes (fixes class inheritance)
- Proper prototype chains
- Working `instanceof` checks
- Smaller install size (devDependencies not installed by users)

#### External Dependencies (NOT bundled)

These packages are kept external and listed in `dependencies` or `optionalDependencies`:

```javascript
const externalPackages = [
    // Native modules (must be loaded at runtime)
    'better-sqlite3',

    // Heavy optional SDKs
    'openai', 'deepl-node', 'puppeteer', 'pig-latinizer',

    // Winston ecosystem (stateful transforms break when bundled)
    'winston', 'logform', 'winston-transport', ...
];

const externalPatterns = [
    /^node:/,              // Node.js built-ins
    /^@google-cloud\//,    // Google Cloud SDK
    /^@google-ai\//,       // Google AI SDK
    /^@anthropic-ai\//,    // Anthropic SDK
];
```

#### Why Winston is external

Winston's format transforms maintain internal state (`this.prevTime`, etc.). When bundled, the transforms lose their prototype chain and throw runtime errors.

### CLI Action Naming Convention

When adding CLI actions with subActions, the subAction `name` property must follow the pattern `parentName_subActionName`:

```javascript
// ❌ WRONG: Will cause "Cannot read properties of undefined (reading 'match')" error
export const lqaboss_capture = {
    name: 'capture',  // Missing parent prefix
    // ...
};

// ✅ CORRECT: CLI extracts subName via name.split('_')[1]
export const lqaboss_capture = {
    name: 'lqaboss_capture',  // Full parent_subAction format
    // ...
};
```

The CLI code at `cli/index.js:74` does: `const subName = subAction.name.split('_')[1];`

### Regression Testing with Kitchensink

```bash
cd regression
./test.zsh js kitchensink all      # Test all cases with bundled package
./test.zsh js kitchensink android  # Test specific case
```

Each regression test case needs a `l10nmonster.config.kitchensink.mjs` that imports from `l10nmonster` instead of individual `@l10nmonster/*` packages:

```javascript
// l10nmonster.config.kitchensink.mjs
import { L10nMonsterConfig, ChannelConfig, adapters, filters, providers, normalizers } from 'l10nmonster';

export default new L10nMonsterConfig(import.meta.dirname)
    .channel(new ChannelConfig('android')
        // Use merged filter category
        .resourceFilter(new filters.AndroidXMLFilter())
        // Use prefixed normalizers
        .decoders([ normalizers.androidEscapesDecoder, normalizers.androidPhDecoder ])
    )
    // Use merged provider category
    .provider(new providers.PigLatinizer({ quality: 1 }));
```

## Version Management

Package version info is centralized in `core/src/version.js`, which exports:
- `l10nMonsterVersion` - The version string (e.g., "3.1.0")
- `l10nMonsterPackage` - The package name ("@l10nmonster/core")
- `l10nMonsterDescription` - The package description

This file is auto-generated by `scripts/publish-workspaces.js` during publishing. All packages that need version info should import from `@l10nmonster/core`:

```javascript
import { l10nMonsterVersion } from '@l10nmonster/core';
```

Packages using this pattern:
- `cli/index.js` - CLI version display
- `server/index.js` - Server startup message and API info endpoint
- `mcp/server.js` - MCP server version
- `kitchensink/src/index.js` - Re-exports as `version`

## CLI Package Exports

The `@l10nmonster/cli` package exports:

- `default` (runMonsterCLI) - Run CLI with a pre-loaded config
- `runCLI({ extraActions? })` - Run CLI with automatic config discovery
- `findConfigFile(startDir?)` - Find l10nmonster.config.mjs by walking up directories

The kitchensink CLI is just:
```javascript
import { runCLI } from '@l10nmonster/cli';
await runCLI();
```