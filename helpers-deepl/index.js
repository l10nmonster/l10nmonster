import { providers, styleString } from '@l10nmonster/core';
import { DeepLClient } from 'deepl-node';

/**
 * @typedef {object} DeepLProviderOptions
 * @extends ChunkedRemoteTranslationProviderOptions
 * @property {string} authKey - The DeepL API key. This is required.
 * @property {Record<string, string[]>} [formalityMap] - Optional map from language to desired formality (less, more, default, prefer_less, prefer_more).
 * @property {string} [modelType] - Specifies the type of translation model to use (quality_optimized, prefer_quality_optimized, latency_optimized).
 */

/**
 * Provider for DeepL MT.
 */
export class DeepLProvider extends providers.ChunkedRemoteTranslationProvider {
    #authKey;
    #formalityMap;
    #modelType;

    /**
     * Initializes a new instance of the DeepLProvider class.
     * @param {DeepLProviderOptions} options - Configuration options for the provider.
     */
    constructor({ authKey, formalityMap, modelType, ...options }) {
        super(options);
        this.#authKey = authKey;
        this.#formalityMap = formalityMap;
        this.#modelType = modelType;
    }

    prepareTranslateChunkArgs({ sourceLang, targetLang, xmlTus, instructions }) {
        const payload = xmlTus.map(xmlTu => xmlTu.source);
        const options = {
            tagHandling: 'xml',
        };
        this.#formalityMap && this.#formalityMap[targetLang] && (options.formality = this.#formalityMap[targetLang]);
        this.#modelType && (options.modelType = this.#modelType);
        if (this.defaultInstructions || instructions) {
            options.context = `${this.defaultInstructions ?? ''}\n${instructions}`;
        }
        return { payload, sourceLang, targetLang, options };
    }

    async synchTranslateChunk(op) {
        const { payload, sourceLang, targetLang, options } = op.args;
        const deeplClient = new DeepLClient(this.#authKey);
        return await deeplClient.translateText(payload, sourceLang, targetLang, options);
    }

    convertTranslationResponse(chunk) {
        return chunk.map(translation => ({
            tgt: translation.text,
            cost: [ translation.billedCharacters ],
        }));
    }

    async info() {
        const info = await super.info();
        try {
            const deeplClient = new DeepLClient(this.#authKey);
            const usage = await deeplClient.getUsage();
            usage.anyLimitReached() && info.description.push('Translation limit exceeded.');
            usage.character && info.description.push(styleString`Characters: ${usage.character.count} of ${usage.character.limit}`);
            usage.document && info.description.push(styleString`Documents: ${usage.document.count} of ${usage.document.limit}`);
            const sourceLanguages = (await deeplClient.getSourceLanguages()).map(l => l.code).sort();
            info.description.push(styleString`Vendor-supported source languages: ${sourceLanguages?.join(', ') ?? 'unknown'}`);
            const targetLanguages = (await deeplClient.getTargetLanguages()).map(l => `${l.code}${l.supportsFormality ? '*' : ''}`).sort();
            info.description.push(styleString`Vendor-supported target languages (* = formality support): ${targetLanguages?.join(', ') ?? 'unknown'}`);
        } catch (error) {
            info.description.push(styleString`Unable to connect to DeepL server: ${error.message}`);
        }
        return info;
    }
}
