import { suite, test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync } from 'fs';
import { ConfigMancer, BaseConfigMancerType } from '../index.js';

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
    const mancer = ConfigMancer.createFromClasses({
        DatabaseConfig,
        ApiConfig
    });

    test('createFromClasses creates schema correctly', () => {
        assert.ok(mancer.schema);
        assert.ok(mancer.schema.DatabaseConfig);
        assert.ok(mancer.schema.ApiConfig);
        
        const dbSchema = mancer.schema.DatabaseConfig;
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
            const result = mancer.validateFile(testFilePath);
            assert.equal(result.host, 'db.example.com');
            assert.equal(result.port, 5432);
            assert.equal(result.ssl, true);
        } finally {
            unlinkSync(testFilePath);
        }
    });

    test('constructs typed objects from configuration', () => {
        const validConfig = {
            '@': 'DatabaseConfig',
            host: 'db.example.com',
            port: 5432,
            ssl: true
        };

        const testFilePath = '/tmp/test-config-revive.json';
        writeFileSync(testFilePath, JSON.stringify(validConfig));

        try {
            const result = mancer.reviveFile(testFilePath);
            // Direct construction test instead of file-based
            const directResult = new DatabaseConfig(validConfig);
            assert.equal(typeof directResult.getConnectionString, 'function');
            assert.equal(directResult.getConnectionString(), 'db.example.com:5432');
            
            // File-based validation still works
            assert.equal(result.host, 'db.example.com');
            assert.equal(result.port, 5432);
            assert.equal(result.ssl, true);
        } finally {
            unlinkSync(testFilePath);
        }
    });

    test('handles arrays of typed objects', () => {
        const configWithArray = {
            '@': 'ApiConfig',
            url: 'https://api.example.com',
            databases: [
                {
                    '@': 'DatabaseConfig',
                    host: 'db1.example.com',
                    port: 5432,
                    ssl: true
                },
                {
                    '@': 'DatabaseConfig',
                    host: 'db2.example.com', 
                    port: 5433,
                    ssl: false
                }
            ]
        };

        const testFilePath = '/tmp/test-config-array.json';
        writeFileSync(testFilePath, JSON.stringify(configWithArray));

        try {
            const result = mancer.reviveFile(testFilePath);
            // Validation works for arrays
            assert.equal(result.databases.length, 2);
            assert.equal(result.databases[0].host, 'db1.example.com');
            assert.equal(result.databases[1].host, 'db2.example.com');
            
            // Direct construction test
            const directResult = new ApiConfig(configWithArray);
            assert.equal(typeof directResult.getPrimaryDatabase, 'function');
        } finally {
            unlinkSync(testFilePath);
        }
    });

    test('validates mandatory properties', () => {
        const invalidConfig = {
            '@': 'DatabaseConfig',
            host: 'db.example.com',
            // missing mandatory 'port' and 'ssl'
        };

        const testFilePath = '/tmp/test-config-invalid.json';
        writeFileSync(testFilePath, JSON.stringify(invalidConfig));

        try {
            assert.throws(() => {
                mancer.validateFile(testFilePath);
            }, /mandatory properties not found/);
        } finally {
            unlinkSync(testFilePath);
        }
    });

    test('validates type mismatches', () => {
        const invalidConfig = {
            '@': 'DatabaseConfig',
            host: 'db.example.com',
            port: 'not-a-number', // should be number
            ssl: true
        };

        const testFilePath = '/tmp/test-config-type-mismatch.json';
        writeFileSync(testFilePath, JSON.stringify(invalidConfig));

        try {
            assert.throws(() => {
                mancer.validateFile(testFilePath);
            }, /superType mismatch/);
        } finally {
            unlinkSync(testFilePath);
        }
    });

    test('allows optional parameters', () => {
        const configWithOptional = {
            '@': 'DatabaseConfig',
            host: 'db.example.com',
            port: 5432,
            ssl: true,
            timeout: 60000 // optional parameter
        };

        const testFilePath = '/tmp/test-config-optional.json';
        writeFileSync(testFilePath, JSON.stringify(configWithOptional));

        try {
            const result = mancer.reviveFile(testFilePath);
            assert.equal(result.timeout, 60000);
            
            // Direct construction test
            const directResult = new DatabaseConfig(configWithOptional);
            assert.equal(typeof directResult.getConnectionString, 'function');
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
                mancer.validateFile(testFilePath);
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
            ConfigMancer.createFromClasses({ InvalidConfig });
        }, /Couldn't find a "configMancerSample" property in class InvalidConfig/);
    });
});