# @l10nmonster/helpers-googlecloud

L10n Monster helpers for integrating with Google Cloud Platform services including Translation API, BigQuery, Cloud Storage, and Generative AI.

## Installation

```bash
npm install @l10nmonster/helpers-googlecloud
```

## Components

### Translation Provider

**GCTProvider**: Google Cloud Translation API v3 provider for machine translation.

```javascript
import { GCTProvider } from '@l10nmonster/helpers-googlecloud';

const gctProvider = new GCTProvider({
    projectId: 'your-gcp-project-id',
    location: 'global', // or specific region
    // Additional configuration
});
```

### Source Adapter

**BQSource**: BigQuery source adapter for reading translatable content from BigQuery datasets.

```javascript
import { BQSource } from '@l10nmonster/helpers-googlecloud';

const bqSource = new BQSource({
    projectId: 'your-project-id',
    datasetId: 'your-dataset',
    tableId: 'your-table'
});
```

### AI Agent

**GenAIAgent**: Integration with Google's Generative AI for advanced translation tasks.

```javascript
import { GenAIAgent } from '@l10nmonster/helpers-googlecloud';

const genaiAgent = new GenAIAgent({
    apiKey: 'your-genai-api-key',
    model: 'gemini-pro'
});
```

### Storage Solutions

#### Google Cloud Storage

- **GCSStoreDelegate**: Cloud Storage delegate for file operations
- **GCSTmStore**: Translation memory storage in Cloud Storage

#### Google Drive

- **GDriveStoreDelegate**: Google Drive delegate for collaborative storage
- **README-gdrive.md**: Detailed setup instructions for Google Drive integration

```javascript
import { GCSStoreDelegate, GCSTmStore } from '@l10nmonster/helpers-googlecloud';

const gcsStore = new GCSTmStore({
    bucketName: 'your-bucket',
    keyFilename: 'path/to/service-account.json'
});
```

## Features

- **Cloud Translation API**: High-quality machine translation with custom models
- **BigQuery Integration**: Scalable data warehouse source for large datasets
- **Cloud Storage**: Distributed storage for translation memories and job data
- **Google Drive**: Collaborative storage with sharing capabilities
- **Generative AI**: Advanced AI-powered translation and localization tasks
- **Authentication**: Comprehensive Google Cloud authentication support

## Authentication

Supports multiple authentication methods:
- Service account key files
- Application Default Credentials (ADC)
- OAuth 2.0 for user accounts
- Workload Identity for GKE environments

## Dependencies

- `@google-cloud/bigquery`: BigQuery client library
- `@google-cloud/storage`: Cloud Storage client library
- `@google-cloud/translate`: Translation API client library
- `@google/genai`: Generative AI client library
- `google-auth-library`: Authentication library
- `googleapis`: Core Google APIs client
- `@l10nmonster/core`: Core L10n Monster functionality (peer dependency)

## Testing

```bash
npm test
```

Includes integration tests for Google Cloud services (requires proper authentication setup).