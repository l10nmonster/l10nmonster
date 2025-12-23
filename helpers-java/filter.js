import { parseToEntries, stringifyFromEntries } from '@js.properties/properties';

/** @typedef {import('@l10nmonster/core').ResourceFilter} ResourceFilter */

/**
 * Filter for Java .properties files.
 * @implements {ResourceFilter}
 */
export default class JavaPropertiesFilter {

    /**
     * @param {Object} [params] - Configuration options
     * @param {boolean} [params.enablePluralizationSuffixes=false] - Enable detection of plural forms via key suffixes (_one, _other, etc.)
     */
    constructor(params) {
        this.enablePluralizationSuffixes = params?.enablePluralizationSuffixes || false;
    }

    async parseResource({ resource, sourcePluralForms, targetPluralForms }) {
        const parsedResource = parseToEntries(resource, { sep: true, eol: true, all: true, original: true, location: true });
        const segments = [];
        let previousComments = [];

        // First pass: collect all segments
        for (const e of parsedResource) {
            if (e.key && e.sep.trim() === '=') {
                const location = {startLine: e.location.start.line, endLine: e.location.end.line}
                const seg = {
                    sid: e.key,
                    str: e.element,
                    location
                };

                if (previousComments.length > 0) {
                    const notes = previousComments.join('\n');
                    if (notes.indexOf('DO_NOT_TRANSLATE') === -1) {
                        segments.push({
                            ...seg,
                            notes,
                        });
                    }
                    previousComments = [];
                } else {
                    segments.push(seg);
                }
            } else {
                e.original.trim().length > 0 && previousComments.push(e.original);
            }
        }

        // Second pass: detect and mark plural forms (only if enabled)
        if (this.enablePluralizationSuffixes) {
            const targetFormsSet = new Set(targetPluralForms);
            const potentialPluralGroups = new Map(); // baseKey -> Map(suffix -> segment)

            for (const seg of segments) {
                const underscoreIdx = seg.sid.lastIndexOf('_');
                if (underscoreIdx !== -1) {
                    const suffix = seg.sid.slice(underscoreIdx + 1);
                    if (targetFormsSet.has(suffix)) {
                        const baseKey = seg.sid.slice(0, underscoreIdx);
                        if (!potentialPluralGroups.has(baseKey)) {
                            potentialPluralGroups.set(baseKey, new Map());
                        }
                        potentialPluralGroups.get(baseKey).set(suffix, seg);
                    }
                }
            }

            // For groups with all required source forms: set pluralForm and generate missing forms
            // We need to reorder segments so all forms of a plural group are together in CLDR order
            const pluralGroupsToReorder = new Map(); // baseKey -> forms Map

            for (const [baseKey, forms] of potentialPluralGroups) {
                const hasAllForms = sourcePluralForms.every(form => forms.has(form));
                if (!hasAllForms) continue;

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
                            ...(other.notes && { notes: other.notes }),
                            ...(other.location && { location: other.location })
                        });
                    }
                }

                pluralGroupsToReorder.set(baseKey, forms);
            }

            // Rebuild segments with plural groups in correct order
            if (pluralGroupsToReorder.size > 0) {
                const newSegments = [];
                const processedPluralKeys = new Set();

                for (const seg of segments) {
                    const underscoreIdx = seg.sid.lastIndexOf('_');
                    const suffix = underscoreIdx !== -1 ? seg.sid.slice(underscoreIdx + 1) : null;
                    const baseKey = underscoreIdx !== -1 ? seg.sid.slice(0, underscoreIdx) : null;

                    if (baseKey && pluralGroupsToReorder.has(baseKey) && !processedPluralKeys.has(baseKey)) {
                        // Insert all forms of this plural group in CLDR order
                        processedPluralKeys.add(baseKey);
                        const forms = pluralGroupsToReorder.get(baseKey);
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

                return { segments: newSegments };
            }
        }

        return {
            segments,
        };
    }

    async translateResource({ resource, translator, sourcePluralForms, targetPluralForms }) {
        const parsedResource = parseToEntries(resource, { sep: true, eol: true, all: true, original: true });
        const translatedEntries = [];

        if (this.enablePluralizationSuffixes) {
            const targetFormsSet = new Set(targetPluralForms);

            // First pass: identify plural groups and collect entries
            const potentialPluralGroups = new Map(); // baseKey -> Map(suffix -> entry)

            for (const entry of parsedResource) {
                if (entry.key) {
                    const underscoreIdx = entry.key.lastIndexOf('_');
                    if (underscoreIdx !== -1) {
                        const suffix = entry.key.slice(underscoreIdx + 1);
                        if (targetFormsSet.has(suffix)) {
                            const baseKey = entry.key.slice(0, underscoreIdx);
                            if (!potentialPluralGroups.has(baseKey)) {
                                potentialPluralGroups.set(baseKey, new Map());
                            }
                            potentialPluralGroups.get(baseKey).set(suffix, entry);
                        }
                    }
                }
            }

            // Identify valid plural groups (those with all required source forms)
            const validPluralBaseKeys = new Set();
            for (const [baseKey, forms] of potentialPluralGroups) {
                const hasAllForms = sourcePluralForms.every(form => forms.has(form));
                if (hasAllForms) {
                    validPluralBaseKeys.add(baseKey);
                }
            }

            // Second pass: translate entries and handle plurals
            const processedPluralGroups = new Set();

            for (const entry of parsedResource) {
                if (entry.key) {
                    const underscoreIdx = entry.key.lastIndexOf('_');
                    const suffix = underscoreIdx !== -1 ? entry.key.slice(underscoreIdx + 1) : null;
                    const baseKey = underscoreIdx !== -1 ? entry.key.slice(0, underscoreIdx) : null;

                    // Check if this is part of a valid plural group
                    if (baseKey && validPluralBaseKeys.has(baseKey) && targetFormsSet.has(suffix)) {
                        // Skip if we already processed this plural group
                        if (processedPluralGroups.has(baseKey)) {
                            continue;
                        }
                        processedPluralGroups.add(baseKey);

                        // Get the _other form as template for generating missing forms
                        const otherEntry = potentialPluralGroups.get(baseKey).get('other');
                        const templateEntry = otherEntry || entry;

                        // Generate all required target forms
                        for (const targetSuffix of targetPluralForms) {
                            const targetKey = `${baseKey}_${targetSuffix}`;
                            const sourceEntry = potentialPluralGroups.get(baseKey).get(targetSuffix) || otherEntry;

                            if (sourceEntry) {
                                const translation = await translator(targetKey, sourceEntry.element);
                                if (translation !== undefined) {
                                    // eslint-disable-next-line no-unused-vars
                                    const { original, element, key, ...rest } = templateEntry;
                                    translatedEntries.push({
                                        ...rest,
                                        key: targetKey,
                                        element: translation,
                                    });
                                }
                            }
                        }
                    } else {
                        // Regular (non-plural) entry
                        const translation = await translator(entry.key, entry.element);
                        if (translation !== undefined) {
                            // eslint-disable-next-line no-unused-vars
                            const { original, element, ...rest } = entry;
                            translatedEntries.push({
                                ...rest,
                                element: translation,
                            });
                        }
                    }
                }
            }
        } else {
            // Simple translation without plural handling
            for (const entry of parsedResource) {
                if (entry.key) {
                    const translation = await translator(entry.key, entry.element);
                    if (translation !== undefined) {
                        // eslint-disable-next-line no-unused-vars
                        const { original, element, ...rest } = entry;
                        translatedEntries.push({
                            ...rest,
                            element: translation,
                        });
                    }
                }
            }
        }
        return stringifyFromEntries(translatedEntries);
    }
}
