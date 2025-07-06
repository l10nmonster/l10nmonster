# @l10nmonster/configMancer

Configuration management utilities with schema validation and object construction for L10n Monster.

## Overview

ConfigMancer provides a powerful configuration system that enables:
- **Schema-based validation**: Define and validate configuration objects against schemas
- **Dynamic object construction**: Automatically construct typed objects from configuration data
- **Proxy-based behavior**: Extend objects with inherited behavior through proxies
- **JSON parsing with validation**: Parse and validate JSON configuration files
- **Serialization**: Convert objects back to JSON configuration format
- **Package discovery**: Automatically discover configuration classes from npm packages
- **Constants support**: Support for constant configuration values

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

#### Creating from Classes

```javascript
import { ConfigMancer } from '@l10nmonster/configMancer';

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

const mancer = ConfigMancer.createFromClasses({
    DatabaseConfig,
    ApiConfig
});
```

#### Creating from Packages

ConfigMancer can automatically discover configuration classes from npm packages:

```javascript
const mancer = await ConfigMancer.createFromPackages([
    '@myorg/config-package',
    './local-config-module.mjs'
]);
```

This method:
- Dynamically imports each package
- Recursively inspects exports for objects with `configMancerSample` properties
- Supports both direct exports and nested object exports
- Creates type names in the format `packageName:exportPath`

#### Constants Support

ConfigMancer supports constant configuration values by setting `configMancerSample = true`:

```javascript
const API_ENDPOINTS = {
    production: 'https://api.prod.example.com',
    staging: 'https://api.staging.example.com'
};
API_ENDPOINTS.configMancerSample = true;

const mancer = ConfigMancer.createFromClasses({
    ApiEndpoints: API_ENDPOINTS
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

#### Validating Configuration Files

```javascript
// Create validation-only instance
const validationMancer = new ConfigMancer(schema, true);

// Validate configuration without constructing objects
const isValid = validationMancer.reviveFile('./config.json');

// Parse and construct typed objects
const config = mancer.reviveFile('./config.json');
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

### `ConfigMancer.createFromClasses(classMap)`

Creates a ConfigMancer instance from a map of configuration classes.

**Parameters:**
- `classMap`: Object mapping type names to configuration classes

**Returns:** ConfigMancer instance

### `ConfigMancer.createFromPackages(packageNames)`

Creates a ConfigMancer instance by importing and inspecting npm packages.

**Parameters:**
- `packageNames`: Array of package names to import and inspect

**Returns:** Promise<ConfigMancer> instance

### `new ConfigMancer(schema, validationOnly)`

Creates a ConfigMancer instance with an existing schema.

**Parameters:**
- `schema`: The configuration schema
- `validationOnly`: If true, only validates without constructing objects (default: false)

**Returns:** ConfigMancer instance

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
        databases: [{ '@': 'database' }]
    };

    getPrimaryDatabase() {
        return this.databases[0];
    }
}

// Create ConfigMancer instance
const mancer = ConfigMancer.createFromClasses({
    DatabaseConfig,
    ApiConfig
});

// Load and validate configuration
const config = mancer.reviveFile('./config.json');

// Use the configuration
console.log(config.url);
console.log(config.getPrimaryDatabase().getConnectionString());

// Serialize back to JSON
const serialized = mancer.serialize(config);
mancer.serializeToPathName(config, './output.json');
```