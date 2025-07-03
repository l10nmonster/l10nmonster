/**
 * Creates a double-pronged object that combines data properties with behavior methods.
 * @param {Object} data - The data object containing properties
 * @param {Object} behavior - The behavior object containing methods
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
     * @param {Object} obj - The configuration object containing data properties
     * @description This constructor creates a proxy that combines the provided object
     * with the class prototype, allowing seamless access to both data and methods.
     * It also sets up prototype chains for nested objects and array elements.
     */
    constructor(obj) {
        const proxiedThis = createDoubleProngedObject(obj, this.constructor.prototype);
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
}
