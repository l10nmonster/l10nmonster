# @l10nmonster/helpers-demo

Demo and pseudo-localization helpers for L10n Monster, providing development and testing utilities.

## Installation

```bash
npm install @l10nmonster/helpers-demo
```

## Components

|Component|Export|Type|Description|
|---|---|---|---|
|**Provider**|`PigLatinizer`|Translation Provider|Pseudo-localization using Pig Latin transformation|

## PigLatinizer Provider

A pseudo-localization provider that converts source text into [Pig Latin](https://en.wikipedia.org/wiki/Pig_Latin) for development and testing purposes.

### Features

- **Visual Testing**: Identifies hard-coded strings and text concatenation issues
- **Text Expansion**: Simulates text expansion that occurs in real translations  
- **Layout Testing**: Helps test UI layout with longer text
- **Development Aid**: Provides immediate feedback without waiting for real translations

### Usage

```javascript
import { PigLatinizer } from '@l10nmonster/helpers-demo';

const pigProvider = new PigLatinizer({
    quality: 1  // Low quality score (1-100)
});
```

### Configuration

```javascript
// l10nmonster.config.mjs
import { PigLatinizer } from '@l10nmonster/helpers-demo';

export default {
    providers: [{
        id: 'demo-translator',
        provider: new PigLatinizer({
            quality: 1,
            preservePlaceholders: true,
            addBrackets: true
        })
    }]
};
```

### Configuration Options

- **`quality`** (number): Quality score for translations (default: 1)
- **`preservePlaceholders`** (boolean): Keep placeholders intact (default: true)
- **`addBrackets`** (boolean): Add brackets to identify pseudo-translated text (default: false)
- **`expansion`** (number): Text expansion factor (default: 1.3)

### Pig Latin Rules

The PigLatinizer follows standard Pig Latin rules:

1. **Consonant start**: "hello" → "ello-hay"
2. **Vowel start**: "apple" → "apple-way"  
3. **Consonant clusters**: "string" → "ing-stray"
4. **Preserve placeholders**: "Hello {{name}}" → "Ello-hay {{name}}"

### Examples

```javascript
// Basic transformation
"Hello world" → "Ello-hay orld-way"

// With placeholders preserved
"Welcome {{user}}" → "Elcome-way {{user}}"

// With brackets for identification
"Save changes" → "[Ave-say anges-chay]"

// Numbers and special characters preserved
"You have 5 messages" → "Ou-yay ave-hay 5 essages-may"
```

## Integration Examples

### Development Workflow

```javascript
// Development configuration
export default {
    providers: [
        {
            id: 'internal',
            provider: 'InternalLeverage'
        },
        {
            id: 'demo',
            provider: new PigLatinizer({ 
                quality: 1,
                addBrackets: true 
            })
        }
    ]
};
```

### Testing Configuration

```javascript
// Testing environment with pseudo-localization
export default {
    providers: [{
        id: 'test-pseudo',
        provider: new PigLatinizer({
            quality: 1,
            expansion: 1.5,  // 50% text expansion
            addBrackets: true
        })
    }],
    
    channels: [{
        source: new FsSource({ globs: ['src/**/*.json'] }),
        target: new FsTarget({ 
            targetPath: (lang, resourceId) => {
                // Create pseudo-locale for testing
                if (lang === 'pseudo') {
                    return resourceId.replace('/en/', '/pseudo/');
                }
                return resourceId.replace('/en/', `/${lang}/`);
            }
        })
    }]
};
```

### Multi-Provider Chain

```javascript
export default {
    providers: [
        { id: 'leverage', provider: 'InternalLeverage' },
        { id: 'repetition', provider: 'Repetition' },
        { id: 'demo', provider: new PigLatinizer({ quality: 1 }) },
        { id: 'fallback', provider: 'Invisicode' }
    ]
};
```

## Use Cases

### Development
- **Immediate feedback**: See translation layout without waiting for real translations
- **Hard-coded string detection**: Identify text that isn't being translated
- **Concatenation issues**: Find problematic string concatenation

### QA Testing  
- **Layout testing**: Verify UI handles longer text properly
- **Text expansion**: Simulate real-world text growth
- **Placeholder verification**: Ensure placeholders are preserved correctly

### Demonstration
- **Client demos**: Show localization capabilities quickly
- **Proof of concept**: Demonstrate translation workflows
- **Training**: Teach localization concepts

## Advanced Features

### Custom Transformation

```javascript
class CustomPigLatinizer extends PigLatinizer {
    transformText(text) {
        // Custom transformation logic
        let result = super.transformText(text);
        
        // Add custom markers
        return `🐷 ${result} 🐷`;
    }
}
```

### Selective Processing

```javascript
const provider = new PigLatinizer({
    quality: 1,
    shouldTransform: (text, context) => {
        // Skip certain content types
        if (context.resourceId.includes('error-messages')) {
            return false;
        }
        return true;
    }
});
```

## Performance

The PigLatinizer is optimized for development use:

- **Fast processing**: Immediate transformation without API calls
- **Low overhead**: Minimal CPU and memory usage
- **Deterministic**: Same input always produces same output
- **Offline capable**: No network dependencies

## Testing

```bash
npm test
```

The test suite covers:
- Pig Latin transformation rules
- Placeholder preservation
- Text expansion calculations
- Error handling
- Integration with L10n Monster core

## Comparison with Other Pseudo-Localization

| Feature | PigLatinizer | Invisicode | Traditional Pseudo |
|---------|-------------|------------|-------------------|
| **Human readable** | ✅ Yes | ❌ No | ✅ Partial |
| **Text expansion** | ✅ Natural | ✅ Configurable | ✅ Padding |
| **Layout testing** | ✅ Good | ✅ Excellent | ✅ Good |
| **Fun factor** | ✅ High | ✅ Medium | ❌ Low |

## Requirements

- Node.js >= 20.12.0
- @l10nmonster/core (peer dependency)

## Related Documentation

- [Pseudo-localization Best Practices](https://en.wikipedia.org/wiki/Pseudolocalization)
- [L10n Monster Core Documentation](../core/README.md)
- [Translation Provider Guide](../core/README.md#translation-providers)