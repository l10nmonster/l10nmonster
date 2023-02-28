import { parse, parseFragment, serialize } from 'parse5';
import { generateGuid } from '../shared.js';

// from https://developer.mozilla.org/en-US/docs/Web/HTML/Inline_elements
// the following were removed from inline: label, button
const inlineTags = new Set([ 'a', 'abbr', 'acronym', 'audio', 'b', 'bdi', 'bdo', 'big', 'br', 'canvas', 'cite', 'code', 'data', 'datalist', 'del', 'dfn', 'em', 'embed', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'map', 'mark', 'meter', 'noscript', 'object', 'output', 'picture', 'progress', 'q', 'ruby', 's', 'samp', 'script', 'select', 'slot', 'small', 'span', 'strong', 'sub', 'sup', 'svg', 'template', 'textarea', 'time', 'u', 'tt', 'var', 'video', 'wbr' ]);
const dntTags = new Set([ 'code', 'pre', 'script', 'style', 'template' ]); // TODO: may have to deal with inline DNT like 'var'

function collapseWhitespace(node) {
    if (node?.childNodes?.length > 0) {
        const childNodes = node.childNodes;
        for (let i = 0; i < childNodes.length; i++) {
            childNodes[i].nodeName === '#comment' && childNodes.splice(i, 1);
        }
        for (const child of childNodes) {
            if (child.nodeName === '#text' && child.value.replaceAll(/\s/g,'').length === 0) {
                child.value = ' ';
            } else {
                collapseWhitespace(child);
            }
        }
    }
    return node;
}
// return true if a non-all-whitespace text node is found
// callback invoked with the closest non-inline element containing non-all-whitespace text
// if callback returns trueish value, it replaces the containing element
// segmentation logic as follows: if a non-whitespace text node is found, segment is the closest
// ancestor element that is not an inline element. There are cases where block and inline elements
// are mixed as siblings. In that case block elements will be treated as inline.
// Block DNT tags are ignored even if they contain text nodes
// Comments are stripped from translatable elements and whitespace around tags collapsed (within
// text nodes is preserved)
async function findTranslatableStrings(node, c, cb) {
    if (node?.childNodes?.length > 0) {
        let translationCandidates = [];
        for (const child of node.childNodes) {
            c.seq++;
            if (child.nodeName === '#text') {
                if (child.value.replaceAll(/\s/g,'').length > 0) {
                    return true; // if there's any non-whitespace we short-circuit back to the parent
                }
            } else {
                if (!dntTags.has(child.nodeName) && (await findTranslatableStrings(child, c, cb))) {
                    if (inlineTags.has(child.nodeName)) {
                        return true; // if there are any inline elements we short-circuit back to the parent
                    } else {
                        translationCandidates.push({ n: child, seq: c.seq });
                    }
                }
            }
        }
        for (const toTranslate of translationCandidates) {
            const replacement = await cb(serialize(collapseWhitespace(toTranslate.n)).trim(), toTranslate.seq);
            replacement && (toTranslate.n.childNodes = replacement.childNodes);
        }
    }
}

export class HTMLFilter {
    constructor( params ) {
        this.allowFragments = params?.allowFragments || false;
    }

    async parseResource({ resource }) {
        const htmlAST = parse(resource);
        const segments = {};
        const sids = new Set();
        await findTranslatableStrings(htmlAST, { seq: 0 }, async (str, seq) => {
            const sid = generateGuid(str);
            !sids.has(sid) && (segments[seq] = { sid, str });
            sids.add(sid);
        });
        return {
            segments: Object.values(segments), // this is implicitly sorting by the numeric keys
        };
    }

    async translateResource({ resource, translator }) {
        const htmlAST = parse(resource);
        await findTranslatableStrings(htmlAST, { seq: 0 }, async str => {
            const translation = await translator(generateGuid(str), str);
            return translation && parseFragment(translation);
        });
        return this.allowFragments && resource.indexOf('<html>')===-1? serialize(htmlAST).replace('<html><head></head><body>', '').replace('</body></html>', '') :
            serialize(htmlAST);
    }
}
