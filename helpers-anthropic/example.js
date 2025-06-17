import { AnthropicAgent } from './index.js';

// Example L10nMonster configuration using AnthropicAgent
export const exampleConfig = {
    translationProviders: [
        // Direct API configuration
        {
            id: 'claude-direct-api',
            provider: AnthropicAgent,
            options: {
                model: 'claude-3-5-sonnet-latest',
                quality: 90,
                temperature: 0.1,
                maxTokens: 4096,
                maxRetries: 3,                    // Passed to Anthropic SDK for native retry handling
                apiKey: process.env.ANTHROPIC_API_KEY, // Set your API key
                persona: 'You are a professional translator specializing in technical documentation and user interfaces.',
            }
        },
        // Vertex AI configuration
        {
            id: 'claude-vertex-sonnet',
            provider: AnthropicAgent,
            options: {
                model: 'claude-3-5-sonnet@20241022',
                quality: 85,
                temperature: 0.1,
                maxTokens: 4096,
                // vertexProject: 'your-gcp-project-id', // Optional, auto-detected
                vertexLocation: 'us-central1',
                persona: 'You are a professional translator specializing in technical documentation and user interfaces.',
            }
        },
        {
            id: 'claude-vertex-haiku',
            provider: AnthropicAgent,
            options: {
                model: 'claude-3-5-haiku@20241022',
                quality: 80,
                temperature: 0.1,
                maxTokens: 2048,
                vertexLocation: 'us-central1',
                persona: 'You are a fast and efficient translator focused on accuracy and consistency.',
            }
        }
    ],
    
    // Example translation jobs configuration
    jobs: [
        {
            id: 'ui-translation',
            translationProvider: 'claude-direct-api',
            instructions: 'Translate user interface strings. Keep labels concise and maintain consistent terminology.',
        },
        {
            id: 'content-translation',
            translationProvider: 'claude-vertex-haiku',
            instructions: 'Translate general content while maintaining the original tone and style.',
        }
    ]
};

// Example usage
console.log('AnthropicAgent configuration example loaded');
console.log('Available providers:', exampleConfig.translationProviders.map(p => p.id)); 