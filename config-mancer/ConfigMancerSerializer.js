/**
 * ConfigMancerSerializer handles the serialization of configuration objects
 * back to a ConfigMancer-compatible JSON format.
 */
export class ConfigMancerSerializer {
    #schemaManager;

    /**
     * Creates a new ConfigMancerSerializer instance.
     * @param {import('./SchemaManager.js').SchemaManager} schemaManager - A SchemaManager instance
     */
    constructor(schemaManager) {
        this.#schemaManager = schemaManager;
    }

    /**
     * Serializes an object into a ConfigMancer-compatible format.
     * @param {any} obj - The object to serialize
     * @returns {any} The serialized object that can be saved as JSON and re-instantiated with ConfigMancer
     * @throws {Error} If an object cannot be serialized (missing configMancerSerializer and not a JSON type)
     */
    serialize(obj) {
        return this.#serialize(obj, new Set());
    }

    /**
     * Recursively serializes an object and its nested properties into a ConfigMancer-compatible format.
     * This method handles JSON primitives, objects with configMancerSerializer methods, and arrays.
     * @param {any} obj - The object to serialize
     * @param {Set} visited - Set to track visited objects and prevent circular references
     * @returns {any} The serialized object that can be saved as JSON and re-instantiated with ConfigMancer
     * @throws {Error} If an object cannot be serialized (missing configMancerSerializer and not a JSON type)
     */
    #serialize(obj, visited) {
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
                return obj.map(item => this.#serialize(item, visited));
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
                            result[key] = this.#serialize(value, visited);
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
                            result[key] = this.#serialize(value, visited);
                        }
                        return result;
                    }
                }
                
                // Handle plain objects by copying properties and recursively serializing
                if (obj.constructor === Object) {
                    const result = {};
                    for (const [key, value] of Object.entries(obj)) {
                        result[key] = this.#serialize(value, visited);
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
     * @param {any} obj - The object to check
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
} 