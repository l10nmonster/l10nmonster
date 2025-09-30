import { decoderMaker, encoderMaker } from './regex.js';

const namedEntities = {
    '&nbsp;': '\u00a0',
    '&amp;' : '&',
    '&apos;' : "'",
    '&quot;': '"',
    '&lt;'  : '<',
    '&gt;'  : '>'
};
export const entityDecoder = decoderMaker(
    'xmlEntityDecoder',
    /(?<node>&#x(?<hexEntity>[0-9a-fA-F]+);|(?<namedEntity>&[^#;]+;)|&#(?<numericEntity>\d+);)/g,
    (groups) => (groups.namedEntity ?
                    (namedEntities[groups.namedEntity] || groups.namedEntity) :
                    (groups.hexEntity ?
                        String.fromCharCode(parseInt(groups.hexEntity, 16)) :
                        String.fromCharCode(parseInt(groups.numericEntity, 10)))
                )
);

// TODO: this is conflating generic XML CDATA with Android-specific quotes, so it's really an android-only thing
export const CDataDecoder = decoderMaker(
    'xmlCDataDecoder',
    /(?:<!\[CDATA\[(?<cdata>.*?)\]\]>|(?:(?<firstChar>[^\\])"|^")(?<quoted>.*?)(?<lastChar>[^\\])")/gs,
    groups => groups.cdata ?? ((groups.firstChar || '') + groups.quoted + (groups.lastChar ?? ''))
);

export const entityEncoder = encoderMaker(
    'xmlEntityEncoder',
    // eslint-disable-next-line prefer-named-capture-group
    /(&)|(<)|(\u00a0)/g,
    {
        '&': '&amp;',
        '<': '&lt;',
        '\u00a0': '&#160;',
    }
);

// Placeholders

// Works for both XML and HTML
export const tagDecoder = decoderMaker(
    'xmlDecoder',
    /(?<tag>(?<x><[^>]+\/>)|(?<bx><[^/!][^>]*>)|(?<ex><\/[^>]+>))/g,
    (groups) => ({ t: (groups.bx ? 'bx' : (groups.ex ? 'ex' : 'x')), v: groups.tag })
);
