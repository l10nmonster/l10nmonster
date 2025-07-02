# @l10nmonster/configMancer

Configuration management utilities with schema validation and object construction for L10n Monster.

## Overview

ConfigMancer provides a powerful configuration system that enables:
- **Schema-based validation**: Define and validate configuration objects against schemas
- **Dynamic object construction**: Automatically construct typed objects from configuration data
- **Proxy-based behavior**: Extend objects with inherited behavior through proxies
- **JSON parsing with validation**: Parse and validate JSON configuration files

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

#### Schema Definition

Schema parameters are defined as `[type, isMandatory, isArray]`:
- **type**: Expected data type or schema type name
- **isMandatory**: Whether the parameter is required (default: true, false if prefixed with `$`)
- **isArray**: Whether the parameter should be an array

#### Validating Configuration Files

```javascript
// Validate configuration without constructing objects
const isValid = mancer.validateFile('./config.json');

// Parse and construct typed objects
const config = mancer.reviveFile('./config.json');
```

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

### `configMancer.validateFile(pathName)`

Validates a JSON configuration file against the schema.

**Parameters:**
- `pathName`: Path to the JSON configuration file

**Returns:** Parsed configuration object (without constructed types)

### `configMancer.reviveFile(pathName)`

Parses and constructs typed objects from a JSON configuration file.

**Parameters:**
- `pathName`: Path to the JSON configuration file

**Returns:** Constructed configuration object with typed instances

### `configMancer.createReviver(validationOnly)`

Creates a JSON reviver function for custom parsing.

**Parameters:**
- `validationOnly`: If true, only validates without constructing objects

**Returns:** JSON reviver function

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

## Error Handling

ConfigMancer provides detailed error messages for:
- Missing mandatory properties
- Type mismatches
- Invalid array configurations
- Schema violations
- Unknown configuration types

All errors include context about the specific configuration path and expected values.