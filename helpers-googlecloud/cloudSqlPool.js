/**
 * Cloud SQL PostgreSQL pool creation utilities.
 * Creates a pg.Pool configured for Google Cloud SQL with IAM authentication.
 */

/**
 * @typedef {Object} CloudSqlPoolOptions
 * @property {string} instanceConnectionName - Cloud SQL instance connection name (e.g., 'project:region:instance')
 * @property {string} database - Database name
 * @property {string} [user] - Database user (for IAM auth, use service account email without @project.iam.gserviceaccount.com)
 * @property {'IAM'|'PASSWORD'} [authType='IAM'] - Authentication type ('IAM' for workload identity, 'PASSWORD' for traditional)
 * @property {string} [password] - Database password (only for PASSWORD authType)
 * @property {number} [min=2] - Minimum pool size
 * @property {number} [max=10] - Maximum pool size
 * @property {number} [idleTimeoutMillis=30000] - Idle timeout in milliseconds
 */

/**
 * Creates a PostgreSQL Pool configured for Cloud SQL.
 * Uses the Cloud SQL Connector for secure, IAM-based authentication.
 *
 * @param {CloudSqlPoolOptions} options - Configuration options
 * @returns {Promise<import('pg').Pool>} Configured pg.Pool instance
 *
 * @example
 * ```javascript
 * import { createCloudSqlPool } from '@l10nmonster/helpers-googlecloud';
 * import { PostgresDALManager } from '@l10nmonster/helpers-pgsql';
 *
 * const pool = await createCloudSqlPool({
 *     instanceConnectionName: 'my-project:us-central1:my-instance',
 *     database: 'l10nmonster',
 *     user: 'my-service-account',  // Without @project.iam.gserviceaccount.com
 *     authType: 'IAM'
 * });
 *
 * export default config.l10nMonster(import.meta.dirname)
 *     .dalManager(new PostgresDALManager({ existingPool: pool }))
 *     // ...
 * ```
 */
export async function createCloudSqlPool(options) {
    const {
        instanceConnectionName,
        database,
        user,
        authType = 'IAM',
        password,
        min = 2,
        max = 10,
        idleTimeoutMillis = 30000,
    } = options;

    if (!instanceConnectionName) {
        throw new Error('instanceConnectionName is required');
    }
    if (!database) {
        throw new Error('database is required');
    }

    // Dynamic imports to avoid requiring these dependencies if not using Cloud SQL
    const { Connector } = await import('@google-cloud/cloud-sql-connector');
    const pg = await import('pg');
    const { Pool } = pg.default || pg;

    const connector = new Connector();

    const clientOpts = await connector.getOptions({
        instanceConnectionName,
        authType,
    });

    const poolConfig = {
        ...clientOpts,
        database,
        user,
        min,
        max,
        idleTimeoutMillis,
    };

    // Add password only for PASSWORD auth type
    if (authType === 'PASSWORD' && password) {
        poolConfig.password = password;
    }

    const pool = new Pool(poolConfig);

    // Store connector reference for cleanup (used internally by end() override)
    // eslint-disable-next-line no-underscore-dangle
    pool._cloudSqlConnector = connector;

    // Override pool.end to also close the connector
    const originalEnd = pool.end.bind(pool);
    pool.end = async () => {
        await originalEnd();
        connector.close();
    };

    return pool;
}

/**
 * Creates a Cloud SQL pool using Application Default Credentials (ADC).
 * This is the simplest setup when running in GCP with workload identity configured.
 *
 * @param {Object} options - Configuration options
 * @param {string} options.instanceConnectionName - Cloud SQL instance connection name
 * @param {string} options.database - Database name
 * @param {string} options.user - IAM user (service account email without domain)
 * @param {number} [options.max=10] - Maximum pool size
 * @returns {Promise<import('pg').Pool>}
 *
 * @example
 * ```javascript
 * const pool = await createCloudSqlPoolWithADC({
 *     instanceConnectionName: 'my-project:us-central1:my-instance',
 *     database: 'l10nmonster',
 *     user: 'my-sa'  // For my-sa@my-project.iam.gserviceaccount.com
 * });
 * ```
 */
export async function createCloudSqlPoolWithADC(options) {
    return createCloudSqlPool({
        ...options,
        authType: 'IAM',
    });
}
