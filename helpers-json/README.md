# @l10nmonster/helpers-json

L10n Monster helper for JSON file formats, supporting both generic JSON structures and specialized formats like i18next and ARB (Application Resource Bundle).

## Installation

```bash
npm install @l10nmonster/helpers-json
```

## Features

### JSON Filter

A comprehensive filter for JSON files that supports:
- **ARB annotations** as defined by the [ARB specification](https://github.com/google/app-resource-bundle/wiki/ApplicationResourceBundleSpecification)
- **i18next v4 format** including arrays, nested keys, and plurals
- **Generic JSON** structures with flexible key handling
- **Placeholder processing** with multiple syntaxes

### Supported Formats

#### i18next JSON v4
The industry standard JSON format for internationalization:

```json
{
  "welcome": "Welcome {{name}}!",
  "items_one": "{{count}} item",
  "items_other": "{{count}} items",
  "nested": {
    "key": "Nested value"
  },
  "arrayValue": ["First", "Second", "Third"]
}
```

#### ARB (Application Resource Bundle)
Google's JSON-based localization format:

```json
{
  "welcome": "Welcome {name}!",
  "@welcome": {
    "description": "Welcome message",
    "placeholders": {
      "name": {
        "type": "String"
      }
    }
  }
}
```

## Usage

### Basic Configuration

```javascript
import { Filter } from '@l10nmonster/helpers-json';

const jsonFilter = new Filter({
    enableArbAnnotations: true,    // Support ARB @-prefixed annotations
    enablePluralSuffixes: true,    // Support i18next plural suffixes (_one, _other)
    emitArbAnnotations: true,      // Include ARB annotations in output
    enableArrays: true            // Support array values
});
```

### Integration with L10n Monster

```javascript
// l10nmonster.config.mjs
import { FsSource, FsTarget } from '@l10nmonster/core';
import { Filter, i18next } from '@l10nmonster/helpers-json';

export default {
    channels: [{
        source: new FsSource({ 
            globs: ['locales/en/**/*.json'] 
        }),
        target: new FsTarget({ 
            targetPath: (lang, resourceId) => 
                resourceId.replace('/en/', `/${lang}/`)
        })
    }],
    
    contentTypes: [{
        name: 'i18next-json',
        resourceFilter: new Filter({
            enablePluralSuffixes: true,
            enableArrays: true
        }),
        decoders: [i18next.phDecoder],
        textEncoders: ['bracketEncoder']
    }]
};
```

## Configuration Options

### Filter Options

- **`enableArbAnnotations`** (boolean): Enable ARB annotation support
- **`enablePluralSuffixes`** (boolean): Enable i18next plural suffix handling
- **`emitArbAnnotations`** (boolean): Include ARB annotations in translated output
- **`enableArrays`** (boolean): Support JSON array values
- **`maxDepth`** (number): Maximum nesting depth for nested objects
- **`keyDelimiter`** (string): Delimiter for nested key flattening

### Placeholder Decoders

The package includes specialized placeholder decoders:

```javascript
import { i18next } from '@l10nmonster/helpers-json';

// i18next placeholder decoder for {{param}} and $t(key) syntax
const decoder = i18next.phDecoder();
```

## Supported JSON Structures

### Flat Structure
```json
{
  "key1": "Simple value",
  "key2": "Value with {{placeholder}}"
}
```

### Nested Structure
```json
{
  "section": {
    "subsection": {
      "key": "Deeply nested value"
    }
  }
}
```

### Plurals (i18next)
```json
{
  "item_one": "{{count}} item",
  "item_other": "{{count}} items",
  "item_zero": "No items"
}
```

### Arrays
```json
{
  "fruits": ["Apple", "Banana", "Orange"],
  "mixed": [
    "String value",
    {"nested": "object"}
  ]
}
```

### ARB with Annotations
```json
{
  "pageTitle": "My App",
  "@pageTitle": {
    "description": "Title of the application"
  },
  "greeting": "Hello {name}",
  "@greeting": {
    "description": "Greeting message",
    "placeholders": {
      "name": {
        "type": "String",
        "example": "John"
      }
    }
  }
}
```

## Placeholder Formats

### i18next Format
- **Interpolation**: `{{variable}}`
- **Translation function**: `$t(namespace:key)`
- **Formatting**: `{{variable, format}}`

### ARB Format
- **Simple placeholders**: `{variable}`
- **Typed placeholders**: `{count, number}`, `{date, date}`

### Generic Formats
- **Brace placeholders**: `{param}`
- **Percent placeholders**: `%s`, `%d`, `%1$s`

## Advanced Features

### Namespace Support

```javascript
// Namespace-aware configuration
const filter = new Filter({
    enableNamespaces: true,
    namespaceDelimiter: ':'
});
```

### Custom Key Processing

```javascript
const filter = new Filter({
    keyProcessor: (key, value, context) => {
        // Custom logic for key transformation
        if (key.startsWith('_')) {
            return null; // Skip private keys
        }
        return { key, value };
    }
});
```

### Validation and Schema

```javascript
const filter = new Filter({
    validateStructure: true,
    requiredKeys: ['title', 'description'],
    schema: {
        type: 'object',
        properties: {
            title: { type: 'string' },
            description: { type: 'string' }
        }
    }
});
```

## Integration Examples

### React i18next Project

```javascript
// l10nmonster.config.mjs
import { Filter, i18next } from '@l10nmonster/helpers-json';

export default {
    channels: [{
        source: new FsSource({ 
            globs: ['public/locales/en/**/*.json'] 
        }),
        target: new FsTarget({ 
            targetPath: (lang, resourceId) => 
                resourceId.replace('/en/', `/${lang}/`)
        })
    }],
    
    contentTypes: [{
        name: 'react-i18next',
        resourceFilter: new Filter({
            enablePluralSuffixes: true,
            enableArrays: true,
            enableNamespaces: true
        }),
        decoders: [i18next.phDecoder]
    }]
};
```

### Flutter ARB Project

```javascript
export default {
    channels: [{
        source: new FsSource({ 
            globs: ['lib/l10n/app_en.arb'] 
        }),
        target: new FsTarget({ 
            targetPath: (lang, resourceId) => 
                resourceId.replace('_en.arb', `_${lang}.arb`)
        })
    }],
    
    contentTypes: [{
        name: 'flutter-arb',
        resourceFilter: new Filter({
            enableArbAnnotations: true,
            emitArbAnnotations: true
        })
    }]
};
```

### Generic JSON API

```javascript
export default {
    channels: [{
        source: new FsSource({ 
            globs: ['api/messages/en.json'] 
        }),
        target: new FsTarget({ 
            targetPath: (lang, resourceId) => 
                resourceId.replace('/en.json', `/${lang}.json`)
        })
    }],
    
    contentTypes: [{
        name: 'api-json',
        resourceFilter: new Filter({
            enableArrays: true,
            maxDepth: 3
        })
    }]
};
```

## Testing

```bash
npm test
```

The test suite covers:
- JSON parsing and generation
- ARB annotation handling
- i18next plural suffix processing
- Placeholder extraction and preservation
- Nested structure handling
- Array value processing

## Performance Considerations

### Large Files
- Use `maxDepth` to limit processing depth
- Consider splitting large JSON files
- Enable streaming for very large datasets

### Memory Usage
- Arrays are loaded entirely into memory
- Nested objects are processed recursively
- Consider file size limits for production use

## Migration from v2

### Configuration Changes
```javascript
// v2 (deprecated)
this.resourceFilter = new filters.JsonFilter();

// v3 (current)
import { Filter } from '@l10nmonster/helpers-json';
const filter = new Filter();
```

### Import Updates
```javascript
// v2
const { helpers } = require('@l10nmonster/helpers');

// v3
import { Filter, i18next } from '@l10nmonster/helpers-json';
```

## Requirements

- Node.js >= 22.11.0
- @l10nmonster/core (peer dependency)

## Related Documentation

- [i18next Documentation](https://www.i18next.com/)
- [ARB Specification](https://github.com/google/app-resource-bundle/wiki/ApplicationResourceBundleSpecification)
- [L10n Monster Core Documentation](../core/README.md)