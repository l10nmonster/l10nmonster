export class JobDAL {
    #db;
    #stmt = {}; // prepared statements
    #lastTOC = {};

    constructor(db) {
        this.#db = db;
        db.exec(`
CREATE TABLE IF NOT EXISTS jobs(
    jobGuid TEXT NOT NULL,
    sourceLang TEXT NOT NULL,
    targetLang TEXT NOT NULL,
    translationProvider TEXT,
    status TEXT,
    updatedAt TEXT,
    jobProps TEXT,
    PRIMARY KEY (jobGuid)
);`);
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

        this.getAvailableLangPairs = () => this.#stmt.getAvailableLangPairs.all()
            .map(({ sourceLang, targetLang }) => [ sourceLang, targetLang ]);
        this.#stmt.getAvailableLangPairs = db.prepare('SELECT DISTINCT sourceLang, targetLang FROM jobs ORDER BY 1, 2;');

        this.getJobStatusByLangPair = (sourceLang, targetLang) => this.#stmt.getJobStatusByLangPair.all(sourceLang, targetLang)
            .map(({ jobGuid, status }) => [ jobGuid, status ]);
        this.#stmt.getJobStatusByLangPair = db.prepare('SELECT jobGuid, status FROM jobs WHERE sourceLang = ? AND targetLang = ?;');


        // this.getJobStatus = (jobGuid) => {
        //     const jobMeta = this.#stmt.getJobMeta.get(jobGuid);
        //     return [jobMeta?.status, jobMeta?.updatedAt];
        // };
        // this.#stmt.getJobMeta = db.prepare('SELECT status, updatedAt FROM jobs WHERE jobGuid = ?');

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
        this.setJob = (completeJobProps) => {
            const { jobGuid, sourceLang, targetLang, status, updatedAt, translationProvider, ...jobProps } = completeJobProps;
            const result = this.#stmt.setJob.run({ jobGuid, sourceLang, targetLang, status, updatedAt, translationProvider, jobProps: JSON.stringify(jobProps) });
            if (result.changes !== 1) {
                throw new Error(`Expecting to change a row but changed ${result}`);
            }
        };
        this.#stmt.setJob = db.prepare(`
INSERT INTO jobs (sourceLang, targetLang, jobGuid, status, updatedAt, translationProvider, jobProps)
    VALUES (@sourceLang, @targetLang, @jobGuid, @status, @updatedAt, @translationProvider, @jobProps)
ON CONFLICT (jobGuid) DO UPDATE SET
    sourceLang = excluded.sourceLang,
    targetLang = excluded.targetLang,
    status = excluded.status,
    updatedAt = excluded.updatedAt,
    translationProvider = excluded.translationProvider,
    jobProps = excluded.jobProps
WHERE excluded.jobGuid = jobs.jobGuid`);

        this.getJob = (jobGuid) => {
            const jobRow = this.#stmt.getJob.get(jobGuid);
            const { jobProps, ...basicProps } = jobRow;
            return { ...basicProps, ...JSON.parse(jobProps) };
        };
        this.#stmt.getJob = db.prepare('SELECT * FROM jobs WHERE jobGuid = ?;');

        this.getJobCount = () => this.#stmt.getJobCount.get();
        this.#stmt.getJobCount = db.prepare('SELECT count(*) FROM jobs;').pluck();

        this.deleteJob = (jobGuid) => this.#stmt.deleteJob.run(jobGuid);
        this.#stmt.deleteJob = db.prepare('DELETE FROM jobs WHERE jobGuid = ?');
    }

    getJobDeltas(sourceLang, targetLang, toc) {
        this.#stmt.getJobDeltas ??= this.#db.prepare(`
SELECT j.jobGuid localJobGuid, blockId, lt.jobGuid remoteJobGuid, j.updatedAt localUpdatedAt, lt.updatedAt remoteUpdatedAt
FROM (SELECT jobGuid, updatedAt FROM jobs WHERE sourceLang = ? AND targetLang = ?) j
FULL JOIN last_toc lt USING (jobGuid)
WHERE j.updatedAt != lt.updatedAt OR j.updatedAt IS NULL OR lt.updatedAt IS NULL
`);
        this.#lastTOC = toc;
        return this.#stmt.getJobDeltas.all(sourceLang, targetLang);
    }

    getValidJobIds(sourceLang, targetLang, toc, blockId) {
        this.#stmt.getValidJobIds ??= this.#db.prepare(`
SELECT jobs.jobGuid
FROM jobs JOIN last_toc USING (jobGuid)
WHERE sourceLang = ? AND targetLang = ? AND blockId = ?
`).pluck();
        this.#lastTOC = toc;
        return this.#stmt.getValidJobIds.all(sourceLang, targetLang, blockId);
    }

}
