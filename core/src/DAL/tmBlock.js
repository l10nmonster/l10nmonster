// export class TmBlockDAL {
//     #stmt = {}; // prepared statements

//     constructor(db) {
//         // jobs table
//         db.exec(`
// CREATE TABLE IF NOT EXISTS blocks(
//     tmStore TEXT,
//     blockName TEXT,
//     jobGuid TEXT NOT NULL,
//     blockModified TEXT,
//     jobUpdatedAt TEXT,
//     PRIMARY KEY (tmStore, blockName, jobGuid)
// );`);

//         this.getTmBlocks = (tmStore) => this.#stmt.getTmBlocks.all(tmStore).map(({ blockName, blockModified }) => [ blockName, blockModified ]);
//         // max(blockModified) is used just because any_value() is not supported -- all values should be the same
//         this.#stmt.getTmBlocks = db.prepare('SELECT blockName, max(blockModified) AS blockModified FROM blocks WHERE tmStore = ? GROUP BY blockName;');

//         this.getJobIdsFromBlockName = (tmStore, blockName) => this.#stmt.getJobIdsFromBlockName.all(tmStore, blockName);
//         this.#stmt.getJobIdsFromBlockName = db.prepare('SELECT jobGuid FROM blocks WHERE tmStore = ? AND blockName = ?;').pluck();

//         this.getUnassociatedJobIds = (tmStore, sourceLang, targetLang) => this.#stmt.getUnassociatedJobIds.all(tmStore, sourceLang, targetLang);
//         this.#stmt.getUnassociatedJobIds = db.prepare(`
// SELECT jobs.jobGuid
// FROM jobs
// LEFT JOIN (
//     SELECT jobGuid FROM blocks
//     WHERE tmStore = ?
// ) AS blocks USING (jobGuid)
// WHERE blocks.jobGuid IS NULL AND sourceLang = ? AND targetLang = ?;
// `).pluck();

//         this.deleteTmBlock = (tmStore, blockName) => this.#stmt.deleteTmBlock.run(tmStore, blockName);
//         this.#stmt.deleteTmBlock = db.prepare('DELETE FROM blocks WHERE tmStore = ? AND blockName = ?');

//         this.setTmBlockAssociation = (tmStore, blockName, jobGuid, blockModified, jobUpdatedAt) => {
//             const result = this.#stmt.setTmBlockAssociation.run({ tmStore, blockName, jobGuid, blockModified, jobUpdatedAt });
//             if (result.changes !== 1) {
//                 throw new Error(`Expecting to change a row but changed ${result}`);
//             }
//         };
//         this.#stmt.setTmBlockAssociation = db.prepare(`
// INSERT INTO blocks (tmStore, blockName, jobGuid, blockModified, jobUpdatedAt)
//     VALUES (@tmStore, @blockName, @jobGuid, @blockModified, @jobUpdatedAt)
// ON CONFLICT DO UPDATE SET
//     blockModified = excluded.blockModified,
//     jobUpdatedAt = excluded.jobUpdatedAt;
// `);
//     }
// }
