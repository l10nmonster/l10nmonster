/* eslint-disable no-invalid-this */
import got from 'got';

import {
    flattenNormalizedSourceToXmlV1, extractNormalizedPartsFromXmlV1,
    normalizedStringsAreEqual, decodeNormalizedString, consolidateDecodedParts,
} from '../normalizers/util.js';
import { keywordTranslatorMaker } from '../normalizers/keywordTranslatorMaker.js'

const MAX_CHAR_LENGTH = 9900;
const MAX_CHUNK_SIZE = 125;

async function mmtTranslateChunkOp({ headers, json }) {
    const request = {
        ...this.context.baseRequest,
        timeout: {
            request: 60000,
        },
        allowGetBody: true,
    };
    request.headers = { ...request.headers, ...headers };
    request.json = { ...request.json, ...json };
    try {
        const response = await got(request).json();
        if (response.status !== 200) {
            throw `MMT returned status ${response.status}: ${response.error?.message}`;
        }
        return response.data;
    } catch(error) {
        throw `${error.toString()}: ${error.response?.body}`;
    }
}

async function mmtMergeSubmittedChunksOp(args, chunks) {
    chunks.forEach((data, idx) => this.opsMgr.logger.verbose(`MMT Chunk ${idx} enqueued=${data.enqueued}`));
}

async function mmtMergeTranslatedChunksOp({ jobRequest, tuMeta, quality, ts, chunkSizes }, chunks) {
    chunks.forEach((chunk, idx) => {
        if (chunk.length !== chunkSizes[idx]) {
            throw `MMT: Expected chunk ${idx} to have ${chunkSizes[idx]} translations but got ${chunk.length}`;
        }
    });
    const { tus, ...jobResponse } = jobRequest;
    const translations = chunks.flat(1);
    jobResponse.tus = tus.map((tu, idx) => {
        const translation = { guid: tu.guid, ts };
        const mmtTx = translations[idx] || {};
        translation.ntgt = extractNormalizedPartsFromXmlV1(mmtTx.translation, tuMeta[idx] || {});
        translation.q = quality;
        translation.cost = [ mmtTx.billedCharacters, mmtTx.billed, mmtTx.characters ];
        return translation;
    });
    jobResponse.status = 'done';
    return jobResponse;
}

function applyGlossary(glossaryEncoder, jobResponse) {
    if (glossaryEncoder) {
            const flags = { targetLang: jobResponse.targetLang };
        for (const tu of jobResponse.tus) {
            tu.ntgt.forEach((part, idx) => {
                // not very solid, but if placeholder follows glossary conventions, then convert it back to a string
                if (typeof part === 'object' && part.v.indexOf('glossary:') === 0) {
                    tu.ntgt[idx] = glossaryEncoder(part.v, flags);
                }
            });
            tu.ntgt = consolidateDecodedParts(tu.ntgt, flags, true);
        }
    }
}

export class ModernMT {
    constructor({ baseURL, apiKey, webhook, chunkFetcher, hints, multiline, quality, maxCharLength, languageMapper, glossary }) {
        if ((apiKey && quality) === undefined) {
            throw 'You must specify apiKey, quality for ModernMT';
        } else {
            if (webhook && !chunkFetcher) {
                throw 'If you specify a webhook you must also specify a chunkFetcher';
            }
            this.baseURL = baseURL ?? 'https://api.modernmt.com';
            this.stdHeaders = {
                'MMT-ApiKey': apiKey,
                'MMT-Platform': 'l10n.monster/MMT',
                'MMT-PlatformVersion': 'v0.1',
            };
            this.webhook = webhook;
            this.chunkFetcher = chunkFetcher;
            chunkFetcher && this.ctx.opsMgr.registerOp(chunkFetcher, { idempotent: true });
            this.hints = hints;
            this.multiline = multiline ?? true;
            this.quality = quality;
            this.maxCharLength = maxCharLength ?? MAX_CHAR_LENGTH;
            this.languageMapper = languageMapper;
            if (glossary) {
                const [ glossaryDecoder, glossaryEncoder ] = keywordTranslatorMaker('glossary', glossary);
                this.glossaryDecoder = [ glossaryDecoder ];
                this.glossaryEncoder = glossaryEncoder;
            }
            this.ctx.opsMgr.registerOp(mmtTranslateChunkOp, { idempotent: false });
            this.ctx.opsMgr.registerOp(mmtMergeSubmittedChunksOp, { idempotent: true });
            this.ctx.opsMgr.registerOp(mmtMergeTranslatedChunksOp, { idempotent: true });
        }
    }

    async requestTranslations(jobRequest) {
        const sourceLang = (this.languageMapper && this.languageMapper(jobRequest.sourceLang)) ?? jobRequest.sourceLang;
        const targetLang = (this.languageMapper && this.languageMapper(jobRequest.targetLang)) ?? jobRequest.targetLang;
        const tuMeta = {};
        const mmtPayload = jobRequest.tus.map((tu, idx) => {
            const nsrc = decodeNormalizedString(tu.nsrc || [ { t: 's', v: tu.src } ], this.glossaryDecoder);
            const [xmlSrc, phMap ] = flattenNormalizedSourceToXmlV1(nsrc);
            if (Object.keys(phMap).length > 0) {
                tuMeta[idx] = phMap;
            }
            return xmlSrc;
        });
        const context = {
            baseRequest: {
                method: 'GET',
                url: `${this.baseURL}/translate`,
                headers: this.stdHeaders,
                json: {
                    source: sourceLang,
                    target: targetLang,
                    hints: this.hints,
                    multiline: this.multiline,
                    format: 'text/xml',
                },
            }
        };
        if (this.webhook) {
            context.baseRequest.method = 'POST';
            context.baseRequest.url = `${context.baseRequest.url}/batch`;
            context.baseRequest.json.webhook = this.webhook;
        }
        const requestTranslationsTask = this.ctx.opsMgr.createTask();
        requestTranslationsTask.setContext(context);
        const chunkOps = [];
        const chunkSizes = [];
        for (let currentIdx = 0; currentIdx < mmtPayload.length;) {
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
            this.ctx.logger.info(`Preparing MMT translate: chunk strings: ${q.length} chunk char length: ${currentTotalLength}`);
            const req = { json: { q } };
            if (this.webhook) {
                req.headers = { 'x-idempotency-key': `jobGuid:${jobRequest.jobGuid} chunk:${chunkOps.length}`};
                req.json.metadata = { jobGuid: jobRequest.jobGuid, chunk: chunkOps.length };
            }
            chunkSizes.push(q.length);
            chunkOps.push(requestTranslationsTask.enqueue(mmtTranslateChunkOp, req));
        }
        try {
            if (this.webhook) {
                requestTranslationsTask.commit(mmtMergeSubmittedChunksOp, null, chunkOps);
                await requestTranslationsTask.execute();
                const { tus, ...jobResponse } = jobRequest;
                jobResponse.inflight = tus.map(tu => tu.guid);
                jobResponse.envelope = { chunkSizes, tuMeta };
                jobResponse.status = 'pending';
                jobResponse.taskName = this.ctx.regression ? 'x' : requestTranslationsTask.taskName;
                return jobResponse;
            } else {
                requestTranslationsTask.commit(mmtMergeTranslatedChunksOp, {
                    jobRequest,
                    tuMeta,
                    quality: this.quality,
                    ts: this.ctx.regression ? 1 : new Date().getTime(),
                    chunkSizes,
                }, chunkOps);
                const jobResponse = await requestTranslationsTask.execute();
                jobResponse.taskName = this.ctx.regression ? 'x' : requestTranslationsTask.taskName;
                applyGlossary(this.glossaryEncoder, jobResponse);
                return jobResponse;
            }
        } catch (error) {
            throw `MMT call failed - ${error}`;
        }
    }

    async fetchTranslations(pendingJob, jobRequest) {
        // eslint-disable-next-line no-unused-vars
        const requestTranslationsTask = this.ctx.opsMgr.createTask();
        const chunkOps = [];
        pendingJob.envelope.chunkSizes.forEach(async (chunkSize, chunk) => {
            this.ctx.logger.info(`Calling chunk fetcher for job: ${jobRequest.jobGuid} chunk:${chunk} chunkSize:${chunkSize}`);
            chunkOps.push(requestTranslationsTask.enqueue(this.chunkFetcher, {
                jobGuid: jobRequest.jobGuid,
                chunk,
                chunkSize,
            }));
        });
        requestTranslationsTask.commit(mmtMergeTranslatedChunksOp, {
            jobRequest,
            tuMeta: pendingJob.envelope.tuMeta,
            quality: this.quality,
            ts: this.ctx.regression ? 1 : new Date().getTime(),
            chunkSizes: pendingJob.envelope.chunkSizes,
        }, chunkOps);
        const jobResponse = await requestTranslationsTask.execute();
        jobResponse.taskName = this.ctx.regression ? 'x' : requestTranslationsTask.taskName;
        applyGlossary(this.glossaryEncoder, jobResponse);
        return jobResponse;
    }

    async refreshTranslations(jobRequest) {
        if (this.webhook) {
            throw 'Refreshing MMT translations not supported in batch mode';
        }
        const fullResponse = await this.requestTranslations(jobRequest);
        const reqTuMap = jobRequest.tus.reduce((p,c) => (p[c.guid] = c, p), {});
        return {
            ...fullResponse,
            tus: fullResponse.tus.filter(tu => !normalizedStringsAreEqual(reqTuMap[tu.guid].ntgt ?? reqTuMap[tu.guid].tgt, tu.ntgt ?? tu.tgt)),
        };
    }
}
