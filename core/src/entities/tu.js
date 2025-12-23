import * as utils from '../helpers/utils.js';

const sourceTUWhitelist = new Set([
    // mandatory
    'guid',
    'rid', // this is for adding context to translation (also in case of refresh job from TM)
    'sid', // we need sid in the target so that we can qualify repetitions
    'nsrc', // we need this to support repetition leveraging (based on matching the source)
    // optional
    'prj', // this is primarily for filtering
    'notes', // this is for bug fixes
    'pluralForm', // if it is a pluralized string, this is the form of the plural (one, other, zero, two, few, many)
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
    'tconf',
    'tnotes',
    'qa',
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
 * @typedef {import('../../index.js').NormalizedString} NormalizedString
 * @typedef {import('../../index.js').StructuredNotes} StructuredNotes
 * @typedef {import('../../index.js').JobProps} JobProps
 */

/**
 * Represents a Translation Unit (TU).
 */
export class TU {

    /** @type {string} Resource ID the TU belongs to. */
    rid;

    /** @type {string} Segment ID the TU belongs to. */
    sid;

    /** @type {NormalizedString | undefined} Normalized source string for the TU. */
    nsrc;

    /** @type {string} Unique identifier for the TU. */
    guid;

    /** @type {boolean | undefined} Indicates if the TU is in-flight (submitted and pending translation). */
    inflight;

    /** @type {NormalizedString | undefined} Normalized target string for the TU. */
    ntgt;

    /** @type {number | undefined} Timestamp for the TU. */
    ts;

    /** @type {number | undefined} Quality score for the TU. */
    q;

    /** @type {string | StructuredNotes | undefined} Structured notes for translators. */
    notes;

    /** @type {string | undefined} Project name for filtering. */
    prj;

    /** @type {string | undefined} Plural form (one, other, zero, two, few, many). */
    pluralForm;

    /** @type {string | undefined} Opaque native ID in original storage format. */
    nid;

    /** @type {number | undefined} Sequence number to shorten GUID. */
    seq;

    /** @type {JobProps | undefined} Job-specific properties. */
    jobProps;

    /** @type {number | number[] | undefined} Translation cost (number or array for detailed token breakdown). */
    cost;

    /** @type {string | undefined} Job GUID this TU was translated in. */
    jobGuid;

    /** @type {string | undefined} ID of the translation provider. */
    translationProvider;

    /** @type {number | undefined} Translation confidence score. */
    tconf;

    /** @type {string | undefined} Translation notes. */
    tnotes;

    /** @type {object | undefined} QA data. */
    qa;

    /** @type {string | undefined} Translation hash for detecting vendor-side fixes. */
    th;

    /** @type {{ reviewedWords?: number, errorsFound?: number } | undefined} Review data (reviewed words and errors found). */
    rev;

    /**
     * Creates a new TU instance.
     * @param {Partial<TU>} entry - A TU-like object with properties like guid, rid, sid, nsrc, etc.
     * @param {boolean} isSource - Indicates if the TU is a source.
     * @param {boolean} isTarget - Indicates if the TU is a target.
     * @throws Will throw an error if the required properties are missing based on the TU type.
     */
    constructor(entry, isSource, isTarget) {
        if (isSource && (!entry.guid || !entry.rid || !entry.sid || !Array.isArray(entry.nsrc))) {
            throw new Error(`Source TU must have guid, rid, sid, nsrc: ${JSON.stringify(entry)}`);
        }
        if (isTarget && (!entry.guid || !Number.isInteger(entry.q) || (!Array.isArray(entry.ntgt) && !entry.inflight) || !Number.isInteger(entry.ts))) {
            throw new Error(`Target TU must have guid, ntgt/inflight, q, ts: ${JSON.stringify(entry)}`);
        }
        const whitelist = isSource ? (isTarget ? pairTUWhitelist : sourceTUWhitelist) : targetTUWhitelist;
        for (const [k, v] of Object.entries(entry)) {
            if (whitelist.has(k)) {
                this[k] = v;
            }
        }
    }

    /**
     * Creates a TU instance with only the source string.
     * @param {Partial<TU>} obj - The object to convert to a source TU.
     * @returns {TU} The created source TU.
     */
    static asSource(obj) {
        return new TU(cleanupTU(obj), true, false);
    }

    /**
     * Creates a TU instance with both source and target strings.
     * @param {Partial<TU>} obj - The object to convert to a target TU.
     * @returns {TU} The created target TU.
     */
    static asTarget(obj) {
        return new TU(cleanupTU(obj), false, true);
    }

    /**
     * Creates a TU instance with both source and target strings.
     * @param {Partial<TU>} obj - The object to convert to a pair TU.
     * @returns {TU} The created pair TU.
     */
    static asPair(obj) {
        return new TU(cleanupTU(obj), true, true);
    }

    /**
     * Converts a segment into a source TU.
     * @param {{ id: string, prj?: string }} res - The resource object containing the segment.
     * @param {import('../../index.js').NormalizedSegment} segment - The segment to convert.
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

    /**
     * Creates a pair TU from request and response objects.
     * @param {Partial<TU>} [req] - The request TU object.
     * @param {Partial<TU>} [res] - The response TU object.
     * @param {Partial<TU>} [additionalProps] - Additional properties to merge.
     * @returns {TU} The created pair TU.
     */
    static fromRequestResponse(req = {}, res = {}, additionalProps = {}) {
        const coalescedEntry = Object.fromEntries(Object.keys({...req, ...res}).map(k => [k, res[k] === undefined ? req[k] : res[k]]));
        return new TU(cleanupTU({ ...additionalProps, ...coalescedEntry }), true, true);
    }
}
