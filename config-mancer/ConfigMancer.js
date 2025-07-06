import { readFileSync, writeFileSync } from 'fs';
import { BaseConfigMancerType } from './BaseConfigMancerType.js';

/**
 * ConfigMancer is a configuration management utility that provides schema-based
 * validation and object construction from JSON configuration files. It supports
 * typed configuration objects with validation, mandatory property checks, and
 * automatic object instantiation based on class factories.
 */
export class ConfigMancer {
    schema;
    validationOnly;

    /**
     * Creates a new ConfigMancer instance.
     * @param {Object} schema - The configuration schema defining types and validation rules
     * @param {boolean} [validationOnly=false] - If true, only validates without constructing objects
     */
    constructor(schema, validationOnly = false) {
        this.schema = schema;
        this.validationOnly = validationOnly;
    }

    /**
     * Creates a ConfigMancer instance from a collection of classes.
     * Each class must have a static `configMancerSample` property that defines
     * the expected structure and types for configuration objects.
     * @param {Object} obj - Object containing class constructors keyed by type name
     * @returns {ConfigMancer} A new ConfigMancer instance with the generated schema
     * @throws {Error} If any class is missing the required `configMancerSample` property
     * @example
     * const mancer = ConfigMancer.createFromClasses({
     *   MyType: MyTypeClass,
     *   AnotherType: AnotherTypeClass
     * });
     */
    static createFromClasses(obj) {
        const schema = {};
        for (const [typeName, factory] of Object.entries(obj)) {
            const sample = factory.configMancerSample;
            if (sample) {
                this.#addToSchema(schema, typeName, factory, sample);
            } else {
                throw new Error(`Couldn't find a "configMancerSample" property in type ${typeName}`);
            }
        }
        return new ConfigMancer(schema);
    }

    /**
     * Creates a ConfigMancer instance from a collection of packages.
     * Dynamically imports each package and recursively inspects exports for objects
     * with `configMancerSample` properties. Plain objects are traversed recursively.
     * @param {string[]} packageNames - Array of package names to import and inspect
     * @returns {Promise<ConfigMancer>} A new ConfigMancer instance with the generated schema
     * @throws {Error} If any package fails to import or classes are missing required methods
     * @example
     * const mancer = await ConfigMancer.createFromPackages([
     *   'my-package',
     *   '@namespace/another-package'
     * ]);
     */
    static async createFromPackages(packageNames) {
        const schema = {};
        
        for (const packageName of packageNames) {
            try {
                const packageExports = await import(packageName);
                
                // Helper function to process a single export
                const processExport = (exportValue, keyPath) => {
                    if (!exportValue || (typeof exportValue !== 'object' && typeof exportValue !== 'function')) {
                        return;
                    }
                    
                    // Check if this export has configMancerSample
                    if (exportValue.configMancerSample) {
                        const typeName = `${packageName}:${keyPath}`;
                        this.#addToSchema(schema, typeName, exportValue, exportValue.configMancerSample);
                    }
                    
                    // If it's a plain object, recurse into its properties
                    if (exportValue.constructor === Object) {
                        for (const [key, value] of Object.entries(exportValue)) {
                            processExport(value, `${keyPath}.${key}`);
                        }
                    }
                };
                
                // Process all exports from the package
                for (const [exportName, exportValue] of Object.entries(packageExports)) {
                    processExport(exportValue, exportName);
                }
                
            } catch (error) {
                throw new Error(`Failed to import package "${packageName}": ${error.message}`);
            }
        }
        
        return new ConfigMancer(schema);
    }

    /**
     * Private helper method to add a type definition to the schema.
     * @param {Object} schema - The schema object to add to
     * @param {string} typeName - The name of the type
     * @param {any} factory - The factory function/class or constant value
     * @param {Object|boolean} sample - The configMancerSample object or true for constants
     */
    static #addToSchema(schema, typeName, factory, sample) {
        // Handle constant values where configMancerSample === true
        if (sample === true) {
            // Create a clean copy of the factory without configMancerSample
            let cleanFactory;
            if (typeof factory === 'object' && factory !== null) {
                // eslint-disable-next-line no-unused-vars
                const { configMancerSample, ...cleanObject } = factory;
                cleanFactory = cleanObject;
            } else {
                cleanFactory = factory;
            }
            
            const def = {
                superType: typeof factory,
                params: {},
                factory: cleanFactory,
                isConstant: true,
            };
            schema[typeName] = def;
            return;
        }

        // Handle regular factory classes/functions
        if (typeof factory.configMancerFactory !== 'function') {
            throw new Error(`Class ${typeName} must have a static "configMancerFactory" method`);
        }
        
        const def = {
            superType: sample['@'],
            params: {},
            factory,
            isConstant: false,
        };
        def.superType ??= typeName;
        
        for (const [paramName, sampleValue] of Object.entries(sample)) {
            if (paramName !== '@') {
                const [param, isMandatory] = paramName.startsWith('$') ? [paramName.substring(1), false] : [paramName, true];
                const [paramType, isArray] = Array.isArray(sampleValue) ? [sampleValue[0]['@'] ?? typeof sampleValue[0], true] : [sampleValue['@'] ?? typeof sampleValue, false];
                def.params[param] = [paramType, isMandatory, isArray];
            }
        }
        
        schema[typeName] = def;
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
        const schema = this.schema;
        if (!schema) {
            throw new Error(`Can't revive without a schema.`);
        }
        
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
                throw new Error(`superType mismatch for key "${key}" in ${containerType}: expected ${propType} and found ${schema[value['@']]?.superType}`);
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
        const parentSchema = this.schema[containerType];
        
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
            const objSchema = this.schema[obj['@']];
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
        const valueSchema = this.schema[value['@']];
        
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
        
        for (const [typeName, schemaEntry] of Object.entries(this.schema)) {
            if (schemaEntry.factory && constructor === schemaEntry.factory) {
                return typeName;
            }
        }
        
        return null;
    }
} 