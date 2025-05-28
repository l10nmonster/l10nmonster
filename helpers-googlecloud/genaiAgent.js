import { GoogleGenAI, Type } from '@google/genai';
import { GoogleAuth } from 'google-auth-library';

import { logInfo, logVerbose, providers, styleString } from '@l10nmonster/core';

const TRANSLATOR_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        translation: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
        notes: { type: Type.STRING },
    },
    propertyOrdering: [ 'translation', 'confidence', 'notes' ],
};

const defaultSchemaInstructions =
`- Your input is provided in JSON format. It contains the source content and notes about each string that help you understand the context.
- Each string may contain HTML or XML tags. Preserve ALL markup (HTML/XML tags, entities, placeholders).
- Translate only text nodes. Do not alter tag structure.
- When a situation is ambiguous stop to consider your options, use additional context provided (notes, bundle, key), but always provide the best answer you can.
- Provide a confidence score between 0 and 100 that indicates correctness. Anything below 60 is an ambiguous translation that should be reviewed by a human.
- If a translation can be ambiguous, or you have questions about it, lower the confidence score and explain why in the notes field, including any clarifying questions.
- Return your answer as a JSON array with the exact same number of items and in the same order as the input`;

/**
 * @typedef {object} GenAIAgentOptions
 * @extends ChunkedRemoteTranslationProviderOptions
 * @property {string} [model] - The LLM model to use (gpt-4o by default)
 * @property {number} [temperature] - The temperature to use (0.1 by default)
 * @property {number} [thinkingBudget] - Maximum number of tokens for thinking
 * @property {string} [apiKey] - The LLM provder API key (if needed).
 * @property {string} [vertexProject] - The VertexAI project ID.
 * @property {string} [vertexLocation] - The VertexAI datacenter location.
 * @property {string} [persona] - An override to the default persona for the translator.
 * @property {import('zod').ZodTypeAny} [customSchema] - A prescribed schema to structure translations into.
 */

/**
 * Provider for Google Gen AI LLMs (Gemini).
 */
export class GenAIAgent extends providers.ChunkedRemoteTranslationProvider {
    #ai;
    #apiKey;
    #vertexProject;
    #vertexLocation;
    #model;
    #temperature;
    #thinkingBudget;
    #systemPrompt;
    #customSchema;

    /**
     * Initializes a new instance of the GenAIAgent class.
     * @param {GenAIAgentOptions} options - Configuration options for the provider.
     */
    constructor({ apiKey, vertexProject, vertexLocation, model, temperature, thinkingBudget, persona, customSchema, ...options }) {
        // TODO: do we need to expose topX, topP?
        if (!options.quality || !model) {
            throw new Error('You must specify quality and model for GenAIAgent');
        }
        super(options);
        this.#apiKey = apiKey;
        this.#vertexProject = vertexProject;
        this.#vertexLocation = vertexLocation;
        this.#model = model;
        this.#temperature = temperature ?? 0.1;
        this.#thinkingBudget = thinkingBudget;
        this.#customSchema = customSchema;
        persona = persona ?? 'You are one of the best professional translators in the world.';
        this.#systemPrompt = `${persona}\n${this.defaultInstructions ?? ''}\n${customSchema ? '' : defaultSchemaInstructions}`;
    }

    // we initialize on first use so that constructor is fast and doesn't fail if auth is missing
    // also, we need this to be async so that we can await for projectId if it's not provided
    async #lazyInit() {
        if (this.#ai) {
            return;
        }
        if (this.#apiKey) {
            this.#ai = new GoogleGenAI({ apiKey: this.#apiKey });
            logInfo`GenAIAgent ${this.id} initialized with the Gemini Developer platform`;
        } else {
            if (!this.#vertexProject) {
                try {
                    const auth = new GoogleAuth({});
                    this.#vertexProject = await auth.getProjectId();
                } catch (e) {
                    throw new Error(`Couldn't get credentials, did you run 'gcloud auth login'? ${e.message}`);
                }
            }
            this.#ai = new GoogleGenAI({
                vertexai: true,
                project: this.#vertexProject,
                location: this.#vertexLocation ?? 'global',
            });
            logInfo`GenAIAgent ${this.id} initialized with the Vertex AI platform`;
        }
    }

    prepareTranslateChunkArgs({ sourceLang, targetLang, xmlTus, instructions }) {
        const jobInstructions = instructions ? `Consider also the following instructions: ${instructions}` : '';
        const userPrompt =
`${jobInstructions}
Translate these ${xmlTus.length} strings from ${sourceLang} to ${targetLang}:

${JSON.stringify(xmlTus, null, 2)}`;
        const config = {
            systemInstruction: this.#systemPrompt,
            temperature: this.#temperature,
            seed: 9691,
            candidateCount: 1,
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: this.#customSchema ?? TRANSLATOR_SCHEMA,
            },
        };
        this.#thinkingBudget !== undefined && (config.thinkingConfig = { thinkingBudget: this.#thinkingBudget });
        return {
            model: this.#model,
            contents: userPrompt,
            config,
        };
    }

    async synchTranslateChunk(op) {
        await this.#lazyInit();
        return this.#ai.models.generateContent(op.args);
    }

    convertTranslationResponse(res) {
        res.promptFeedback && logVerbose`Prompt feedback: ${res.promptFeedback.blockReasonMessage}`;
        res.candidates && res.candidates.length > 1 && logVerbose`Actually had ${res.candidates.length} candidates to choose from`;
        const trans = JSON.parse(res.text);
        const cost = [
            (res.usageMetadata.cachedContentTokenCount ?? 0) / trans.length,
            (res.usageMetadata.promptTokenCount ?? 0) / trans.length,
            (res.usageMetadata.thoughtsTokenCount ?? 0) / trans.length,
            (res.usageMetadata.candidatesTokenCount ?? 0) / trans.length,
            (res.usageMetadata.toolUsePromptTokenCount ?? 0) / trans.length,
            (res.usageMetadata.totalTokenCount ?? 0) / trans.length,
        ];
        logVerbose`Confidence: ${trans.map(obj => obj.confidence).join(', ')}`;
        logVerbose`Notes: ${trans.map(obj => obj.notes).join(', ')}`;
        return trans.map(obj => {
            const baseTu = {
                tgt: this.#customSchema ? JSON.stringify(obj) : obj.translation,
                cost,
                tconf: obj.confidence,
            };
            obj.notes && obj.notes.length > 0 && (baseTu.tnotes = obj.notes);
            return baseTu;
        });
    }

    async info() {
        const info = await super.info();
        try {
            await this.#lazyInit();
            info.description.push(styleString`Model: ${this.#model} Using: ${this.#ai.vertex ? 'Vertex AI platform' : 'Gemini Developer platform'}`);
            const cachedContents = await this.#ai.caches.list({config: { pageSize: 2 }});
            for await (const cachedContent of cachedContents) {
                info.description.push(styleString`Cached content: ${cachedContent}`);
            }
            const modelList = await this.#ai.models.list();
            for await (const model of modelList) {
                model.supportedActions.find(action => action === 'generateContent') && info.description.push(styleString`Supported model: ${model.name} - ${model.displayName} ${model.description ?? ''} (input=${model.inputTokenLimit}, output=${model.outputTokenLimit})`);
            }
        } catch (e) {
            info.description.push(styleString`Unable to connect to Google GenAI server: ${e.cause?.message ?? e.message}`);
        }
        return info;
    }
}
