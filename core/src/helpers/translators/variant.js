import { L10nContext, utils } from '@l10nmonster/core';

const wordMatcher = /\p{L}+/gu;

export class VariantGenerator {

    /**
     * Translator that replaces words with their dictionary-provided variant
     * @property {Object<string, string>} dict - dictionary of words to replace, where keys are lowercased
     * @property {number} quality - quality for the generated translations
     * @property {string} [baseLang] - language code for the base language (source if not specified)
     */
    #mm;
    #replacedWords;

    /**
     * @param {{dict: Object<string, string>, quality: number, baseLang?: string}} config
     */
    constructor({ dict, quality, baseLang }) {
        if (!dict || quality === undefined) {
            throw 'You must specify dict and quality for VariantGenerator';
        } else {
            this.dict = dict;
            this.quality = quality;
            this.baseLang = baseLang;
        }
    }

    /**
     * Initializes the VariantGenerator by storing the MonsterManager instance
     * @param {import('@l10nmonster/core').MonsterManager} mm
     */
    async init(mm) {
        this.#mm = mm;
    }

    /**
     * Replaces a word with its dictionary-provided variant
     * @param {string} str
     * @returns {string}
     */
    #translateWord(str) {
        const key = str.toLowerCase();
        let variant = this.dict[key];
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

    /**
     * Replaces words in a string with their dictionary-provided variant
     * @param {string} str
     * @returns {string}
     */
    #translateString(str) {
        return str.replace(wordMatcher, word => this.#translateWord(word));
    }

    /**
     * Generates translations for the given job request
     * param {import('@l10nmonster/core').JobRequest} jobRequest
     * returns {Promise<import('@l10nmonster/core').JobResponse>}
     */
    async requestTranslations(jobRequest) {
        let tm;
        if (this.baseLang) {
            tm = this.#mm.tmm.getTM(jobRequest.sourceLang, this.baseLang);
        }
        const { tus, ...jobResponse } = jobRequest;
        const ts = L10nContext.regression ? 1 : new Date().getTime();
        jobResponse.tus = [];
        this.#replacedWords = new Set();
        tus.forEach(tu => {
            let baseTranslation;
            if (this.baseLang) {
                const baseTU = tm.getEntryByGuid(tu.guid);
                baseTranslation = baseTU?.ntgt;
            } else {
                baseTranslation = tu.nsrc;
            }
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
                changed && jobResponse.tus.push({
                    guid: tu.guid,
                    ntgt,
                    q: this.quality,
                    ts,
                });
            }
        });
        jobResponse.status = 'done';
        L10nContext.logger.verbose(`Replaced words for language variant ${jobRequest.targetLang}: ${[...this.#replacedWords].join(', ')}`);
        return jobResponse;
    }

    /**
     * Refreshes the translations for the given job request
     * param {import('@l10nmonster/core').JobRequest} jobRequest
     * returns {Promise<import('@l10nmonster/core').JobResponse>}
     */
    async refreshTranslations(jobRequest) {
        const fullResponse = await this.requestTranslations(jobRequest);
        const reqTuMap = jobRequest.tus.reduce((p,c) => (p[c.guid] = c, p), {});
        return {
            ...fullResponse,
            tus: fullResponse.tus.filter(tu => !utils.normalizedStringsAreEqual(reqTuMap[tu.guid].ntgt, tu.ntgt)),
        };
    }
}
