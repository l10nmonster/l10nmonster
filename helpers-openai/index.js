/* eslint-disable no-invalid-this */
import OpenAI from 'openai';
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { logInfo, providers, styleString } from '@l10nmonster/core';

const TranslatorAnnotation = z.object({
    translation: z.string(),
    // notes: z.string().optional(),
    confidence: z.number(),
  });

export class GPTAgent extends providers.ChunkedRemoteTranslationProvider {
    #openai;
    #model;
    #temperature;
    #systemPrompt;
    #customSchema;

    /**
     * Initializes a new instance of the GPTAgent class.
     * @param {Object} options - The parameters for the constructor.
     * @param {string} [options.id] - Global identifier for the provider.
     * @param {Object} [options.supportedPairs] - Supported pairs for the provider.
     * @param {number} [options.costPerWord] - The estimated cost per word for the provider.
     * @param {number} [options.costPerMChar] - The estimated cost per million characters for the provider.
     * @param {number} options.quality - The quality to assign translations.
     * @param {number} [options.maxCharLength] - The maximum character length of a segment.
     * @param {number} [options.maxChunkSize] - The maximum number of segments in a chunk.
     * @param {function(string): string} [options.languageMapper] - A function to convert language codes for the provider.
     * @param {string} [options.baseURL] - The base URL (https://api.openai.com by default)
     * @param {string} [options.model] - The LLM model to use (gpt-4o by default)
     * @param {number} [options.temperature] - The temperature to use (0.1 by default)
     * @param {string} [options.apiKey] - The LLM provder API key (if needed).
     * @param {string} [options.persona] - An override to the default persona for the translator.
     * @param {string} [options.preamble] - Additional instructions to give context valid for all translations.
     * @param {import('zod').ZodTypeAny} [options.customSchema] - A prescribed schema to structure translations into.
     */
    constructor({ baseURL, apiKey, model, temperature, persona, preamble, customSchema, ...options }) {
        if (!options.quality || !model) {
            throw new Error('You must specify quality and model for GPTAgent');
        }
        super(options);
        this.#openai = new OpenAI({
            apiKey: apiKey ?? '',
            baseURL,
        });
        this.#model = model;
        this.#temperature = temperature ?? 0.1;
        this.#customSchema = customSchema;
        logInfo`GPTAgent ${this.id} initialized with url: ${baseURL} model: ${model}`;
        persona = persona ??
`You are one of the best professional translators in the world.
When a situation is ambiguous you stop to consider your options and provide the best answer you can.
Maintain the exact meaning and tone of the original text
Handle numerical/date formats appropriately`;
        this.#systemPrompt =
`${persona}
${preamble ?? ''}
${customSchema ? '' :
`- Each string may contain HTML or XML tags. Preserve ALL markup (HTML/XML tags, entities, placeholders)
- Maintain proper escaping of special characters
- Translate only text nodes. Do not alter tag structure
- Provide a confidence score between 0 and 100 that indicates how confident you are in your translation'}
- Your input is provided in JSON format. It contains the source content and notes about each string that helps you understand the context
- Return your answer as a JSON array with the exact same number of items and in the same order as the input`}`;
    }

    async synchTranslateChunk(op) {
        const { sourceLang, targetLang, xmlTus, instructions } = op.args;
        const jobInstructions = instructions ? `Consider also the following instructions: ${instructions}` : '';
        const userPrompt =
`${jobInstructions}
Translate these ${xmlTus.length} strings from ${sourceLang} to ${targetLang}:

${JSON.stringify(xmlTus, null, 2)}`;

        try {
            const completion = await await this.#openai.beta.chat.completions.parse({
                model: this.#model,
                temperature: this.#temperature,
                messages: [
                  { role: 'system', content: this.#systemPrompt },
                  { role: 'user', content: userPrompt },
                ],
                response_format: zodResponseFormat(z.array(this.#customSchema ?? TranslatorAnnotation), 'translations'),
              });
            // console.dir(completion, { depth: null });
            return {
                translations: completion.choices[0].message.parsed,
                usage: completion.usage,
            };
        } catch (error) {
            throw new Error(`Translation failed: ${error.message}`);
        }
    }

    convertTranslationResponse(chunk) {
        const cost = [ chunk.usage.total_tokens / chunk.translations.length ];
        return chunk.translations.map(obj => ({
            tgt: this.#customSchema ? JSON.stringify(obj) : obj.translation,
            cost,
        }));
    }

    async info() {
        const info = await super.info();
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
