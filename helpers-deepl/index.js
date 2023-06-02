const { sharedCtx, utils } = require('@l10nmonster/helpers');

const MAX_CHUNK_SIZE = 50;

async function deeplTranslateChunkOp({ baseURL, headers, searchParams, offset}) {
    try {
        const response = await fetch({
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
        throw `${error.toString()}: ${error.response?.body}`;
    }
}

async function deeplMergeTranslatedChunksOp({ jobRequest, tuMeta, quality, ts }, chunks) {
    const { tus, ...jobResponse } = jobRequest;
    const translations = Object.assign({}, ...chunks);
    jobResponse.tus = tus.map((tu, idx) => {
        const translation = { guid: tu.guid, ts };
        const ntgt = utils.extractNormalizedPartsFromXmlV1(translations[idx] || {}, tuMeta[idx] || {});
        if (tu.nsrc) {
            translation.ntgt = ntgt;
        } else {
            translation.tgt = ntgt[0];
        }
        translation.q = quality;
        return translation;
    });
    jobResponse.status = 'done';
    return jobResponse;
}

exports.DeepL = class DeepL {
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
            sharedCtx().opsMgr.registerOp(deeplTranslateChunkOp, { idempotent: false });
            sharedCtx().opsMgr.registerOp(deeplMergeTranslatedChunksOp, { idempotent: true });
        }
    }

    async requestTranslations(jobRequest) {
        const tuMeta = {};
        const deeplPayload = jobRequest.tus.map((tu, idx) => {
            const [xmlSrc, phMap ] = utils.flattenNormalizedSourceToXmlV1(tu.nsrc || [ tu.src ]);
            if (Object.keys(phMap).length > 0) {
                tuMeta[idx] = phMap;
            }
            return xmlSrc;
        });

        const requestTranslationsTask = sharedCtx().opsMgr.createTask();
        try {
            const chunkOps = [];
            for (let currentIdx = 0; currentIdx < deeplPayload.length;) {
                const offset = currentIdx;
                const q = [];
                while (currentIdx < deeplPayload.length && q.length < MAX_CHUNK_SIZE) {
                    q.push(deeplPayload[currentIdx]);
                    currentIdx++;
                }
                sharedCtx().logger.info(`Preparing DeepL translate, offset: ${offset} chunk strings: ${q.length}`);
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
                const translateOp = requestTranslationsTask.enqueue(
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
            requestTranslationsTask.commit(deeplMergeTranslatedChunksOp, {
                jobRequest,
                tuMeta,
                quality: this.quality,
                ts: sharedCtx().regression ? 1 : new Date().getTime(),
            }, chunkOps);
            const jobResponse = await requestTranslationsTask.execute();
            jobResponse.taskName = requestTranslationsTask.taskName;
            return jobResponse;
        } catch (error) {
            throw `DeepL call failed - ${error}`;
        }
    }

    // sync api only for now
    async fetchTranslations() {
        throw 'DeepL is a synchronous-only provider';
    }


    async refreshTranslations(jobRequest) {
        const fullResponse = await this.requestTranslations(jobRequest);
        const reqTuMap = jobRequest.tus.reduce((p,c) => (p[c.guid] = c, p), {});
        return {
            ...fullResponse,
            tus: fullResponse.tus.filter(tu => !utils.normalizedStringsAreEqual(reqTuMap[tu.guid].ntgt ?? reqTuMap[tu.guid].tgt, tu.ntgt ?? tu.tgt)),
        };
    }
}
