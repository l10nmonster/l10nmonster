import { L10nContext } from '@l10nmonster/core';
import { BaseTranslationProvider } from './baseTranslationProvider.js';

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
 * Configuration options for initializing a InvisicodeProvider.
 * @typedef {Object} InvisicodeProviderOptions
 * @extends BaseTranslationProviderOptions
 * @property {number} lowQ - quality threshold below which the translation is considered low quality
 * @property {number} highQ - quality threshold above which the translation is considered high quality
 * @property {string} [baseLang] - language code for the base language (source if not specified)
 * @property {boolean} [fallback] - if true, fall back to source if translation is missing
 */

/**
 * @class InvisicodeProvider
 * @extends BaseTranslationProvider
 * @description Translator that wraps content in Invisicode
 */
export class InvisicodeProvider extends BaseTranslationProvider {
    #mm;

    /**
     * @param {InvisicodeProviderOptions} options - The parameters for the constructor.
     * @throws {Error} if quality, lowQ or highQ are not specified
     */
    constructor({ lowQ, highQ, baseLang, fallback, ...options }) {
        if (options.quality === undefined || lowQ === undefined || highQ === undefined) {
            throw 'You must specify quality, lowQ and highQ for InvisicodeProvider';
        }
        super(options);
        this.lowQ = lowQ;
        this.highQ = highQ;
        this.baseLang = baseLang;
        this.fallback = Boolean(fallback);
    }

    getTranslatedTus(job) {
        let tm;
        if (this.baseLang) {
            tm = this.#mm.tmm.getTM(job.sourceLang, this.baseLang);
        }
        const ts = L10nContext.regression ? 1 : new Date().getTime();
        return job.tus.map(requestTU => {
            let baseTranslation, q;
            if (this.baseLang) {
                const tu = tm.getEntryByGuid(requestTU.guid);
                baseTranslation = tu?.ntgt || (this.fallback && requestTU?.nsrc);
                // eslint-disable-next-line no-nested-ternary
                q = (tu?.q <= this.lowQ || tu?.q === undefined) ? 0 : (tu?.q >= this.highQ ? 2 : 1);
            } else {
                baseTranslation = requestTU.nsrc;
                q = 0;
            }
            if (baseTranslation) {
                const meta = {
                    g: requestTU.guid,
                    q,
                }
                return {
                    guid: requestTU.guid,
                    ntgt: [ `\u200B${utf8ToFE00Range(JSON.stringify(meta))}`, ...baseTranslation, '\u200B' ],
                    q: this.quality,
                    ts,
                };
            }
        }).filter(Boolean);
    }
}
