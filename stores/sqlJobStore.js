// import {
//     readFileSync,
// } from 'fs';
// import knex from 'knex';
// import { nanoid } from 'nanoid';

// function currentISODate() {
//     return new Date().toISOString().slice(0, 19).replace('T', ' ');
// }

// export class SqlJobStore {
//     db;

//     constructor({ org, client, host, port, user, password, database, cert }) {
//         this.org = org;
//         this.dbConfig = {
//             client,
//             connection: {
//                 host,
//                 port,
//                 user,
//                 password,
//                 database,
//                 ssl: {
//                     ca: readFileSync(cert),
//                 }
//             }
//         };
//     }

//     async init() {
//         const remoteDB = knex(this.dbConfig);
//         try {
//             await remoteDB.schema.hasTable('jobStore').then(exists => {
//                 if (!exists) {
//                     return remoteDB.schema.createTable('jobStore', table => {
//                         table.increments('jobId').primary();
//                         table.string('org', 64).notNullable();
//                         table.string('status', 8);
//                         table.string('sourceLang', 8);
//                         table.string('targetLang', 8);
//                         table.string('translationProvider', 32);
//                         table.double('ts');
//                         table.json('inflight');
//                         table.json('envelope');
//                         table.timestamp('requestedAt');
//                         table.timestamp('updatedAt');
//                         table.json('req');
//                         table.json('res');
//                         // table.json('leverage');
//                         table.index(['org', 'sourceLang', 'targetLang']);
//                     });
//                 }
//             });
//             this.db = remoteDB;
//             console.log(`${this.dbConfig.client} DB ${this.dbConfig.connection.database} initialized for job store!`);
//         } catch (error) {
//             console.error(`${this.dbConfig.client} DB initialization failed with error: ${error}`);
//         }
//     }

//     async getJobManifests(status) {
//         this.db ?? await this.init();
//         const manifests = await this.db('jobStore')
//             .select('jobId', 'status', 'sourceLang', 'targetLang', 'translationProvider', 'inflight', 'envelope', 'requestedAt', 'updatedAt')
//             .where({
//                 org: this.org,
//                 status,
//             });
//         return manifests;
//     }

//     async getJobStatusByLangPair(sourceLang, targetLang) {
//         this.db ?? await this.init();
//         const manifests = await this.db('jobStore')
//             .select('jobId', 'status')
//             .where({
//                 org: this.org,
//                 sourceLang,
//                 targetLang,
//             });
//         return manifests.map(j => [ j.jobId, j.status ]);
//     }

//     async createJobManifest() {
//         this.db ?? await this.init();
//         const status = 'created';
//         const manifest = {
//             jobGuid: this.ctx.regression ? 'x' : nanoid(),
//             status,
//         };
//         const [ jobId ] = await this.db('jobStore').insert({
//             org: this.org,
//             status,
//             req: JSON.stringify(manifest),
//         });
//         return {
//             ...manifest,
//             jobId,
//         };
//     }

//     async updateJob(jobResponse, jobRequest) {
//         this.db ?? await this.init();
//         // eslint-disable-next-line no-unused-vars
//         const { inflight, tus, leverage, envelope, ...row } = jobResponse;
//         if (jobRequest) {
//             row.requestedAt = currentISODate();
//             row.req = JSON.stringify(jobRequest);
//         }
//         // if (leverage) {
//         //     row.leverage = JSON.stringify(leverage);
//         // }
//         row.res = JSON.stringify(jobResponse);
//         inflight && (row.inflight = JSON.stringify(inflight));
//         envelope && (row.envelope = JSON.stringify(envelope));
//         row.updatedAt = currentISODate();
//         await this.db('jobStore')
//             .where({
//                 org: this.org,
//                 jobId: jobResponse.jobId,
//             })
//             .update(row);
//     }

//     async getJob(jobId) {
//         this.db ?? await this.init();
//         const [ row ] = await this.db('jobStore')
//             .select('res')
//             .where({
//                 org: this.org,
//                 jobId,
//             });
//         return row.res;
//     }

//     async getJobRequest(jobId) {
//         this.db ?? await this.init();
//         const [ row ] = await this.db('jobStore')
//             .select('req')
//             .where({
//                 org: this.org,
//                 jobId,
//             });
//         return row.req;
//     }

//     async shutdown() {
//         this.db && await this.db.destroy();
//     }
// }
