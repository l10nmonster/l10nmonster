/* eslint-disable no-invalid-this */
import { logInfo, providers } from '@l10nmonster/core';

export class GPTProvider extends providers.ChunkedRemoteTranslationProvider {
    #endpoint;
    #baseRequest;
    #systemPrompt;

    /**
     * Initializes a new instance of the GPTProvider class.
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
     */
    constructor({ baseURL, model, temperature, apiKey, persona, ...options }) {
        if (!options.quality) {
            throw new Error('You must specify quality for GPTProvider');
        }
        super(options);
        this.#endpoint = new URL('/v1/chat/completions', baseURL ?? 'https://api.openai.com').toString();
        logInfo`GPTProvider ${this.id} initialized with endpoint: ${this.#endpoint}`;
        this.#baseRequest = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey ?? process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: {
              model: model ?? 'gpt-4o',
              temperature: 0.1,
              response_format: { type: 'json_object' }
            },
        };
        persona = persona ??
`You are one of the best professional translators in the world.
You pride yourself on your accuracy and attention to detail.
When a situation is ambiguous you stop to consider your options and provide the best answer you can.
You do not rely on additional help.
Maintain the exact meaning and tone of the original text
Handle numerical/date formats appropriately`;
        this.#systemPrompt =
`${persona}
- Each string may contain HTML or XML tags. Preserve ALL markup (HTML/XML tags, entities, placeholders)
- Maintain original structure and attributes
- Maintain proper escaping of special characters
- Translate only text nodes. Do not alter tag structure
- Do not include any additional explanations or notes in your response
- Return your answer as a JSON array of strings, in the same order as the input strings with this structure:
{ "translations": [ ... ] }`;
    }

    async synchTranslateChunk({ sourceLang, targetLang, src, instructions }) {
        const jobInstructions = instructions ? `Consider also the following instructions: ${instructions}` : '';
        const userPrompt =
`${jobInstructions}
Translate these ${src.length} strings from ${sourceLang} to ${targetLang}:
${JSON.stringify(src, null, 2)}

Respond with a JSON array containing ONLY the translations in order.`;

        try {
            const response = await fetch(this.#endpoint, {
                ...this.#baseRequest,
                body: JSON.stringify({
                    ...this.#baseRequest.body,
                    messages: [
                        {role: 'system', content: this.#systemPrompt},
                        {role: 'user', content: userPrompt}
                ]}),
            });
            if (!response.ok) {
                // const error = await response.json();
                throw new Error(`GPT API request failed: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            console.dir(data, { depth: null });
            return JSON.parse(data.choices[0].message.content);
        } catch (error) {
            throw new Error(`Translation failed: ${error.message}`);
        }
    }

    convertTranslationResponse(chunk) {
        return chunk.translations.map(tgt => ({ tgt })); // TODO: add actual token counts
    }
}
