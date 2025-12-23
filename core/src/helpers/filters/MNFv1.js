/**
 * @typedef {import('../../interfaces.js').ResourceFilter} ResourceFilter
 * @typedef {import('../../interfaces.js').NormalizedString} NormalizedString
 * @typedef {import('../../interfaces.js').Part} Part
 * @typedef {import('../../interfaces.js').PlaceholderPart} PlaceholderPart
 * @typedef {import('../../interfaces.js').Segment} Segment
 * @typedef {import('../../interfaces.js').GenerateResourceParams} GenerateResourceParams
 */

/**
 * A generator-compatible filter that matches the L10n Monster Normalized Format v1.
 * @implements {ResourceFilter}
 */
export class MNFv1Filter {

    /** @type {{ decoders: Array<(nstr: NormalizedString) => Part[]>, codeEncoders: Array<(part: PlaceholderPart) => Part>, joiner: (parts: Part[]) => string }} */
    static normalizer = {
        decoders: [ nstr => JSON.parse(/** @type {PlaceholderPart} */ (nstr[0]).v) ],
        codeEncoders: [ part => part ],
        joiner: parts => JSON.stringify(parts),
    };

    /**
     * Parses a resource string into segments.
     * @param {{ resource: string }} params - Parse parameters.
     * @returns {Promise<{ segments: Segment[] }>} Parsed resource with segments.
     */
    async parseResource({ resource }) {
        const parsed = JSON.parse(resource);
        // If the input is { segments: [...] }, extract the segments array
        // If the input is [...], use it directly
        return { segments: Array.isArray(parsed) ? parsed : parsed.segments };
    }

    /**
     * Converts a normalized resource in the source language to raw in the target language.
     * @param {GenerateResourceParams} params - Generation parameters.
     * @returns {Promise<string>} Generated resource string.
     */
    async generateResource({ translator, segments, raw: _raw, ...resHandle }) {
        const translatedRawSegments = [];
        for (const seg of segments) {
            const translatedData = await translator(seg);
            if (translatedData) {
                // eslint-disable-next-line no-unused-vars
                const { nstr, ...rawSegment } = seg;
                translatedRawSegments.push({
                    ...rawSegment,
                    str: translatedData.str,
                });
            }
        }
        return JSON.stringify({ ...resHandle, segments: translatedRawSegments }, null, '\t');
    }
}
