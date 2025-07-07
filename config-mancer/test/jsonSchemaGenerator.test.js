import { JsonSchemaGenerator } from '../JsonSchemaGenerator.js';
import { BaseConfigMancerType } from '../BaseConfigMancerType.js';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { deepStrictEqual, strictEqual, throws, ok } from 'node:assert';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Mock classes for testing
class MockDatabaseConfig extends BaseConfigMancerType {
    static configMancerSample = {
        '@': 'database',
        host: 'localhost',
        port: 5432,
        ssl: true,
        $timeout: 30000 // optional parameter
    };

    static configMancerFactory(obj) {
        return new MockDatabaseConfig(obj);
    }
}

class MockApiConfig extends BaseConfigMancerType {
    static configMancerSample = {
        '@': 'api',
        url: 'https://api.example.com',
        databases: [{ '@': 'database' }], // array of databases
        $retryCount: 3 // optional parameter
    };

    static configMancerFactory(obj) {
        return new MockApiConfig(obj);
    }
}

// Constant configuration for testing
const MOCK_CONSTANTS = {
    production: 'https://api.prod.example.com',
    staging: 'https://api.staging.example.com'
};
MOCK_CONSTANTS.configMancerSample = true;

describe('JsonSchemaGenerator', () => {
    let generator;
    let schema;
    let testFilePath;

    beforeEach(() => {
        // Create schema for testing
        schema = {
            database: {
                superType: 'database',
                params: {
                    host: ['string', true, false],
                    port: ['number', true, false],
                    ssl: ['boolean', true, false],
                    timeout: ['number', false, false] // optional
                },
                factory: MockDatabaseConfig,
                isConstant: false
            },
            api: {
                superType: 'api',
                params: {
                    url: ['string', true, false],
                    databases: ['database', true, true], // array of databases
                    retryCount: ['number', false, false] // optional
                },
                factory: MockApiConfig,
                isConstant: false
            },
            constants: {
                superType: 'object',
                params: {},
                factory: MOCK_CONSTANTS,
                isConstant: true
            }
        };

        generator = new JsonSchemaGenerator(schema);
        testFilePath = join(tmpdir(), `test-schema-${Date.now()}.json`);
    });

    afterEach(() => {
        // Clean up test files
        if (existsSync(testFilePath)) {
            unlinkSync(testFilePath);
        }
    });

    describe('constructor', () => {
        it('should create a JsonSchemaGenerator instance with schema', () => {
            ok(generator instanceof JsonSchemaGenerator);
            strictEqual(generator.schema, schema);
        });
    });

    describe('generateJsonSchema', () => {
        it('should generate a complete JSON schema for a simple type', () => {
            const result = generator.generateJsonSchema('database');
            
            strictEqual(result.$schema, 'http://json-schema.org/draft-07/schema#');
            deepStrictEqual(result.$ref, '#/definitions/database');
            ok(result.definitions);
            ok(result.definitions.database);
            
            // Check the actual schema in definitions
            const databaseSchema = result.definitions.database;
            strictEqual(databaseSchema.type, 'object');
            ok(databaseSchema.properties);
            ok(databaseSchema.properties['@']);
            deepStrictEqual(databaseSchema.properties['@'], {
                type: 'string',
                const: 'database'
            });
            ok(databaseSchema.required);
            ok(databaseSchema.required.includes('@'));
            ok(databaseSchema.required.includes('host'));
            ok(databaseSchema.required.includes('port'));
            ok(databaseSchema.required.includes('ssl'));
            ok(!databaseSchema.required.includes('timeout')); // optional parameter
        });

        it('should generate a schema with definitions for complex types', () => {
            const result = generator.generateJsonSchema('api');
            
            strictEqual(result.$schema, 'http://json-schema.org/draft-07/schema#');
            ok(result.definitions);
            ok(result.definitions.database);
            ok(result.definitions.api);
        });

        it('should handle constant types', () => {
            const result = generator.generateJsonSchema('constants');
            
            strictEqual(result.$schema, 'http://json-schema.org/draft-07/schema#');
            strictEqual(result.type, 'object');
            deepStrictEqual(result.const, MOCK_CONSTANTS);
        });

        it('should not include definitions section if no complex types', () => {
            // Create a schema with only primitives
            const simpleSchema = {
                simple: {
                    superType: 'string',
                    params: {},
                    factory: 'test',
                    isConstant: true
                }
            };
            const simpleGenerator = new JsonSchemaGenerator(simpleSchema);
            
            const result = simpleGenerator.generateJsonSchema('simple');
            
            strictEqual(result.definitions, undefined);
        });
    });

    describe('generateTypeSchema', () => {
        it('should generate primitive type schemas', () => {
            const result = generator.generateTypeSchema('string', {}, new Set());
            
            deepStrictEqual(result, { type: 'string' });
        });

        it('should generate object type schemas', () => {
            const definitions = {};
            const visited = new Set();
            
            const result = generator.generateTypeSchema('database', definitions, visited);
            
            deepStrictEqual(result, { $ref: '#/definitions/database' });
            ok(definitions.database);
        });

        it('should handle circular references', () => {
            const definitions = {};
            const visited = new Set(['database']);
            
            const result = generator.generateTypeSchema('database', definitions, visited);
            
            deepStrictEqual(result, { $ref: '#/definitions/database' });
        });

        it('should handle constant schemas', () => {
            const definitions = {};
            const visited = new Set();
            
            const result = generator.generateTypeSchema('constants', definitions, visited);
            
            deepStrictEqual(result, {
                type: 'object',
                const: MOCK_CONSTANTS
            });
        });
    });

    describe('getPrimitiveTypeSchema', () => {
        it('should return correct schemas for primitive types', () => {
            deepStrictEqual(generator.getPrimitiveTypeSchema('string'), { type: 'string' });
            deepStrictEqual(generator.getPrimitiveTypeSchema('number'), { type: 'number' });
            deepStrictEqual(generator.getPrimitiveTypeSchema('boolean'), { type: 'boolean' });
            deepStrictEqual(generator.getPrimitiveTypeSchema('object'), { type: 'object' });
            deepStrictEqual(generator.getPrimitiveTypeSchema('array'), { type: 'array' });
        });

        it('should default to string for unknown types', () => {
            deepStrictEqual(generator.getPrimitiveTypeSchema('unknown'), { type: 'string' });
        });
    });

    describe('generateConstantSchema', () => {
        it('should generate constant schemas for different types', () => {
            const stringConstant = { factory: 'test-string' };
            const numberConstant = { factory: 42 };
            const booleanConstant = { factory: true };
            const objectConstant = { factory: { key: 'value' } };
            const unknownConstant = { factory: Symbol('test') };

            deepStrictEqual(generator.generateConstantSchema(stringConstant), {
                type: 'string',
                const: 'test-string'
            });

            deepStrictEqual(generator.generateConstantSchema(numberConstant), {
                type: 'number',
                const: 42
            });

            deepStrictEqual(generator.generateConstantSchema(booleanConstant), {
                type: 'boolean',
                const: true
            });

            deepStrictEqual(generator.generateConstantSchema(objectConstant), {
                type: 'object',
                const: { key: 'value' }
            });

            deepStrictEqual(generator.generateConstantSchema(unknownConstant), {
                const: unknownConstant.factory
            });
        });
    });

    describe('generateObjectSchema', () => {
        it('should generate object schemas with properties and required fields', () => {
            const definitions = {};
            const visited = new Set();
            
            const result = generator.generateObjectSchema('database', schema.database, definitions, visited);
            
            deepStrictEqual(result, {
                type: 'object',
                properties: {
                    '@': {
                        type: 'string',
                        const: 'database'
                    },
                    host: { type: 'string' },
                    port: { type: 'number' },
                    ssl: { type: 'boolean' },
                    timeout: { type: 'number' }
                },
                required: ['@', 'host', 'port', 'ssl'],
                additionalProperties: false
            });
        });

        it('should generate array properties correctly', () => {
            const definitions = {};
            const visited = new Set();
            
            const result = generator.generateObjectSchema('api', schema.api, definitions, visited);
            
            deepStrictEqual(result.properties.databases, {
                type: 'array',
                items: { $ref: '#/definitions/database' }
            });
        });

        it('should handle nested object references', () => {
            const definitions = {};
            const visited = new Set();
            
            // Generate the API schema which should reference database
            const apiSchema = generator.generateObjectSchema('api', schema.api, definitions, visited);
            
            // The API schema should be generated
            ok(apiSchema);
            strictEqual(apiSchema.type, 'object');
            
            // Database should be in definitions because it's referenced
            ok(definitions.database);
            
            // API won't be in definitions because we're calling generateObjectSchema directly
            // It would only be in definitions if generated through generateTypeSchema
        });
    });

    describe('writeJsonSchema', () => {
        it('should write JSON schema to file', () => {
            generator.writeJsonSchema('database', testFilePath);
            
            ok(existsSync(testFilePath));
            
            const fileContent = readFileSync(testFilePath, 'utf-8');
            const parsedSchema = JSON.parse(fileContent);
            
            ok(parsedSchema.$schema);
            strictEqual(parsedSchema.$ref, '#/definitions/database');
            ok(parsedSchema.definitions);
            ok(parsedSchema.definitions.database);
            strictEqual(parsedSchema.definitions.database.type, 'object');
        });

        it('should throw error for non-existent root type', () => {
            throws(() => {
                generator.writeJsonSchema('nonexistent', testFilePath);
            }, /Root type "nonexistent" not found in schema/);
        });

        it('should format JSON with proper indentation', () => {
            generator.writeJsonSchema('database', testFilePath);
            
            const fileContent = readFileSync(testFilePath, 'utf-8');
            
            // Check that the JSON is properly formatted with indentation
            ok(fileContent.match(/{\s*\n\s+"\$schema"/));
            ok(fileContent.match(/\n\s+/)); // Contains indented lines
        });
    });

    describe('edge cases', () => {
        it('should handle empty schema', () => {
            const emptyGenerator = new JsonSchemaGenerator({});
            
            const result = emptyGenerator.generateJsonSchema('string');
            
            deepStrictEqual(result, {
                $schema: 'http://json-schema.org/draft-07/schema#',
                type: 'string'
            });
        });

        it('should handle type with no parameters', () => {
            const schemaWithEmptyType = {
                empty: {
                    superType: 'empty',
                    params: {},
                    factory: class EmptyType {},
                    isConstant: false
                }
            };
            
            const emptyGenerator = new JsonSchemaGenerator(schemaWithEmptyType);
            const result = emptyGenerator.generateJsonSchema('empty');
            
            deepStrictEqual(result, {
                $schema: 'http://json-schema.org/draft-07/schema#',
                type: 'object',
                properties: {
                    '@': {
                        type: 'string',
                        const: 'empty'
                    }
                },
                required: ['@'],
                additionalProperties: false
            });
        });
    });

    describe('integration with real schema', () => {
        it('should generate a complete schema for complex nested structure', () => {
            const result = generator.generateJsonSchema('api');
            
            // Verify the structure matches expected JSON schema format
            strictEqual(result.$schema, 'http://json-schema.org/draft-07/schema#');
            deepStrictEqual(result.$ref, '#/definitions/api');
            ok(result.definitions);
            ok(result.definitions.api);
            ok(result.definitions.database);
            
            // Check api schema structure
            const apiSchema = result.definitions.api;
            strictEqual(apiSchema.type, 'object');
            ok(apiSchema.properties);
            deepStrictEqual(apiSchema.properties['@'], {
                type: 'string',
                const: 'api'
            });
            deepStrictEqual(apiSchema.properties.url, { type: 'string' });
            deepStrictEqual(apiSchema.properties.databases, {
                type: 'array',
                items: { $ref: '#/definitions/database' }
            });
            deepStrictEqual(apiSchema.properties.retryCount, { type: 'number' });
            deepStrictEqual(apiSchema.required, ['@', 'url', 'databases']);
            strictEqual(apiSchema.additionalProperties, false);
            
            // Check database schema structure
            const databaseSchema = result.definitions.database;
            strictEqual(databaseSchema.type, 'object');
            ok(databaseSchema.properties);
            deepStrictEqual(databaseSchema.properties['@'], {
                type: 'string',
                const: 'database'
            });
            deepStrictEqual(databaseSchema.properties.host, { type: 'string' });
            deepStrictEqual(databaseSchema.properties.port, { type: 'number' });
            deepStrictEqual(databaseSchema.properties.ssl, { type: 'boolean' });
            deepStrictEqual(databaseSchema.properties.timeout, { type: 'number' });
            deepStrictEqual(databaseSchema.required, ['@', 'host', 'port', 'ssl']);
            strictEqual(databaseSchema.additionalProperties, false);
        });
    });
}); 