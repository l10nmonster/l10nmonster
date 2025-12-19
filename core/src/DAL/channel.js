import { logVerbose, logError } from '../l10nContext.js';
import { utils } from '../helpers/index.js';
import { createSQLObjectTransformer } from './index.js';

const sqlTransformer = createSQLObjectTransformer(['targetLangs', 'plan', 'subresources', 'resProps', 'nstr', 'notes', 'segProps'], ['resProps', 'segProps']);
const spaceRegex = /\s+/g;

export class ChannelDAL {
    #db;
    channelId;
    resourcesTable;
    segmentsTable;
    #stmt = {}; // prepared statements
    // #flatSrcIdxInitialized = false;

    #createResourceTable(name) {
        this.#db.exec(/* sql */`
            CREATE TABLE IF NOT EXISTS ${name} (
                prj TEXT,
                rid TEXT NOT NULL,
                sourceLang TEXT,
                targetLangs TEXT,
                subresources TEXT,
                resourceFormat TEXT,
                resProps TEXT,
                raw TEXT,
                modifiedAt TEXT,
                PRIMARY KEY (rid)
            );
        `);
    }

    #createResourceTableIndexes(name) {
        this.#db.exec(/* sql */`
            CREATE INDEX IF NOT EXISTS idx_${name}_prj_sourceLang_rid ON ${name} (prj, sourceLang, rid);
            CREATE INDEX IF NOT EXISTS idx_${name}_modifiedAt ON ${name} (modifiedAt);
        `);
    }

    #createSegmentTable(name) {
        this.#db.exec(/* sql */`
            CREATE TABLE IF NOT EXISTS ${name} (
                rid TEXT NOT NULL,
                guid TEXT NOT NULL,
                sourceLang TEXT,
                prj TEXT,
                sid TEXT,
                nstr TEXT,
                notes TEXT,
                mf TEXT,
                plan TEXT,
                "group" TEXT,
                segProps TEXT,
                chars INTEGER,
                words INTEGER,
                segOrder INTEGER
            );
        `);
    }

    #createSegmentTableIndexes(name) {
        this.#db.exec(/* sql */`
            CREATE INDEX IF NOT EXISTS idx_${name}_guid ON ${name} (guid);
            CREATE INDEX IF NOT EXISTS idx_${name}_rid_segOrder ON ${name} (rid, segOrder);
            CREATE INDEX IF NOT EXISTS idx_${name}_prj_rid ON ${name} (prj, rid);
            CREATE INDEX IF NOT EXISTS idx_${name}_group ON ${name} ("group");
        `);
    }

    constructor(db, channelId) {
        this.#db = db;
        this.channelId = channelId;
        this.resourcesTable = `resources_${channelId}`.replace(/[^a-zA-Z0-9_]/g, '_');
        this.segmentsTable = `segments_${channelId}`.replace(/[^a-zA-Z0-9_]/g, '_');

        // create empty tables just in case someone wants to read from them
        // index not required as the whole thing will be swapped out
        this.#createResourceTable(this.resourcesTable);
        this.#createSegmentTable(this.segmentsTable);
    }

    async #saveChannelMeta({ store, ts, resources, segments }) {
        this.#stmt.saveChannelMeta ??= this.#db.prepare(/* sql */`
            INSERT INTO channel_toc (channel, store, ts, resources, segments)
            VALUES (@channel, @store, @ts, @resources, @segments)
            ON CONFLICT (channel)
            DO UPDATE SET
                store = excluded.store,
                ts = excluded.ts,
                resources = excluded.resources,
                segments = excluded.segments;
        `);
        this.#stmt.saveChannelMeta.run({ channel: this.channelId, store, ts, resources, segments });
    }

    async getChannelMeta() {
        this.#stmt.getChannelMeta ??= this.#db.prepare(/* sql */`
            SELECT * FROM channel_toc WHERE channel = ?;
        `);
        return this.#stmt.getChannelMeta.get(this.channelId);
    }

    async saveChannel(meta, cb) {
        const stats = { resources: 0, segments: 0 };
        const tempResourcesTable = `temp_${this.resourcesTable}`;
        const tempSegmentsTable = `temp_${this.segmentsTable}`;

        // drop temp tables if they exist, in case something went wrong last time
        this.#db.exec(/* sql */`
            DROP TABLE IF EXISTS ${tempResourcesTable};
            DROP TABLE IF EXISTS ${tempSegmentsTable};
        `);
        this.#createResourceTable(tempResourcesTable);
        this.#createSegmentTable(tempSegmentsTable);
        const insertResourceStmt = this.#db.prepare(/* sql */`
            INSERT INTO ${tempResourcesTable} (prj, rid, sourceLang, targetLangs, subresources, resourceFormat, resProps, raw, modifiedAt)
            VALUES (@prj, @rid, @sourceLang, @targetLangs, @subresources, @resourceFormat, @resProps, @raw, @modifiedAt);
        `);
        const insertResourceRow = (row) => {
            insertResourceStmt.run(row);
            stats.resources++;
        };
        const insertSegmentStmt = this.#db.prepare(/* sql */`
            INSERT INTO ${tempSegmentsTable} (rid, guid, sourceLang, prj, sid, nstr, notes, mf, plan, "group", segProps, chars, words, segOrder)
            VALUES (@rid, @guid, @sourceLang, @prj, @sid, @nstr, @notes, @mf, @plan, @group, @segProps, @chars, @words, @segOrder);
        `);
        const insertSegmentRow = (row) => {
            try {
                insertSegmentStmt.run(row);
            } catch (error) {
                logError`Error inserting segment row (rid: ${row.rid}, guid: ${row.guid}, sourceLang: ${row.sourceLang}, prj: ${row.prj}, sid: ${row.sid}): ${error.message}`;
            }
            stats.segments++;
        };

        const saveResource = this.#db.transaction((res) => {
            const { channel, id, sourceLang, targetLangs, prj, segments, subresources, resourceFormat, raw, modified, ...resProps } = res;
            if (channel !== this.channelId) {
                throw new Error(`Can't insert resource ${id} from channel ${channel} into ${this.channelId} table`);
            }
            insertResourceRow(sqlTransformer.encode({
                prj,
                rid: id,
                sourceLang,
                targetLangs,
                subresources,
                resourceFormat,
                resProps,
                raw,
                modifiedAt: modified,
            }));
            segments.forEach((segment, segOrder) => {
                // eslint-disable-next-line no-unused-vars
                const { guid, sid, nstr, notes, mf, plan, group, ...segProps } = segment;
                const plainText = nstr.map(e => (typeof e === 'string' ? e : '')).join('');
                insertSegmentRow(sqlTransformer.encode({
                    rid: id, guid, sourceLang, prj, sid, nstr, notes, mf, plan, group, segProps,
                    chars: plainText.length,
                    words: (plainText.match(spaceRegex)?.length || 0) + 1,
                    segOrder,
                }));
            });
        });
        
        await cb({ saveResource, insertResourceRow, insertSegmentRow });

        // transactionally swap the temp tables with the real ones
        this.#db.transaction(() => this.#db.exec(/* sql */`
            DROP TABLE IF EXISTS ${this.resourcesTable};
            DROP TABLE IF EXISTS ${this.segmentsTable};
            ALTER TABLE ${tempResourcesTable} RENAME TO ${this.resourcesTable};
            ALTER TABLE ${tempSegmentsTable} RENAME TO ${this.segmentsTable};
        `))();
        this.#createResourceTableIndexes(this.resourcesTable);
        this.#createSegmentTableIndexes(this.segmentsTable);
        this.#saveChannelMeta({ ...meta, ...stats });
        return stats;
    }

    #buildResource(resourceRow) {
        this.#stmt.getSegmentsByRid ??= this.#db.prepare(/* sql */`
            SELECT
                guid,
                sid,
                nstr,
                notes,
                mf,
                plan,
                "group",
                segProps
            FROM ${this.segmentsTable} WHERE rid = ?
            ORDER BY segOrder;
        `);
        const { rid, ...rawResource } = resourceRow;
        const segments = this.#stmt.getSegmentsByRid.all(rid).map(segment => {
            const decodedSeg = sqlTransformer.decode(segment);
            decodedSeg.rid = rid;
            return decodedSeg;
         });
        const decodedRes = sqlTransformer.decode(rawResource);
        return { id: rid, segments, ...decodedRes };
    }

    async getResource(rid, options) {
        const keepRaw = Boolean(options?.keepRaw);
        const getResourceStmt = `getResource${keepRaw ? 'keepRaw' : ''}`;
        this.#stmt[getResourceStmt] ??= this.#db.prepare(/* sql */`
            SELECT
                rid,
                sourceLang,
                targetLangs,
                prj,
                ${keepRaw ? 'subresources,' : ''}
                resourceFormat,
                resProps,
                ${keepRaw ? 'raw,' : ''}
                modifiedAt modified
            FROM ${this.resourcesTable} WHERE rid = ?;
        `);

        const resourceRow = this.#stmt[getResourceStmt].get(rid);
        if (!resourceRow) {
            throw new Error(`Resource not found: ${rid}`);
        }
        resourceRow.channel = this.channelId;
        return this.#buildResource(resourceRow);
    }

    async *getAllResources(options = {}) {
        const { keepRaw, prj } = options;
        const prjArray = prj ? (Array.isArray(prj) ? prj : [prj]) : [];
        const getAllResourcesStmt = this.#db.prepare(/* sql */`
            SELECT
                prj,
                sourceLang,
                rid,
                targetLangs,
                ${keepRaw ? 'subresources,' : ''}
                resourceFormat,
                resProps,
                ${keepRaw ? 'raw,' : ''}
                modifiedAt modified
            FROM ${this.resourcesTable} 
            ${prjArray.length > 0 ? `WHERE prj IN (${prjArray.map(prj => `'${prj}'`).join(',')})` : ''}
            ORDER BY prj, sourceLang, rid;
        `);
        for (const resourceRow of getAllResourcesStmt.iterate()) {
            resourceRow.channel = this.channelId;
            yield this.#buildResource(resourceRow);
        }
    }

    // searchString(str) {
    //     this.#stmt.createFlatSrcIdx ??= this.#db.prepare(/* sql */`CREATE INDEX IF NOT EXISTS idx_segments_flatSrc ON segments (flattenNormalizedSourceToOrdinal(nstr));`);
    //     this.#stmt.searchString ??= this.#db.prepare(/* sql */`SELECT guid, nstr FROM segments WHERE flattenNormalizedSourceToOrdinal(nstr) like ?;`);
    //     // try to delay creating the index until it is actually needed
    //     if (!this.#flatSrcIdxInitialized) {
    //         logVerbose`Creating FlatSrcIdx for source segments...`;
    //         this.#stmt.createFlatSrcIdx.run();
    //         this.#flatSrcIdxInitialized = true;
    //     }
    //     const flattenedString = utils.flattenNormalizedSourceToOrdinal(str);
    //     const tuRows = this.#stmt.searchString.all(`%${flattenedString}%`);
    //     return tuRows.map(sqlTransformer.decode);
    // }

    async getDesiredLangPairs() {
        this.#stmt.getDesiredLangPairs ??= this.#db.prepare(/* sql */`
            SELECT DISTINCT sourceLang, key as targetLang
            FROM ${this.segmentsTable}, JSON_EACH(plan)
            WHERE value > 0
            ORDER BY 1, 2;
        `);
        return this.#stmt.getDesiredLangPairs.raw().all();
    }

    async getActiveContentStats() {
        this.#stmt.getActiveContentStats ??= this.#db.prepare(/* sql */`
            SELECT
                r.prj prj,
                r.sourceLang sourceLang,
                GROUP_CONCAT(DISTINCT value) targetLangs,
                COUNT(DISTINCT guid) AS segmentCount,
                COUNT(DISTINCT r.rid) AS resCount,
                MAX(modifiedAt) AS lastModified
            FROM ${this.resourcesTable} r
            LEFT JOIN JSON_EACH(targetLangs)
            LEFT JOIN ${this.segmentsTable} s ON r.rid = s.rid
            GROUP BY r.prj, r.sourceLang
            ORDER BY 4 DESC;
        `);
        return this.#stmt.getActiveContentStats.all();
    }

    async getProjectTOC(prj, offset, limit) {
        this.#stmt.getProjectTOC ??= this.#db.prepare(/* sql */`
            WITH res AS (
                SELECT sourceLang, rid, modifiedAt
                FROM ${this.resourcesTable} r
                WHERE COALESCE(prj, 'default') = ? ORDER BY modifiedAt DESC LIMIT ? OFFSET ?
            )
            SELECT res.sourceLang, res.rid, res.modifiedAt, count(guid) as segmentCount
            FROM res
            LEFT JOIN ${this.segmentsTable} s USING(rid)
            GROUP BY 1, 2, 3;
        `);
        return this.#stmt.getProjectTOC.all(prj, limit, offset);
    }

    async *getResourceRowIterator() {
        this.#stmt.getResourceRowIterator ??= this.#db.prepare(/* sql */`
            SELECT
                prj,
                sourceLang,
                rid,
                targetLangs,
                subresources,
                resourceFormat,
                resProps,
                raw,
                modifiedAt
            FROM
                ${this.resourcesTable}
            ORDER BY prj, sourceLang, rid;
        `);
        logVerbose`Getting resource rows for channel ${this.channelId}...`;
        yield* this.#stmt.getResourceRowIterator.iterate();
    }

    async *getSegmentRowIterator() {
        this.#stmt.getSegmentRowIterator ??= this.#db.prepare(/* sql */`
            SELECT
                rid,
                guid,
                sourceLang,
                prj,
                sid,
                nstr,
                notes,
                mf,
                plan,
                "group",
                segProps,
                chars,
                words,
                segOrder
            FROM
                ${this.segmentsTable}
            ORDER BY prj, rid, guid;
        `);
        logVerbose`Getting segment rows for channel ${this.channelId}...`;
        yield* this.#stmt.getSegmentRowIterator.iterate();
    }
}
