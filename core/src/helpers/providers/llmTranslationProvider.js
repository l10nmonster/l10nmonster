import { logInfo, logWarn, styleString } from '../../l10nContext.js';
import { ChunkedRemoteTranslationProvider } from './chunkedRemoteTranslationProvider.js';
import * as utils from '../utils.js';

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    });
}

const DEFAULT_PERSONA = 
`You are one of the best professional translators in the world.
- When a situation is ambiguous stop to consider your options, use additional context provided (notes, bundle, key), but always provide the best answer you can.
- Each string may contain HTML tags. Preserve ALL markup and don't close unclosed tags. Translate only text nodes. Do not alter tag structure.
- Provide a confidence score between 0 and 100 that indicates how likely the translation doesn't need adjustments due to context. Anything below 60 is an ambiguous translation that should be reviewed by a human.
- Your input is provided in JSON format. It contains the source content and notes about each string that helps you understand the context.
- If a translation can be ambiguous, or you have questions about it, lower the confidence score and explain why in the notes field, including any clarifying questions.
- Return your answer as a JSON array with the exact same number of items and in the same order as the input.`;

/**
 * @typedef {object} LLMTranslationProviderOptions
 * @extends ChunkedRemoteTranslationProviderOptions
 * @property {string} model - The LLM model to use (required)
 * @property {number} [temperature] - The temperature to use (0.1 by default)
 * @property {string} [persona] - An override to the default persona for the translator.
 * @property {object} [targetLangInstructions] - Object with target languages as keys and instructions as values
 * @property {import('zod').ZodTypeAny} [customSchema] - A prescribed schema to structure translations into.
 * @property {number} [maxRetries] - Maximum number of retries for failed requests (2 by default)
 * @property {number} [sleepBasePeriod] - Base sleep period in milliseconds for retry backoff (3000 by default)
 */

/**
 * Base class for LLM-based translation providers that share common prompt construction and schema handling.
 * @class LLMTranslationProvider
 * @extends ChunkedRemoteTranslationProvider
 */
export class LLMTranslationProvider extends ChunkedRemoteTranslationProvider {
    model;
    temperature;
    systemPrompt;
    customSchema;
    maxRetries;
    sleepBasePeriod;
    targetLangInstructions = {};

    /**
     * Initializes a new instance of the LLMTranslationProvider class.
     * @param {LLMTranslationProviderOptions} options - Configuration options for the provider.
     */
    constructor({ model, temperature, persona, customSchema, maxRetries, sleepBasePeriod, targetLangInstructions, ...options }) {
        super(options);
        if (!options.quality || !model) {
            throw new Error(`You must specify quality and model for ${this.constructor.name}`);
        }
        this.model = model;
        this.temperature = temperature ?? 0.1;
        this.customSchema = customSchema;
        this.maxRetries = maxRetries ?? 2;
        this.sleepBasePeriod = sleepBasePeriod ?? 3000;
        this.targetLangInstructions = targetLangInstructions ?? {};
        this.systemPrompt = `${persona ?? DEFAULT_PERSONA}\n${this.defaultInstructions ?? ''}\n`;   
        logInfo`LLMTranslationProvider ${this.id} initialized with model: ${model}`;
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
        let userPrompt = [];
        
        // Add target language specific instructions if available
        this.targetLangInstructions[targetLang] && userPrompt.push(this.targetLangInstructions[targetLang]);
        
        // Add job instructions if available
        instructions && userPrompt.push(`Consider also the following instructions: ${instructions}`);
        
        userPrompt.push(`Source language: ${sourceLang}`);
        userPrompt.push(`Target language: ${targetLang}`);
        userPrompt.push(`Number of segments: ${xmlTus.length}`);
        userPrompt.push(`Segments: ${JSON.stringify(Object.fromEntries(xmlTus.map((xmlTU, idx) => [`tu${idx}`, xmlTU])))}`);
        
        return userPrompt.join('\n');
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
    // eslint-disable-next-line no-unused-vars
    async generateContent(args) {
        throw new Error(`generateContent not implemented in ${this.constructor.name}`);
    }

    shouldRetry(error) {
        const status = error.status;
        return status === 408 || status === 429 || status >= 500 || status === undefined; // in case the exception doesn't have a status property, retry
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
            for (let retry = 1; retry <= this.maxRetries && this.shouldRetry(lastError); retry++) {
                logWarn`Unexpected generateContent error (status=${e.status}): ${e.message}`;
                const sleepTime = this.sleepBasePeriod * retry * retry;
                logInfo`Sleeping ${sleepTime}ms before retrying (attempt ${retry}/${this.maxRetries})...`;
                await sleep(sleepTime);
                try {
                    return await this.generateContent(args);
                } catch (e) {
                    lastError = e;
                }
            }
            logWarn`Exceeded retries (max=${this.maxRetries}, shouldRetry=${this.shouldRetry(lastError)}) for unexpected generateContent error (status=${e.status}): ${e.message}`;
            throw lastError; // Re-throw after final attempt
        }
    }

    async startTranslateChunkOp(op) {
        const { tuMeta, ...args } = op.args;
        const raw = await this.startTranslateChunk(args);
        const convertedResponse = this.convertTranslationResponse(raw);
        // if (tuMeta.length !== flattenedRes.length) {
        //     logError`Expected chunk to have ${tuMeta.length} translations but got ${flattenedRes.length}`;
        //     return { raw, res: [] }; // discard the chunk because we can't pair up the translations with the guids
        // }
        const res = [];
        convertedResponse.forEach((convertedTu, idx) => {
            const { tuIdx, tgt, ...tu } = convertedTu;
            const meta = tuMeta[idx];
            if (meta) {
                tuIdx !== idx && logWarn`Warning guid ${meta.guid} has tuIdx ${tuIdx} but expected ${idx}`;
                tu.guid = meta.guid;
                try {
                    tu.ntgt = utils.extractNormalizedPartsFromXmlV1(tgt, meta.phMap || {});
                    res.push(tu);
                } catch (e) {
                    logWarn`Error extracting normalized parts for tu ${meta.guid}: ${e}`;
                }
            } else {
                logWarn`Warning response at index ${idx} has a tuIdx ${tuIdx} that doesn't exist in tuMeta`;
            }
        });
        return { raw, res }; // return raw just for debugging
    }

    /**
     * Processes a translation object to extract the target text.
     * For custom schemas, returns JSON stringified object.
     * For default schema, returns the translation field.
     * @param {object} translationObj - The translation object from the LLM response
     * @returns {string} The target translation text
     */
    extractTargetText(translationObj) {
        return this.customSchema ? JSON.stringify(translationObj) : translationObj.translation;
    }

    /**
     * Processes translation objects to create standard translation units.
     * @param {Array} translations - Array of translation objects from LLM
     * @param {Array} cost - Cost information per translation
     * @returns {Array} Array of processed translation units
     */
    processTranslations(translations, cost) {
        return Object.entries(translations).map(([tuIdx, obj]) => {
            const baseTu = {
                tuIdx: Number(tuIdx.replace('tu', '')),
                tgt: this.extractTargetText(obj),
                cost,
            };
            
            // Add confidence and notes if available (for default schema)
            if (!this.customSchema) {
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
        info.description.push(styleString`Max retries: ${this.maxRetries}, sleep base period: ${this.sleepBasePeriod}ms`);
        return info;
    }
} 