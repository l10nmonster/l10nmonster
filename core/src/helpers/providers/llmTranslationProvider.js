import { logInfo, logWarn, styleString } from '../../l10nContext.js';
import { ChunkedRemoteTranslationProvider } from './chunkedRemoteTranslationProvider.js';

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const DEFAULT_SCHEMA_INSTRUCTIONS =
`- Each string may contain HTML tags. Preserve ALL markup and don't close unclosed tags. Translate only text nodes. Do not alter tag structure
- Provide a confidence score between 0 and 100 that indicates how likely the translation doesn't need adjustments due to context.
- Your input is provided in JSON format. It contains the source content and notes about each string that helps you understand the context.
- When a situation is ambiguous stop to consider your options, use additional context provided (notes, bundle, key), but always provide the best answer you can.
- Provide a confidence score between 0 and 100 that indicates correctness. Anything below 60 is an ambiguous translation that should be reviewed by a human.
- If a translation can be ambiguous, or you have questions about it, lower the confidence score and explain why in the notes field, including any clarifying questions.
- Return your answer as a JSON array with the exact same number of items and in the same order as the input`;

/**
 * @typedef {object} LLMTranslationProviderOptions
 * @extends ChunkedRemoteTranslationProviderOptions
 * @property {string} model - The LLM model to use (required)
 * @property {number} [temperature] - The temperature to use (0.1 by default)
 * @property {string} [persona] - An override to the default persona for the translator.
 * @property {import('zod').ZodTypeAny} [customSchema] - A prescribed schema to structure translations into.
 * @property {number} [maxRetries] - Maximum number of retries for failed requests (2 by default)
 * @property {number} [sleepBasePeriod] - Base sleep period in milliseconds for retry backoff (3000 by default)
 */

/**
 * Base class for LLM-based translation providers that share common prompt construction and schema handling.
 * @class LLMTranslationProvider
 * @extends providers.ChunkedRemoteTranslationProvider
 */
export class LLMTranslationProvider extends ChunkedRemoteTranslationProvider {
    #model;
    #temperature;
    #systemPrompt;
    #customSchema;
    #maxRetries;
    #sleepBasePeriod;

    /**
     * Initializes a new instance of the LLMTranslationProvider class.
     * @param {LLMTranslationProviderOptions} options - Configuration options for the provider.
     */
    constructor({ model, temperature, persona, customSchema, maxRetries, sleepBasePeriod, ...options }) {
        super(options);
        if (!options.quality || !model) {
            throw new Error(`You must specify quality and model for ${this.constructor.name}`);
        }
        this.#model = model;
        this.#temperature = temperature ?? 0.1;
        this.#customSchema = customSchema;
        this.#maxRetries = maxRetries ?? 2;
        this.#sleepBasePeriod = sleepBasePeriod ?? 3000;
        
        persona = persona ?? 'You are one of the best professional translators in the world.';
        this.#systemPrompt = this.buildSystemPrompt(persona, customSchema);
        
        logInfo`LLMTranslationProvider ${this.id} initialized with model: ${model}`;
    }

    /**
     * Builds the system prompt from persona, default instructions, and schema instructions.
     * @param {string} persona - The persona for the translator
     * @param {*} customSchema - Custom schema if provided
     * @returns {string} The constructed system prompt
     */
    buildSystemPrompt(persona, customSchema) {
        const schemaInstructions = customSchema ? '' : DEFAULT_SCHEMA_INSTRUCTIONS;
        return `${persona}\n${this.defaultInstructions ?? ''}\n${schemaInstructions}`;
    }

    /**
     * Builds the user prompt for translation requests.
     * @param {object} options - Options for building the prompt
     * @param {string} options.sourceLang - Source language
     * @param {string} options.targetLang - Target language
     * @param {Array} options.xmlTus - Translation units in XML format
     * @param {string} [options.instructions] - Additional job instructions
     * @returns {string} The constructed user prompt
     */
    buildUserPrompt({ sourceLang, targetLang, xmlTus, instructions }) {
        const jobInstructions = instructions ? `Consider also the following instructions: ${instructions}` : '';
        return `${jobInstructions}
Translate these ${xmlTus.length} strings from ${sourceLang} to ${targetLang}:

${JSON.stringify(xmlTus, null, 2)}`;
    }

    /**
     * Lazy initialization method that must be implemented by subclasses.
     * This should initialize the LLM client on first use.
     * @abstract
     * @returns {Promise<void>}
     */
    async lazyInit() {
        throw new Error(`lazyInit not implemented in ${this.constructor.name}`);
    }

    /**
     * Provider-specific method to generate content from the LLM.
     * This should make the actual API call to the LLM service.
     * @abstract
     * @param {object} args - The provider-specific arguments for the LLM call
     * @returns {Promise<*>} The raw response from the LLM
     */
    async generateContent(args) {
        throw new Error(`generateContent not implemented in ${this.constructor.name}`);
    }

    /**
     * Executes LLM content generation with retry logic and error handling.
     * @param {object} args - The provider-specific arguments for the LLM call
     * @returns {Promise<*>} The response from the LLM
     */
    async startTranslateChunk(args) {
        try {
            await this.lazyInit();
            return await this.generateContent(args);
        } catch (e) {
            let lastError = e;
            for (let retry = 1; retry <= this.#maxRetries; retry++) {
                logWarn`Unexpected generateContent error (attempt ${retry}/${this.#maxRetries}): ${e.message}`;
                const sleepTime = this.#sleepBasePeriod * retry * retry;
                logInfo`Sleeping ${sleepTime}ms before retrying...`;
                await sleep(sleepTime);
                try {
                    return await this.generateContent(args);
                } catch (e) {
                    lastError = e;
                }
            }
            throw lastError; // Re-throw after final attempt
        }
    }

    /**
     * Gets the model being used by this provider.
     * @returns {string} The model name
     */
    get model() {
        return this.#model;
    }

    /**
     * Gets the temperature being used by this provider.
     * @returns {number} The temperature value
     */
    get temperature() {
        return this.#temperature;
    }

    /**
     * Gets the system prompt being used by this provider.
     * @returns {string} The system prompt
     */
    get systemPrompt() {
        return this.#systemPrompt;
    }

    /**
     * Gets the custom schema being used by this provider.
     * @returns {*} The custom schema or undefined
     */
    get customSchema() {
        return this.#customSchema;
    }

    /**
     * Gets the maximum number of retries.
     * @returns {number} The max retries value
     */
    get maxRetries() {
        return this.#maxRetries;
    }

    /**
     * Gets the base sleep period for retry backoff.
     * @returns {number} The sleep base period in milliseconds
     */
    get sleepBasePeriod() {
        return this.#sleepBasePeriod;
    }

    /**
     * Processes a translation object to extract the target text.
     * For custom schemas, returns JSON stringified object.
     * For default schema, returns the translation field.
     * @param {object} translationObj - The translation object from the LLM response
     * @returns {string} The target translation text
     */
    extractTargetText(translationObj) {
        return this.#customSchema ? JSON.stringify(translationObj) : translationObj.translation;
    }

    /**
     * Processes translation objects to create standard translation units.
     * @param {Array} translations - Array of translation objects from LLM
     * @param {Array} cost - Cost information per translation
     * @returns {Array} Array of processed translation units
     */
    processTranslations(translations, cost) {
        return translations.map(obj => {
            const baseTu = {
                tgt: this.extractTargetText(obj),
                cost,
            };
            
            // Add confidence and notes if available (for default schema)
            if (!this.#customSchema) {
                if (obj.confidence !== undefined) {
                    baseTu.tconf = obj.confidence;
                }
                // Handle both tnotes and notes fields (GenAI vs OpenAI)
                if (obj.tnotes !== undefined) {
                    baseTu.tnotes = obj.tnotes;
                }
                if (obj.notes && obj.notes.length > 0) {
                    baseTu.tnotes = obj.notes;
                }
            }
            
            return baseTu;
        });
    }

    async info() {
        const info = await super.info();
        info.description.push(styleString`Max retries: ${this.#maxRetries}, sleep base period: ${this.#sleepBasePeriod}ms`);
        return info;
    }
} 