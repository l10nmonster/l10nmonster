/**
 * Creates a double-pronged object that combines data properties with behavior methods.
 * @param {Record<string, any>} data - The data object containing properties
 * @param {Record<string, Function>} behavior - The behavior object containing methods
 * @returns {Proxy} A proxy object that provides access to both data and behavior
 */
function createDoubleProngedObject(data, behavior) {
    return new Proxy(data, {
        get: function get(obj, key) {
            return key in obj ? obj[key] : behavior[key];
        }
    });
}

/**
 * Base class for configuration objects that provides a proxy-based mechanism
 * to combine data properties with prototype methods. This allows configuration
 * objects to have both data and behavior accessible through the same interface.
 */
export class BaseConfigMancerType {

    /**
     * Creates a new BaseConfigMancerType instance.
     * @param {Record<string, any>} obj - The configuration object containing data properties
     * @description This constructor creates a proxy that combines the provided object
     * with the class prototype, allowing seamless access to both data and methods.
     * It also sets up prototype chains for nested objects and array elements.
     */
    constructor(obj) {
        const proxiedThis = createDoubleProngedObject(obj, this.constructor.prototype);
        
        // Store the original constructor for type detection
        Object.defineProperty(proxiedThis, '__originalConstructor', {
            value: this.constructor,
            writable: false,
            enumerable: false,
            configurable: false
        });
        
        for (const value of Object.values(obj)) {
            if (Array.isArray(value)) {
                value.forEach(item => typeof item === 'object' && Object.setPrototypeOf(item, proxiedThis));
            } else {
                typeof value === 'object' && Object.setPrototypeOf(value, proxiedThis);
            }
        }
        // eslint-disable-next-line no-constructor-return
        return proxiedThis;
    }

    /**
     * Static factory method for creating instances of this class.
     * This method is used by ConfigMancer instead of the constructor.
     * @param {Record<string, any>} obj - The configuration object containing data properties
     * @returns {BaseConfigMancerType} A new instance of the class
     */
    static configMancerFactory(obj) {
        return new this(obj);
    }

    /**
     * Serializes this object into a format suitable for ConfigMancer.
     * This method should be overridden by subclasses to provide custom serialization logic.
     * The returned object should be a plain object without the '@' property.
     * @returns {Record<string, any>} A plain object with data properties suitable for factory instantiation
     */
    configMancerSerializer() {
        const result = {};
        // Copy all enumerable properties from the proxy object
        const keys = Object.keys(this);
        for (const key of keys) {
            const value = this[key];
            if (typeof value !== 'function') {
                result[key] = value;
            }
        }
        return result;
    }
}
