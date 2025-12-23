import { GoogleGenAI, Type } from '@google/genai';
import { GoogleAuth } from 'google-auth-library';

import { logInfo, logVerbose, logWarn, providers, styleString } from '@l10nmonster/core';

const TRANSLATOR_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        translation: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
        notes: { type: Type.STRING },
    },
    propertyOrdering: [ 'translation', 'confidence', 'notes' ],
};

/**
 * @typedef {object} GenAIAgentOptions
 * @property {number} [thinkingBudget] - Maximum number of tokens for thinking
 * @property {Promise<string>|string} [apiKey] - The LLM provder API key (if needed).
 * @property {string} [vertexProject] - The VertexAI project ID.
 * @property {string} [vertexLocation] - The VertexAI datacenter location.
 * @property {boolean} [enableSearch] - Enable Google Search grounding.
 * @property {boolean} [enableMaps] - Enable Google Maps grounding.
 */

/**
 * Provider for Google Gen AI LLMs (Gemini).
 */
export class GenAIAgent extends providers.LLMTranslationProvider {
    #ai;
    #apiKey;
    #vertexProject;
    #vertexLocation;
    #enableSearch;
    #enableMaps;
    thinkingBudget;

    /**
     * Initializes a new instance of the GenAIAgent class.
     * @param {GenAIAgentOptions} options - Configuration options for the provider.
     */
    constructor({ apiKey, vertexProject, vertexLocation, thinkingBudget, enableSearch, enableMaps, ...options }) {
        // TODO: do we need to expose topX, topP?
        // @ts-ignore - spread loses type info but parent class handles validation
        super(options);
        this.#apiKey = apiKey;
        this.#vertexProject = vertexProject;
        this.#vertexLocation = vertexLocation;
        this.#enableSearch = enableSearch;
        this.#enableMaps = enableMaps;
        this.thinkingBudget = thinkingBudget;
    }

    // we initialize on first use so that constructor is fast and doesn't fail if auth is missing
    // also, we need this to be async so that we can await for projectId if it's not provided
    async lazyInit() {
        if (this.#ai) {
            return;
        }
        if (this.#apiKey) {
            // @ts-ignore - apiKey can be a function or value, TypeScript doesn't narrow correctly
            const resolvedKey = await (typeof this.#apiKey === 'function' ? this.#apiKey() : this.#apiKey);
            this.#ai = new GoogleGenAI({ apiKey: resolvedKey });
            logInfo`GenAIAgent ${this.id} initialized with the Gemini Developer platform`;
        } else {
            if (!this.#vertexProject) {
                try {
                    const auth = new GoogleAuth({});
                    this.#vertexProject = await auth.getProjectId();
                } catch (e) {
                    throw new Error(`Couldn't get credentials, did you run 'gcloud auth login'?\n${e.message}`);
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

    prepareTranslateChunkArgs({ sourceLang, targetLang, xmlTus, jobGuid, chunkNumber, instructions }) {
        const userPrompt = this.buildUserPrompt({ sourceLang, targetLang, xmlTus, instructions });
        const config = {
            systemInstruction: this.systemPrompt,
            temperature: this.temperature,
            seed: 9691,
            candidateCount: 1,
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: this.customSchema ?? TRANSLATOR_SCHEMA,
            },
        };
        this.thinkingBudget !== undefined && (config.thinkingConfig = { thinkingBudget: this.thinkingBudget });
        const tools = [];
        this.#enableSearch && tools.push({ googleSearch: {} });
        this.#enableMaps && tools.push({ googleMaps: {} });
        tools.length > 0 && (config.tools = tools);
        return {
            model: this.model,
            contents: userPrompt,
            config,
            sourceLang,
            targetLang,
            xmlTus,
            jobGuid,
            chunkNumber,
        };
    }

    async generateContent(args) {
        return await this.#ai.models.generateContent(args);
    }

    convertTranslationResponse(res) {
        try {
            res.promptFeedback && logVerbose`Prompt feedback: ${res.promptFeedback.blockReasonMessage}`;
            if (res.candidates) {
                res.candidates.length > 1 && logWarn`Actually had ${res.candidates.length} candidates to choose from`;
                if (res.candidates[0].finishReason !== 'STOP') {
                    throw new Error(`Unexpected finish reason: ${res.candidates[0].finishReason} ${res.candidates[0].finishMessage}`);
                }
            }
            const trans = JSON.parse(res.text);
            const cost = [
                (res.usageMetadata.cachedContentTokenCount ?? 0) / trans.length,
                (res.usageMetadata.promptTokenCount ?? 0) / trans.length,
                (res.usageMetadata.thoughtsTokenCount ?? 0) / trans.length,
                (res.usageMetadata.candidatesTokenCount ?? 0) / trans.length,
                (res.usageMetadata.toolUsePromptTokenCount ?? 0) / trans.length,
                (res.usageMetadata.totalTokenCount ?? 0) / trans.length,
            ];
            return this.processTranslations(trans, cost);
        } catch (e) {
            logWarn`Unexpected convertTranslationResponse error: ${e.message}`;
            return [];
        }
    }

    async info() {
        const info = await super.info();
        try {
            await this.lazyInit();
            info.description.push(styleString`Model: ${this.model} Using: ${this.#ai.vertexai ? `Vertex AI platform (${this.#ai.location}/${this.#ai.project})` : 'Gemini Developer platform'}`);
            // const counts = await this.#ai.models.countTokens({
            //     model: this.#model,
            //     contents: '',
            //     config: {
            //         systemInstruction: this.#systemPrompt,
            //     }
            // });
            // info.description.push(styleString`Cached Content Tokens: ${counts.cachedContentTokenCount}, total: ${counts.totalTokens}`);
            const cachedContents = await this.#ai.caches.list({config: { pageSize: 2 }});
            for await (const cachedContent of cachedContents) {
                info.description.push(styleString`Cached content: ${cachedContent}`);
            }
            const modelList = await this.#ai.models.list();
            for await (const model of modelList) {
                if (!model.supportedActions || model.supportedActions.find(action => action === 'generateContent')) {
                    info.description.push(styleString`Supported model: ${model.name} - ${model.displayName ?? ''} ${model.description ?? ''} (input=${model.inputTokenLimit ?? '?'}, output=${model.outputTokenLimit ?? '?'})`);
                }
            }
        } catch (e) {
            info.description.push(styleString`Unable to connect to Google GenAI server: ${e.cause?.message ?? e.message}`);
        }
        return info;
    }
}
