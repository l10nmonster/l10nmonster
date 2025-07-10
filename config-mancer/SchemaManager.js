import { createRequire } from 'module';

/**
 * SchemaManager handles lazy loading and resolution of ConfigMancer types from packages and classes.
 */
export class SchemaManager {
    #schema = {};              // Schema of resolved types
    #packageNames = [];        // Packages to search for types
    #localClasses = {};        // Direct class mappings
    #baseUrl;                  // Base URL for module resolution

    /**
     * Creates a new SchemaManager instance.
     * @param {Object} [options] - Configuration options.
     * @param {string[]} [options.packages] - Package names to search for types.
     * @param {Object} [options.classes] - Direct class mappings.
     * @param {string} [options.baseUrl] - The base URL for resolving package paths, typically import.meta.url of the caller.
     */
    constructor({ packages = [], classes = {}, baseUrl = import.meta.url } = {}) {
        this.#packageNames = packages;
        this.#localClasses = classes;
        this.#baseUrl = baseUrl;
        
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
                let paramType, isArray;
                if (Array.isArray(sampleValue)) {
                    if (sampleValue[0] === undefined) {
                        throw new Error(`Array ${typeName}.${paramName} must have at least one sample value`);
                    }
                    paramType = sampleValue[0]['@'] ?? typeof sampleValue[0];
                    isArray = true;
                } else {
                    paramType = sampleValue['@'] ?? typeof sampleValue;
                    isArray = false;
                }
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
            if (typeof exportValue === 'object' && (exportValue.constructor === Object || exportValue.constructor === undefined)) { // submodules have no constructor
                for (const [key, value] of Object.entries(exportValue)) {
                    processExport(value, `${keyPath}.${key}`, packageName);
                }
            }
        };
        
        // Process all packages
        const require = createRequire(this.#baseUrl);
        for (const packageName of this.#packageNames) {
            try {
                const resolvedPath = require.resolve(packageName);
                const packageExports = await import(resolvedPath);
                
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

    /**
     * Generates markdown documentation for the schema.
     * @returns {string} Markdown documentation string
     */
    generateSchemaDocs() {
        const typesBySuper = {};
        const rootTypes = {};
        
        // Group types by superType
        for (const [typeName, def] of Object.entries(this.#schema)) {
            if (def.superType === typeName) {
                // Root type (superType same as typeName)
                rootTypes[typeName] = def;
            } else {
                // Grouped by superType
                if (!typesBySuper[def.superType]) {
                    typesBySuper[def.superType] = {};
                }
                typesBySuper[def.superType][typeName] = def;
            }
        }
        
        let markdown = '# ConfigMancer Schema Documentation\n\n';
        
        // Generate Root Types section first
        if (Object.keys(rootTypes).length > 0) {
            markdown += '## Root Types\n\n';
            const sortedRootTypes = Object.keys(rootTypes).sort();
            for (const typeName of sortedRootTypes) {
                markdown += this.#generateTypeDoc(typeName, rootTypes[typeName]);
            }
        }
        
        // Generate sections for each superType
        const sortedSuperTypes = Object.keys(typesBySuper).sort();
        for (const superType of sortedSuperTypes) {
            markdown += `## ${superType}\n\n`;
            const sortedTypes = Object.keys(typesBySuper[superType]).sort();
            for (const typeName of sortedTypes) {
                markdown += this.#generateTypeDoc(typeName, typesBySuper[superType][typeName]);
            }
        }
        
        return markdown;
    }
    
    /**
     * Generates markdown documentation for a single type.
     * @param {string} typeName - The type name
     * @param {Object} def - The type definition
     * @returns {string} Markdown documentation for the type
     */
    #generateTypeDoc(typeName, def) {
        let markdown = `### ${typeName}\n\n`;
        
        if (def.isConstant) {
            markdown += `**Constant value of type:** \`${def.superType}\`\n\n`;
            markdown += `**Value:** \`${JSON.stringify(def.factory)}\`\n\n`;
        } else {
            const paramEntries = Object.entries(def.params);
            
            if (paramEntries.length > 0) {
                markdown += '**Parameters:**\n\n';
                
                // Sort parameters alphabetically
                const sortedParams = paramEntries.sort(([a], [b]) => a.localeCompare(b));
                
                for (const [paramName, [paramType, isMandatory, isArray]] of sortedParams) {
                    const mandatoryLabel = isMandatory ? 'required' : 'optional';
                    const arrayLabel = isArray ? '[]' : '';
                    markdown += `- \`${paramName}\` (${mandatoryLabel}): \`${paramType}${arrayLabel}\`\n`;
                }
                markdown += '\n';
            } else {
                markdown += '**Parameters:** None\n\n';
            }
        }
        
        return markdown;
    }


} 