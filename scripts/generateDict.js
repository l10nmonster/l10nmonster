// Read a file in a format like https://raw.githubusercontent.com/jeffreypriebe/spelling-variations/d48f222915bdbc12c8dbb71959939b821c5078c8/src/bydictionary.json
// And generate monolingual mapping as preferred

import fs from 'fs';

const rawDict = fs.readFileSync('dict_multi.json', 'utf8');
const biDict = JSON.parse(rawDict);
const monoDictEntries = [];
Object.entries(biDict).forEach(([key, values]) => {
    const e = values.split('|');
    // only pick US words that are not shared in the UK
    if (key === e[4] && key !== e[8] && key !== e[0]) {
        monoDictEntries.push([ key, e[0] ]);
    }
});
fs.writeFileSync('dict.json', JSON.stringify(Object.fromEntries(monoDictEntries.sort()), null, '\t'));
