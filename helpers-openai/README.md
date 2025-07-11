# L10n Monster OpenAI Helper

This package provides integration between L10nMonster and OpenAI's GPT models or any OpenAI-compatible API.

## Installation

```bash
npm install @l10nmonster/helpers-openai
```

## Usage

### Basic Configuration

```javascript
import { GPTAgent } from '@l10nmonster/helpers-openai';

const agent = new GPTAgent({
    id: 'gpt-translator',
    model: 'gpt-4o',
    quality: 90,
    temperature: 0.1,
    maxRetries: 3,                    // Retry failed requests up to 3 times
    sleepBasePeriod: 2000,            // Start with 2s backoff, increasing exponentially
    apiKey: 'your-openai-api-key'
});
```

### Custom Endpoint Configuration

```javascript
// Use with Azure OpenAI or other compatible endpoints
const agent = new GPTAgent({
    id: 'azure-gpt',
    model: 'gpt-4',
    quality: 85,
    baseURL: 'https://your-resource.openai.azure.com/openai/deployments/your-deployment',
    apiKey: 'your-azure-api-key'
});
```

### Retry Behavior

The GPTAgent includes built-in retry logic for handling transient failures:

- **Exponential Backoff**: Sleep time increases quadratically with each retry (sleepBasePeriod × retry² × retry²)
- **Configurable Retries**: Set `maxRetries` to control the maximum number of retry attempts
- **Configurable Timing**: Set `sleepBasePeriod` to control the base delay between retries
- **Automatic Error Handling**: Automatically retries on network errors, rate limits, and temporary service issues

Example retry progression with `sleepBasePeriod: 1000` and `maxRetries: 3`:
- 1st retry: Wait 1000ms (1000 × 1² × 1²)
- 2nd retry: Wait 4000ms (1000 × 2² × 2²)  
- 3rd retry: Wait 9000ms (1000 × 3² × 3²)

### Configuration Options

- `model` (required): The GPT model to use (e.g., 'gpt-4o', 'gpt-4', 'gpt-3.5-turbo')
- `quality` (required): Quality score for translations (0-100)
- `temperature`: Controls randomness (0.0-1.0, default: 0.1)
- `apiKey`: OpenAI API key (required unless using environment variables)
- `baseURL`: Custom API endpoint (optional, for Azure OpenAI or compatible services)
- `maxRetries`: Maximum number of retries for failed requests (default: 2)
- `sleepBasePeriod`: Base sleep period in milliseconds for retry backoff (default: 3000)
- `persona`: Custom translator persona (optional)
- `customSchema`: Custom response schema (optional)

### Supported Models

OpenAI Models:
- gpt-4o
- gpt-4o-mini
- gpt-4-turbo
- gpt-4
- gpt-3.5-turbo

The provider also supports any OpenAI-compatible API that implements the chat completions endpoint with structured outputs.

## Testing

Run the test suite:

```bash
npm test
```

## Requirements

- Node.js >= 22.11.0
- OpenAI API key or compatible endpoint

## Features

- **Lazy Initialization**: API client is initialized on first use
- **Structured Outputs**: Uses Zod schemas for reliable JSON responses
- **Token Cost Tracking**: Tracks usage for cost analysis
- **Model Discovery**: Lists available models from the API
- **Configurable Retry Logic**: Customizable retry behavior for reliability

## License

MIT
