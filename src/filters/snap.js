// A filter compatible with the format produced by FsSnapStore
export class SnapFilter {
    async parseResource({ resource }) {
        return JSON.parse(resource);
    }

    async translateResource({ resource, translator }) {
        const { id, segments } = JSON.parse(resource);
        const translatedSegments = [];
        for (const seg of segments) {
            const translation = await translator(seg.sid, seg.str);
            translation !== undefined && translatedSegments.push({ ...seg, str: translation});
        }
        return JSON.stringify({ id, segments: translatedSegments }, null, '\t');
    }
}
