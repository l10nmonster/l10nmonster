import { regexMatchingDecoderMaker, regexMatchingEncoderMaker } from './regex.js';

export function keywordTranslatorMaker(name, keywordToTranslationMap) {
    if (keywordToTranslationMap && Object.keys(keywordToTranslationMap).length > 0) {
        const decoder = regexMatchingDecoderMaker(
            name,
            new RegExp(`(?<kw>${Object.keys(keywordToTranslationMap).join("|")})`, 'g'),
            (groups) => ({ t: 'x', v: `${name}:${groups.kw}` })
        );
        const encoder = regexMatchingEncoderMaker(
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
