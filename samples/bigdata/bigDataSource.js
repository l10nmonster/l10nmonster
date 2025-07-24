import { logVerbose } from "@l10nmonster/core";

const loremIpsumArray = [ 'Lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua', 'Ut', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi', 'ut', 'aliquip', 'ex', 'ea', 'commodo', 'consequat', 'Duis', 'aute', 'irure', 'dolor', 'in', 'reprehenderit', 'in', 'voluptate', 'velit', 'esse', 'cillum', 'dolore', 'eu', 'fugiat', 'nulla', 'pariatur', 'Excepteur', 'sint', 'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'in', 'culpa', 'qui', 'officia', 'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum' ];

export default class BigDataSource {
    #bundles;
    #ids;
    #contentSize;

    constructor({ bundles, ids, contentSize }) {
        this.#bundles = bundles; // number of bundles
        this.#ids = ids; // number of ids
        this.#contentSize = contentSize; // number of bytes
    }

    async *fetchAllResources() {
        for (let bundle = 1; bundle <= this.#bundles; bundle++) {
            const segments = [];
            for (let id = 1; id <= this.#ids; id++) {
                const strArray = [];
                for (let i = 0; i < this.#contentSize;) {
                    const word = loremIpsumArray[Math.floor(Math.random() * loremIpsumArray.length)];
                    strArray.push(word);
                    i += word.length;
                }
                segments.push({
                    sid: `sid${id}`,
                    str: strArray.join(' '),
                });
            }
            bundle % 500 === 1 && logVerbose`bundle #${bundle} fetched`;
            yield [
                {
                    id: `rid${bundle}`,
                    modified: new Date().toISOString(),
                    sourceLang: 'en',
                }, 
                JSON.stringify({ segments })
            ];
        }
    }
}
