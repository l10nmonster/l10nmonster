# @l10nmonster/helpers-deepl

L10n Monster helper for integrating with DeepL machine translation services.

## Installation

```bash
npm install @l10nmonster/helpers-deepl
```

## Usage

```javascript
import { DeepLProvider } from '@l10nmonster/helpers-deepl';

const deeplProvider = new DeepLProvider({
    authKey: 'your-deepl-api-key',
    formalityMap: {
        'de': 'more',    // Use formal German
        'fr': 'less'     // Use informal French
    },
    modelType: 'quality_optimized'
});
```

## Configuration Options

- **authKey** (required): Your DeepL API authentication key
- **formalityMap** (optional): Object mapping target languages to formality levels:
  - `less` - Less formal
  - `more` - More formal  
  - `default` - Default formality
  - `prefer_less` - Prefer less formal if available
  - `prefer_more` - Prefer more formal if available
- **modelType** (optional): Translation model type:
  - `quality_optimized` (default)
  - `prefer_quality_optimized`
  - `latency_optimized`

## Features

- Supports XML tag handling for preserving markup
- Automatic usage tracking and limit monitoring
- Context/instructions support for better translations
- Formality control for supported languages
- Comprehensive language support information

## Provider Information

The provider includes detailed information about:
- Current usage statistics (characters and documents)
- Supported source languages
- Supported target languages with formality support indicators
- Translation limits and warnings

## Dependencies

- `deepl-node`: Official DeepL Node.js client
- `@l10nmonster/core`: Core L10n Monster functionality (peer dependency)