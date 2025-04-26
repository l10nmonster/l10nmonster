/* eslint-disable no-invalid-this */
import { logWarn, providers, styleString } from '@l10nmonster/core';
import {Credentials, Translator} from '@translated/lara';

export class LaraProvider extends providers.ChunkedRemoteTranslationProvider {
    #keyId;
    #keySecret;
    #adaptTo;
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
     * @param {string|Array<string>} [options.adaptTo] - A list of translation memory IDs to adapt translations to.
     * @param {number} [options.maxCharLength] - The maximum character length of a segment.
     * @param {number} [options.maxChunkSize] - The maximum number of segments in a chunk.
     * @param {function(string): string} [options.languageMapper] - A function to convert language codes for the provider.
     */
    constructor({ keyId, keySecret, adaptTo, ...options }) {
        super(options);
        this.#keyId = keyId;
        this.#keySecret = keySecret;
        this.#adaptTo = adaptTo && (Array.isArray(adaptTo) ? adaptTo : adaptTo.split(','));
    }

    start(job) {
        const credentials = new Credentials(this.#keyId, this.#keySecret);
        this.#lara = new Translator(credentials);
        this.#translateOptions = {
            contentType: 'text/plain',
        };
        this.#adaptTo && (this.#translateOptions.adaptTo = this.#adaptTo);
        job.instructions && (this.#translateOptions.instructions = [ job.instructions ]);
        return super.start(job);
    }

    async synchTranslateChunk(op) {
        const { sourceLang, targetLang, xmlTus } = op.args;
        const payload = xmlTus.map(xmlTu => {
            const textBlock = [];
            xmlTu.notes && textBlock.push({ text: xmlTu.notes, translatable: false });
            textBlock.push({ text: xmlTu.source, translatable: true });
            return textBlock;
        }).flat(1);
        try {
            return await this.#lara.translate(
                payload,
                sourceLang,
                targetLang,
                this.#translateOptions,
            );
        } catch (e) {
            throw new Error(`Lara API error ${e.statusCode}: ${e.type}: ${e.message}`);
        }
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
            info.description.push(styleString`Vendor supported languages: ${languages?.join(', ') ?? 'unknown'}`);
            // const memory = await lara.memories.create('Memory 1');
            const memories = await lara.memories.list();
            if (memories.length > 0) {
                memories.forEach(m =>
                    info.description.push(styleString`Vendor TM "${m.name}": id: ${m.id} owner: ${m.ownerId} collaborators: ${m.collaboratorsCount} created: ${m.createdAt} updated: ${m.updatedAt}`)
                );
            } else {
                info.description.push(styleString`No TMs configured.`);
            }
        } catch (error) {
            logWarn`Error fetching languages: ${error.message}`
        }
        return info;
    }
}
