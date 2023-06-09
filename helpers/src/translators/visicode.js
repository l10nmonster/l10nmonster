import { utils } from '@l10nmonster/helpers';

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
        const ts = l10nmonster.regression ? 1 : new Date().getTime();
        jobResponse.tus = jobRequest.tus.map(tu => {
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
        jobResponse.status = 'done';
        return jobResponse;
    }

    async fetchTranslations() {
        throw 'Visicode is a synchronous-only provider';
    }
}
