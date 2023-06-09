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

export const sourceTUWhitelist = new Set([
    ...coreTUprops,
    'notes', // this is for bug fixes
]);

export const targetTUWhitelist = new Set([
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

// TODO: do we really need to refresh from source? when?
// export const refreshedFromSource = new Set([
//     'seq',
//     'prj',
//     'notes',
// ]);
