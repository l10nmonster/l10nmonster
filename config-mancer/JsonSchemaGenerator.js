import { writeFileSync } from 'fs';

/**
 * @typedef {import('./types.js').ConfigMancerSchema} ConfigMancerSchema
 * @typedef {import('./types.js').SchemaEntry} SchemaEntry
 */

/**
 * JsonSchemaGenerator provides utilities for generating JSON Schema files
 * from ConfigMancer schema definitions.
 */
export class JsonSchemaGenerator {
    schema;

    /**
     * Creates a new JsonSchemaGenerator instance.
     * @param {ConfigMancerSchema} schema - The ConfigMancer schema definition
     */
    constructor(schema) {
        this.schema = schema;
    }

    /**
     * Generates a JSON Schema for the specified root type and writes it to a file.
     * The generated schema can be used for authoring and validation of configurations.
     * @param {string} rootType - The name of the root type to generate schema for
     * @param {string} pathName - Path to the file where the JSON schema will be written
     * @throws {Error} If the root type is not found in the schema or file cannot be written
     * @example
     * generator.writeJsonSchema('MyRootType', './config.schema.json');
     */
    writeJsonSchema(rootType, pathName) {
        if (!this.schema[rootType]) {
            throw new Error(`Root type "${rootType}" not found in schema`);
        }

        const jsonSchema = this.generateJsonSchema(rootType);
        const schemaString = JSON.stringify(jsonSchema, null, 2);
        writeFileSync(pathName, schemaString, 'utf-8');
    }

    /**
     * Generates a JSON Schema object for the specified root type.
     * @param {string} rootType - The name of the root type to generate schema for
     * @returns {Record<string, any>} The JSON Schema object
     */
    generateJsonSchema(rootType) {
        const visited = new Set();
        const definitions = {};

        // Generate the root schema and collect all type definitions
        const rootSchema = this.generateTypeSchema(rootType, definitions, visited);

        return {
            "$schema": "http://json-schema.org/draft-07/schema#",
            ...rootSchema,
            ...(Object.keys(definitions).length > 0 && { "definitions": definitions })
        };
    }

    /**
     * Generates a JSON Schema for a specific type.
     * @param {string} typeName - The name of the type to generate schema for
     * @param {Record<string, any>} definitions - Object to collect type definitions
     * @param {Set} visited - Set to track visited types and prevent infinite recursion
     * @returns {Record<string, any>} The JSON Schema object for the type
     */
    generateTypeSchema(typeName, definitions, visited) {
        const typeSchema = this.schema[typeName];
        if (!typeSchema) {
            // Handle primitive types
            return this.getPrimitiveTypeSchema(typeName);
        }

        // Prevent infinite recursion for circular references
        if (visited.has(typeName)) {
            return { "$ref": `#/definitions/${typeName}` };
        }

        visited.add(typeName);

        let schema;

        if (typeSchema.isConstant) {
            // Handle constant values
            schema = this.generateConstantSchema(typeSchema);
        } else {
            // Handle regular objects
            schema = this.generateObjectSchema(typeName, typeSchema, definitions, visited);
        }

        visited.delete(typeName);

        // Add to definitions if it's a complex type that might be referenced
        if (!typeSchema.isConstant && Object.keys(typeSchema.params).length > 0) {
            definitions[typeName] = schema;
            return { "$ref": `#/definitions/${typeName}` };
        }

        return schema;
    }

    /**
     * Generates a JSON Schema for primitive types.
     * @param {string} typeName - The primitive type name
     * @returns {Record<string, any>} The JSON Schema object for the primitive type
     */
    getPrimitiveTypeSchema(typeName) {
        switch (typeName) {
            case 'string':
                return { "type": "string" };
            case 'number':
                return { "type": "number" };
            case 'boolean':
                return { "type": "boolean" };
            case 'object':
                return { "type": "object" };
            case 'array':
                return { "type": "array" };
            default:
                return { "type": "string" }; // Default to string for unknown types
        }
    }

    /**
     * Generates a JSON Schema for constant values.
     * @param {SchemaEntry} typeSchema - The type schema definition
     * @returns {Record<string, any>} The JSON Schema object for the constant
     */
    generateConstantSchema(typeSchema) {
        const factory = typeSchema.factory;
        
        if (typeof factory === 'string') {
            return { "type": "string", "const": factory };
        } else if (typeof factory === 'number') {
            return { "type": "number", "const": factory };
        } else if (typeof factory === 'boolean') {
            return { "type": "boolean", "const": factory };
        } else if (typeof factory === 'object') {
            return { "type": "object", "const": factory };
        } else {
            return { "const": factory };
        }
    }

    /**
     * Generates a JSON Schema for object types.
     * @param {string} typeName - The name of the type
     * @param {SchemaEntry} typeSchema - The type schema definition
     * @param {Record<string, any>} definitions - Object to collect type definitions
     * @param {Set} visited - Set to track visited types
     * @returns {Record<string, any>} The JSON Schema object for the object type
     */
    generateObjectSchema(typeName, typeSchema, definitions, visited) {
        const properties = {
            "@": {
                "type": "string",
                "const": typeName
            }
        };

        const required = ["@"];

        // Process each parameter
        for (const [paramName, paramDef] of Object.entries(typeSchema.params)) {
            const [paramType, isMandatory, isArray] = paramDef;
            
            if (isMandatory) {
                required.push(paramName);
            }

            if (isArray) {
                properties[paramName] = {
                    "type": "array",
                    "items": this.generateTypeSchema(paramType, definitions, visited)
                };
            } else {
                properties[paramName] = this.generateTypeSchema(paramType, definitions, visited);
            }
        }

        return {
            "type": "object",
            "properties": properties,
            "required": required,
            "additionalProperties": false
        };
    }
} 