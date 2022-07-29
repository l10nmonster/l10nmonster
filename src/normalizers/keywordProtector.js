import { regexMatchingDecoderMaker } from './regex.js';

export default class KeywordProtector {
    constructor(keywordList, keywordMap) {
        this.keywordList = keywordList;
        this.keywordMap = keywordMap;
        this.defaultEncoder = this.regexMatchingEncoderMaker(
            'protectedStringsDecoder',
            /(?<protector>protector:\w+)/g,
            this.keywordList.reduce((out, str) => { out[`protector:${str}`] = str; return out}, {})
        );
    
        this.mappedEncoder = this.regexMatchingEncoderMaker(
            'protectedStringsMappedDecoder',
            /(?<protector>protector:\w+)/g,
            this.renameKeys(this.keywordMap)
        );
    
        this.decoder = regexMatchingDecoderMaker(
            'protectedStringsDecoder',
            new RegExp(`(?<protector>${this.keywordList.join("|")||"NO_PROTECTED_STRINGS"})`, 'g'),
            (groups) => ({ t: 'x', v: `protector:${groups.protector}` })
        );
    }

    renameKeys(obj) {
        return Object.keys(obj).reduce((acc, key) => ({...acc, ...{[`protector:${key}`]: obj[key]}}), {});
    } 

    //Checks for values in the map based on the flags
    findFlagValue (charMap, flags) {
        const v = !charMap || typeof charMap === 'string'? charMap : Object.values(flags).find((v) => charMap[v]);
        return !charMap ? charMap : !charMap[v] || typeof charMap[v] === 'string' ? charMap[v] : this.findFlagValue (charMap[v], flags);
    }
 
    // Generic pluggable encoder that can process values based on flags
    regexMatchingEncoderMaker(name, regex, charMap) {
        const fn = function encoder(str, flags = {}) {
            return str.replaceAll(regex, (match, ...capture) => {
                const charToReplace = capture.reduce((p,c) => p ?? c);
                const replacement = typeof charMap[charToReplace] === 'string' ? charMap[charToReplace] : this.findFlagValue(charMap[charToReplace], flags) || charToReplace;
                return match.replace(charToReplace, replacement);
            });
        };
        Object.defineProperty(fn, 'name', { value: name });
        return fn;
    }

}
