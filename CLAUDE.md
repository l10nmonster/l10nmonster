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

### Development Patterns

- **Workspace Architecture**: Each helper is an independent package managed with npm workspaces
- **Plugin Pattern**: Extensible adapters, filters, and providers
- **Async/Promise-based**: All I/O operations are asynchronous
- **Configuration over Convention**: Flexible config system for diverse use cases
- **Quality-aware Translation**: TUs carry quality scores for intelligent selection