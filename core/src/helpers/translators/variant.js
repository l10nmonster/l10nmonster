import { L10nContext, utils } from '@l10nmonster/core';

const wordMatcher = /\p{L}+/gu;

export class VariantGenerator {
    #mm;
    #replacedWords;

    constructor({ dict, quality, baseLang } = {}) {
        if (!dict || quality === undefined) {
            throw 'You must specify dict and quality for VariantGenerator';
        } else {
            this.dict = dict;
            this.quality = quality;
            this.baseLang = baseLang;
        }
    }

    async init(mm) {
        this.#mm = mm;
    }

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

    #translateString(str) {
        return str.replace(wordMatcher, word => this.#translateWord(word));
    }

    async requestTranslations(jobRequest) {
        let tm;
        if (this.baseLang) {
            tm = await this.#mm.tmm.getTM(jobRequest.sourceLang, this.baseLang);
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

    async refreshTranslations(jobRequest) {
        const fullResponse = await this.requestTranslations(jobRequest);
        const reqTuMap = jobRequest.tus.reduce((p,c) => (p[c.guid] = c, p), {});
        return {
            ...fullResponse,
            tus: fullResponse.tus.filter(tu => !utils.normalizedStringsAreEqual(reqTuMap[tu.guid].ntgt, tu.ntgt)),
        };
    }
}
