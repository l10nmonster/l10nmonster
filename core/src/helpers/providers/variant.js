import { getRegressionMode } from '../../l10nContext.js';
import { BaseTranslationProvider } from './baseTranslationProvider.js';

/**
 * @typedef {import('../../interfaces.js').Job} Job
 * @typedef {import('../../interfaces.js').TU} TU
 */

const wordMatcher = /\p{L}+/gu;

/**
 * Configuration options for initializing a LanguageVariantProvider.
 * @typedef {import('./baseTranslationProvider.js').BaseTranslationProviderOptions & {
 *   baseLang: string,
 *   dict: Object<string, string>
 * }} LanguageVariantProviderOptions
 */

/**
 * @class LanguageVariantProvider
 * @extends BaseTranslationProvider
 * @description This provider generates language variants based on a dictionary file.
 */
export class LanguageVariantProvider extends BaseTranslationProvider {
    #baseLang;
    #dict;
    #replacedWords;

    /**
     * Initializes a new instance of the LanguageVariantProvider class.
     * @param {LanguageVariantProviderOptions} options - The parameters for the constructor.
     */
    constructor({ dict, baseLang, ...options }) {
        super(options);
        if (!baseLang || !dict || options.quality === undefined) {
            throw new Error(`You must specify baseLang, dict and quality for LanguageVariantProvider (${this.id})`);
        }
        this.#dict = dict;
        this.#baseLang = baseLang;
    }

    #translateWord(str) {
        const key = str.toLowerCase();
        let variant = this.#dict[key];
        if (variant) {
            this.#replacedWords.add(variant);
            // dict is assumed to be lowercase
            if (str === str.toUpperCase()) {
                variant = variant.toUpperCase();
            } else if (str.charAt(0) !== key.charAt(0)) { // deal with initial capitalization
                variant = variant.substring(0, 1).toUpperCase() + variant.substring(1);
            }
            return variant;
        }
        return str;
    }

    #translateString(str) {
        return str.replace(wordMatcher, word => this.#translateWord(word));
    }

    /**
     * Gets translated TUs with language variant substitutions.
     * @param {Job} job - The job with TUs.
     * @returns {Promise<Partial<TU>[]>} Translated TUs with variant substitutions.
     */
    async getTranslatedTus(job) {
        let translations;
        if (this.#baseLang !== job.sourceLang) {
            const tm = this.mm.tmm.getTM(job.sourceLang, this.#baseLang);
            translations = await tm.getEntries(job.tus.map(tu => tu.guid));
        }
        const ts = getRegressionMode() ? 1 : new Date().getTime();
        this.#replacedWords = new Set();
        return job.tus.map(tu => {
            const baseTranslation = translations ? translations[tu.guid]?.ntgt : tu.nsrc;
            if (baseTranslation) {
                let changed = false;
                const ntgt = [];
                for (const part of baseTranslation) {
                    if (typeof part === 'string') {
                        const maybeTranslated = this.#translateString(part);
                        maybeTranslated !== part && (changed = true);
                        ntgt.push(maybeTranslated);
                    } else {
                        ntgt.push(part);
                    }
                }
                if (changed) {
                    return {
                        guid: tu.guid,
                        ntgt,
                        q: this.quality,
                        ts,
                    };
                }
            }
            return undefined;
        }).filter(Boolean);
    }
}
