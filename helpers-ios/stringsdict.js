import plist from 'plist';

/**
 * Filter for iOS .stringsdict files (plist format for pluralization).
 * @see https://developer.apple.com/documentation/xcode/localizing-strings-that-contain-plurals
 */
export class StringsdictFilter {

    /**
     * Create a StringsdictFilter.
     * @param {Object} [params] - Configuration options for the filter.
     */
    constructor(params) {
        this.emitComments = params?.emitComments || false;
    }

    /**
     * Parse a stringsdict file and extract translatable segments.
     * @param {Object} params - Parameters for parsing the resource.
     * @param {string} params.resource - The XML/plist content of the stringsdict file.
     * @param {string[]} [params.sourcePluralForms] - Array of plural forms required in source language.
     * @param {string[]} [params.targetPluralForms] - Array of plural forms required for target languages.
     * @returns {Promise<Object>} An object containing the extracted segments.
     */
    async parseResource({ resource, sourcePluralForms, targetPluralForms }) {
        const segments = [];
        const parsedPlist = plist.parse(resource);

        for (const [key, value] of Object.entries(parsedPlist)) {
            if (typeof value !== 'object' || !value.NSStringLocalizedFormatKey) {
                continue;
            }

            const formatKey = value.NSStringLocalizedFormatKey;
            // Extract variable names from format key (e.g., "%#@items@" -> "items")
            const variableMatches = formatKey.matchAll(/%#@(\w+)@/g);

            for (const match of variableMatches) {
                const varName = match[1];
                const varConfig = value[varName];

                if (!varConfig ||
                    varConfig.NSStringFormatSpecTypeKey !== 'NSStringPluralRuleType') {
                    continue;
                }

                // stringsdict NSStringPluralRuleType explicitly defines plural rules
                // Expansion can happen as long as 'other' form is present
                const otherStr = varConfig.other;

                // Add forms in natural plural order (existing or generated from 'other')
                for (const form of targetPluralForms) {
                    const str = varConfig[form] ?? otherStr;
                    if (str !== undefined) {
                        segments.push({
                            sid: `${key}/${varName}_${form}`,
                            pluralForm: form,
                            str,
                        });
                    }
                }
            }
        }

        return { segments };
    }

    /**
     * Translate a stringsdict file using the provided translator function.
     * @param {Object} params - Parameters for translating the resource.
     * @param {string} params.resource - The XML/plist content of the stringsdict file.
     * @param {Function} params.translator - A function that translates a string given its ID and source text.
     * @param {string[]} [params.sourcePluralForms] - Array of plural forms in the source language.
     * @param {string[]} [params.targetPluralForms] - Array of plural forms required for the target language.
     * @returns {Promise<string|null>} The translated stringsdict content, or null if no translations were made.
     */
    async translateResource({ resource, translator, sourcePluralForms, targetPluralForms }) {
        const parsedPlist = plist.parse(resource);

        const translatedPlist = {};
        let translated = 0;

        for (const [key, value] of Object.entries(parsedPlist)) {
            if (typeof value !== 'object' || !value.NSStringLocalizedFormatKey) {
                continue;
            }

            const formatKey = value.NSStringLocalizedFormatKey;
            const variableMatches = [...formatKey.matchAll(/%#@(\w+)@/g)];

            const translatedEntry = {
                NSStringLocalizedFormatKey: formatKey,
            };

            let entryHasTranslations = true;

            for (const match of variableMatches) {
                const varName = match[1];
                const varConfig = value[varName];

                if (!varConfig ||
                    varConfig.NSStringFormatSpecTypeKey !== 'NSStringPluralRuleType') {
                    continue;
                }

                const translatedVarConfig = {
                    NSStringFormatSpecTypeKey: varConfig.NSStringFormatSpecTypeKey,
                    NSStringFormatValueTypeKey: varConfig.NSStringFormatValueTypeKey || 'd',
                };

                // stringsdict NSStringPluralRuleType explicitly defines plural rules
                // Expansion can happen as long as 'other' form is present
                const otherStr = varConfig.other;

                // Translate each required target form in CLDR order
                for (const form of targetPluralForms) {
                    const sourceText = varConfig[form] ?? otherStr;
                    if (sourceText === undefined) {
                        // Can't generate this required form - no source and no fallback
                        entryHasTranslations = false;
                        break;
                    }
                    const translation = await translator(`${key}/${varName}_${form}`, sourceText);
                    if (translation === undefined) {
                        entryHasTranslations = false;
                        break;
                    }
                    translatedVarConfig[form] = translation;
                }

                if (!entryHasTranslations) break;

                translatedEntry[varName] = translatedVarConfig;
            }

            if (entryHasTranslations && variableMatches.length > 0) {
                translatedPlist[key] = translatedEntry;
                translated++;
            }
        }

        if (translated === 0) {
            return null;
        }

        return plist.build(translatedPlist);
    }
}
