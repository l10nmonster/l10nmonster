import { TranslationServiceClient } from '@google-cloud/translate';
import { L10nContext, utils } from '@l10nmonster/core';

const MAX_CHUNK_SIZE = 1000;
const RECOMMENDED_LENGTH = 30000;

async function gctTranslateChunkOp({ keyFilename, request, offset }) {
    try {
        const gctClient = new TranslationServiceClient({ keyFilename });
        const [ response ] = await gctClient.translateText(request);
        const translations = {};
        response.translations.forEach((tx, idx) => {
            translations[idx + offset] = tx.translatedText;
        });
        return translations;
    } catch(error) {
        throw `GCT: ${error.toString()}`;
    }
}

async function gctMergeTranslatedChunksOp({ jobRequest, tuMeta, quality, ts }, chunks) {
    const { tus, ...jobResponse } = jobRequest;
    const translations = Object.assign({}, ...chunks);
    jobResponse.tus = tus.map((tu, idx) => {
        const translation = { guid: tu.guid, ts };
        const gctTx = translations[idx] || {};
        const ntgt = utils.extractNormalizedPartsFromXmlV1(gctTx, tuMeta[idx] || {});
        translation.ntgt = ntgt;
        translation.q = quality;
        return translation;
    });
    jobResponse.status = 'done';
    return jobResponse;
}

export class GoogleCloudTranslateV3 {
    constructor({ keyFilename, projectId, location, quality, languageMapper }) {
        if ((keyFilename && projectId && quality) === undefined) {
            throw 'You must specify keyFilename, projectId, quality for GoogleCloudTranslateV3';
        } else {
            this.keyFilename = keyFilename;
            this.parent = `projects/${projectId}/locations/${location ?? 'global'}`
            this.quality = quality;
            this.languageMapper = languageMapper;
            L10nContext.opsMgr.registerOp(gctTranslateChunkOp, { idempotent: false });
            L10nContext.opsMgr.registerOp(gctMergeTranslatedChunksOp, { idempotent: true });
        }
    }

    async requestTranslations(jobRequest) {
        const sourceLanguageCode = (this.languageMapper && this.languageMapper(jobRequest.sourceLang)) ?? jobRequest.sourceLang;
        const targetLanguageCode = (this.languageMapper && this.languageMapper(jobRequest.targetLang)) ?? jobRequest.targetLang;
        const tuMeta = {};
        const gctPayload = jobRequest.tus.map((tu, idx) => {
            const [xmlSrc, phMap ] = utils.flattenNormalizedSourceToXmlV1(tu.nsrc);
            if (Object.keys(phMap).length > 0) {
                tuMeta[idx] = phMap;
            }
            return xmlSrc;
        });

        const requestTranslationsTask = L10nContext.opsMgr.createTask();
        try {
            const chunkOps = [];
            for (let currentIdx = 0; currentIdx < gctPayload.length;) {
                const offset = currentIdx;
                const contents = [];
                let currentTotalLength = 0;
                while (currentIdx < gctPayload.length && contents.length < MAX_CHUNK_SIZE && currentTotalLength < RECOMMENDED_LENGTH) {
                    currentTotalLength += gctPayload[currentIdx].length;
                    contents.push(gctPayload[currentIdx]);
                    currentIdx++;
                }
                L10nContext.logger.info(`Preparing GCT translate, offset: ${offset} chunk strings: ${contents.length} chunk char length: ${currentTotalLength}`);
                const translateOp = requestTranslationsTask.enqueue(
                    gctTranslateChunkOp,
                    {
                        keyFilename: this.keyFilename,
                        request: {
                            parent: this.parent,
                            contents,
                            mimeType: 'text/html',
                            sourceLanguageCode,
                            targetLanguageCode,
                        },
                        offset,
                    }
                );
                chunkOps.push(translateOp);
            }
            requestTranslationsTask.commit(
                gctMergeTranslatedChunksOp,
                {
                    jobRequest,
                    tuMeta,
                    quality: this.quality,
                    ts: L10nContext.regression ? 1 : new Date().getTime(),
                },
                chunkOps
            );
            const jobResponse = await requestTranslationsTask.execute();
            jobResponse.taskName = requestTranslationsTask.taskName;
            return jobResponse;
        } catch (error) {
            throw `GCT call failed - ${error}`;
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
            tus: fullResponse.tus.filter(tu => !utils.normalizedStringsAreEqual(reqTuMap[tu.guid].ntgt, tu.ntgt)),
        };
    }
}
