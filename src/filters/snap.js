// A generator-compatible filter producing translated snaps similar to the format produced by FsSnapStore
export class SnapFilter {
    async parseResource({ resource }) {
        return JSON.parse(resource);
    }

    // takes a raw resource
    async translateResource({ resource, translator }) {
        return this.generateResource({ resource: JSON.parse(resource), translator })
    }

    // takes a normalized resource
    async generateResource({ resource, translator }) {
        const { id, segments } = resource;
        const translatedSegments = [];
        for (const seg of segments) {
            const translation = await translator(seg.sid, seg.str);
            translation !== undefined && translatedSegments.push({ ...seg, str: translation});
        }
        return JSON.stringify({ id, segments: translatedSegments }, null, '\t');
    }
}
