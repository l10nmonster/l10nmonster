import i18nStringsFiles from 'i18n-strings-files';

export class IosStringsFilter {
    constructor(params) {
        this.emitComments = params?.emitComments || false;
    }

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

    async translateResource({ resource, translator }) {
        const parsedResource = i18nStringsFiles.parse(resource, { 'wantsComments' : true });
        for (const [sid, source] of Object.entries(parsedResource)) {
            const translation = await translator(sid, source.text);
            if (translation === undefined) {
                delete parsedResource[sid];
            } else {
                parsedResource[sid].text = translation;
                !this.emitComments && parsedResource[sid].comment && delete parsedResource[sid].comment;
            }
        }
        return Object.keys(parsedResource).length > 0 ?
            i18nStringsFiles.compile(parsedResource, { 'wantsComments' : this.emitComments }) :
            null;
    }
}
