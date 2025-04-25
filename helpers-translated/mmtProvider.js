/* eslint-disable no-invalid-this */
import { logWarn, providers } from '@l10nmonster/core';
import { ModernMT as MMTClient } from 'modernmt';

export class MMTProvider extends providers.ChunkedRemoteTranslationProvider {
    /**
     * Initializes a new instance of the MMTProvider class.
     * @param {Object} options - The parameters for the constructor.
     * @param {string} [options.id] - Global identifier for the provider.
     * @param {Object} [options.supportedPairs] - Supported pairs for the provider.
     * @param {number} [options.costPerWord] - The estimated cost per word for the provider.
     * @param {number} [options.costPerMChar] - The estimated cost per million characters for the provider.
     * @param {number} options.quality - The quality to assign translations.
     * @param {string} options.apiKey - The ModernMT API key.
     * @param {string} [options.webhook] - The webhook URL for batch translation.
     * @param {function(any): any} [options.chunkFetcher] - The chunk fetcher operation name.
     * @param {(string | number)[]} [options.hints] - Hints to include in the MMT request.
     * @param {boolean} [options.multiline] - Whether to use multiline mode.
     * @param {number} [options.maxCharLength] - The maximum character length of a segment.
     * @param {number} [options.maxChunkSize] - The maximum number of segments in a chunk.
     * @param {function(string): string} [options.languageMapper] - A function to convert language codes for the provider.
     */
    constructor({ id, apiKey, webhook, chunkFetcher, hints, multiline = true, ...options }) {
        id ??= webhook ? 'MMTBatch' : 'MMTRealtime';
        super({ id, ...options });
        if (webhook) {
            if (chunkFetcher) {
                this.chunkFetcher = chunkFetcher;
                this.synchProvider = false;
            } else {
                throw new Error('If you specify a webhook you must also specify a chunkFetcher');
            }
        }
        this.baseRequest = {
            mmtConstructor: [ apiKey, 'l10n.monster/MMT', '3.0' ],
            hints,
            options: {
                multiline,
                format: 'text/xml',
            },
            webhook,
        }
    }

    start(job) {
        if (!this.baseRequest.mmtConstructor[0]) {
            throw new Error('You must have an apiKey to start an MMT job');
        }
        return super.start(job);
    }

    async synchTranslateChunk(op) {
        const { sourceLang, targetLang, xmlTus } = op.args;
        const [ apiKey, platform, platformVersion ] = this.baseRequest.mmtConstructor;
        try {
            const mmt = new MMTClient(apiKey, platform, platformVersion);
            return await mmt.translate(
                sourceLang,
                targetLang,
                xmlTus.map(xmlTu => xmlTu.source),
                this.baseRequest.hints,
                undefined,
                this.baseRequest.options
            );
        } catch(error) {
            throw new Error(`${error.toString()}: ${error.response?.body}`);
        }
    }

    convertTranslationResponse(chunk) {
        return chunk.map(mmtTx => ({
            tgt: mmtTx.translation,
            cost: [ mmtTx.billedCharacters, mmtTx.billed, mmtTx.characters ],
        }));
    }

    async asynchTranslateChunk(op) {
        const { sourceLang, targetLang, xmlTus, jobGuid, chunk } = op.args;
        const batchOptions = {
            ...this.baseRequest.options,
            idempotencyKey: `jobGuid:${jobGuid} chunk:${chunk}`,
            metadata: { jobGuid, chunk },
        };
        const [ apiKey, platform, platformVersion ] = this.baseRequest.mmtConstructor;
        try {
            const mmt = new MMTClient(apiKey, platform, platformVersion);
                const response = await mmt.batchTranslate(
                    this.baseRequest.webhook,
                    sourceLang,
                    targetLang,
                    xmlTus.map(xmlTu => xmlTu.source),
                    this.baseRequest.hints,
                    undefined,
                    batchOptions
                );
                return { enqueued: response };
        } catch(error) {
            throw new Error(`${error.toString()}: ${error.response?.body}`);
        }
    }

    async asynchFetchChunk(op) {
        return await this.chunkFetcher(op.args);
    }

    async info() {
        const info = await super.info();
        try {
            const response = await fetch('https://api.modernmt.com/translate/languages');
            if (response.ok) {
                const supportedProviderLanguages = (await response.json()).data.sort();
                info.description.push(`Vendor supported languages: ${supportedProviderLanguages?.join(', ') ?? 'unknown'}`);
            } else {
                logWarn`HTTP error: status ${response.status} ${response.statusText}`
            }
        } catch (error) {
            logWarn`Error fetching languages: ${error.message}`
        }
        return info;
    }
}
