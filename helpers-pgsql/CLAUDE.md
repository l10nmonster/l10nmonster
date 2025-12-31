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
├── pgTmStore.js          # TMStore implementation
└── pgSnapStore.js        # SnapStore implementation
```

## Two Storage Approaches

### 1. PostgresDALManager (Local Storage Replacement)

Replaces SQLite for the local L10n Monster database. Used via `.dalManager()` in config.

**Tables created:**
- `channel_toc`, `jobs` (shared)
- `resources_{channelId}`, `segments_{channelId}` (per channel)
- `tus_{sourceLang}_{targetLang}` (per language pair)

### 2. PgSuperStore (External TM/Snap Store)

Factory for creating TMStore and SnapStore instances backed by PostgreSQL. Used via `.tmStore()` and `.snapStore()` in config.

**Tables created:**
- `tm_blocks`, `tm_jobs` (TM storage with `tm_store_id` segregation)
- `snap_resources`, `snap_segments`, `snap_toc` (Snap storage with temporal tracking)

## Key Design Patterns

### Data Segregation

Both PgTmStore and PgSnapStore use segregation keys (`tm_store_id`, `snap_store_id`) to allow multiple logical stores to share the same physical tables:

```sql
-- All queries include the segregation key
WHERE tm_store_id = $1 AND source_lang = $2 AND target_lang = $3
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
SELECT * FROM tm_blocks WHERE guid IN (SELECT guid FROM leveraged_guids)
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
