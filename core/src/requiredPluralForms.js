import { pluralForms } from './pluralForms.js';

const ALL_PLURAL_FORMS = ['zero', 'one', 'two', 'few', 'many', 'other'];

/**
 * Get the superset of required plural forms for a list of languages.
 * @param {string[]} [langs] - Array of language codes (e.g., ['en', 'ar', 'ru']).
 *   If empty or undefined, returns all 6 plural forms.
 * @returns {string[]} Array of required plural forms (e.g., ['one', 'other'] or ['zero', 'one', 'two', 'few', 'many', 'other'])
 */
export function requiredPluralForms(langs) {
    if (!langs || langs.length === 0) {
        return ALL_PLURAL_FORMS;
    }

    const formsSet = new Set();
    for (const lang of langs) {
        const langFamily = lang.split('-')[0].split('_')[0];
        const forms = pluralForms[langFamily] ?? pluralForms[lang] ?? ALL_PLURAL_FORMS;
        for (const form of forms) {
            formsSet.add(form);
        }
    }

    // Return in canonical order
    return ALL_PLURAL_FORMS.filter(form => formsSet.has(form));
}
