export class JobsDAL {
    #stmt = {}; // prepared statements

    constructor(db) {
        // jobs table
        db.exec(`CREATE TABLE IF NOT EXISTS jobs(sourceLang TEXT NOT NULL, targetLang TEXT NOT NULL, jobGuid TEXT NOT NULL, status TEXT, updatedAt TEXT, translationProvider TEXT, PRIMARY KEY (sourceLang, targetLang, jobGuid));`);

        this.getJobStatus = (jobGuid) => {
            const jobMeta = this.#stmt.getJobMeta.get(jobGuid);
            return [jobMeta?.status, jobMeta?.updatedAt];
        };
        this.#stmt.getJobMeta = db.prepare('SELECT status, updatedAt FROM jobs WHERE jobGuid = ?');

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
        this.setJob = (job) => this.#stmt.setJob.run(job);
        this.#stmt.setJob = db.prepare(`INSERT INTO jobs (sourceLang, targetLang, jobGuid, status, updatedAt, translationProvider) VALUES (@sourceLang, @targetLang, @jobGuid, @status, @updatedAt, @translationProvider)
            ON CONFLICT (sourceLang, targetLang, jobGuid)
                DO UPDATE SET status = excluded.status, updatedAt = excluded.updatedAt, translationProvider = excluded.translationProvider
            WHERE excluded.jobGuid = jobs.jobGuid`);

        this.getJobGuids = (sourceLang, targetLang) => this.#stmt.getJobGuids.pluck().all(sourceLang, targetLang);
        this.#stmt.getJobGuids = db.prepare('SELECT jobGuid FROM jobs WHERE sourceLang = ? AND targetLang = ?;');

        this.deleteJob = (jobGuid) => this.#stmt.deleteJob.run(jobGuid);
        this.#stmt.deleteJob = db.prepare('DELETE FROM jobs WHERE jobGuid = ?');
    }
}
