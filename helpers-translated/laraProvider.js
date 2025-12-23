import { providers, styleString } from '@l10nmonster/core';
import { Credentials, Translator } from '@translated/lara';

/**
 * @typedef {object} LaraProviderOptions
 * @property {string} keyId - The Lara API key id. This is required.
 * @property {Promise<string>|string} [keySecret] - The Lara API key secret. Optional, but often needed for authentication.
 * @property {string | Array<string>} [adaptTo] - An optional single translation memory ID or an array of IDs to adapt translations to.
 * @property {string | Array<string>} [glossaries] - Glossaries to include in the request.
 * @property {number} [maxChunkSize=60] - Maximum number of text segments (strings) allowed in a single API request chunk. Defaults to 60 if not provided.
 */

/**
 * Provider for Translated Lara MT.
 */
export class LaraProvider extends providers.ChunkedRemoteTranslationProvider {
    #keyId;
    #keySecret;
    #translateOptions;

    /**
     * Initializes a new instance of the LaraProvider class.
     * @param {LaraProviderOptions} options - Configuration options for the provider.
     */
    constructor({ keyId, keySecret, adaptTo, glossaries, ...options }) {
        // @ts-ignore - spread loses type info but parent class handles validation
        super({ maxChunkSize: 60, ...options }); // maximum number of strings sent to Lara is 128 including notes
        this.#keyId = keyId;
        this.#keySecret = keySecret;
        this.#translateOptions = {
            instructions: [],
        };
        adaptTo && (this.#translateOptions.adaptTo = Array.isArray(adaptTo) ? adaptTo : adaptTo.split(','));
        glossaries && (this.#translateOptions.glossaries = Array.isArray(glossaries) ? glossaries : glossaries.split(','));
        this.defaultInstructions && this.#translateOptions.instructions.push(this.defaultInstructions);
    }

    async #getLara() {
        // @ts-ignore - keySecret can be a function or value, TypeScript doesn't narrow correctly
        const resolvedSecret = await (typeof this.#keySecret === 'function' ? this.#keySecret() : this.#keySecret);
        const credentials = new Credentials(this.#keyId, resolvedSecret);
        return new Translator(credentials);
    }

    prepareTranslateChunkArgs({ sourceLang, targetLang, xmlTus, jobGuid, chunkNumber, instructions }) {
        const payload = xmlTus.map(xmlTu => {
            const textBlock = [];
            textBlock.push({ text: `bundle: ${xmlTu.bundle} key: ${xmlTu.key} notes: ${xmlTu.notes ?? ''}`, translatable: false });
            textBlock.push({ text: xmlTu.source, translatable: true });
            return textBlock;
        }).flat(1);
        const translateOptions = instructions ? { ...this.#translateOptions, instructions: [...this.#translateOptions.instructions, instructions] } : this.#translateOptions;
        return { payload, sourceLang, targetLang, xmlTus, jobGuid, chunkNumber, translateOptions };
    }

    async startTranslateChunk(args) {
        const { payload, sourceLang, targetLang, translateOptions } = args;
        const lara = await this.#getLara();
        try {
            return await lara.translate(payload, sourceLang, targetLang, translateOptions);
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
        if (!this.#keyId || !this.#keySecret) {
            info.description.push(styleString`Lara API key is missing. Please add the keyId and keySecret to the provider configuration.`);
            return info;
        }
        try {
            const lara = await this.#getLara();
            const languages = (await lara.getLanguages()).sort();
            info.description.push(styleString`Vendor-supported languages: ${languages?.join(', ') ?? 'unknown'}`);
            const memories = await lara.memories.list();
            if (memories.length > 0) {
                memories.forEach(m => info.description.push(styleString`Vendor TM "${m.name}": id: ${m.id} owner: ${m.ownerId} collaborators: ${m.collaboratorsCount} created: ${m.createdAt} updated: ${m.updatedAt}`));
            } else {
                info.description.push(styleString`No TMs configured.`);
            }
        } catch (error) {
            info.description.push(styleString`Unable to connect to Lara server: ${error.message}`);
        }
        return info;
    }
}
