/* eslint-disable no-invalid-this */
import { logWarn, providers, styleString } from '@l10nmonster/core';
import { Credentials, Translator } from '@translated/lara';

/**
 * @typedef {object} LaraProviderOptions
 * @extends ChunkedRemoteTranslationProviderOptions
 * @property {string} keyId - The Lara API key id. This is required.
 * @property {string} [keySecret] - The Lara API key secret. Optional, but often needed for authentication.
 * @property {string|Array<string>} [adaptTo] - An optional single translation memory ID or an array of IDs to adapt translations to.
 * @property {number} [maxChunkSize=60] - Maximum number of text segments (strings) allowed in a single API request chunk. Defaults to 60 if not provided.
 */

/**
 * Provider for Translated Lara MT.
 */
export class LaraProvider extends providers.ChunkedRemoteTranslationProvider {
    #keyId;
    #keySecret;
    #adaptTo;
    #lara;
    #translateOptions;

    /**
     * Initializes a new instance of the LaraProvider class.
     * @param {LaraProviderOptions} options - Configuration options for the provider.
     */
    constructor({ keyId, keySecret, adaptTo, ...options }) {
        super({ chunkSize: 60, ...options }); // maximum number of strings sent to Lara is 128 including notes
        this.#keyId = keyId;
        this.#keySecret = keySecret;
        this.#adaptTo = adaptTo && (Array.isArray(adaptTo) ? adaptTo : adaptTo.split(','));
        const credentials = new Credentials(this.#keyId, this.#keySecret);
        this.#lara = new Translator(credentials);
        this.#translateOptions = {
            contentType: 'text/plain',
            instructions: [],
        };
        this.#adaptTo && (this.#translateOptions.adaptTo = this.#adaptTo);
        this.defaultInstructions && this.#translateOptions.instructions.push(this.defaultInstructions);
    }

    async synchTranslateChunk(op) {
        const { sourceLang, targetLang, xmlTus, instructions } = op.args;
        const payload = xmlTus.map(xmlTu => {
            const textBlock = [];
            textBlock.push({ text: `bundle: ${xmlTu.bundle} key: ${xmlTu.key} notes: ${xmlTu.notes ?? ''}`, translatable: false });
            textBlock.push({ text: xmlTu.source, translatable: true });
            return textBlock;
        }).flat(1);
        const translateOptions = instructions ? { ...this.#translateOptions, instructions: [...this.#translateOptions.instructions, instructions] } : this.#translateOptions;
        try {
            return await this.#lara.translate(
                payload,
                sourceLang,
                targetLang,
                translateOptions,
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
