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
 * @property {string} [baseLang] - language code for the base language (source if not specified)
 * @property {boolean} [fallback] - if true, fall back to source if translation is missing
 * @property {boolean} [includeQ] - if true, include quality score in the output
 */

/**
 * @class InvisicodeProvider
 * @extends BaseTranslationProvider
 * @description Translator that wraps content in Invisicode
 */
export class InvisicodeProvider extends BaseTranslationProvider {
    #baseLang;
    #fallback;
    #includeQ;


    /**
     * @param {InvisicodeProviderOptions} options - The parameters for the constructor.
     * @throws {Error} if quality, lowQ or highQ are not specified
     */
    constructor({ baseLang, fallback, includeQ, ...options }) {
        if (options.quality === undefined) {
            throw 'You must specify quality for InvisicodeProvider';
        }
        super(options);
        this.#baseLang = baseLang;
        this.#fallback = Boolean(fallback);
        this.#includeQ = Boolean(includeQ);
    }

    getTranslatedTus(job) {
        let tm;
        if (this.#baseLang) {
            tm = this.mm.tmm.getTM(job.sourceLang, this.#baseLang);
        }
        const ts = L10nContext.regression ? 1 : new Date().getTime();
        return job.tus.map(requestTU => {
            let baseTranslation, q;
            if (this.#baseLang) {
                const tu = tm.getEntryByGuid(requestTU.guid);
                baseTranslation = tu?.ntgt || (this.#fallback && requestTU?.nsrc);
                // eslint-disable-next-line no-nested-ternary
                q = tu?.q ?? 0;
            } else {
                baseTranslation = requestTU.nsrc;
                q = 0;
            }
            if (baseTranslation) {
                const meta = { g: requestTU.guid };
                this.#includeQ && (meta.q = q);
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
