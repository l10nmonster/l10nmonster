import { decoderMaker, encoderMaker } from './regex.js';

/**
 * @typedef {import('../../index.js').Part} Part
 * @typedef {import('../../index.js').DecoderFunction} DecoderFunction
 * @typedef {import('../../index.js').EncodeFlags} EncodeFlags
 */

// Decoders

/**
 * Creates a renamed decoder wrapper.
 * @param {string} name - The new name for the decoder.
 * @param {DecoderFunction} decoder - The decoder function to wrap.
 * @returns {DecoderFunction} A decoder with the new name.
 */
export function namedDecoder(name, decoder) {
    const fn = function namedDecoder(parts) {
        return decoder(parts).map(p => (typeof p !== 'string' && p.flag === decoder.name ? { ...p, flag: name } : p));
    }
    Object.defineProperty(fn, 'name', { value: name });
    return fn;
}

export const doublePercentDecoder = decoderMaker(
    'doublePercentDecoder',
    /(?<percent>%%)/g,
    () => '%'
);

// Encoders

/**
 * Creates a flag-gated encoder that only runs when specified flags are set.
 * @param {import('../../index.js').TextEncoderFunction} encoder - The encoder function.
 * @param {...string} flagNames - Flag names to check (prefix with ! to negate).
 * @returns {import('../../index.js').TextEncoderFunction} A gated encoder function.
 */
export function gatedEncoder(encoder, ...flagNames) {
    const fn = function gatedEncoder(str, flags = {}) {
        const run = flagNames.reduce((run, flag) => run || (flag.charAt(0) === '!' ? !flags[flag.substring(1)] : flags[flag]), false);
        return run ? encoder(str, flags) : (typeof str === 'string' ? str : str.v);
    };
    Object.defineProperty(fn, 'name', { value: `gatedEncoder_${flagNames.join('_')}` });
    return fn;
}

export const doublePercentEncoder = encoderMaker('doublePercentEncoder', /(?<pct>%)/g, { "%": "%%" });

// Placeholders

// {param} style placeholders
export const bracePHDecoder = decoderMaker(
    'bracePHDecoder',
    /(?<x>{[^}]+})/g,
    (groups) => ({ t: 'x', v: groups.x })
);

/**
 * Creates a decoder/encoder pair for keyword translation.
 * @param {string} name - Name for the decoder/encoder.
 * @param {Record<string, string | Record<string, string>>} keywordToTranslationMap - Map of keywords to translations.
 * @returns {[DecoderFunction, import('../../index.js').TextEncoderFunction]} A decoder and encoder pair.
 */
export function keywordTranslatorMaker(name, keywordToTranslationMap) {
    if (keywordToTranslationMap && Object.keys(keywordToTranslationMap).length > 0) {
        const decoder = decoderMaker(
            name,
            new RegExp(`(?<kw>${Object.keys(keywordToTranslationMap).join("|")})`, 'g'),
            (groups) => ({ t: 'x', v: `${name}:${groups.kw}`, s: groups.kw })
        );
        const encoder = encoderMaker(
            name,
            new RegExp(`^(?:${name}:(?<kw>.+))$`, 'g'),
            (match, flags, kw) => {
                const tx = keywordToTranslationMap[kw];
                return tx && typeof tx === 'object' ? tx[flags.targetLang] ?? tx[flags.prj] ?? kw : kw;
            }
        );
        return [ decoder, encoder ];
    } else {
        throw new Error('You have to specify a keyword map to keywordTranslatorMaker');
    }
}

/**
 * Default code encoder - returns the placeholder's value or passes through string.
 * @param {import('../../index.js').PlaceholderPart | string} part - The placeholder part or string.
 * @returns {string} The placeholder value or the string.
 */
export function defaultCodeEncoder(part) {
    return typeof part === 'string' ? part : part.v;
}

/**
 * Default text encoder - returns the text unchanged (identity function).
 * @param {string} text - The text to encode.
 * @returns {string} The same text.
 */
export function defaultTextEncoder(text) {
    return text;
}
