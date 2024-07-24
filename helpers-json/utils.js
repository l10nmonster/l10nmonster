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
        if (key.startsWith(ARB_ANNOTATION_MARKER)) {
            const k = keys.slice().concat(key.slice(1))
            acc.notes[k.join(FLATTEN_SEPARATOR)] = value
        } else if (typeof value === "object") {
            const { res, notes } = flattenAndSplitResources([...keys, key], value)
            Object.assign(acc.res, res)
            Object.assign(acc.notes, notes)
        } else {
            const k = keys.slice().concat(key)
            acc.res[k.join(FLATTEN_SEPARATOR)] = value
        }
        return acc
  }, { res: {}, notes: {} })
}

module.exports = {
    ARB_ANNOTATION_MARKER,
    FLATTEN_SEPARATOR,
    flattenAndSplitResources
}