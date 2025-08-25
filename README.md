# L10n Monster v3

> ⚠️ **v3 Pre-release Notice**: You are looking at v3.0.0-alpha.1, which contains breaking changes and is under active development. APIs may change between pre-releases. For stable v2, use `npm install @l10nmonster/cli@latest`.
>
> To test v3 pre-release:
> ```bash
> npm install @l10nmonster/core@next
> npm install @l10nmonster/cli@next
> # Install other packages as needed with @next tag
> ```

Do you want to set up continuous localization for your project but don't have a whole team to look after it? Do you know how `git` works? Have you set up a build like `esbuild` before? You've come to the right place and you'll feel right at home!

L10n Monster is the first headless and server-less TMS in the industry! It's born in a world of continuous integration and deployment. It is a solution to manage translation vendors, not translators. It pushes source content out to translation vendors and pulls translations back in. No more no less. It doesn't try to tell you how to consume content or deliver it to production. It doesn't deal with formatting and other internationalization concerns. There are plenty of i18n libraries to deal with that.

**v3 brings major architectural improvements**: ESM-native design, npm workspace support, enhanced AI/ML integrations, modular Data Access Layer, and comprehensive testing infrastructure.

# Philosophy

Localization is messy. Full of exceptions and bending backwards. As much as we want to provide an easy-to-use out-of-the-box solution by offering an opinionated implementation with reasonable defaults, the main goal should be to make solving of edge cases and advanced scenarios possible. To do this we try to componentize every aspect of localization with utilities, helpers, abstractions and then put them together into a simplified toolchain (e.g. the command-line interface). When more advanced tools are needed, just write your own with (hopefully) simple Node.js scripts built on top of the framework.

While L10n Monster is written in JS and it's more naturally extended and scripted in JS, it's built to process a variety of file formats and infrastructure scenarios that span from a single-app indie developer to enterprises with hundreds of services and million of strings to translate.

# Components

v3 introduces a modern ESM-based monorepo architecture with npm workspaces, providing better dependency management and modular development.

## Core Packages

1. **`@l10nmonster/core`**: The foundational package with DAL, managers, and plugin system
2. **`@l10nmonster/cli`**: ESM-based CLI providing the `l10n` command interface  
3. **`@l10nmonster/server`**: (Beta) Web-based interface with REST API and React UI

## Helper Packages

### Platform Support
- **`@l10nmonster/helpers-android`**: Android XML resource handling
- **`@l10nmonster/helpers-ios`**: iOS strings and localization
- **`@l10nmonster/helpers-java`**: Java properties file support

### File Formats
- **`@l10nmonster/helpers-json`**: JSON and i18next format support
- **`@l10nmonster/helpers-po`**: GNU gettext PO files
- **`@l10nmonster/helpers-xliff`**: XLIFF translation interchange
- **`@l10nmonster/helpers-html`**: HTML content processing

### AI/ML Translation
- **`@l10nmonster/helpers-openai`**: OpenAI GPT integration
- **`@l10nmonster/helpers-anthropic`**: Anthropic Claude integration  
- **`@l10nmonster/helpers-googlecloud`**: Google Cloud Translation and Vertex AI
- **`@l10nmonster/helpers-translated`**: ModernMT and Lara providers
- **`@l10nmonster/helpers-deepl`**: DeepL translation service

### Workflow Integration
- **`@l10nmonster/helpers-lqaboss`**: LQA Boss visual review integration
- **`@l10nmonster/helpers-demo`**: Development and testing utilities

## Documentation

- **[Architecture Guide](architecture.md)**: Detailed system architecture and design patterns
- **[Pipeline Documentation](pipelines.md)**: Translation workflow deep-dive
- **[v3 Migration Guide](v3.md)**: Complete overview of v3 changes and migration
- **[CLAUDE.md](CLAUDE.md)**: AI assistant integration and project commands

# Getting Started (v3)

## Prerequisites

- **Node.js**: >=22.11.0 (ESM support required)
- **Package Manager**: npm
- **Configuration**: `l10nmonster.config.mjs` (ESM format)

## Installation

```bash
# Install CLI globally
npm install -g @l10nmonster/cli

# Or use in project
npm install @l10nmonster/core @l10nmonster/cli
```

## Quick Setup

```bash
# Initialize new project
l10n init

# Analyze source content
l10n source snap
l10n analyze

# Translate content
l10n translate

# Push translated resources
l10n ops update
```

## Configuration Example

```javascript
// l10nmonster.config.mjs
import { FsSource, FsTarget } from '@l10nmonster/core';
import { GptAgent } from '@l10nmonster/helpers-openai';

export default {
  channels: [{
    source: new FsSource({ globs: ['src/**/*.json'] }),
    target: new FsTarget({ targetPath: (lang, id) => id.replace('/en/', `/${lang}/`) })
  }],
  providers: [{
    id: 'openai',
    provider: new GptAgent({ model: 'gpt-4' })
  }]
};
```

## Channels

A channel represents a logical connection from where source content comes from and translations need to go to. It is configured and implemented respectively with source and target adapters.

### Source Adapters

Sources are *adapters* used to interface with a source of content. They only deal with transport concerns and not format. They return a raw string with the content of resources and metadata associated to them. Extracted resource can declare their *format* so that they can be parsed correctly.

<details>
<summary>List of provided sources:</summary>

|Module|Export|Description|
|---|---|---|
|`@l10nmonster/core`|`adapters.FsSource`|Read from file-system sources with glob patterns|
|`@l10nmonster/core`|`adapters.HttpSource`|Read from HTTP/HTTPS URL sources|
|`@l10nmonster/helpers-googlecloud`|`BqSource`|Read from Google BigQuery data sources|

</details>

### Target Adapters

Targets are *adapters* used to interface with a content store. They may or may not go hand-in-hand with their source counterpart. Typically you want to read and write into the same store and structure, but you could also read from one structure and write into a different one in more sophisticated setups. They take a raw string with the content of translated resources in the correct format already and commit it to storage.

<details>
<summary>List of provided targets:</summary>

|Module|Export|Description|
|---|---|---|
|`@l10nmonster/core`|`adapters.FsTarget`|Write to file-system destinations|

</details>

## Formats

To deal with the multitude of variations of how content is captured, encoding and decoding of translatable resources is split into 2 parts:
1. Parsing resource files into array of messages and back is handled by `Resource Filters`.
2. Parsing message strings including their placeholders and escaping rules into a normalized message format and back is handled by `Normalizers`. Normalizers can be composed from `decoders` and `encoders`.

### Resource Filters

Filters are used to convert raw strings returned by sources into segments that are suitable for translation (ideally not too small that they can't be translated, and not too long that prevent translation reuse). They can be configured in content types as a single `resourceFilter` property.

<details>
<summary>List of provided filters:</summary>

|Module|Export|Description|
|---|---|---|
|`@l10nmonster/core`|`filters.SnapFilter`|Filter for normalized resources in snap store|
|`@l10nmonster/core`|`filters.MNFv1`|Monster Normalized Format v1 filter|
|`@l10nmonster/core`|`filters.HtmlFilter`|Enhanced HTML content filter|
|`@l10nmonster/helpers-android`|`Filter`|Android XML resource files|
|`@l10nmonster/helpers-html`|`Filter`|HTML files with advanced processing|
|`@l10nmonster/helpers-ios`|`StringsFilter`|iOS .strings files|
|`@l10nmonster/helpers-java`|`PropertiesFilter`|Java properties files|
|`@l10nmonster/helpers-json`|`i18next.Filter`|i18next v4 JSON format and generic JSON|
|`@l10nmonster/helpers-po`|`Filter`|GNU gettext PO files|
|`@l10nmonster/helpers-xliff`|`Filter`|XLIFF translation interchange files|

</details>

### Decoders

Decoders are used to convert strings with specific formats into either pure strings or placeholders. They can be configured in content types as a chain of decoders via the `decoders` property.

<details>
<summary>List of provided decoders:</summary>

|Module|Export|Description|
|---|---|---|
|`@l10nmonster/core`|`normalizers.namedDecoder`|Generic wrapper to rename a decoder|
|`@l10nmonster/core`|`normalizers.doublePercentDecoder`|Decoder for `%%` escaping|
|`@l10nmonster/core`|`normalizers.bracePHDecoder`|Decoder for `{param}` style placeholders|
|`@l10nmonster/core`|`normalizers.keywordTranslatorMaker`|Decoder/encoder pair to protect/replace keywords|
|`@l10nmonster/core`|`regex.decoderMaker(flag, regex, partDecoder)`|Internal utility to create decoders|
|`@l10nmonster/core`|`xml.entityDecoder`|Decoder for XML entities|
|`@l10nmonster/core`|`xml.CDataDecoder`|Decoder for XML CData|
|`@l10nmonster/core`|`xml.tagDecoder`|Decoder for XML tags|
|`@l10nmonster/helpers-android`|`escapesDecoder`|Decoder for escaped chars like `\n` and `\u00a0`|
|`@l10nmonster/helpers-android`|`spaceCollapser`|Decoder to convert multiple whitespace into a single space|
|`@l10nmonster/helpers-android`|`phDecoder`|Decoder for `%d` style placeholders|
|`@l10nmonster/helpers-ios`|`escapesDecoder`|Decoder for escaped chars like `\n` and `\U00a0`|
|`@l10nmonster/helpers-ios`|`phDecoder`|Decoder for `%d` style placeholders|
|`@l10nmonster/helpers-java`|`escapesDecoder`|Decoder for escaped chars like `\n` and `\u00a0`|
|`@l10nmonster/helpers-java`|`MFQuotesDecoder`|Decoder for dealing with quotes in MessageFormat strings|
|`@l10nmonster/helpers-json`|`i18next.phDecoder`|Decoder for `{{param}}` and `$t(key)` style placeholders|

</details>

### Encoders

Encoders are used to convert pure strings and placeholders back to their original format. They can be configured in content types as a chain of encoders via the `textEncoders` and `codeEncoders` properties.

<details>
<summary>List of provided encoders:</summary>

|Module|Export|Description|
|---|---|---|
|`@l10nmonster/core`|`normalizers.gatedEncoder`|Generic flag-based encoder execution|
|`@l10nmonster/core`|`normalizers.doublePercentEncoder`|Encoder for `%%` escaping|
|`@l10nmonster/core`|`regex.encoderMaker(name, regex, matchMap)`|Internal utility to create encoders|
|`@l10nmonster/core`|`xml.entityEncoder`|Encoder for XML entities|
|`@l10nmonster/helpers-android`|`escapesEncoder`|Encoder for escaped chars as required by Android|
|`@l10nmonster/helpers-ios`|`escapesEncoder`|Encoder for escaped chars like `\n`|
|`@l10nmonster/helpers-java`|`escapesEncoder`|Encoder for escaped chars like `\n`|
|`@l10nmonster/helpers-java`|`MFQuotesEncoder`|Encoder for dealing with quotes in MessageFormat strings|

</details>

## Translation Providers (v3 Enhanced)

v3 introduces a hierarchical provider architecture with BaseTranslationProvider as the foundation, supporting both synchronous and asynchronous translation workflows with enhanced error handling, parallelization, and AI/ML integration.

**Provider Types:**
- **Synchronous**: Real-time translation (MT engines) - `req` → `done`
- **Asynchronous**: Human translation workflows - `req` → `pending` → `done`
- **Internal**: Leverage existing translations and manage repetitions

**Operation Modes:**
- **Translation push**: New content submission
- **Refresh push**: Update existing translations (synchronous, generates `done` only if changed)

<details>
<summary>List of provided translation providers:</summary>

|Module|Export|Async|Sync|Translation|Refresh|Description|
|---|---|:---:|:---:|:---:|:---:|---|
|**Internal Providers**|||||
|`@l10nmonster/core`|`providers.Grandfather`|❌|✅|✅|✅|Leverage existing translated resources|
|`@l10nmonster/core`|`providers.Repetition`|❌|✅|✅|✅|Handle 100% text match repetitions|
|`@l10nmonster/core`|`providers.InternalLeverage`|❌|✅|✅|✅|Reuse translations from TM|
|`@l10nmonster/core`|`providers.Variant`|❌|✅|✅|✅|Language variant support|
|`@l10nmonster/core`|`providers.Invisicode`|❌|✅|✅|✅|Development/testing pseudo-localization|
|`@l10nmonster/core`|`providers.Visicode`|❌|✅|✅|✅|Visual string ID pseudo-localization|
|**AI/ML Providers**|||||
|`@l10nmonster/helpers-openai`|`GptAgent`|✅|❌|✅|✅|OpenAI GPT models with custom schemas|
|`@l10nmonster/helpers-anthropic`|`AnthropicAgent`|✅|❌|✅|✅|Anthropic Claude models|
|`@l10nmonster/helpers-googlecloud`|`GctProvider`|✅|❌|✅|💰|Google Cloud Translation V3|
|`@l10nmonster/helpers-googlecloud`|`GenaiAgent`|✅|❌|✅|✅|Google Vertex AI Gemini models|
|**Professional MT**|||||
|`@l10nmonster/helpers-translated`|`MmtProvider`|✅|✅|✅|💰|ModernMT (realtime and batch)|
|`@l10nmonster/helpers-translated`|`LaraProvider`|✅|❌|✅|✅|Lara advanced translation|
|`@l10nmonster/helpers-translated`|`TranslationOS`|✅|❌|✅|✅|Human translation via TOS API|
|`@l10nmonster/helpers-deepl`|`DeepL`|✅|❌|✅|💰|DeepL professional translation|
|**Workflow Integration**|||||
|`@l10nmonster/helpers-xliff`|`XliffBridge`|✅|❌|✅|❌|XLIFF file-based translation workflow|
|`@l10nmonster/helpers-lqaboss`|`LqabossProvider`|✅|❌|✅|✅|LQA Boss visual review integration|
|**Development/Demo**|||||
|`@l10nmonster/helpers-demo`|`PigLatinizer`|✅|❌|✅|✅|Pig Latin pseudo-localization|

</details>

## Operations

Running localization operations requires additional tools to support processes. The following additional components can be used:
1. **TM Stores**: provide persistence of translation memory with various storage backends
2. **Operations Stores**: manage jobs, tasks, and workflow state
3. **Store Delegates**: abstract storage implementations for different backends
4. **Analyzers**: generate reports over source content and translations
5. **Actions**: modular pieces of the localization process

<details>
<summary>List of provided stores (v3 Enhanced):</summary>

|Module|Export|Description|
|------|---|---|
|**TM Stores**|||
|`@l10nmonster/core`|`stores.BaseJsonlTmStore`|JSONL format TM with compression support|
|`@l10nmonster/core`|`stores.LegacyFileBasedTmStore`|Backward compatible TM store|
|`@l10nmonster/core`|`stores.FsTmStores`|File system TM storage|
|**Operations Stores**|||
|`@l10nmonster/core`|`stores.OpsStore`|Operations and task management|
|`@l10nmonster/core`|`stores.FsOpsStore`|File system operations store|
|**Store Delegates**|||
|`@l10nmonster/core`|`stores.FsStoreDelegate`|File system storage delegation|
|`@l10nmonster/helpers-googlecloud`|`stores.GcsStoreDelegate`|Google Cloud Storage delegation|
|`@l10nmonster/helpers-googlecloud`|`stores.GdriveStoreDelegate`|Google Drive storage delegation|
|**Cloud Stores**|||
|`@l10nmonster/helpers-googlecloud`|`stores.GcsTmStore`|Google Cloud Storage TM|

</details>

# Testing

## Comprehensive Test Suite

```bash
# Run all tests (unit + regression)
npm test

# Unit tests only
npm run test --workspaces --if-present

# Regression tests only
npm run test:regression

# Specific test case
cd regression && ./test.zsh js local android
```

**Test Coverage:**
- **200+ unit tests** across 18 workspace packages
- **Regression tests** for 8 project configurations (Android, iOS, Java, PO, HTML, etc.)
- **Integration tests** for all providers
- **End-to-end workflows** using both JavaScript API and CLI modes

## Development

```bash
# Install dependencies
npm install

# Run linting
npm run eslint

# Build packages
npm run build

# Run CLI locally
npx l10n --help
```

## Publishing

### Prerequisites

- **npm Account**: Must be logged in with publishing rights to `@l10nmonster` scope
- **Two-Factor Authentication**: If enabled, use `--otp` flag with publish commands
- **Testing**: Run full test suite before publishing

```bash
# Login to npm
npm login

# Verify login
npm whoami

# Run tests
npm test
```

### Pre-release Publishing (Alpha/Beta/RC)

For v3 development and testing, use pre-release versions with the `next` tag:

```bash
# Update to next alpha version
npm version 3.0.0-alpha.9 --workspaces

# Test publishing (dry run)
npm run publish:next-dry

# Publish to npm with 'next' tag
npm run publish:next

# Users install with: npm install @l10nmonster/core@next
```

**Version Progression:**
- `3.0.0-alpha.1` → `3.0.0-alpha.2` → ... (unstable, breaking changes allowed)
- `3.0.0-beta.1` → `3.0.0-beta.2` → ... (feature-complete, API stabilizing)
- `3.0.0-rc.1` → `3.0.0-rc.2` → ... (release candidates, bug fixes only)

### Stable Publishing

When ready for stable release:

```bash
# Update to stable version
npm version 3.0.0 --workspaces

# Test publishing (dry run)
npm run publish:npm-dry

# Publish to npm with 'latest' tag
npm run publish:npm

# Users install with: npm install @l10nmonster/core (gets latest)
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run publish:next-dry` | Dry run pre-release publish with `next` tag |
| `npm run publish:next` | Publish pre-release versions with `next` tag |
| `npm run publish:npm-dry` | Dry run stable publish with `latest` tag |
| `npm run publish:npm` | Publish stable versions with `latest` tag |

### Publishing Workflow

1. **Feature Development**: Work on feature branches
2. **Alpha Release**: Merge to `v3` branch, publish alpha for testing
3. **Beta Release**: When feature-complete, publish beta for wider testing
4. **RC Release**: When stable, publish release candidate
5. **Stable Release**: Final version with `latest` tag

### Version Management

```bash
# Check current versions
npm list --workspaces --depth=0

# Update specific version type
npm version prerelease --workspaces  # alpha.1 → alpha.2
npm version preminor --workspaces    # alpha → beta
npm version premajor --workspaces    # beta → rc

# Remove pre-release identifier
npm version patch --workspaces       # rc → stable
```

### Troubleshooting

**Common Issues:**
- `403 Forbidden`: Check npm login and scope permissions
- `Version already published`: Bump version before publishing
- `Access denied`: Add `--access public` flag (already included in scripts)
- `2FA required`: Add `--otp=123456` flag to publish commands

**Rollback:**
```bash
# Deprecate a published version
npm deprecate @l10nmonster/core@3.0.0-alpha.1 "Please use @next for latest pre-release"

# Unpublish (only within 24 hours)
npm unpublish @l10nmonster/core@3.0.0-alpha.1
```