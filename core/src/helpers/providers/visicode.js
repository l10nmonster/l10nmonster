import { L10nContext, utils, logVerbose } from '@l10nmonster/core';
import { BaseTranslationProvider } from './baseTranslationProvider.js';

function underlineString(str, runningLength) {
    const newStr = [];
    for (const c of str) {
        runningLength++;
        newStr.push(c);
        newStr.push(runningLength % 5 === 0 ? '\u0332\u031f' : '\u0332'); // low-line and plus sign below
    }
    return newStr.join('');
}

// function encodeNumber(base, startingCodepoint, num) {
//     const newStr = [];
//     do {
//         const idx = num % base;
//         newStr.unshift(String.fromCodePoint(startingCodepoint + idx));
//         num = Math.floor(num / base);
//     } while (num > 0);
//     return newStr.join('');
// }
// e.g. encodeNumber(26, 9372, job.jobId) or encodeNumber(52, 9398, tuIdx)

export class Visicode extends BaseTranslationProvider {
    /**
     * Initializes a new instance of the Visicode class.
     * @param {Object} options - The parameters for the constructor.
     * @param {string} [options.id] - Global identifier for the provider.
     * @param {Object} [options.supportedPairs] - Supported pairs for the provider.
     * @param {number} options.quality - The quality to assign translations.
     */
    constructor(options) {
        if (!options.quality) {
            throw new Error('You must specify quality for Visicode');
        }
        super(options);
    }

    async start(job) {
        logVerbose`Visicode provider starting job ${job.jobGuid}`;
        job = await super.start(job);
        const ts = L10nContext.regression ? 1 : new Date().getTime();
        job.tus = job.tus.map(tu => {
            const translation = { guid: tu.guid, ts };
            const prolog = `\u21e5${tu.seq ? `${utils.integerToLabel(tu.seq)}:` : ''}`;
            const parts = [];
            let runningLength = 0;
            for (const part of tu.nsrc) {
                if (typeof part === 'string') {
                    parts.push(underlineString(part, runningLength));
                    runningLength += part.length;
                } else {
                    parts.push({ ...part});
                }
            }
            translation.ntgt = [
                prolog,
                ...parts,
                `\u21e4`
            ];
            translation.q = this.quality;
            return translation;
        });
        return job;
    }
}
