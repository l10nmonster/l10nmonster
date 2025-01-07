import { parse, parseFragment, serialize } from 'parse5';
import { utils } from '@l10nmonster/core';

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
// Looks for translatable text nodes using segmentation and do-not-translate rules based on node names
// Returns true if a non-all-whitespace text node is found (all-whitespace is common as it's used for indentation).
//     In that case, the caller is responsible for adding itself to the list of translation candidates.
//     Otherwise it returns an array of objects that contain translatable text. Objects contain the node
//     itself and a sequence number to preserve document order.
// Segmentation logic as follows: if a non-whitespace text node is found, segment is the closest
//     ancestor element that is not an inline element. There are cases where block and inline elements
//     are mixed as siblings. In that case block elements will be treated as inline.
//     Block DNT tags are ignored even if they contain text nodes
//     Comments are stripped from translatable elements and whitespace around tags collapsed (within
//     text nodes is preserved)
async function findTranslatableStrings(node, c) {
    const translationCandidates = [];
    if (node?.childNodes?.length > 0) {
        for (const child of node.childNodes) {
            c.seq++;
            if (child.nodeName === '#text') {
                if (child.value.replaceAll(/\s/g,'').length > 0) {
                    return true; // if there's any non-whitespace we short-circuit back to the parent
                }
            } else {
                if (!dntTags.has(child.nodeName)) {
                    const childCandidates = await findTranslatableStrings(child, c);
                    if (childCandidates === true) { // children short-circuited so parent has to add
                        if (inlineTags.has(child.nodeName)) {
                            return true; // if there are any inline elements we short-circuit back to the parent
                        } else {
                            translationCandidates.push({ n: child, seq: c.seq });
                        }
                    } else if (childCandidates.length > 0) { // found translatable text in children
                        translationCandidates.push(...childCandidates);
                    }
                }
            }
        }
    }
    return translationCandidates;
}

// callback invoked with the closest non-inline element containing non-all-whitespace text
// if callback returns a non-undefined value, it replaces the containing element
async function replaceTranslatableStrings(root, cb) {
    const carry = { seq: 0 };
    let translatables = await findTranslatableStrings(root, carry);
    if (translatables === true) { // root contains translatable strings so it's an html fragment
        translatables = [ { n: root, seq: 0 } ];
    }
    for (const toTranslate of translatables) {
        const replacement = await cb(serialize(collapseWhitespace(toTranslate.n)).trim(), toTranslate.seq);
        replacement !== undefined && (toTranslate.n.childNodes = replacement.childNodes);
    }
}

function parseResource(resource) {
    return resource.match(/<html/i) ? parse(resource) : parseFragment(resource);
}
export class HTMLFilter {
    async parseResource({ resource }) {
        const htmlAST = parseResource(resource);
        const segments = {}; // we use an object with numbers as keys so that we can keep them in document order
        const sids = new Set();
        await replaceTranslatableStrings(htmlAST, async (str, seq) => {
            const sid = utils.generateGuid(str);
            !sids.has(sid) && (segments[seq] = { sid, str });
            sids.add(sid);
        });
        return {
            segments: Object.values(segments), // this is implicitly sorting by the numeric keys
        };
    }

    async translateResource({ resource, translator }) {
        const htmlAST = parseResource(resource);
        await replaceTranslatableStrings(htmlAST, async str => {
            const translation = await translator(utils.generateGuid(str), str);
            return translation && parseFragment(translation);
        });
        return serialize(htmlAST);
    }
}
