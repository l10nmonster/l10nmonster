// Intentionally uses `== null` to handle undefined and null
/* eslint-disable no-eq-null, eqeqeq */

// i18next v4 json format defined at https://www.i18next.com/misc/json-format
import { flatten, unflatten } from 'flat';
import { regex } from '@l10nmonster/core';
import { flattenAndSplitResources, ARB_ANNOTATION_MARKER, arbPlaceholderHandler } from './utils.js';

const isArbAnnotations = e => e[0].split('.').some(segment => segment.startsWith(ARB_ANNOTATION_MARKER));
const validPluralSuffixes = new Set(['one', 'other', 'zero', 'two', 'few', 'many']);
const extractArbGroupsRegex = /(?<prefix>.+?\.)?@(?<key>[^.]+)\.(?<attribute>.+)/;
const defaultArbAnnotationHandlers = {
    description: (_, data) => (data == null ? undefined : data),
    placeholders: (_, data) => (data == null ? undefined : arbPlaceholderHandler(data)),
    DEFAULT: (name, data) => (data == null ? undefined : `${name}: ${data}`),
}

/**
 * @function parseResourceAnnotations
 *
 * @description
 * Parse resource annotations according to the given configuration.
 *
 * @param {object} resource - The resource to parse.
 * @param {boolean} enableArbAnnotations - Whether to enable annotations
 * @param {object} arbAnnotationHandlers - An object mapping annotation names to a function which takes an annotation name and its value and returns a string.
 *
 * @returns {array} An array with two elements. The first element is an array of key-value pairs for the translatable segments. The second element is an object with the parsed annotations.
 *
 * @example
 * const resource = {
 *   "key": "value",
 *   "@key": {
 *     "description": "description for key",
 *     "placeholders": {
 *       "placeholder": {
 *         "example": "example for placeholder",
 *         "description": "description for placeholder",
 *       }
 *     }
 *   }
 * };
 * const [segments, notes] = parseResourceAnnotations(resource, true, {
 *   description: (_, data) => (data == null ? undefined : data),
 *   placeholders: (_, data) => (data == null ? undefined : arbPlaceholderHandler(data)),
 *   DEFAULT: (name, data) => (data == null ? undefined : `${name}: ${data}`),
 * });
 * // segments is [["key", "value"]]
 * // notes is { "key": "description for key\nplaceholder: example for placeholder - description for placeholder" }
 */
function parseResourceAnnotations(resource, enableArbAnnotations, arbAnnotationHandlers) {
    if (!enableArbAnnotations) {
        return [ Object.entries(flatten(resource)), {} ]
    }

    const { res, notes } = flattenAndSplitResources([], resource)
    const parsedNotes = {}
    for (const [key, arbAnnotations] of Object.entries(notes)) {
        if (typeof arbAnnotations === "object") {
            const notes = []
            for (const [annotation, data] of Object.entries(arbAnnotations)) {
                const handler = arbAnnotationHandlers[annotation] ?? arbAnnotationHandlers.DEFAULT
                if (handler != null) {
                    const val = handler(annotation, data)
                    if (val !== undefined) {
                        notes.push(val)
                    }
                }
            }
            parsedNotes[key] = notes.join("\n")
        } else {
            parsedNotes[key] = arbAnnotations
        }
    }
    return [ Object.entries(res), parsedNotes ];
}

export class I18nextFilter {
    constructor(params) {
        this.enableArbAnnotations = params?.enableArbAnnotations || false;
        this.enablePluralSuffixes = params?.enablePluralSuffixes || false;
        this.enableArrays = params?.enableArrays || false;
        this.emitArbAnnotations = params?.emitArbAnnotations || false;
        this.arbAnnotationHandlers = {
            ...defaultArbAnnotationHandlers,
            ...(params?.arbAnnotationHandlers ?? {})
        }
    }

    async parseResource({ resource }) {
        const response = {
            segments: []
        }
        if (resource) {
            const unParsedResource = JSON.parse(resource);
            const targetLangs = unParsedResource['@@targetLocales'];
            Array.isArray(targetLangs) && (response.targetLangs = targetLangs);
            const [ parsedResource, notes ] = parseResourceAnnotations(
                unParsedResource,
                this.enableArbAnnotations,
                this.arbAnnotationHandlers,
            );
            for (const [key, value] of parsedResource) {
                let seg = { sid: key, str: value };
                notes[key] && (seg.notes = notes[key]);
                if (this.enablePluralSuffixes && key.indexOf('_') !== -1 && validPluralSuffixes.has(key.split('_').slice(-1)[0])) {
                    seg.isSuffixPluralized = true;
                }
                response.segments.push(seg);
            }
        }
        return response;
    }

    async translateResource({ resource, translator }) {
        let flatResource = flatten(JSON.parse(resource));
        for (const entry of Object.entries(flatResource)) {
            if (!this.enableArbAnnotations || !isArbAnnotations(entry)) {
                const translation = await translator(...entry);
                if (translation === undefined) {
                    delete flatResource[entry[0]];
                } else {
                    flatResource[entry[0]] = translation;
                    // TODO: deal with pluralized forms as well
                }
            }
        }
        if (this.enableArbAnnotations) {
            for (const entry of Object.entries(flatResource).filter(entry => isArbAnnotations(entry))) {
                const [key, value] = entry;
                
                // Always delete if not emitting annotations
                if (!this.emitArbAnnotations) {
                    delete flatResource[key];
                    continue;
                }
                
                // Only keep if regex matches and corresponding translation exists and is not null
                const match = extractArbGroupsRegex.exec(key);
                if (match?.groups) {
                    const { prefix = '', key: arbKey, attribute } = match.groups;
                    const sid = `${prefix}${arbKey}`;
                    if (!Object.prototype.hasOwnProperty.call(flatResource, sid) || flatResource[sid] == null) {
                        delete flatResource[key];
                    }
                } else {
                    // No regex match, can't determine corresponding translation, so delete
                    delete flatResource[key];
                }
            }
        }
        return `${JSON.stringify(unflatten(flatResource, { object: !this.enableArrays }), null, 2)}\n`;
    }
}

// i18next v4 placeholder formats
// - "keyNesting": "reuse $t(keyDeep.inner)", or
// - "keyInterpolate": "replace this {{value}}"
// See: https://www.i18next.com/misc/json-format#i18next-json-v4
export const phDecoder = regex.decoderMaker(
    'i18nextKey',
    /(?<nestingPh>\$t\([\w:.]+\))|(?<doubleBracePh>{{[^}]+}})/g,
    (groups) => ({ t: 'x', v: groups.nestingPh ?? groups.doubleBracePh })
);
