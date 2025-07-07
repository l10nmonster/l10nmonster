import { readFileSync, writeFileSync } from 'fs';
import { BaseConfigMancerType } from './BaseConfigMancerType.js';
import { JsonSchemaGenerator } from './JsonSchemaGenerator.js';
import { SchemaManager } from './SchemaManager.js';

/**
 * ConfigMancer is a configuration management utility that provides schema-based
 * validation and object construction from JSON configuration files. It supports
 * typed configuration objects with validation, mandatory property checks, and
 * automatic object instantiation based on class factories.
 */
export class ConfigMancer {
    #schemaManager;
    validationOnly;

    /**
     * Creates a new ConfigMancer instance.
     * @param {SchemaManager|Object} schemaManagerOrOptions - Either a SchemaManager instance or options to create one
     * @param {boolean} [validationOnly=false] - If true, only validates without constructing objects
     */
    constructor(schemaManagerOrOptions, validationOnly = false) {
        if (schemaManagerOrOptions instanceof SchemaManager) {
            this.#schemaManager = schemaManagerOrOptions;
        } else {
            this.#schemaManager = new SchemaManager(schemaManagerOrOptions);
            // For backward compatibility, if packages are provided, warn that async initialization is needed
            if (schemaManagerOrOptions?.packages?.length > 0) {
                console.warn('Warning: Packages provided to ConfigMancer constructor. Call .initialize() to load packages, or use ConfigMancer.createFromSources() for automatic initialization.');
            }
        }
        this.validationOnly = validationOnly;
    }
    
    /**
     * Initializes the ConfigMancer by loading packages.
     * This is required when packages are provided to the constructor.
     * @returns {Promise<void>}
     */
    async initialize() {
        await this.#schemaManager.initialize();
    }
    
    /**
     * Static factory method to create a ConfigMancer with packages loaded.
     * @param {Object|string[]} sources - Either an object with class constructors or array of package names
     * @param {string} [fromUrl] - URL to resolve packages from (usually import.meta.url from calling code)
     * @param {boolean} [validationOnly=false] - If true, only validates without constructing objects
     * @returns {Promise<ConfigMancer>} A new ConfigMancer instance with packages loaded
     */
    static async createFromSources(sources, fromUrl = null, validationOnly = false) {
        const schemaManager = await SchemaManager.createFromSources(sources, fromUrl);
        return new ConfigMancer(schemaManager, validationOnly);
    }

    /**
     * Gets the current schema (for backward compatibility).
     * @returns {Object} The current schema
     */
    get schema() {
        return this.#schemaManager.schema;
    }

    // TODO: support enforcing objects with arbitrary keys but same value type (basically like arrays)
        // like this
        // targetLangsByTenant: {
        //     smcc: [ 'ja-JP' ],
        // },
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
        if (!this.#schemaManager) {
            throw new Error(`Can't revive without a schema manager.`);
        }
        
        // Capture schema manager reference for use in reviver function
        const schemaManager = this.#schemaManager;
        
        // Bind private methods to access them from within the reviver function
        const getReviverContext = this.#getReviverContext.bind(this);
        const handleMissingSchema = this.#handleMissingSchema.bind(this);
        const getPropertyDefinition = this.#getPropertyDefinition.bind(this);
        const getPropertyType = this.#getPropertyType.bind(this);
        const isPrimitiveValue = this.#isPrimitiveValue.bind(this);
        const handleArrayValue = this.#handleArrayValue.bind(this);
        const handleObjectValue = this.#handleObjectValue.bind(this);
        
        return function reviver(key, value) {
            // console.log(key, this['@'], value['@']);
            if (key === '@') {
                return value;
            }
            
            // eslint-disable-next-line no-invalid-this
            const context = getReviverContext(key, value, this);
            const { isRootObject, withinArray, containerType, parentSchema } = context;
            
            if (!parentSchema) {
                return handleMissingSchema(containerType, value);
            }
            
            const propertyDef = getPropertyDefinition(parentSchema, key, isRootObject, withinArray);
            if (!propertyDef) {
                throw new Error(`key "${key}" not allowed in ${containerType}`);
            }
            
            const propType = getPropertyType(propertyDef, parentSchema, isRootObject, withinArray);
            
            if (isPrimitiveValue(value, propType, isRootObject, withinArray)) {
                return value;
            }
            
            if (typeof value !== 'object') {
                const typeSchema = schemaManager.getType(value['@']);
                throw new Error(`superType mismatch for key "${key}" in ${containerType}: expected ${propType} and found ${typeSchema?.superType}`);
            }
            
            if (Array.isArray(value)) {
                return handleArrayValue(value, key, containerType, propType, propertyDef);
            }
            
            return handleObjectValue(value, key, containerType, propType, withinArray);
        };
    }
    
    #getReviverContext(key, value, thisArg) {
        const isRootObject = key === '';
        const withinArray = Array.isArray(thisArg);
        const containerType = isRootObject || withinArray ? value['@'] : thisArg['@'];
        const parentSchema = this.#schemaManager.getType(containerType);
        
        return { isRootObject, withinArray, containerType, parentSchema };
    }
    
    #handleMissingSchema(containerType, value) {
        if (containerType) {
            throw new Error(`${containerType} not found in schema -- did you import it?`);
        }
        return value; // needed for arrays of primitives
    }
    
    #getPropertyDefinition(parentSchema, key, isRootObject, withinArray) {
        const propertyDefs = parentSchema.params ?? {};
        const propertyDef = propertyDefs[key];
        
        if (propertyDef || isRootObject || withinArray) {
            return propertyDef || true; // return true for root/array cases
        }
        return null;
    }
    
    #getPropertyType(propertyDef, parentSchema, isRootObject, withinArray) {
        if (isRootObject || withinArray) {
            return parentSchema.superType;
        }
        return propertyDef[0];
    }
    
    #isPrimitiveValue(value, propType, isRootObject, withinArray) {
        return typeof value === propType && !isRootObject && !withinArray && !Array.isArray(value);
    }
    
    #handleArrayValue(value, key, containerType, propType, propertyDef) {
        if (!propertyDef[2]) {
            throw new Error(`found an array in key "${key}" of ${containerType} instead of a ${propType} object`);
        }
        
        return value.map(obj => {
            const objSchema = this.#schemaManager.getType(obj['@']);
            const objSupertype = objSchema?.superType ?? typeof obj;
            
            if (objSupertype !== propType) {
                throw new Error(`superType mismatch element of array in key "${key}" in ${containerType}: expected ${propType} and found ${objSupertype}`);
            }
            
            if (objSchema) {
                // Handle constants - return the constant value directly
                if (objSchema.isConstant) {
                    return this.validationOnly ? obj : objSchema.factory;
                }
                
                // Create a copy of the object without the '@' property instead of mutating the original
                // eslint-disable-next-line no-unused-vars
                const { '@': _, ...objWithoutType } = obj;
                return this.validationOnly ? objWithoutType : (objSchema.factory ?? BaseConfigMancerType).configMancerFactory(objWithoutType);
            }
            
            return obj;
        });
    }
    
    #handleObjectValue(value, key, containerType, propType, withinArray) {
        const valueSchema = this.#schemaManager.getType(value['@']);
        
        if (valueSchema?.superType !== propType) {
            throw new Error(`primitive type mismatch for key "${key}" in ${containerType}: expected ${propType} and found ${typeof value}`);
        }
        
        // Handle constants - return the constant value directly (no property validation needed)
        if (valueSchema.isConstant) {
            return this.validationOnly ? value : valueSchema.factory;
        }
        
        this.#validateObjectProperties(value, valueSchema, containerType);
        
        if (withinArray) {
            return value; // we can't build the object here because it can't be validated because we don't have access to the containing property (`this` is the array)
        }
        
        delete value['@'];
        return this.validationOnly ? value : (valueSchema.factory ?? BaseConfigMancerType).configMancerFactory(value);
    }
    
    #validateObjectProperties(value, valueSchema, containerType) {
        Object.keys(valueSchema.params).filter(k => value[k] !== undefined).forEach(k => {
            const isArray = Array.isArray(value[k]);
            const shouldBe = Boolean(valueSchema.params[k][2]);
            
            if (isArray !== shouldBe) {
                throw new Error(`invalid "${k}" property found in ${containerType}: should be ${shouldBe ? 'array' : 'value'} but is ${isArray ? 'array' : 'value'} : ${value[k]}`);
            }
        });
        
        const missingProps = Object.keys(valueSchema.params).filter(k => value[k] === undefined && valueSchema.params[k][1]);
        
        if (missingProps.length > 0) {
            throw new Error(`mandatory properties not found in ${containerType}: ${missingProps.join(', ')}`);
        }
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
        const serialized = this.serialize(obj);
        const jsonString = JSON.stringify(serialized, null, indent);
        writeFileSync(pathName, jsonString, 'utf-8');
    }

    /**
     * Recursively serializes an object and its nested properties into a ConfigMancer-compatible format.
     * This method handles JSON primitives, objects with configMancerSerializer methods, and arrays.
     * @param {any} obj - The object to serialize
     * @param {Set} [visited] - Set to track visited objects and prevent circular references
     * @returns {any} The serialized object that can be saved as JSON and re-instantiated with ConfigMancer
     * @throws {Error} If an object cannot be serialized (missing configMancerSerializer and not a JSON type)
     */
    serialize(obj, visited = new Set()) {
        // Handle primitive values (JSON types)
        if (obj === null || typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean' || typeof obj === 'undefined') {
            return obj;
        }

        // Prevent circular references
        if (visited.has(obj)) {
            throw new Error('Circular reference detected during serialization');
        }
        
        visited.add(obj);

        try {
            // Handle arrays
            if (Array.isArray(obj)) {
                return obj.map(item => this.serialize(item, visited));
            }

            // Handle objects - check if it's a registered class or has configMancerSerializer
            if (typeof obj === 'object') {
                // Check if this object is an instance of a registered class
                const typeName = this.#getTypeNameForObject(obj);
                
                if (typeName) {
                    // This is a registered class, use its configMancerSerializer
                    if (typeof obj.configMancerSerializer === 'function') {
                        const serialized = obj.configMancerSerializer();
                        
                        // Recursively serialize nested properties and add @ property
                        const result = { '@': typeName };
                        for (const [key, value] of Object.entries(serialized)) {
                            result[key] = this.serialize(value, visited);
                        }
                        
                        return result;
                    } else {
                        throw new Error(`Object of type ${typeName} is missing configMancerSerializer method`);
                    }
                }
                
                // Check if it's a custom class with configMancerSerializer
                if (typeof obj.configMancerSerializer === 'function') {
                    const serialized = obj.configMancerSerializer();
                    
                    // For custom classes, we need to determine the type name from the constructor
                    const constructorName = obj.constructor.name;
                    if (constructorName && constructorName !== 'Object') {
                        const result = { '@': constructorName };
                        for (const [key, value] of Object.entries(serialized)) {
                            result[key] = this.serialize(value, visited);
                        }
                        return result;
                    }
                }
                
                // Handle plain objects by copying properties and recursively serializing
                if (obj.constructor === Object) {
                    const result = {};
                    for (const [key, value] of Object.entries(obj)) {
                        result[key] = this.serialize(value, visited);
                    }
                    return result;
                }
                
                // If we get here, it's an unknown object type
                throw new Error(`Cannot serialize object of type ${obj.constructor.name}: missing configMancerSerializer method`);
            }
            
            // Shouldn't reach here, but handle unknown types
            throw new Error(`Cannot serialize value of type ${typeof obj}`);
        } finally {
            visited.delete(obj);
        }
    }

    /**
     * Determines the type name for an object by checking if its constructor matches any registered factory.
     * @param {Object} obj - The object to check
     * @returns {string|null} The type name if found, null otherwise
     */
    #getTypeNameForObject(obj) {
        if (!obj || typeof obj !== 'object') {
            return null;
        }
        
        // Check if the object has a stored original constructor (for BaseConfigMancerType instances)
        // eslint-disable-next-line dot-notation
        const constructor = obj['__originalConstructor'] || obj.constructor;
        
        for (const [typeName, schemaEntry] of Object.entries(this.#schemaManager.schema)) {
            if (schemaEntry.factory && constructor === schemaEntry.factory) {
                return typeName;
            }
        }
        
        return null;
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
