import { utils } from '@l10nmonster/helpers';

export class Normalizer {
    #decoders;
    #textEncoders;
    #codeEncoders;

    constructor({ decoders, textEncoders, codeEncoders }) {
        this.#decoders = decoders;
        this.#textEncoders = textEncoders;
        this.#codeEncoders = codeEncoders;
    }

    decode(str, flags = {}) {
        return utils.getNormalizedString(str, this.#decoders, flags);
    }

    encodePart(part, flags) {
        const encoders = typeof part === 'string' ? this.#textEncoders : this.#codeEncoders;
        const str = typeof part === 'string' ? part : part.v;
        if (encoders) {
            return encoders.reduce((s, encoder) => encoder(s, flags), str);
        } else {
            return str;
        }
    }
}
