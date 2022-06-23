export const cleanupTU = (tu, whitelist) => Object.fromEntries(Object.entries(tu).filter(e => whitelist.includes(e[0])));

const coreTUprops = [
    'guid',
    'rid', // this is for adding context to translation (also in case of refresh job from TM)
    'sid', // we need sid in the target so that we can qualify repetitions
    'src', // TODO: deprecate src and always populate nsrc, this is only needed for debugging decoder bugs
    'nsrc', // we need this to support repetition leveraging (based on matching the source)
    'prj', // this is primarily for filtering
    'ts', // TODO: do we really need it in the source?
    'isSuffixPluralized', // TODO: change this from boolean to `pluralForm` enumeration (so it doesn't have to be a suffix)
];
export const sourceTUWhitelist = [
    ...coreTUprops,
    'contentType', // TODO: do we need this?
    'notes', // this is for bug fixes
];
export const targetTUWhitelist = [
    ...coreTUprops,
    'inflight',
    'q',
    'tgt',
    'ntgt',
    'cost',
    'jobGuid',
    'th', // this is used by TOS for a translation hash to detect bug fixes vendor-side
    'rev', // this is used by TOS to capture reviewed words and errors found
];
