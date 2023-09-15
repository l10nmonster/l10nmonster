// A generator-compatible filter that matches the L10n Monster Normalized Format v1

export class MNFv1 {
    static normalizer = {
        decoders: [ nstr => JSON.parse(nstr[0].v) ],
        codeEncoders: [ part => part ],
        joiner: parts => JSON.stringify(parts),
    };

    async parseResource({ resource }) {
        return JSON.parse(resource);
    }

    // convert a normalized resource in the source language and make it raw in the target language
    // eslint-disable-next-line no-unused-vars
    async generateResource({ translations, segments, raw, ...resHandle }) {
        const translatedRawSegments = [];
        segments.forEach(seg => {
            const translatedStr = translations[seg.guid];
            // eslint-disable-next-line no-unused-vars
            const { nstr, gstr, ...rawSegment } = seg;
            translatedStr && translatedRawSegments.push({
                ...rawSegment,
                ...translatedStr,
            });
        });
        return JSON.stringify({ ...resHandle, segments: translatedRawSegments }, null, '\t');
    }
}
