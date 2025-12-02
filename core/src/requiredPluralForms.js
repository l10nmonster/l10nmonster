import { pluralForms } from './pluralForms.js';

/**
 * All possible plural forms in CLDR canonical order.
 * @private
 */
const ALL_PLURAL_FORMS = ['zero', 'one', 'two', 'few', 'many', 'other'];

/**
 * Default plural forms for unrecognized languages.
 * @private
 */
const DEFAULT_PLURAL_FORMS = ['one', 'other'];

/**
 * Get the required plural forms for a source language.
 * @param {string} [lang] - Source language code (e.g., 'en', 'ar').
 *   If undefined, returns default plural forms ['one', 'other'].
 *   If language is not in CLDR, returns default plural forms.
 * @returns {string[]} Array of required plural forms for the source language.
 */
export function requiredSourcePluralForms(lang) {
    if (!lang) {
        return DEFAULT_PLURAL_FORMS;
    }
    const langFamily = lang.split('-')[0].split('_')[0];
    return pluralForms[langFamily] ?? pluralForms[lang] ?? DEFAULT_PLURAL_FORMS;
}

/**
 * Get the superset of required plural forms for target languages.
 * @param {string[]} [langs] - Array of target language codes (e.g., ['ar', 'ru']).
 *   If empty or undefined, returns all 6 plural forms (to be safe for any target).
 *   If a language is not in CLDR, its forms default to ['one', 'other'].
 * @returns {string[]} Array of required plural forms in CLDR canonical order.
 */
export function requiredTargetPluralForms(langs) {
    if (!langs || langs.length === 0) {
        return ALL_PLURAL_FORMS;
    }

    const formsSet = new Set();
    for (const lang of langs) {
        const langFamily = lang.split('-')[0].split('_')[0];
        const forms = pluralForms[langFamily] ?? pluralForms[lang] ?? DEFAULT_PLURAL_FORMS;
        for (const form of forms) {
            formsSet.add(form);
        }
    }

    // Return in canonical order
    return ALL_PLURAL_FORMS.filter(form => formsSet.has(form));
}
