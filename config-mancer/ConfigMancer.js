import path from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { parse as yamlParse, stringify as yamlStringify } from 'yaml';
import { JsonSchemaGenerator } from './JsonSchemaGenerator.js';
import { CueSchemaGenerator } from './CueSchemaGenerator.js';
import { SchemaManager } from './SchemaManager.js';
import { ReviverMaker } from './ReviverMaker.js';
import { ConfigMancerSerializer } from './ConfigMancerSerializer.js';

/**
 * @typedef {import('./types.js').SchemaManagerOptions} SchemaManagerOptions
 * @typedef {import('./types.js').AdditionalProperties} AdditionalProperties
 */

/**
 * ConfigMancer is a configuration management utility that provides schema-based
 * validation and object construction from JSON configuration files. It supports
 * typed configuration objects with validation, mandatory property checks, and
 * automatic object instantiation based on class factories.
 */
export class ConfigMancer {
    #schemaManager;
    #serializer;
    validationOnly = false;

    /**
     * Creates a new ConfigMancer instance.
     * @param {SchemaManager} schemaManager - A SchemaManager instance
     */
    constructor(schemaManager) {
        if (!(schemaManager instanceof SchemaManager)) {
            throw new Error('ConfigMancer constructor requires a SchemaManager instance');
        }
        this.#schemaManager = schemaManager;
        this.#serializer = new ConfigMancerSerializer(schemaManager);
    }

    /**
     * Checks if a file path has a YAML extension.
     * @param {string} pathName - The file path to check
     * @returns {boolean} True if the file has a .yaml or .yml extension
     */
    #isYamlFile(pathName) {
        const ext = path.extname(pathName).toLowerCase();
        return ext === '.yaml' || ext === '.yml';
    }

    /**
     * Gets the schema manager instance.
     * @returns {SchemaManager} The schema manager instance
     */
    get schemaManager() {
        return this.#schemaManager;
    }
    
    /**
     * Static factory method to create a ConfigMancer with schema manager options.
     * @param {SchemaManagerOptions} schemaManagerOptions - Options to create a SchemaManager.
     * @returns {Promise<ConfigMancer>} A new ConfigMancer instance with initialized schema manager
     */
    static async create(schemaManagerOptions) {
        const schemaManager = new SchemaManager(schemaManagerOptions);
        await schemaManager.initialize();
        return new ConfigMancer(schemaManager);
    }

    /**
     * Creates a JSON reviver function for parsing and validating configuration objects.
     * The reviver function can be used with JSON.parse() to automatically validate
     * and construct typed objects from JSON data.
     * @param {AdditionalProperties} [additionalProperties] - Additional properties to be added to all objects passed to factories
     * @returns {(this: any, key: string, value: any) => any} A JSON reviver function that validates and constructs objects
     * @throws {Error} If no schema is available for validation
     * @example
     * const reviver = mancer.createReviver();
     * const config = JSON.parse(jsonString, reviver);
     */
    createReviver(additionalProperties) {
        const reviverMaker = new ReviverMaker(this.#schemaManager, this.validationOnly);
        return reviverMaker.createReviver(additionalProperties);
    }

    /**
     * Loads and constructs a configuration object from a file.
     * Validates the configuration against the schema and constructs typed objects
     * using the registered class factories (unless validationOnly is true).
     * Supports both JSON and YAML files based on file extension.
     * @param {string} pathName - Path to the configuration file to load (JSON or YAML)
     * @returns {any} The configuration object (with or without typed instances based on validationOnly setting)
     * @throws {Error} If the file cannot be read, validation fails, or object construction fails
     * @example
     * const config = mancer.reviveFile('./config.json');
     * const yamlConfig = mancer.reviveFile('./config.yaml');
     */
    reviveFile(pathName) {
        const configFile = readFileSync(pathName, 'utf-8');
        const baseDir = path.dirname(pathName);
        const reviver = this.createReviver({ '@baseDir': baseDir });
        return this.#isYamlFile(pathName) ? yamlParse(configFile, reviver) : JSON.parse(configFile, reviver);
    }

    /**
     * Serializes an object and writes it to a file as JSON or YAML.
     * The object is first serialized using the ConfigMancer serialization format,
     * then written to the specified file path with proper formatting based on file extension.
     * @param {any} obj - The object to serialize and write
     * @param {string} pathName - Path to the file where the serialized object will be written
     * @param {number} [indent=2] - Number of spaces to use for indentation
     * @throws {Error} If the object cannot be serialized or the file cannot be written
     * @example
     * mancer.serializeToPathName(configObject, './config.json');
     * mancer.serializeToPathName(configObject, './config.yaml');
     */
    serializeToPathName(obj, pathName, indent = 2) {
        const serialized = this.#serializer.serialize(obj);
        const contents = this.#isYamlFile(pathName) ? yamlStringify(serialized, { indent }) : JSON.stringify(serialized, null, indent);
        writeFileSync(pathName, contents, 'utf-8');
    }

    /**
     * Serializes an object into a ConfigMancer-compatible format.
     * @param {any} obj - The object to serialize
     * @returns {any} The serialized object that can be saved as JSON and re-instantiated with ConfigMancer
     * @throws {Error} If an object cannot be serialized (missing configMancerSerializer and not a JSON type)
     */
    serialize(obj) {
        return this.#serializer.serialize(obj);
    }

    /**
     * Generates a JSON Schema for the specified root type and writes it to a file.
     * The generated schema can be used for authoring and validation of configurations.
     * @param {string} rootType - The name of the root type to generate schema for
     * @param {string} pathName - Path to the file where the JSON schema will be written
     * @throws {Error} If the root type is not found in the schema or file cannot be written
     * @example
     * mancer.writeJsonSchema('MyRootType', './config.schema.json');
     */
    writeJsonSchema(rootType, pathName) {
        const generator = new JsonSchemaGenerator(this.#schemaManager.schema);
        generator.writeJsonSchema(rootType, pathName);
    }

    /**
     * Generates a CUE schema and writes it to a file.
     * The generated schema can be used with CUE tooling to author and validate configurations.
     * Supports polymorphism through disjunctions and properly handles the `@` type marker.
     * @param {string} pathName - Path to the file where the CUE schema will be written
     * @param {Object} [options] - Optional configuration
     * @param {string} [options.rootType] - Optional root type. If provided, generates only that type and dependencies. If omitted, generates all types.
     * @param {string} [options.packageName] - Optional package name to include in the CUE file
     * @throws {Error} If the root type is not found in the schema or file cannot be written
     * @example
     * mancer.writeCueSchema('./config_schema.cue'); // Generate all types
     * mancer.writeCueSchema('./config_schema.cue', { rootType: 'MyRootType' }); // Generate specific type
     * mancer.writeCueSchema('./config_schema.cue', { packageName: 'config' }); // Add package declaration
     * mancer.writeCueSchema('./config_schema.cue', { rootType: 'MyRootType', packageName: 'config' });
     */
    writeCueSchema(pathName, options = {}) {
        const { rootType, packageName } = options;
        const generator = new CueSchemaGenerator(this.#schemaManager.schema);
        const cueSchema = generator.generateCueSchema(rootType, packageName);
        writeFileSync(pathName, cueSchema, 'utf-8');
    }
}
