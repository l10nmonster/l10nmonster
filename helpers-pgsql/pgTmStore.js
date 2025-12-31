import { logVerbose, logWarn } from '@l10nmonster/core';
import { flattenNormalizedSourceToOrdinal } from './pgUtils.js';

/**
 * @typedef {import('@l10nmonster/core').TMStore} TMStore
 * @typedef {import('@l10nmonster/core').TMStoreTOC} TMStoreTOC
 * @typedef {import('@l10nmonster/core').JobPropsTusPair} JobPropsTusPair
 */

/**
 * PostgreSQL implementation of TMStore.
 * @implements {TMStore}
 */
export class PgTmStore {

    /** @type {string} */
    id;

    /** @type {'readwrite' | 'readonly' | 'writeonly'} */
    access = 'readwrite';

    /** @type {'job' | 'provider' | 'language'} */
    partitioning = 'language';

    #pool;
    #ensureTables;
    #tmStoreId;
    #onlyLeveraged;
    #snapStoreId;

    /**
     * @param {import('pg').Pool} pool - PostgreSQL pool
     * @param {Function} ensureTables - Function to ensure tables exist
     * @param {Object} options - Store options
     * @param {string} options.id - Logical store ID
     * @param {string} [options.tmStoreId] - Data segregation key (defaults to id)
     * @param {'readwrite'|'readonly'|'writeonly'} [options.access='readwrite']
     * @param {'job'|'provider'|'language'} [options.partitioning='language']
     * @param {string[]} [options.onlyLeveraged] - Channel IDs to filter TUs by
     * @param {string} [options.snapStoreId] - SnapStore ID for onlyLeveraged filtering
     */
    constructor(pool, ensureTables, options) {
        this.#pool = pool;
        this.#ensureTables = ensureTables;
        this.id = options.id;
        this.#tmStoreId = options.tmStoreId ?? options.id;

        if (options.access) {
            if (!['readwrite', 'readonly', 'writeonly'].includes(options.access)) {
                throw new Error(`Unknown access type: ${options.access}`);
            }
            this.access = options.access;
        }

        if (options.partitioning) {
            if (!['job', 'provider', 'language'].includes(options.partitioning)) {
                throw new Error(`Unknown partitioning type: ${options.partitioning}`);
            }
            this.partitioning = options.partitioning;
        }

        if (options.onlyLeveraged) {
            if (!Array.isArray(options.onlyLeveraged) || options.onlyLeveraged.length === 0) {
                throw new Error('onlyLeveraged must be a non-empty array of channel IDs');
            }
            if (!options.snapStoreId) {
                throw new Error('snapStoreId is required when using onlyLeveraged');
            }
            this.#onlyLeveraged = options.onlyLeveraged;
            this.#snapStoreId = options.snapStoreId;
        }

        logVerbose`PgTmStore ${this.id} created with tmStoreId: ${this.#tmStoreId} access: ${this.access} partitioning: ${this.partitioning}${this.#onlyLeveraged ? ` onlyLeveraged: ${this.#onlyLeveraged.join(', ')}` : ''}`;
    }

    /**
     * Gets available language pairs in the store.
     * @returns {Promise<Array<[string, string]>>}
     */
    async getAvailableLangPairs() {
        await this.#ensureTables();

        const { rows } = await this.#pool.query(/* sql */`
            SELECT DISTINCT source_lang, target_lang
            FROM tm_jobs
            WHERE tm_store_id = $1;
        `, [this.#tmStoreId]);

        return rows.map(r => [r.source_lang, r.target_lang]);
    }

    /**
     * Gets the table of contents for a language pair.
     * @param {string} sourceLang
     * @param {string} targetLang
     * @returns {Promise<TMStoreTOC>}
     */
    async getTOC(sourceLang, targetLang) {
        await this.#ensureTables();

        // Get all jobs grouped by block_id
        const { rows } = await this.#pool.query(/* sql */`
            SELECT block_id, job_guid, updated_at
            FROM tm_jobs
            WHERE tm_store_id = $1 AND source_lang = $2 AND target_lang = $3
            ORDER BY block_id, updated_at DESC;
        `, [this.#tmStoreId, sourceLang, targetLang]);

        /** @type {Record<string, { blockName: string; modified: string; jobs: Array<[string, string]> }>} */
        const blocks = {};

        for (const row of rows) {
            const blockId = row.block_id || row.job_guid; // Default block_id to job_guid
            if (!blocks[blockId]) {
                blocks[blockId] = {
                    blockName: `${this.#tmStoreId}/${sourceLang}/${targetLang}/${blockId}`,
                    modified: row.updated_at,
                    jobs: [],
                };
            }
            blocks[blockId].jobs.push([row.job_guid, row.updated_at]);
            // Update modified to the latest
            if (row.updated_at > blocks[blockId].modified) {
                blocks[blockId].modified = row.updated_at;
            }
        }

        // Generate storedBlocks from blocks
        const storedBlocks = Object.entries(blocks).map(([blockId, block]) => [blockId, block.blockName]);

        return {
            v: 1,
            sourceLang,
            targetLang,
            blocks,
            storedBlocks,
        };
    }

    /**
     * Gets TM blocks by their IDs.
     * @param {string} sourceLang
     * @param {string} targetLang
     * @param {string[]} blockIds
     * @returns {AsyncGenerator<JobPropsTusPair>}
     */
    async *getTmBlocks(sourceLang, targetLang, blockIds) {
        await this.#ensureTables();

        const toc = await this.getTOC(sourceLang, targetLang);

        // Collect all job GUIDs from requested blocks
        const jobGuids = [];
        for (const blockId of blockIds) {
            const block = toc.blocks[blockId];
            if (block) {
                for (const [jobGuid] of block.jobs) {
                    jobGuids.push(jobGuid);
                }
            } else {
                logWarn`Block not found: ${blockId}`;
            }
        }

        if (jobGuids.length === 0) return;

        // Build the query with optional onlyLeveraged filtering
        let query;
        let params;

        if (this.#onlyLeveraged && this.#snapStoreId) {
            // Filter by GUIDs present in the latest snapshot of specified channels
            query = /* sql */`
                WITH latest_snaps AS (
                    SELECT channel_id, MAX(ts) as max_ts
                    FROM snap_toc
                    WHERE snap_store_id = $1 AND channel_id = ANY($2)
                    GROUP BY channel_id
                ),
                leveraged_guids AS (
                    SELECT DISTINCT s.guid
                    FROM snap_segments s
                    JOIN latest_snaps ls ON s.channel_id = ls.channel_id
                    WHERE s.snap_store_id = $1
                      AND s.valid_from <= ls.max_ts
                      AND (s.valid_to IS NULL OR s.valid_to > ls.max_ts)
                )
                SELECT t.job_guid, t.guid, t.rid, t.sid, t.nsrc, t.ntgt, t.notes, t.tu_props, t.q, t.ts, t.tu_order
                FROM tm_blocks t
                WHERE t.tm_store_id = $3
                  AND t.source_lang = $4 AND t.target_lang = $5
                  AND t.job_guid = ANY($6)
                  AND t.guid IN (SELECT guid FROM leveraged_guids)
                ORDER BY t.job_guid, t.tu_order;
            `;
            params = [this.#snapStoreId, this.#onlyLeveraged, this.#tmStoreId, sourceLang, targetLang, jobGuids];
        } else {
            query = /* sql */`
                SELECT job_guid, guid, rid, sid, nsrc, ntgt, notes, tu_props, q, ts, tu_order
                FROM tm_blocks
                WHERE tm_store_id = $1 AND source_lang = $2 AND target_lang = $3 AND job_guid = ANY($4)
                ORDER BY job_guid, tu_order;
            `;
            params = [this.#tmStoreId, sourceLang, targetLang, jobGuids];
        }

        const { rows } = await this.#pool.query(query, params);

        // Get job metadata
        const jobPropsMap = new Map();
        const { rows: jobRows } = await this.#pool.query(/* sql */`
            SELECT job_guid, translation_provider, status, updated_at, job_props
            FROM tm_jobs
            WHERE tm_store_id = $1 AND job_guid = ANY($2);
        `, [this.#tmStoreId, jobGuids]);

        for (const row of jobRows) {
            jobPropsMap.set(row.job_guid, {
                jobGuid: row.job_guid,
                sourceLang,
                targetLang,
                translationProvider: row.translation_provider,
                status: row.status,
                updatedAt: row.updated_at,
                ...(row.job_props || {}),
            });
        }

        // Group TUs by job
        /** @type {Map<string, Array>} */
        const tusByJob = new Map();
        for (const row of rows) {
            if (!tusByJob.has(row.job_guid)) {
                tusByJob.set(row.job_guid, []);
            }
            tusByJob.get(row.job_guid).push({
                guid: row.guid,
                jobGuid: row.job_guid,
                rid: row.rid,
                sid: row.sid,
                nsrc: row.nsrc,
                ntgt: row.ntgt,
                notes: row.notes,
                q: row.q,
                ts: row.ts,
                ...(row.tu_props || {}),
            });
        }

        // Yield job/TU pairs
        for (const [jobGuid, tus] of tusByJob) {
            const jobProps = jobPropsMap.get(jobGuid);
            if (jobProps) {
                yield { jobProps, tus };
            }
        }
    }

    /**
     * Gets a writer for committing TM data.
     * @param {string} sourceLang
     * @param {string} targetLang
     * @param {Function} cb - Callback function receiving a write function
     */
    async getWriter(sourceLang, targetLang, cb) {
        if (this.access === 'readonly') {
            throw new Error(`Cannot write to readonly TM Store: ${this.id}`);
        }

        await this.#ensureTables();
        const toc = await this.getTOC(sourceLang, targetLang);

        /**
         * @param {{ translationProvider?: string; blockId: string }} blockProps
         * @param {AsyncIterable<JobPropsTusPair>|null} tmBlockIterator
         */
        const writeBlock = async (blockProps, tmBlockIterator) => {
            const { blockId } = blockProps;

            if (tmBlockIterator) {
                const client = await this.#pool.connect();
                try {
                    await client.query('BEGIN');

                    let tuCount = 0;
                    const jobGuidsInBlock = [];

                    for await (const { jobProps, tus } of tmBlockIterator) {
                        const { jobGuid, translationProvider, status, updatedAt, ...otherJobProps } = jobProps;
                        jobGuidsInBlock.push(jobGuid);

                        // Upsert job metadata
                        await client.query(/* sql */`
                            INSERT INTO tm_jobs (tm_store_id, source_lang, target_lang, job_guid, translation_provider, status, updated_at, job_props, block_id)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                            ON CONFLICT (tm_store_id, job_guid) DO UPDATE SET
                                source_lang = EXCLUDED.source_lang,
                                target_lang = EXCLUDED.target_lang,
                                translation_provider = EXCLUDED.translation_provider,
                                status = EXCLUDED.status,
                                updated_at = EXCLUDED.updated_at,
                                job_props = EXCLUDED.job_props,
                                block_id = EXCLUDED.block_id;
                        `, [this.#tmStoreId, sourceLang, targetLang, jobGuid, translationProvider, status, updatedAt ?? new Date().toISOString(), JSON.stringify(otherJobProps), blockId]);

                        // Delete existing TUs for this job (to replace)
                        await client.query(/* sql */`
                            DELETE FROM tm_blocks
                            WHERE tm_store_id = $1 AND source_lang = $2 AND target_lang = $3 AND job_guid = $4;
                        `, [this.#tmStoreId, sourceLang, targetLang, jobGuid]);

                        // Insert TUs in batches using UNNEST
                        if (tus.length > 0) {
                            const guids = [];
                            const rids = [];
                            const sids = [];
                            const nsrcs = [];
                            const nsrcFlats = [];
                            const ntgts = [];
                            const ntgtFlats = [];
                            const notesArr = [];
                            const tuPropsArr = [];
                            const qs = [];
                            const tss = [];
                            const tuOrders = [];

                            tus.forEach((tu, idx) => {
                                const { guid, rid, sid, nsrc, ntgt, notes, q, ts, ...tuProps } = tu;
                                guids.push(guid);
                                rids.push(rid);
                                sids.push(sid);
                                nsrcs.push(JSON.stringify(nsrc));
                                nsrcFlats.push(flattenNormalizedSourceToOrdinal(nsrc));
                                ntgts.push(ntgt ? JSON.stringify(ntgt) : null);
                                ntgtFlats.push(ntgt ? flattenNormalizedSourceToOrdinal(ntgt) : null);
                                notesArr.push(notes ? JSON.stringify(notes) : null);
                                tuPropsArr.push(Object.keys(tuProps).length > 0 ? JSON.stringify(tuProps) : null);
                                qs.push(q);
                                tss.push(ts);
                                tuOrders.push(idx);
                            });

                            await client.query(/* sql */`
                                INSERT INTO tm_blocks
                                    (tm_store_id, source_lang, target_lang, job_guid, guid, rid, sid, nsrc, nsrc_flat, ntgt, ntgt_flat, notes, tu_props, q, ts, tu_order)
                                SELECT $1, $2, $3, $4, g, r, s, ns::jsonb, nf, nt::jsonb, ntf, n::jsonb, tp::jsonb, q, t, o
                                FROM UNNEST($5::text[], $6::text[], $7::text[], $8::text[], $9::text[], $10::text[], $11::text[], $12::text[], $13::text[], $14::int[], $15::bigint[], $16::int[])
                                    AS t(g, r, s, ns, nf, nt, ntf, n, tp, q, t, o);
                            `, [this.#tmStoreId, sourceLang, targetLang, jobGuid, guids, rids, sids, nsrcs, nsrcFlats, ntgts, ntgtFlats, notesArr, tuPropsArr, qs, tss, tuOrders]);

                            tuCount += tus.length;
                        }
                    }

                    await client.query('COMMIT');

                    if (tuCount > 0) {
                        logVerbose`Saved ${tuCount.toLocaleString()} ${[tuCount, 'TU', 'TUs']} in block ${blockId} of TM Store ${this.id} (${sourceLang} → ${targetLang})`;
                    }
                } catch (e) {
                    await client.query('ROLLBACK');
                    throw e;
                } finally {
                    client.release();
                }
            } else {
                // Delete block - remove all jobs and TUs for this block
                const blockJobs = toc.blocks[blockId]?.jobs || [];
                if (blockJobs.length > 0) {
                    const jobGuids = blockJobs.map(([jg]) => jg);

                    const client = await this.#pool.connect();
                    try {
                        await client.query('BEGIN');

                        await client.query(/* sql */`
                            DELETE FROM tm_blocks
                            WHERE tm_store_id = $1 AND source_lang = $2 AND target_lang = $3 AND job_guid = ANY($4);
                        `, [this.#tmStoreId, sourceLang, targetLang, jobGuids]);

                        await client.query(/* sql */`
                            DELETE FROM tm_jobs
                            WHERE tm_store_id = $1 AND job_guid = ANY($2);
                        `, [this.#tmStoreId, jobGuids]);

                        await client.query('COMMIT');
                        logVerbose`Deleted block ${blockId} from TM Store ${this.id}`;
                    } catch (e) {
                        await client.query('ROLLBACK');
                        throw e;
                    } finally {
                        client.release();
                    }
                } else {
                    logVerbose`Couldn't delete block ${blockId} from TM Store ${this.id} because it was not found`;
                }
            }
        };

        await cb(writeBlock);
    }
}
