import { readFileSync } from 'fs';

function createDoubleProngedObject(data, behavior) {
    return new Proxy(data, {
        get: function(obj, key) {
            return key in obj ? obj[key] : behavior[key];
        }
    });
}

export class BaseConfigMancerType {
    constructor(obj) {
        const proxiedThis = createDoubleProngedObject(obj, this.constructor.prototype);
        for (const value of Object.values(obj)) {
            if (Array.isArray(value)) {
                value.forEach(item => typeof item === 'object' && Object.setPrototypeOf(item, proxiedThis));
            } else {
                typeof value === 'object' && Object.setPrototypeOf(value, proxiedThis);
            }
        }
        return proxiedThis;
    }
}

export class ConfigMancer {
    schema;

    constructor(schema) {
        this.schema = schema;
    }

    // this is usually a export of the main class and its dependent classes
    static createFromClasses(obj) {
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
        return new ConfigMancer(schema);
    }

    // TODO: support enforcing objects with arbitrary keys but same value type (basically like arrays)
        // like this
        // targetLangsByTenant: {
        //     smcc: [ 'ja-JP' ],
        // },
    createReviver(validationOnly) {
        const schema = this.schema;
        if (!schema) {
            throw new Error(`Can't revive without a schema.`);
        }
        return function reviver(key, value) {
            // console.log(key, this['@'], value['@']);
            if (key === '@') {
                return value;
            }
            const isRootObject = key === '';
            const withinArray = Array.isArray(this);
            const containerType = isRootObject || withinArray ? value['@'] : this['@'];
            const parentSchema = schema[containerType];
            if (parentSchema) {
                const propertyDefs = parentSchema.params ?? {};
                const propertyDef = propertyDefs[key];
                if (propertyDef || isRootObject || withinArray) {
                    const propType = isRootObject || withinArray ? parentSchema.superType : propertyDef[0];
                    if (typeof value === propType && !isRootObject && !withinArray) {
                        return value; // this is a primitive type or raw object
                    } else {
                        if (typeof value === 'object') {
                            if (Array.isArray(value)) {
                                if (propertyDef[2]) {
                                    return value.map(obj => {
                                        const objSchema = schema[obj['@']];
                                        const objSupertype = objSchema?.superType ?? typeof obj;
                                        if (objSupertype !== propType) {
                                            throw new Error(`superType mismatch element of array in key "${key}" in ${containerType}: expected ${propType} and found ${objSupertype}`)
                                        }
                                        if (objSchema) {
                                            delete obj['@'];
                                            return validationOnly ? obj : new (objSchema.factory ?? BaseConfigMancerType)(obj);
                                        } else {
                                            return obj;
                                        }
                                        });
                                } else {
                                    throw new Error(`found an array in key "${key}" of ${containerType} instead of a ${propType} object`);
                                }
                            }
                            const valueSchema = schema[value['@']];
                            if (valueSchema?.superType === propType) {
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
                                if (withinArray) {
                                    return value; // we can't build the object here because it can't be validated because we don't have access to the containing property (`this` is the array)
                                } else {
                                    delete value['@'];
                                    return validationOnly ? value : new (valueSchema.factory ?? BaseConfigMancerType)(value);
                                }
                            } else {
                                throw new Error(`primitive type mismatch for key "${key}" in ${containerType}: expected ${propType} and found ${typeof value}`)
                            }
                        } else {
                            throw new Error(`superType mismatch for key "${key}" in ${containerType}: expected ${propType} and found ${schema[value['@']]?.superType}`)
                        }
                    }
                } else {
                    throw new Error(`key "${key}" not allowed in ${containerType}`);
                }
            } else if (containerType) {
                throw new Error(`${containerType} not found in schema -- did you import it?`);
            }
            return value; // needed for arrays of primitives
        }
    }

    validateFile(pathName) {
        const configFile = readFileSync(pathName, 'utf-8');
        return JSON.parse(configFile, this.createReviver(true));
    }

    reviveFile(pathName) {
        const configFile = readFileSync(pathName, 'utf-8');
        return JSON.parse(configFile, this.createReviver());
    }
}