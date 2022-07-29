import { regexMatchingDecoderMaker, regexMatchingEncoderMaker } from './regex.js';

export function keywordTranslatorMaker (name, keywordMap) {
    if (keywordMap) {
        const encoder = regexMatchingEncoderMaker(
            name,
            /(?<protector>protector:\w+)/g,
            Object.fromEntries(Object.keys(keywordMap).map(kw => [ `protector:${kw}`, keywordMap[kw] ])),
            findReplacement
        );
        const decoder = regexMatchingDecoderMaker(
            name,
            new RegExp(`(?<protector>${Object.keys(keywordMap).join("|")||"NO_PROTECTED_STRINGS"})`, 'g'),
            (groups) => ({ t: 'x', v: `protector:${groups.protector}` }),
            findReplacement
        );
        return [ decoder, encoder ]    
    } else {
        throw 'You have to specify a keyword map as in input paramter';
    }
}

//Checks for values in the map based on the flags
function findFlagValue (charMap, flags) {
    const v = !charMap || typeof charMap === 'string' || Object.keys(charMap).length === 0 ? charMap : Object.values(flags).find((v) => charMap[v]);
    return !charMap ? charMap : !charMap[v] || typeof charMap[v] === 'string' ? charMap[v] : findFlagValue (charMap[v], flags);
}

function findReplacement(name, charMap, charToReplace, flags) {
    return typeof charMap[charToReplace] === 'string' ? charMap[charToReplace] : findFlagValue(charMap[charToReplace], flags) || charToReplace;
}
