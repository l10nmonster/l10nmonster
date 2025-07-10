import { suite, test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { ConfigMancer, BaseConfigMancerType } from '../index.js';
import { SchemaManager } from '../SchemaManager.js';
import { ImportTextFile, ImportJsonFile } from '../helpers.js';

// Test configuration classes
class DatabaseConfig extends BaseConfigMancerType {
    static configMancerSample = {
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
        url: 'https://api.example.com',
        $timeout: 5000,
        databases: [{ '@': 'DatabaseConfig' }]
    };

    getPrimaryDatabase() {
        return this.databases[0];
    }
}

class MyClass {
    static configMancerSample = {
        '@': 'MyClass',
        foo: 'string',
    };
    constructor(obj) {
        this.foo = obj.foo;
    }
}

suite('ConfigMancer tests', () => {
    const schemaManager = new SchemaManager({
        classes: {
            DatabaseConfig,
            ApiConfig,
            MyClass
        }
    });
    const mancer = new ConfigMancer(schemaManager);

    // Create validation-only instance for validation tests
    const validationSchemaManager = new SchemaManager({
        classes: {
            DatabaseConfig,
            ApiConfig
        }
    });
    const validationMancer = new ConfigMancer(validationSchemaManager);
    validationMancer.validationOnly = true;

    test('constructor with classes creates schema correctly', () => {
        assert.ok(schemaManager.schema);
        assert.ok(schemaManager.schema.DatabaseConfig);
        assert.ok(schemaManager.schema.ApiConfig);
        
        const dbSchema = schemaManager.schema.DatabaseConfig;
        assert.equal(dbSchema.superType, 'DatabaseConfig');
        assert.deepEqual(dbSchema.params.host, ['string', true, false]);
        assert.deepEqual(dbSchema.params.port, ['number', true, false]);
        assert.deepEqual(dbSchema.params.ssl, ['boolean', true, false]);
        assert.deepEqual(dbSchema.params.timeout, ['number', false, false]); // optional
    });

    test('validates configuration objects correctly', () => {
        const validConfig = {
            '@': 'DatabaseConfig',
            host: 'db.example.com',
            port: 5432,
            ssl: true
        };

        const testFilePath = '/tmp/test-config.json';
        writeFileSync(testFilePath, JSON.stringify(validConfig));

        try {
            const result = validationMancer.reviveFile(testFilePath);
            assert.equal(result.host, 'db.example.com');
            assert.equal(result.port, 5432);
            assert.equal(result.ssl, true);
        } finally {
            unlinkSync(testFilePath);
        }
    });

    test('constructs typed objects correctly', () => {
        const validConfig = {
            '@': 'DatabaseConfig',
            host: 'db.example.com',
            port: 5432,
            ssl: true
        };

        const testFilePath = '/tmp/test-config-typed.json';
        writeFileSync(testFilePath, JSON.stringify(validConfig));

        try {
            const result = mancer.reviveFile(testFilePath);
            assert.equal(result.host, 'db.example.com');
            assert.equal(result.port, 5432);
            assert.equal(result.ssl, true);
            assert.equal(typeof result.getConnectionString, 'function');
            assert.equal(result.getConnectionString(), 'db.example.com:5432');
        } finally {
            unlinkSync(testFilePath);
        }
    });

    test('validates and constructs nested objects', () => {
        const config = {
            '@': 'ApiConfig',
            url: 'https://api.example.com',
            databases: [
                {
                    '@': 'DatabaseConfig',
                    host: 'db1.example.com',
                    port: 5432,
                    ssl: true
                }
            ]
        };

        const testFilePath = '/tmp/test-nested-config.json';
        writeFileSync(testFilePath, JSON.stringify(config));

        try {
            const result = mancer.reviveFile(testFilePath);
            assert.equal(result.url, 'https://api.example.com');
            assert.equal(result.databases.length, 1);
            assert.equal(result.databases[0].host, 'db1.example.com');
            assert.equal(typeof result.databases[0].getConnectionString, 'function');
            assert.equal(result.databases[0].getConnectionString(), 'db1.example.com:5432');
        } finally {
            unlinkSync(testFilePath);
        }
    });

    test('throws error for missing mandatory properties', () => {
        const invalidConfig = {
            '@': 'DatabaseConfig',
            host: 'db.example.com',
            // Missing port and ssl
        };

        const testFilePath = '/tmp/test-config-missing.json';
        writeFileSync(testFilePath, JSON.stringify(invalidConfig));

        try {
            assert.throws(() => {
                validationMancer.reviveFile(testFilePath);
            }, /mandatory properties not found/);
        } finally {
            unlinkSync(testFilePath);
        }
    });

    test('throws error for type mismatches', () => {
        const invalidConfig = {
            '@': 'DatabaseConfig',
            host: 'db.example.com',
            port: 'not-a-number', // Should be number
            ssl: true
        };

        const testFilePath = '/tmp/test-config-type.json';
        writeFileSync(testFilePath, JSON.stringify(invalidConfig));

        try {
            assert.throws(() => {
                validationMancer.reviveFile(testFilePath);
            }, /primitive type mismatch/);
        } finally {
            unlinkSync(testFilePath);
        }
    });

    test('rejects unknown properties', () => {
        const invalidConfig = {
            '@': 'DatabaseConfig',
            host: 'db.example.com',
            port: 5432,
            ssl: true,
            unknownProperty: 'not allowed'
        };

        const testFilePath = '/tmp/test-config-unknown.json';
        writeFileSync(testFilePath, JSON.stringify(invalidConfig));

        try {
            assert.throws(() => {
                validationMancer.reviveFile(testFilePath);
            }, /key "unknownProperty" not allowed/);
        } finally {
            unlinkSync(testFilePath);
        }
    });

    test('BaseConfigMancerType proxy behavior', () => {
        class TestConfig extends BaseConfigMancerType {
            getFullName() {
                return `${this.firstName} ${this.lastName}`;
            }
        }

        const config = new TestConfig({ 
            firstName: 'John', 
            lastName: 'Doe',
            age: 30
        });

        assert.equal(config.firstName, 'John');
        assert.equal(config.lastName, 'Doe');
        assert.equal(config.age, 30);
        assert.equal(config.getFullName(), 'John Doe');
    });

    test('throws error for missing configMancerSample', () => {
        class InvalidConfig extends BaseConfigMancerType {
            // Missing configMancerSample
        }

        assert.throws(() => {
            new SchemaManager({ classes: { InvalidConfig } });
        }, /Couldn't find a "configMancerSample" property in type InvalidConfig/);
    });

    test('instantiates classes that do not extend BaseConfigMancerType', () => {
        // A class that doesn't extend BaseConfigMancerType and doesn't have configMancerFactory
        class CustomConfig {
            static configMancerSample = {
                name: 'test',
                value: 42
            };

            constructor(obj) {
                this.name = obj.name;
                this.value = obj.value;
            }

            getDisplayName() {
                return `${this.name}: ${this.value}`;
            }
        }

        // Create ConfigMancer with the custom class
        const customSchemaManager = new SchemaManager({ classes: { CustomConfig } });
        const customMancer = new ConfigMancer(customSchemaManager);

        const config = {
            '@': 'CustomConfig',
            name: 'test-config',
            value: 100
        };

        const testFilePath = '/tmp/test-custom-config.json';
        writeFileSync(testFilePath, JSON.stringify(config));

        try {
            const result = customMancer.reviveFile(testFilePath);
            
            // Verify the object was created correctly using new constructor
            assert.equal(result.name, 'test-config');
            assert.equal(result.value, 100);
            assert.equal(typeof result.getDisplayName, 'function');
            assert.equal(result.getDisplayName(), 'test-config: 100');
            
            // Verify it's an instance of the custom class
            assert.ok(result instanceof CustomConfig);
        } finally {
            unlinkSync(testFilePath);
        }
    });

    test('configMancerSerializer returns serializable object with @ property', () => {
        class TestConfig extends BaseConfigMancerType {
            static configMancerSample = {
                name: 'test',
                value: 42
            };

            getDisplayName() {
                return `${this.name}: ${this.value}`;
            }
        }

        const testSchemaManager = new SchemaManager({ classes: { TestConfig } });
        const testMancer = new ConfigMancer(testSchemaManager);
        
        const config = new TestConfig({
            name: 'test-config',
            value: 100
        });

        const result = testMancer.serialize(config);

        assert.equal(result['@'], 'TestConfig');
        assert.equal(result.name, 'test-config');
        assert.equal(result.value, 100);
        assert.equal(typeof result.getDisplayName, 'undefined');
    });

    test('serialize handles primitive values', () => {
        const testSchemaManager = new SchemaManager({ classes: {} });
        const testMancer = new ConfigMancer(testSchemaManager);
        
        assert.equal(testMancer.serialize(null), null);
        assert.equal(testMancer.serialize(42), 42);
        assert.equal(testMancer.serialize('hello'), 'hello');
        assert.equal(testMancer.serialize(true), true);
        assert.equal(testMancer.serialize(undefined), undefined);
    });

    test('serialize handles arrays', () => {
        const testSchemaManager = new SchemaManager({ classes: {} });
        const testMancer = new ConfigMancer(testSchemaManager);
        
        const input = [1, 'hello', true, null];
        const result = testMancer.serialize(input);
        
        assert.deepEqual(result, [1, 'hello', true, null]);
    });

    test('serialize handles plain objects', () => {
        const testSchemaManager = new SchemaManager({ classes: {} });
        const testMancer = new ConfigMancer(testSchemaManager);
        
        const input = {
            name: 'test',
            value: 42,
            nested: {
                prop: 'value'
            }
        };
        
        const result = testMancer.serialize(input);
        
        assert.deepEqual(result, {
            name: 'test',
            value: 42,
            nested: {
                prop: 'value'
            }
        });
    });

    test('serialize handles objects with configMancerSerializer method', () => {
        class TestConfig extends BaseConfigMancerType {
            static configMancerSample = {
                name: 'test',
                value: 42
            };

            getDisplayName() {
                return `${this.name}: ${this.value}`;
            }
        }

        const testSchemaManager = new SchemaManager({ classes: { TestConfig } });
        const testMancer = new ConfigMancer(testSchemaManager);
        
        const config = new TestConfig({
            name: 'test-config',
            value: 100
        });

        const result = testMancer.serialize(config);

        assert.equal(result['@'], 'TestConfig');
        assert.equal(result.name, 'test-config');
        assert.equal(result.value, 100);
        assert.equal(typeof result.getDisplayName, 'undefined');
    });

    test('serialize handles nested objects with configMancerSerializer', () => {
        class DatabaseConfig extends BaseConfigMancerType {
            static configMancerSample = {
                host: 'localhost',
                port: 5432
            };
        }

        class ApiConfig extends BaseConfigMancerType {
            static configMancerSample = {
                url: 'https://api.example.com',
                database: {}
            };
        }

        const testSchemaManager = new SchemaManager({ classes: { DatabaseConfig, ApiConfig } });
        const testMancer = new ConfigMancer(testSchemaManager);

        const dbConfig = new DatabaseConfig({
            host: 'db.example.com',
            port: 5432
        });

        const apiConfig = new ApiConfig({
            url: 'https://api.example.com',
            database: dbConfig
        });

        const result = testMancer.serialize(apiConfig);

        assert.equal(result['@'], 'ApiConfig');
        assert.equal(result.url, 'https://api.example.com');
        assert.equal(result.database['@'], 'DatabaseConfig');
        assert.equal(result.database.host, 'db.example.com');
        assert.equal(result.database.port, 5432);
    });

    test('serialize handles arrays of objects with configMancerSerializer', () => {
        class DatabaseConfig extends BaseConfigMancerType {
            static configMancerSample = {
                host: 'localhost',
                port: 5432
            };
        }

        class ApiConfig extends BaseConfigMancerType {
            static configMancerSample = {
                url: 'https://api.example.com',
                databases: [{ '@': 'DatabaseConfig' }]
            };
        }

        const testSchemaManager = new SchemaManager({ classes: { DatabaseConfig, ApiConfig } });
        const testMancer = new ConfigMancer(testSchemaManager);

        const db1 = new DatabaseConfig({
            host: 'db1.example.com',
            port: 5432
        });

        const db2 = new DatabaseConfig({
            host: 'db2.example.com',
            port: 5433
        });

        const apiConfig = new ApiConfig({
            url: 'https://api.example.com',
            databases: [db1, db2]
        });

        const result = testMancer.serialize(apiConfig);

        assert.equal(result['@'], 'ApiConfig');
        assert.equal(result.url, 'https://api.example.com');
        assert.equal(Array.isArray(result.databases), true);
        assert.equal(result.databases.length, 2);
        
        assert.equal(result.databases[0]['@'], 'DatabaseConfig');
        assert.equal(result.databases[0].host, 'db1.example.com');
        assert.equal(result.databases[0].port, 5432);
        
        assert.equal(result.databases[1]['@'], 'DatabaseConfig');
        assert.equal(result.databases[1].host, 'db2.example.com');
        assert.equal(result.databases[1].port, 5433);
    });

    test('serialize result can be revived by ConfigMancer', () => {
        class DatabaseConfig extends BaseConfigMancerType {
            static configMancerSample = {
                host: 'localhost',
                port: 5432,
                ssl: true
            };

            getConnectionString() {
                return `${this.host}:${this.port}`;
            }
        }

        class ApiConfig extends BaseConfigMancerType {
            static configMancerSample = {
                url: 'https://api.example.com',
                databases: [{ '@': 'DatabaseConfig' }]
            };

            getPrimaryDatabase() {
                return this.databases[0];
            }
        }

        // Create ConfigMancer instance
        const testSchemaManager = new SchemaManager({ classes: {
            DatabaseConfig,
            ApiConfig
        } });
        const testMancer = new ConfigMancer(testSchemaManager);

        // Create original configuration
        const db1 = new DatabaseConfig({
            host: 'db1.example.com',
            port: 5432,
            ssl: true
        });

        const db2 = new DatabaseConfig({
            host: 'db2.example.com',
            port: 5433,
            ssl: false
        });

        const originalConfig = new ApiConfig({
            url: 'https://api.example.com',
            databases: [db1, db2]
        });

        // Serialize it
        const serialized = testMancer.serialize(originalConfig);

        const testFilePath = '/tmp/test-serialize-revive.json';
        writeFileSync(testFilePath, JSON.stringify(serialized));

        try {
            const revivedConfig = testMancer.reviveFile(testFilePath);

            // Verify the revived config has the same data
            assert.equal(revivedConfig['@'], undefined); // @ property is removed during revival
            assert.equal(revivedConfig.url, 'https://api.example.com');
            assert.equal(revivedConfig.databases.length, 2);
            
            // Verify behavior methods work
            assert.equal(typeof revivedConfig.getPrimaryDatabase, 'function');
            assert.equal(revivedConfig.getPrimaryDatabase().host, 'db1.example.com');
            
            assert.equal(typeof revivedConfig.databases[0].getConnectionString, 'function');
            assert.equal(revivedConfig.databases[0].getConnectionString(), 'db1.example.com:5432');
            assert.equal(revivedConfig.databases[1].getConnectionString(), 'db2.example.com:5433');
            
        } finally {
            unlinkSync(testFilePath);
        }
    });

    test('serialize handles custom class that does not extend BaseConfigMancerType', () => {
        // A custom class that doesn't extend BaseConfigMancerType but has configMancerSerializer
        class CustomSettings {
            constructor(options) {
                this.theme = options.theme;
                this.language = options.language;
                this.enableNotifications = options.enableNotifications;
            }

            configMancerSerializer() {
                return {
                    theme: this.theme,
                    language: this.language,
                    enableNotifications: this.enableNotifications
                };
            }

            getDisplayString() {
                return `${this.theme} theme, ${this.language} language`;
            }
        }

        const testSchemaManager = new SchemaManager({ classes: {} });
        const testMancer = new ConfigMancer(testSchemaManager);

        const settings = new CustomSettings({
            theme: 'dark',
            language: 'en',
            enableNotifications: true
        });

        const result = testMancer.serialize(settings);

        assert.equal(result['@'], 'CustomSettings');
        assert.equal(result.theme, 'dark');
        assert.equal(result.language, 'en');
        assert.equal(result.enableNotifications, true);
        assert.equal(typeof result.getDisplayString, 'undefined');
    });

    test('serialize throws error for objects without configMancerSerializer', () => {
        class UnsupportedClass {
            constructor(value) {
                this.value = value;
            }
        }

        const testSchemaManager = new SchemaManager({ classes: {} });
        const testMancer = new ConfigMancer(testSchemaManager);
        const obj = new UnsupportedClass('test');

        assert.throws(() => {
            testMancer.serialize(obj);
        }, /Cannot serialize object of type UnsupportedClass: missing configMancerSerializer method/);
    });

    test('serialize throws error for circular references', () => {
        class TestConfig extends BaseConfigMancerType {
            static configMancerSample = {
                name: 'test',
                child: {}
            };

            configMancerSerializer() {
                return {
                    name: this.name,
                    child: this.child
                };
            }
        }

        const testSchemaManager = new SchemaManager({ classes: { TestConfig } });
        const testMancer = new ConfigMancer(testSchemaManager);

        const config1 = new TestConfig({ name: 'config1' });
        const config2 = new TestConfig({ name: 'config2' });
        
        // Create circular reference
        config1.child = config2;
        config2.child = config1;

        assert.throws(() => {
            testMancer.serialize(config1);
        }, /Circular reference detected during serialization/);
    });

    test('serializeToPathName writes file correctly', () => {
        class TestConfig extends BaseConfigMancerType {
            static configMancerSample = {
                name: 'test',
                value: 42
            };
        }

        const testSchemaManager = new SchemaManager({ classes: { TestConfig } });
        const testMancer = new ConfigMancer(testSchemaManager);
        
        const config = new TestConfig({
            name: 'test-config',
            value: 100
        });

        const filePath = '/tmp/test-serialize-output.json';
        
        try {
            testMancer.serializeToPathName(config, filePath);
            
            // Read the file back and verify it was written correctly
            const fileContent = JSON.parse(readFileSync(filePath, 'utf-8'));
            assert.equal(fileContent['@'], 'TestConfig');
            assert.equal(fileContent.name, 'test-config');
            assert.equal(fileContent.value, 100);
        } finally {
            unlinkSync(filePath);
        }
    });

    test('handles constants with configMancerSample === true', () => {
        const API_CONFIG = {
            endpoint: 'https://api.example.com',
            timeout: 5000
        };
        const DEFAULT_HEADERS = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        // Add configMancerSample === true to indicate they are constants
        API_CONFIG.configMancerSample = true;
        DEFAULT_HEADERS.configMancerSample = true;
        
        const testSchemaManager = new SchemaManager({ classes: {
            ApiConfig: API_CONFIG,
            DefaultHeaders: DEFAULT_HEADERS
        } });
        const testMancer = new ConfigMancer(testSchemaManager);
        
        // Verify schema has isConstant flag
        assert.equal(testSchemaManager.schema.ApiConfig.isConstant, true);
        assert.equal(testSchemaManager.schema.DefaultHeaders.isConstant, true);
        assert.equal(testSchemaManager.schema.ApiConfig.superType, 'object');
        assert.equal(testSchemaManager.schema.DefaultHeaders.superType, 'object');
        
        // Test configuration with constants
        const config = {
            '@': 'ApiConfig'
        };
        
        const testFilePath = '/tmp/test-constant-config.json';
        writeFileSync(testFilePath, JSON.stringify(config));
        
        try {
            const result = testMancer.reviveFile(testFilePath);
            // Should return the constant value directly (without configMancerSample property)
            assert.deepEqual(result, {
                endpoint: 'https://api.example.com',
                timeout: 5000
            });
        } finally {
            unlinkSync(testFilePath);
        }
    });
    
    test('handles constants in arrays', () => {
        const DEFAULT_HEADERS = { 'Content-Type': 'application/json' };
        DEFAULT_HEADERS.configMancerSample = true;
        
        class ApiConfig extends BaseConfigMancerType {
            static configMancerSample = {
                headers: [{ '@': 'object' }]
            };
        }
        
        const testSchemaManager = new SchemaManager({ classes: {
            ApiConfig,
            DefaultHeaders: DEFAULT_HEADERS
        } });
        const testMancer = new ConfigMancer(testSchemaManager);
        
        const config = {
            '@': 'ApiConfig',
            headers: [{ '@': 'DefaultHeaders' }]
        };
        
        const testFilePath = '/tmp/test-constant-array.json';
        writeFileSync(testFilePath, JSON.stringify(config));
        
        try {
            const result = testMancer.reviveFile(testFilePath);
            assert.equal(result.headers.length, 1);
            assert.equal(result.headers[0]['Content-Type'], 'application/json');
            assert.equal(Object.keys(result.headers[0]).length, 1);
        } finally {
            unlinkSync(testFilePath);
        }
    });

    test('constructor requires SchemaManager instance', () => {
        assert.throws(() => {
            new ConfigMancer({ classes: {} });
        }, /ConfigMancer constructor requires a SchemaManager instance/);
    });

    test('validationOnly property works correctly', () => {
        const testSchemaManager = new SchemaManager({ classes: { DatabaseConfig } });
        const testMancer = new ConfigMancer(testSchemaManager);
        
        // Test with validation only
        testMancer.validationOnly = true;
        
        const config = {
            '@': 'DatabaseConfig',
            host: 'db.example.com',
            port: 5432,
            ssl: true
        };
        
        const testFilePath = '/tmp/test-validation-only.json';
        writeFileSync(testFilePath, JSON.stringify(config));
        
        try {
            const result = testMancer.reviveFile(testFilePath);
            assert.equal(result.host, 'db.example.com');
            assert.equal(result.port, 5432);
            assert.equal(result.ssl, true);
            assert.equal(typeof result.getConnectionString, 'undefined'); // Should not have methods
        } finally {
            unlinkSync(testFilePath);
        }
    });

    test('createReviver with additionalProperties adds properties to all constructed objects', () => {
        class TestClass {
            static configMancerSample = {
                name: 'example',
                '$additionalProp': 'optional-value',
                '$customProp': 'custom-value'
            };
            
            constructor(obj) {
                this.name = obj.name;
                this.additionalProp = obj.additionalProp;
                this.customProp = obj.customProp;
            }
        }

        const testSchemaManager = new SchemaManager({ classes: { TestClass } });
        const testMancer = new ConfigMancer(testSchemaManager);
        
        // Test creating a reviver with additional properties
        const reviver = testMancer.createReviver({ 
            additionalProp: 'test-value',
            customProp: 'custom-value'
        });
        
        // Test JSON string
        const jsonString = '{"@": "TestClass", "name": "test"}';
        
        // Parse with reviver
        const result = JSON.parse(jsonString, reviver);
        
        assert.equal(result.name, 'test');
        assert.equal(result.additionalProp, 'test-value');
        assert.equal(result.customProp, 'custom-value');
        assert.ok(result instanceof TestClass);
    });

    test('createReviver with additionalProperties works with arrays', () => {
        class TestClass {
            static configMancerSample = {
                name: 'example',
                '$additionalProp': 'optional-value',
                '$contextProp': 'context-value'
            };
            
            constructor(obj) {
                this.name = obj.name;
                this.additionalProp = obj.additionalProp;
                this.contextProp = obj.contextProp;
            }
        }

        class ParentClass {
            static configMancerSample = {
                items: [{ '@': 'TestClass' }]
            };
            
            constructor(obj) {
                this.items = obj.items;
            }
        }

        const testSchemaManager = new SchemaManager({ classes: { TestClass, ParentClass } });
        const testMancer = new ConfigMancer(testSchemaManager);
        
        // Test creating a reviver with additional properties
        const reviver = testMancer.createReviver({ 
            additionalProp: 'test-value',
            contextProp: 'context-value'
        });
        
        // Test JSON string with array
        const jsonString = '{"@": "ParentClass", "items": [{"@": "TestClass", "name": "test1"}, {"@": "TestClass", "name": "test2"}]}';
        
        // Parse with reviver
        const result = JSON.parse(jsonString, reviver);
        
        assert.equal(result.items.length, 2);
        assert.equal(result.items[0].name, 'test1');
        assert.equal(result.items[0].additionalProp, 'test-value');
        assert.equal(result.items[0].contextProp, 'context-value');
        assert.equal(result.items[1].name, 'test2');
        assert.equal(result.items[1].additionalProp, 'test-value');
        assert.equal(result.items[1].contextProp, 'context-value');
        assert.ok(result instanceof ParentClass);
        assert.ok(result.items[0] instanceof TestClass);
        assert.ok(result.items[1] instanceof TestClass);
    });

    test('createReviver with additionalProperties works with validation-only mode', () => {
        class TestClass {
            static configMancerSample = {
                name: 'example',
                '$additionalProp': 'optional-value'
            };
            
            constructor(obj) {
                this.name = obj.name;
                this.additionalProp = obj.additionalProp;
            }
        }

        const testSchemaManager = new SchemaManager({ classes: { TestClass } });
        const testMancer = new ConfigMancer(testSchemaManager);
        testMancer.validationOnly = true;
        
        // Test creating a reviver with additional properties
        const reviver = testMancer.createReviver({ 
            additionalProp: 'test-value',
            contextProp: 'context-value'
        });
        
        // Test JSON string
        const jsonString = '{"@": "TestClass", "name": "test"}';
        
        // Parse with reviver
        const result = JSON.parse(jsonString, reviver);
        
        assert.equal(result.name, 'test');
        // In validation-only mode, additionalProperties should not be added
        assert.equal(result.additionalProp, undefined);
        assert.equal(result.contextProp, undefined);
        assert.equal(typeof result.getConnectionString, 'undefined');
    });

    test('createReviver without additionalProperties works as before', () => {
        class TestClass {
            static configMancerSample = {
                name: 'example'
            };
            
            constructor(obj) {
                this.name = obj.name;
            }
        }

        const testSchemaManager = new SchemaManager({ classes: { TestClass } });
        const testMancer = new ConfigMancer(testSchemaManager);
        
        // Test creating a reviver without additional properties
        const reviver = testMancer.createReviver();
        
        // Test JSON string
        const jsonString = '{"@": "TestClass", "name": "test"}';
        
        // Parse with reviver
        const result = JSON.parse(jsonString, reviver);
        
        assert.equal(result.name, 'test');
        assert.ok(result instanceof TestClass);
    });

    test('ImportTextFile reads text files correctly', () => {
        const testSchemaManager = new SchemaManager({ classes: { ImportTextFile } });
        const testMancer = new ConfigMancer(testSchemaManager);
        
        // Create a temporary text file
        const testContent = 'Hello, World!\nThis is a test file.';
        const testFilePath = '/tmp/test-text-file.txt';
        writeFileSync(testFilePath, testContent);
        
        try {
            // Test with fileName only (no @baseDir)
            const config1 = {
                '@': 'ImportTextFile',
                fileName: testFilePath
            };
            
            const reviver1 = testMancer.createReviver();
            const result1 = JSON.parse(JSON.stringify(config1), reviver1);
            
            assert.equal(result1, testContent);
            assert.equal(typeof result1, 'string');
            
            // Test with @baseDir
            const baseDir = '/tmp';
            const fileName = 'test-text-file.txt';
            
            const config2 = {
                '@': 'ImportTextFile',
                fileName: fileName
            };
            
            const reviver2 = testMancer.createReviver({ '@baseDir': baseDir });
            const result2 = JSON.parse(JSON.stringify(config2), reviver2);
            
            assert.equal(result2, testContent);
            assert.equal(typeof result2, 'string');
            
        } finally {
            unlinkSync(testFilePath);
        }
    });

    test('ImportJsonFile reads JSON files correctly', () => {
        const testSchemaManager = new SchemaManager({ classes: { ImportJsonFile } });
        const testMancer = new ConfigMancer(testSchemaManager);
        
        // Create a temporary JSON file
        const testData = {
            name: 'test-config',
            version: '1.0.0',
            settings: {
                debug: true,
                timeout: 5000
            }
        };
        const testFilePath = '/tmp/test-json-file.json';
        writeFileSync(testFilePath, JSON.stringify(testData, null, 2));
        
        try {
            // Test with fileName only (no @baseDir)
            const config1 = {
                '@': 'ImportJsonFile',
                fileName: testFilePath
            };
            
            const reviver1 = testMancer.createReviver();
            const result1 = JSON.parse(JSON.stringify(config1), reviver1);
            
            assert.deepEqual(result1, testData);
            assert.equal(typeof result1, 'object');
            
            // Test with @baseDir
            const baseDir = '/tmp';
            const fileName = 'test-json-file.json';
            
            const config2 = {
                '@': 'ImportJsonFile',
                fileName: fileName
            };
            
            const reviver2 = testMancer.createReviver({ '@baseDir': baseDir });
            const result2 = JSON.parse(JSON.stringify(config2), reviver2);
            
            assert.deepEqual(result2, testData);
            assert.equal(typeof result2, 'object');
            
        } finally {
            unlinkSync(testFilePath);
        }
    });

    test('ImportTextFile and ImportJsonFile work with reviveFile', () => {
        const testSchemaManager = new SchemaManager({ classes: { ImportTextFile, ImportJsonFile } });
        const testMancer = new ConfigMancer(testSchemaManager);
        
        // Create test files
        const textContent = 'Sample text content';
        const textFilePath = '/tmp/sample.txt';
        writeFileSync(textFilePath, textContent);
        
        const jsonData = { key: 'value', number: 42 };
        const jsonFilePath = '/tmp/sample.json';
        writeFileSync(jsonFilePath, JSON.stringify(jsonData));
        
        // Test ImportTextFile with reviveFile
        const textConfigData = {
            '@': 'ImportTextFile',
            fileName: 'sample.txt'
        };
        
        const textConfigFilePath = '/tmp/test-text-import.json';
        writeFileSync(textConfigFilePath, JSON.stringify(textConfigData, null, 2));
        
        // Test ImportJsonFile with reviveFile  
        const jsonConfigData = {
            '@': 'ImportJsonFile',
            fileName: 'sample.json'
        };
        
        const jsonConfigFilePath = '/tmp/test-json-import.json';
        writeFileSync(jsonConfigFilePath, JSON.stringify(jsonConfigData, null, 2));
        
        try {
            // Use reviveFile which automatically adds @baseDir
            const textResult = testMancer.reviveFile(textConfigFilePath);
            const jsonResult = testMancer.reviveFile(jsonConfigFilePath);
            
            assert.equal(textResult, textContent);
            assert.deepEqual(jsonResult, jsonData);
            
        } finally {
            unlinkSync(textFilePath);
            unlinkSync(jsonFilePath);
            unlinkSync(textConfigFilePath);
            unlinkSync(jsonConfigFilePath);
        }
    });

    test('ImportTextFile and ImportJsonFile handle missing files gracefully', () => {
        const testSchemaManager = new SchemaManager({ classes: { ImportTextFile, ImportJsonFile } });
        const testMancer = new ConfigMancer(testSchemaManager);
        
        // Test with non-existent text file
        const textConfig = {
            '@': 'ImportTextFile',
            fileName: '/tmp/non-existent-file.txt'
        };
        
        const textReviver = testMancer.createReviver();
        
        assert.throws(() => {
            JSON.parse(JSON.stringify(textConfig), textReviver);
        }, /ENOENT: no such file or directory/);
        
        // Test with non-existent JSON file
        const jsonConfig = {
            '@': 'ImportJsonFile',
            fileName: '/tmp/non-existent-file.json'
        };
        
        const jsonReviver = testMancer.createReviver();
        
        assert.throws(() => {
            JSON.parse(JSON.stringify(jsonConfig), jsonReviver);
        }, /ENOENT: no such file or directory/);
    });

    test('ImportJsonFile handles malformed JSON gracefully', () => {
        const testSchemaManager = new SchemaManager({ classes: { ImportJsonFile } });
        const testMancer = new ConfigMancer(testSchemaManager);
        
        // Create a file with malformed JSON
        const malformedJsonPath = '/tmp/malformed.json';
        writeFileSync(malformedJsonPath, '{ invalid json }');
        
        try {
            const config = {
                '@': 'ImportJsonFile',
                fileName: malformedJsonPath
            };
            
            const reviver = testMancer.createReviver();
            
            assert.throws(() => {
                JSON.parse(JSON.stringify(config), reviver);
            }, /Expected property name or '}' in JSON/);
            
        } finally {
            unlinkSync(malformedJsonPath);
        }
    });

    test('ImportJsonFile works in nested configuration objects', () => {
        class AppConfig extends BaseConfigMancerType {
            static configMancerSample = {
                '@': 'AppConfig',
                name: 'test-app',
                settings: {}
            };
        }

        const testSchemaManager = new SchemaManager({ classes: { AppConfig, ImportJsonFile } });
        const testMancer = new ConfigMancer(testSchemaManager);
        
        // Create a temporary JSON file with settings data
        const settingsData = {
            theme: 'dark',
            language: 'en',
            features: {
                notifications: true,
                autoSave: false
            }
        };
        const testFilePath = '/tmp/app-settings.json';
        const configFilePath = '/tmp/test-nested-import-config.json';
        writeFileSync(testFilePath, JSON.stringify(settingsData));
        
        try {
            // Create a config with nested ImportJsonFile
            const config = {
                '@': 'AppConfig',
                name: 'my-app',
                settings: {
                    '@': 'ImportJsonFile',
                    fileName: testFilePath
                }
            };
            
            writeFileSync(configFilePath, JSON.stringify(config));
            
            const result = testMancer.reviveFile(configFilePath);
            
            // Verify the main config structure
            assert.equal(result.name, 'my-app');
            
            // Verify the nested ImportJsonFile was resolved to the actual JSON content
            assert.deepEqual(result.settings, settingsData);
            assert.equal(result.settings.theme, 'dark');
            assert.equal(result.settings.language, 'en');
            assert.equal(result.settings.features.notifications, true);
            assert.equal(result.settings.features.autoSave, false);
            
        } finally {
            unlinkSync(testFilePath);
            unlinkSync(configFilePath);
        }
    });

    test('ImportJsonFile works with relative paths in nested config using reviveFile', () => {
        class AppConfig extends BaseConfigMancerType {
            static configMancerSample = {
                '@': 'AppConfig',
                name: 'test-app',
                settings: {}
            };
        }

        const testSchemaManager = new SchemaManager({ classes: { AppConfig, ImportJsonFile } });
        const testMancer = new ConfigMancer(testSchemaManager);
        
        // Create a temporary JSON file with settings data
        const settingsData = {
            database: {
                host: 'localhost',
                port: 5432
            },
            cache: {
                ttl: 300
            }
        };
        const settingsFilePath = '/tmp/db-settings.json';
        writeFileSync(settingsFilePath, JSON.stringify(settingsData));
        
        // Create the main config file that references the settings file relatively
        const mainConfig = {
            '@': 'AppConfig',
            name: 'my-database-app',
            settings: {
                '@': 'ImportJsonFile',
                fileName: 'db-settings.json'  // Relative path
            }
        };
        
        const configFilePath = '/tmp/app-config.json';
        writeFileSync(configFilePath, JSON.stringify(mainConfig));
        
        try {
            // Use reviveFile which should automatically resolve relative paths
            const result = testMancer.reviveFile(configFilePath);
            
            // Verify the main config structure
            assert.equal(result.name, 'my-database-app');
            
            // Verify the nested ImportJsonFile was resolved correctly
            assert.deepEqual(result.settings, settingsData);
            assert.equal(result.settings.database.host, 'localhost');
            assert.equal(result.settings.database.port, 5432);
            assert.equal(result.settings.cache.ttl, 300);
            
        } finally {
            unlinkSync(settingsFilePath);
            unlinkSync(configFilePath);
        }
    });
});

suite('ConfigMancer lazy loading tests', () => {
    // Helper function to create a temporary test module
    let moduleCounter = 0;
    const createTestModule = (content) => {
        const tempFilePath = `/tmp/test-module-${Date.now()}-${++moduleCounter}.mjs`;
        writeFileSync(tempFilePath, content);
        return tempFilePath;
    };

    test('create method with simple export', async () => {
        const testModuleContent = `
            import { BaseConfigMancerType } from '${process.cwd()}/index.js';
            
            export class TestConfig extends BaseConfigMancerType {
                static configMancerSample = {
                    name: 'test',
                    value: 42,
                    $optional: 'default'
                };
                
                getDisplayName() {
                    return \`\${this.name}: \${this.value}\`;
                }
            }
        `;
        
        const tempFilePath = createTestModule(testModuleContent);
        
        try {
            const mancer = await ConfigMancer.create({
                fromUrl: import.meta.url,
                packages: [tempFilePath]
            });
            
            // Verify schema was created correctly
            assert.ok(mancer.schemaManager.schema);
            const schemaKey = `${tempFilePath}:TestConfig`;
            assert.ok(mancer.schemaManager.schema[schemaKey]);
            
            const schema = mancer.schemaManager.schema[schemaKey];
            assert.equal(schema.superType, schemaKey);
            assert.deepEqual(schema.params.name, ['string', true, false]);
            assert.deepEqual(schema.params.value, ['number', true, false]);
            assert.deepEqual(schema.params.optional, ['string', false, false]);
            
            // Test configuration validation
            const config = {
                '@': schemaKey,
                name: 'test-config',
                value: 100
            };
            
            const testFilePath = '/tmp/test-packages-config.json';
            writeFileSync(testFilePath, JSON.stringify(config));
            
            try {
                const result = mancer.reviveFile(testFilePath);
                assert.equal(result.name, 'test-config');
                assert.equal(result.value, 100);
                assert.equal(typeof result.getDisplayName, 'function');
                assert.equal(result.getDisplayName(), 'test-config: 100');
            } finally {
                unlinkSync(testFilePath);
            }
        } finally {
            try {
                unlinkSync(tempFilePath);
            } catch (cleanupError) {
                // Ignore cleanup errors
            }
        }
    });

    test('create method with nested exports', async () => {
        const testModuleContent = `
            import { BaseConfigMancerType } from '${process.cwd()}/index.js';
            
            export class DatabaseConfig extends BaseConfigMancerType {
                static configMancerSample = {
                    host: 'localhost',
                    port: 5432
                };
            }
            
            export const configs = {
                ApiConfig: class extends BaseConfigMancerType {
                    static configMancerSample = {
                        url: 'https://api.example.com',
                        database: {}
                    };
                }
            };
        `;
        
        const tempFilePath = createTestModule(testModuleContent);
        
        try {
            const mancer = await ConfigMancer.create({
                fromUrl: import.meta.url,
                packages: [tempFilePath]
            });
            
            // Verify both schemas were created
            assert.ok(mancer.schemaManager.schema[`${tempFilePath}:DatabaseConfig`]);
            assert.ok(mancer.schemaManager.schema[`${tempFilePath}:configs.ApiConfig`]);
            
            const dbSchema = mancer.schemaManager.schema[`${tempFilePath}:DatabaseConfig`];
            assert.equal(dbSchema.superType, `${tempFilePath}:DatabaseConfig`);
            assert.deepEqual(dbSchema.params.host, ['string', true, false]);
            assert.deepEqual(dbSchema.params.port, ['number', true, false]);
            
            const apiSchema = mancer.schemaManager.schema[`${tempFilePath}:configs.ApiConfig`];
            assert.equal(apiSchema.superType, `${tempFilePath}:configs.ApiConfig`);
            assert.deepEqual(apiSchema.params.url, ['string', true, false]);
            assert.deepEqual(apiSchema.params.database, ['object', true, false]);
        } finally {
            try {
                unlinkSync(tempFilePath);
            } catch (cleanupError) {
                // Ignore cleanup errors
            }
        }
    });

    test('create method works with multiple packages', async () => {
        const testModule1Content = `
            import { BaseConfigMancerType } from '${process.cwd()}/index.js';
            
            export class TestConfig extends BaseConfigMancerType {
                static configMancerSample = {
                    name: 'test',
                    value: 42,
                    $optional: 'default'
                };
                
                getDisplayName() {
                    return \`\${this.name}: \${this.value}\`;
                }
            }
        `;
        
        const testModule2Content = `
            import { BaseConfigMancerType } from '${process.cwd()}/index.js';
            
            export class DatabaseConfig extends BaseConfigMancerType {
                static configMancerSample = {
                    host: 'localhost',
                    port: 5432
                };
            }
            
            export const configs = {
                ApiConfig: class extends BaseConfigMancerType {
                    static configMancerSample = {
                        url: 'https://api.example.com',
                        database: {}
                    };
                }
            };
        `;
        
        const tempFilePath1 = createTestModule(testModule1Content);
        const tempFilePath2 = createTestModule(testModule2Content);
        
        try {
            const mancer = await ConfigMancer.create({
                fromUrl: import.meta.url,
                packages: [tempFilePath1, tempFilePath2]
            });
            
            // Verify both schemas were created
            assert.ok(mancer.schemaManager.schema[`${tempFilePath1}:TestConfig`]);
            assert.ok(mancer.schemaManager.schema[`${tempFilePath2}:DatabaseConfig`]);
            assert.ok(mancer.schemaManager.schema[`${tempFilePath2}:configs.ApiConfig`]);
            
            const testSchema = mancer.schemaManager.schema[`${tempFilePath1}:TestConfig`];
            assert.equal(testSchema.superType, `${tempFilePath1}:TestConfig`);
            assert.deepEqual(testSchema.params.name, ['string', true, false]);
            assert.deepEqual(testSchema.params.value, ['number', true, false]);
            assert.deepEqual(testSchema.params.optional, ['string', false, false]);
            
            const dbSchema = mancer.schemaManager.schema[`${tempFilePath2}:DatabaseConfig`];
            assert.equal(dbSchema.superType, `${tempFilePath2}:DatabaseConfig`);
            assert.deepEqual(dbSchema.params.host, ['string', true, false]);
            assert.deepEqual(dbSchema.params.port, ['number', true, false]);
            
            const apiSchema = mancer.schemaManager.schema[`${tempFilePath2}:configs.ApiConfig`];
            assert.equal(apiSchema.superType, `${tempFilePath2}:configs.ApiConfig`);
            assert.deepEqual(apiSchema.params.url, ['string', true, false]);
            assert.deepEqual(apiSchema.params.database, ['object', true, false]);
        } finally {
            try {
                unlinkSync(tempFilePath1);
                unlinkSync(tempFilePath2);
            } catch (cleanupError) {
                // Ignore cleanup errors
            }
        }
    });

    test('create method handles constants', async () => {
        const testModuleContent = `
            // Export constant objects that can have configMancerSample added
            export const API_CONFIG = {
                endpoint: 'https://api.example.com',
                version: 'v1'
            };
            API_CONFIG.configMancerSample = true;
            
            export const DEFAULT_SETTINGS = {
                maxRetries: 3,
                timeout: 5000
            };
            DEFAULT_SETTINGS.configMancerSample = true;
        `;
        
        const tempFilePath = createTestModule(testModuleContent);
        
        try {
            const mancer = await ConfigMancer.create({
                fromUrl: import.meta.url,
                packages: [tempFilePath]
            });
            
            // Verify constant schemas were created
            const apiConfigKey = `${tempFilePath}:API_CONFIG`;
            const defaultSettingsKey = `${tempFilePath}:DEFAULT_SETTINGS`;
            
            assert.ok(mancer.schemaManager.schema[apiConfigKey]);
            assert.ok(mancer.schemaManager.schema[defaultSettingsKey]);
            
            assert.equal(mancer.schemaManager.schema[apiConfigKey].isConstant, true);
            assert.equal(mancer.schemaManager.schema[defaultSettingsKey].isConstant, true);
            
            assert.equal(mancer.schemaManager.schema[apiConfigKey].superType, 'object');
            assert.equal(mancer.schemaManager.schema[defaultSettingsKey].superType, 'object');
            
            // Test using the constant
            const config = {
                '@': apiConfigKey
            };
            
            const testFilePath = '/tmp/test-packages-constant.json';
            writeFileSync(testFilePath, JSON.stringify(config));
            
            try {
                const result = mancer.reviveFile(testFilePath);
                assert.deepEqual(result, {
                    endpoint: 'https://api.example.com',
                    version: 'v1'
                });
            } finally {
                unlinkSync(testFilePath);
            }
        } finally {
            try {
                unlinkSync(tempFilePath);
            } catch (cleanupError) {
                // Ignore cleanup errors
            }
        }
    });
});