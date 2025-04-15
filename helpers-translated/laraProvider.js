/* eslint-disable no-invalid-this */
import { logWarn, providers } from '@l10nmonster/core';
import {Credentials, Translator} from '@translated/lara';

export class LaraProvider extends providers.ChunkedRemoteTranslationProvider {
    #keyId;
    #keySecret;
    #lara;
    #translateOptions;

    /**
     * Initializes a new instance of the LaraProvider class.
     * @param {Object} options - The parameters for the constructor.
     * @param {string} [options.id] - Global identifier for the provider.
     * @param {Object} [options.supportedPairs] - Supported pairs for the provider.
     * @param {number} [options.costPerWord] - The estimated cost per word for the provider.
     * @param {number} [options.costPerMChar] - The estimated cost per million characters for the provider.
     * @param {number} options.quality - The quality to assign translations.
     * @param {string} options.keyId - The Lara API key id.
     * @param {string} [options.keySecret] - The Lara API key secret.
     * @param {number} [options.maxCharLength] - The maximum character length of a segment.
     * @param {number} [options.maxChunkSize] - The maximum number of segments in a chunk.
     * @param {function(string): string} [options.languageMapper] - A function to convert language codes for the provider.
     */
    constructor({ keyId, keySecret, ...options }) {
        super(options);
        this.#keyId = keyId;
        this.#keySecret = keySecret;
    }

    start(job) {
        const credentials = new Credentials(this.#keyId, this.#keySecret);
        this.#lara = new Translator(credentials);
        this.#translateOptions = {
            contentType: 'text/plain',
        };
        job.instructions && (this.#translateOptions.instructions = job.instructions);
        return super.start(job);
    }

    async synchTranslateChunk({ sourceLang, targetLang, xmlTus }) {
        const payload = xmlTus.map(xmlTu => {
            const textBlock = [];
            xmlTu.notes && textBlock.push({ text: xmlTu.notes, translatable: false });
            textBlock.push({ text: xmlTu.source, translatable: true });
            return textBlock;
        });
        return await this.#lara.translate(payload.flat(1),
            sourceLang,
            targetLang,
            this.#translateOptions,
        );
    }

    convertTranslationResponse(chunk) {
        return chunk.translation.filter(textBlock => textBlock.translatable).map(textBlock => ({
            tgt: textBlock.text,
        }));
    }

    async info() {
        const info = await super.info();
        try {
            const credentials = new Credentials(this.#keyId, this.#keySecret);
            const lara = new Translator(credentials);
            const languages = (await lara.getLanguages()).sort();
                info.description.push(`Vendor supported languages: ${languages?.join(', ') ?? 'unknown'}`);
        } catch (error) {
            logWarn`Error fetching languages: ${error.message}`
        }
        return info;
    }
}
