/* eslint-disable prefer-named-capture-group */
/* eslint-disable no-bitwise */
import { readFileSync } from 'fs';

const base = 0xFE00;
const decoder = new TextDecoder();

function fe00RangeToUtf8(encoded) {
    const length = encoded.length;

    if (length % 2 !== 0) {
        throw new Error("Invalid encoded input length");
    }

    const bytes = new Uint8Array(length / 2);
    let byteIndex = 0;

    for (let i = 0; i < length; i += 2) {
        const highNibble = encoded.charCodeAt(i) - base;
        const lowNibble = encoded.charCodeAt(i + 1) - base;
        bytes[byteIndex++] = (highNibble << 4) | lowNibble;
    }

    return decoder.decode(bytes);
}

const invisicodeRegex = /\u200B([\uFE00-\uFE0F]+)([^\u200B]*?)\u200B/g;
const content = readFileSync(process.argv[2], 'utf-8');
const matches = content.matchAll(invisicodeRegex);

for (const match of matches) {
    console.log(`Found ${fe00RangeToUtf8(match[1])} inside ${match[2]}`);
}
