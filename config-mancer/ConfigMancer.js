import { readFileSync } from 'fs';
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
     * @param {boolean} [validationOnly=false] - If true, only validates without constructing objects
     * @returns {ConfigMancer} A new ConfigMancer instance with the generated schema
     * @throws {Error} If any class is missing the required `configMancerSample` property
     * @example
     * const mancer = ConfigMancer.createFromClasses({
     *   MyType: MyTypeClass,
     *   AnotherType: AnotherTypeClass
     * });
     */
    static createFromClasses(obj, validationOnly = false) {
        const schema = {};
        for (const [ typeName, factory ] of Object.entries(obj)) {
            const sample = factory.configMancerSample;
            if (sample) {
                const def = {
                    superType: sample['@'],
                    params: {},
                    factory,
                };
                def.superType ??= typeName;
                for (const [ paramName, sampleValue ] of Object.entries(sample)) {
                    if (paramName !== '@') {
                        const [ param, isMandatory ] = paramName.startsWith('$') ? [ paramName.substring(1), false ] : [ paramName, true ];
                        const [ paramType, isArray ] = Array.isArray(sampleValue) ? [ sampleValue[0]['@'] ?? typeof sampleValue[0], true ] : [ sampleValue['@'] ?? typeof sampleValue, false ];
                        def.params[param] = [ paramType, isMandatory, isArray ];
                    }
                }
                schema[typeName] = def;
            } else {
                throw new Error(`Couldn't find a "configMancerSample" property in class ${typeName}`);
            }
        }
        return new ConfigMancer(schema, validationOnly);
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
        return typeof value === propType && !isRootObject && !withinArray;
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
                delete obj['@'];
                return this.validationOnly ? obj : new (objSchema.factory ?? BaseConfigMancerType)(obj);
            }
            
            return obj;
        });
    }
    
    #handleObjectValue(value, key, containerType, propType, withinArray) {
        const valueSchema = this.schema[value['@']];
        
        if (valueSchema?.superType !== propType) {
            throw new Error(`primitive type mismatch for key "${key}" in ${containerType}: expected ${propType} and found ${typeof value}`);
        }
        
        this.#validateObjectProperties(value, valueSchema, containerType);
        
        if (withinArray) {
            return value; // we can't build the object here because it can't be validated because we don't have access to the containing property (`this` is the array)
        }
        
        delete value['@'];
        return this.validationOnly ? value : new (valueSchema.factory ?? BaseConfigMancerType)(value);
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
} 