import { BaseConfigMancerType } from './BaseConfigMancerType.js';

/**
 * @typedef {import('./types.js').AdditionalProperties} AdditionalProperties
 */

/**
 * ReviverMaker creates JSON reviver functions for parsing and validating configuration objects.
 * The reviver functions can be used with JSON.parse() to automatically validate
 * and construct typed objects from JSON data.
 */
export class ReviverMaker {
    #schemaManager;
    #validationOnly;

    /**
     * Creates a new ReviverMaker instance.
     * @param {import('./SchemaManager.js').SchemaManager} schemaManager - The schema manager instance
     * @param {boolean} validationOnly - If true, only validates without constructing objects
     */
    constructor(schemaManager, validationOnly = false) {
        this.#schemaManager = schemaManager;
        this.#validationOnly = validationOnly;
    }

    /**
     * Creates a JSON reviver function for parsing and validating configuration objects.
     * The reviver function can be used with JSON.parse() to automatically validate
     * and construct typed objects from JSON data.
     * @param {AdditionalProperties} [additionalProperties] - Additional properties to be added to all objects passed to factories
     * @returns {(this: any, key: string, value: any) => any} A JSON reviver function that validates and constructs objects
     * @throws {Error} If no schema is available for validation
     * @example
     * const reviver = reviverMaker.createReviver();
     * const config = JSON.parse(jsonString, reviver);
     */
    createReviver(additionalProperties) {
        if (!this.#schemaManager) {
            throw new Error(`Can't revive without a schema manager.`);
        }
        
        // Capture validation flag for use in reviver function
        const validationOnly = this.#validationOnly;
        
        // Bind private methods to access them from within the reviver function
        const getReviverContext = this.#getReviverContext.bind(this);
        const handleMissingSchema = this.#handleMissingSchema.bind(this);
        const getPropertyDefinition = this.#getPropertyDefinition.bind(this);
        const getPropertyType = this.#getPropertyType.bind(this);
        const isPrimitiveValue = this.#isPrimitiveValue.bind(this);
        const handleArrayValue = this.#handleArrayValue.bind(this);
        const handleObjectValue = this.#handleObjectValue.bind(this);
        const instantiate = this.#instantiate.bind(this);
        
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
                throw new Error(`primitive type mismatch for key "${key}" in ${containerType}: expected ${propType} and found ${typeof value}`);
            }
            
            if (Array.isArray(value)) {
                return handleArrayValue(value, key, containerType, propType, propertyDef, validationOnly, additionalProperties, instantiate);
            }
            
            return handleObjectValue(value, key, containerType, propType, withinArray, validationOnly, additionalProperties, instantiate);
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
        // If the value has an @ property, it's a typed object that needs processing, not a primitive
        if (typeof value === 'object' && value !== null && value['@']) {
            return false;
        }
        return typeof value === propType && !isRootObject && !withinArray && !Array.isArray(value);
    }
    
    #handleArrayValue(value, key, containerType, propType, propertyDef, validationOnly, additionalProperties, instantiate) {
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
                    return validationOnly ? obj : objSchema.factory;
                }
                
                // Create a copy of the object without the '@' property instead of mutating the original
                // eslint-disable-next-line no-unused-vars
                const { '@': _, ...objWithoutType } = obj;
                return validationOnly ? objWithoutType : instantiate(objSchema.factory ?? BaseConfigMancerType, objWithoutType, additionalProperties);
            }
            
            return obj;
        });
    }
    
    #handleObjectValue(value, key, containerType, propType, withinArray, validationOnly, additionalProperties, instantiate) {
        const valueSchema = this.#schemaManager.getType(value['@']);
        
        if (valueSchema?.superType !== propType) {
            throw new Error(`primitive type mismatch for key "${key}" in ${containerType}: expected ${propType} and found ${typeof value}`);
        }
        
        // Handle constants - return the constant value directly (no property validation needed)
        if (valueSchema.isConstant) {
            return validationOnly ? value : valueSchema.factory;
        }
        
        this.#validateObjectProperties(value, valueSchema, containerType);
        
        if (withinArray) {
            return value; // we can't build the object here because it can't be validated because we don't have access to the containing property (`this` is the array)
        }
        
        delete value['@'];
        return validationOnly ? value : instantiate(valueSchema.factory ?? BaseConfigMancerType, value, additionalProperties);
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

    #instantiate(factory, params, additionalProperties) {
        // Merge additional properties into params if provided
        const mergedParams = additionalProperties ? { ...params, ...additionalProperties } : params;
        
        if (typeof factory.configMancerFactory === 'function') {
            return factory.configMancerFactory(mergedParams);
        }
        return new factory(mergedParams);
    }
} 