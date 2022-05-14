import got from 'got';

import { flattenNormalizedSourceToXmlV1, extractNormalizedPartsFromXmlV1 } from '../normalizers/util.js';

// TODO: externalize this as a general-purpose Op
async function gotGetOp(params) {
    const { req, ...otherParams } = params;
    try {
        return {
            ...otherParams,
            res: await got.get(req).json(),
        };
    } catch(error) {
        throw error.toString();
    }
}

async function mmtMergeTranslationChunksOp({ jobRequest, tuMeta, quality, ts }, chunks) {
    const { tus, ...jobResponse } = jobRequest;
    const translations = {};
    for (const response of chunks) {
        if (response.res.status === 200) {
            response.res.data.forEach((tx, idx) => {
                translations[idx + response.offset] = tx;
            });
        } else {
            throw `MMT returned status ${response.status}: ${response?.error?.message}`;
        }
    }
    jobResponse.tus = tus.map((tu, idx) => {
        const translation = { guid: tu.guid };
        const mmtTx = translations[idx] || {};
        const ntgt = extractNormalizedPartsFromXmlV1(mmtTx.translation, tuMeta[idx] || {});
        if (tu.nsrc) {
            translation.ntgt = ntgt;
            translation.contentType = tu.contentType;
        } else {
            translation.tgt = ntgt[0];
        }
        translation.q = quality;
        translation.cost = [ mmtTx.billedCharacters, mmtTx.billed, mmtTx.characters ];
        return translation;
    });
    jobResponse.status = 'done';
    jobResponse.ts = ts;
    return jobResponse;
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
            this.ctx.opsMgr.registerOp(mmtMergeTranslationChunksOp, { idempotent: true });
        }
    }

    async requestTranslations(jobRequest) {
        const tuMeta = {};
        const mmtPayload = jobRequest.tus.map((tu, idx) => {
            const [xmlSrc, phMap ] = flattenNormalizedSourceToXmlV1(tu.nsrc || [ tu.src ]);
            if (Object.keys(phMap).length > 0) {
                tuMeta[idx] = phMap;
            }
            return xmlSrc;
        });

        const baseRequest = {
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
            allowGetBody: true,
        };
        const requestTranslationsTask = this.ctx.opsMgr.createTask();
        try {
            const chunkOps = [];
            for (let offset = 0; mmtPayload.length > 0; offset += this.chunkSize) {
                const chunkReq = {
                    ...baseRequest,
                    json: {
                        ...baseRequest.json,
                        q: mmtPayload.splice(0, this.chunkSize), // TODO: need to deal with 10k limitation
                    }
                };
                this.ctx.verbose && console.log(`Calling MMT translate, offset: ${offset} chunk size: ${chunkReq.json.q.length}`);
                const translateOp = await requestTranslationsTask.enqueue(gotGetOp, { req: chunkReq, offset });
                chunkOps.push(translateOp);
            }
            const rootOp = await requestTranslationsTask.enqueue(mmtMergeTranslationChunksOp, { 
                jobRequest, 
                tuMeta, 
                quality: this.quality, 
                ts: this.ctx.regression ? 1 : new Date().getTime(),
            }, chunkOps);
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
