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

    async generateTranslatedResource({ resourceId, resource, translator }) {
        const parsedResource = i18nStringsFiles.parse(resource, { 'wantsComments' : true });
        for (const [sid, source] of Object.entries(parsedResource)) {
            parsedResource[sid].text = await translator(resourceId, sid, source.text);
        }
        return i18nStringsFiles.compile(parsedResource, { 'wantsComments' : true });
    }
}
