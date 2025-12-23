// Intentionally uses `== null` to handle undefined and null
/* eslint-disable no-eq-null, eqeqeq */

// i18next v4 json format defined at https://www.i18next.com/misc/json-format
import { unflatten } from 'flat';
import { regex } from '@l10nmonster/core';
import {
    arbPlaceholderHandler,
    parseResourceAnnotations,
} from './utils.js';

/** @typedef {import('@l10nmonster/core').ResourceFilter} ResourceFilter */

const defaultArbAnnotationHandlers = {
    description: (_, data) => (data == null ? undefined : data),
    placeholders: (_, data) => (data == null ? undefined : arbPlaceholderHandler(data)),
    DEFAULT: (name, data) => (data == null ? undefined : `${name}: ${data}`),
}

/**
 * Filter for i18next v4 JSON format.
 * @see https://www.i18next.com/misc/json-format
 * @implements {ResourceFilter}
 */
export class I18nextFilter {

    /**
     * @param {Object} [params] - Configuration options
     * @param {boolean} [params.enableArbAnnotations=false] - Enable parsing of ARB-style annotations (@key objects)
     * @param {boolean} [params.enableArrays=false] - Enable array syntax in generated output (vs object notation)
     * @param {boolean} [params.emitArbAnnotations=false] - Emit ARB annotations in generated output
     * @param {Object} [params.arbAnnotationHandlers] - Custom handlers for ARB annotation types.
     *   Each handler is a function(name, data) returning a string or undefined.
     *   Built-in handlers: description, placeholders, DEFAULT.
     */
    constructor(params) {
        this.enableArbAnnotations = params?.enableArbAnnotations || false;
        this.enableArrays = params?.enableArrays || false;
        this.emitArbAnnotations = params?.emitArbAnnotations || false;
        this.arbAnnotationHandlers = {
            ...defaultArbAnnotationHandlers,
            ...(params?.arbAnnotationHandlers ?? {})
        };
    }

    async parseResource({ resource, sourcePluralForms, targetPluralForms }) {
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

        const targetFormsSet = new Set(targetPluralForms);

        // Collect all segments and group potential plurals by baseKey
        const potentialPluralGroups = new Map(); // baseKey -> Map(suffix -> segment)

        for (const [key, value] of parsedResource) {
            const seg = {
                sid: key,
                str: value,
                ...(notes[key] && { notes: notes[key] }),
            };
            response.segments.push(seg);

            // Check if key is a plural form (e.g., "key_one", "key_other")
            const underscoreIdx = key.lastIndexOf('_');
            if (underscoreIdx !== -1) {
                const suffix = key.slice(underscoreIdx + 1);
                if (targetFormsSet.has(suffix)) {
                    const baseKey = key.slice(0, underscoreIdx);
                    if (!potentialPluralGroups.has(baseKey)) {
                        potentialPluralGroups.set(baseKey, new Map());
                    }
                    potentialPluralGroups.get(baseKey).set(suffix, seg);
                }
            }
        }

        // For groups with all required forms: set pluralForm and generate missing forms
        // We need to reorder segments so all forms of a plural group are together in CLDR order
        const pluralGroupsToReorder = new Map(); // baseKey -> { firstIndex, forms: Map(suffix -> seg) }

        for (const [baseKey, forms] of potentialPluralGroups) {
            const hasAllForms = sourcePluralForms.every(form => forms.has(form));
            if (!hasAllForms) continue;

            // Find the first index of this plural group in segments
            let firstIndex = -1;
            for (let i = 0; i < response.segments.length; i++) {
                if (forms.has(response.segments[i].sid?.split('_').pop()) &&
                    response.segments[i].sid?.startsWith(`${baseKey}_`)) {
                    firstIndex = i;
                    break;
                }
            }

            // Set pluralForm on existing segments
            for (const [suffix, seg] of forms) {
                seg.pluralForm = suffix;
            }

            // Generate missing forms from _other
            const other = forms.get('other');
            for (const suffix of targetPluralForms) {
                if (!forms.has(suffix)) {
                    forms.set(suffix, {
                        sid: `${baseKey}_${suffix}`,
                        str: other.str,
                        pluralForm: suffix,
                        ...(other.notes && { notes: other.notes })
                    });
                }
            }

            pluralGroupsToReorder.set(baseKey, { firstIndex, forms });
        }

        // Rebuild segments with plural groups in correct order
        if (pluralGroupsToReorder.size > 0) {
            const newSegments = [];
            const processedPluralKeys = new Set();

            for (const seg of response.segments) {
                const underscoreIdx = seg.sid.lastIndexOf('_');
                const suffix = underscoreIdx !== -1 ? seg.sid.slice(underscoreIdx + 1) : null;
                const baseKey = underscoreIdx !== -1 ? seg.sid.slice(0, underscoreIdx) : null;

                if (baseKey && pluralGroupsToReorder.has(baseKey) && !processedPluralKeys.has(baseKey)) {
                    // Insert all forms of this plural group in CLDR order
                    processedPluralKeys.add(baseKey);
                    const { forms } = pluralGroupsToReorder.get(baseKey);
                    for (const form of targetPluralForms) {
                        if (forms.has(form)) {
                            newSegments.push(forms.get(form));
                        }
                    }
                } else if (!baseKey || !pluralGroupsToReorder.has(baseKey)) {
                    // Non-plural segment
                    newSegments.push(seg);
                }
                // Skip plural segments that were already added via the group
            }

            response.segments = newSegments;
        }

        return response;
    }

    /**
     * Generate a resource file from segments
     * @param {Object} params
     * @param {Array} params.segments - Array of segment objects with sid, str, etc.
     * @param {Function} params.translator - Translator function(seg) that returns translated string
     * @param {Array} [params.targetPluralForms] - Array of plural forms required for target language
     * @returns {Promise<string>} JSON string of the generated resource
     */
    async generateResource({ segments, translator, targetPluralForms }) {
        const targetFormsSet = targetPluralForms ? new Set(targetPluralForms) : null;

        // Collect translations
        const translations = new Map(); // sid -> translatedStr
        const pluralGroups = new Map(); // baseKey -> Set of sids

        for (const seg of segments) {
            // Skip plural forms not needed for target language
            if (seg.pluralForm && targetFormsSet && !targetFormsSet.has(seg.pluralForm)) {
                continue;
            }
            const translatedStr = await translator(seg);
            if (translatedStr != null) {
                translations.set(seg.sid, translatedStr.str);

                // Track plural groups
                if (seg.pluralForm) {
                    const underscoreIdx = seg.sid.lastIndexOf('_');
                    if (underscoreIdx !== -1) {
                        const baseKey = seg.sid.slice(0, underscoreIdx);
                        if (!pluralGroups.has(baseKey)) {
                            pluralGroups.set(baseKey, new Set());
                        }
                        pluralGroups.get(baseKey).add(seg.sid);
                    }
                }
            }
        }

        // Build flatResource with plural forms grouped and ordered
        const flatResource = {};
        const processedPluralKeys = new Set();

        for (const seg of segments) {
            if (!translations.has(seg.sid)) continue;

            if (seg.pluralForm) {
                const underscoreIdx = seg.sid.lastIndexOf('_');
                const baseKey = underscoreIdx !== -1 ? seg.sid.slice(0, underscoreIdx) : null;

                if (baseKey && pluralGroups.has(baseKey) && !processedPluralKeys.has(baseKey)) {
                    // Output all forms of this plural group in CLDR order
                    processedPluralKeys.add(baseKey);
                    for (const form of targetPluralForms) {
                        const sid = `${baseKey}_${form}`;
                        if (translations.has(sid)) {
                            flatResource[sid] = translations.get(sid);
                        }
                    }
                }
                // Skip individual plural forms - they were added via the group
            } else {
                flatResource[seg.sid] = translations.get(seg.sid);
            }
        }

        return `${JSON.stringify(unflatten(flatResource, { object: !this.enableArrays }), null, 2)}\n`;
    }
}

// i18next v4 placeholder formats
// - "keyNesting": "reuse $t(keyDeep.inner)", or
// - "keyInterpolate": "replace this {{value}}"
// See: https://www.i18next.com/misc/json-format#i18next-json-v4
/** @type {import('@l10nmonster/core').DecoderFunction} */
export const phDecoder = regex.decoderMaker(
    'i18nextKey',
    /(?<nestingPh>\$t\([\w:.]+\))|(?<doubleBracePh>{{[^}]+}})/g,
    (groups) => ({ t: 'x', v: groups.nestingPh ?? groups.doubleBracePh })
);
