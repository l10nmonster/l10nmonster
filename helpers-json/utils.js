const ARB_ANNOTATION_MARKER = "@";
const FLATTEN_SEPARATOR = ".";

/**
 * Recursively flatten the resources object while splitting it into resources and notes
 * Keys that start with the ARB annotation marker are separated into notes
 *
 * @param {string[]} keys Stack of keys seen. Used to create a flattened key
 * @param {object} resource Object to parse
 * @returns {{resource: object, notes: object}}
 *
 * ```
 * const obj = {
 *   str: "string",
 *   "@str": {
 *     description: "string",
 *   },
 *   ns1: {
 *     str: "string, {{foo}}",
 *     "@str": {
 *       description: "string",
 *       placeholders: { foo: { example: "foo example", description: "foo description" } }
 *     },
 *     ns2: {
 *       str: "string",
 *       "@str": {
 *         description: "string",
 *       },
 *     }
 *   }
 * }
 * const {res, notes} = flattenAndSplitResources([], obj)
 * assert(
 *   JSON.stringify(res) === JSON.stringify({
 *     str: 'string',
 *     'ns1.str': 'string, {{foo}}',
 *     'ns1.ns2.str': 'string'
 *   })
 * )
 * assert(
 *   JSON.stringify(notes) === JSON.stringify({
 *     str: {
 *       description: 'string'
 *     },
 *     'ns1.str': {
 *       description: 'string',
 *       placeholders: {
 *         foo: {
 *           example: "foo example",
 *           description: "foo description"
 *         }
 *       }
 *     },
 *     'ns1.ns2.str': {
 *       description: 'string'
 *     }
 *   })
 * )
 * ```
 */
function flattenAndSplitResources(keys, obj) {
    return Object.entries(obj).reduce((acc, [key, value]) => {
        if (typeof value === "object" && key.startsWith(ARB_ANNOTATION_MARKER)) {
            // If the key is `@key` and the value is an object, it is likely an ARB annotation.
            // Put it in the `notes` object.
            const k = keys.slice().concat(key.slice(1))
            acc.notes[k.join(FLATTEN_SEPARATOR)] = value
        } else if (typeof value === "object") {
            // If the key is _not_ `@key` and the value is an object, it is a namespace.
            // Recursively flatten and split the value.
            const { res, notes } = flattenAndSplitResources([...keys, key], value)
            Object.assign(acc.res, res)
            Object.assign(acc.notes, notes)
        } else {
            // If the value is _not_ an object, it is a key-value pair of resources.
            // Put it in the `res` object.
            const k = keys.concat(key)
            acc.res[k.join(FLATTEN_SEPARATOR)] = value
        }
        return acc
  }, { res: {}, notes: {} })
}

/**
 * Accepts ARB placeholders and returns them in PH() format
 *
 * ```
 * const placeholders = {
 *   count: {
 *     example: "1",
 *     description: "number of tickets"
 *   }
 * }
 * const ph = arbPlaceholderHandler(placeholders)
 * assert(ph === "PH(count|1|number of tickets")
 * ```
 *
 * @param {{ [key: string]: value }} ARB placeholders
 * @returns {string} placeholders formatted in PH() and separated by "\n"
 */
function arbPlaceholderHandler(placeholders) {
    const phs = []
    for (const [key, val] of Object.entries(placeholders)) {
        phs.push(`PH({{${key}}}|${val.example}|${val.description})`)
    }
    return phs.join("\n")
}

module.exports = {
    ARB_ANNOTATION_MARKER,
    FLATTEN_SEPARATOR,
    flattenAndSplitResources,
    arbPlaceholderHandler,
}