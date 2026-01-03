/* eslint-disable no-bitwise */
import { getRegressionMode } from '../../l10nContext.js';
import { BaseTranslationProvider } from './baseTranslationProvider.js';

/**
 * @typedef {import('../../interfaces.js').Job} Job
 * @typedef {import('../../interfaces.js').TU} TU
 */

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
 * @typedef {import('./baseTranslationProvider.js').BaseTranslationProviderOptions & {
 *   baseLang?: string|((lang: string) => string),
 *   fallback?: boolean,
 *   includeQ?: boolean
 * }} InvisicodeProviderOptions
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
            throw new Error('You must specify quality for InvisicodeProvider');
        }
        super(options);
        this.#baseLang = baseLang;
        this.#fallback = Boolean(fallback);
        this.#includeQ = Boolean(includeQ);
    }

    /**
     * Gets translated TUs wrapped in Invisicode.
     * @param {Job} job - The job with TUs.
     * @returns {Promise<Partial<TU>[]>} Translated TUs with Invisicode wrapping.
     */
    async getTranslatedTus(job) {
        // Resolve baseLang - can be a string or a function that takes targetLang
        const resolvedBaseLang = typeof this.#baseLang === 'function' ?
            this.#baseLang(job.targetLang) :
            this.#baseLang;

        let tm;
        if (resolvedBaseLang) {
            tm = this.mm.tmm.getTM(job.sourceLang, resolvedBaseLang);
        }
        const ts = getRegressionMode() ? 1 : new Date().getTime();
        let translations = {};
        if (resolvedBaseLang) {
            translations = await tm.getEntries(job.tus.map(tu => tu.guid));
        }
        return job.tus.map(requestTU => {
            let baseTranslation, q;
            if (resolvedBaseLang) {
                const tu = translations[requestTU.guid];
                baseTranslation = tu?.ntgt || (this.#fallback && requestTU?.nsrc);
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
                    ntgt: [ `\u200B${utf8ToFE00Range(JSON.stringify(meta))}`, ...baseTranslation, '\u200C' ],
                    q: this.quality,
                    ts,
                };
            }
            return undefined;
        }).filter(Boolean);
    }
}
