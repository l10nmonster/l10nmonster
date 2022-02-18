import got from 'got';

import { flattenNormalizedSourceV1, extractNormalizedPartsV1 } from '../normalizers/util.js';

// TODO: externalize this ase general-purpose Op
async function gotPostOp(request) {
    return await got.post(request).json();
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

// This is the chunking size for both upload and download
const limit = 150;

export class TranslationOS {
    constructor({ baseURL, apiKey, serviceType, quality, tuDecorator, trafficStore }) {
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
            this.ctx.opsMgr.registerOp(gotPostOp, { idempotent: false });
            this.ctx.opsMgr.registerOp(tosProcessRequestTranslationResponseOp, { idempotent: true });
            this.ctx.opsMgr.registerOp(tosRequestTranslationsOp, { idempotent: true });
        }
    }

    async requestTranslations(jobRequest) {
        const { tus, ...jobManifest } = jobRequest;
        const tuMeta = {};
        const tosPayload = tus.map(tu => {
            let phNotes = null;
            let content = tu.src;
            if (tu.nsrc) {
                const [normalizedStr, phMap ] = flattenNormalizedSourceV1(tu.nsrc);
                content = normalizedStr;
                if (Object.keys(phMap).length > 0) {
                    tuMeta[tu.guid] = { contentType: tu.contentType, phMap };
                    phNotes = Object.entries(phMap)
                        .reduce((p, c) => `${p} ${c[0]}=${c[1].v}`, '\n ph:')
                        .replaceAll('<', 'ᐸ')
                        .replaceAll('>', 'ᐳ'); // hack until they stop stripping html
                }
            }
            let tosTU = {
                'id_order': jobRequest.jobGuid,
                'id_content': tu.guid,
                content,
                metadata: 'mf=v1',
                context: {
                    notes: `${tu.notes ?? ''}${phNotes ?? ''}\n rid: ${tu.rid}\n sid: ${tu.sid}\n guid: ${tu.guid}`
                },
                'source_language': jobRequest.sourceLang,
                'target_languages': [ jobRequest.targetLang ],
                // 'content_type': 'text/html',
                'service_type': this.serviceType,
                'dashboard_query_labels': [ tu.rid ],
            };
            (tu.sid !== tu.src) && tosTU.dashboard_query_labels.push(tu.sid);
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
                const json = tosPayload.splice(0, limit);
                chunkNumber++;
                const request = {
                    url: `${this.baseURL}/translate`,
                    json,
                    headers: {
                        ...this.stdHeaders,
                        'x-idempotency-id': `jobGuid:${jobRequest.jobGuid} chunk:${chunkNumber}`,
                    }
                };
                this.ctx.verbose && console.log(`Pushing to TOS job ${jobManifest.jobGuid} chunk size: ${json.length}`);
                const gotOp = await requestTranslationsTask.enqueue(gotPostOp, request);
                const submittedGuids = json.map(tu => tu.id_content);
                chunkOps.push(await requestTranslationsTask.enqueue(tosProcessRequestTranslationResponseOp, { submittedGuids }, [ gotOp ]));
            }
            const rootOp = await requestTranslationsTask.enqueue(tosRequestTranslationsOp, { jobManifest }, chunkOps);
            return await requestTranslationsTask.execute(rootOp);
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
                limit,
            }
            try {
                this.ctx.verbose && console.log(`Fetching from TOS job ${jobManifest.jobGuid} offset ${offset} limit ${limit}`);
                this.trafficStore && await this.trafficStore.logRequest('postStatus', request);
                response = await got.post(request).json();
                this.trafficStore && await this.trafficStore.logResponse('postStatus-ok', response);
            } catch (error) {
                this.trafficStore && await this.trafficStore.logResponse('postStatus-error', error);
                console.error(error?.response?.body || error);
                throw "TOS call failed!";
            }
            for (const translation of response) {
                if (translation.translated_content === null || translation.status !== 'delivered' || translation.translated_content.indexOf('|||UNTRANSLATED_CONTENT_START|||') >= 0) {
                    this.ctx.verbose && console.log(`id_order: ${translation.id_order} id_content: ${translation.id} status: ${translation.status} translated_content: ${translation.translated_content}`);
                } else {
                    const guid = translation.id_content;
                    if (jobManifest.inflight.includes(guid)) {
                        tusMap[guid] && console.error(`Duplicate translations found for guid: ${guid}`);
                        tusMap[guid] = {
                            guid,
                            ts: new Date(translation.actual_delivery_date).getTime(),
                            q: this.quality,
                            cost: [ translation.total, translation.currency, translation.wc_raw, translation.wc_weighted ],
                        };
                        if (tuMeta[guid]) {
                            tusMap[guid].contentType = tuMeta[guid].contentType;
                            tusMap[guid].ntgt = extractNormalizedPartsV1(translation.translated_content, tuMeta[guid].phMap);
                            if (tusMap[guid].ntgt.filter(e => e === undefined).length > 0) {
                                this.verbose && console.error(`Unable to extract normalized parts of TU: ${JSON.stringify(tusMap[guid])}`);
                                delete tusMap[guid];
                            }
                        } else {
                            tusMap[guid].tgt = translation.translated_content;
                        }
                    } else {
                        console.error(`Found unexpected guid: ${guid}`);
                    }
                }
            }
            offset += limit;
        } while (response.length === limit);
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
