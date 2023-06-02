const regex = require('./regex');

// Decoders

// Generic wrapper to rename a decoder
exports.namedDecoder = function named(name, decoder) {
    const fn = function namedDecoder(parts) {
        return decoder(parts).map(p => (p.flag === decoder.name ? { ...p, flag: name } : p));
    }
    Object.defineProperty(fn, 'name', { value: name });
    return fn;
}

exports.doublePercentDecoder = regex.decoderMaker(
    'doublePercentDecoder',
    /(?<percent>%%)/g,
    () => '%'
);

// Encoders

// Generic flag-based encoder execution
exports.gatedEncoder = function gated(encoder, ...flagNames) {
    const fn = function gatedEncoder(str, flags = {}) {
        const run = flagNames.reduce((run, flag) => run || (flag.charAt(0) === '!' ? !flags[flag.substring(1)] : flags[flag]), false);
        return run ? encoder(str, flags) : str;
    };
    Object.defineProperty(fn, 'name', { value: `gatedEncoder_${flagNames.join('_')}` });
    return fn;
}

exports.doublePercentEncoder = (str) => str.replaceAll('%', '%%');

// Placeholders

// {param} style placeholders
exports.bracePHDecoder = regex.decoderMaker(
    'bracePHDecoder',
    /(?<x>{[^}]+})/g,
    (groups) => ({ t: 'x', v: groups.x })
);

exports.keywordTranslatorMaker = function keywordTranslatorMaker(name, keywordToTranslationMap) {
    if (keywordToTranslationMap && Object.keys(keywordToTranslationMap).length > 0) {
        const decoder = regex.decoderMaker(
            name,
            new RegExp(`(?<kw>${Object.keys(keywordToTranslationMap).join("|")})`, 'g'),
            (groups) => ({ t: 'x', v: `${name}:${groups.kw}`, s: groups.kw })
        );
        const encoder = regex.encoderMaker(
            name,
            new RegExp(`^(?:${name}:(?<kw>.+))$`, 'g'),
            (match, flags, kw) => {
                const tx = keywordToTranslationMap[kw];
                return tx && typeof tx === 'object' ? tx[flags.targetLang] ?? tx[flags.prj] ?? kw : kw;
            }
        );
        return [ decoder, encoder ];
    } else {
        throw 'You have to specify a keyword map to keywordTranslatorMaker';
    }
}
