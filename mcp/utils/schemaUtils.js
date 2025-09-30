import { z } from 'zod';

/**
 * Converts CLI help definition to Zod schema for MCP tool validation
 * @param {Object} help - CLI help object with arguments and options
 * @returns {z.ZodObject} Zod schema for the action parameters
 */
export function cliToZodSchema(help) {
    const fields = {};
    
    // Convert CLI arguments to required/optional fields based on <> vs []
    if (help.arguments) {
        help.arguments.forEach(([argSpec, description, choices]) => {
            const match = argSpec.match(/<(\w+)>|\[(\w+)\]/);
            if (match) {
                const name = match[1] || match[2];
                const isRequired = !!match[1]; // <arg> is required, [arg] is optional
                
                let field;
                if (choices && Array.isArray(choices)) {
                    field = z.enum(choices);
                } else {
                    field = z.string();
                }
                
                field = field.describe(description);
                fields[name] = isRequired ? field : field.optional();
            }
        });
    }
    
    // Convert CLI required options to required fields
    if (help.requiredOptions) {
        help.requiredOptions.forEach(([optionSpec, description, choices]) => {
            const match = optionSpec.match(/(?:-[a-zA-Z],?\s*)?--([\w-]+)(?:\s*<([^>]+)>)?/);
            if (match) {
                const [, rawName, type] = match;
                // Convert hyphenated names to camelCase (job-guid -> jobGuid)
                const name = rawName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
                
                let field;
                if (choices && Array.isArray(choices)) {
                    field = z.enum(choices);
                } else if (type) {
                    // Parse type hints from CLI help
                    if (/(^|[^a-z])num(ber)?([^a-z]|$)/i.test(type)) {
                        field = z.number();
                    } else if (/[,\.]{3}/.test(type) || /,/.test(type)) {
                        // treat comma- or ellipsis-marked multi-values as string for now
                        field = z.string();
                    } else {
                        field = z.string();
                    }
                } else {
                    // Flag without value (like --detailed)
                    field = z.boolean();
                }
                
                fields[name] = field.describe(description); // Required field
            }
        });
    }
    
    // Convert CLI options to optional fields
    if (help.options) {
        help.options.forEach(([optionSpec, description, choices]) => {
            // Parse option patterns like:
            // --query <text>
            // -l, --lang <language>  
            // --detailed
            // --port <number>
            const match = optionSpec.match(/(?:-[a-zA-Z],?\s*)?--([\w-]+)(?:\s*<([^>]+)>)?/);
            if (match) {
                const [, rawName, type] = match;
                // Convert hyphenated names to camelCase (job-guid -> jobGuid)
                const name = rawName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
                
                let field;
                if (choices && Array.isArray(choices)) {
                    field = z.enum(choices);
                } else if (type) {
                    // Parse type hints from CLI help
                    if (/(^|[^a-z])num(ber)?([^a-z]|$)/i.test(type)) {
                        field = z.number();
                    } else if (/[,\.]{3}/.test(type) || /,/.test(type)) {
                        // treat comma- or ellipsis-marked multi-values as string for now
                        field = z.string();
                    } else {
                        field = z.string();
                    }
                } else {
                    // Flag without value (like --detailed)
                    field = z.boolean();
                }
                
                fields[name] = field.describe(description).optional();
            }
        });
    }
    
    return z.object(fields);
}

/**
 * Validates CLI arguments against the generated schema
 * @param {Object} help - CLI help object
 * @param {Object} args - Arguments to validate
 * @returns {Object} Validated arguments
 * @throws {z.ZodError} If validation fails
 */
export function validateArgs(help, args) {
    const schema = cliToZodSchema(help);
    return schema.parse(args);
}
