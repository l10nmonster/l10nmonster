/* eslint-disable camelcase */
import got from 'got';

import { extractNormalizedPartsV1, getTUMaps } from '../normalizers/util.js';
import { integerToLabel } from '../shared.js';

function createTUFromTOSTranslation({ tosUnit, content, tuMeta, quality, refreshMode, logger }) {
    const guid = tosUnit.id_content;
    !content && (content = tosUnit.translated_content);
    const tu = {
        guid,
        ts: new Date().getTime(), // actual_delivery_date is garbage as it doesn't change after a bugfix, so it's better to use the retrieval time
        q: quality,
        th: tosUnit.translated_content_hash, // this is vendor-specific but it's ok to generalize
    };
    !refreshMode && (tu.cost = [ tosUnit.total, tosUnit.currency, tosUnit.wc_raw, tosUnit.wc_weighted ]);
    if (tosUnit.revised_words) {
        tu.rev = [ tosUnit.revised_words, tosUnit.error_points ?? 0];
    }
    if (tuMeta[guid]) {
        tuMeta[guid].src && (tu.src = tuMeta[guid].src);
        tuMeta[guid].nsrc && (tu.nsrc = tuMeta[guid].nsrc);
        tu.ntgt = extractNormalizedPartsV1(content, tuMeta[guid].phMap);
        if (tu.ntgt.filter(e => e === undefined).length > 0) {
            logger.warn(`Unable to extract normalized parts of TU: ${JSON.stringify(tu)}`);
            return null;
        }
    } else {
        tu.tgt = content;
    }
    return tu;
}

async function tosRequestTranslationOfChunkOp({ request }) {
    let response;
    try {
        response = await got.post(request).json();
    } catch(error) {
        throw `${error.toString()}: ${error.response?.body}`;
    }
    const submittedGuids = request.json.map(tu => tu.id_content);
    const committedGuids = response.map(contentStatus => contentStatus.id_content);
    const missingTus = submittedGuids.filter(submittedGuid => !committedGuids.includes(submittedGuid));
    if (submittedGuids.length !== committedGuids.length || missingTus.length > 0) {
        console.error(`sent ${submittedGuids.length} got ${committedGuids.length} missing tus: ${missingTus.map(tu => tu.id_content).join(', ')}`);
        throw "inconsistent behavior!";
    }
    return committedGuids;
}

async function tosCombineTranslationChunksOp(args, committedGuids) {
    return committedGuids.flat(1);
}

async function tosFetchContentByGuidOp({ refreshMode, tuMap, tuMeta, request, quality, parallelism }) {
    try {
        let tosContent = (await got.post(request).json());
        tosContent = tosContent.filter(tosUnit => tosUnit.translated_content_url);
        // eslint-disable-next-line no-invalid-this
        this.logger.info(`Retrieved ${tosContent.length} translations from TOS`);
        refreshMode && (tosContent = tosContent.filter(tosUnit => !(tuMap[tosUnit.id_content].th === tosUnit.translated_content_hash))); // need to consider th being undefined/null for some entries
        // sanitize bad responses
        const fetchedTus = [];
        const seenGuids = {};
        while (tosContent.length > 0) {
            const chunk = tosContent.splice(0, parallelism);
            const fetchedContent = await Promise.all(chunk.map(tosUnit => got(tosUnit.translated_content_url).text()));
            // eslint-disable-next-line no-invalid-this
            this.logger.info(`Fetched ${chunk.length} pieces of content from AWS`);
            chunk.forEach((tosUnit, idx) => {
                if (seenGuids[tosUnit.id_content]) {
                    throw `TOS: Duplicate translations found for guid: ${tosUnit.id_content}`;
                } else {
                    seenGuids[tosUnit.id_content] = true;
                }
                if (fetchedContent[idx] !== null && fetchedContent[idx].indexOf('|||UNTRANSLATED_CONTENT_START|||') === -1) {
                    // eslint-disable-next-line no-invalid-this
                    const newTU = createTUFromTOSTranslation({ tosUnit, content: fetchedContent[idx], tuMeta, quality, refreshMode, logger: this.logger });
                    fetchedTus.push(newTU);
                } else {
                    // eslint-disable-next-line no-invalid-this
                    this.logger.info(`TOS: for guid ${tosUnit.id_content} retrieved untranslated content ${fetchedContent[idx]}`);
                }
            });
        }
        return fetchedTus;
    } catch(error) {
        throw `${error.toString()}: ${error.response?.body ?? error.stack}`;
    }
}

async function tosCombineFetchedTusOp(args, tuChunks) {
    return tuChunks.flat(1).filter(tu => Boolean(tu));
}

export class TranslationOS {
    constructor({ baseURL, apiKey, serviceType, quality, tuDecorator, maxTranslationRequestSize, maxFetchSize, parallelism, requestOnly }) {
        if ((apiKey && quality) === undefined) {
            throw 'You must specify apiKey, quality for TranslationOS';
        } else {
            this.baseURL = baseURL ?? 'https://api.translated.com/v2';
            this.stdHeaders = {
                'x-api-key': apiKey,
                'user-agent': 'l10n.monster/TOS v0.1',
            }
            this.serviceType = serviceType ?? 'premium',
            this.quality = quality;
            this.tuDecorator = tuDecorator;
            this.maxTranslationRequestSize = maxTranslationRequestSize || 100;
            this.maxFetchSize = maxFetchSize || 512;
            this.parallelism = parallelism || 128;
            this.requestOnly = requestOnly;
            this.ctx.opsMgr.registerOp(tosRequestTranslationOfChunkOp, { idempotent: false });
            this.ctx.opsMgr.registerOp(tosCombineTranslationChunksOp, { idempotent: true });
            this.ctx.opsMgr.registerOp(tosFetchContentByGuidOp, { idempotent: true });
            this.ctx.opsMgr.registerOp(tosCombineFetchedTusOp, { idempotent: true });
        }
    }

    async requestTranslations(jobRequest) {
        const { tus, ...jobResponse } = jobRequest;
        const { contentMap, phNotes } = getTUMaps(tus);
        const tosPayload = tus.map(tu => {
            let tosTU = {
                'id_order': jobRequest.jobGuid,
                'id_content': tu.guid,
                content: contentMap[tu.guid],
                metadata: 'mf=v1',
                context: {
                    notes: `${tu.notes ?? ''}${phNotes[tu.guid] ?? ''}\n rid: ${tu.rid}\n sid: ${tu.sid}\n guid: ${tu.guid}\n ${tu.seq ? `seq: id_${integerToLabel(tu.seq)}` : ''}`
                },
                'source_language': jobRequest.sourceLang,
                'target_languages': [ jobRequest.targetLang ],
                // 'content_type': 'text/html',
                'service_type': this.serviceType,
                'dashboard_query_labels': [],
            };
            jobRequest.instructions && (tosTU.context.instructions = jobRequest.instructions);
            tu.seq && tosTU.dashboard_query_labels.push(`id_${integerToLabel(tu.seq)}`);
            tu.rid && tosTU.dashboard_query_labels.push(tu.rid.slice(-50));
            (tu.sid !== tu.src) && tosTU.dashboard_query_labels.push(tu.sid.replaceAll('\n', '').slice(-50));
            if (tu.prj !== undefined) {
                // eslint-disable-next-line camelcase
                tosTU.id_order_group = tu.prj;
            }
            if (typeof this.tuDecorator === 'function') {
                tosTU = this.tuDecorator(tosTU, tu, jobResponse);
            }
            return tosTU;
        });

        const requestTranslationsTask = this.ctx.opsMgr.createTask();
        try {
            let chunkNumber = 0;
            const chunkOps = [];
            while (tosPayload.length > 0) {
                const json = tosPayload.splice(0, this.maxTranslationRequestSize);
                chunkNumber++;
                this.ctx.logger.info(`Enqueueing TOS translation job ${jobResponse.jobGuid} chunk size: ${json.length}`);
                chunkOps.push(await requestTranslationsTask.enqueue(tosRequestTranslationOfChunkOp, {
                    request: {
                        url: `${this.baseURL}/translate`,
                        json,
                        headers: {
                            ...this.stdHeaders,
                            'x-idempotency-id': `jobGuid:${jobRequest.jobGuid} chunk:${chunkNumber}`,
                        },
                        timeout: {
                            request: 30000,
                        },
                    },
                 }));
            }
            const combineChunksOp = await requestTranslationsTask.enqueue(tosCombineTranslationChunksOp, null, chunkOps);
            const committedGuids = await requestTranslationsTask.execute(combineChunksOp);
            if (this.requestOnly) {
                return {
                    ...jobResponse,
                    tus: [],
                    status: 'done'
                };
            }
            return {
                ...jobResponse,
                inflight: committedGuids,
                status: 'pending'
            };
        } catch (error) {
            throw `TOS call failed - ${error}`;
        }
    }

    async #fetchTranslatedTus({ jobGuid, targetLang, reqTus, refreshMode }) {
        const guids = reqTus.filter(tu => tu.src ?? tu.nsrc).map(tu => tu.guid);
        const refreshTranslationsTask = this.ctx.opsMgr.createTask();
        let chunkNumber = 0;
        const refreshOps = [];
        while (guids.length > 0) {
            chunkNumber++;
            const guidsInChunk = guids.splice(0, this.maxFetchSize);
            const tusInChunk = reqTus.filter(tu => guidsInChunk.includes(tu.guid));
            const tuMap = tusInChunk.reduce((p,c) => (p[c.guid] = c, p), {});
            const { tuMeta } = getTUMaps(tusInChunk);
            this.ctx.logger.verbose(`Enqueueing refresh of TOS chunk ${chunkNumber} (${guidsInChunk.length} units)...`);
            const json = {
                id_content: guidsInChunk,
                target_language: targetLang,
                fetch_content: false,
                limit: this.maxFetchSize,
            };
            if (refreshMode) {
                json.status = ['delivered', 'invoiced'];
                json.last_delivered_only = true;
            } else {
                json.id_order = jobGuid;
            }
            const refreshOp = await refreshTranslationsTask.enqueue(tosFetchContentByGuidOp, {
                refreshMode,
                tuMap,
                tuMeta,
                request: {
                    url: `${this.baseURL}/status`,
                    json,
                    headers: this.stdHeaders,
                    timeout: {
                        request: 60000,
                    },
                },
                quality: this.quality,
                parallelism: this.parallelism,
            });
            refreshOps.push(refreshOp);
        }
        const rootOp = await refreshTranslationsTask.enqueue(tosCombineFetchedTusOp, null, refreshOps);
        return await refreshTranslationsTask.execute(rootOp);
    }

    async fetchTranslations(pendingJob, jobRequest) {
        const { inflight, ...jobResponse } = pendingJob;
        const reqTus = jobRequest.tus.filter(tu => inflight.includes(tu.guid));
        const tus = await this.#fetchTranslatedTus({ jobGuid: jobRequest.jobGuid, targetLang: jobRequest.targetLang, reqTus, refreshMode: false });
        const tuMap = tus.reduce((p,c) => (p[c.guid] = c, p), {});
        const nowInflight = inflight.filter(guid => !tuMap[guid]);
        if (tus.length > 0) {
            const response = {
                ...jobResponse,
                tus,
                status: nowInflight.length === 0 ? 'done' : 'pending',
            };
            nowInflight.length > 0 && (response.inflight = nowInflight);
            return response;
        }
        return null;
    }

    async refreshTranslations(jobRequest) {
        return {
            ...jobRequest,
            tus: await this.#fetchTranslatedTus({ targetLang: jobRequest.targetLang, reqTus: jobRequest.tus, refreshMode: true }),
            status: 'done',
        };
    }
}
