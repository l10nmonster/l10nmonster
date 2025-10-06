import { CueSchemaGenerator } from '../CueSchemaGenerator.js';
import { BaseConfigMancerType } from '../BaseConfigMancerType.js';
import { suite, test, beforeEach, afterEach } from 'node:test';
import { strictEqual, throws, ok, match } from 'node:assert';
import { readFileSync, unlinkSync, existsSync, writeFileSync } from 'fs';
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

// Mock polymorphic translator classes
class MockOpenAITranslator extends BaseConfigMancerType {
    static configMancerSample = {
        '@': 'object',
        apiKey: 'test-key',
        model: 'gpt-4'
    };
}

class MockAnthropicTranslator extends BaseConfigMancerType {
    static configMancerSample = {
        '@': 'object',
        apiKey: 'test-key',
        modelName: 'claude-3'
    };
}

class MockConfig extends BaseConfigMancerType {
    static configMancerSample = {
        '@': 'config',
        translator: { '@': 'object' },
        $debug: false
    };
}

// Constant configuration for testing
const MOCK_CONSTANTS = {
    production: 'https://api.prod.example.com',
    staging: 'https://api.staging.example.com'
};
MOCK_CONSTANTS.configMancerSample = true;

suite('CueSchemaGenerator', () => {
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

        generator = new CueSchemaGenerator(schema);
        testFilePath = join(tmpdir(), `test-cue-schema-${Date.now()}.cue`);
    });

    afterEach(() => {
        // Clean up test files
        if (existsSync(testFilePath)) {
            unlinkSync(testFilePath);
        }
    });

    suite('constructor', () => {
        test('should create a CueSchemaGenerator instance with schema', () => {
            ok(generator instanceof CueSchemaGenerator);
        });
    });

    suite('generateCueSchema', () => {
        test('should generate all types when rootType is omitted', () => {
            const cueSchema = generator.generateCueSchema();

            // Should include all type definitions
            ok(cueSchema.includes('#api: {'));
            ok(cueSchema.includes('#constants:'));
            ok(cueSchema.includes('#database: {'));

            // Types should be sorted alphabetically
            const apiIndex = cueSchema.indexOf('#api:');
            const constantsIndex = cueSchema.indexOf('#constants:');
            const databaseIndex = cueSchema.indexOf('#database:');
            ok(apiIndex < constantsIndex);
            ok(constantsIndex < databaseIndex);
        });

        test('should generate a simple CUE type definition', () => {
            const cueSchema = generator.generateCueSchema('database');

            // Should include type definition
            ok(cueSchema.includes('#database: {'));
            // Should include @ field (inherited, not mandatory marker)
            ok(cueSchema.includes('"@": "database"'));
            // Should include required fields with !
            ok(cueSchema.includes('host!: string'));
            ok(cueSchema.includes('port!: number'));
            ok(cueSchema.includes('ssl!: bool'));
            // Should include optional field with ?
            ok(cueSchema.includes('timeout?: number'));
        });

        test('should generate CUE schema with nested type references', () => {
            const cueSchema = generator.generateCueSchema('api');

            // Should include both type definitions
            ok(cueSchema.includes('#database: {'));
            ok(cueSchema.includes('#api: {'));
            // Should reference nested type
            ok(cueSchema.includes('databases!: [...#database]'));
        });

        test('should generate CUE schema with optional fields', () => {
            const cueSchema = generator.generateCueSchema('api');

            // Optional fields should have ? suffix
            ok(cueSchema.includes('retryCount?: number'));
        });

        test('should generate constant definitions', () => {
            const cueSchema = generator.generateCueSchema('constants');

            // Constants should be generated as JSON values
            ok(cueSchema.includes('#constants:'));
            ok(cueSchema.includes('production'));
            ok(cueSchema.includes('staging'));
        });

        test('should sort parameters alphabetically', () => {
            const cueSchema = generator.generateCueSchema('database');

            // Extract parameter order
            const hostIndex = cueSchema.indexOf('host!:');
            const portIndex = cueSchema.indexOf('port!:');
            const sslIndex = cueSchema.indexOf('ssl!:');
            const timeoutIndex = cueSchema.indexOf('timeout?:');

            // Check alphabetical order
            ok(hostIndex < portIndex);
            ok(portIndex < sslIndex);
            ok(sslIndex < timeoutIndex);
        });

        test('should throw error for non-existent root type', () => {
            throws(() => {
                generator.generateCueSchema('nonexistent');
            }, /Root type "nonexistent" not found in schema/);
        });
    });

    suite('polymorphism with disjunctions', () => {
        test('should generate disjunctions for polymorphic types', () => {
            const polySchema = {
                config: {
                    superType: 'config',
                    params: {
                        translator: ['object', true, false],
                        debug: ['boolean', false, false]
                    },
                    factory: MockConfig,
                    isConstant: false
                },
                OpenAITranslator: {
                    superType: 'object',
                    params: {
                        apiKey: ['string', true, false],
                        model: ['string', true, false]
                    },
                    factory: MockOpenAITranslator,
                    isConstant: false
                },
                AnthropicTranslator: {
                    superType: 'object',
                    params: {
                        apiKey: ['string', true, false],
                        modelName: ['string', true, false]
                    },
                    factory: MockAnthropicTranslator,
                    isConstant: false
                }
            };

            const polyGenerator = new CueSchemaGenerator(polySchema);
            const cueSchema = polyGenerator.generateCueSchema('config');

            // Should include all concrete implementations
            ok(cueSchema.includes('#OpenAITranslator: {'));
            ok(cueSchema.includes('#AnthropicTranslator: {'));

            // Should reference abstract supertype for translator property
            ok(cueSchema.includes('translator!: #object'));

            // Should include abstract supertype definition with {...} for 'object'
            ok(cueSchema.includes('// Abstract supertype: object'));
            ok(cueSchema.includes('#object: #AnthropicTranslator | #OpenAITranslator | {...}'));
        });

        test('should generate abstract supertype when generating all types', () => {
            const polySchema = {
                config: {
                    superType: 'config',
                    params: {
                        translator: ['object', true, false]
                    },
                    factory: MockConfig,
                    isConstant: false
                },
                OpenAITranslator: {
                    superType: 'object',
                    params: {
                        apiKey: ['string', true, false],
                        model: ['string', true, false]
                    },
                    factory: MockOpenAITranslator,
                    isConstant: false
                },
                AnthropicTranslator: {
                    superType: 'object',
                    params: {
                        apiKey: ['string', true, false],
                        modelName: ['string', true, false]
                    },
                    factory: MockAnthropicTranslator,
                    isConstant: false
                }
            };

            const polyGenerator = new CueSchemaGenerator(polySchema);
            const cueSchema = polyGenerator.generateCueSchema();

            // Should include abstract supertype definition with {...} for 'object'
            ok(cueSchema.includes('// Abstract supertype: object'));
            ok(cueSchema.includes('#object: #AnthropicTranslator | #OpenAITranslator | {...}'));

            // Should include all concrete types
            ok(cueSchema.includes('#OpenAITranslator: {'));
            ok(cueSchema.includes('#AnthropicTranslator: {'));
            ok(cueSchema.includes('#config: {'));
        });

        test('should generate abstract supertype for custom interface types', () => {
            const customInterfaceSchema = {
                GHRepositoryConfig: {
                    superType: 'GHRepositoryConfig',
                    params: {
                        repository: ['string', true, false],
                        channelPolicies: ['GHPolicy', false, true]
                    },
                    factory: class GHRepositoryConfig {},
                    isConstant: false
                },
                GH_DNTBadSourceContentPolicy: {
                    superType: 'GHPolicy',
                    params: {},
                    factory: class GH_DNTBadSourceContentPolicy {},
                    isConstant: false
                },
                GH_SomeOtherPolicy: {
                    superType: 'GHPolicy',
                    params: {
                        threshold: ['number', true, false]
                    },
                    factory: class GH_SomeOtherPolicy {},
                    isConstant: false
                }
            };

            const customGenerator = new CueSchemaGenerator(customInterfaceSchema);
            const cueSchema = customGenerator.generateCueSchema();

            // Should include abstract supertype definition for GHPolicy
            ok(cueSchema.includes('// Abstract supertype: GHPolicy'));
            ok(cueSchema.includes('#GHPolicy: #GH_DNTBadSourceContentPolicy | #GH_SomeOtherPolicy'));

            // Should include all concrete implementations
            ok(cueSchema.includes('#GH_DNTBadSourceContentPolicy: {'));
            ok(cueSchema.includes('#GH_SomeOtherPolicy: {'));

            // Should use the abstract type reference in array definition
            ok(cueSchema.includes('channelPolicies?: [...#GHPolicy]'));
        });

        test('should reference abstract supertypes in arrays of polymorphic types', () => {
            const polyArraySchema = {
                pipeline: {
                    superType: 'pipeline',
                    params: {
                        processors: ['object', true, true] // array of objects
                    },
                    factory: class Pipeline {},
                    isConstant: false
                },
                FilterProcessor: {
                    superType: 'object',
                    params: {
                        type: ['string', true, false]
                    },
                    factory: class FilterProcessor {},
                    isConstant: false
                },
                TransformProcessor: {
                    superType: 'object',
                    params: {
                        operation: ['string', true, false]
                    },
                    factory: class TransformProcessor {},
                    isConstant: false
                }
            };

            const polyGenerator = new CueSchemaGenerator(polyArraySchema);
            const cueSchema = polyGenerator.generateCueSchema('pipeline');

            // Should reference abstract supertype in array syntax
            ok(cueSchema.includes('processors!: [...#object]'));
        });
    });

    suite('type mapping', () => {
        test('should map string type to CUE string', () => {
            const cueSchema = generator.generateCueSchema('database');
            ok(cueSchema.includes('host!: string'));
        });

        test('should map number type to CUE number', () => {
            const cueSchema = generator.generateCueSchema('database');
            ok(cueSchema.includes('port!: number'));
        });

        test('should map boolean type to CUE bool', () => {
            const cueSchema = generator.generateCueSchema('database');
            ok(cueSchema.includes('ssl!: bool'));
        });

        test('should map custom types to CUE references', () => {
            const cueSchema = generator.generateCueSchema('api');
            ok(cueSchema.includes('databases!: [...#database]'));
        });
    });

    suite('array handling', () => {
        test('should generate array syntax with spread operator', () => {
            const cueSchema = generator.generateCueSchema('api');
            ok(cueSchema.includes('[...#database]'));
        });

        test('should generate arrays of primitives', () => {
            const arraySchema = {
                tags: {
                    superType: 'tags',
                    params: {
                        items: ['string', true, true]
                    },
                    factory: class Tags {},
                    isConstant: false
                }
            };

            const arrayGenerator = new CueSchemaGenerator(arraySchema);
            const cueSchema = arrayGenerator.generateCueSchema('tags');

            ok(cueSchema.includes('items!: [...string]'));
        });
    });

    suite('CUE syntax validation', () => {
        test('should use tabs for indentation', () => {
            const cueSchema = generator.generateCueSchema('database');
            // Check for tab indentation
            ok(cueSchema.includes('\t"@":'));
            ok(cueSchema.includes('\thost!:'));
        });

        test('should properly format field definitions', () => {
            const cueSchema = generator.generateCueSchema('database');

            // Fields should follow pattern: name!: type or name?: type
            match(cueSchema, /\thost!: string/);
            match(cueSchema, /\tport!: number/);
            match(cueSchema, /\ttimeout\?: number/);
        });

        test('should use double quotes for @ field without mandatory marker', () => {
            const cueSchema = generator.generateCueSchema('database');
            ok(cueSchema.includes('"@": "database"'));
        });
    });

    suite('type name sanitization', () => {
        test('should sanitize type names with special characters', () => {
            const specialCharsSchema = {
                'MyConfig': {
                    superType: 'MyConfig',
                    params: {
                        helper: ['@l10nmonster/config-mancer:ImportJsonFile', true, false]
                    },
                    factory: class MyConfig {},
                    isConstant: false
                },
                '@l10nmonster/config-mancer:ImportJsonFile': {
                    superType: '@l10nmonster/config-mancer:ImportJsonFile',
                    params: {
                        fileName: ['string', true, false]
                    },
                    factory: class ImportJsonFile {},
                    isConstant: false
                }
            };

            const specialGenerator = new CueSchemaGenerator(specialCharsSchema);
            const cueSchema = specialGenerator.generateCueSchema();

            // Should sanitize type name with special characters to valid CUE identifier
            ok(cueSchema.includes('#_l10nmonster_config_mancer_ImportJsonFile: {'));

            // Should preserve original type name in @ field
            ok(cueSchema.includes('"@": "@l10nmonster/config-mancer:ImportJsonFile"'));

            // Should reference sanitized type name in properties
            ok(cueSchema.includes('helper!: #_l10nmonster_config_mancer_ImportJsonFile'));
        });

        test('should sanitize type names in abstract supertypes', () => {
            const abstractSchema = {
                'Config': {
                    superType: 'Config',
                    params: {
                        translator: ['my-package:Translator', true, false]
                    },
                    factory: class Config {},
                    isConstant: false
                },
                'my-package:OpenAI': {
                    superType: 'my-package:Translator',
                    params: {
                        apiKey: ['string', true, false]
                    },
                    factory: class OpenAI {},
                    isConstant: false
                },
                'my-package:Anthropic': {
                    superType: 'my-package:Translator',
                    params: {
                        apiKey: ['string', true, false]
                    },
                    factory: class Anthropic {},
                    isConstant: false
                }
            };

            const abstractGenerator = new CueSchemaGenerator(abstractSchema);
            const cueSchema = abstractGenerator.generateCueSchema();

            // Should sanitize abstract supertype name
            ok(cueSchema.includes('#my_package_Translator: #my_package_Anthropic | #my_package_OpenAI'));

            // Should preserve original in comment
            ok(cueSchema.includes('// Abstract supertype: my-package:Translator'));
        });
    });

    suite('package declaration', () => {
        test('should include generated file warning comment', () => {
            const cueSchema = generator.generateCueSchema();

            // Should include warning comment at the top
            ok(cueSchema.startsWith('// Code generated by ConfigMancer. DO NOT EDIT.'));
        });

        test('should generate CUE schema without package when not provided', () => {
            const cueSchema = generator.generateCueSchema();

            // Should include warning comment
            ok(cueSchema.startsWith('// Code generated by ConfigMancer. DO NOT EDIT.\n\n'));

            // Should not include package declaration
            ok(!cueSchema.includes('package '));
        });

        test('should generate CUE schema with package declaration when provided', () => {
            const cueSchema = generator.generateCueSchema(undefined, 'config');

            // Should include warning comment followed by package declaration
            ok(cueSchema.startsWith('// Code generated by ConfigMancer. DO NOT EDIT.\n\npackage config\n\n'));

            // Should still include all types
            ok(cueSchema.includes('#api: {'));
            ok(cueSchema.includes('#database: {'));
        });

        test('should generate specific type with package declaration', () => {
            const cueSchema = generator.generateCueSchema('database', 'schemas');

            // Should include warning comment and package declaration
            ok(cueSchema.startsWith('// Code generated by ConfigMancer. DO NOT EDIT.\n\npackage schemas\n\n'));

            // Should include the specific type
            ok(cueSchema.includes('#database: {'));
        });
    });

    suite('edge cases', () => {
        test('should handle types with no parameters', () => {
            const emptySchema = {
                empty: {
                    superType: 'empty',
                    params: {},
                    factory: class Empty {},
                    isConstant: false
                }
            };

            const emptyGenerator = new CueSchemaGenerator(emptySchema);
            const cueSchema = emptyGenerator.generateCueSchema('empty');

            // Should still generate valid type with @ field
            ok(cueSchema.includes('#empty: {'));
            ok(cueSchema.includes('"@": "empty"'));
        });

        test('should handle types with all optional parameters', () => {
            const optionalSchema = {
                optional: {
                    superType: 'optional',
                    params: {
                        opt1: ['string', false, false],
                        opt2: ['number', false, false]
                    },
                    factory: class Optional {},
                    isConstant: false
                }
            };

            const optionalGenerator = new CueSchemaGenerator(optionalSchema);
            const cueSchema = optionalGenerator.generateCueSchema('optional');

            // All fields should be optional
            ok(cueSchema.includes('opt1?: string'));
            ok(cueSchema.includes('opt2?: number'));
        });

        test('should not include duplicate type definitions', () => {
            const cueSchema = generator.generateCueSchema('api');

            // Count occurrences of #database definition
            const matches = cueSchema.match(/#database: \{/g);
            strictEqual(matches.length, 1, 'Should only define #database once');
        });
    });
});
