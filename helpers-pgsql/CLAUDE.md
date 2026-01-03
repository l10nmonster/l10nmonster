# CLAUDE.md - helpers-pgsql

This package provides PostgreSQL implementations for L10n Monster storage.

## Package Structure

```
helpers-pgsql/
├── index.js              # Package exports
├── pgDALManager.js       # PostgresDALManager - replaces SQLite for local storage
├── pgChannelDAL.js       # Channel data access layer
├── pgTuDAL.js            # Translation unit data access layer
├── pgUtils.js            # Shared utilities (SQL transformers, sanitization)
├── pgSuperStore.js       # Factory for TM/Snap stores
├── pgTmStore.js          # TMStore implementation (uses unified TU tables)
└── pgSnapStore.js        # SnapStore implementation
```

## Unified TM Schema

DAL and TMStore share the same TU storage tables with `store_id` for provenance tracking:

### Shared Tables

| Table | Purpose | Provenance |
|-------|---------|------------|
| `jobs` | Job metadata | `tm_store` column (NULL=local, string=TMStore) |
| `tus_{sourceLang}_{targetLang}` | Translation units | `store_id` column (NULL=local, string=TMStore) |

### Key Design Principle

- **DAL queries all TUs** regardless of `store_id` - unified TM with global ranking
- **TMStore filters by `store_id`** for sync operations
- **Ranking is computed globally** across all TUs (best quality wins)

```sql
-- DAL: Get best TU (queries all, no store_id filter)
SELECT * FROM tus_en_de WHERE guid = $1 AND rank = 1;

-- TMStore: Get TUs from specific store (for sync)
SELECT * FROM tus_en_de WHERE store_id = $1 AND job_guid = ANY($2);
```

## Storage Approaches

### 1. PostgresDALManager (Local Storage Replacement)

Replaces SQLite for the local L10n Monster database. Used via `.dalManager()` in config.

**Tables created:**
- `channel_toc` - Channel metadata
- `jobs` - Job metadata (shared with TMStore via `tm_store` column)
- `resources_{channelId}`, `segments_{channelId}` - Per channel
- `tus_{sourceLang}_{targetLang}` - Per language pair (shared with TMStore via `store_id` column)

### 2. PgSuperStore (External TM/Snap Store)

Factory for creating TMStore and SnapStore instances backed by PostgreSQL. Used via `.tmStore()` and `.snapStore()` in config.

**Tables created/used:**
- `jobs` - Job metadata with `tm_store` column for provenance
- `tus_{sourceLang}_{targetLang}` - TU storage with `store_id` column for provenance
- `snap_resources`, `snap_segments`, `snap_toc` - Snap storage with temporal tracking

## Key Design Patterns

### Provenance Tracking

TUs and jobs track their origin via provenance columns:

```sql
-- TUs: store_id column
INSERT INTO tus_en_de (store_id, guid, job_guid, ...)
VALUES ('production', $1, $2, ...);  -- TMStore synced
VALUES (NULL, $1, $2, ...);          -- Local (DAL)

-- Jobs: tm_store column
INSERT INTO jobs (job_guid, tm_store, ...)
VALUES ($1, 'production', ...);  -- TMStore synced
VALUES ($1, NULL, ...);          -- Local (DAL)
```

### Global Ranking

Ranks are computed across all TUs regardless of store_id:

```sql
UPDATE tus_en_de
SET rank = t2.new_rank
FROM (
    SELECT guid, job_guid,
           ROW_NUMBER() OVER (PARTITION BY guid ORDER BY q DESC, ts DESC) as new_rank
    FROM tus_en_de WHERE guid = ANY($1)
) AS t2
WHERE tus_en_de.guid = t2.guid AND tus_en_de.job_guid = t2.job_guid;
```

### Temporal Tables (SCD Type 2)

PgSnapStore uses `valid_from`/`valid_to` columns for delta-based storage:

```sql
-- Point-in-time query
WHERE valid_from <= $ts AND (valid_to IS NULL OR valid_to > $ts)
```

### Hash-Based Change Detection

PgSnapStore computes MD5 hashes to detect changes without comparing full row data:

```javascript
const hash = crypto.createHash('md5').update(JSON.stringify(rowData)).digest('hex');
```

### Batch Operations with UNNEST

All bulk inserts use PostgreSQL's UNNEST for performance:

```sql
INSERT INTO table (col1, col2, ...)
SELECT * FROM UNNEST($1::text[], $2::text[], ...)
```

## onlyLeveraged Feature

PgTmStore can filter TUs against the latest snapshot in a SnapStore:

```sql
WITH latest_snaps AS (
    SELECT channel_id, MAX(ts) as max_ts
    FROM snap_toc WHERE snap_store_id = $1 AND channel_id = ANY($2)
    GROUP BY channel_id
),
leveraged_guids AS (
    SELECT DISTINCT s.guid FROM snap_segments s
    JOIN latest_snaps ls ON s.channel_id = ls.channel_id
    WHERE s.valid_from <= ls.max_ts AND (s.valid_to IS NULL OR s.valid_to > ls.max_ts)
)
SELECT * FROM tus_en_de WHERE store_id = $1 AND guid IN (SELECT guid FROM leveraged_guids)
```

## Common Patterns

### Pool Management

- `existingPool` option accepts a pre-configured `pg.Pool` (for Google Cloud SQL)
- `#ownsPool` tracks whether to close pool on shutdown
- Lazy table initialization via `ensureTables()`

### Transaction Handling

```javascript
const client = await this.#pool.connect();
try {
    await client.query('BEGIN');
    // ... operations ...
    await client.query('COMMIT');
} catch (e) {
    await client.query('ROLLBACK');
    throw e;
} finally {
    client.release();
}
```

### Utility Functions (pgUtils.js)

- `sanitizeTableName()` - Prevents SQL injection in dynamic table names
- `flattenNormalizedSourceToOrdinal()` - Flattens NormalizedString for indexing
- `createSQLObjectTransformer()` - Encodes/decodes JSON columns

## Testing

No dedicated tests yet. The package is tested via regression tests in the main project:

```bash
cd regression
./test.zsh js local all
```

## Dependencies

- `pg` - PostgreSQL client (peer dependency on @l10nmonster/core)
- `@l10nmonster/core` - Core types and logging
