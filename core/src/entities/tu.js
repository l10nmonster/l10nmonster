import { utils } from '@l10nmonster/helpers';

const coreTUprops = [
    'guid',
    'nid', // optional opaque native id of the segment (in the original storage format)
    'seq', // optional sequence number to shorten guid
    'rid', // this is for adding context to translation (also in case of refresh job from TM)
    'sid', // we need sid in the target so that we can qualify repetitions
    'nsrc', // we need this to support repetition leveraging (based on matching the source)
    'prj', // this is primarily for filtering
    'isSuffixPluralized', // TODO: change this from boolean to `pluralForm` enumeration (so it doesn't have to be a suffix)
];

const sourceTUWhitelist = new Set([
    ...coreTUprops,
    'notes', // this is for bug fixes
]);

const targetTUWhitelist = new Set([
    ...coreTUprops,
    'inflight',
    'q',
    'ntgt',
    'cost',
    'jobGuid',
    'translationProvider',
    'ts', // timestamp. used to pick a winner among candidate TUs
    'th', // this is used by TOS for a translation hash to detect bug fixes vendor-side
    'rev', // this is used by TOS to capture reviewed words and errors found
]);

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
    constructor(entry, isPartial) {
        // { guid, rid, sid, nsrc, inflight, q, ntgt, ts, ...otherProps }
        if (!entry.guid || !entry.rid || !entry.sid || !Array.isArray(entry.nsrc) || !Number.isInteger(entry.ts)) {
            throw `Rejecting TU with missing mandatory fields: ${JSON.stringify(entry)}`;
        }
        if (!isPartial && (!Number.isInteger(entry.q) || (!Array.isArray(entry.ntgt) && !entry.inflight))) {
            throw `Rejecting complete TU with missing mandatory fields: ${JSON.stringify(entry)}`;
        }
        // const spuriousProps = [];
        const whitelist = isPartial ? sourceTUWhitelist : targetTUWhitelist;
        for (const [ k, v ] of Object.entries(entry)) {
            if (whitelist.has(k)) {
                this[k] = v;
            // } else {
            //     spuriousProps.push(k);
            }
        }
        // spuriousProps.length > 0 && l10nmonster.logger.verbose(`Spurious properties in tu ${entry.guid}: ${spuriousProps.join(', ')}`);

    }

    // returns a TU with only the source string and target missing
    static asSource(obj) {
        return new TU(cleanupTU(obj), true);
    }

    // converts a segments into a source TU
    static fromSegment(res, seg) {
        return TU.asSource(utils.makeTU(res, seg));
    }

    // returns a TU with both source and target string
    static asPair(obj) {
        return new TU(cleanupTU(obj), false);
    }
}
