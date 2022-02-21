import i18nStringsFiles from 'i18n-strings-files';

export class IosStringsFilter {
    async parseResource({ resource }) {
        const parsedResource = i18nStringsFiles.parse(resource, { 'wantsComments' : true });
        const segments = Object.entries(parsedResource).map(([k, v]) => ({
            sid: k,
            str: v.text,
            notes: v.comment,
        }));
        return {
            segments,
        };
    }

    async generateTranslatedResource({ resource, translator }) {
        const parsedResource = i18nStringsFiles.parse(resource, { 'wantsComments' : true });
        for (const [sid, source] of Object.entries(parsedResource)) {
            const translation = await translator(sid, source.text);
            if (translation === undefined) {
                delete parsedResource[sid];
            } else {
                parsedResource[sid].text = translation;
            }
        }
        return Object.keys(parsedResource) > 0 ?
            i18nStringsFiles.compile(parsedResource, { 'wantsComments' : false }) :
            null;
    }
}
