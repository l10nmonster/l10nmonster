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
        this.enableArrays = params?.enableArrays || false;
        this.emitArbAnnotations = params?.emitArbAnnotations || false;
        this.arbAnnotationHandlers = {
            ...defaultArbAnnotationHandlers,
            ...(params?.arbAnnotationHandlers ?? {})
        }
    }

    /**
     * Check if a key is a plural form and extract its components
     * @private
     */
    _parsePluralKey(key) {
        if (key.indexOf('_') === -1) {
            return null;
        }
        const parts = key.split('_');
        const suffix = parts[parts.length - 1];
        if (!validPluralSuffixes.has(suffix)) {
            return null;
        }
        const baseKey = parts.slice(0, -1).join('_');
        return { baseKey, suffix };
    }

    /**
     * Track a plural form in the groups map
     * @private
     */
    _trackPluralForm(pluralizedGroups, baseKey, suffix, data) {
        if (!pluralizedGroups.has(baseKey)) {
            pluralizedGroups.set(baseKey, new Map());
        }
        pluralizedGroups.get(baseKey).set(suffix, data);
    }

    /**
     * Generate missing plural forms from _other form
     * @private
     * @param {Map} pluralizedGroups - Map of baseKey -> Map(suffix -> data)
     * @param {Object} flatResource - The flat resource object to add forms to
     */
    _addMissingPluralForms(pluralizedGroups, flatResource) {
        for (const [baseKey, existingForms] of pluralizedGroups) {
            if (existingForms.has('other')) {
                const otherSid = `${baseKey}_other`;
                const otherValue = flatResource[otherSid];

                for (const suffix of validPluralSuffixes) {
                    if (!existingForms.has(suffix)) {
                        flatResource[`${baseKey}_${suffix}`] = otherValue;
                    }
                }
            }
        }
    }

    /**
     * Collect plural groups from items
     * @private
     * @param {Iterable} items - Items to collect from
     * @param {Function} getSegmentData - Function to extract sid and data from each item
     * @returns {Map} Map of baseKey -> Map(suffix -> data)
     */
    _collectPluralGroups(items, getSegmentData) {
        const pluralizedGroups = new Map();

        for (const item of items) {
            const { sid, data } = getSegmentData(item);
            const pluralInfo = this._parsePluralKey(sid);

            if (pluralInfo) {
                this._trackPluralForm(pluralizedGroups, pluralInfo.baseKey, pluralInfo.suffix, data);
            }
        }

        return pluralizedGroups;
    }

    /**
     * Generate missing plural form segments from _other
     * @private
     * @param {Map} pluralizedGroups - Map of baseKey -> Map(suffix -> data)
     * @param {Function} createSegment - Function(sid, otherData) to create segment object
     * @returns {Array} Array of generated segments
     */
    _generateMissingPluralSegments(pluralizedGroups, createSegment) {
        const generatedSegments = [];

        for (const [baseKey, existingForms] of pluralizedGroups) {
            const otherData = existingForms.get('other');
            if (!otherData) continue;

            for (const suffix of validPluralSuffixes) {
                if (!existingForms.has(suffix)) {
                    const sid = `${baseKey}_${suffix}`;
                    generatedSegments.push(createSegment(sid, otherData));
                }
            }
        }

        return generatedSegments;
    }

    async parseResource({ resource }) {
        const response = { segments: [] };
        if (!resource) return response;

        const unParsedResource = JSON.parse(resource);
        const targetLangs = unParsedResource['@@targetLocales'];
        Array.isArray(targetLangs) && (response.targetLangs = targetLangs);

        const [parsedResource, notes] = parseResourceAnnotations(
            unParsedResource,
            this.enableArbAnnotations,
            this.arbAnnotationHandlers,
        );

        const flatResource = {};

        // Collect existing segments
        for (const [key, value] of parsedResource) {
            flatResource[key] = value;
            const pluralInfo = this._parsePluralKey(key);

            const seg = {
                sid: key,
                str: value,
                ...(notes[key] && { notes: notes[key] }),
                ...(pluralInfo && { isSuffixPluralized: true })
            };

            response.segments.push(seg);
        }

        // Collect and generate missing plural forms
        const pluralizedGroups = this._collectPluralGroups(
            parsedResource,
            ([key, value]) => ({ sid: key, data: { value, notes: notes[key] } })
        );

        this._addMissingPluralForms(pluralizedGroups, flatResource);

        const generatedSegments = this._generateMissingPluralSegments(
            pluralizedGroups,
            (sid, otherData) => ({
                sid,
                str: flatResource[sid],
                isSuffixPluralized: true,
                ...(otherData.notes && { notes: otherData.notes })
            })
        );

        response.segments.push(...generatedSegments);
        return response;
    }

    /**
     * Generate a resource file from segments
     * @param {Object} params
     * @param {Array} params.segments - Array of segment objects with sid, str, etc.
     * @param {Function} params.translator - Translator function(seg) that returns translated string
     * @returns {Promise<string>} JSON string of the generated resource
     */
    async generateResource({ segments, translator }) {
        const segmentsMap = new Map(segments.map(seg => [seg.sid, seg]));

        const pluralizedGroups = this._collectPluralGroups(
            segments.filter(seg => seg.isSuffixPluralized),
            (seg) => ({ sid: seg.sid, data: seg.str })
        );

        const generatedSegments = this._generateMissingPluralSegments(
            pluralizedGroups,
            (sid, otherStr) => ({ sid, str: otherStr, isSuffixPluralized: true })
        );

        generatedSegments.forEach(seg => segmentsMap.set(seg.sid, seg));

        // Translate all segments (original + generated)
        const flatResource = {};
        for (const seg of segmentsMap.values()) {
            const translatedStr = await translator(seg);
            if (translatedStr != null) {
                flatResource[seg.sid] = translatedStr.str;
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
