import { suite, test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { ConfigMancer, BaseConfigMancerType } from '../index.js';
import { SchemaManager } from '../SchemaManager.js';

// Test configuration classes
class DatabaseConfig extends BaseConfigMancerType {
    static configMancerSample = {
        '@': 'object',
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
        '@': 'object',
        url: 'https://api.example.com',
        $timeout: 5000,
        databases: [{ '@': 'object' }]
    };

    getPrimaryDatabase() {
        return this.databases[0];
    }
}

suite('ConfigMancer tests', () => {
    const schemaManager = new SchemaManager({
        classes: {
            DatabaseConfig,
            ApiConfig
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
        assert.equal(dbSchema.superType, 'object');
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
        // A class that doesn't extend BaseConfigMancerType but has the required static methods
        class CustomConfig {
            static configMancerSample = {
                '@': 'object',
                name: 'test',
                value: 42,
                $optional: 'default'
            };

            static configMancerFactory(obj) {
                return new CustomConfig(obj);
            }

            constructor(obj) {
                Object.assign(this, obj);
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
            
            // Verify the object was created correctly
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

    test('throws error for missing configMancerFactory method', () => {
        class MissingFactoryConfig {
            static configMancerSample = {
                '@': 'object',
                name: 'test'
            };
            // Missing configMancerFactory method
        }

        assert.throws(() => {
            new SchemaManager({ classes: { MissingFactoryConfig } });
        }, /Class MissingFactoryConfig must have a static "configMancerFactory" method/);
    });

    test('configMancerSerializer returns serializable object with @ property', () => {
        class TestConfig extends BaseConfigMancerType {
            static configMancerSample = {
                '@': 'object',
                name: 'test',
                value: 42
            };

            getDisplayName() {
                return `${this.name}: ${this.value}`;
            }
        }

        const config = new TestConfig({
            name: 'test-config',
            value: 100,
            description: 'A test configuration'
        });

        const serialized = config.configMancerSerializer();

        // configMancerSerializer should NOT include @ property (added by serialize method)
        assert.equal(serialized['@'], undefined);
        assert.equal(serialized.name, 'test-config');
        assert.equal(serialized.value, 100);
        assert.equal(serialized.description, 'A test configuration');
        assert.equal(typeof serialized.getDisplayName, 'undefined');
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
                '@': 'object',
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
                '@': 'object',
                host: 'localhost',
                port: 5432
            };
        }

        class ApiConfig extends BaseConfigMancerType {
            static configMancerSample = {
                '@': 'object',
                url: 'https://api.example.com',
                database: { '@': 'object' }
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
                '@': 'object',
                host: 'localhost',
                port: 5432
            };
        }

        class ApiConfig extends BaseConfigMancerType {
            static configMancerSample = {
                '@': 'object',
                url: 'https://api.example.com',
                databases: [{ '@': 'object' }]
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
                '@': 'object',
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
                '@': 'object',
                url: 'https://api.example.com',
                databases: [{ '@': 'object' }]
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
                '@': 'object',
                name: 'test',
                child: { '@': 'object' }
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
                '@': 'object',
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
                '@': 'object',
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
                    '@': 'object',
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
            assert.equal(schema.superType, 'object');
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
                    '@': 'object',
                    host: 'localhost',
                    port: 5432
                };
            }
            
            export const configs = {
                ApiConfig: class extends BaseConfigMancerType {
                    static configMancerSample = {
                        '@': 'object',
                        url: 'https://api.example.com',
                        database: { '@': 'object' }
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
            assert.equal(dbSchema.superType, 'object');
            assert.deepEqual(dbSchema.params.host, ['string', true, false]);
            assert.deepEqual(dbSchema.params.port, ['number', true, false]);
            
            const apiSchema = mancer.schemaManager.schema[`${tempFilePath}:configs.ApiConfig`];
            assert.equal(apiSchema.superType, 'object');
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

    test('create method validates configMancerFactory method', async () => {
        const testModuleContent = `
            export class InvalidConfig {
                static configMancerSample = {
                    '@': 'object',
                    name: 'test'
                };
                // Missing configMancerFactory method
            }
        `;
        
        const tempFilePath = createTestModule(testModuleContent);
        
        try {
            await ConfigMancer.create({
                fromUrl: import.meta.url,
                packages: [tempFilePath]
            });
            assert.fail('Should have thrown an error');
        } catch (error) {
            assert.ok(error.message.includes('must have a static "configMancerFactory" method'));
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
            
            export class Config1 extends BaseConfigMancerType {
                static configMancerSample = {
                    '@': 'object',
                    name: 'config1'
                };
            }
        `;
        
        const testModule2Content = `
            import { BaseConfigMancerType } from '${process.cwd()}/index.js';
            
            export class Config2 extends BaseConfigMancerType {
                static configMancerSample = {
                    '@': 'object',
                    name: 'config2'
                };
            }
        `;
        
        const tempFilePath1 = createTestModule(testModule1Content);
        const tempFilePath2 = createTestModule(testModule2Content);
        
        try {
            const mancer = await ConfigMancer.create({
                fromUrl: import.meta.url,
                packages: [tempFilePath1, tempFilePath2]
            });
            
            // Verify both schemas were created
            assert.ok(mancer.schemaManager.schema[`${tempFilePath1}:Config1`]);
            assert.ok(mancer.schemaManager.schema[`${tempFilePath2}:Config2`]);
            
            assert.equal(Object.keys(mancer.schemaManager.schema).length, 2);
        } finally {
            try {
                unlinkSync(tempFilePath1);
            } catch (cleanupError) {
                // Ignore cleanup errors
            }
            try {
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