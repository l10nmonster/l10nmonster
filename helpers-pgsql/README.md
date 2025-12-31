# @l10nmonster/helpers-pgsql

PostgreSQL implementations for L10n Monster. This package provides:

- **PostgresDALManager** - Complete replacement for the default SQLite storage
- **PgSuperStore** - Factory for creating TM and Snap stores backed by PostgreSQL

## Installation

```bash
npm install @l10nmonster/helpers-pgsql
```

## Usage

### Basic Configuration

```javascript
// l10nmonster.config.mjs
import { config, adapters, providers } from '@l10nmonster/core';
import { PostgresDALManager } from '@l10nmonster/helpers-pgsql';

export default config.l10nMonster(import.meta.dirname)
    .dalManager(new PostgresDALManager({
        connection: {
            host: process.env.PGHOST || 'localhost',
            port: parseInt(process.env.PGPORT || '5432'),
            database: process.env.PGDATABASE || 'l10nmonster',
            user: process.env.PGUSER,
            password: process.env.PGPASSWORD,
        },
        pool: {
            min: 2,
            max: 10,
        }
    }))
    .channel(/* ... */)
    .provider(/* ... */);
```

### Connection String

```javascript
new PostgresDALManager({
    connectionString: 'postgres://user:password@localhost:5432/l10nmonster'
})
```

### With SSL

```javascript
new PostgresDALManager({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
})
```

### Google Cloud SQL

For Google Cloud SQL integration, use `createCloudSqlPool` from `@l10nmonster/helpers-googlecloud`:

```javascript
import { PostgresDALManager } from '@l10nmonster/helpers-pgsql';
import { createCloudSqlPool } from '@l10nmonster/helpers-googlecloud';

// Create a Cloud SQL pool with IAM authentication
const pool = await createCloudSqlPool({
    instanceConnectionName: 'project:region:instance',
    database: 'l10nmonster',
    user: 'my-service-account',  // Without @project.iam.gserviceaccount.com
    authType: 'IAM'
});

export default config.l10nMonster(import.meta.dirname)
    .dalManager(new PostgresDALManager({ existingPool: pool }))
    // ...
```

---

## PgSuperStore

Factory for creating PostgreSQL-backed TM stores and Snap stores. All stores created from the same factory share a connection pool.

### Basic Usage

```javascript
import { PgSuperStore } from '@l10nmonster/helpers-pgsql';

const superStore = new PgSuperStore({
    connectionString: 'postgresql://user:pass@localhost/l10nmonster'
});

// Create stores
const tmStore = superStore.createTmStore({ id: 'my-tm' });
const snapStore = superStore.createSnapStore({ id: 'my-snaps' });

export default config.l10nMonster(import.meta.dirname)
    .tmStore(tmStore)
    .snapStore(snapStore)
    // ...
```

### Data Segregation

Multiple stores can share the same database tables using segregation keys:

```javascript
// Production and staging TM stores backed by the same table
const productionTm = superStore.createTmStore({
    id: 'production-tm',
    tmStoreId: 'production'   // Data segregation key
});

const stagingTm = superStore.createTmStore({
    id: 'staging-tm',
    tmStoreId: 'staging',
    access: 'readonly'
});
```

### onlyLeveraged Filtering

Filter TM downloads to only include TUs that exist in current content:

```javascript
const leveragedTm = superStore.createTmStore({
    id: 'leveraged-tm',
    tmStoreId: 'production',
    onlyLeveraged: ['android', 'ios'],  // Only TUs in these channels
    snapStoreId: 'my-snaps'             // Uses snap store for GUID lookup
});
```

This filters out TUs that aren't "leveraged" (don't exist in active content), reducing sync time and storage.

### Delta-Based Snap Store

The snap store uses temporal tables (SCD Type 2) to store only changed data:

```javascript
const snapStore = superStore.createSnapStore({
    id: 'backup-snaps',
    snapStoreId: 'backup'
});
```

Benefits:
- Only stores changed/new/deleted rows (not full copies)
- MD5 hash comparison for fast change detection
- Point-in-time snapshot reconstruction
- Full history preserved

### Google Cloud SQL

```javascript
import { PgSuperStore } from '@l10nmonster/helpers-pgsql';
import { createCloudSqlPool } from '@l10nmonster/helpers-googlecloud';

const pool = await createCloudSqlPool({
    instanceConnectionName: 'project:region:instance',
    database: 'l10nmonster',
    user: 'my-service-account',
    authType: 'IAM'
});

const superStore = new PgSuperStore({ existingPool: pool });
```

### PgSuperStore Options

| Option | Type | Description |
|--------|------|-------------|
| `connectionString` | `string` | PostgreSQL connection URL |
| `connection.host` | `string` | Database host (default: 'localhost') |
| `connection.port` | `number` | Database port (default: 5432) |
| `connection.database` | `string` | Database name (default: 'l10nmonster') |
| `connection.user` | `string` | Database user |
| `connection.password` | `string` | Database password |
| `pool.min` | `number` | Minimum pool size (default: 4) |
| `pool.max` | `number` | Maximum pool size (default: 32) |
| `ssl` | `boolean \| object` | SSL configuration |
| `existingPool` | `pg.Pool` | Pre-configured Pool instance |

### createTmStore Options

| Option | Type | Description |
|--------|------|-------------|
| `id` | `string` | **Required.** Logical store ID |
| `tmStoreId` | `string` | Data segregation key (defaults to id) |
| `access` | `'readwrite' \| 'readonly' \| 'writeonly'` | Access mode (default: 'readwrite') |
| `partitioning` | `'job' \| 'provider' \| 'language'` | Partitioning strategy (default: 'language') |
| `onlyLeveraged` | `string[]` | Channel IDs to filter TUs by |
| `snapStoreId` | `string` | SnapStore ID for onlyLeveraged (required if onlyLeveraged is set) |

### createSnapStore Options

| Option | Type | Description |
|--------|------|-------------|
| `id` | `string` | **Required.** Logical store ID |
| `snapStoreId` | `string` | Data segregation key (defaults to id) |

---

## PostgresDALManager

Complete PostgreSQL replacement for SQLite storage.

## Configuration Options

### PostgresDALManagerOptions

| Option | Type | Description |
|--------|------|-------------|
| `connectionString` | `string` | PostgreSQL connection URL |
| `connection.host` | `string` | Database host (default: 'localhost') |
| `connection.port` | `number` | Database port (default: 5432) |
| `connection.database` | `string` | Database name (default: 'l10nmonster') |
| `connection.user` | `string` | Database user |
| `connection.password` | `string` | Database password |
| `pool.min` | `number` | Minimum pool size (default: 2) |
| `pool.max` | `number` | Maximum pool size (default: 10) |
| `pool.idleTimeoutMillis` | `number` | Idle connection timeout (default: 30000) |
| `ssl` | `boolean \| object` | SSL configuration |
| `existingPool` | `pg.Pool` | Pre-configured Pool instance |

## Migration from SQLite

To migrate existing data from SQLite to PostgreSQL:

1. **Export your TM to a store:**
   ```bash
   npx l10n tm syncup <storeId>
   ```

2. **Update your config to use PostgresDALManager**

3. **Import from the store:**
   ```bash
   npx l10n tm bootstrap <storeId>
   ```

## Database Schema

The package automatically creates the following tables:

### PostgresDALManager Tables

- `channel_toc` - Channel metadata
- `resources_{channelId}` - Resources per channel
- `segments_{channelId}` - Segments per channel
- `tus_{sourceLang}_{targetLang}` - Translation units per language pair
- `jobs` - Job metadata

### PgSuperStore Tables

- `tm_blocks` - TUs with `tm_store_id` segregation
- `tm_jobs` - Job metadata with `tm_store_id` segregation
- `snap_resources` - Resources with temporal tracking (`valid_from`/`valid_to`)
- `snap_segments` - Segments with temporal tracking
- `snap_toc` - Snapshot timestamps and counts

## Requirements

- Node.js >= 22.11.0
- PostgreSQL 12+
- `@l10nmonster/core` 3.1.1+

## Setup

Before using the PostgreSQL DAL, create the database:

```bash
# Using createdb command
createdb l10nmonster

# Or via psql
psql -c "CREATE DATABASE l10nmonster;"
```

The required tables will be created automatically on first run.

## License

MIT
