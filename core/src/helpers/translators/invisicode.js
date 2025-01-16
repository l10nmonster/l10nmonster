/* eslint-disable no-bitwise */
import { L10nContext, utils } from '@l10nmonster/core';

const base = 0xFE00;
const encoder = new TextEncoder();

function utf8ToFE00Range(input) {
  const utf8Bytes = encoder.encode(input);

  const result = new Array(utf8Bytes.length * 2); // Preallocate the array

  let index = 0;
  for (let byte of utf8Bytes) {
    const highNibble = (byte >> 4) & 0x0F; // Extract high nibble (4 bits)
    const lowNibble = byte & 0x0F;         // Extract low nibble (4 bits)

    result[index++] = String.fromCharCode(base + highNibble);
    result[index++] = String.fromCharCode(base + lowNibble);
  }

  return result.join(''); // Join array into a single string
}

/**
 * @class InvisicodeGenerator
 * @extends {import('@l10nmonster/core').Translator}
 * @description Translator that wraps content in Invisicode
 * @param {{quality: number, lowQ: number, highQ: number, baseLang?: string}} options
 * @property {number} quality - quality for the generated translations
 * @property {number} lowQ - quality threshold below which the translation is considered low quality
 * @property {number} highQ - quality threshold above which the translation is considered high quality
 * @property {string} [baseLang] - language code for the base language (source if not specified)
 * @property {import('@l10nmonster/core').TranslationMemory} #mm - TranslationMemory instance
 */
export class InvisicodeGenerator {
    #mm;

    /**
     * @param {{quality: number, lowQ: number, highQ: number, baseLang?: string}} options
     * @throws {Error} if quality, lowQ or highQ are not specified
     */
    constructor({ quality, lowQ, highQ, baseLang }) {
        if (quality === undefined || lowQ === undefined || highQ === undefined) {
            throw 'You must specify quality, lowQ and highQ for InvisicodeGenerator';
        } else {
            this.quality = quality;
            this.lowQ = lowQ;
            this.highQ = highQ;
            this.baseLang = baseLang;
        }
    }

    /**
     * Initializes the InvisicodeGenerator by storing the MonsterManager instance
     * @param {import('@l10nmonster/core').MonsterManager} mm
     */
    async init(mm) {
        this.#mm = mm;
    }

    /**
     * Generates translations for the given job request
     * @param {import('@l10nmonster/core').JobRequest} jobRequest
     * @returns {Promise<import('@l10nmonster/core').JobResponse>}
     */
    async requestTranslations(jobRequest) {
        let tm;
        if (this.baseLang) {
            tm = await this.#mm.tmm.getTM(jobRequest.sourceLang, this.baseLang);
        }
        const { tus, ...jobResponse } = jobRequest;
        const ts = L10nContext.regression ? 1 : new Date().getTime();
        jobResponse.tus = [];
        tus.forEach(tu => {
            const baseTranslation = this.baseLang ? tm.getEntryByGuid(tu.guid)?.ntgt : tu.nsrc;
            if (baseTranslation) {
                const meta = {
                    g: tu.guid,
                    // eslint-disable-next-line no-nested-ternary
                    q: tu.q <= this.lowQ ? 0 : (tu.q >= this.highQ ? 2 : 1),
                }
                jobResponse.tus.push({
                    guid: tu.guid,
                    ntgt: [ `\u200B${utf8ToFE00Range(JSON.stringify(meta))}`, ...baseTranslation, '\u200B' ],
                    q: this.quality,
                    ts,
                });
            }
        });
        jobResponse.status = 'done';
        return jobResponse;
    }

    /**
     * Refreshes the translations for the given job request
     * @param {import('@l10nmonster/core').JobRequest} jobRequest
     * @returns {Promise<import('@l10nmonster/core').JobResponse>}
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
