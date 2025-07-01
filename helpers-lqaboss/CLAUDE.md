# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Testing
```bash
npm test
```
Runs unit tests using Node.js built-in test runner (`node --test test/*.test.js`). Tests cover help structure validation, action interface verification, filename sanitization, metadata encoding/decoding, and capture functionality.

### Running the Capture Flow
```bash
npm start
```
Runs the interactive capture mode for creating LQA Boss flows.

## Architecture

This is a helper module for L10n Monster that provides LQA Boss flow capture functionality. The module integrates with the L10n Monster ecosystem as both an action provider and translation provider.

### Core Components

**LQABossActions** (`lqabossActions.js`): Main action class that registers the `lqaboss_capture` subaction with L10n Monster's action system.

**LQABossProvider** (`lqabossProvider.js`): Translation provider that handles LQA Boss review workflows through a three-phase operation system:
- `startReviewOp`: Creates `.lqaboss` files containing job data
- `continueReviewOp`: Polls for completed review files  
- `completeReviewOp`: Processes completed reviews and returns results
Uses a storage delegate pattern for file operations and integrates with L10n Monster's operations manager.

**FlowSnapshotter** (`flowCapture.js`): Core capture engine using Puppeteer for browser automation. Handles:
- Browser lifecycle management (headless/headed modes)
- Page screenshot capture with full-page support
- Text metadata extraction using custom fe00 encoding scheme
- Flow packaging into compressed `.lqaboss` files with job data from translation memory

**lqaboss_capture** (`lqabossCapture.js`): Interactive CLI action that orchestrates the capture workflow with readline interface for user commands.

### Metadata Encoding System

The module uses a custom fe00 Unicode range encoding for embedding translation metadata invisibly in web pages:
- Encoded data is embedded between zero-width space markers (`\u200B`) 
- Uses Unicode private use area (fe00-fe0f range) for encoding JSON metadata
- Browser-context extraction function decodes metadata and captures bounding box coordinates
- Supports both single-node and cross-node text segments

### Integration Points

- **L10n Monster Core**: Extends `BaseTranslationProvider`, uses operations manager, integrates with translation memory system
- **File Operations**: Uses delegate pattern for storage operations (saving/retrieving `.lqaboss` and `.json` files)
- **Browser Automation**: Puppeteer for page interaction and screenshot capture
- **Compression**: JSZip for creating compressed flow archives

### Key Dependencies

- `puppeteer`: Browser automation for page capture
- `jszip`: Flow file compression and packaging  
- `@l10nmonster/core`: Core L10n Monster integration (peer dependency)