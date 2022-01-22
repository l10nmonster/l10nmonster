import got from 'got';

export class TranslationOS {
    constructor({ baseURL, apiKey, serviceType, quality }) {
        if ((apiKey && quality) === undefined) {
            throw 'You must specify apiKey, quality for TranslationOS';
        } else {
            this.baseURL = baseURL ?? 'https://api.translated.com/v2';
            this.apiKey = apiKey;
            this.serviceType = serviceType ?? 'premium',
            this.quality = quality;
        }
    }

    async requestTranslations(jobRequest) {
        const { tus, ...jobManifest } = jobRequest;
        const tosPayload = tus.map(tu => ({
            'id_order': jobRequest.jobId,
            'id_content': tu.guid,
            content: tu.src,
            context: {
                notes: tu.notes,
            },
            'source_language': jobRequest.sourceLang,
            'target_languages': [ jobRequest.targetLang ],
            'service_type': this.serviceType,
        }));
        const response = await got.post({
            url: `${this.baseURL}/translate`,
            json: tosPayload,
            headers: {
                'x-api-key': this.apiKey,
                'x-idempotency-id': `jobId:${jobRequest.jobId}`,
            }
        }).json();
        jobManifest.inflight = response.map(contentStatus => contentStatus.id_content);
        jobManifest.envelope = { response };
        jobManifest.status = 'pending';
        return jobManifest;
    }

    async fetchTranslations(jobManifest) {
        const response = await got.post({
            url: `${this.baseURL}/status`,
            json: {
                'id_order': jobManifest.jobId,
                'fetch_content': true,
            },
            headers: {
                'x-api-key': this.apiKey,
            }
        }).json();
        const tus = [];
        for (const translation of response) {
            if (translation.translated_content === null) {
                this.ctx.verbose && console.log(`id_order: ${translation.id_order} id_content: ${translation.id} status: ${translation.status}`);
            } else {
                tus.push({
                    guid: translation.id_content,
                    tgt: translation.translated_content,
                    q: this.quality,
                });
            }
        }
        const { ...newManifest } = jobManifest;
        // newManifest.envelope = { response };
        if (response.length === tus.length) {
            newManifest.status = 'done';
        }
        if (tus.length > 0) {
            newManifest.tus = tus;
            return newManifest;
        }
        return null;
    }
}
