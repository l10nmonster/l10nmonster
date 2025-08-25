# Config-Mancer Development Guide

This file provides specific guidance for working with the config-mancer package.

## Testing

```bash
npm test
```
Runs the config-mancer test suite using Node.js built-in test runner.

## Architecture

Config-mancer is a type-safe configuration management system that:
- Validates configuration objects against schema definitions
- Supports serialization/deserialization with type revival
- Handles YAML and JSON file formats
- Provides helper classes for file imports

### Key Components

- **ConfigMancer**: Main class for configuration management and validation
- **SchemaManager**: Manages type schemas and validation rules
- **BaseConfigMancerType**: Base class for configuration types
- **Helper Classes**: `ImportJsonFile`, `ImportTextFile` for file operations

## Debugging & Testing Guidelines

### Test Failure Debugging Process

When tests fail, follow this systematic approach:

1. **Check Test Scope Issues First**
   - Ensure new tests are placed inside the correct test suite
   - Main suite: `suite('ConfigMancer tests', () => { ... })` - has access to `mancer` variable
   - Lazy loading suite: `suite('ConfigMancer lazy loading tests', () => { ... })` - separate scope
   - **Common Error**: `mancer is not defined` usually means test is in wrong suite

2. **Validate Schema Compliance**
   - Config-mancer uses strict schema validation based on `configMancerSample` properties
   - Only properties defined in the sample are allowed
   - Optional properties use `$` prefix (e.g., `$timeout`)
   - **Common Error**: `key "timeout" not allowed` means use `$timeout` for optional properties

3. **Type System Understanding**
   - SchemaManager infers types from actual values in `configMancerSample`, not from strings
   - Use examples: `foo: 'hello'` → string, `foo: {}` → object, `foo: []` → array
   - **Wrong**: `foo: 'object'` (literal string), **Right**: `foo: {}` (infers object type)

4. **Test Isolation & Dependencies**
   - Tests creating separate SchemaManager instances need all required classes
   - Include dependencies: `{ classes: { ImportJsonFile, MyClass } }`
   - **Common Error**: `MyClass not found in schema` means missing class in schema

### Config-Mancer Specific Patterns

- **Test Class Design**: Use concrete examples in `configMancerSample` for type inference
- **YAML Support**: Implemented via `yaml` package in helpers.js and ConfigMancer.js
- **File Extensions**: `.yaml`, `.yml` auto-detected and parsed appropriately
- **Helper Classes**: `ImportJsonFile` and `ImportTextFile` support YAML files automatically

### Quick Commands for Test Debugging

```bash
# Run config-mancer tests only
npm test

# Get detailed test output with line numbers
node --test test/configMancer.test.js 2>&1 | grep -A 5 "not ok"

# Check schema generation for debugging
node -e "import {SchemaManager} from './SchemaManager.js'; console.log(new SchemaManager({classes: {MyClass}}).schema)"

# Test single functionality manually
node -e "import {ConfigMancer} from './index.js'; /* test code */"

# Debug YAML functionality
node -e "import {ConfigMancer} from './index.js'; import {writeFileSync, unlinkSync} from 'fs'; /* YAML test code */"
```

## Common Error Patterns & Solutions

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `mancer is not defined` | Test in wrong suite | Move test to main ConfigMancer suite |
| `key "X" not allowed in Y` | Property not in schema | Add property to `configMancerSample` or use `$X` for optional |
| `expected string and found object` | Type mismatch in schema | Use correct type example in `configMancerSample` |
| `X not found in schema` | Missing class in SchemaManager | Add class to SchemaManager constructor |
| `ENOENT: no such file` | File cleanup issue | Check file creation/deletion logic in tests |

## YAML Support

Config-mancer supports YAML files through:
- Automatic detection by file extension (`.yaml`, `.yml`)
- Integration with the `yaml` package for parsing
- Support in both `ConfigMancer.reviveFile()` and `ImportJsonFile` helper
- Equivalent functionality to JSON for all operations