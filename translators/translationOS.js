import got from 'got';

const typeToPhElement = {
    x: 'ph',
    bx: 'sc',
    ex: 'ec',
};

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
                normalizedStr.push(`<${typeToPhElement[part.t]} id="${phChar}_${part.v.match(/[0-9A-Za-z_]+/) || ''}" />`);
                phNotes += `${phChar}=${part.v} `;
            }
        }
        return [ normalizedStr.join(''), phNotes ];
    }
    return [ src, 'n/a' ];
}

// This is the chunking size for both upload and download
const limit = 150;

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
            let [content, phNotes ] = flattenNormalizedSource(tu.nsrc ?? tu.src);
            phNotes = phNotes.replace('<', 'ᐸ').replace('>', 'ᐳ');
            let tosTU = {
                'id_order': jobRequest.jobGuid,
                'id_content': tu.guid,
                content,
                context: {
                    notes: `${tu.notes ?? ''}\n${phNotes ? `ph: ${phNotes}\n`: ''}rid: ${tu.rid}\n sid: ${tu.sid}\n guid: ${tu.guid}`
                },
                'source_language': jobRequest.sourceLang,
                'target_languages': [ jobRequest.targetLang ],
                'content_type': 'text/html',
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
            let chunkNumber = 0;
            while (tosPayload.length > 0) {
                const json = tosPayload.splice(0, limit);
                chunkNumber++;
                const request = {
                    url: `${this.baseURL}/translate`,
                    json,
                    headers: {
                        'x-api-key': this.apiKey,
                        'x-idempotency-id': `jobGuid:${jobRequest.jobGuid} chunk:${chunkNumber}`,
                    }
                };
                this.ctx.verbose && console.log(`Pushing to TOS job ${jobManifest.jobGuid} chunk size: ${json.length}`);
                const response = await got.post(request).json();
                const committedGuids = response.map(contentStatus => contentStatus.id_content);
                const missingTus = json.filter(tu => !committedGuids.includes(tu.id_content));
                if (json.length !== committedGuids.length || missingTus.length > 0) {
                    console.error(`sent ${json.length} got ${committedGuids.length} missing tus: ${missingTus.map(tu => tu.id_content).join(', ')}`);
                    throw "inconsistent behavior!";
                }
                inflight.push(committedGuids);
            }
            jobManifest.inflight = inflight.flat(1);
            jobManifest.status = 'pending';
            return jobManifest;
        } catch (error) {
            error.response && console.error(error.response.body);
            throw "TOS call failed!";
        }
    }

    async fetchTranslations(jobManifest) {
        const request = {
            url: `${this.baseURL}/status`,
            json: {
                'id_order': jobManifest.jobGuid,
                status: 'delivered',
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
                if (translation.translated_content === null || translation.translated_content.indexOf('|||UNTRANSLATED_CONTENT_START|||') >= 0) {
                    this.ctx.verbose && console.log(`id_order: ${translation.id_order} id_content: ${translation.id} translated_content: ${translation.translated_content}`);
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
