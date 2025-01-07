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

export class TU {
    constructor(entry, isSource, isTarget) {
        // { guid, rid, sid, nsrc, inflight, q, ntgt, ts, ...otherProps }
        if (isSource && (!entry.guid || !entry.rid || !entry.sid || !Array.isArray(entry.nsrc))) {
            throw `Source TU must have guid, rid, sid, nsrc: ${JSON.stringify(entry)}`;
        }
        if (isTarget && (!entry.guid || !Number.isInteger(entry.q) || (!Array.isArray(entry.ntgt) && !entry.inflight) || !Number.isInteger(entry.ts))) {
            throw `Target TU must have guid, ntgt/inflight, q, ts: ${JSON.stringify(entry)}`;
        }
        // const spuriousProps = [];
        // eslint-disable-next-line no-nested-ternary
        const whitelist = isSource ? (isTarget ? pairTUWhitelist : sourceTUWhitelist) : targetTUWhitelist;
        for (const [ k, v ] of Object.entries(entry)) {
            if (whitelist.has(k)) {
                this[k] = v;
            // } else {
            //     spuriousProps.push(k);
            }
        }
        // spuriousProps.length > 0 && L10nContext.logger.verbose(`Spurious properties in tu ${entry.guid}: ${spuriousProps.join(', ')}`);

    }

    // returns a TU with only the source string and target missing
    static asSource(obj) {
        return new TU(cleanupTU(obj), true, false);
    }

    // returns a TU with both source and target string
    static asTarget(obj) {
        return new TU(cleanupTU(obj), false, true);
    }

    // returns a TU with both source and target string
    static asPair(obj) {
        return new TU(cleanupTU(obj), true, true);
    }

    // converts a segments into a source TU
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
}
