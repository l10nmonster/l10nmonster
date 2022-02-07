import got from 'got';

function flattenNormalizedSource(src) {
     if (Array.isArray(src)) {
        const normalizedStr = [];
        let phIdx = 0,
            phNotes = '';
        for (const part of src) {
            if (typeof part === 'string') {
                normalizedStr.push(part);
            } else {
                phIdx++;
                const phChar = String.fromCharCode(96 + phIdx);
                normalizedStr.push(`<${part.t} id="${phChar}_${part.v.match(/[0-9A-Za-z_]+/) || ''}" />`);
                phNotes += `${phChar}=${part.v} `;
            }
        }
        return [ normalizedStr.join(''), phNotes ];
    }
    return [ src, 'n/a' ];
}

// This is the chunking size for both upload and download
const limit = 100;

export class TranslationOS {
    constructor({ baseURL, apiKey, serviceType, quality, tuDecorator }) {
        if ((apiKey && quality) === undefined) {
            throw 'You must specify apiKey, quality for TranslationOS';
        } else {
            this.baseURL = baseURL ?? 'https://api.translated.com/v2';
            this.apiKey = apiKey;
            this.serviceType = serviceType ?? 'premium',
            this.quality = quality;
            this.tuDecorator = tuDecorator;
        }
    }

    async requestTranslations(jobRequest) {
        const { tus, ...jobManifest } = jobRequest;
        const tosPayload = tus.map(tu => {
            const [content, phNotes ] = flattenNormalizedSource(tu.nsrc ?? tu.src);
            let tosTU = {
                'id_order': jobRequest.jobGuid,
                'id_content': tu.guid,
                content,
                context: {
                    notes: `notes: ${tu.notes}\nrid: ${tu.rid}\nsid: ${tu.sid}\nph: ${phNotes}`
                },
                'source_language': jobRequest.sourceLang,
                'target_languages': [ jobRequest.targetLang ],
                'service_type': this.serviceType,
                'dashboard_query_labels': [
                    `rid:${tu.rid}`,
                    `sid:${tu.sid}`,
                ],
            };
            if (typeof this.tuDecorator === 'function') {
                tosTU = this.tuDecorator(tosTU, tu, jobManifest);
            }
            return tosTU;
        });
        try {
            const inflight = [];
            while (tosPayload.length > 0) {
                const json = tosPayload.splice(0, limit);
                const request = {
                    url: `${this.baseURL}/translate`,
                    json,
                    headers: {
                        'x-api-key': this.apiKey,
                        'x-idempotency-id': `jobGuid:${jobRequest.jobGuid}`,
                    }
                };
                this.ctx.verbose && console.log(`Pushing to TOS job ${jobManifest.jobGuid} chunk size: ${json.length}`);
                // const response = await got.post(request).json();
                console.dir(request.json)
                inflight.push(response.map(contentStatus => contentStatus.id_content));
            }
            jobManifest.inflight = inflight.flat(1);
            jobManifest.status = 'pending';
            return jobManifest;
        } catch (error) {
            console.error(error.response?.body);
            throw "TOS call failed!";
        }
    }

    async fetchTranslations(jobManifest) {
        const request = {
            url: `${this.baseURL}/status`,
            json: {
                'id_order': jobManifest.jobGuid,
                // status: 'delivered',
                'fetch_content': true,
            },
            headers: {
                'x-api-key': this.apiKey,
            }
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
                response = await got.post(request).json();
            } catch (error) {
                console.error(error.response.body);
                throw "TOS call failed!";
            }
            for (const translation of response) {
                if (translation.translated_content === null || translation.quality_model !== 'translated') {
                    this.ctx.verbose && console.log(`id_order: ${translation.id_order} id_content: ${translation.id} status: ${translation.status} quality_model: ${translation.quality_model}`);
                } else {
                    const guid = translation.id_content;
                    if (jobManifest.inflight.includes(guid)) {
                        tusMap[guid] && console.error(`Duplicate translations found for guid: ${guid}`);
                        tusMap[guid] = {
                            guid,
                            tgt: translation.translated_content,
                            q: this.quality,
                        };
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
