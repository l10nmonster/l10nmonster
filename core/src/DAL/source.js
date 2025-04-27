import { L10nContext, utils } from '@l10nmonster/core';
import { createSQLObjectTransformer } from './index.js';
import { source } from '../actions/source.js';

const sqlTransformer = createSQLObjectTransformer(['targetLangs', 'plan', 'segments', 'subresources', 'resProps', 'nstr', 'notes', 'segProps'], ['resProps', 'segProps']);
const spaceRegex = /\s+/g;

export class SourceDAL {
    #db;
    #stmt = {}; // prepared statements
    #flatSrcIdxInitialized = false;

    constructor(db) {
        this.#db = db;
        db.exec(/* sql */`
CREATE TABLE IF NOT EXISTS resources (
    channel TEXT NOT NULL,
    rid TEXT NOT NULL,
    sourceLang TEXT,
    targetLangs TEXT,
    plan TEXT,
    prj TEXT,
    segments TEXT,
    subresources TEXT,
    resourceFormat TEXT,
    resProps TEXT,
    raw TEXT,
    createdAt TEXT,
    modifiedAt TEXT,
    active BOOLEAN,
    PRIMARY KEY (channel, rid)
);
CREATE INDEX IF NOT EXISTS idx_resources_rid ON resources (rid);
CREATE INDEX IF NOT EXISTS idx_resources_active ON resources (active);
CREATE INDEX IF NOT EXISTS idx_resources_modifiedAt ON resources (modifiedAt);
CREATE TABLE IF NOT EXISTS segments (
    guid TEXT NOT NULL,
    rid TEXT,
    sid TEXT,
    nstr TEXT,
    notes TEXT,
    mf TEXT,
    plan TEXT,
    segProps TEXT,
    chars INTEGER,
    words INTEGER,
    createdAt TEXT,
    modifiedAt TEXT,
    PRIMARY KEY (guid)
);
`);
        db.function(
            'flattenNormalizedSourceToOrdinal',
            { deterministic: true },
            nstr => utils.flattenNormalizedSourceToOrdinal(JSON.parse(nstr))
        );
    }

    markResourcesAsInactive(channel) {
        let result;
        if (channel) {
            this.#stmt.markResourcesAsInactiveByChannel ??= this.#db.prepare(`UPDATE resources SET active = false WHERE channel = ? AND active = true;`);
            result = this.#stmt.markResourcesAsInactiveByChannel.run(channel);
        } else {
            this.#stmt.markAllResourcesAsInactive ??= this.#db.prepare(`UPDATE resources SET active = false WHERE active = true;`);
            result = this.#stmt.markAllResourcesAsInactive.run();
        }
        return result.changes;
    }

    saveResource(res) {
        // all fields are mutable, active is set to true automatically
        // createdAt is only written on insert
        // ignore modifiedAt changes if nothing changed
        this.#stmt.upsertResource ??= this.#db.prepare(/* sql */`
INSERT INTO resources (channel, rid, sourceLang, targetLangs, plan, prj, segments, subresources, resourceFormat, resProps, raw, createdAt, modifiedAt)
VALUES (@channel, @rid, @sourceLang, @targetLangs, @plan, @prj, @segments, @subresources, @resourceFormat, @resProps, @raw, @modifiedAt, @modifiedAt)
ON CONFLICT (channel, rid)
DO UPDATE SET
    channel = excluded.channel,
    rid = excluded.rid,
    sourceLang = excluded.sourceLang,
    targetLangs = excluded.targetLangs,
    plan = excluded.plan,
    prj = excluded.prj,
    segments = excluded.segments,
    subresources = excluded.subresources,
    resourceFormat = excluded.resourceFormat,
    resProps = excluded.resProps,
    raw = excluded.raw,
    modifiedAt = excluded.modifiedAt
WHERE excluded.sourceLang != resources.sourceLang OR excluded.targetLangs != resources.targetLangs OR excluded.plan != resources.plan
    OR excluded.prj != resources.prj OR excluded.segments != resources.segments OR excluded.subresources != resources.subresources
    OR excluded.resourceFormat != resources.resourceFormat OR excluded.resProps != resources.resProps OR excluded.raw != resources.raw
`);
        this.#stmt.markResourceAsActive ??= this.#db.prepare(/* sql */`UPDATE resources SET active = true WHERE channel = ? AND rid = ?;`);
        // only notes and mf are mutable
        // gstr is ignored as it's derived from nstr
        this.#stmt.upsertSegment ??= this.#db.prepare(/* sql */`
INSERT INTO segments (guid, rid, sid, nstr, notes, mf, plan, segProps, chars, words, createdAt, modifiedAt)
VALUES (@guid, @rid, @sid, @nstr, @notes, @mf, @plan, @segProps, @chars, @words, @modified, @modified)
ON CONFLICT (guid)
DO UPDATE SET
    notes = excluded.notes,
    mf = excluded.mf,
    plan = excluded.plan,
    segProps = excluded.segProps,
    chars = excluded.chars,
    words = excluded.words,
    modifiedAt = excluded.modifiedAt
WHERE
    excluded.notes != segments.notes OR excluded.mf != segments.mf OR excluded.plan != segments.plan
    OR excluded.segProps != segments.segProps OR excluded.chars != segments.chars OR excluded.words != segments.words
`);
        const save = this.#db.transaction((res) => {
            const { channel, id, sourceLang, targetLangs, plan, prj, segments, subresources, resourceFormat, raw, modified, ...resProps } = res;
            this.#stmt.upsertResource.run(sqlTransformer.encode({
                channel,
                rid: id,
                sourceLang,
                targetLangs,
                plan,
                prj,
                segments: segments.map(s => s.guid),
                subresources,
                resourceFormat,
                resProps,
                raw,
                modifiedAt: modified,
            }));
            this.#stmt.markResourceAsActive.run(channel, id);
            let changedSegments = 0;
            for (const segment of segments) {
                // eslint-disable-next-line no-unused-vars
                const { guid, sid, nstr, gstr, notes, mf, plan, ...segProps } = segment;
                const plainText = nstr.map(e => (typeof e === 'string' ? e : '')).join('');
                const segmentResult = this.#stmt.upsertSegment.run(sqlTransformer.encode({
                    guid, rid: id, sid, nstr, notes, mf, plan, segProps,
                    chars: plainText.length,
                    words: (plainText.match(spaceRegex)?.length || 0) + 1,
                    modified,
                }));
                changedSegments += segmentResult.changes;
            }
            return changedSegments;
        });
        return save(res);
    }

//     getTOC() {
//         this.#stmt.getTOC ??= this.#db.prepare(`
// SELECT
//     channel,
//     rid,
//     sourceLang,
//     targetLangs,
//     prj,
//     subresources,
//     resourceFormat,
//     resProps,
//     modifiedAt
// FROM resources
// WHERE active = true
// ORDER BY channel, rid;
// `);
//         return this.#stmt.getTOC.all().map(res => {
//             const { channel, rid, sourceLang, targetLangs, prj, subresources, resourceFormat, resProps, modifiedAt } = res;
//             const otherProps = resProps ? JSON.parse(resProps) : {};
//             return {
//                 channel,
//                 id: rid,
//                 sourceLang,
//                 targetLangs: targetLangs === null ? undefined : JSON.parse(targetLangs),
//                 prj: prj === null ? undefined : prj,
//                 subresources: subresources === null ? undefined : JSON.parse(subresources),
//                 resourceFormat,
//                 ...otherProps,
//                 modified: modifiedAt,
//             };
//         });
//     }

    #buildResource(resourceRow) {
        this.#stmt.getSegmentsFromArray ??= this.#db.prepare(/* sql */`
SELECT
    guid,
    sid,
    nstr,
    notes,
    mf,
    segProps
FROM JSON_EACH(?) INNER JOIN segments ON value = guid
ORDER BY key
;`);
        const { rid, segments, ...rawResource } = resourceRow;
        const expandedSegments = segments && this.#stmt.getSegmentsFromArray.all(segments).map(segment => {
            const decodedSeg = sqlTransformer.decode(segment);
            decodedSeg.rid = rid;
            decodedSeg.gstr = utils.flattenNormalizedSourceToOrdinal(decodedSeg.nstr);
            return decodedSeg;
         });
        const decodedRes = sqlTransformer.decode(rawResource);
        return { id: rid, segments: expandedSegments, ...decodedRes };
    }

    getResource(rid, options) {
        const headerOnly = Boolean(options?.headerOnly);
        const getResourceStmt = `getResource${headerOnly ? 'HeaderOnly' : ''}`;
        this.#stmt[getResourceStmt] ??= this.#db.prepare(/* sql */`
SELECT
    channel,
    rid,
    sourceLang,
    targetLangs,
    plan,
    prj,
    ${headerOnly ? 'segments,' : ''}
    ${headerOnly ? 'subresources,' : ''}
    resourceFormat,
    resProps,
    ${headerOnly ? 'raw,' : ''}
    modifiedAt
FROM resources WHERE active = true AND rid = ?;
`);

        const resourceRow = this.#stmt[getResourceStmt].get(rid);
        if (!resourceRow) {
            throw new Error(`Resource not found: ${rid}`);
        }
        return this.#buildResource(resourceRow);
    }

    *getAllResources(options) {
        const keepRaw = Boolean(options?.keepRaw);
        const getResourcesStmt = `getAllResources${keepRaw ? 'WithRaw' : ''}`;
        this.#stmt[getResourcesStmt] ??= this.#db.prepare(/* sql */`
SELECT
    channel,
    rid,
    sourceLang,
    targetLangs,
    plan,
    prj,
    segments,
    subresources,
    resourceFormat,
    resProps,
    ${keepRaw ? 'raw,' : ''}
    modifiedAt
FROM resources WHERE active = true ORDER BY channel, rid;
`);
        for (const resourceRow of this.#stmt[getResourcesStmt].iterate()) {
            yield this.#buildResource(resourceRow);
        }
    }

    searchString(str) {
        this.#stmt.createFlatSrcIdx ??= this.#db.prepare(/* sql */`CREATE INDEX IF NOT EXISTS idx_segments_flatSrc ON segments (flattenNormalizedSourceToOrdinal(nstr));`);
        this.#stmt.searchString ??= this.#db.prepare(/* sql */`SELECT guid, nstr FROM segments WHERE flattenNormalizedSourceToOrdinal(nstr) like '%?%';`);
        // try to delay creating the index until it is actually needed
        if (!this.#flatSrcIdxInitialized) {
            L10nContext.logger.verbose(`Creating FlatSrcIdx for source segments...`);
            this.#stmt.createFlatSrcIdx.run();
            this.#flatSrcIdxInitialized = true;
        }
        const flattenedString = utils.flattenNormalizedSourceToOrdinal(str);
        const tuRows = this.#stmt.searchString.all(flattenedString);
        return tuRows.map(sqlTransformer.decode);
    }

    getAvailableLangPairs() {
        this.#stmt.getAvailableLangPairs ??= this.#db.prepare(/* sql */`
SELECT sourceLang, value as targetLang
FROM resources, JSON_EACH(targetLangs)
WHERE active = true
GROUP BY 1, 2
ORDER BY 1, 2
;`);
        return this.#stmt.getAvailableLangPairs.raw().all();
    }

    getActiveContentStats(channelId) {
        this.#stmt.getActiveContentStats ??= this.#db.prepare(/* sql */`
SELECT
    prj,
    sourceLang,
    SUM(JSON_ARRAY_LENGTH(segments)) AS segmentCount,
    COUNT(*) AS resCount
FROM resources
WHERE channel = ? AND active = true
GROUP BY 1, 2
ORDER BY 3 DESC, 4 DESC;
`);
        return this.#stmt.getActiveContentStats.all(channelId);
    }

    getTargetedContentStats(channelId) {
        this.#stmt.getTargetedContentStats ??= this.#db.prepare(/* sql */`
SELECT
    prj,
    sourceLang,
    t.value targetLang,
    SUM(JSON_ARRAY_LENGTH(segments)) AS segmentCount,
    COUNT(*) AS resCount
FROM resources, JSON_EACH(targetLangs) t
WHERE channel = ? AND active = true
GROUP BY 1, 2, 3
ORDER BY 4 DESC, 5 DESC;
`);
        return this.#stmt.getTargetedContentStats.all(channelId);
    }
}
