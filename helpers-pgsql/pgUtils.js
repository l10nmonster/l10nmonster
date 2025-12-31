/**
 * PostgreSQL utilities for DAL operations.
 */

/**
 * Flattens a normalized source to a string for indexing.
 * Converts placeholders to {{type}} format.
 * @param {Array} nsrc - Normalized source array
 * @returns {string|null} Flattened string or null if invalid
 */
export function flattenNormalizedSourceToOrdinal(nsrc) {
    if (nsrc === null || nsrc === undefined) return null;
    if (!Array.isArray(nsrc)) return null;
    return nsrc.map(e => (typeof e === 'string' ? e : `{{${e.t}}}`)).join('');
}

/**
 * Creates a SQL object transformer for encoding/decoding JSON columns.
 * @param {string[]} jsonProps - Properties to JSON encode/decode
 * @param {string[]} spreadingProps - Properties to spread when decoding
 * @returns {{encode: Function, decode: Function}}
 */
export function createSQLObjectTransformer(jsonProps, spreadingProps = []) {
    return {

        /**
         * Encodes object properties to JSON strings for database storage.
         * @param {Object} obj - Object to encode
         * @returns {Object} Encoded object
         */
        encode(obj) {
            const result = { ...obj };
            for (const key of jsonProps) {
                if (Object.hasOwn(result, key) && typeof result[key] === 'object' && result[key] !== null) {
                    result[key] = JSON.stringify(result[key]);
                }
            }
            return result;
        },

        /**
         * Decodes JSON strings back to objects from database rows.
         * @param {Object} obj - Row object from database
         * @returns {Object} Decoded object
         */
        decode(obj) {
            const result = { ...obj };
            Object.entries(result).forEach(([key, value]) => {
                if (value === null) {
                    delete result[key];
                } else {
                    if (jsonProps.includes(key)) {
                        try {
                            // PostgreSQL returns JSONB as objects, but TEXT columns need parsing
                            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
                            if (spreadingProps.includes(key) && typeof parsed === 'object') {
                                delete result[key];
                                Object.assign(result, parsed);
                            } else {
                                result[key] = parsed;
                            }
                        } catch (e) {
                            throw new Error(`Failed to parse JSON for key ${key}: ${result[key]} -- ${e.message}`);
                        }
                    }
                }
            });
            return result;
        }
    };
}

/**
 * Sanitizes a table name to prevent SQL injection.
 * Replaces all non-alphanumeric characters (except underscore) with underscores.
 * @param {string} name - Raw table name
 * @returns {string} Sanitized table name
 */
export function sanitizeTableName(name) {
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Converts camelCase to snake_case for PostgreSQL column naming convention.
 * @param {string} str - camelCase string
 * @returns {string} snake_case string
 */
export function toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Converts snake_case to camelCase for JavaScript object properties.
 * @param {string} str - snake_case string
 * @returns {string} camelCase string
 */
export function toCamelCase(str) {
    return str.replace(/_(?<letter>[a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Converts all snake_case keys in an object to camelCase.
 * @param {Object} obj - Object with snake_case keys
 * @returns {Object} Object with camelCase keys
 */
export function rowToCamelCase(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        result[toCamelCase(key)] = value;
    }
    return result;
}

/**
 * Converts all camelCase keys in an object to snake_case for database insertion.
 * @param {Object} obj - Object with camelCase keys
 * @returns {Object} Object with snake_case keys
 */
export function rowToSnakeCase(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        result[toSnakeCase(key)] = value;
    }
    return result;
}

/**
 * Builds a parameterized INSERT statement.
 * @param {string} tableName - Table name
 * @param {string[]} columns - Column names
 * @returns {{sql: string, paramCount: number}}
 */
export function buildInsertSQL(tableName, columns) {
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    return { sql, paramCount: columns.length };
}

/**
 * Builds a parameterized UPSERT (INSERT ... ON CONFLICT) statement.
 * @param {string} tableName - Table name
 * @param {string[]} columns - All column names
 * @param {string[]} conflictColumns - Columns for ON CONFLICT clause
 * @param {string[]} updateColumns - Columns to update on conflict
 * @returns {{sql: string, paramCount: number}}
 */
export function buildUpsertSQL(tableName, columns, conflictColumns, updateColumns) {
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const updateClause = updateColumns.map(col => `${col} = EXCLUDED.${col}`).join(', ');
    const sql = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (${conflictColumns.join(', ')})
        DO UPDATE SET ${updateClause}
    `;
    return { sql, paramCount: columns.length };
}
