/** @typedef {import('../interfaces.js').JobDAL} JobDALInterface */

/** @implements {JobDALInterface} */
export class JobDAL {
    #db;
    #stmt = {}; // prepared statements
    #lastTOC = {};

    constructor(db) {
        this.#db = db;
        db.exec(/* sql */`
            CREATE TABLE IF NOT EXISTS jobs(
                jobGuid TEXT NOT NULL,
                sourceLang TEXT NOT NULL,
                targetLang TEXT NOT NULL,
                translationProvider TEXT,
                status TEXT,
                updatedAt TEXT,
                jobProps TEXT,
                tmStore TEXT,
                PRIMARY KEY (jobGuid)
            ) WITHOUT ROWID;
            CREATE INDEX IF NOT EXISTS idx_jobs_sourceLang_targetLang_translationProvider_status_jobGuid ON jobs (sourceLang, targetLang, translationProvider, status, jobGuid);
        `);
        const rows = (function *unrollJobs() {
            if (this.#lastTOC.v !== 1) {
                throw new Error(`Invalid TOC version: ${this.#lastTOC.v}`);
            }
            for (const [blockId, blockProps] of Object.entries(this.#lastTOC.blocks)) {
                const { modified, jobs } = blockProps;
                for (const [ jobGuid, updatedAt ] of jobs) {
                    yield { blockId, modified, jobGuid, updatedAt };
                }
            }
        }).bind(this);
        db.table('last_toc', {
            columns: ['blockId', 'modified', 'jobGuid', 'updatedAt'],
            rows,
        });
    }

    async getAvailableLangPairs() {
        this.#stmt.getAvailableLangPairs ??= this.#db.prepare(/* sql */`
            SELECT DISTINCT sourceLang, targetLang FROM jobs ORDER BY 1, 2;
        `);
        return this.#stmt.getAvailableLangPairs.all()
            .map(({ sourceLang, targetLang }) => [ sourceLang, targetLang ]);
    }

    async getStats() {
        this.#stmt.getStats ??= this.#db.prepare(/* sql */`
            SELECT
                sourceLang,
                targetLang,
                tmStore,
                COUNT(*) jobCount,
                MAX(updatedAt) lastUpdatedAt
            FROM jobs
            GROUP BY 1, 2, 3
            ORDER BY 5 DESC;
        `);
        return this.#stmt.getStats.all();
    }

    async getJobTOCByLangPair(sourceLang, targetLang) {
        this.#stmt.getJobTOCByLangPair ??= this.#db.prepare(/* sql */`
            SELECT jobGuid, status, translationProvider, updatedAt
            FROM jobs
            WHERE
                (sourceLang = @sourceLang OR @sourceLang IS NULL)
                AND (targetLang = @targetLang OR @targetLang IS NULL)
            ORDER BY updatedAt DESC;
        `);
        return this.#stmt.getJobTOCByLangPair.all({ sourceLang, targetLang });
    }

    async setJobTmStore(jobGuid, tmStoreId) {
        this.#stmt.setJobTmStore ??= this.#db.prepare(/* sql */`
            UPDATE jobs SET tmStore = ? WHERE jobGuid = ?;
        `);
        return this.#stmt.setJobTmStore.run(tmStoreId, jobGuid);
    }

    async getJob(jobGuid) {
        this.#stmt.getJob ??= this.#db.prepare(/* sql */`
            SELECT
                jobGuid,
                jobProps,
                sourceLang,
                targetLang,
                translationProvider,
                status,
                updatedAt
            FROM jobs WHERE jobGuid = ?;
        `);
        const jobRow = this.#stmt.getJob.get(jobGuid);
        if (jobRow) {
            const { jobProps, ...basicProps } = jobRow;
            return { ...basicProps, ...JSON.parse(jobProps) };
        }
    }

    async getJobCount() {
        this.#stmt.getJobCount ??= this.#db.prepare(/* sql */`
            SELECT count(*) FROM jobs;
        `).pluck();
        return this.#stmt.getJobCount.get();
    }

    async getJobDeltas(sourceLang, targetLang, toc, storeId) {
        this.#stmt.getJobDeltas ??= this.#db.prepare(/* sql */`
            SELECT
                tmStore,
                blockId,
                j.jobGuid localJobGuid,
                lt.jobGuid remoteJobGuid,
                j.updatedAt localUpdatedAt,
                lt.updatedAt remoteUpdatedAt
            FROM (
                SELECT tmStore, jobGuid, updatedAt
                FROM jobs
                WHERE sourceLang = ? AND targetLang = ?
            ) j
            FULL JOIN last_toc lt USING (jobGuid)
            WHERE j.updatedAt != lt.updatedAt
               OR j.updatedAt IS NULL
               OR lt.updatedAt IS NULL
               OR (j.tmStore IS NOT NULL AND j.tmStore != ?)
        `);
        this.#lastTOC = toc;
        return this.#stmt.getJobDeltas.all(sourceLang, targetLang, storeId);
    }

    async getValidJobIds(sourceLang, targetLang, toc, blockId, storeId) {
        this.#stmt.getValidJobIds ??= this.#db.prepare(/* sql */`
            SELECT jobs.jobGuid
            FROM jobs JOIN last_toc USING (jobGuid)
            WHERE sourceLang = ? AND targetLang = ? AND blockId = ?
              AND jobs.tmStore = ?;
        `).pluck();
        this.#lastTOC = toc;
        return this.#stmt.getValidJobIds.all(sourceLang, targetLang, blockId, storeId);
    }
}
