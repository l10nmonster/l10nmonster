import OpenAI from 'openai';
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { logInfo, providers, styleString } from '@l10nmonster/core';

const TranslatorAnnotation = z.object({
    translation: z.string().describe('the translated string'),
    confidence: z.number().describe('a confidence score between 0 and 100 that indicates whether the translation is possibly ambiguous'),
    notes: z.string().describe('any additional notes about the translation'),
});

/**
 * @typedef {object} GPTAgentOptions
 * @extends ChunkedRemoteTranslationProviderOptions
 * @property {string} [baseURL] - The base URL (https://api.openai.com by default)
 * @property {string} [model] - The LLM model to use (gpt-4o by default)
 * @property {number} [temperature] - The temperature to use (0.1 by default)
 * @property {string} [apiKey] - The LLM provder API key (if needed).
 * @property {string} [persona] - An override to the default persona for the translator.
 * @property {import('zod').ZodTypeAny} [customSchema] - A prescribed schema to structure translations into.
 */

/**
 * Provider for OpenAI GPT-compatible LLMs.
 */
export class GPTAgent extends providers.ChunkedRemoteTranslationProvider {
    #openai;
    #baseURL;
    #model;
    #temperature;
    #systemPrompt;
    #customSchema;

    /**
     * Initializes a new instance of the GPTAgent class.
     * @param {GPTAgentOptions} options - Configuration options for the provider.
     */
    constructor({ baseURL, apiKey, model, temperature, persona, customSchema, ...options }) {
        if (!options.quality || !model) {
            throw new Error('You must specify quality and model for GPTAgent');
        }
        super(options);
        this.#baseURL = baseURL;
        this.#openai = new OpenAI({
            apiKey: apiKey ?? '',
            baseURL,
        });
        this.#model = model;
        this.#temperature = temperature ?? 0.1;
        this.#customSchema = customSchema;
        logInfo`GPTAgent ${this.id} initialized with url: ${baseURL} model: ${model}`;
        persona = persona ?? 'You are one of the best professional translators in the world.';
        this.#systemPrompt =
`${persona}
${this.defaultInstructions ?? ''}
${customSchema ? '' :
`- Each string may contain HTML tags. Preserve ALL markup and don't close unclosed tags. Translate only text nodes. Do not alter tag structure
- Provide a confidence score between 0 and 100 that indicates how likely the translation doesn't need adjustments due to context.
- Your input is provided in JSON format. It contains the source content and notes about each string that helps you understand the context.
- When a situation is ambiguous stop to consider your options, use additional context provided (notes, bundle, key), but always provide the best answer you can.
- Provide a confidence score between 0 and 100 that indicates correctness. Anything below 60 is an ambiguous translation that should be reviewed by a human.
- If a translation can be ambiguous, or you have questions about it, lower the confidence score and explain why in the notes field, including any clarifying questions.
- Return your answer as a JSON array with the exact same number of items and in the same order as the input`}`;
    }

    prepareTranslateChunkArgs({ sourceLang, targetLang, xmlTus, instructions }) {
        const jobInstructions = instructions ? `Consider also the following instructions: ${instructions}` : '';
        const userPrompt =
`${jobInstructions}
Translate these ${xmlTus.length} strings from ${sourceLang} to ${targetLang}:

${JSON.stringify(xmlTus, null, 2)}`;
        return {
            model: this.#model,
            temperature: this.#temperature,
            messages: [
              { role: 'system', content: this.#systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            response_format: zodResponseFormat(z.array(this.#customSchema ?? TranslatorAnnotation), 'translations'),
          };
    }

    async startTranslateChunk(args) {
        return this.#openai.chat.completions.parse(args);
    }

    convertTranslationResponse(chunk) {
        const translations = chunk.choices[0].message.parsed;
        const cost = [ chunk.usage.total_tokens / translations.length ];
        return translations.map(obj => ({
            tgt: this.#customSchema ? JSON.stringify(obj) : obj.translation,
            cost,
        }));
    }

    async info() {
        const info = await super.info();
        info.description.push(styleString`Model: ${this.#model} Base URL: ${this.#baseURL}`);
        try {
            const modelList = await this.#openai.models.list();
            const modelNames = modelList.data.map(m => m.id).sort().join(', ');
            info.description.push(styleString`Supported models: ${modelNames}`);
        } catch (e) {
            info.description.push(styleString`Unable to connect to OpenAI server: ${e.cause?.message ?? e.message}`);
        }
        return info;
    }
}
