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
npm test --workspaces
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

- **Node.js ES Modules**: Requires Node.js >=20.12.0
- **SQLite**: Better-sqlite3 for local storage
- **Winston**: Structured logging
- **Nanoid**: Unique ID generation
- **ESLint**: Comprehensive code quality rules with strict error handling

### Development Patterns

- **Workspace Architecture**: Each helper is an independent npm package
- **Plugin Pattern**: Extensible adapters, filters, and providers
- **Async/Promise-based**: All I/O operations are asynchronous
- **Configuration over Convention**: Flexible config system for diverse use cases
- **Quality-aware Translation**: TUs carry quality scores for intelligent selection