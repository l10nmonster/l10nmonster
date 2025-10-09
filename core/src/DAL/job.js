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
            );
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

    /**
     * Sets or updates a job in the database.
     * @param {Object} job - The job object to set or update.
     * @param {string} job.sourceLang - The source language of the job.
     * @param {string} job.targetLang - The target language of the job.
     * @param {string} job.jobGuid - The unique identifier for the job.
     * @param {string} job.status - The status of the job.
     * @param {string} job.updatedAt - The timestamp when the job was last updated.
     * @param {string} job.translationProvider - The translation provider associated with the job.
     */
    setJob(completeJobProps, tmStoreId) { // TODO: make async (but it's used with a transaction)
        this.#stmt.setJob ??= this.#db.prepare(/* sql */`
            INSERT INTO jobs (sourceLang, targetLang, jobGuid, status, updatedAt, translationProvider, jobProps, tmStore)
            VALUES (@sourceLang, @targetLang, @jobGuid, @status, @updatedAt, @translationProvider, @jobProps, @tmStoreId)
            ON CONFLICT (jobGuid) DO UPDATE SET
                sourceLang = excluded.sourceLang,
                targetLang = excluded.targetLang,
                status = excluded.status,
                updatedAt = excluded.updatedAt,
                translationProvider = excluded.translationProvider,
                jobProps = excluded.jobProps,
                tmStore = excluded.tmStore
            WHERE excluded.jobGuid = jobs.jobGuid;
        `);
        const { jobGuid, sourceLang, targetLang, status, updatedAt, translationProvider, ...jobProps } = completeJobProps;
        const result = this.#stmt.setJob.run({ jobGuid, sourceLang, targetLang, status, updatedAt, translationProvider, jobProps: JSON.stringify(jobProps), tmStoreId });
        if (result.changes !== 1) {
            throw new Error(`Expecting to change a row but changed ${result}`);
        }
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

    deleteJob(jobGuid) { // TODO: make async (but it's used with a transaction)
        this.#stmt.deleteJob ??= this.#db.prepare(/* sql */`
            DELETE FROM jobs WHERE jobGuid = ?;
        `);
        return this.#stmt.deleteJob.run(jobGuid);
    }

    async getJobDeltas(sourceLang, targetLang, toc) {
        this.#stmt.getJobDeltas ??= this.#db.prepare(/* sql */`
            SELECT j.jobGuid localJobGuid, blockId, lt.jobGuid remoteJobGuid, j.updatedAt localUpdatedAt, lt.updatedAt remoteUpdatedAt
            FROM (SELECT jobGuid, updatedAt FROM jobs WHERE sourceLang = ? AND targetLang = ?) j
            FULL JOIN last_toc lt USING (jobGuid)
            WHERE j.updatedAt != lt.updatedAt OR j.updatedAt IS NULL OR lt.updatedAt IS NULL
        `);
        this.#lastTOC = toc;
        return this.#stmt.getJobDeltas.all(sourceLang, targetLang);
    }

    async getValidJobIds(sourceLang, targetLang, toc, blockId) {
        this.#stmt.getValidJobIds ??= this.#db.prepare(/* sql */`
            SELECT jobs.jobGuid
            FROM jobs JOIN last_toc USING (jobGuid)
            WHERE sourceLang = ? AND targetLang = ? AND blockId = ?;
        `).pluck();
        this.#lastTOC = toc;
        return this.#stmt.getValidJobIds.all(sourceLang, targetLang, blockId);
    }
}
