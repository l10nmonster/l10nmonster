import { utils } from '@l10nmonster/core';

const sourceTUWhitelist = new Set([
    // mandatory
    'guid',
    'rid', // this is for adding context to translation (also in case of refresh job from TM)
    'sid', // we need sid in the target so that we can qualify repetitions
    'nsrc', // we need this to support repetition leveraging (based on matching the source)
    // optional
    'prj', // this is primarily for filtering
    'notes', // this is for bug fixes
    'isSuffixPluralized', // TODO: change this from boolean to `pluralForm` enumeration (so it doesn't have to be a suffix)
    'nid', // opaque native id of the segment (in the original storage format)
    'seq', // sequence number to shorten guid
    'jobProps', // this is for job specific properties
]);

const targetTUWhitelist = new Set([
    // mandatory
    'guid',
    'ntgt',
    'inflight',
    'q',
    'ts', // timestamp. used to pick a winner among candidate TUs
    // optional
    'cost',
    'jobGuid',
    'translationProvider',
    'th', // this is used by TOS for a translation hash to detect bug fixes vendor-side
    'rev', // this is used by TOS to capture reviewed words and errors found
]);

const pairTUWhitelist = new Set([ ...sourceTUWhitelist, ...targetTUWhitelist ]);

// TODO: do we really need to refresh these properties from source? when?
// export const refreshedFromSource = new Set([
//     'seq',
//     'prj',
//     'notes',
// ]);

function nstrHasV1Missing(nstr) {
    for (const part of nstr) {
        if (typeof part === 'object' && !part.v1) {
            return true;
        }
    }
    return false;
}

// takes a tu-like object and creates a new object only with properties listed in the whitelist object
function cleanupTU(entry) {
    const { src, tgt, ...cleanTU } = entry;

    // be backwards compatible with legacy jobs that may contain src and tgt only
    cleanTU.nsrc === undefined && src !== undefined && (cleanTU.nsrc = [ src ]);
    cleanTU.ntgt === undefined && tgt !== undefined && (cleanTU.ntgt = [ tgt ]);

    // if we have the normalized source, and the target doesn't have v1 placeholders, we can try to build them
    // TODO: remove (for performance reasons) when v1 are strongly enforced
    if (cleanTU.nsrc && cleanTU.ntgt && nstrHasV1Missing(cleanTU.ntgt)) {
        const lookup = {};
        const sourcePhMap = utils.flattenNormalizedSourceV1(cleanTU.nsrc)[1];
        Object.values(sourcePhMap).forEach(part => (lookup[part.v] ??= []).push(part.v1));
        for (const part of cleanTU.ntgt) {
            if (typeof part === 'object') {
                // any kind of mismatch should be fatal because src/tgt should be in sync
                part.v1 = lookup[part.v].shift(); // there's no guarantee we pick the right one, so we go FIFO
            }
        }
    }
    // cleanTU.ts ??= new Date().getTime(); // TODO: is this a good thing?
    return cleanTU;
}

/**
 * Represents a Translation Unit (TU).
 */
export class TU {
    rid;
    sid;
    nsrc;
    guid;
    inflight;
    ntgt;
    ts;
    q;

    /**
     * @property {string} rid - Resource ID the TU belongs to.
     * @property {string} sid - Segment ID the TU belongs to.
     * @property {string[]} nsrc - Normalized source strings for the TU.
     * @property {string} guid - Unique identifier for the TU.
     * @property {boolean} inflight - Indicates if the TU is in-flight (submitted and pending translation).
     * @property {string[]} ntgt - Normalized target strings for the TU.
     * @property {number} ts - Timestamp for the TU.
     * @property {number} q - Quality score for the TU.
     *
     * @param {Object} entry - A TU-like objecty with properties like guid, rid, sid, nsrc, etc.
     * @param {boolean} isSource - Indicates if the TU is a source.
     * @param {boolean} isTarget - Indicates if the TU is a target.
     * @throws Will throw an error if the required properties are missing based on the TU type.
     */
    constructor(entry, isSource, isTarget) {
        if (isSource && (!entry.guid || !entry.rid || !entry.sid || !Array.isArray(entry.nsrc))) {
            throw `Source TU must have guid, rid, sid, nsrc: ${JSON.stringify(entry)}`;
        }
        if (isTarget && (!entry.guid || !Number.isInteger(entry.q) || (!Array.isArray(entry.ntgt) && !entry.inflight) || !Number.isInteger(entry.ts))) {
            throw `Target TU must have guid, ntgt/inflight, q, ts: ${JSON.stringify(entry)}`;
        }
        // eslint-disable-next-line no-nested-ternary
        const whitelist = isSource ? (isTarget ? pairTUWhitelist : sourceTUWhitelist) : targetTUWhitelist;
        for (const [k, v] of Object.entries(entry)) {
            if (whitelist.has(k)) {
                this[k] = v;
            }
        }
    }

    /**
     * Creates a TU instance with only the source string.
     * @param {Object} obj - The object to convert to a source TU.
     * @returns {TU} The created source TU.
     */
    static asSource(obj) {
        return new TU(cleanupTU(obj), true, false);
    }

    /**
     * Creates a TU instance with both source and target strings.
     * @param {Object} obj - The object to convert to a target TU.
     * @returns {TU} The created target TU.
     */
    static asTarget(obj) {
        return new TU(cleanupTU(obj), false, true);
    }

    /**
     * Creates a TU instance with both source and target strings.
     * @param {Object} obj - The object to convert to a pair TU.
     * @returns {TU} The created pair TU.
     */
    static asPair(obj) {
        return new TU(cleanupTU(obj), true, true);
    }

    /**
     * Converts a segment into a source TU.
     * @param {Object} res - The resource object containing the segment.
     * @param {Object} segment - The segment to convert.
     * @returns {TU} The created source TU.
     */
    static fromSegment(res, segment) {
        const { nstr, ...seg } = segment;
        const tu = {
            ...seg,
            nsrc: nstr,
            rid: res.id,
        };
        if (res.prj !== undefined) {
            tu.prj = res.prj;
        }
        return TU.asSource(tu);
    }

    static fromRequestResponse(req = {}, res = {}, additionalProps = {}) {
        const coalescedEntry = Object.fromEntries(Object.keys({...req, ...res}).map(k => [k, res[k] === undefined ? req[k] : res[k]]));
        return new TU(cleanupTU({ ...additionalProps, ...coalescedEntry }), true, true);
    }
}
