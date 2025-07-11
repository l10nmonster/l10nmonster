# @l10nmonster/helpers-android

L10n Monster helper for Android XML resource files, providing filters, decoders, and encoders for Android app localization.

## Installation

```bash
npm install @l10nmonster/helpers-android
```

## Components

|Component|Export|Description|
|---|---|---|
|**Filter**|`Filter`|Resource filter for Android XML files|
|**Decoders**|||
||`escapesDecoder`|Decoder for escaped chars like `\n` and `\u00a0`|
||`spaceCollapser`|Decoder to convert multiple whitespace into single space|
||`phDecoder`|Decoder for `%d` style placeholders|
|**Encoders**|||
||`escapesEncoder`|Encoder for escaped chars as required by Android|

## Usage

### Android XML Filter

```javascript
import { Filter } from '@l10nmonster/helpers-android';

const androidFilter = new Filter({
    comment: 'pre'  // Options: 'pre', 'post', 'right'
});
```

The filter processes Android XML resource files (`strings.xml`, `plurals.xml`, etc.) and handles:
- String resources with proper escaping
- Plural forms (quantity="one", "other", etc.)
- Comments and developer notes positioning
- CDATA sections for complex text
- Resource attributes (`translatable`, `formatted`, etc.)

### Comment Positioning

- **`pre`**: Places developer comments before the string element
- **`post`**: Places comments after the string element  
- **`right`**: Places comments on the same line as the string

### Decoders and Encoders

```javascript
import { 
    escapesDecoder, 
    spaceCollapser, 
    phDecoder,
    escapesEncoder 
} from '@l10nmonster/helpers-android';

// Use in content type configuration
const contentType = {
    name: 'android-strings',
    resourceFilter: androidFilter,
    decoders: [escapesDecoder, spaceCollapser, phDecoder],
    textEncoders: [escapesEncoder]
};
```

## Supported Android Features

### String Resources
- Basic string elements: `<string name="key">value</string>`
- Formatted strings with placeholders: `%s`, `%d`, `%1$s`
- Non-translatable strings: `translatable="false"`
- Formatted attribute: `formatted="false"`

### Plurals
- Quantity-based plurals: `zero`, `one`, `two`, `few`, `many`, `other`
- Proper plural form handling per Android guidelines

### Text Formatting
- Escape sequences: `\n`, `\t`, `\u0020`, etc.
- HTML tags in strings (preserved as placeholders)
- CDATA sections for complex markup
- Apostrophe and quote escaping

### XML Features
- XML entities (`&lt;`, `&gt;`, `&amp;`, etc.)
- Comments and developer notes
- Resource arrays (basic support)

## Configuration Examples

### Basic Android Project

```javascript
// l10nmonster.config.mjs
import { FsSource, FsTarget } from '@l10nmonster/core';
import { Filter } from '@l10nmonster/helpers-android';

export default {
    channels: [{
        source: new FsSource({ 
            globs: ['app/src/main/res/values/strings.xml'] 
        }),
        target: new FsTarget({ 
            targetPath: (lang, resourceId) => 
                resourceId.replace('/values/', `/values-${lang}/`)
        })
    }],
    
    contentTypes: [{
        name: 'android-xml',
        resourceFilter: new Filter({ comment: 'pre' })
    }]
};
```

### Multi-Module Android Project

```javascript
export default {
    channels: [{
        source: new FsSource({ 
            globs: [
                'app/src/main/res/values/strings.xml',
                'feature-*/src/main/res/values/strings.xml',
                'library-*/src/main/res/values/strings.xml'
            ]
        }),
        target: new FsTarget({ 
            targetPath: (lang, resourceId) => {
                // Handle different module structures
                if (resourceId.includes('/values/')) {
                    return resourceId.replace('/values/', `/values-${lang}/`);
                }
                return resourceId;
            }
        })
    }]
};
```

## File Structure Support

L10n Monster supports standard Android resource directory structure:

```
app/src/main/res/
├── values/              # Default (English) strings
│   ├── strings.xml
│   ├── plurals.xml
│   └── arrays.xml
├── values-es/           # Spanish translations
│   └── strings.xml
├── values-zh-rCN/       # Chinese (China) translations
│   └── strings.xml
└── values-b+es+419/     # Spanish (Latin America) - BCP 47
    └── strings.xml
```

## Android-Specific Features

### Placeholder Handling

The helper properly handles Android string formatting:

```xml
<!-- Source -->
<string name="welcome">Hello %1$s, you have %2$d messages</string>

<!-- Maintains placeholder order and type -->
<string name="welcome">Hola %1$s, tienes %2$d mensajes</string>
```

### Escape Sequence Processing

```xml
<!-- Input -->
<string name="multiline">First line\nSecond line\tTabbed</string>

<!-- Properly escaped output -->
<string name="multiline">Primera línea\nSegunda línea\tTabulada</string>
```

### Plural Forms

```xml
<!-- Source -->
<plurals name="items">
    <item quantity="one">%d item</item>
    <item quantity="other">%d items</item>
</plurals>

<!-- Translated with proper quantity handling -->
<plurals name="items">
    <item quantity="one">%d elemento</item>
    <item quantity="other">%d elementos</item>
</plurals>
```

## Testing

```bash
npm test
```

The test suite covers:
- XML parsing and generation
- Escape sequence handling
- Placeholder preservation
- Plural form processing
- Comment positioning
- CDATA section handling

## Integration with L10n Monster

This helper integrates seamlessly with L10n Monster's provider system:

```javascript
import { providers } from '@l10nmonster/core';
import { GptAgent } from '@l10nmonster/helpers-openai';

export default {
    providers: [{
        id: 'ai-translator',
        provider: new GptAgent({ 
            model: 'gpt-4',
            systemPrompt: 'Translate Android app strings, preserving all placeholders and formatting.'
        })
    }]
};
```

## Requirements

- Node.js >= 20.12.0
- @l10nmonster/core (peer dependency)

## Related Documentation

- [Android String Resources](https://developer.android.com/guide/topics/resources/string-resource)
- [Android Localization](https://developer.android.com/guide/topics/resources/localization)
- [L10n Monster Core Documentation](../core/README.md)