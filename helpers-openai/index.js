import OpenAI from 'openai';
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { logInfo, providers, styleString } from '@l10nmonster/core';

const TranslatorAnnotation = z.array(z.object({
    translation: z.string().describe('the translated string'),
    confidence: z.number().describe('a confidence score between 0 and 100 that indicates whether the translation is possibly ambiguous'),
    notes: z.string().describe('any additional notes about the translation'),
}));

/**
 * @typedef {object} GPTAgentOptions
 * @extends LLMTranslationProviderOptions
 * @property {string} [baseURL] - The base URL (https://api.openai.com by default)
 * @property {Promise<string>|string} [apiKey] - The LLM provder API key (if needed).
 * @property {string} [reasoningEffort] - The reasoning effort level: "none", "low", "medium", or "high"
 */

/**
 * Provider for OpenAI GPT-compatible LLMs.
 */
export class GPTAgent extends providers.LLMTranslationProvider {
    #openai;
    #baseURL;
    #apiKey;
    #reasoningEffort;

    /**
     * Initializes a new instance of the GPTAgent class.
     * @param {GPTAgentOptions} options - Configuration options for the provider.
     */
    constructor({ baseURL, apiKey, reasoningEffort, ...options }) {
        super(options);
        this.#baseURL = baseURL;
        this.#apiKey = apiKey ?? '';
        
        if (reasoningEffort !== undefined) {
            const validValues = ['none', 'low', 'medium', 'high'];
            if (!validValues.includes(reasoningEffort)) {
                throw new Error(`Invalid reasoningEffort value: "${reasoningEffort}". Must be one of: ${validValues.join(', ')}`);
            }
        }
        
        this.#reasoningEffort = reasoningEffort;
    }

    // Lazy initialization to defer OpenAI client creation until first use
    async lazyInit() {
        if (this.#openai) {
            return;
        }
        this.#openai = new OpenAI({
            apiKey: await this.#apiKey,
            baseURL: this.#baseURL,
        });
        logInfo`GPTAgent ${this.id} initialized with url: ${this.#baseURL} model: ${this.model}`;
    }

    prepareTranslateChunkArgs({ sourceLang, targetLang, xmlTus, instructions }) {
        const userPrompt = this.buildUserPrompt({ sourceLang, targetLang, xmlTus, instructions });
        const args = {
            model: this.model,
            temperature: this.temperature,
            messages: [
              { role: 'system', content: this.systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            // eslint-disable-next-line camelcase
            response_format: zodResponseFormat(this.customSchema ?? TranslatorAnnotation, 'translations'),
        };
        
        if (this.#reasoningEffort) {
            // eslint-disable-next-line camelcase
            args.reasoning_effort = this.#reasoningEffort;
        }
        
        return args;
    }

    async generateContent(args) {
        return await this.#openai.chat.completions.parse(args);
    }

    convertTranslationResponse(chunk) {
        const translations = chunk.choices[0].message.parsed;
        const cost = [ chunk.usage.total_tokens / translations.length ];
        return this.processTranslations(translations, cost);
    }

    async info() {
        const info = await super.info();
        info.description.push(styleString`Model: ${this.model} Base URL: ${this.#baseURL}`);
        try {
            await this.lazyInit();
            const modelList = await this.#openai.models.list();
            const modelNames = modelList.data.map(m => m.id).sort().join(', ');
            info.description.push(styleString`Supported models: ${modelNames}`);
        } catch (e) {
            info.description.push(styleString`Unable to connect to OpenAI server: ${e.cause?.message ?? e.message}`);
        }
        return info;
    }
}
