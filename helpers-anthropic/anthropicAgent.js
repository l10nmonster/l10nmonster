import { AnthropicVertex } from '@anthropic-ai/vertex-sdk';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleAuth } from 'google-auth-library';

import { logInfo, logVerbose, logWarn, providers, styleString } from '../core/index.js';

const TRANSLATION_TOOL = {
    name: 'provide_translations',
    description: 'Provide translations for the given strings',
    input_schema: {
        type: 'object',
        properties: {
            translations: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        translation: { type: 'string', description: 'the translated string' },
                        confidence: { type: 'number', description: 'a confidence score between 0 and 100' },
                        notes: { type: 'string', description: 'any additional notes about the translation' }
                    },
                    required: ['translation', 'confidence', 'notes']
                }
            }
        },
        required: ['translations']
    }
};

/**
 * @typedef {object} AnthropicAgentOptions
 * @extends LLMTranslationProviderOptions
 * @property {string} [apiKey] - The Anthropic API key (if using direct API).
 * @property {string} [vertexProject] - The VertexAI project ID.
 * @property {string} [vertexLocation] - The VertexAI datacenter location.
 * @property {number} [maxTokens] - Maximum number of output tokens (32000 by default)
 */

/**
 * Provider for Anthropic Claude LLMs via Vertex AI or direct API.
 */
export class AnthropicAgent extends providers.LLMTranslationProvider {
    #client;
    #apiKey;
    #vertexProject;
    #vertexLocation;
    #maxTokens;
    #maxRetries;

    /**
     * Initializes a new instance of the AnthropicAgent class.
     * @param {AnthropicAgentOptions} options - Configuration options for the provider.
     */
    constructor({ apiKey, vertexProject, vertexLocation, maxTokens, maxRetries, ...options }) {
        super({...options, maxRetries: 0}); // bypass our own retry logic since Anthropic SDK has built-in support
        this.#apiKey = apiKey;
        this.#vertexProject = vertexProject;
        this.#vertexLocation = vertexLocation ?? 'us-east5';
        this.#maxTokens = maxTokens ?? 32000;
        this.#maxRetries = maxRetries ?? 2;
    }

    // we initialize on first use so that constructor is fast and doesn't fail if auth is missing
    // also, we need this to be async so that we can await for projectId if it's not provided
    async lazyInit() {
        if (this.#client) {
            return;
        }
        if (this.#apiKey) {
            // Direct Anthropic API
            this.#client = new Anthropic({
                apiKey: this.#apiKey,
                maxRetries: this.#maxRetries,
                timeout: 15 * 60000, // 15 minutes
            });
            logInfo`AnthropicAgent ${this.id} initialized with direct Anthropic API`;
        } else {
            if (!this.#vertexProject) {
                try {
                    const auth = new GoogleAuth({});
                    this.#vertexProject = await auth.getProjectId();
                } catch (e) {
                    throw new Error(`Couldn't get credentials, did you run 'gcloud auth login'?\n${e.message}`);
                }
            }
            this.#client = new AnthropicVertex({
                projectId: this.#vertexProject,
                region: this.#vertexLocation,
                maxRetries: this.#maxRetries,
                timeout: 15 * 60000, // 15 minutes
            });
            throw new Error('test');
            logInfo`AnthropicAgent ${this.id} initialized with Vertex AI platform (${this.#vertexLocation}/${this.#vertexProject})`;
        }
    }

    prepareTranslateChunkArgs({ sourceLang, targetLang, xmlTus, instructions }) {
        const userPrompt = this.buildUserPrompt({ sourceLang, targetLang, xmlTus, instructions });
        
        const messages = [
            {
                role: 'user',
                content: userPrompt
            }
        ];

        const toolConfig = this.customSchema ? {
            tools: [{
                name: 'provide_custom_translations',
                description: 'Provide translations using custom schema',
                input_schema: {
                    type: 'object',
                    properties: {
                        translations: {
                            type: 'array',
                            items: this.customSchema
                        }
                    },
                    required: ['translations']
                }
            }],
            tool_choice: { type: 'tool', name: 'provide_custom_translations' }
        } : {
            tools: [TRANSLATION_TOOL],
            tool_choice: { type: 'tool', name: 'provide_translations' }
        };

        return {
            model: this.model,
            max_tokens: this.#maxTokens,
            temperature: this.temperature,
            system: this.systemPrompt,
            messages,
            ...toolConfig
        };
    }

    async generateContent(args) {
        return await this.#client.messages.create(args);
    }

    convertTranslationResponse(res) {
        try {
            if (res.stop_reason !== 'tool_use') {
                throw new Error(`Unexpected stop reason: ${res.stop_reason}`);
            }

            // Find the tool use content
            const toolUse = res.content.find(content => content.type === 'tool_use');
            if (!toolUse) {
                throw new Error('No tool use found in response');
            }

            const translations = toolUse.input.translations;
            if (!Array.isArray(translations)) {
                throw new Error('Invalid translations format');
            }

            const cost = [
                (res.usage.input_tokens ?? 0) / translations.length,
                (res.usage.output_tokens ?? 0) / translations.length,
                ((res.usage.input_tokens ?? 0) + (res.usage.output_tokens ?? 0)) / translations.length,
            ];

            return this.processTranslations(translations, cost);
        } catch (e) {
            logWarn`Unexpected convertTranslationResponse error: ${e.message}`;
            return [];
        }
    }

    async info() {
        const info = await super.info();
        try {
            await this.lazyInit();
            // SDK doesn't support listing models or getting model info on Vertex AI
            const models = ['claude-opus-4-20250514', 'claude-sonnet-4-20250514'];
            info.description.push(styleString`Supported models: ${models.join(', ')}`);
        } catch (e) {
            info.description.push(styleString`Unable to connect to Anthropic server: ${e.cause?.message ?? e.message}`);
        }
        return info;
    }
}