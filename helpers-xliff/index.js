const path = require('path');
const { existsSync } = require('fs');
const fs = require('fs/promises');
const { createxliff12, xliff12ToJs } = require('xliff');

exports.BridgeTranslator = class XliffBridge {
    constructor({ requestPath, completePath, quality }) {
        if ((requestPath && completePath && quality) === undefined) {
            throw 'You must specify requestPath, completePath, quality for XliffBridge';
        } else {
            this.requestPath = requestPath;
            this.completePath = completePath;
            this.quality = quality;
        }
    }

    async requestTranslations(jobRequest) {
        // eslint-disable-next-line no-unused-vars
        const { tus, ...jobManifest } = jobRequest;
        const notes = {};
        jobRequest.tus.forEach(tu => {
            if (tu.notes) {
                notes[tu.guid] = tu.notes;
            }
        });
        const xliff = await createxliff12(
            jobRequest.sourceLang,
            jobRequest.targetLang,
            Object.fromEntries(jobRequest.tus.map(tu => [ tu.guid, tu.nsrc[0] ])), // TODO: need to deal with nsrc properly
            null,
            'XliffBridge',
            null,
            notes,
        );
        if (xliff) {
            const prjPath = path.join(l10nmonster.baseDir, this.requestPath(jobRequest.targetLang, jobRequest.jobGuid));
            await fs.mkdir(path.dirname(prjPath), {recursive: true});
            await fs.writeFile(prjPath, xliff, 'utf8');
            jobManifest.inflight = Object.values(jobRequest.tus).map(tu => tu.guid);
            jobManifest.status = 'pending';
        } else {
            jobManifest.status = 'blocked';
        }
        return jobManifest;
    }

    async fetchTranslations(pendingJob, jobRequest) {
        const { inflight, ...jobResponse } = pendingJob;
        const completePath = path.join(l10nmonster.baseDir, this.completePath(jobResponse.targetLang, jobResponse.jobGuid));
        const tuMap = jobRequest.tus.reduce((p,c) => (p[c.guid] = c, p), {});
        if (existsSync(completePath)) {
            const translatedRes = await fs.readFile(completePath, 'utf8');
            const translations = await xliff12ToJs(translatedRes);
            const tus = [];
            for (const [guid, xt] of Object.entries(translations.resources.XliffBridge)) {
                if (xt?.target?.length > 0) {
                    tus.push({
                        guid,
                        sid: tuMap[guid].sid,
                        ts: tuMap[guid].ts,
                        nsrc: [xt.source], // TODO: need to deal with nsrc properly
                        ntgt: [xt.target], // TODO: need to deal with ntgt properly
                        q: this.quality,
                    });
                }
            }
            if (inflight.length === tus.length) {
                return {
                    ...jobResponse,
                    tus,
                    status: 'done',
                }
            }
        }
        return null;
    }

    async refreshTranslations() {
        throw `XliffBridge doesn't support refreshing translations`;
    }
}
