/* eslint-disable no-invalid-this */
const { utils, normalizers } = require('@l10nmonster/helpers');
const { ModernMT } = require('modernmt');

const MAX_CHAR_LENGTH = 9900;
const MAX_CHUNK_SIZE = 125;

async function mmtTranslateChunkOp({ q, batchOptions }) {
    const baseRequest = this.context.baseRequest;
    try {
        const mmt = new ModernMT(...baseRequest.mmtConstructor);
        if (batchOptions) {
            const response = await mmt.batchTranslate(
                baseRequest.webhook,
                baseRequest.sourceLang,
                baseRequest.targetLang,
                q,
                baseRequest.hints,
                undefined,
                {
                    ...baseRequest.options,
                    ...batchOptions
                }
            );
            return {
                enqueued: response
            }
        } else {
            const response = await mmt.translate(
                baseRequest.sourceLang,
                baseRequest.targetLang,
                q,
                baseRequest.hints,
                undefined,
                baseRequest.options
            );
            return response;
        }
    } catch(error) {
        throw `${error.toString()}: ${error.response?.body}`;
    }
}

async function mmtMergeSubmittedChunksOp(args, chunks) {
    chunks.forEach((response, idx) => l10nmonster.logger.verbose(`MMT Chunk ${idx} enqueued=${response.enqueued}`));
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
        translation.ntgt = utils.extractNormalizedPartsFromXmlV1(mmtTx.translation, tuMeta[idx] || {});
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
            tu.ntgt = utils.consolidateDecodedParts(tu.ntgt, flags, true);
        }
    }
}

module.exports = class ModernMT {
    constructor({ baseURL, apiKey, webhook, chunkFetcher, hints, multiline, quality, maxCharLength, languageMapper, glossary }) {
        if ((apiKey && quality) === undefined) {
            throw 'You must specify apiKey, quality for ModernMT';
        } else {
            if (webhook && !chunkFetcher) {
                throw 'If you specify a webhook you must also specify a chunkFetcher';
            }
            this.baseURL = baseURL ?? 'https://api.modernmt.com';
            this.mmtConstructor = [ apiKey, 'l10n.monster/MMT', '1.0' ];
            this.webhook = webhook;
            this.chunkFetcher = chunkFetcher;
            chunkFetcher && l10nmonster.opsMgr.registerOp(chunkFetcher, { idempotent: true });
            this.hints = hints;
            this.multiline = multiline ?? true;
            this.quality = quality;
            this.maxCharLength = maxCharLength ?? MAX_CHAR_LENGTH;
            this.languageMapper = languageMapper;
            if (glossary) {
                const [ glossaryDecoder, glossaryEncoder ] = normalizers.keywordTranslatorMaker('glossary', glossary);
                this.glossaryDecoder = [ glossaryDecoder ];
                this.glossaryEncoder = glossaryEncoder;
            }
            l10nmonster.opsMgr.registerOp(mmtTranslateChunkOp, { idempotent: false });
            l10nmonster.opsMgr.registerOp(mmtMergeSubmittedChunksOp, { idempotent: true });
            l10nmonster.opsMgr.registerOp(mmtMergeTranslatedChunksOp, { idempotent: true });
        }
    }

    async requestTranslations(jobRequest) {
        const sourceLang = (this.languageMapper && this.languageMapper(jobRequest.sourceLang)) ?? jobRequest.sourceLang;
        const targetLang = (this.languageMapper && this.languageMapper(jobRequest.targetLang)) ?? jobRequest.targetLang;
        const tuMeta = {};
        const mmtPayload = jobRequest.tus.map((tu, idx) => {
            const nsrc = utils.decodeNormalizedString(tu.nsrc, this.glossaryDecoder);
            const [xmlSrc, phMap ] = utils.flattenNormalizedSourceToXmlV1(nsrc);
            if (Object.keys(phMap).length > 0) {
                tuMeta[idx] = phMap;
            }
            return xmlSrc;
        });
        const context = {
            baseRequest: {
                mmtConstructor: this.mmtConstructor,
                sourceLang,
                targetLang,
                hints: this.hints,
                options: {
                    multiline: this.multiline,
                    format: 'text/xml',
                },
                webhook: this.webhook,
            }
        };
        const requestTranslationsTask = l10nmonster.opsMgr.createTask();
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
            l10nmonster.logger.info(`Preparing MMT translate: chunk strings: ${q.length} chunk char length: ${currentTotalLength}`);
            const req = { q };
            if (this.webhook) {
                req.batchOptions = {
                    idempotencyKey: `jobGuid:${jobRequest.jobGuid} chunk:${chunkOps.length}`,
                    metadata: {
                        jobGuid: jobRequest.jobGuid,
                        chunk: chunkOps.length
                    }
                };
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
                jobResponse.taskName = l10nmonster.regression ? 'x' : requestTranslationsTask.taskName;
                return jobResponse;
            } else {
                requestTranslationsTask.commit(mmtMergeTranslatedChunksOp, {
                    jobRequest,
                    tuMeta,
                    quality: this.quality,
                    ts: l10nmonster.regression ? 1 : new Date().getTime(),
                    chunkSizes,
                }, chunkOps);
                const jobResponse = await requestTranslationsTask.execute();
                jobResponse.taskName = l10nmonster.regression ? 'x' : requestTranslationsTask.taskName;
                applyGlossary(this.glossaryEncoder, jobResponse);
                return jobResponse;
            }
        } catch (error) {
            throw `MMT call failed - ${error}`;
        }
    }

    async fetchTranslations(pendingJob, jobRequest) {
        try {
            // eslint-disable-next-line no-unused-vars
            const requestTranslationsTask = l10nmonster.opsMgr.createTask();
            const chunkOps = [];
            pendingJob.envelope.chunkSizes.forEach(async (chunkSize, chunk) => {
                l10nmonster.logger.info(`Enqueue chunk fetcher for job: ${jobRequest.jobGuid} chunk:${chunk} chunkSize:${chunkSize}`);
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
                ts: l10nmonster.regression ? 1 : new Date().getTime(),
                chunkSizes: pendingJob.envelope.chunkSizes,
            }, chunkOps);
            const jobResponse = await requestTranslationsTask.execute();
            jobResponse.taskName = l10nmonster.regression ? 'x' : requestTranslationsTask.taskName;
            applyGlossary(this.glossaryEncoder, jobResponse);
            return jobResponse;
        } catch (error) {
            return null; // getting errors is expected, just leave the job pending
        }
    }

    async refreshTranslations(jobRequest) {
        if (this.webhook) {
            throw 'Refreshing MMT translations not supported in batch mode';
        }
        const fullResponse = await this.requestTranslations(jobRequest);
        const reqTuMap = jobRequest.tus.reduce((p,c) => (p[c.guid] = c, p), {});
        return {
            ...fullResponse,
            tus: fullResponse.tus.filter(tu => !utils.normalizedStringsAreEqual(reqTuMap[tu.guid].ntgt, tu.ntgt)),
        };
    }
}
