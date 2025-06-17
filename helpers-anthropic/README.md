# L10nMonster Anthropic Helper

This package provides integration between L10nMonster and Anthropic's Claude models via both direct API and Google Vertex AI.

## Installation

```bash
npm install @l10nmonster/helpers-anthropic
```

## Usage

### Direct API Configuration

```javascript
import { AnthropicAgent } from '@l10nmonster/helpers-anthropic';

const agent = new AnthropicAgent({
    id: 'claude-translator',
    model: 'claude-3-5-sonnet-latest',
    quality: 80,
    temperature: 0.1,
    maxTokens: 4096,
    apiKey: 'your-anthropic-api-key'  // Direct API access
});
```

### Vertex AI Configuration

```javascript
import { AnthropicAgent } from '@l10nmonster/helpers-anthropic';

const agent = new AnthropicAgent({
    id: 'claude-translator',
    model: 'claude-3-5-sonnet@20241022',
    quality: 80,
    temperature: 0.1,
    maxTokens: 4096,
    vertexProject: 'your-gcp-project-id',
    vertexLocation: 'us-central1'
});
```

### Authentication

The AnthropicAgent supports two authentication methods:

#### Direct API
1. **API Key**: Obtain an API key from [Anthropic Console](https://console.anthropic.com/)
2. **Set apiKey**: Pass your API key in the configuration

#### Vertex AI
1. **Service Account**: Set up a service account with Vertex AI permissions
2. **gcloud CLI**: Run `gcloud auth login` and `gcloud config set project YOUR_PROJECT_ID`
3. **Environment Variables**: Set `GOOGLE_APPLICATION_CREDENTIALS` to point to your service account key file

### Retry Behavior

The AnthropicAgent uses the native retry mechanism built into both the Anthropic SDK and Anthropic Vertex SDK:

- **Automatic Retries**: Both SDKs automatically handle retries with exponential backoff
- **Configurable**: Set `maxRetries` in the constructor to control retry attempts (passed directly to both SDKs)
- **Smart Error Handling**: Automatically retries on network errors, rate limits, and temporary service issues
- **No Manual Implementation**: Unlike other providers, this uses the SDK's native retry logic for better reliability
- **Consistent Behavior**: The same `maxRetries` value is used whether you're using direct API or Vertex AI

### Configuration Options

- `model` (required): The Claude model to use
- `quality` (required): Quality score for translations (0-100)
- `apiKey`: Your Anthropic API key (for direct API access)
- `temperature`: Controls randomness (0.0-1.0, default: 0.1)
- `maxTokens`: Maximum output tokens (default: 4096)
- `maxRetries`: Maximum number of retries (passed to Anthropic SDK)
- `vertexProject`: GCP project ID (for Vertex AI, auto-detected if not provided)
- `vertexLocation`: GCP region (for Vertex AI, default: 'global')
- `persona`: Custom translator persona (optional)
- `customSchema`: Custom response schema (optional)

## Testing

Run the test suite using Node.js built-in testing:

```bash
# From the package directory
npm test

# From the workspace root
npm test --workspace=helpers-anthropic
```

The test suite includes:
- Unit tests for all major functionality
- Integration tests with the LLMTranslationProvider inheritance
- Error handling and edge case scenarios
- Mock testing without external API calls

## Requirements

- Node.js >= 18.0.0
- Google Cloud Project with Vertex AI API enabled
- Proper authentication setup for Google Cloud

## License

MIT 