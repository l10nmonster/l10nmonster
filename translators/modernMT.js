import got from 'got';

import { flattenNormalizedSourceV1, extractNormalizedPartsV1 } from '../normalizers/util.js';

// TODO: externalize this ase general-purpose Op
async function gotGetOp({ req, offset }) {
    try {
        return {
            res: await got.get(req).json(),
            offset,
        };
    } catch(error) {
        const errorBody = error?.response?.body;
        if (errorBody) {
            try {
                throw JSON.parse(errorBody);
            } catch(e) {
                throw errorBody;
            }
        }
        throw error;
    }
}

async function mmtMergeTranslationResponsesOp({ jobRequest, tuMeta }, input) {
    const { tus, ...jobResponse } = jobRequest;
    jobResponse.tus = [];
    for (const response of input) {
        if (response.res.status === 200) {
            response.res.data.forEach((tx, idx) => {
                const tuIdx = idx + response.offset;
                jobResponse.tus[tuIdx] = tus[tuIdx];
                jobResponse.tus[tuIdx].tgt = tgt;
            });
        } else {
            throw `MMT returned status ${response.status}`;
        }
    }
}

async function tosRequestTranslationsOp({ jobManifest }, committedGuids) {
    jobManifest.inflight = committedGuids.flat(1);
    jobManifest.status = 'pending';
    return jobManifest;
}

export class ModernMT {
    constructor({ baseURL, apiKey, priority, multiline, quality, chunkSize }) {
        if ((apiKey && quality) === undefined) {
            throw 'You must specify apiKey, quality for ModernMT';
        } else {
            this.baseURL = baseURL ?? 'https://api.modernmt.com';
            this.stdHeaders = {
                'MMT-ApiKey': apiKey,
                'MMT-Platform': 'l10n.monster/MMT',
                'MMT-PlatformVersion': 'v0.1',
            };
            this.priority = priority ?? 'normal',
            this.multiline = multiline ?? true,
            this.quality = quality;
            this.chunkSize = chunkSize || 100;
            this.ctx.opsMgr.registerOp(gotGetOp, { idempotent: false });
            this.ctx.opsMgr.registerOp(mmtMergeTranslationResponsesOp, { idempotent: true });
        }
    }

    async requestTranslations(jobRequest) {
        const tuMeta = [];
        const mmtPayload = jobRequest.tus.map((tu, idx) => {
            let content = tu.src;
            if (tu.nsrc) {
                const [normalizedStr, phMap ] = flattenNormalizedSourceV1(tu.nsrc);
                content = normalizedStr;
                if (Object.keys(phMap).length > 0) {
                    tuMeta[idx] = { contentType: tu.contentType, phMap, nsrc: tu.nsrc };
                }
            } else {
                tuMeta[idx] = { src: tu.src };
            }
            return content;
        });

        const req = {
            url: `${this.baseURL}/translate`,
            json: {
                source: jobRequest.sourceLang,
                target: jobRequest.targetLang,
                priority: this.priority,
                'project_id': jobRequest.jobGuid,
                multiline: this.multiline,
            },
            headers: this.stdHeaders,
            timeout: {
                request: 60000,
            },
        };
        const requestTranslationsTask = this.ctx.opsMgr.createTask();
        try {
            const chunkOps = [];
            for (let offset = 0; mmtPayload.length > 0; offset += this.chunkSize) {
                req.json.q = mmtPayload.splice(0, this.chunkSize); // TODO: need to deal with 10k limitation
                this.ctx.verbose && console.log(`Calling MMT translate, offset: ${offset} chunk size: ${req.json.length}`);
                const translateOp = await requestTranslationsTask.enqueue(gotGetOp, { req, offset });
                chunkOps.push(translateOp);
            }
            const rootOp = await requestTranslationsTask.enqueue(mmtMergeTranslationResponsesOp, { jobRequest, tuMeta }, chunkOps);
            return await requestTranslationsTask.execute(rootOp);
        } catch (error) {
            throw `MMT call failed - ${error}`;
        }
    }

    // sync api only for now
    async fetchTranslations() {
        return null;
    }

}
