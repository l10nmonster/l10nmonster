import { regex } from '@l10nmonster/core';
import Filter from './filter';

const androidControlCharsToDecode = {
    n: '\n',
    t: '\t',
};
export const escapesDecoder = regex.decoderMaker(
    'androidEscapesDecoder',
    /(?<node>\\(?<escapedChar>[@?\\'"])|\\(?<escapedControl>[nt])|\\u(?<codePoint>[0-9A-Za-z]{4}))/g,
    (groups) => (groups.escapedChar ??
        (groups.escapedControl ?
            (androidControlCharsToDecode[groups.escapedControl] ?? `\\${groups.escapedControl}`) :
            String.fromCharCode(parseInt(groups.codePoint, 16))
        )
    )
);

// Android lint doesn't accept % but accepts %%.  % should be replaced with '\u0025' but %% shouldn't
export const escapesEncoder = (str, flags = {}) => {
    let escapedStr = str.replaceAll(/[@\\'"]/g, '\\$&').replaceAll('\t', '\\t').replaceAll('\n', '\\n').replaceAll(/(?<!%)%(?!%)/g, '\\u0025');
    // eslint-disable-next-line prefer-template
    flags.isFirst && escapedStr[0] === ' ' && (escapedStr = '\\u0020' + escapedStr.substring(1));
    // eslint-disable-next-line prefer-template
    flags.isLast && escapedStr.length > 0 && escapedStr[escapedStr.length - 1] === ' ' && (escapedStr = escapedStr.substring(0, escapedStr.length - 1) + '\\u0020');
    return escapedStr;
};

export const spaceCollapser = (parts) => parts.map(p => (p.t === 's' ? { ...p, v: p.v.replaceAll(/[ \f\n\r\t\v\u2028\u2029]+/g, ' ')} : p));

// C-style placeholders (based on the ios one)
export const phDecoder = regex.decoderMaker(
    'iosPHDecoder',
    /(?<tag>%(?:\d\$)?[0#+-]?[0-9*]*\.?\d*[hl]{0,2}[jztL]?[diuoxXeEfgGaAcpsSn])/g,
    (groups) => ({ t: 'x', v: groups.tag })
);
