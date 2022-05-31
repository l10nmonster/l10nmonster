/* eslint-disable camelcase */
import got from 'got';

import { flattenNormalizedSourceV1, extractNormalizedPartsV1 } from '../normalizers/util.js';

function getTUMaps(tus) {
    const contentMap = {};
    const tuMeta = {};
    const phNotes = {};
    for (const tu of tus) {
        const guid = tu.guid;
        if (tu.nsrc) {
            const [normalizedStr, phMap ] = flattenNormalizedSourceV1(tu.nsrc);
            contentMap[guid] = normalizedStr;
            if (Object.keys(phMap).length > 0) {
                tuMeta[guid] = { contentType: tu.contentType, phMap, nsrc: tu.nsrc };
                phNotes[guid] = Object.entries(phMap)
                    .reduce((p, c) => `${p} ${c[0]}=${c[1].v}`, '\n ph:')
                    .replaceAll('<', 'ᐸ')
                    .replaceAll('>', 'ᐳ'); // hack until they stop stripping html
            }
            if (tu.ntgt) {
                // eslint-disable-next-line no-unused-vars
                const [normalizedStr, phMap ] = flattenNormalizedSourceV1(tu.ntgt);
                phNotes[guid] += `\n current translation: ${normalizedStr}`;
            }
        } else {
            contentMap[guid] = tu.src;
            tuMeta[guid] = { src: tu.src };
            if (tu.tgt) {
                phNotes[guid] = `\n current translation: ${tu.tgt}`;
            }
        }
    }
    return [ contentMap, tuMeta, phNotes ];
}

function createTUFromTOSTranslation({ tosUnit, content, tuMeta, quality, verbose }) {
    const guid = tosUnit.id_content;
    !content && (content = tosUnit.translated_content);
    const tu = {
        guid,
        ts: new Date().getTime(), // actual_delivery_date is garbage as it doesn't change after a bugfix, so it's better to use the retrieval time
        q: quality,
        cost: [ tosUnit.total, tosUnit.currency, tosUnit.wc_raw, tosUnit.wc_weighted ],
        th: tosUnit.translated_content_hash, // this is vendor-specific but it's ok to generalize
    };
    if (tuMeta[guid]) {
        tuMeta[guid].src && (tu.src = tuMeta[guid].src);
        tuMeta[guid].nsrc && (tu.nsrc = tuMeta[guid].nsrc);
        tu.contentType = tuMeta[guid].contentType;
        tu.ntgt = extractNormalizedPartsV1(content, tuMeta[guid].phMap);
        if (tu.ntgt.filter(e => e === undefined).length > 0) {
            verbose && console.error(`Unable to extract normalized parts of TU: ${JSON.stringify(tu)}`);
            return null;
        }
    } else {
        tu.tgt = content;
    }
    return tu;
}

// TODO: externalize this ase general-purpose Op
async function gotPostOp(request) {
    try {
        return await got.post(request).json();
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

async function tosProcessRequestTranslationResponseOp({ submittedGuids }, responses) {
    const response = responses[0];
    const committedGuids = response.map(contentStatus => contentStatus.id_content);
    const missingTus = submittedGuids.filter(submittedGuid => !committedGuids.includes(submittedGuid));
    if (submittedGuids.length !== committedGuids.length || missingTus.length > 0) {
        console.error(`sent ${submittedGuids.length} got ${committedGuids.length} missing tus: ${missingTus.map(tu => tu.id_content).join(', ')}`);
        throw "inconsistent behavior!";
    }
    return committedGuids;
}

async function tosRequestTranslationsOp({ jobManifest }, committedGuids) {
    jobManifest.inflight = committedGuids.flat(1);
    jobManifest.status = 'pending';
    return jobManifest;
}

export class TranslationOS {
    constructor({ baseURL, apiKey, serviceType, quality, tuDecorator, trafficStore, chunkSize, requestOnly }) {
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
            this.trafficStore = trafficStore;
            this.chunkSize = chunkSize || 100;
            this.requestOnly = requestOnly;
            this.ctx.opsMgr.registerOp(gotPostOp, { idempotent: false });
            this.ctx.opsMgr.registerOp(tosProcessRequestTranslationResponseOp, { idempotent: true });
            this.ctx.opsMgr.registerOp(tosRequestTranslationsOp, { idempotent: true });
        }
    }

    async requestTranslations(jobRequest) {
        const { tus, ...jobManifest } = jobRequest;
        const [ contentMap, tuMeta, phNotes ] = getTUMaps(tus);
        const tosPayload = tus.map(tu => {
            let tosTU = {
                'id_order': jobRequest.jobGuid,
                'id_content': tu.guid,
                content: contentMap[tu.guid],
                metadata: 'mf=v1',
                context: {
                    notes: `${tu.notes ?? ''}${phNotes[tu.guid] ?? ''}\n rid: ${tu.rid}\n sid: ${tu.sid}\n guid: ${tu.guid}`
                },
                'source_language': jobRequest.sourceLang,
                'target_languages': [ jobRequest.targetLang ],
                // 'content_type': 'text/html',
                'service_type': this.serviceType,
                'dashboard_query_labels': [ tu.rid.slice(-50) ],
            };
            (tu.sid !== tu.src) && tosTU.dashboard_query_labels.push(tu.sid.replaceAll('\n', '').slice(-50));
            if (tu.prj !== undefined) {
                // eslint-disable-next-line camelcase
                tosTU.id_order_group = tu.prj;
            }
            if (typeof this.tuDecorator === 'function') {
                tosTU = this.tuDecorator(tosTU, tu, jobManifest);
            }
            return tosTU;
        });
        if (Object.keys(tuMeta).length > 0) {
            jobManifest.envelope ??= {};
            jobManifest.envelope.mf = 'v1';
            jobManifest.envelope.tuMeta = JSON.stringify(tuMeta);
        }

        const requestTranslationsTask = this.ctx.opsMgr.createTask();
        try {
            let chunkNumber = 0;
            const chunkOps = [];
            while (tosPayload.length > 0) {
                const json = tosPayload.splice(0, this.chunkSize);
                chunkNumber++;
                const request = {
                    url: `${this.baseURL}/translate`,
                    json,
                    headers: {
                        ...this.stdHeaders,
                        'x-idempotency-id': `jobGuid:${jobRequest.jobGuid} chunk:${chunkNumber}`,
                    },
                    timeout: {
                        request: 30000,
                    },
                };
                this.ctx.verbose && console.log(`Pushing to TOS job ${jobManifest.jobGuid} chunk size: ${json.length}`);
                const gotOp = await requestTranslationsTask.enqueue(gotPostOp, request);
                const submittedGuids = json.map(tu => tu.id_content);
                chunkOps.push(await requestTranslationsTask.enqueue(tosProcessRequestTranslationResponseOp, { submittedGuids }, [ gotOp ]));
            }
            const rootOp = await requestTranslationsTask.enqueue(tosRequestTranslationsOp, { jobManifest }, chunkOps);
            const jobResponse = await requestTranslationsTask.execute(rootOp);
            this.requestOnly && (jobResponse.status = 'done');
            return jobResponse;
        } catch (error) {
            throw `TOS call failed - ${error}`;
        }
    }

    // eslint-disable-next-line complexity
    async fetchTranslations(jobManifest) {
        const tuMeta = JSON.parse(jobManifest?.envelope?.tuMeta ?? '{}');
        const request = {
            url: `${this.baseURL}/status`,
            json: {
                'id_order': jobManifest.jobGuid,
                // status: 'delivered', we don't filter here because it makes pagination unreliable
                'fetch_content': true,
            },
            headers: this.stdHeaders,
        };
        const tusMap = {};
        let offset = 0,
            response;
        do {
            request.json = {
                ...request.json,
                offset,
                limit: this.chunkSize,
            }
            try {
                this.ctx.verbose && console.log(`Fetching from TOS job ${jobManifest.jobGuid} offset ${offset} limit ${this.chunkSize}`);
                this.trafficStore && await this.trafficStore.logRequest('postStatus', request);
                response = await got.post(request).json();
                this.trafficStore && await this.trafficStore.logResponse('postStatus-ok', response);
            } catch (error) {
                this.trafficStore && await this.trafficStore.logResponse('postStatus-error', error);
                console.error(error?.response?.body || error);
                throw "TOS call failed!";
            }
            for (const tosUnit of response) {
                if (tosUnit.translated_content === null || ![ 'delivered', 'invoiced' ].includes(tosUnit.status) || tosUnit.translated_content.indexOf('|||UNTRANSLATED_CONTENT_START|||') >= 0) {
                    this.ctx.verbose && console.log(`id_order: ${tosUnit.id_order} id_content: ${tosUnit.id} status: ${tosUnit.status} translated_content: ${tosUnit.translated_content}`);
                } else {
                    const guid = tosUnit.id_content;
                    if (jobManifest.inflight.includes(guid)) {
                        tusMap[guid] && console.error(`Duplicate translations found for guid: ${guid}`);
                        tusMap[guid] = createTUFromTOSTranslation({ tosUnit, tuMeta, quality: this.quality, verbose: this.verbose });
                        !tusMap[guid] && delete tusMap[guid];
                    } else {
                        console.error(`Found unexpected guid: ${guid}`);
                    }
                }
            }
            offset += this.chunkSize;
        } while (response.length === this.chunkSize);
        const tus = Object.values(tusMap);
        const { ...newManifest } = jobManifest;
        const missingGuids = jobManifest.inflight.filter(guid => tusMap[guid] === undefined);
        if (missingGuids.length === 0) {
            newManifest.status = 'done';
        } else {
            if (this.ctx.verbose && tus.length > 0) { // if we got something but not all, log the delta
                console.log(`Got ${tus.length} translations from TOS for job ${jobManifest.jobGuid} and was expecting ${jobManifest.inflight.length} -- missing the following:`);
                for (const guid of jobManifest.inflight) {
                    if (!tusMap[guid]) {
                        console.log(guid);
                    }
                }
            }
        }
        if (tus.length > 0) {
            newManifest.tus = tus;
            return newManifest;
        }
        return null;
    }
}

const MAX_TOS_REFRESH_CHUNK_SIZE = 1000;

export class TOSRefresh {
    constructor({ baseURL, apiKey, quality }) {
        if ((apiKey && quality) === undefined) {
            throw 'You must specify apiKey, quality for TOSRefresh';
        } else {
            this.baseURL = baseURL ?? 'https://api.translated.com/v2';
            this.stdHeaders = {
                'x-api-key': apiKey,
                'user-agent': 'l10n.monster/TOSRefresh v0.1',
            }
            this.quality = quality;
        }
    }

    async requestTranslations(jobRequest) {
        const { tus, ...newManifest } = jobRequest;
        const tuMap = tus.reduce((p,c) => (p[c.guid] = c, p), {});
        const guidsToRefresh = tus.filter(tu => tu.src ?? tu.nsrc).map(tu => tu.guid);
        // eslint-disable-next-line no-unused-vars
        const [ contentMap, tuMeta, phNotes ] = getTUMaps(tus);
        let chunkNumber = 0;
        const refreshedTus = [];
        try {
            while (guidsToRefresh.length > 0) {
                const guids = guidsToRefresh.splice(0, MAX_TOS_REFRESH_CHUNK_SIZE);
                chunkNumber++;
                this.ctx.verbose && console.log(`Refreshing TOS chunk ${chunkNumber} (${guids.length} units)...`);
                const latestContent = await got.post({
                    url: `${this.baseURL}/status`,
                    json: {
                        id_content: guids,
                        target_language: jobRequest.targetLang,
                        last_delivered_only: true,
                        status: ['delivered', 'invoiced'],
                        fetch_content: false,
                        limit: MAX_TOS_REFRESH_CHUNK_SIZE,
                    },
                    headers: this.stdHeaders,
                    timeout: {
                        request: 60000,
                    },
                }).json();
                for (const tosUnit of latestContent) {
                    const tu = tuMap[tosUnit.id_content];
                    if (tu.th !== tosUnit.translated_content_hash) {
                        this.ctx.verbose && console.log(`Fetching content id ${tosUnit.id}...`);
                        const content = await got(tosUnit.translated_content_url).text();
                        const newTU = createTUFromTOSTranslation({ tosUnit, content, tuMeta, quality: this.quality, verbose: this.verbose });
                        delete newTU.cost;
                        refreshedTus.push(newTU);
                    }
                }
            }
        } catch(e) {
            throw e.toString();
        }
        newManifest.tus = refreshedTus;
        newManifest.status = 'done';
        return newManifest;
    }

    async fetchTranslations() {
        throw 'TOSRefresh is a synchronous-only provider';
    }
}
