import got from 'got';

import {
    flattenNormalizedSourceToXmlV1, extractNormalizedPartsFromXmlV1,
    normalizedStringsAreEqual,
} from '../normalizers/util.js';

const MAX_CHAR_LENGTH = 9900;
const MAX_CHUNK_SIZE = 125;

async function mmtTranslateChunkOp({ baseURL, json, headers, offset}) {
    try {
        const response = await got.get({
            url: `${baseURL}/translate`,
            json,
            headers,
            timeout: {
                request: 60000,
            },
            allowGetBody: true,
        }).json();
        const translations = {};
        if (response.status === 200) {
            response.data.forEach((tx, idx) => {
                translations[idx + offset] = tx;
            });
        } else {
            throw `MMT returned status ${response.status}: ${response.error?.message}`;
        }
        return translations;
    } catch(error) {
        throw `${error.toString()}: ${error.response?.body}`;
    }
}

async function mmtMergeTranslatedChunksOp({ jobRequest, tuMeta, quality, ts }, chunks) {
    const { tus, ...jobResponse } = jobRequest;
    const translations = Object.assign({}, ...chunks);
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
    constructor({ baseURL, apiKey, priority, multiline, quality, maxCharLength, languageMapper }) {
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
            this.maxCharLength = maxCharLength ?? MAX_CHAR_LENGTH;
            this.languageMapper = languageMapper;
            this.ctx.opsMgr.registerOp(mmtTranslateChunkOp, { idempotent: false });
            this.ctx.opsMgr.registerOp(mmtMergeTranslatedChunksOp, { idempotent: true });
        }
    }

    async requestTranslations(jobRequest) {
        const sourceLang = (this.languageMapper && this.languageMapper(jobRequest.sourceLang)) ?? jobRequest.sourceLang;
        const targetLang = (this.languageMapper && this.languageMapper(jobRequest.targetLang)) ?? jobRequest.targetLang;
        const tuMeta = {};
        const mmtPayload = jobRequest.tus.map((tu, idx) => {
            const [xmlSrc, phMap ] = flattenNormalizedSourceToXmlV1(tu.nsrc || [ tu.src ]);
            if (Object.keys(phMap).length > 0) {
                tuMeta[idx] = phMap;
            }
            return xmlSrc;
        });

        const requestTranslationsTask = this.ctx.opsMgr.createTask();
        try {
            const chunkOps = [];
            for (let currentIdx = 0; currentIdx < mmtPayload.length;) {
                const offset = currentIdx;
                const q = [];
                let currentTotalLength = 0;
                while (currentIdx < mmtPayload.length && q.length < MAX_CHUNK_SIZE && mmtPayload[currentIdx].length + currentTotalLength < this.maxCharLength) {
                    currentTotalLength += mmtPayload[currentIdx].length;
                    q.push(mmtPayload[currentIdx]);
                    currentIdx++;
                }
                if (q.length === 0) {
                    throw `String at index ${currentIdx} exceeds ${this.maxCharLength} max char length`;
                }
                this.ctx.logger.info(`Preparing MMT translate, offset: ${offset} chunk strings: ${q.length} chunk char length: ${currentTotalLength}`);
                const translateOp = await requestTranslationsTask.enqueue(
                    mmtTranslateChunkOp,
                    {
                        baseURL: this.baseURL,
                        json: {
                            source: sourceLang,
                            target: targetLang,
                            priority: this.priority,
                            multiline: this.multiline,
                            q,
                        },
                        headers: this.stdHeaders,
                        offset
                    }
                );
                chunkOps.push(translateOp);
            }
            const rootOp = await requestTranslationsTask.enqueue(mmtMergeTranslatedChunksOp, {
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

    async refreshTranslations(jobRequest) {
        const fullResponse = await this.requestTranslations(jobRequest);
        const reqTuMap = jobRequest.tus.reduce((p,c) => (p[c.guid] = c, p), {});
        return {
            ...fullResponse,
            tus: fullResponse.tus.filter(tu => !normalizedStringsAreEqual(reqTuMap[tu.guid].ntgt ?? reqTuMap[tu.guid].tgt, tu.ntgt ?? tu.tgt)),
        };
    }
}
