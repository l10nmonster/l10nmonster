// import {
//     readFileSync,
// } from 'fs';
// import knex from 'knex';

// function currentISODate() {
//     return new Date().toISOString().slice(0, 19).replace('T', ' ');
// }

// export class SqlStateStore {
//     db;

//     constructor({ org, client, host, port, user, password, database, cert, saveContent }) {
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
//         this.saveContent = saveContent;
//     }

//     async init() {
//         const remoteDB = knex(this.dbConfig);
//         try {
//             await remoteDB.schema.hasTable('buildState').then(exists => {
//                 if (!exists) {
//                     return remoteDB.schema.createTable('buildState', table => {
//                         table.string('org', 64);
//                         table.string('prj', 64);
//                         table.string('build', 16);
//                         table.string('release', 16);
//                         table.string('targetLang', 8);
//                         table.json('leverage');
//                         // table.json('content');
//                         table.timestamp('updatedAt');
//                         table.primary(['org', 'prj', 'build', 'release', 'targetLang']);
//                     });
//                 }
//             });
//             this.db = remoteDB;
//             console.log(`${this.dbConfig.client} DB ${this.dbConfig.connection.database} initialized for state store!`);
//         } catch (error) {
//             console.error(`${this.dbConfig.client} DB initialization failed with error: ${error}`);
//         }
//     }

//     async updateBuildState(build, release, targetLang, job) {
//         this.db ?? await this.init();
//         const prjLeverage = job.prjLeverage || {};
//         for (const [ prj, leverage ] of prjLeverage) {
//             const row = {
//                 org: this.org,
//                 prj,
//                 build,
//                 release,
//                 targetLang,
//                 leverage: JSON.stringify(leverage),
//                 updatedAt: currentISODate(),
//             };
//             // if (this.saveContent) { // TODO: need to split by project
//             //     row.content = JSON.stringify({ tus });
//             // }
//             await this.db('buildState')
//                 .insert(row)
//                 .onConflict(['org', 'prj', 'build', 'release', 'targetLang'])
//                 .merge();
//         }
//     }

//     async shutdown() {
//         this.db && await this.db.destroy();
//     }
// }
