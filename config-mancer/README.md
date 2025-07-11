# @l10nmonster/configMancer

Configuration management utilities with schema validation and object construction for L10n Monster.

## Overview

ConfigMancer provides a powerful configuration system that enables:
- **Schema-based validation**: Define and validate configuration objects against schemas
- **Dynamic object construction**: Automatically construct typed objects from configuration data
- **Proxy-based behavior**: Extend objects with inherited behavior through proxies
- **JSON parsing with validation**: Parse and validate JSON configuration files
- **Contextual properties**: Inject additional properties (like `@baseDir`) into all constructed objects
- **File import helpers**: Built-in classes for importing text and JSON files with automatic path resolution
- **Serialization**: Convert objects back to JSON configuration format
- **JSON Schema generation**: Generate JSON Schema files for configuration authoring and validation
- **Package discovery**: Automatically discover configuration classes from npm packages
- **Module resolution**: Proper handling of both CommonJS and ESM modules with correct resolution context
- **Lazy loading**: Efficient schema management with support for async package loading
- **Constants support**: Support for constant configuration values
- **Modular design**: Separate concerns with dedicated classes for different functionality

## Classes

### `BaseConfigMancerType`

A base class that creates proxy objects allowing configuration objects to inherit behavior from their prototypes.

```javascript
import { BaseConfigMancerType } from '@l10nmonster/configMancer';

class MyConfigType extends BaseConfigMancerType {
    myMethod() {
        return `Hello ${this.name}`;
    }
}

const config = new MyConfigType({ name: 'World' });
console.log(config.myMethod()); // "Hello World"
```

### `ConfigMancer`

The main class for schema validation and object construction.

#### Creating ConfigMancer with Local Classes

For simple cases with local classes, you can use the `ConfigMancer.create()` method:

```javascript
import { ConfigMancer, BaseConfigMancerType } from '@l10nmonster/configMancer';

class DatabaseConfig extends BaseConfigMancerType {
    static configMancerSample = {
        '@': 'database',
        host: 'localhost',
        port: 5432,
        ssl: true
    };
}

class ApiConfig extends BaseConfigMancerType {
    static configMancerSample = {
        '@': 'api',
        url: 'https://api.example.com',
        $timeout: 5000, // optional parameter (prefixed with $)
        databases: [{ '@': 'database' }] // array of database configs
    };
}

// Create with local classes
const mancer = await ConfigMancer.create({
    classes: {
        DatabaseConfig,
        ApiConfig
    }
});
```

#### Creating from Packages

ConfigMancer can automatically discover configuration classes from npm packages using the `create` factory method:

```javascript
const mancer = await ConfigMancer.create({
    baseUrl: import.meta.url,
    packages: ['@myorg/config-package', './local-config-module.mjs']
});
```

This method:
- **Handles both CommonJS and ESM modules** automatically
- Dynamically imports each package using proper module resolution
- Recursively inspects exports for objects with `configMancerSample` properties
- Supports both direct exports and nested object exports
- Creates type names in the format `packageName:exportPath`
- **Resolves modules from the calling code's context** (fixes module resolution issues)

#### Mixed Sources

You can combine classes and packages in a single call:

```javascript
const mancer = await ConfigMancer.create({
    baseUrl: import.meta.url,
    packages: ['@myorg/config-package'],
    classes: { LocalConfig: LocalConfigClass }
});
```

> **Note**: The `create()` method is asynchronous and returns a Promise, even when using classes-only configurations.

#### Constants Support

ConfigMancer supports constant configuration values by setting `configMancerSample = true`:

```javascript
const API_ENDPOINTS = {
    production: 'https://api.prod.example.com',
    staging: 'https://api.staging.example.com'
};
API_ENDPOINTS.configMancerSample = true;

const mancer = await ConfigMancer.create({
    classes: { ApiEndpoints: API_ENDPOINTS }
});

// In configuration file:
{
    "@": "ApiEndpoints"
}
// Returns the constant object directly
```

#### Schema Definition

Schema parameters are defined using object notation in the `configMancerSample` property:
- **Properties prefixed with `$`** are optional (e.g., `$timeout`)
- **Properties without `$` prefix** are required (e.g., `host`, `port`)
- **Arrays** are indicated by using array notation with type examples (e.g., `[{ '@': 'database' }]`)
- **Nested objects** are indicated by using object notation with type references (e.g., `{ '@': 'otherType' }`)

Internally, ConfigMancer converts these to schema entries with the format `[type, isMandatory, isArray]`.

#### Validation-Only Mode

```javascript
// Enable validation-only mode
const mancer = await ConfigMancer.create({ classes: { DatabaseConfig } });
mancer.validationOnly = true;

// Validate configuration without constructing objects
const config = mancer.reviveFile('./config.json');

// Disable validation-only mode to construct typed objects
mancer.validationOnly = false;
const typedConfig = mancer.reviveFile('./config.json');
```

#### Serialization

ConfigMancer provides methods to serialize objects back to JSON configuration format:

```javascript
// Serialize an object to JSON configuration format
const serialized = mancer.serialize(configObject);

// Serialize and write to file
mancer.serializeToPathName(configObject, './config.json');
```

The serialization process:
- Recursively serializes nested objects and arrays
- Adds `@` type identifiers for configured objects
- Handles circular reference detection
- Preserves primitive values and plain objects

#### JSON Schema Generation

ConfigMancer can generate JSON Schema files that can be used for configuration authoring and validation in IDEs and other tools:

```javascript
// Generate JSON Schema for a root configuration type
mancer.writeJsonSchema('ApiConfig', './config.schema.json');
```

The generated JSON Schema:
- **Complies with JSON Schema Draft 07** specification
- **Includes all type definitions** with proper references and constraints
- **Handles complex nested structures** with arrays and objects
- **Supports constant values** using JSON Schema's `const` keyword
- **Provides proper validation rules** for mandatory vs optional properties
- **Prevents circular references** using `$ref` definitions

Generated schemas can be used with:
- **IDE/Editor support** for autocomplete and validation during configuration authoring
- **JSON Schema validators** for runtime validation
- **Documentation tools** that support JSON Schema
- **Configuration authoring tools** with JSON Schema integration

#### Example Configuration File

```json
{
    "@": "api",
    "url": "https://production.example.com",
    "timeout": 10000,
    "databases": [
        {
            "@": "database",
            "host": "db1.example.com",
            "port": 5432,
            "ssl": true
        },
        {
            "@": "database", 
            "host": "db2.example.com",
            "port": 5432,
            "ssl": false
        }
    ]
}
```

## API Reference

### `new ConfigMancer(schemaManager)`

Creates a ConfigMancer instance with a pre-configured SchemaManager.

**Parameters:**
- `schemaManager`: A SchemaManager instance containing type definitions

**Returns:** ConfigMancer instance

**Note:** This is a low-level constructor. Most users should use `ConfigMancer.create()` instead.

### `ConfigMancer.create(options)`

Creates a ConfigMancer instance with automatic schema manager creation and package loading.

**Parameters:**
- `options.baseUrl`: URL for module resolution (usually `import.meta.url`)
- `options.packages`: Array of package names to search for types
- `options.classes`: Object mapping type names to configuration classes

**Returns:** Promise<ConfigMancer> instance

### `configMancer.validationOnly`

Property that controls whether the ConfigMancer instance only validates without constructing objects.

**Type:** boolean
**Default:** false

### `configMancer.reviveFile(pathName)`

Parses and constructs typed objects from a JSON configuration file.

**Parameters:**
- `pathName`: Path to the JSON configuration file

**Returns:** Constructed configuration object with typed instances

### `configMancer.createReviver(additionalProperties)`

Creates a JSON reviver function for custom parsing with JSON.parse().

**Parameters:**
- `additionalProperties` (optional): Object containing additional properties to be merged into all constructed objects

**Returns:** JSON reviver function that validates and constructs objects

**Example:**
```javascript
// Create reviver with additional context
const reviver = mancer.createReviver({ 
    '@baseDir': '/path/to/config',
    environment: 'production' 
});

const config = JSON.parse(jsonString, reviver);
// All constructed objects will have @baseDir and environment properties
```

### `configMancer.serialize(obj, visited)`

Recursively serializes an object into ConfigMancer-compatible format.

**Parameters:**
- `obj`: The object to serialize
- `visited`: Set to track visited objects (optional, used internally)

**Returns:** Serialized object that can be saved as JSON

### `configMancer.serializeToPathName(obj, pathName, indent)`

Serializes an object and writes it to a file as JSON.

**Parameters:**
- `obj`: The object to serialize and write
- `pathName`: Path to the file where the serialized object will be written
- `indent`: Number of spaces for JSON indentation (default: 2)

### `configMancer.writeJsonSchema(rootType, pathName)`

Generates a JSON Schema for the specified root type and writes it to a file.

**Parameters:**
- `rootType`: The name of the root type to generate schema for
- `pathName`: Path to the file where the JSON schema will be written

**Returns:** None (writes to file)

**Throws:** Error if the root type is not found in the schema or file cannot be written

### `configMancer.generateSchemaDocs()`

Generates comprehensive markdown documentation for the entire schema.

**Returns:** String containing markdown documentation

**Example:**
```javascript
const mancer = await ConfigMancer.create({
    classes: { DatabaseConfig, ApiConfig }
});

const docs = mancer.generateSchemaDocs();
console.log(docs);
// Outputs structured markdown documentation
```

The generated documentation includes:
- **Organized by supertype**: Types are grouped under major headings based on their `superType`
- **Root types first**: Types where `superType === typeName` are listed under "Root Types" heading
- **Alphabetical sorting**: Both supertypes and types within each supertype are sorted alphabetically  
- **Parameter details**: Each type shows all parameters with their types, whether they're required/optional, and array indicators
- **Constant values**: Constant configuration values are documented with their type and value
- **Comprehensive coverage**: Documents all types in the schema including those from packages

**Sample output:**
```markdown
# ConfigMancer Schema Documentation

## Root Types

### DatabaseConfig
**Parameters:**
- `host` (required): `string`
- `port` (required): `number`
- `ssl` (required): `boolean`
- `timeout` (optional): `number`

## object

### MyPackage:SomeConstant
**Constant value of type:** `object`
**Value:** `{"endpoint": "https://api.example.com"}`
```

## Custom Configuration Classes

### Extending BaseConfigMancerType

```javascript
class MyConfig extends BaseConfigMancerType {
    static configMancerSample = {
        '@': 'myconfig',
        name: 'example',
        value: 42
    };

    getDisplayName() {
        return `${this.name}: ${this.value}`;
    }
}
```

### Custom Classes (without extending BaseConfigMancerType)

```javascript
class CustomConfig {
    static configMancerSample = {
        '@': 'custom',
        name: 'example',
        value: 42
    };

    static configMancerFactory(obj) {
        return new CustomConfig(obj);
    }

    constructor(obj) {
        Object.assign(this, obj);
    }

    configMancerSerializer() {
        return {
            name: this.name,
            value: this.value
        };
    }
}
```

## Helper Classes

ConfigMancer includes built-in helper classes for common configuration patterns.

### File Import Helpers

#### `ImportTextFile`

Imports text content from a file. Useful for loading templates, schemas, or other text-based resources.

```javascript
// In configuration JSON:
{
    "@": "ImportTextFile",
    "fileName": "schema.sql"
}

// Returns the text content of the file as a string
```

#### `ImportJsonFile`

Imports and parses JSON content from a file. Useful for loading external JSON configurations or data files.

```javascript
// In configuration JSON:
{
    "@": "ImportJsonFile", 
    "fileName": "database-config.json"
}

// Returns the parsed JSON object
```

### File Path Resolution

Both helper classes support automatic path resolution using the `@baseDir` property, which is automatically provided by `reviveFile()`:

```javascript
// config.json (in /app/config/ directory)
{
    "@": "AppConfig",
    "database": {
        "@": "ImportJsonFile",
        "fileName": "database.json"  // Resolves to /app/config/database.json
    },
    "schema": {
        "@": "ImportTextFile", 
        "fileName": "schema.sql"     // Resolves to /app/config/schema.sql
    }
}

// Load configuration
const config = mancer.reviveFile('/app/config/config.json');
// Files are loaded relative to the config file location
```

You can also provide `@baseDir` explicitly when using `createReviver()`:

```javascript
const reviver = mancer.createReviver({ '@baseDir': '/custom/path' });
const config = JSON.parse(jsonString, reviver);
```

### Error Handling

The file import helpers provide clear error messages for common issues:

- **File not found**: Throws `ENOENT` error with the full file path
- **Malformed JSON**: For `ImportJsonFile`, throws JSON parsing errors with location details
- **Permission errors**: Throws appropriate file system errors

### Example Configuration

```javascript
// app-config.json
{
    "@": "ApplicationConfig",
    "name": "My Application",
    "database": {
        "@": "ImportJsonFile",
        "fileName": "database.json"
    },
    "apiSchema": {
        "@": "ImportTextFile", 
        "fileName": "api-schema.graphql"
    },
    "routes": {
        "@": "ImportJsonFile",
        "fileName": "routes/main.json"
    }
}

// database.json
{
    "host": "localhost",
    "port": 5432,
    "ssl": true
}

// Usage
const config = mancer.reviveFile('./app-config.json');
console.log(config.name);          // "My Application"
console.log(config.database.host); // "localhost"
console.log(config.apiSchema);     // GraphQL schema as string
```

## Schema Definition Format

Configuration classes must include a static `configMancerSample` property that defines the schema:

```javascript
static configMancerSample = {
    '@': 'typeName',           // Type identifier
    mandatoryParam: 'string',  // Required parameter
    $optionalParam: 42,        // Optional parameter (prefixed with $)
    arrayParam: [{ '@': 'childType' }], // Array of typed objects
    nestedParam: { '@': 'otherType' }   // Nested typed object
};
```

For constant values, set `configMancerSample = true`:

```javascript
const CONSTANT_CONFIG = {
    value1: 'constant',
    value2: 42
};
CONSTANT_CONFIG.configMancerSample = true;
```

## Required Methods

### For ConfigMancer Integration

All configuration classes must implement:

- `static configMancerSample`: Schema definition
- `static configMancerFactory(obj)`: Factory method for creating instances

### For Serialization

Classes that need serialization support must implement:

- `configMancerSerializer()`: Returns a plain object representing the instance's data

## Error Handling

ConfigMancer provides detailed error messages for:
- Missing mandatory properties
- Type mismatches
- Invalid array configurations
- Schema violations
- Unknown configuration types
- Circular references during serialization
- Missing required methods (`configMancerFactory`, `configMancerSerializer`)

All errors include context about the specific configuration path and expected values.

## Complete Example

```javascript
import { ConfigMancer, BaseConfigMancerType } from '@l10nmonster/configMancer';

// Define configuration classes
class DatabaseConfig extends BaseConfigMancerType {
    static configMancerSample = {
        '@': 'database',
        host: 'localhost',
        port: 5432,
        ssl: true,
        $timeout: 30000
    };

    getConnectionString() {
        return `${this.host}:${this.port}`;
    }
}

class ApiConfig extends BaseConfigMancerType {
    static configMancerSample = {
        '@': 'api',
        url: 'https://api.example.com',
        $timeout: 5000,
        databases: [{ '@': 'database' }]
    };

    getPrimaryDatabase() {
        return this.databases[0];
    }
}

// Create ConfigMancer
const mancer = await ConfigMancer.create({
    classes: {
        DatabaseConfig,
        ApiConfig
    }
});

// Load and validate configuration
const config = mancer.reviveFile('./config.json');
console.log(config.getPrimaryDatabase().getConnectionString());

// Generate JSON Schema
mancer.writeJsonSchema('ApiConfig', './config.schema.json');

// Serialize configuration
const serialized = mancer.serialize(config);
mancer.serializeToPathName(serialized, './output.json');
```

## Migration from Previous Versions

### Constructor Changes

**Before:**
```javascript
const mancer = new ConfigMancer({ classes: { MyConfig } });
const mancer = new ConfigMancer({ classes: { MyConfig } }, true); // validation only
```

**After:**
```javascript
const mancer = await ConfigMancer.create({ classes: { MyConfig } });
mancer.validationOnly = true; // set property directly
```

### Factory Method Changes

**Before:**
```javascript
const mancer = await ConfigMancer.createFromSources([
    '@myorg/config-package'
], import.meta.url, true);
```

**After:**
```javascript
const mancer = await ConfigMancer.create({
    baseUrl: import.meta.url,
    packages: ['@myorg/config-package']
});
mancer.validationOnly = true; // set property directly
```

### Removed Methods

- `configMancer.initialize()` - Use `ConfigMancer.create()` instead
- `configMancer.schema` - Use `configMancer.schemaManager.schema` instead
- `ConfigMancer.createFromSources()` - Use `ConfigMancer.create()` instead