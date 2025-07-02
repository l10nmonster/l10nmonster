# @l10nmonster/core

The foundational L10n Monster package containing core functionality for translation management systems. This package provides the essential classes, managers, and plugin system that powers user interfaces like the [CLI](../cli) and server applications.

Can be used directly in JavaScript applications for programmatic control of localization workflows.

## Installation

```bash
npm install @l10nmonster/core
```

## v3 Architecture

L10n Monster v3 introduces a comprehensive architectural overhaul with:

- **Data Access Layer (DAL)**: Unified interface for jobs, sources, translation units, and TM blocks
- **Manager System**: ModularMonsterManager, OpsManager, ResourceManager, and TmManager
- **Enhanced Provider Architecture**: BaseTranslationProvider with specialized implementations
- **Modern Storage System**: JSONL TM stores, operations stores, and pluggable delegates
- **ConfigMancer**: Advanced configuration management with validation and defaults

### Core Components

#### Data Access Layer (DAL)
- **`DAL/job.js`**: Job management and lifecycle operations
- **`DAL/source.js`**: Source content operations and caching
- **`DAL/tu.js`**: Translation unit operations and GUID management
- **`DAL/tmBlock.js`**: Translation memory block operations
- **`DAL/index.js`**: Unified DAL interface and transaction support

#### Manager Classes
- **MonsterManager**: Content analysis and processing with modular dispatcher
- **OpsManager**: Operations and task management with parallel execution
- **ResourceManager**: Resource handling, caching, and lifecycle management
- **TmManager**: Translation memory operations, synchronization, and leverage

#### Configuration System
- **ConfigMancer**: Advanced configuration parsing, validation, and inheritance
- **L10nContext**: Centralized context management and state
- **L10nMonsterConfig**: Enhanced configuration with workspace support

## Usage Examples

### Basic Setup

```javascript
import { L10nMonsterConfig, MonsterManager } from '@l10nmonster/core';
import { FsSource, FsTarget } from '@l10nmonster/core';

// Load configuration
const config = new L10nMonsterConfig('./l10nmonster.config.mjs');

// Create manager
const monster = new MonsterManager(config);

// Analyze source content
const analysis = await monster.analyze();
console.log(`Found ${analysis.translationUnits} translation units`);
```

### Working with Translation Providers

```javascript
import { providers } from '@l10nmonster/core';

// Internal leverage provider
const leverage = new providers.InternalLeverage();

// Repetition handling
const repetition = new providers.Repetition();

// Grandfather existing translations
const grandfather = new providers.Grandfather();

// Chain providers for optimal translation workflow
const providerChain = [leverage, repetition, grandfather];
```

### Data Access Layer

```javascript
import { DAL } from '@l10nmonster/core';

// Initialize DAL
const dal = new DAL.index(config);

// Work with translation units
const tu = await dal.tu.getTuByGuid('abc123');
await dal.tu.updateTu(tu.guid, { quality: 95 });

// Job management
const job = await dal.job.createJob({
  sourceLang: 'en',
  targetLang: 'es',
  provider: 'openai'
});

// Source operations
const sources = await dal.source.getAllSources();
const sourceContent = await dal.source.getSourceContent('main.json');
```

### Translation Memory Operations

```javascript
import { TmManager } from '@l10nmonster/core';

const tmManager = new TmManager(config);

// Sync translations
await tmManager.syncup(['en-es']);
await tmManager.syncdown(['en-es']);

// Query TM
const matches = await tmManager.findMatches('Hello world', 'en', 'es');
console.log(`Found ${matches.length} TM matches`);
```

## Adapters and Sources

### File System Source

```javascript
import { adapters } from '@l10nmonster/core';

const source = new adapters.FsSource({
    globs: ['src/**/*.json', 'locales/en/**/*.json'],
    filter: (resourceId) => !resourceId.includes('test'),
    targetLangs: ['es', 'fr', 'de'],
    resDecorator: (resMeta) => ({
        ...resMeta,
        priority: resMeta.resourceId.includes('critical') ? 'high' : 'normal'
    })
});
```

### HTTP Source

```javascript
import { adapters } from '@l10nmonster/core';

const httpSource = new adapters.HttpSource({
    baseUrl: 'https://api.example.com/content',
    headers: { 'Authorization': 'Bearer token' },
    targetLangs: ['es', 'fr']
});
```

### File System Target

```javascript
import { adapters } from '@l10nmonster/core';

const target = new adapters.FsTarget({
    targetPath: (lang, resourceId) => {
        // Transform source path to target path
        return resourceId.replace('/en/', `/${lang}/`);
    },
    pathResolver: 'auto' // or custom function
});
```

## Format Filters

Core format filters for content processing:

### Snap Filter
```javascript
import { filters } from '@l10nmonster/core';

const snapFilter = new filters.SnapFilter({
    normalizeWhitespace: true,
    preserveStructure: true
});
```

### Monster Normalized Format (MNF) v1
```javascript
import { filters } from '@l10nmonster/core';

const mnfFilter = new filters.MNFv1({
    version: '1.0',
    strictMode: true
});
```

### HTML Filter
```javascript
import { filters } from '@l10nmonster/core';

const htmlFilter = new filters.HtmlFilter({
    extractText: true,
    preserveAttributes: ['title', 'alt', 'placeholder'],
    ignoreElements: ['script', 'style']
});
```

## Normalizers and Processing

### Decoders

Core decoders for content normalization:

```javascript
import { normalizers, xml, regex } from '@l10nmonster/core';

// Basic placeholder handling
const braceDecoder = normalizers.bracePHDecoder();

// XML processing
const entityDecoder = xml.entityDecoder();
const cdataDecoder = xml.CDataDecoder();
const tagDecoder = xml.tagDecoder();

// Custom decoder
const customDecoder = regex.decoderMaker(
    'custom',
    /\{\{(\w+)\}\}/g,
    (match) => ({ type: 'placeholder', name: match[1] })
);
```

### Encoders

```javascript
import { normalizers, xml } from '@l10nmonster/core';

// Basic encoding
const percentEncoder = normalizers.doublePercentEncoder();

// XML encoding
const entityEncoder = xml.entityEncoder();

// Conditional encoding
const gatedEncoder = normalizers.gatedEncoder(
    (context) => context.format === 'xml',
    entityEncoder
);
```

## Translation Providers

### Built-in Providers

```javascript
import { providers } from '@l10nmonster/core';

// Internal leverage
const leverage = new providers.InternalLeverage({
    minQuality: 80,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
});

// Repetition handling
const repetition = new providers.Repetition({
    algorithm: 'fuzzy',
    threshold: 0.95
});

// Language variants
const variant = new providers.Variant({
    mapping: {
        'en-GB': 'en-US',
        'fr-CA': 'fr-FR'
    }
});

// Development helpers
const invisicode = new providers.Invisicode({
    prefix: '[',
    suffix: ']',
    showIds: true
});
```

### Base Translation Provider

For creating custom providers:

```javascript
import { BaseTranslationProvider } from '@l10nmonster/core';

class CustomProvider extends BaseTranslationProvider {
    constructor(options) {
        super(options);
        this.apiKey = options.apiKey;
    }

    async requestTranslations(jobRequest) {
        // Implement translation logic
        const response = await this.translateChunks(jobRequest.segments);
        return this.formatJobResponse(response);
    }

    async fetchTranslations(jobManifest) {
        // Implement status checking
        return this.checkJobStatus(jobManifest.jobId);
    }
}
```

## Storage System

### TM Stores

```javascript
import { stores } from '@l10nmonster/core';

// JSONL TM store with compression
const jsonlTm = new stores.BaseJsonlTmStore({
    baseDir: './l10nmonster/tm',
    compression: 'brotli',
    blockSize: 1000
});

// Legacy file-based TM
const legacyTm = new stores.LegacyFileBasedTmStore({
    baseDir: './tm-legacy'
});

// File system TM stores
const fsTm = new stores.FsTmStores({
    tmDir: './translation-memory'
});
```

### Operations Stores

```javascript
import { stores } from '@l10nmonster/core';

// Operations store
const opsStore = new stores.OpsStore({
    baseDir: './l10nmonster/ops'
});

// File system operations store
const fsOpsStore = new stores.FsOpsStore({
    opsDir: './operations'
});
```

### Store Delegates

```javascript
import { stores } from '@l10nmonster/core';

// File system delegate
const fsDelegate = new stores.FsStoreDelegate({
    baseDir: './storage',
    createDirs: true
});

// Use with any store
const tmStore = new stores.BaseJsonlTmStore({ delegate: fsDelegate });
```

## Utilities and Helpers

### Analysis and Reporting

```javascript
import { analyzers } from '@l10nmonster/core';

// Content export analyzer
const contentExport = new analyzers.contentExport();

// Duplicate source detection
const duplicateCheck = new analyzers.duplicateSource();

// Text expansion analysis
const expansionAnalysis = new analyzers.textExpansionSummary();

// Run analysis
const results = await monster.analyze([
    contentExport,
    duplicateCheck,
    expansionAnalysis
]);
```

### Decorators and Sequence Generation

```javascript
import { decorators } from '@l10nmonster/core';

// Sequence generator for unique IDs
const sequenceGen = new decorators.sequenceGenerator({
    prefix: 'job_',
    length: 8
});

const jobId = sequenceGen.next(); // e.g., "job_a1b2c3d4"
```

### Utilities

```javascript
import { utils } from '@l10nmonster/core';

// String normalization
const normalized = utils.normalizeWhitespace(text);

// GUID generation
const guid = utils.generateGuid(resourceId, stringId, sourceText);

// Quality scoring
const quality = utils.calculateQuality(source, target, metadata);

// File operations
const exists = await utils.fileExists(path);
const content = await utils.readFile(path);
await utils.writeFile(path, content);
```

## Configuration

### Basic Configuration

```javascript
// l10nmonster.config.mjs
import { FsSource, FsTarget } from '@l10nmonster/core';

export default {
    // Source/target channels
    channels: [{
        source: new FsSource({ globs: ['src/**/*.json'] }),
        target: new FsTarget({ 
            targetPath: (lang, id) => id.replace('/en/', `/${lang}/`) 
        })
    }],

    // Content type definitions
    contentTypes: [{
        name: 'json',
        resourceFilter: 'i18next',
        decoders: ['bracePH'],
        textEncoders: ['gated'],
        codeEncoders: ['entity']
    }],

    // Translation providers
    providers: [{
        id: 'internal',
        provider: new providers.InternalLeverage()
    }],

    // Storage configuration
    stores: {
        tm: new stores.BaseJsonlTmStore(),
        ops: new stores.FsOpsStore()
    }
};
```

### Advanced Configuration with ConfigMancer

```javascript
import { ConfigMancer } from '@l10nmonster/core';

const config = new ConfigMancer({
    // Workspace support
    workspaces: ['packages/*'],
    
    // Inheritance
    extends: './base.config.mjs',
    
    // Environment-specific overrides
    environments: {
        production: {
            providers: [{ id: 'professional-mt' }]
        },
        development: {
            providers: [{ id: 'demo' }]
        }
    }
});
```

## Error Handling and Logging

```javascript
import { L10nContext } from '@l10nmonster/core';

// Configure logging
const context = new L10nContext({
    logLevel: 'debug',
    logFormat: 'json',
    logFile: './logs/l10nmonster.log'
});

// Error handling
try {
    await monster.translate();
} catch (error) {
    if (error.code === 'PROVIDER_ERROR') {
        context.logger.error('Translation provider failed', {
            provider: error.provider,
            jobId: error.jobId,
            details: error.details
        });
    }
    throw error;
}
```

## Integration Examples

### Webpack Plugin

```javascript
import { MonsterManager } from '@l10nmonster/core';

class L10nMonsterWebpackPlugin {
    constructor(configPath) {
        this.configPath = configPath;
    }

    apply(compiler) {
        compiler.hooks.beforeCompile.tapAsync('L10nMonster', async (params, callback) => {
            const monster = new MonsterManager(this.configPath);
            await monster.ops.update();
            callback();
        });
    }
}
```

### Express Middleware

```javascript
import { MonsterManager, L10nContext } from '@l10nmonster/core';

function l10nMonsterMiddleware(configPath) {
    const monster = new MonsterManager(configPath);
    
    return async (req, res, next) => {
        req.l10n = {
            monster,
            async translate(text, sourceLang, targetLang) {
                return await monster.translateText(text, sourceLang, targetLang);
            }
        };
        next();
    };
}
```

## TypeScript Support

While L10n Monster is written in JavaScript, it provides TypeScript definitions:

```typescript
import { MonsterManager, L10nMonsterConfig, providers } from '@l10nmonster/core';

interface TranslationResult {
    text: string;
    quality: number;
    provider: string;
}

const config: L10nMonsterConfig = new L10nMonsterConfig('./config.mjs');
const monster: MonsterManager = new MonsterManager(config);
```

## Performance Optimization

### Parallelization

```javascript
// Enable parallel processing
const monster = new MonsterManager(config, {
    parallelism: 4,
    chunkSize: 100
});

// Parallel provider execution
const providers = [
    new providers.InternalLeverage(),
    new providers.Repetition(),
    new providers.Grandfather()
];

await monster.translate({ providers, parallel: true });
```

### Caching

```javascript
// Enable caching
const monster = new MonsterManager(config, {
    cache: {
        enabled: true,
        ttl: 3600, // 1 hour
        maxSize: 1000
    }
});

// Source caching
const source = new adapters.FsSource({
    globs: ['**/*.json'],
    cache: {
        enabled: true,
        strategy: 'timestamp'
    }
});
```

## Testing Support

### Mock Providers

```javascript
import { providers } from '@l10nmonster/core';

// Mock provider for testing
class MockProvider extends providers.BaseTranslationProvider {
    async requestTranslations(jobRequest) {
        return {
            jobId: 'mock-job',
            status: 'done',
            translations: jobRequest.segments.map(seg => ({
                id: seg.id,
                target: `[MOCK] ${seg.source}`
            }))
        };
    }
}
```

### Test Utilities

```javascript
import { utils } from '@l10nmonster/core';

// Test data generation
const testTu = utils.createTestTranslationUnit({
    source: 'Hello world',
    target: 'Hola mundo',
    quality: 95
});

// Configuration validation
const isValid = utils.validateConfig(config);
```

---

For comprehensive examples and advanced usage patterns, see the [main documentation](../README.md) and [architecture guide](../architecture.md).