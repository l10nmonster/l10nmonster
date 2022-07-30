import { regexMatchingDecoderMaker, regexMatchingEncoderMaker } from './regex.js';

export function keywordTranslatorMaker (name, keywordMap) {
    if (keywordMap && Object.keys(keywordMap).length > 0) {
        const decoder = regexMatchingDecoderMaker(
            name,
            new RegExp(`(?<protector>${Object.keys(keywordMap).join("|")})`, 'g'),
            (groups) => ({ t: 'x', v: `protector:${groups.protector}` })
        );
        const charMap = Object.fromEntries(Object.keys(keywordMap).map(kw => [ `protector:${kw}`, keywordMap[kw] ]));
        const encoder = regexMatchingEncoderMaker(
            name,
            /(?<protector>protector:\w+)/g,
            charMap,
            (name, charToReplace, flags) => charMap[charToReplace] && typeof charMap[charToReplace] === 'object' ? charMap[charToReplace][flags.targetLang] || charMap[charToReplace][flags.prj] || charToReplace : charToReplace
        );
        return [ decoder, encoder ]    
    } else {
        throw 'You have to specify a keyword map as in input paramter';
    }
}
