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

### Cloud SQL Integration

Create PostgreSQL connection pools configured for Google Cloud SQL with IAM authentication. Use with `@l10nmonster/helpers-pgsql` for PostgreSQL-based storage.

#### createCloudSqlPool

Full-featured pool creation with all configuration options:

```javascript
import { createCloudSqlPool } from '@l10nmonster/helpers-googlecloud';
import { PostgresDALManager } from '@l10nmonster/helpers-pgsql';

const pool = await createCloudSqlPool({
    instanceConnectionName: 'my-project:us-central1:my-instance',
    database: 'l10nmonster',
    user: 'my-service-account',  // Without @project.iam.gserviceaccount.com
    authType: 'IAM',             // 'IAM' or 'PASSWORD'
    min: 2,                      // Minimum pool size
    max: 10,                     // Maximum pool size
    idleTimeoutMillis: 30000     // Idle timeout
});

export default config.l10nMonster(import.meta.dirname)
    .dalManager(new PostgresDALManager({ existingPool: pool }))
    // ...
```

#### createCloudSqlPoolWithADC

Simplified pool creation using Application Default Credentials:

```javascript
import { createCloudSqlPoolWithADC } from '@l10nmonster/helpers-googlecloud';
import { PostgresDALManager } from '@l10nmonster/helpers-pgsql';

const pool = await createCloudSqlPoolWithADC({
    instanceConnectionName: 'my-project:us-central1:my-instance',
    database: 'l10nmonster',
    user: 'my-sa'  // For my-sa@my-project.iam.gserviceaccount.com
});

export default config.l10nMonster(import.meta.dirname)
    .dalManager(new PostgresDALManager({ existingPool: pool }))
    // ...
```

#### Cloud SQL Options

| Option | Type | Description |
|--------|------|-------------|
| `instanceConnectionName` | `string` | Cloud SQL instance (e.g., 'project:region:instance') |
| `database` | `string` | Database name |
| `user` | `string` | Database user (for IAM auth, omit @domain suffix) |
| `authType` | `'IAM' \| 'PASSWORD'` | Authentication type (default: 'IAM') |
| `password` | `string` | Password (only for PASSWORD authType) |
| `min` | `number` | Minimum pool size (default: 2) |
| `max` | `number` | Maximum pool size (default: 10) |
| `idleTimeoutMillis` | `number` | Idle timeout in ms (default: 30000) |

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
- **Cloud SQL**: PostgreSQL connection pools with IAM authentication for use with `@l10nmonster/helpers-pgsql`
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

### Optional Dependencies (for Cloud SQL)

- `@google-cloud/cloud-sql-connector`: Cloud SQL Connector for IAM authentication
- `pg`: PostgreSQL client library

## Testing

```bash
npm test
```

Includes integration tests for Google Cloud services (requires proper authentication setup).