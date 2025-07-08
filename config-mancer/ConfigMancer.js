import { readFileSync, writeFileSync } from 'fs';
import { JsonSchemaGenerator } from './JsonSchemaGenerator.js';
import { SchemaManager } from './SchemaManager.js';
import { ReviverMaker } from './ReviverMaker.js';
import { ConfigMancerSerializer } from './ConfigMancerSerializer.js';

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
     * @param {Object} schemaManager - A SchemaManager instance
     */
    constructor(schemaManager) {
        if (!(schemaManager instanceof SchemaManager)) {
            throw new Error('ConfigMancer constructor requires a SchemaManager instance');
        }
        this.#schemaManager = schemaManager;
        this.#serializer = new ConfigMancerSerializer(schemaManager);
    }

    /**
     * Gets the schema manager instance.
     * @returns {Object} The schema manager instance
     */
    get schemaManager() {
        return this.#schemaManager;
    }
    
    /**
     * Static factory method to create a ConfigMancer with schema manager options.
     * @param {Object} schemaManagerOptions - Options to create a SchemaManager.
     * @param {string[]} [schemaManagerOptions.packages] - Package names to search for types.
     * @param {Object} [schemaManagerOptions.classes] - Direct class mappings.
     * @param {string} [schemaManagerOptions.baseUrl] - The base URL for resolving package paths, typically import.meta.url of the caller.
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
     * @returns {(this: any, key: string, value: any) => any} A JSON reviver function that validates and constructs objects
     * @throws {Error} If no schema is available for validation
     * @example
     * const reviver = mancer.createReviver();
     * const config = JSON.parse(jsonString, reviver);
     */
    createReviver() {
        const reviverMaker = new ReviverMaker(this.#schemaManager, this.validationOnly);
        return reviverMaker.createReviver();
    }

    /**
     * Loads and constructs a configuration object from a file.
     * Validates the configuration against the schema and constructs typed objects
     * using the registered class factories (unless validationOnly is true).
     * @param {string} pathName - Path to the configuration file to load
     * @returns {Object} The configuration object (with or without typed instances based on validationOnly setting)
     * @throws {Error} If the file cannot be read, validation fails, or object construction fails
     * @example
     * const config = mancer.reviveFile('./config.json');
     */
    reviveFile(pathName) {
        const configFile = readFileSync(pathName, 'utf-8');
        return JSON.parse(configFile, this.createReviver());
    }

    /**
     * Serializes an object and writes it to a file as JSON.
     * The object is first serialized using the ConfigMancer serialization format,
     * then written to the specified file path with proper JSON formatting.
     * @param {any} obj - The object to serialize and write
     * @param {string} pathName - Path to the file where the serialized object will be written
     * @param {number} [indent=2] - Number of spaces to use for JSON indentation
     * @throws {Error} If the object cannot be serialized or the file cannot be written
     * @example
     * mancer.serializeToPathName(configObject, './config.json');
     */
    serializeToPathName(obj, pathName, indent = 2) {
        const serialized = this.#serializer.serialize(obj);
        const jsonString = JSON.stringify(serialized, null, indent);
        writeFileSync(pathName, jsonString, 'utf-8');
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
}
