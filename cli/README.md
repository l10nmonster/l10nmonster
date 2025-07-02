# @l10nmonster/cli

Command-line interface for L10n Monster v3 - continuous localization for the rest of us.

## Installation

### From npm

```bash
npm install -g @l10nmonster/cli
```

### From source

```bash
git clone git@github.com:l10nmonster/l10nmonster.git
cd l10nmonster
pnpm install
pnpm build
pnpm link --global @l10nmonster/cli
```

## Getting Started

Create a configuration file `l10nmonster.config.mjs` at your project root, then use the CLI commands to manage translations.

### Basic Configuration

```javascript
// l10nmonster.config.mjs
import { FsSource, FsTarget } from '@l10nmonster/core';

export default {
  channels: [{
    source: new FsSource({ globs: ['src/**/*.json'] }),
    target: new FsTarget({ 
      targetPath: (lang, resourceId) => resourceId.replace('/en/', `/${lang}/`) 
    })
  }],
  
  providers: [{
    id: 'internal',
    provider: 'InternalLeverage'
  }]
};
```

## v3 Commands

### Core Operations

```bash
# Analyze source content
l10n analyze
```
Analyzes your sources and reports insights like repeated content, quality metrics, and translation opportunities.

```bash
# Capture source content snapshot
l10n source snap
```
Creates a snapshot of your source content for translation workflows.

```bash
# Generate translations
l10n translate
```
Processes translation requests through configured providers and generates translated resources.

```bash
# Update operations and target resources
l10n ops update
```
Updates target resources with latest translations and manages operation lifecycle.

### Translation Memory

```bash
# Synchronize TM with providers
l10n tm syncup
```
Uploads completed translations to translation memory stores.

```bash
# Download translations from TM
l10n tm syncdown  
```
Downloads latest translations from translation memory to local stores.

```bash
# Export TM data
l10n tm export
```
Exports translation memory data for backup or external processing.

### Source Management

```bash
# List source content
l10n source list
```
Lists all detected source content with metadata and statistics.

```bash
# Query specific content
l10n source query --filter "*.json"
```
Queries source content with filters and search criteria.

```bash
# Show untranslated content
l10n source untranslated --target es
```
Shows untranslated content for specific target languages.

### Operations Management

```bash
# View operation details
l10n ops view
```
Displays detailed information about current operations and their status.

```bash
# Manage jobs
l10n ops jobs --status pending
```
Lists and manages translation jobs by status or other criteria.

```bash
# Provider operations
l10n ops providers
```
Shows configured providers and their current status.

```bash
# Delete operations
l10n ops delete --job-id abc123
```
Removes specific operations or jobs from the system.

### Legacy Commands (v2 compatibility)

```bash
# Legacy push operation
l10n push
```
**Deprecated**: Use `l10n translate` and `l10n ops update` instead.

```bash
# Legacy pull operation  
l10n pull
```
**Deprecated**: Use `l10n tm syncdown` and `l10n ops update` instead.

```bash
# Legacy status command
l10n status
```
**Deprecated**: Use `l10n analyze` for detailed insights.

## Working Files

L10n Monster v3 maintains its working files in a `l10nmonster/` directory at the root of the project:

- **TM stores**: `l10nmonster/tm/` - Translation memory data
- **Operations**: `l10nmonster/ops/` - Job and task management
- **Snapshots**: `l10nmonster/snap/` - Source content snapshots
- **Providers**: `l10nmonster/providers/` - Provider-specific data

Working files are source-control friendly (JSON/JSONL files with consistent formatting) and should be checked in for team collaboration.

## Advanced CLI Options

The CLI supports additional options to control behavior:

- `-c, --config <path>`: Specify custom configuration file path
- `-v, --verbose`: Output additional debug information
- `--dry-run`: Preview operations without making changes
- `--parallel <number>`: Set parallelism level for operations
- `--filter <pattern>`: Apply filters to operations

### Example Usage

```bash
# Run with custom config and high verbosity
l10n translate -c ./custom.config.mjs -v

# Preview operations without executing
l10n ops update --dry-run

# Parallel translation processing
l10n translate --parallel 4

# Filter specific content
l10n source snap --filter "components/**/*.json"
```

## v3 Configuration

### ESM Configuration Format

v3 uses ESM-based configuration files (`l10nmonster.config.mjs`):

```javascript
import { FsSource, FsTarget } from '@l10nmonster/core';
import { GptAgent } from '@l10nmonster/helpers-openai';

export default {
  // Source and target channels
  channels: [{
    source: new FsSource({ 
      globs: ['src/**/*.json'],
      targetLangs: ['es', 'fr', 'de']
    }),
    target: new FsTarget({ 
      targetPath: (lang, id) => id.replace('/en/', `/${lang}/`) 
    })
  }],

  // Translation providers
  providers: [{
    id: 'ai-translator',
    provider: new GptAgent({ model: 'gpt-4' })
  }, {
    id: 'internal',
    provider: 'InternalLeverage'
  }],

  // Content type definitions
  contentTypes: [{
    name: 'json',
    resourceFilter: 'i18next'
  }],

  // Storage configuration
  stores: {
    tm: 'BaseJsonlTmStore',
    ops: 'FsOpsStore'
  }
};
```

### Multi-Channel Configuration

```javascript
export default {
  channels: [
    {
      // Web app content
      source: new FsSource({ globs: ['web/src/**/*.json'] }),
      target: new FsTarget({ targetPath: (lang, id) => id.replace('/src/', `/dist/${lang}/`) })
    },
    {
      // Mobile app content  
      source: new FsSource({ globs: ['mobile/strings/**/*.xml'] }),
      target: new FsTarget({ targetPath: (lang, id) => id.replace('/strings/', `/strings-${lang}/`) })
    }
  ]
};
```

### Provider Chains

```javascript
export default {
  providers: [
    { id: 'leverage', provider: 'InternalLeverage' },
    { id: 'repetitions', provider: 'Repetition' },
    { id: 'ai', provider: new GptAgent({ model: 'gpt-4' }) },
    { id: 'fallback', provider: 'Invisicode' }
  ]
};
```

## Error Handling

The CLI provides comprehensive error handling with actionable messages:

```bash
# Configuration errors
Error: Configuration file not found: l10nmonster.config.mjs
Tip: Run 'l10n init' to create a basic configuration

# Provider errors  
Error: OpenAI API key not configured
Tip: Set OPENAI_API_KEY environment variable or configure apiKey in provider options

# Operation errors
Error: Translation job failed for provider 'gpt-4'
Tip: Check provider configuration and API limits
```

## Performance Optimization

### Parallel Processing

```bash
# Enable parallel operations
l10n translate --parallel 4

# Provider-specific parallelism
l10n ops update --provider-parallel 2
```

### Filtering and Batching

```bash
# Process specific file patterns
l10n translate --filter "*.json"

# Batch operations by language
l10n translate --batch-by-language

# Limit operation scope
l10n source snap --since "2024-01-01"
```

## Integration Examples

### CI/CD Pipeline

```yaml
# GitHub Actions example
name: Localization
on: [push, pull_request]

jobs:
  l10n:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install -g @l10nmonster/cli
      - run: l10n analyze
      - run: l10n translate --dry-run
```

### NPM Scripts

```json
{
  "scripts": {
    "l10n:analyze": "l10n analyze",
    "l10n:translate": "l10n translate",
    "l10n:update": "l10n ops update",
    "l10n:sync": "l10n tm syncup && l10n tm syncdown"
  }
}
```

## Troubleshooting

### Common Issues

1. **Configuration not found**
   ```bash
   # Ensure config file exists and has correct name
   ls l10nmonster.config.mjs
   ```

2. **Module import errors**
   ```bash
   # Verify Node.js version (requires >= 20.12.0)
   node --version
   ```

3. **Provider authentication**
   ```bash
   # Check environment variables
   echo $OPENAI_API_KEY
   ```

4. **Performance issues**
   ```bash
   # Enable debug logging
   l10n translate -v
   ```

## Migration from v2

### Configuration Updates

1. **Rename config file**: `l10nmonster.cjs` → `l10nmonster.config.mjs`
2. **Update imports**: Use ESM import syntax
3. **Update providers**: Many providers have new names and APIs
4. **Update commands**: Some command names have changed

### Command Mapping

| v2 Command | v3 Equivalent |
|------------|---------------|
| `l10n push` | `l10n translate && l10n ops update` |
| `l10n pull` | `l10n tm syncdown && l10n ops update` |
| `l10n status` | `l10n analyze` |
| `l10n grandfather` | Provider-based (configured in config) |
| `l10n leverage` | Provider-based (configured in config) |

For detailed migration guidance, see the [v3 Migration Guide](../v3.md).

## Help and Support

```bash
# Get general help
l10n help

# Get command-specific help
l10n help translate
l10n help ops
l10n help source

# Get provider information
l10n ops providers --info
```

For more detailed documentation, see:
- [Main Documentation](../README.md)
- [Architecture Guide](../architecture.md)
- [Core Package Documentation](../core/README.md)