/**
 * SchemaManager handles lazy loading and resolution of ConfigMancer types from packages and classes.
 */
export class SchemaManager {
    #schema = {};              // Schema of resolved types
    #packageNames = [];        // Packages to search for types
    #localClasses = {};        // Direct class mappings

    /**
     * Creates a new SchemaManager instance.
     * @param {Object} options - Configuration options
     * @param {string[]} [options.packages] - Package names to search for types
     * @param {Object} [options.classes] - Direct class mappings
     */
    constructor({ packages = [], classes = {} } = {}) {
        this.#packageNames = packages;
        this.#localClasses = classes;
        
        // Pre-populate schema with local classes
        this.#addLocalClasses();
    }
    
    /**
     * Initializes the schema by processing packages.
     * This must be called after construction to load packages.
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.#packageNames.length > 0) {
            await this.#processAllPackages();
        }
    }

    /**
     * Gets the current schema (useful for JSON schema generation).
     * @returns {Object} The current schema
     */
    get schema() {
        return this.#schema;
    }

    /**
     * Adds local classes to the schema immediately.
     */
    #addLocalClasses() {
        for (const [typeName, factory] of Object.entries(this.#localClasses)) {
            const sample = factory.configMancerSample;
            if (sample) {
                this.#addToSchema(typeName, factory, sample);
            } else {
                throw new Error(`Couldn't find a "configMancerSample" property in type ${typeName}`);
            }
        }
    }

    /**
     * Adds a type definition to the schema.
     * @param {string} typeName - The name of the type
     * @param {any} factory - The factory function/class or constant value
     * @param {Object|boolean} sample - The configMancerSample object or true for constants
     */
    #addToSchema(typeName, factory, sample) {
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
            this.#schema[typeName] = def;
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
        
        this.#schema[typeName] = def;
    }

    /**
     * Processes all packages eagerly at construction time.
     * This handles both CommonJS and ESM modules.
     */
    async #processAllPackages() {
        // Helper function to process a single export
        const processExport = (exportValue, keyPath, packageName) => {
            if (!exportValue || (typeof exportValue !== 'object' && typeof exportValue !== 'function')) {
                return;
            }
            
            // Check if this export has configMancerSample
            if (exportValue.configMancerSample) {
                const typeName = `${packageName}:${keyPath}`;
                this.#addToSchema(typeName, exportValue, exportValue.configMancerSample);
            }
            
            // If it's a plain object, recurse into its properties
            if (exportValue.constructor === Object) {
                for (const [key, value] of Object.entries(exportValue)) {
                    processExport(value, `${keyPath}.${key}`, packageName);
                }
            }
        };
        
        // Process all packages
        for (const packageName of this.#packageNames) {
            try {
                const packageExports = await import(packageName);
                
                // Process all exports from the package
                for (const [exportName, exportValue] of Object.entries(packageExports)) {
                    processExport(exportValue, exportName, packageName);
                }
                
            } catch (error) {
                throw new Error(`Failed to import package "${packageName}": ${error.message}`);
            }
        }
    }

    /**
     * Gets a type from the schema.
     * @param {string} typeName - The type name to get
     * @returns {Object|null} The schema entry for the type, or null if not found
     */
    getType(typeName) {
        return this.#schema[typeName] || null;
    }

    /**
     * Checks if a type exists in the schema (without triggering lazy loading).
     * @param {string} typeName - The type name to check
     * @returns {boolean} True if the type exists in the current schema
     */
    hasType(typeName) {
        return this.#schema[typeName] !== undefined;
    }


} 