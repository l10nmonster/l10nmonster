import got from 'got';

import { flattenNormalizedSourceToXmlV1, extractNormalizedPartsFromXmlV1 } from '../normalizers/util.js';

const MAX_CHUNK_SIZE = 50;

async function deeplTranslateChunkOp({ baseURL, headers, searchParams, offset}) {
    try {
        const response = await got.get({
            url: `${baseURL}/v2/translate`,
            searchParams: new URLSearchParams(searchParams),
            headers,
            timeout: {
                request: 60000,
            },
        }).json();
        const translations = {};
        if (response.message) {
            throw `DeepL returned status ${response.message}`;
        } else {
            response.translations.forEach((tx, idx) => {
                translations[idx + offset] = tx.text;
            });
        }
        return translations;
    } catch(error) {
        throw error.toString();
    }
}

async function deeplMergeTranslatedChunksOp({ jobRequest, tuMeta, quality, ts }, chunks) {
    const { tus, ...jobResponse } = jobRequest;
    const translations = Object.assign({}, ...chunks);
    jobResponse.tus = tus.map((tu, idx) => {
        const translation = { guid: tu.guid };
        const ntgt = extractNormalizedPartsFromXmlV1(translations[idx] || {}, tuMeta[idx] || {});
        if (tu.nsrc) {
            translation.ntgt = ntgt;
            translation.contentType = tu.contentType;
        } else {
            translation.tgt = ntgt[0];
        }
        translation.q = quality;
        return translation;
    });
    jobResponse.status = 'done';
    jobResponse.ts = ts;
    return jobResponse;
}

export class DeepL {
    constructor({ baseURL, apiKey, splitSentences, preserveFormatting, formalityMap, quality, languageMapper }) {
        if ((apiKey && quality) === undefined) {
            throw 'You must specify apiKey, quality for DeepL';
        } else {
            this.baseURL = baseURL ?? 'https://api-free.deepl.com';
            this.stdHeaders = {
                'Authorization': `DeepL-Auth-Key ${apiKey}`,
            };
            this.splitSentences = splitSentences ?? '0',
            this.preserveFormatting = preserveFormatting ?? '0',
            this.formalityMap = formalityMap ?? {},
            this.quality = quality;
            this.languageMapper = languageMapper;
            this.ctx.opsMgr.registerOp(deeplTranslateChunkOp, { idempotent: false });
            this.ctx.opsMgr.registerOp(deeplMergeTranslatedChunksOp, { idempotent: true });
        }
    }

    async requestTranslations(jobRequest) {
        const tuMeta = {};
        const deeplPayload = jobRequest.tus.map((tu, idx) => {
            const [xmlSrc, phMap ] = flattenNormalizedSourceToXmlV1(tu.nsrc || [ tu.src ]);
            if (Object.keys(phMap).length > 0) {
                tuMeta[idx] = phMap;
            }
            return xmlSrc;
        });

        const requestTranslationsTask = this.ctx.opsMgr.createTask();
        try {
            const chunkOps = [];
            for (let currentIdx = 0; currentIdx < deeplPayload.length;) {
                const offset = currentIdx;
                const q = [];
                while (currentIdx < deeplPayload.length && q.length < MAX_CHUNK_SIZE) {
                    q.push(deeplPayload[currentIdx]);
                    currentIdx++;
                }
                this.ctx.logger.info(`Preparing DeepL translate, offset: ${offset} chunk strings: ${q.length}`);
                const sourceLang = (this.languageMapper && this.languageMapper(jobRequest.sourceLang)) ?? jobRequest.sourceLang;
                const targetLang = (this.languageMapper && this.languageMapper(jobRequest.targetLang)) ?? jobRequest.targetLang;
                const baseParams = {
                    'source_lang': sourceLang,
                    'target_lang': targetLang,
                    'split_sentences': this.splitSentences,
                    'preserve_formatting': this.preserveFormatting,
                    'tag_handling': 'xml',
                };
                this.formalityMap && this.formalityMap[targetLang] && (baseParams.formality = this.formalityMap[targetLang]);
                const searchParams = [
                    ...Object.entries(baseParams),
                    ...q.map(s => [ 'text', s]),
                ];
                const translateOp = await requestTranslationsTask.enqueue(
                    deeplTranslateChunkOp,
                    {
                        baseURL: this.baseURL,
                        headers: this.stdHeaders,
                        searchParams,
                        offset,
                    }
                );
                chunkOps.push(translateOp);
            }
            const rootOp = await requestTranslationsTask.enqueue(deeplMergeTranslatedChunksOp, {
                jobRequest,
                tuMeta,
                quality: this.quality,
                ts: this.ctx.regression ? 1 : new Date().getTime(),
            }, chunkOps);
            return await requestTranslationsTask.execute(rootOp);
        } catch (error) {
            throw `DeepL call failed - ${error}`;
        }
    }

    // sync api only for now
    async fetchTranslations() {
        throw 'DeepL is a synchronous-only provider';
    }

}
