import { utils, normalizers } from '../helpers/index.js';

/**
 * @typedef {import('../../index.js').NormalizedString} NormalizedString
 * @typedef {import('../../index.js').Part} Part
 * @typedef {import('../../index.js').PlaceholderPart} PlaceholderPart
 * @typedef {import('../../index.js').EncodeFlags} EncodeFlags
 * @typedef {import('../../index.js').DecoderFunction} DecoderFunction
 * @typedef {import('../../index.js').TextEncoderFunction} TextEncoderFunction
 * @typedef {import('../../index.js').CodeEncoderFunction} CodeEncoderFunction
 */

/**
 * Joiner function signature - joins encoded parts into final output.
 * @callback Joiner
 * @param {string[]} parts - Array of encoded string parts.
 * @returns {string} The joined final string.
 */

/**
 * Normalizer constructor options.
 * @typedef {Object} NormalizerConstructorOptions
 * @property {DecoderFunction[]} decoders - Array of decoder functions for parsing strings.
 * @property {TextEncoderFunction[]} [textEncoders] - Array of encoder functions for text parts.
 * @property {CodeEncoderFunction[]} [codeEncoders] - Array of encoder functions for placeholder parts.
 * @property {Joiner} [joiner] - Function to join encoded parts (defaults to simple concatenation).
 */

/**
 * Represents a normalizer that decodes strings into a normalized format
 * and encodes parts of a normalized string back into a string.
 * It uses a set of decoders for decoding and text/code encoders for encoding.
 */
export class Normalizer {

    /** @type {DecoderFunction[]} */
    #decoders;

    /** @type {TextEncoderFunction[]} */
    #textEncoders;

    /** @type {CodeEncoderFunction[]} */
    #codeEncoders;

    /**
     * Creates a new Normalizer instance.
     * @param {NormalizerConstructorOptions} options - Constructor options.
     */
    constructor({ decoders, textEncoders, codeEncoders, joiner }) {
        this.#decoders = decoders;
        this.#textEncoders = textEncoders ?? [ normalizers.defaultTextEncoder ];
        this.#codeEncoders = codeEncoders ?? [ normalizers.defaultCodeEncoder ];
        this.join = joiner ?? (parts => parts.join(''));
    }

    /**
     * Decodes a raw string into a normalized string (array of parts).
     * @param {string} str - The raw string to decode.
     * @param {EncodeFlags} [flags] - Optional flags passed to decoders.
     * @returns {NormalizedString} Array of parts (text strings and placeholder objects).
     */
    decode(str, flags = {}) {
        return utils.getNormalizedString(str, this.#decoders, flags);
    }

    /**
     * Encodes a text part for output.
     * @param {string} text - The text to encode.
     * @param {EncodeFlags} [flags] - Encoding context flags.
     * @returns {string} The encoded string representation.
     */
    encodeText(text, flags) {
        return this.#textEncoders.reduce((s, encoder) => encoder(s, flags), text);
    }

    /**
     * Encodes a placeholder part for output.
     * @param {PlaceholderPart} part - The placeholder part to encode.
     * @param {EncodeFlags} [flags] - Encoding context flags.
     * @returns {string} The encoded string representation.
     */
    encodeCode(part, flags) {
        // First encoder transforms PlaceholderPart to string, subsequent encoders transform string to string
        const [firstEncoder, ...restEncoders] = this.#codeEncoders;
        const initial = firstEncoder(part, flags);
        return restEncoders.reduce((s, encoder) => encoder(s, flags), initial);
    }

    /**
     * Encodes a single part (text or placeholder) for output.
     * @param {Part} part - The part to encode.
     * @param {EncodeFlags} [flags] - Encoding context flags.
     * @returns {string} The encoded string representation.
     */
    encodePart(part, flags) {
        if (typeof part === 'string') {
            return this.encodeText(part, flags);
        } else {
            return this.encodeCode(part, flags);
        }
    }
}
