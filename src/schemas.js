export const cleanupTU = (tu, whitelist) => Object.fromEntries(Object.entries(tu).filter(e => whitelist.includes(e[0])));

const coreTUprops = [
    'guid',
    'sid', // we need sid in the target so that we can qualify repetitions
    'src', // TODO: deprecate src and always populate nsrc, this is only needed for debugging decoder bugs
    'nsrc', // we need this to support repetition leveraging (based on matching the source)
    'ts', // TODO: do we really need in the source?
    'isSuffixPluralized', // TODO: change this from boolean to `pluralForm` enumeration (so it doesn't have to be a suffix)
];
export const sourceTUWhitelist = [
    ...coreTUprops,
    'rid', // this is for adding context to translation
    'contentType', // TODO: do we need this?
    'prj', // this is primarily for filtering
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
];
