function underlineString(str) {
    const newStr = [];
    for (const c of str) {
        newStr.push(c);
        newStr.push('\u0333'); // double low-line
    }
    return newStr.join('');
}

function encodeNumber(base, startingCodepoint, num) {
    const newStr = [];
    do {
        const idx = num % base;
        newStr.unshift(String.fromCodePoint(startingCodepoint + idx));
        num = Math.floor(num / base);
    } while (num > 0);
    return newStr.join('');
}

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
        const jobIdString = encodeNumber(26, 9372, jobRequest.jobId);
        let tuIdx = 0;
        jobResponse.tus = jobRequest.tus.map(tu => {
            const translation = { guid: tu.guid };
            if (tu.nsrc) {
                translation.ntgt = [
                    `\u21e5${jobIdString}${encodeNumber(52, 9398, tuIdx)}`,
                    ...tu.nsrc.map(n => (typeof n === 'string' ? underlineString(n) : n)),
                    `\u21e4`
                ];
                translation.contentType = tu.contentType;
            } else {
                translation.tgt = `\u21e5${jobIdString}${encodeNumber(52, 9398, tuIdx)}${underlineString(tu.src)}\u21e4`;
            }
            translation.q = this.quality;
            tuIdx++;
            return translation;
        });
        jobResponse.status = 'done';
        jobResponse.ts = this.ctx.regression ? 1 : new Date().getTime();
        return jobResponse;
    }

    async fetchTranslations() {
        return null;
    }
}
