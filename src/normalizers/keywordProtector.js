import { regexMatchingDecoderMaker } from './regex.js';

export function keywordProtector (keywordMap) {
    const defaultEncoder = regexMatchingEncoderMaker(
        'protectedStringsDecoder',
        /(?<protector>protector:\w+)/g,
        Object.fromEntries(Object.keys(keywordMap).map(kw => [ `protector:${kw}`, kw ]))
    );

    const mappedEncoder = regexMatchingEncoderMaker(
        'protectedStringsMappedDecoder',
        /(?<protector>protector:\w+)/g,
        Object.fromEntries(Object.keys(keywordMap).map(kw => [ `protector:${kw}`, keywordMap[kw] ]))
    );

    const decoder = regexMatchingDecoderMaker(
        'protectedStringsDecoder',
        new RegExp(`(?<protector>${Object.keys(keywordMap).join("|")||"NO_PROTECTED_STRINGS"})`, 'g'),
        (groups) => ({ t: 'x', v: `protector:${groups.protector}` })
    );
    return [ decoder, defaultEncoder, mappedEncoder ]
}

//Checks for values in the map based on the flags
function findFlagValue (charMap, flags) {
    const v = !charMap || typeof charMap === 'string'? charMap : Object.values(flags).find((v) => charMap[v]);
    return !charMap ? charMap : !charMap[v] || typeof charMap[v] === 'string' ? charMap[v] : findFlagValue (charMap[v], flags);
}
 
// Generic pluggable encoder that can process values based on flags
function regexMatchingEncoderMaker(name, regex, charMap) {
    const fn = function encoder(str, flags = {}) {
        return str.replaceAll(regex, (match, ...capture) => {
            const charToReplace = capture.reduce((p,c) => p ?? c);
            const replacement = typeof charMap[charToReplace] === 'string' ? charMap[charToReplace] : findFlagValue(charMap[charToReplace], flags) || charToReplace;
            return match.replace(charToReplace, replacement);
        });
    };
    Object.defineProperty(fn, 'name', { value: name });
    return fn;
}