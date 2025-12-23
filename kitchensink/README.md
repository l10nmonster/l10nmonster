# l10nmonster

The complete L10n Monster package - a headless, serverless Translation Management System (TMS) for continuous localization workflows.

## Installation

```bash
npm install l10nmonster
```

This single package includes all L10n Monster functionality with automatic transitive dependency management.

## Entry Points

The package provides separate entry points for tree-shaking and on-demand loading:

```javascript
// Core functionality
import { L10nMonsterConfig, ChannelConfig, adapters, providers, normalizers } from 'l10nmonster';

// Platform-specific helpers (import only what you need)
import * as android from 'l10nmonster/android';
import * as ios from 'l10nmonster/ios';
import * as java from 'l10nmonster/java';
import * as json from 'l10nmonster/json';
import * as html from 'l10nmonster/html';
import * as po from 'l10nmonster/po';
import * as xliff from 'l10nmonster/xliff';

// Translation providers
import * as openai from 'l10nmonster/openai';
import * as anthropic from 'l10nmonster/anthropic';
import * as deepl from 'l10nmonster/deepl';
import * as googlecloud from 'l10nmonster/googlecloud';
import * as translated from 'l10nmonster/translated';

// Demo/testing
import * as demo from 'l10nmonster/demo';

// Additional tools
import * as server from 'l10nmonster/server';
import * as mcp from 'l10nmonster/mcp';
import * as lqaboss from 'l10nmonster/lqaboss';
import * as configMancer from 'l10nmonster/config-mancer';
```

## Quick Start

```javascript
import { L10nMonsterConfig, ChannelConfig, adapters, providers, normalizers } from 'l10nmonster';
import * as android from 'l10nmonster/android';
import * as demo from 'l10nmonster/demo';

export default new L10nMonsterConfig(import.meta.dirname)
    .channel(new ChannelConfig('main')
        .source(new adapters.FsSource({
            sourceLang: 'en',
            globs: ['**/values/strings.xml'],
        }))
        .resourceFilter(new android.AndroidXMLFilter())
        .decoders([android.escapesDecoder, android.phDecoder])
        .target(new adapters.FsTarget({
            targetPath: (lang, rid) => rid.replace('/values/', `/values-${lang}/`)
        })))
    .provider(new providers.Grandfather({ quality: 70 }))
    .provider(new demo.PigLatinizer({ quality: 1 }));
```

## CLI Usage

```bash
npx l10n monster          # Test config and show status
npx l10n source snap      # Snapshot sources
npx l10n translate        # Run translation pipeline
npx l10n source list      # List source resources
npx l10n tm list          # List TM entries
```

## Available Entry Points

| Entry Point | Description |
|-------------|-------------|
| `l10nmonster` | Core library (L10nMonsterConfig, adapters, providers, normalizers) |
| `l10nmonster/android` | Android XML format support |
| `l10nmonster/ios` | iOS .strings and .stringsdict support |
| `l10nmonster/java` | Java .properties support |
| `l10nmonster/json` | JSON/i18next format support |
| `l10nmonster/html` | HTML format support |
| `l10nmonster/po` | Gettext PO format support |
| `l10nmonster/xliff` | XLIFF format support |
| `l10nmonster/openai` | OpenAI GPT translation provider |
| `l10nmonster/anthropic` | Anthropic Claude translation provider |
| `l10nmonster/deepl` | DeepL translation provider |
| `l10nmonster/googlecloud` | Google Cloud Translation & GenAI |
| `l10nmonster/translated` | Translated.com (MMT, Lara) providers |
| `l10nmonster/demo` | Demo provider (PigLatinizer) |
| `l10nmonster/server` | Web server with UI |
| `l10nmonster/mcp` | Model Context Protocol server |
| `l10nmonster/lqaboss` | LQA Boss visual review tools |
| `l10nmonster/config-mancer` | Configuration utilities |

## Individual Packages

For more granular control, individual scoped packages are available:

- `@l10nmonster/core` - Core library only
- `@l10nmonster/cli` - CLI only
- `@l10nmonster/helpers-android` - Android support only
- `@l10nmonster/helpers-ios` - iOS support only
- ... and more

## Documentation

See [L10n Monster Documentation](https://github.com/l10nmonster/l10nmonster#readme) for full details.

## License

MIT
