# @l10nmonster/configMancer

Configuration management utilities with schema validation and object construction for L10n Monster.

## Overview

ConfigMancer provides a powerful configuration system that enables:
- **Schema-based validation**: Define and validate configuration objects against schemas
- **Dynamic object construction**: Automatically construct typed objects from configuration data
- **Proxy-based behavior**: Extend objects with inherited behavior through proxies
- **JSON parsing with validation**: Parse and validate JSON configuration files
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

#### Creating ConfigMancer

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
const mancer = new ConfigMancer({
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
    fromUrl: import.meta.url,
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
    fromUrl: import.meta.url,
    packages: ['@myorg/config-package'],
    classes: { LocalConfig: LocalConfigClass }
});
```

> **Note**: When using packages, `create()` is asynchronous and returns a Promise. For classes-only configurations, you can use the synchronous constructor.

#### Constants Support

ConfigMancer supports constant configuration values by setting `configMancerSample = true`:

```javascript
const API_ENDPOINTS = {
    production: 'https://api.prod.example.com',
    staging: 'https://api.staging.example.com'
};
API_ENDPOINTS.configMancerSample = true;

const mancer = new ConfigMancer({
    classes: { ApiEndpoints: API_ENDPOINTS }
});

// In configuration file:
{
    "@": "ApiEndpoints"
}
// Returns the constant object directly
```

#### Schema Definition

Schema parameters are defined as `[type, isMandatory, isArray]`:
- **type**: Expected data type or schema type name
- **isMandatory**: Whether the parameter is required (default: true, false if prefixed with `$`)
- **isArray**: Whether the parameter should be an array

#### Validation-Only Mode

```javascript
// Enable validation-only mode
const mancer = new ConfigMancer({ classes: { DatabaseConfig } });
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

### `new ConfigMancer(options)`

Creates a ConfigMancer instance.

**Parameters:**
- `options.classes`: Object mapping type names to configuration classes
- `options.fromUrl`: URL for module resolution (usually `import.meta.url`)
- `options.packages`: Array of package names to search for types

**Returns:** ConfigMancer instance

### `ConfigMancer.create(options)`

Creates a ConfigMancer instance with automatic package loading.

**Parameters:**
- `options.fromUrl`: URL for module resolution (usually `import.meta.url`)
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

### `configMancer.createReviver()`

Creates a JSON reviver function for custom parsing with JSON.parse().

**Returns:** JSON reviver function that validates and constructs objects

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
const mancer = new ConfigMancer({
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
const mancer = new ConfigMancer({ classes: { MyConfig } });
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
    fromUrl: import.meta.url,
    packages: ['@myorg/config-package']
});
mancer.validationOnly = true; // set property directly
```

### Removed Methods

- `configMancer.initialize()` - Use `ConfigMancer.create()` instead
- `configMancer.schema` - Use `configMancer.schemaManager.schema` instead
- `ConfigMancer.createFromSources()` - Use `ConfigMancer.create()` instead