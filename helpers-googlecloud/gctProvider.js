import { TranslationServiceClient } from '@google-cloud/translate';
import { GoogleAuth } from 'google-auth-library';
import { providers, styleString } from '@l10nmonster/core';

/**
 * @typedef {object} GCTProviderOptions
 * @extends ChunkedRemoteTranslationProviderOptions
 * @property {string} [projectId] - The GCP Project ID.
 * @property {string} [location] - GCP datacenter location (global by default).
 * @property {string} [model] - The model to use for translation ("nmt" by default or "llm")
 */

/**
 * Provider for Google Cloud Translate MT.
 */
export class GCTProvider extends providers.ChunkedRemoteTranslationProvider {
    #parentPath;
    #modelPath;

    #projectId;
    #location;
    #model;
    #initialized;

    /**
     * Initializes a new instance of the GCTProvider class.
     * @param {GCTProviderOptions} options - Configuration options for the provider.
     */
    constructor({ projectId, location, model, ...options }) {
        if (!options.quality) {
            throw new Error('You must specify quality for GCTProvider');
        }
        super(options);
        this.#projectId = projectId;
        this.#location = location;
        this.#model = model;
    }

    async #lazyInit() {
        if (this.#initialized) {
            return;
        }
        if (!this.#projectId) {
            try {
            const auth = new GoogleAuth({});
            this.#projectId = await auth.getProjectId();
            } catch (e) {
                throw new Error(`Couldn't get credentials, did you run 'gcloud auth login'? ${e.message}`);
            }
        }
        this.#parentPath = `projects/${this.#projectId}/locations/${this.#location ?? 'global'}`;
        this.#modelPath = `${this.#parentPath}/models/${this.#model === 'llm' ? 'general/translation-llm' : 'general/nmt' }`;
        const translationClient = new TranslationServiceClient();
        const [ response ] = await translationClient.getSupportedLanguages({ parent: this.#parentPath });
        this.supportedSourceLangs = response.languages.filter(l => l.supportSource).map(l => l.languageCode);
        this.supportedTargetLangs = response.languages.filter(l => l.supportTarget).map(l => l.languageCode);
        if (!this.languageMapper) {
            const supportedLangs = new Set([ ...this.supportedSourceLangs, ...this.supportedTargetLangs ]);
            this.languageMapper = lang => supportedLangs.has(lang) ? lang : lang.split('-')[0];
        }
        this.#initialized = true;
    }

    async start(job) {
        await this.#lazyInit();
        return super.start(job);
    }

    async synchTranslateChunk(op) {
        const { sourceLang, targetLang, xmlTus } = op.args;
        try {
            const translationClient = new TranslationServiceClient();
            const [response] = await translationClient.translateText({
                parent: this.#parentPath,
                contents: xmlTus.map(xmlTu => xmlTu.source),
                mimeType: 'text/html',
                sourceLanguageCode: sourceLang,
                targetLanguageCode: targetLang,
                model: this.#modelPath,
            });
            return response;
        } catch (error) {
            throw new Error(`Translation failed: ${error.message}`);
        }
    }

    convertTranslationResponse(chunk) {
        return chunk.translations.map(({ translatedText }) => ({ tgt: translatedText }));
    }

    async info() {
        const info = await super.info();
        try {
            await this.#lazyInit();
            info.description.push(styleString`Source languages: ${this.supportedSourceLangs.sort().join(', ')}`);
            info.description.push(styleString`Target languages: ${this.supportedTargetLangs.sort().join(', ')}`);
        } catch (e) {
            info.description.push(styleString`Unable to connect to GCP server: ${e.message}`);
        }
        return info;
    }
}
