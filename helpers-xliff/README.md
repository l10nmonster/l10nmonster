# @l10nmonster/helpers-xliff

L10n Monster helper for XLIFF (XML Localization Interchange File Format) files, the industry standard for translation exchange.

## Installation

```bash
npm install @l10nmonster/helpers-xliff
```

## Components

|Component|Export|Type|Description|
|---|---|---|---|
|**Filter**|`Filter`|Resource Filter|XLIFF file format parser and generator|
|**Provider**|`XliffBridge`|Translation Provider|File-based translation workflow via XLIFF|

## XLIFF Filter

Processes XLIFF files for translation unit extraction and generation.

### Usage

```javascript
import { Filter } from '@l10nmonster/helpers-xliff';

const xliffFilter = new Filter({
    version: '2.1',  // XLIFF version: '1.2', '2.0', '2.1'
    preserveStructure: true
});
```

### Supported XLIFF Versions

- **XLIFF 1.2**: Legacy format, widely supported
- **XLIFF 2.0**: Modern format with enhanced features  
- **XLIFF 2.1**: Latest standard with improved metadata

## XliffBridge Provider

A translation provider that uses XLIFF files for translation exchange, enabling integration with external translation tools and services.

### Features

- **File-based workflow**: Exchange translations via XLIFF files
- **Vendor integration**: Compatible with most translation tools
- **Quality tracking**: Maintains translation quality scores
- **State management**: Tracks translation progress and approval status

### Usage

```javascript
import { XliffBridge } from '@l10nmonster/helpers-xliff';

const xliffProvider = new XliffBridge({
    requestPath: (lang, prjId) => `xliff/outbox/prj${prjId}-${lang}.xml`,
    completePath: (lang, prjId) => `xliff/inbox/prj${prjId}-${lang}.xml`,
    quality: 80
});
```

### Configuration Options

- **`requestPath`** (function): Path pattern for outbound XLIFF files
- **`completePath`** (function): Path pattern for completed XLIFF files  
- **`quality`** (number): Default quality score for completed translations (default: 50)
- **`xliffVersion`** (string): XLIFF format version (default: '2.1')
- **`preserveComments`** (boolean): Include developer comments (default: true)

### Workflow

1. **Request Generation**: Creates XLIFF files in the outbox directory
2. **Translation Process**: External tools process XLIFF files
3. **Completion Handling**: Reads completed XLIFF files from inbox directory
4. **Quality Assignment**: Applies quality scores to completed translations

### File Naming Conventions

The XliffBridge supports flexible file naming through function parameters:

```javascript
const provider = new XliffBridge({
    // Simple naming: project-language.xml
    requestPath: (lang, prjId) => `outbox/${prjId}-${lang}.xml`,
    completePath: (lang, prjId) => `inbox/${prjId}-${lang}.xml`,
    
    // Date-based naming
    requestPath: (lang, prjId) => {
        const date = new Date().toISOString().slice(0, 10);
        return `requests/${date}-${prjId}-${lang}.xliff`;
    },
    
    // Vendor-specific naming  
    requestPath: (lang, prjId) => `vendor-a/jobs/${prjId}_${lang}_request.xml`
});
```

## Integration Examples

### Basic XLIFF Workflow

```javascript
// l10nmonster.config.mjs
import { FsSource, FsTarget } from '@l10nmonster/core';
import { XliffBridge } from '@l10nmonster/helpers-xliff';

export default {
    channels: [{
        source: new FsSource({ globs: ['src/**/*.json'] }),
        target: new FsTarget({ 
            targetPath: (lang, resourceId) => 
                resourceId.replace('/en/', `/${lang}/`)
        })
    }],
    
    providers: [{
        id: 'xliff-workflow',
        provider: new XliffBridge({
            requestPath: (lang, prjId) => `translation/outbox/project-${prjId}-${lang}.xliff`,
            completePath: (lang, prjId) => `translation/inbox/project-${prjId}-${lang}.xliff`,
            quality: 85
        })
    }]
};
```

### Multi-Vendor Configuration

```javascript
export default {
    providers: [
        {
            id: 'vendor-a',
            provider: new XliffBridge({
                requestPath: (lang, prjId) => `vendors/vendor-a/outbox/${prjId}-${lang}.xml`,
                completePath: (lang, prjId) => `vendors/vendor-a/inbox/${prjId}-${lang}.xml`,
                quality: 90
            })
        },
        {
            id: 'vendor-b', 
            provider: new XliffBridge({
                requestPath: (lang, prjId) => `vendors/vendor-b/requests/${prjId}_${lang}.xliff`,
                completePath: (lang, prjId) => `vendors/vendor-b/completed/${prjId}_${lang}.xliff`,
                quality: 85
            })
        }
    ]
};
```

### CAT Tool Integration

```javascript
// Configuration for popular CAT tools
const catToolProvider = new XliffBridge({
    // Trados-compatible naming
    requestPath: (lang, prjId) => `trados/projects/${prjId}/source/${lang}.sdlxliff`,
    completePath: (lang, prjId) => `trados/projects/${prjId}/target/${lang}.sdlxliff`,
    
    // MemoQ-compatible naming
    // requestPath: (lang, prjId) => `memoq/projects/${prjId}/export/${prjId}_${lang}.mqxliff`,
    // completePath: (lang, prjId) => `memoq/projects/${prjId}/import/${prjId}_${lang}.mqxliff`,
    
    quality: 95
});
```

## XLIFF Features Support

### Translation Units
- **Source and target text**: Full bilingual support
- **Translation state**: New, translated, reviewed, approved
- **Quality scoring**: Translation quality metadata
- **Comments**: Developer and translator notes

### Metadata
- **File information**: Original file names and paths
- **Project details**: Project ID and metadata
- **Translation memory**: Leverage and match information
- **Workflow data**: Translation and review history

### Advanced Features
- **Inline tags**: Preserve formatting and markup
- **Segments**: Sub-sentence level translation units
- **Variants**: Alternative translations
- **Revision tracking**: Change history and approval workflow

## File Structure Example

### Directory Layout
```
translation/
├── outbox/          # Outbound XLIFF files (for translators)
│   ├── project-123-es.xliff
│   ├── project-123-fr.xliff
│   └── project-123-de.xliff
├── inbox/           # Completed XLIFF files (from translators)
│   ├── project-123-es.xliff
│   ├── project-123-fr.xliff
│   └── project-123-de.xliff
└── archive/         # Archived completed files
    └── 2024/
        └── project-123-es.xliff
```

### XLIFF File Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xliff version="2.1" xmlns="urn:oasis:names:tc:xliff:document:2.1">
  <file id="f1" original="src/messages.json">
    <unit id="1">
      <segment>
        <source>Welcome to our application</source>
        <target state="translated">Bienvenido a nuestra aplicación</target>
      </segment>
    </unit>
    <unit id="2">
      <segment>
        <source>You have {count} messages</source>
        <target state="new"></target>
      </segment>
    </unit>
  </file>
</xliff>
```

## Workflow Management

### Translation States
- **`new`**: Untranslated content
- **`translated`**: Initial translation provided
- **`reviewed`**: Translation reviewed by linguist
- **`approved`**: Final approved translation

### Quality Levels
```javascript
const provider = new XliffBridge({
    quality: 50,  // Base quality
    
    // Dynamic quality based on state
    getQuality: (unit) => {
        switch (unit.state) {
            case 'approved': return 95;
            case 'reviewed': return 85;
            case 'translated': return 70;
            default: return 50;
        }
    }
});
```

## Error Handling

The XliffBridge provider includes comprehensive error handling:

```javascript
// File access errors
// Translation validation errors  
// XLIFF format errors
// State management errors
```

## Testing

```bash
npm test
```

The test suite covers:
- XLIFF parsing and generation
- File-based workflow operations
- Translation state management
- Quality score handling
- Error conditions and recovery

## Performance Considerations

### Large Files
- Process XLIFF files in streaming mode for large datasets
- Use file chunking for better memory management
- Implement parallel processing for multiple language pairs

### File System Operations
- Monitor directory changes for real-time processing
- Implement file locking to prevent conflicts
- Use atomic file operations for reliability

## Migration from v2

### Configuration Updates
```javascript
// v2 (deprecated)
this.translationProvider = new translators.XliffBridge();

// v3 (current)
import { XliffBridge } from '@l10nmonster/helpers-xliff';
const provider = new XliffBridge();
```

## Requirements

- Node.js >= 20.12.0
- @l10nmonster/core (peer dependency)

## Related Documentation

- [XLIFF Specification](http://docs.oasis-open.org/xliff/xliff-core/v2.1/xliff-core-v2.1.html)
- [Translation Workflow Best Practices](https://www.gala-global.org/knowledge-center/industry-development/best-practices)
- [L10n Monster Core Documentation](../core/README.md)