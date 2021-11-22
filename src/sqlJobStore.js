import {
    readFileSync,
} from 'fs';
import knex from 'knex';

function currentISODate() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export class SqlJobStore {
    db;

    constructor({ org, prj, client, host, port, user, password, database, cert }) {
        this.org = org;
        this.prj = prj;
        this.dbConfig = {
            client,
            connection: {
                host,
                port,
                user,
                password,
                database,
                ssl: {
                    ca: readFileSync(cert),
                }
            }
        };
    }

    async init() {
        const remoteDB = knex(this.dbConfig);
        try {
            await remoteDB.schema.hasTable('jobstore').then(exists => {
                if (!exists) {
                    return remoteDB.schema.createTable('jobstore', table => {
                        table.increments('jobId').primary();
                        table.string('org', 64).notNullable();
                        table.string('prj', 64).notNullable();
                        table.string('status', 8);
                        table.string('sourceLang', 8);
                        table.string('targetLang', 8);
                        table.string('translationProvider', 32);
                        table.integer('inflightNum');
                        table.timestamp('requestedAt');
                        table.timestamp('updatedAt');
                        table.json('job');
                        table.index(['org', 'prj', 'sourceLang', 'targetLang']);
                    });
                }
            });
            this.db = remoteDB;
            console.log(`${this.dbConfig.client} DB ${this.dbConfig.connection.database} initialized!`);
        } catch (error) {
            console.error(`${this.dbConfig.client} DB initialization failed with error: ${error}`);
        }
    }

    async getJobManifests(status) {
        this.db || await this.init();
        const manifests = await this.db('jobstore')
            .select('jobId', 'status', 'sourceLang', 'targetLang', 'translationProvider', 'inflightNum', 'requestedAt', 'updatedAt')
            .where({ 
                org: this.org,
                prj: this.prj,
                status,
            });
        return manifests;
    }

    async getJobStatusByLangPair(sourceLang, targetLang) {
        this.db || await this.init();
        const manifests = await this.db('jobstore')
            .select('jobId', 'status')
            .where({
                org: this.org,
                prj: this.prj,
                sourceLang,
                targetLang,
            });
        return manifests.map(j => [ j.jobId, j.status ]);
    }

    async createJobManifest() {
        this.db || await this.init();
        const status = 'created';
        const job = JSON.stringify({ status });
        const [ jobId ] = await this.db('jobstore').insert({
            org: this.org,
            prj: this.prj,
            status,
            job,
        });
        return jobId;
    }

    async updateJobManifest(jobManifest) {
        this.db || await this.init();
        jobManifest.updatedAt = currentISODate();
        await this.db('jobstore')
            .where({
                org: this.org,
                prj: this.prj,
                jobId: jobManifest.jobId,
            })
            .update(jobManifest);
    }

    async updateJob(job) {
        this.db || await this.init();
        const updatedAt = currentISODate();
        await this.db('jobstore')
            .where({
                org: this.org,
                prj: this.prj,
                jobId: job.jobId,
            })
            .update({
                updatedAt,
                job: JSON.stringify(job),
            });
    }

    async getJob(jobId) {
        this.db || await this.init();
        const [ row ] = await this.db('jobstore')
            .select('job')
            .where({
                org: this.org,
                prj: this.prj,
                jobId,
            });
        return row.job;
    }

    async shutdown() {
        await this.db.destroy();
    }
}
