// Note: in general, decoders are more complicated than encoders because there are usually multiple ways
//   to specify the same thing in input, but we choose a single way to produce in output (e.g. CDATA vs. escapes)
//   Don't be surprised if you see we don't express the full semantics of the source, because our goals here
//   is to protect placeholders getting corrupted, so we may have to merge different rule sets together
//   (e.g. MessageFormat variables and HTML markup). There are also edge cases like a Java service returning
//   an Android message format string, where we may need to overlay both Java and Android rules together.

/**
 * @typedef {import('../../index.js').Part} Part
 * @typedef {import('../../index.js').PlaceholderPart} PlaceholderPart
 * @typedef {import('../../index.js').DecoderFunction} DecoderFunction
 * @typedef {import('../../index.js').TextEncoderFunction} TextEncoderFunction
 * @typedef {import('../../index.js').EncodeFlags} EncodeFlags
 */

/**
 * Creates a decoder function based on a regex pattern.
 * @param {string} flag - Name/flag for the decoder.
 * @param {RegExp} regex - Regex pattern to match (must have named groups).
 * @param {(groups: Record<string, string>) => string | PlaceholderPart | Part[]} partDecoder - Function to decode matched groups.
 * @returns {DecoderFunction} A decoder function.
 */
export const decoderMaker = function regexDecoderMaker(flag, regex, partDecoder) {
    const fn = function decoder(parts) {
        const decodedParts = parts.map(p => {
            if (p.t === 's' || typeof p === 'string') {
                const textValue = typeof p === 'string' ? p : p.v;
                const expandedPart = [];
                let pos = 0;
                for (const match of textValue.matchAll(regex)) {
                    if (match.index > pos) {
                        expandedPart.push({
                            t: 's',
                            v: match.input.substring(pos, match.index),
                        });
                    }
                    const decodedMatch = partDecoder(match.groups);
                    if (typeof decodedMatch === 'string') {
                        expandedPart.push({
                            t: 's',
                            v: decodedMatch,
                            flag,
                        });
                    } else if (Array.isArray(decodedMatch)) {
                        expandedPart.push(...decodedMatch);
                    } else {
                        expandedPart.push(decodedMatch);
                    }
                    pos = match.index + match[0].length;
                }
                if (pos < textValue.length) {
                    expandedPart.push({
                        t: 's',
                        v: textValue.substring(pos, textValue.length),
                    });
                }
                return expandedPart;
            } else {
                return p;
            }
        });
        return decodedParts.flat(1);
    };
    Object.defineProperty(fn, 'name', { value: flag });
    return fn;
}

/**
 * Creates an encoder function based on a regex pattern and mapping.
 * @param {string} name - Name for the encoder.
 * @param {RegExp} regex - Regex pattern to match.
 * @param {Record<string, string> | ((match: string, flags: EncodeFlags, ...captures: string[]) => string)} matchMap - Mapping table or function.
 * @returns {TextEncoderFunction} An encoder function.
 */
export const encoderMaker = function regexEncoderMaker(name, regex, matchMap) {
    const fn = function encoder(str, flags = {}) {
        str = typeof str === 'string' ? str : str.v;
        return str.replaceAll(regex, (match, ...capture) => {
            const matchToReplace = capture.reduce((p,c) => p ?? c);
            return typeof matchMap === 'function' ? matchMap(match, flags, ...capture) : match.replace(matchToReplace, matchMap[matchToReplace]);
        });
    };
    Object.defineProperty(fn, 'name', { value: name });
    return fn;
}
