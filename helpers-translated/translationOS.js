/* eslint-disable camelcase */
const { utils } = require('@l10nmonster/helpers');

function createTUFromTOSTranslation({ tosUnit, content, tuMeta, quality, refreshMode }) {
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
        tuMeta[guid].src && (tu.src = tuMeta[guid].src); // TODO: remove this
        tuMeta[guid].nsrc && (tu.nsrc = tuMeta[guid].nsrc);
        tu.ntgt = utils.extractNormalizedPartsV1(content, tuMeta[guid].phMap);
        if (tu.ntgt.filter(e => e === undefined).length > 0) {
            l10nmonster.logger.warn(`Unable to extract normalized parts of TU: ${JSON.stringify(tu)}`);
            return null;
        }
    } else {
        // simple content doesn't have meta
        tu.ntgt = [ content ];
    }
    return tu;
}

async function tosRequestTranslationOfChunkOp({ request }) {
    const { url, json, ...options } = request;
    options.body = JSON.stringify(json);
    const rawResponse = await fetch(url, options);
    if (rawResponse.ok) {
        const response = await (rawResponse.json());
        const submittedGuids = json.map(tu => tu.id_content);
        const committedGuids = response.map(contentStatus => contentStatus.id_content);
        const missingTus = submittedGuids.filter(submittedGuid => !committedGuids.includes(submittedGuid));
        if (submittedGuids.length !== committedGuids.length || missingTus.length > 0) {
            l10nmonster.logger.error(`sent ${submittedGuids.length} got ${committedGuids.length} missing tus: ${missingTus.map(tu => tu.id_content).join(', ')}`);
            throw `TOS: inconsistent behavior. submitted ${submittedGuids.length}, committed ${committedGuids.length}, missing ${missingTus.length}`;
        }
        return committedGuids;
    } else {
        throw `${rawResponse.status} ${rawResponse.statusText}: ${await rawResponse.text()}`;
    }
}

async function tosCombineTranslationChunksOp(args, committedGuids) {
    return committedGuids.flat(1);
}

async function tosFetchContentByGuidOp({ refreshMode, tuMap, tuMeta, request, quality, parallelism }) {
    const { url, json, ...options } = request;
    options.body = JSON.stringify(json);
    try {
        let tosContent = await (await fetch(url, options)).json();
        tosContent = tosContent.filter(tosUnit => tosUnit.translated_content_url);
        // eslint-disable-next-line no-invalid-this
        l10nmonster.logger.info(`Retrieved ${tosContent.length} translations from TOS`);
        refreshMode && (tosContent = tosContent.filter(tosUnit => !(tuMap[tosUnit.id_content].th === tosUnit.translated_content_hash))); // need to consider th being undefined/null for some entries
        // sanitize bad responses
        const fetchedTus = [];
        const seenGuids = {};
        while (tosContent.length > 0) {
            const chunk = tosContent.splice(0, parallelism);
            const fetchedRaw = (await Promise.all(chunk.map(tosUnit => fetch(tosUnit.translated_content_url)))).map(async r => await r.text());
            const fetchedContent = await Promise.all(fetchedRaw);
            (await Promise.all(chunk.map(tosUnit => fetch(tosUnit.translated_content_url)))).map(async r => await r.text());
            // eslint-disable-next-line no-invalid-this
            l10nmonster.logger.info(`Fetched ${chunk.length} pieces of content from AWS`);
            chunk.forEach((tosUnit, idx) => {
                if (seenGuids[tosUnit.id_content]) {
                    throw `TOS: Duplicate translations found for guid: ${tosUnit.id_content}`;
                } else {
                    seenGuids[tosUnit.id_content] = true;
                }
                if (fetchedContent[idx] !== null && fetchedContent[idx].indexOf('|||UNTRANSLATED_CONTENT_START|||') === -1) {
                    // eslint-disable-next-line no-invalid-this
                    const newTU = createTUFromTOSTranslation({ tosUnit, content: fetchedContent[idx], tuMeta, quality, refreshMode });
                    fetchedTus.push(newTU);
                } else {
                    // eslint-disable-next-line no-invalid-this
                    l10nmonster.logger.info(`TOS: for guid ${tosUnit.id_content} retrieved untranslated content ${fetchedContent[idx]}`);
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

module.exports = class TranslationOS {
    constructor({ baseURL, apiKey, costAttributionLabel, serviceType, quality, tuDecorator, maxTranslationRequestSize, maxFetchSize, parallelism, requestOnly }) {
        if ((apiKey && quality) === undefined) {
            throw 'You must specify apiKey, quality for TranslationOS';
        } else {
            this.baseURL = baseURL ?? 'https://api.translated.com/v2';
            this.stdHeaders = {
                'x-api-key': apiKey,
                'user-agent': 'l10n.monster/TOS v0.1',
                'Content-Type': 'application/json',
            }
            this.serviceType = serviceType ?? 'premium';
            this.costAttributionLabel = costAttributionLabel;
            this.quality = quality;
            this.tuDecorator = tuDecorator;
            this.maxTranslationRequestSize = maxTranslationRequestSize || 100;
            this.maxFetchSize = maxFetchSize || 512;
            this.parallelism = parallelism || 128;
            this.requestOnly = requestOnly;
            l10nmonster.opsMgr.registerOp(tosRequestTranslationOfChunkOp, { idempotent: false });
            l10nmonster.opsMgr.registerOp(tosCombineTranslationChunksOp, { idempotent: true });
            l10nmonster.opsMgr.registerOp(tosFetchContentByGuidOp, { idempotent: true });
            l10nmonster.opsMgr.registerOp(tosCombineFetchedTusOp, { idempotent: true });
        }
    }

    async requestTranslations(jobRequest) {
        const { tus, ...jobResponse } = jobRequest;
        const { contentMap, phNotes } = utils.getTUMaps(tus);
        const tosPayload = tus.map(tu => {
            const notes = typeof tu.notes === 'string' ? utils.extractStructuredNotes(tu.notes) : tu.notes;
            let tosTU = {
                'id_order': jobRequest.jobGuid,
                'id_content': tu.guid,
                content: contentMap[tu.guid],
                metadata: 'mf=v1',
                context: {
                    notes: `${notes?.maxWidth ? `▶▶▶MAXIMUM WIDTH ${notes.maxWidth} chars◀◀◀\n` : ''}${notes?.desc ?? ''}${phNotes[tu.guid] ?? ''}\n rid: ${tu.rid}\n sid: ${tu.sid}\n ${tu.seq ? `seq: id_${utils.integerToLabel(tu.seq)}` : ''}`
                },
                'source_language': jobRequest.sourceLang,
                'target_languages': [ jobRequest.targetLang ],
                // 'content_type': 'text/html',
                'service_type': this.serviceType,
                'cost_attribution_label': this.costAttributionLabel,
                'dashboard_query_labels': [],
            };
            notes?.screenshot && (tosTU.context.screenshot = notes.screenshot);
            jobRequest.instructions && (tosTU.context.instructions = jobRequest.instructions);
            tu.seq && tosTU.dashboard_query_labels.push(`id_${utils.integerToLabel(tu.seq)}`);
            tu.rid && tosTU.dashboard_query_labels.push(tu.rid.slice(-50));
            tosTU.dashboard_query_labels.push(tu.sid.replaceAll('\n', '').slice(-50));
            if (tu.prj !== undefined) {
                // eslint-disable-next-line camelcase
                tosTU.id_order_group = tu.prj;
            }
            if (typeof this.tuDecorator === 'function') {
                tosTU = this.tuDecorator(tosTU, tu, jobResponse);
            }
            return tosTU;
        });

        const requestTranslationsTask = l10nmonster.opsMgr.createTask();
        try {
            let chunkNumber = 0;
            const chunkOps = [];
            while (tosPayload.length > 0) {
                const json = tosPayload.splice(0, this.maxTranslationRequestSize);
                chunkNumber++;
                l10nmonster.logger.info(`Enqueueing TOS translation job ${jobResponse.jobGuid} chunk size: ${json.length}`);
                chunkOps.push(requestTranslationsTask.enqueue(tosRequestTranslationOfChunkOp, {
                    request: {
                        url: `${this.baseURL}/translate`,
                        method: 'POST',
                        json,
                        headers: {
                            ...this.stdHeaders,
                            'x-idempotency-id': `jobGuid:${jobRequest.jobGuid} chunk:${chunkNumber}`,
                        },
                    },
                 }));
            }
            requestTranslationsTask.commit(tosCombineTranslationChunksOp, null, chunkOps);
            jobResponse.taskName = requestTranslationsTask.taskName;
            const committedGuids = await requestTranslationsTask.execute();
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
        const guids = reqTus.filter(tu => tu.src ?? tu.nsrc).map(tu => tu.guid); // TODO: remove .src
        const refreshTranslationsTask = l10nmonster.opsMgr.createTask();
        let chunkNumber = 0;
        const refreshOps = [];
        while (guids.length > 0) {
            chunkNumber++;
            const guidsInChunk = guids.splice(0, this.maxFetchSize);
            const tusInChunk = reqTus.filter(tu => guidsInChunk.includes(tu.guid));
            const tuMap = tusInChunk.reduce((p,c) => (p[c.guid] = c, p), {});
            const { tuMeta } = utils.getTUMaps(tusInChunk);
            l10nmonster.logger.verbose(`Enqueueing refresh of TOS chunk ${chunkNumber} (${guidsInChunk.length} units)...`);
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
            refreshOps.push(refreshTranslationsTask.enqueue(tosFetchContentByGuidOp, {
                refreshMode,
                tuMap,
                tuMeta,
                request: {
                    url: `${this.baseURL}/status`,
                    method: 'POST',
                    json,
                    headers: this.stdHeaders,
                },
                quality: this.quality,
                parallelism: this.parallelism,
            }));
        }
        refreshTranslationsTask.commit(tosCombineFetchedTusOp, null, refreshOps);
        const jobResponse = await refreshTranslationsTask.execute();
        jobResponse.taskName = refreshTranslationsTask.taskName;
        return jobResponse;
    }

    async fetchTranslations(pendingJob, jobRequest) {
        const { inflight, ...jobResponse } = pendingJob;
        const reqTus = jobRequest.tus.filter(tu => inflight.includes(tu.guid));
        const tus = await this.#fetchTranslatedTus({ jobGuid: pendingJob.originalJobGuid ?? jobRequest.originalJobGuid ?? jobRequest.jobGuid, targetLang: jobRequest.targetLang, reqTus, refreshMode: false });
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
            tus: await this.#fetchTranslatedTus({ targetLang: jobRequest.originalJobGuid ?? jobRequest.targetLang, reqTus: jobRequest.tus, refreshMode: true }),
            status: 'done',
        };
    }
}
