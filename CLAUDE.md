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
- **Plugin System**: Extensible adapters, filters, normalizers, providers, and stores

**@l10nmonster/cli**: Command-line interface built with Commander.js providing the `l10n` command for localization operations.

**Helper Modules**: Format-specific and platform-specific extensions:
- `helpers-android`, `helpers-ios`: Mobile platform support
- `helpers-json`, `helpers-po`, `helpers-xliff`: File format handlers  
- `helpers-openai`, `helpers-anthropic`, `helpers-googlecloud`: AI/ML translation providers
- `helpers-lqaboss`: LQA Boss flow capture for visual translation review

**@l10nmonster/server**: Web-based management UI (beta):
- **Backend**: Express.js server implemented as L10n Monster action, serves API endpoints with real project data
- **Frontend**: React 19 + Chakra UI 3.0 + TypeScript, built with Vite
- **Architecture**: Server must run within L10n Monster project directory to access MonsterManager instance
- **API Endpoints**: `/api/status`, `/api/untranslated/:sourceLang/:targetLang`, `/api/tm/stats/:sourceLang/:targetLang`

### Configuration System

Projects use `l10nmonster.config.mjs` files to configure:
- **Channels**: Source/target adapter pairs for content flow
- **Content Types**: Format filters and normalizers for different file types
- **Translation Providers**: MT engines, human translation services, or AI providers
- **Stores**: Job stores (translation history) and snap stores (content snapshots)

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

### Development Patterns

- **Workspace Architecture**: Each helper is an independent package managed with npm workspaces
- **Plugin Pattern**: Extensible adapters, filters, and providers
- **Async/Promise-based**: All I/O operations are asynchronous
- **Configuration over Convention**: Flexible config system for diverse use cases
- **Quality-aware Translation**: TUs carry quality scores for intelligent selection