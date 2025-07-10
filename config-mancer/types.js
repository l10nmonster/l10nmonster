/**
 * @fileoverview Type definitions for ConfigMancer classes
 * These types are used in JSDoc comments to provide more specific type information
 * than the generic 'Object' type.
 */

/**
 * Configuration options for creating a SchemaManager
 * @typedef {Object} SchemaManagerOptions
 * @property {string[]} [packages] - Package names to search for types
 * @property {Record<string, any>} [classes] - Direct class mappings
 * @property {string} [baseUrl] - The base URL for resolving package paths, typically import.meta.url of the caller
 */

/**
 * A single schema entry in the ConfigMancer schema
 * @typedef {Object} SchemaEntry
 * @property {string} superType - The super type of the schema entry
 * @property {Record<string, ParamDefinition>} params - Parameter definitions for the type
 * @property {any} factory - The factory function/class or constant value
 * @property {boolean} isConstant - Whether this is a constant value
 */

/**
 * Parameter definition for a schema entry
 * @typedef {Array} ParamDefinition
 * @property {string} 0 - The parameter type
 * @property {boolean} 1 - Whether the parameter is mandatory
 * @property {boolean} 2 - Whether the parameter is an array
 */

/**
 * The complete ConfigMancer schema
 * @typedef {Record<string, SchemaEntry>} ConfigMancerSchema
 */

/**
 * Additional properties that can be added to objects during revival
 * @typedef {Record<string, any>} AdditionalProperties
 */

export {}; // Make this a module 