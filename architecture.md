# L10n Monster Architecture (v3)

## Overview

L10n Monster v3 represents a major architectural evolution, transitioning to a modern ESM-based monorepo structure with enhanced modularity, improved performance, and comprehensive AI/ML integration capabilities.

## Basic assumptions

The system is designed with modern translation principles in mind. Specifically:

* The translation process is composed of a pipeline of steps that starts from reading the source content and ends in writing corresponding translated resources.
* Source content is split into translation units, each with a guid that identifies them. Two translation units with the same guid would get the same identical translation.
* The guid is derived from the resource id, the logical string id, and the source text. This is the most strict guid generation logic and allows extreme contextual customization.
* Translations of the same source text can be reused in different string id's and/or resource id's but quality may suffer because sometimes context changes translations. Users can configure, based on their use cases, how much quality is degraded and whether reuse is acceptable or not.
* Translated resources are never source of record and can be re-generated / overwritten at any time.
* Translations are organized in translation jobs typically sent to translation vendors. Completed translation jobs are saved and constitute the source of record.
* Translation processes may yield different levels of quality (e.g. machine translation vs. single-pass human translation vs. human translation with review). Each translation unit carries a level of quality.
* Based on the collection of translation jobs and simple aggregation rules (e.g. latest highest quality translation wins) we can generate a translation memory that maps a guid into a string in the target language.
* The latest source content mapped through the latest translation memory yield the best available translated resources.
* Layered areas of concern and ownership. Localization gets very messy very fast because of a lack of standardization. For example, you may look at an "iOS strings" file but then you realize placeholders used are not `%@` or that it contains HTML. For this reason, there must be sufficient modularity and pluggability to support non-standard use cases (in the example, the message format parser should be decoupled from the file format serializer/deserializer).

## Design

The translation pipeline is composed of 4 successive modules:

1. **Source Adapter**: reads source content from its storage medium (e.g. file system, DB, cloud storage) into in-memory resources.
2. **Format Filter**: converts resources of a specific format into a series of translation units in a normalized format.
3. **Translation Provider**: submits source content for translation and retrieves translated content when complete (formerly "Translator").
4. **Target Adapter**: takes translated resources and commits them in their storage medium (which may or may not be the same as the source).

In addition to configurable modular pipelines, the system supports:
- **Pluggable TM stores** for translation memory persistence
- **Operations stores** for job and task management 
- **Snap stores** for content snapshots
- **Data Access Layer (DAL)** for unified data operations

### Source Adapter

* `async fetchResourceStats()` -> `[ { id, modified } ]` - list all source resources
* `async fetchResource(resourceId)` -> `string` - fetch the specific resource as a string

### Format Filter

* `async parseResource({ resource, isSource })` -> `{ translationUnits }` - convert a raw resource into a normalized list of translation units, each as `{ sid, str, notes, msgFmt, isSuffixPluralized }`
* `translateResource({ resourceId, resource, lang, translator })` -> `string` - generate the translated version of a raw resource

### Translation Provider (v3 Enhanced)

The provider system has been significantly enhanced in v3 with a hierarchical architecture:

#### BaseTranslationProvider
* Foundation class providing common functionality for all providers
* Handles chunking, parallelization, and error management
* `async requestTranslations(jobRequest)` -> `jobResponse` - submit a translation job
* `async fetchTranslations(jobManifest)` -> `jobResponse` - fetch in-flight translation units

#### Specialized Providers
* **ChunkedRemoteTranslationProvider**: Handles large jobs via chunking
* **LLMTranslationProvider**: AI/ML translation with GPT, Claude, etc.
* **InternalLeverage**: Reuses existing translations from TM
* **Grandfather**: Legacy translation preservation
* **Repetition**: Handles duplicate content efficiently
* **Variant**: Language variant support
* **Invisicode**: Development/testing provider

### Target Adapter

* `async fetchTranslatedResource(lang, resourceId)` -> `string` - fetch the specific translated resource as a string
* `async commitTranslatedResource(lang, resourceId, translatedRes)` - write the specific translated resource

### Translation Memory Design (v3 Enhanced)

The collection of all translation jobs yields internally to a translation memory that is the source of truth of all translations. v3 introduces multiple TM storage formats and enhanced data structures.

#### TM Entry Structure
```json
"tu": {
    "bRBL1Isi3Xj28gXDOAgjrQfgd3j4u+evwXScOaysjwk=": {
        "guid": "7Yg93c458EbHxMIJHNXXG77jF5ZnrMzxv8ScSU0oCyQ",
        "rid": "dashlets/activity-list.get_en.properties",
        "sid": "title.generic",
        "src": "New Activity",
        "tgt": "Nuova attività",
        "q": 80,
        "ts": 12324543654,
        "jobId": 1,
        "tp": "ModernMT",
        "metadata": { /* provider-specific data */ }
    }
}
```

#### TM Storage Options (v3)
* **BaseJsonlTmStore**: JSON Lines format with compression support
* **LegacyFileBasedTmStore**: Backward compatibility with v2 stores
* **FsTmStores**: File system-based storage with multiple backends
* **Cloud stores**: GCS, S3, and other cloud storage integrations

The first hash used as the key in the `tu` object is based on the normalized source string, ignoring placeholder literals and only preserving positions (this enables cross-platform string sharing between iOS, Android, etc.).


## System Design (v3 Architecture)

v3 introduces a modular monorepo architecture supporting simple single-developer use cases while scaling to enterprise scenarios with thousands of developers and localization teams.

### Core Components

#### L10n Monster Core (`@l10nmonster/core`)
The foundational module containing:

**Data Access Layer (DAL)**
- `DAL/job.js` - Job management operations
- `DAL/source.js` - Source content operations  
- `DAL/tu.js` - Translation unit operations
- `DAL/tmBlock.js` - Translation memory block operations

**Manager Systems**
- **MonsterManager**: Analysis and content processing with modular dispatcher
- **OpsManager**: Operations and task management with parallel execution
- **ResourceManager**: Resource handling and caching
- **TmManager**: Translation memory operations and synchronization

**Configuration System**
- **ConfigMancer**: Advanced configuration management
- **L10nContext**: Centralized context and state management
- **L10nMonsterConfig**: Enhanced configuration parsing and validation

#### L10n Monster CLI (`@l10nmonster/cli`)
ESM-based CLI tool providing the `l10n` command interface:
- Action-based command structure
- Enhanced error reporting and debugging
- Support for workspace configurations
- Integration with all core managers

**Configuration Files (v3)**
- `l10nmonster.config.mjs` - ESM-based configuration (replaces `.cjs`)
- Workspace-aware configurations for monorepos
- Enhanced channel and provider definitions
- ConfigMancer-based validation and defaults

**Metadata Storage**
- `l10nmonster/` directory (replaces `.l10nmonster/`)
- Structured storage for jobs, TM, operations, and snapshots
- Multiple storage backend support (FS, cloud, etc.)

### Helper Package Ecosystem

v3 introduces a comprehensive helper package system:

#### Platform-Specific Helpers
- `helpers-android` - Android XML and resource handling
- `helpers-ios` - iOS strings and localization support
- `helpers-java` - Java properties file support

#### Format-Specific Helpers  
- `helpers-json` - JSON and i18next format support
- `helpers-po` - GNU gettext PO file support
- `helpers-xliff` - XLIFF translation interchange support
- `helpers-html` - HTML content processing

#### AI/ML Translation Helpers
- `helpers-openai` - OpenAI GPT integration
- `helpers-anthropic` - Anthropic Claude integration
- `helpers-googlecloud` - Google Cloud Translation and Vertex AI
- `helpers-translated` - ModernMT and Lara provider support
- `helpers-deepl` - DeepL translation integration

#### Workflow Helpers
- `helpers-lqaboss` - LQA Boss visual review integration
- `helpers-demo` - Development and testing utilities

### L10n Monster Server (Beta)
New in v3 - a web-based interface for enterprise scenarios:
- REST API for translation operations
- React-based web UI
- Multi-project management
- Integration with existing CLI workflows

### Translation Policies and Plans (v3)
New strategic translation management:
- **Translation Policies**: Rule-based translation routing
- **Translation Plans**: Strategic planning and resource allocation  
- **Quality Scoring**: Enhanced translation quality assessment
- **Leverage Analysis**: Intelligent reuse of existing translations

### Workspace Architecture
v3 supports monorepo workflows with:
- pnpm workspace management
- Shared configuration inheritance
- Cross-package dependency resolution
- Centralized tooling and testing
