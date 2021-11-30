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
            await remoteDB.schema.hasTable('jobStore').then(exists => {
                if (!exists) {
                    return remoteDB.schema.createTable('jobStore', table => {
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
                        table.json('req');
                        table.json('res');
                        // table.json('leverage');
                        table.index(['org', 'prj', 'sourceLang', 'targetLang']);
                    });
                }
            });
            await remoteDB.schema.hasTable('buildState').then(exists => {
                if (!exists) {
                    return remoteDB.schema.createTable('buildState', table => {
                        table.string('org', 64);
                        table.string('prj', 64);
                        table.string('build', 16);
                        table.string('release', 16);
                        table.string('targetLang', 8);
                        table.json('job');
                        table.timestamp('updatedAt');
                        table.primary(['org', 'prj', 'build', 'release', 'targetLang']);
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
        const manifests = await this.db('jobStore')
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
        const manifests = await this.db('jobStore')
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
        const req = JSON.stringify({ status });
        const [ jobId ] = await this.db('jobStore').insert({
            org: this.org,
            prj: this.prj,
            status,
            req,
        });
        return jobId;
    }

    async updateJob(jobResponse, jobRequest) {
        this.db || await this.init();
        const { inflight, tus, leverage, ...row } = jobResponse;
        if (jobRequest) {
            row.req = JSON.stringify(jobRequest);
        }
        // if (leverage) {
        //     row.leverage = JSON.stringify(leverage);
        // }
        row.res = JSON.stringify(jobResponse);
        row.updatedAt = currentISODate();
        await this.db('jobStore')
            .where({
                org: this.org,
                prj: this.prj,
                jobId: jobResponse.jobId,
            })
            .update(row);
    }

    async getJob(jobId) {
        this.db || await this.init();
        const [ row ] = await this.db('jobStore')
            .select('job')
            .where({
                org: this.org,
                prj: this.prj,
                jobId,
            });
        return row.job;
    }

    async updateBuildState(build, release, targetLang, job) {
        this.db || await this.init();
        await this.db('buildState')
            .insert({
                org: this.org,
                prj: this.prj,
                build,
                release,
                targetLang,
                job: JSON.stringify(job),
                updatedAt: currentISODate(),
            })
            .onConflict(['org', 'prj', 'build', 'release', 'targetLang'])
            .merge();
}

    async shutdown() {
        await this.db.destroy();
    }
}
