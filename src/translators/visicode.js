import { integerToLabel } from '../shared.js';

function underlineString(str) {
    const newStr = [];
    for (const c of str) {
        newStr.push(c);
        newStr.push('\u0333'); // double low-line
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
// e.g. encodeNumber(26, 9372, jobRequest.jobId) or encodeNumber(52, 9398, tuIdx)

export class Visicode {
    constructor({ quality } = {}) {
        if (quality === undefined) {
            throw 'You must specify a quality for Visicode';
        } else {
            this.quality = quality;
        }
    }

    async requestTranslations(jobRequest) {
        // eslint-disable-next-line no-unused-vars
        const { tus, ...jobResponse } = jobRequest;
        jobResponse.tus = jobRequest.tus.map(tu => {
            const translation = { guid: tu.guid };
            if (tu.nsrc) {
                translation.ntgt = [
                    `\u21e5`,
                    ...tu.nsrc.map(n => (typeof n === 'string' ? underlineString(n) : n)),
                    `\u21e4`
                ];
            } else {
                translation.tgt = `\u21e5${tu.seq ? `${integerToLabel(tu.seq)}:` : ''}${underlineString(tu.src)}\u21e4`;
            }
            translation.q = this.quality;
            return translation;
        });
        jobResponse.status = 'done';
        jobResponse.ts = this.ctx.regression ? 1 : new Date().getTime();
        return jobResponse;
    }

    async fetchTranslations() {
        throw 'Visicode is a synchronous-only provider';
    }
}
