import { utils, normalizers } from '../helpers/index.js';

/**
 * @class Normalizer
 * @classdesc Represents a normalizer that decodes strings into a normalized format
 * and encodes parts of a normalized string back into a string.
 * It uses a set of decoders for decoding and text/code encoders for encoding.
 */
export class Normalizer {
    #decoders;
    #textEncoders;
    #codeEncoders;

    constructor({ decoders, textEncoders, codeEncoders, joiner }) {
        this.#decoders = decoders;
        this.#textEncoders = textEncoders;
        this.#codeEncoders = codeEncoders ?? [ normalizers.defaultCodeEncoder ];
        this.join = joiner ?? (parts => parts.join(''));
    }

    decode(str, flags = {}) {
        return utils.getNormalizedString(str, this.#decoders, flags);
    }

    encodePart(part, flags) {
        const encoders = typeof part === 'string' ? this.#textEncoders : this.#codeEncoders;
        if (encoders) {
            return encoders.reduce((s, encoder) => encoder(s, flags), part);
        } else {
            return part;
        }
    }
}
