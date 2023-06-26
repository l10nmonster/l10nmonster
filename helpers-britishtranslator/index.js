const { translate } = require('translate-american-british-english');

exports.BritishTranslator = class BritishTranslator {
    constructor({ quality, toUS } = {}) {
        if (quality === undefined) {
            throw 'You must specify a quality for BritishTranslator';
        } else {
            this.quality = quality;
            this.options = {
                american: Boolean(toUS),
            };
        }
    }

    async requestTranslations(jobRequest) {
        const { tus, ...jobResponse } = jobRequest;
        const ts = l10nmonster.regression ? 1 : new Date().getTime();
        jobResponse.tus = [];
        tus.forEach(tu => {
            let changed = false;
            const ntgt = [];
            for (const part of tu.nsrc) {
                if (typeof part === 'string') {
                    const maybeTranslated = translate(part, this.options);
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
        });
        jobResponse.status = 'done';
        return jobResponse;
    }
}
