import { logVerbose, logWarn } from '@l10nmonster/core';
import { createSQLObjectTransformer, sanitizeTableName, flattenNormalizedSourceToOrdinal } from './pgUtils.js';

/** @typedef {import('@l10nmonster/core').ChannelDAL} ChannelDAL */

const sqlTransformer = createSQLObjectTransformer(
    ['targetLangs', 'plan', 'subresources', 'resProps', 'nstr', 'notes', 'segProps'],
    ['resProps', 'segProps']
);
const spaceRegex = /\s+/g;

/**
 * PostgreSQL implementation of ChannelDAL.
 * @implements {ChannelDAL}
 */
export class PgChannelDAL {
    #pool;

    /** @type {string} */
    channelId;

    /** @type {string} */
    resourcesTable;

    /** @type {string} */
    segmentsTable;

    /**
     * @param {import('pg').Pool} pool - PostgreSQL pool
     * @param {string} channelId - Channel identifier
     */
    constructor(pool, channelId) {
        this.#pool = pool;
        this.channelId = channelId;
        this.resourcesTable = sanitizeTableName(`resources_${channelId}`);
        this.segmentsTable = sanitizeTableName(`segments_${channelId}`);
    }

    /**
     * Ensures tables exist for this channel.
     * Called lazily when operations require the table to exist.
     */
    async ensureTables() {
        await this.#pool.query(/* sql */`
            CREATE TABLE IF NOT EXISTS ${this.resourcesTable} (
                prj TEXT,
                rid TEXT NOT NULL PRIMARY KEY,
                source_lang TEXT,
                target_langs JSONB,
                subresources JSONB,
                resource_format TEXT,
                res_props JSONB,
                raw TEXT,
                modified_at TEXT
            );
        `);

        await this.#pool.query(/* sql */`
            CREATE TABLE IF NOT EXISTS ${this.segmentsTable} (
                rid TEXT NOT NULL,
                guid TEXT NOT NULL PRIMARY KEY,
                source_lang TEXT,
                prj TEXT,
                sid TEXT,
                nstr JSONB,
                nstr_flat TEXT,
                notes JSONB,
                mf TEXT,
                plan JSONB,
                "group" TEXT,
                seg_props JSONB,
                chars INTEGER,
                words INTEGER,
                seg_order INTEGER
            );
        `);
    }

    /**
     * Creates indexes for the tables.
     */
    async #createIndexes() {
        await this.#pool.query(/* sql */`
            CREATE INDEX IF NOT EXISTS idx_${this.resourcesTable}_prj_source_lang_rid
                ON ${this.resourcesTable} (prj, source_lang, rid);
            CREATE INDEX IF NOT EXISTS idx_${this.resourcesTable}_modified_at
                ON ${this.resourcesTable} (modified_at);
        `);

        await this.#pool.query(/* sql */`
            CREATE INDEX IF NOT EXISTS idx_${this.segmentsTable}_rid_seg_order
                ON ${this.segmentsTable} (rid, seg_order);
            CREATE INDEX IF NOT EXISTS idx_${this.segmentsTable}_prj_rid
                ON ${this.segmentsTable} (prj, rid);
            CREATE INDEX IF NOT EXISTS idx_${this.segmentsTable}_group
                ON ${this.segmentsTable} ("group");
            CREATE INDEX IF NOT EXISTS idx_${this.segmentsTable}_source_lang_guid
                ON ${this.segmentsTable} (source_lang, guid);
            CREATE INDEX IF NOT EXISTS idx_${this.segmentsTable}_source_lang_prj_rid
                ON ${this.segmentsTable} (source_lang, prj, rid);
            CREATE INDEX IF NOT EXISTS idx_${this.segmentsTable}_nstr_flat
                ON ${this.segmentsTable} USING hash (nstr_flat);
        `);
    }

    /**
     * Gets channel metadata from the table of contents.
     * @returns {Promise<Object | undefined>}
     */
    async getChannelMeta() {
        const { rows } = await this.#pool.query(/* sql */`
            SELECT channel, store, ts, resources, segments
            FROM channel_toc WHERE channel = $1;
        `, [this.channelId]);
        return rows[0];
    }

    /**
     * Saves channel metadata.
     * @param {{ store?: string; ts: number; resources: number; segments: number }} meta
     */
    async #saveChannelMeta({ store, ts, resources, segments }) {
        await this.#pool.query(/* sql */`
            INSERT INTO channel_toc (channel, store, ts, resources, segments)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (channel)
            DO UPDATE SET
                store = EXCLUDED.store,
                ts = EXCLUDED.ts,
                resources = EXCLUDED.resources,
                segments = EXCLUDED.segments;
        `, [this.channelId, store, ts, resources, segments]);
    }

    static #BATCH_SIZE = 5000;

    /**
     * Saves channel data by building temporary tables and atomically swapping them.
     * @param {Object} meta - Channel metadata including ts and optional store
     * @param {Function} cb - Callback receiving { saveResource, insertResourceRow, insertSegmentRow }
     * @returns {Promise<{ resources: number, segments: number }>}
     */
    async saveChannel(meta, cb) {
        const stats = { resources: 0, segments: 0 };
        const tempResourcesTable = `temp_${this.resourcesTable}`;
        const tempSegmentsTable = `temp_${this.segmentsTable}`;

        // Collect all data synchronously first (no async during callback)
        const allResources = [];
        const allSegments = [];

        const insertResourceRow = (row) => {
            allResources.push(row);
        };

        const insertSegmentRow = (row) => {
            allSegments.push(row);
        };

        const saveResource = (res) => {
            const { channel, id, sourceLang, targetLangs, prj, segments, subresources, resourceFormat, raw, modified, ...resProps } = res;
            if (channel !== this.channelId) {
                throw new Error(`Can't insert resource ${id} from channel ${channel} into ${this.channelId} table`);
            }
            const encodedRes = sqlTransformer.encode({
                prj,
                rid: id,
                sourceLang,
                targetLangs,
                subresources,
                resourceFormat,
                resProps,
                raw,
                modifiedAt: modified,
            });
            insertResourceRow(encodedRes);

            for (let segOrder = 0; segOrder < segments.length; segOrder++) {
                const segment = segments[segOrder];
                const { guid, sid, nstr, notes, mf, plan, group, ...segProps } = segment;
                const plainText = nstr.map(e => (typeof e === 'string' ? e : '')).join('');
                const encodedSeg = sqlTransformer.encode({
                    rid: id, guid, sourceLang, prj, sid, nstr, notes, mf, plan, group, segProps,
                    chars: plainText.length,
                    words: (plainText.match(spaceRegex)?.length || 0) + 1,
                    segOrder,
                });
                encodedSeg.nstrFlat = flattenNormalizedSourceToOrdinal(nstr);
                insertSegmentRow(encodedSeg);
            }
        };

        // Collect all data synchronously
        await cb({ saveResource, insertResourceRow, insertSegmentRow });

        logVerbose`PgChannelDAL: collected ${allResources.length} resources and ${allSegments.length} segments for ${this.channelId}`;

        const client = await this.#pool.connect();
        try {
            await client.query('BEGIN');

            // Drop temp tables if they exist
            await client.query(`DROP TABLE IF EXISTS ${tempResourcesTable};`);
            await client.query(`DROP TABLE IF EXISTS ${tempSegmentsTable};`);

            // Create temp tables WITHOUT primary key for faster bulk inserts
            await client.query(/* sql */`
                CREATE TABLE ${tempResourcesTable} (
                    prj TEXT,
                    rid TEXT NOT NULL,
                    source_lang TEXT,
                    target_langs JSONB,
                    subresources JSONB,
                    resource_format TEXT,
                    res_props JSONB,
                    raw TEXT,
                    modified_at TEXT
                );
            `);

            await client.query(/* sql */`
                CREATE TABLE ${tempSegmentsTable} (
                    rid TEXT NOT NULL,
                    guid TEXT NOT NULL UNIQUE,
                    source_lang TEXT,
                    prj TEXT,
                    sid TEXT,
                    nstr JSONB,
                    nstr_flat TEXT,
                    notes JSONB,
                    mf TEXT,
                    plan JSONB,
                    "group" TEXT,
                    seg_props JSONB,
                    chars INTEGER,
                    words INTEGER,
                    seg_order INTEGER
                );
            `);

            // Insert resources in batches (splice to allow GC of processed data)
            const batchSize = PgChannelDAL.#BATCH_SIZE;
            stats.resources = allResources.length;
            const numResourceBatches = Math.ceil(stats.resources / batchSize);
            let resourceBatchNum = 0;
            while (allResources.length > 0) {
                const batch = allResources.splice(0, batchSize);
                resourceBatchNum++;
                logVerbose`PgChannelDAL: inserting resource batch ${resourceBatchNum}/${numResourceBatches} (${batch.length} rows)`;

                const prjs = [], 
rids = [], 
sourceLangs = [], 
targetLangsArr = [];
                const subresourcesArr = [], 
resourceFormats = [], 
resPropsArr = [];
                const raws = [], 
modifiedAts = [];

                for (const row of batch) {
                    prjs.push(row.prj);
                    rids.push(row.rid);
                    sourceLangs.push(row.sourceLang);
                    targetLangsArr.push(row.targetLangs);
                    subresourcesArr.push(row.subresources);
                    resourceFormats.push(row.resourceFormat);
                    resPropsArr.push(row.resProps);
                    raws.push(row.raw);
                    modifiedAts.push(row.modifiedAt);
                }

                await client.query(/* sql */`
                    INSERT INTO ${tempResourcesTable}
                    (prj, rid, source_lang, target_langs, subresources, resource_format, res_props, raw, modified_at)
                    SELECT * FROM UNNEST(
                        $1::text[], $2::text[], $3::text[], $4::jsonb[], $5::jsonb[],
                        $6::text[], $7::jsonb[], $8::text[], $9::text[]
                    );
                `, [prjs, rids, sourceLangs, targetLangsArr, subresourcesArr, resourceFormats, resPropsArr, raws, modifiedAts]);
            }

            // Insert segments in batches (splice to allow GC of processed data)
            const totalSegments = allSegments.length;
            const numSegmentBatches = Math.ceil(totalSegments / batchSize);
            let segmentBatchNum = 0;
            let insertedSegments = 0;
            while (allSegments.length > 0) {
                const batch = allSegments.splice(0, batchSize);
                segmentBatchNum++;
                logVerbose`PgChannelDAL: inserting segment batch ${segmentBatchNum}/${numSegmentBatches} (${batch.length} rows)`;

                const ridsArr = [], 
guids = [], 
sourceLangsArr = [], 
prjsArr = [], 
sids = [];
                const nstrs = [], 
nstrFlats = [], 
notesArr = [], 
mfs = [], 
plans = [];
                const groups = [], 
segPropsArr = [], 
chars = [], 
words = [], 
segOrders = [];

                for (const row of batch) {
                    ridsArr.push(row.rid);
                    guids.push(row.guid);
                    sourceLangsArr.push(row.sourceLang);
                    prjsArr.push(row.prj);
                    sids.push(row.sid);
                    nstrs.push(row.nstr);
                    nstrFlats.push(row.nstrFlat);
                    notesArr.push(row.notes);
                    mfs.push(row.mf);
                    plans.push(row.plan);
                    groups.push(row.group);
                    segPropsArr.push(row.segProps);
                    chars.push(row.chars);
                    words.push(row.words);
                    segOrders.push(row.segOrder);
                }

                const result = await client.query(/* sql */`
                    INSERT INTO ${tempSegmentsTable}
                    (rid, guid, source_lang, prj, sid, nstr, nstr_flat, notes, mf, plan, "group", seg_props, chars, words, seg_order)
                    SELECT * FROM UNNEST(
                        $1::text[], $2::text[], $3::text[], $4::text[], $5::text[],
                        $6::jsonb[], $7::text[], $8::jsonb[], $9::text[], $10::jsonb[],
                        $11::text[], $12::jsonb[], $13::int[], $14::int[], $15::int[]
                    )
                    ON CONFLICT (guid) DO NOTHING;
                `, [ridsArr, guids, sourceLangsArr, prjsArr, sids, nstrs, nstrFlats, notesArr, mfs, plans, groups, segPropsArr, chars, words, segOrders]);
                insertedSegments += result.rowCount;
            }
            stats.segments = insertedSegments;
            const duplicateCount = totalSegments - insertedSegments;
            if (duplicateCount > 0) {
                logWarn`PgChannelDAL: ${duplicateCount} duplicate segment GUIDs skipped for ${this.channelId}`;
            }

            // Add primary key to resources (segments already has UNIQUE on guid)
            await client.query(/* sql */`
                ALTER TABLE ${tempResourcesTable} ADD PRIMARY KEY (rid);
            `);

            // Atomically swap tables
            await client.query(`DROP TABLE IF EXISTS ${this.resourcesTable};`);
            await client.query(`DROP TABLE IF EXISTS ${this.segmentsTable};`);
            await client.query(`ALTER TABLE ${tempResourcesTable} RENAME TO ${this.resourcesTable};`);
            await client.query(`ALTER TABLE ${tempSegmentsTable} RENAME TO ${this.segmentsTable};`);

            await client.query('COMMIT');

            // Create indexes after swap (outside transaction for better performance)
            await this.#createIndexes();

            // Save metadata
            await this.#saveChannelMeta({ ...meta, ...stats });

            logVerbose`PgChannelDAL: saveChannel complete for ${this.channelId} - ${stats.resources} resources, ${stats.segments} segments`;
            return stats;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Gets a resource by ID.
     * @param {string} rid
     * @param {{ keepRaw?: boolean }} [options]
     * @returns {Promise<Object>}
     */
    async getResource(rid, options) {
        const keepRaw = Boolean(options?.keepRaw);
        const columns = keepRaw ?
            'rid, source_lang, target_langs, prj, subresources, resource_format, res_props, raw, modified_at' :
            'rid, source_lang, target_langs, prj, resource_format, res_props, modified_at';

        const { rows: resourceRows } = await this.#pool.query(/* sql */`
            SELECT ${columns} FROM ${this.resourcesTable} WHERE rid = $1;
        `, [rid]);

        if (resourceRows.length === 0) {
            throw new Error(`Resource not found: ${rid}`);
        }

        const resourceRow = resourceRows[0];
        return this.#buildResource(resourceRow);
    }

    /**
     * Builds a full resource object with segments.
     * @param {Object} resourceRow
     * @returns {Promise<Object>}
     */
    async #buildResource(resourceRow) {
        const { rows: segmentRows } = await this.#pool.query(/* sql */`
            SELECT guid, sid, nstr, notes, mf, plan, "group", seg_props
            FROM ${this.segmentsTable}
            WHERE rid = $1
            ORDER BY seg_order;
        `, [resourceRow.rid]);

        const segments = segmentRows.map(segment => {
            const decodedSeg = sqlTransformer.decode({
                guid: segment.guid,
                sid: segment.sid,
                nstr: segment.nstr,
                notes: segment.notes,
                mf: segment.mf,
                plan: segment.plan,
                group: segment.group,
                segProps: segment.seg_props,
            });
            decodedSeg.rid = resourceRow.rid;
            return decodedSeg;
        });

        const decodedRes = sqlTransformer.decode({
            sourceLang: resourceRow.source_lang,
            targetLangs: resourceRow.target_langs,
            prj: resourceRow.prj,
            subresources: resourceRow.subresources,
            resourceFormat: resourceRow.resource_format,
            resProps: resourceRow.res_props,
            raw: resourceRow.raw,
            modified: resourceRow.modified_at,
        });

        return { id: resourceRow.rid, segments, channel: this.channelId, ...decodedRes };
    }

    /**
     * Gets all resources with their segments.
     * @param {{ keepRaw?: boolean; prj?: string | string[] }} [options]
     * @returns {AsyncGenerator<Object>}
     */
    async *getAllResources(options = {}) {
        const { keepRaw, prj } = options;
        const prjArray = prj ? (Array.isArray(prj) ? prj : [prj]) : [];

        const columns = keepRaw ?
            'prj, source_lang, rid, target_langs, subresources, resource_format, res_props, raw, modified_at' :
            'prj, source_lang, rid, target_langs, resource_format, res_props, modified_at';

        let query = `SELECT ${columns} FROM ${this.resourcesTable}`;
        const params = [];

        if (prjArray.length > 0) {
            query += ` WHERE prj = ANY($1)`;
            params.push(prjArray);
        }

        query += ' ORDER BY prj, source_lang, rid;';

        const { rows } = await this.#pool.query(query, params);

        for (const row of rows) {
            const resourceRow = {
                rid: row.rid,
                source_lang: row.source_lang,
                target_langs: row.target_langs,
                prj: row.prj,
                subresources: row.subresources,
                resource_format: row.resource_format,
                res_props: row.res_props,
                raw: row.raw,
                modified_at: row.modified_at,
            };
            yield await this.#buildResource(resourceRow);
        }
    }

    /**
     * Gets desired language pairs from channel segments.
     * @returns {Promise<Array<[string, string]>>}
     */
    async getDesiredLangPairs() {
        try {
            const { rows } = await this.#pool.query(/* sql */`
                SELECT DISTINCT source_lang, key as target_lang
                FROM ${this.segmentsTable}, jsonb_each(plan)
                WHERE (value::text)::integer > 0
                ORDER BY 1, 2;
            `);
            return rows.map(row => [row.source_lang, row.target_lang]);
        } catch (error) {
            // Return empty array if table doesn't exist (channel not snapped yet)
            if (error.code === '42P01') {
                return [];
            }
            throw error;
        }
    }

    /**
     * Gets active content statistics.
     * @returns {Promise<Array>}
     */
    async getActiveContentStats() {
        try {
            // Query 1: Resource-level stats
            const { rows: resourceStats } = await this.#pool.query(/* sql */`
                SELECT
                    COALESCE(prj, 'default') as prj,
                    source_lang,
                    string_agg(DISTINCT value::text, ',') as target_langs,
                    COUNT(*) AS res_count,
                    MAX(modified_at) AS last_modified
                FROM ${this.resourcesTable}
                LEFT JOIN LATERAL jsonb_array_elements(target_langs) ON true
                GROUP BY 1, 2;
            `);

            // Query 2: Segment counts
            const { rows: segmentStats } = await this.#pool.query(/* sql */`
                SELECT
                    COALESCE(prj, 'default') as prj,
                    source_lang,
                    COUNT(*) AS segment_count
                FROM ${this.segmentsTable}
                GROUP BY 1, 2;
            `);

            // Create segment count map
            const segmentMap = new Map();
            for (const row of segmentStats) {
                segmentMap.set(`${row.prj}|${row.source_lang}`, parseInt(row.segment_count, 10));
            }

            // Merge results
            const results = resourceStats.map(row => ({
                prj: row.prj,
                sourceLang: row.source_lang,
                targetLangs: row.target_langs,
                segmentCount: segmentMap.get(`${row.prj}|${row.source_lang}`) || 0,
                resCount: parseInt(row.res_count, 10),
                lastModified: row.last_modified
            }));

            // Sort by segment count descending
            results.sort((a, b) => b.segmentCount - a.segmentCount);

            return results;
        } catch (error) {
            // Return empty array if tables don't exist (channel not snapped yet)
            if (error.code === '42P01') {
                return [];
            }
            throw error;
        }
    }

    /**
     * Gets project table of contents.
     * @param {string} prj
     * @param {number} offset
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    async getProjectTOC(prj, offset, limit) {
        try {
            const { rows } = await this.#pool.query(/* sql */`
                WITH res AS (
                    SELECT source_lang, rid, modified_at
                    FROM ${this.resourcesTable}
                    WHERE COALESCE(prj, 'default') = $1
                    ORDER BY modified_at DESC
                    LIMIT $2 OFFSET $3
                )
                SELECT res.source_lang as "sourceLang", res.rid, res.modified_at as "modifiedAt", count(guid)::integer as "segmentCount"
                FROM res
                LEFT JOIN ${this.segmentsTable} s USING(rid)
                GROUP BY 1, 2, 3;
            `, [prj, limit, offset]);
            return rows;
        } catch (error) {
            // Return empty array if tables don't exist (channel not snapped yet)
            if (error.code === '42P01') {
                return [];
            }
            throw error;
        }
    }

    /**
     * Iterates over resource rows for export.
     * @returns {AsyncGenerator<Object>}
     */
    async *getResourceRowIterator() {
        const { rows } = await this.#pool.query(/* sql */`
            SELECT
                prj,
                source_lang as "sourceLang",
                rid,
                target_langs as "targetLangs",
                subresources,
                resource_format as "resourceFormat",
                res_props as "resProps",
                raw,
                modified_at as "modifiedAt"
            FROM ${this.resourcesTable}
            ORDER BY prj, source_lang, rid;
        `);
        for (const row of rows) {
            yield row;
        }
    }

    /**
     * Iterates over segment rows for export.
     * @returns {AsyncGenerator<Object>}
     */
    async *getSegmentRowIterator() {
        const { rows } = await this.#pool.query(/* sql */`
            SELECT
                rid,
                guid,
                source_lang as "sourceLang",
                prj,
                sid,
                nstr,
                notes,
                mf,
                plan,
                "group",
                seg_props as "segProps",
                chars,
                words,
                seg_order as "segOrder"
            FROM ${this.segmentsTable}
            ORDER BY prj, rid, guid;
        `);
        for (const row of rows) {
            yield row;
        }
    }
}
