# @l10nmonster/helpers-translated

L10n Monster helpers for integrating with Translated.com services including Modern MT and Lara.

## Installation

```bash
npm install @l10nmonster/helpers-translated
```

## Providers

### MMTProvider

Machine translation provider using Modern MT API with both real-time and batch translation support.

```javascript
import { MMTProvider } from '@l10nmonster/helpers-translated';

const mmtProvider = new MMTProvider({
    apiKey: 'your-mmt-api-key',
    // Additional configuration options
});
```

### LaraProvider

Human translation provider using Lara API for professional translation services.

```javascript
import { LaraProvider } from '@l10nmonster/helpers-translated';

const laraProvider = new LaraProvider({
    apiKey: 'your-lara-api-key',
    // Additional configuration options
});
```

## Features

- **Modern MT Integration**: High-quality machine translation with customizable models
- **Lara Integration**: Professional human translation services
- **Batch Processing**: Efficient handling of large translation jobs
- **Real-time Translation**: Immediate translation for smaller content
- **Cost Tracking**: Built-in billing and usage monitoring

## Dependencies

- `@translated/lara`: Official Lara API client
- `modernmt`: Modern MT API client
- `@l10nmonster/core`: Core L10n Monster functionality (peer dependency)

## Testing

The package includes comprehensive tests for Modern MT functionality:

```bash
npm test
```

Test artifacts are included for validation of API responses and job processing.