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
                        table.double('ts');
                        table.json('envelope');
                        table.timestamp('requestedAt');
                        table.timestamp('updatedAt');
                        table.json('req');
                        table.json('res');
                        // table.json('leverage');
                        table.index(['org', 'prj', 'sourceLang', 'targetLang']);
                    });
                }
            });
            this.db = remoteDB;
            console.log(`${this.dbConfig.client} DB ${this.dbConfig.connection.database} initialized for job store!`);
        } catch (error) {
            console.error(`${this.dbConfig.client} DB initialization failed with error: ${error}`);
        }
    }

    async getJobManifests(status) {
        this.db ?? await this.init();
        const manifests = await this.db('jobStore')
            .select('jobId', 'status', 'sourceLang', 'targetLang', 'translationProvider', 'envelope', 'requestedAt', 'updatedAt')
            .where({
                org: this.org,
                prj: this.prj,
                status,
            });
        return manifests;
    }

    async getJobStatusByLangPair(sourceLang, targetLang) {
        this.db ?? await this.init();
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
        this.db ?? await this.init();
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
        this.db ?? await this.init();
        // eslint-disable-next-line no-unused-vars
        const { inflight, tus, leverage, envelope, ...row } = jobResponse;
        if (jobRequest) {
            row.requestedAt = currentISODate();
            row.req = JSON.stringify(jobRequest);
        }
        // if (leverage) {
        //     row.leverage = JSON.stringify(leverage);
        // }
        row.res = JSON.stringify(jobResponse);
        envelope && (row.envelope = JSON.stringify(envelope));
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
        this.db ?? await this.init();
        const [ row ] = await this.db('jobStore')
            .select('res')
            .where({
                org: this.org,
                prj: this.prj,
                jobId,
            });
        return row.job;
    }

    async shutdown() {
        this.db && await this.db.destroy();
    }
}
