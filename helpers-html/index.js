import { parse, parseFragment, serialize } from 'parse5';
import { utils } from '@l10nmonster/core';

// Helper function to serialize a node with its tags
function serializeNode(node, includeOuter = true) {
    if (node.nodeName === '#text') {
        return node.value;
    }
    if (includeOuter) {
        // For element nodes, we need to wrap in a fragment to get the outer HTML
        const tempFragment = parseFragment('');
        tempFragment.childNodes = [node];
        return serialize(tempFragment);
    } else {
        // Just serialize the inner content
        return serialize(node);
    }
}

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
function parseResource(resource) {
    return resource.match(/<html/i) ? parse(resource) : parseFragment(resource);
}

/**
 * HTMLFilter - handles HTML segmentation and translation
 * 
 * Segmentation logic:
 * - Looks for translatable text nodes using segmentation and do-not-translate rules based on node names
 * - If a non-whitespace text node is found, segment is the closest ancestor element that is not an inline element
 * - There are cases where block and inline elements are mixed as siblings. In that case block elements will be treated as inline
 * - Block DNT tags are ignored even if they contain text nodes
 * - Comments are stripped from translatable elements and whitespace around tags collapsed (within text nodes is preserved)
 * 
 * Options:
 * - hasInlineBlockElements (boolean, default: true): 
 *   - When true: mixed block/inline siblings are treated as one segment (original behavior)
 *   - When false: block elements are kept as separate segments, only inline/text runs between them are grouped
 */
export class HTMLFilter {
    #hasInlineBlockElements;
    
    constructor(options = {}) {
        this.#hasInlineBlockElements = options.hasInlineBlockElements === true; // default to false
    }
    
    // Helper to check if a node or its children contain translatable content
    #hasTranslatableContent(node) {
        if (node.nodeName === '#text') {
            return node.value.replaceAll(/\s/g,'').length > 0;
        }
        if (!dntTags.has(node.nodeName) && node.childNodes) {
            const dummy = { seq: 0 };
            const result = this.#findTranslatableStrings(node, dummy);
            return result === true || (Array.isArray(result) && result.length > 0);
        }
        return false;
    }
    
    // When hasInlineBlockElements is false, inline elements and text nodes that are siblings of block
    //     elements are kept separate from block segments.
    #findTranslatableStrings(node, c) {
        const translationCandidates = [];
        
        if (node?.childNodes?.length > 0) {
            for (const child of node.childNodes) {
                c.seq++;
                if (child.nodeName === '#text') {
                    if (child.value.replaceAll(/\s/g,'').length > 0) {
                        return true;
                    }
                } else if (!dntTags.has(child.nodeName)) {
                    const childCandidates = this.#findTranslatableStrings(child, c);
                    if (childCandidates === true) {
                        if (inlineTags.has(child.nodeName)) {
                            return true;
                        } else {
                            translationCandidates.push({ n: child, seq: c.seq });
                        }
                    } else if (childCandidates.length > 0) {
                        translationCandidates.push(...childCandidates);
                    }
                }
            }
        }
        
        return translationCandidates;
    }
    
    // callback invoked with the closest non-inline element containing non-all-whitespace text
    // if callback returns a non-undefined value, it replaces the containing element
    async #replaceTranslatableStrings(root, cb) {
        const carry = { seq: 0 };
        
        if (!this.#hasInlineBlockElements) {
            // Special handling for hasInlineBlockElements=false
            await this.#processNodeForSeparateSegments(root, cb, carry);
            return;
        }
        
        // Original behavior for hasInlineBlockElements=true
        let translatables = this.#findTranslatableStrings(root, carry);
        if (translatables === true) { // root contains translatable strings so it's an html fragment
            translatables = [ { n: root, seq: 0 } ];
        }
        for (const toTranslate of translatables) {
            const replacement = await cb(serializeNode(collapseWhitespace(toTranslate.n), false).trim(), toTranslate.seq);
            if (replacement !== undefined) {
                const parsed = parseFragment(replacement);
                toTranslate.n.childNodes = parsed.childNodes;
            }
        }
    }
    
    // Process node to extract blocks and inline runs as separate segments
    async #processNodeForSeparateSegments(node, cb, carry, processedNodes = new Set()) {
        if (!node?.childNodes?.length) return;
        if (processedNodes.has(node)) return; // Prevent double-processing
        processedNodes.add(node);
        
        // Check what types of content we have
        let hasBlocks = false;
        let hasInlineOrText = false;
        
        for (const child of node.childNodes) {
            if (child.nodeName === '#text' && child.value.replaceAll(/\s/g,'').length > 0) {
                hasInlineOrText = true;
            } else if (!dntTags.has(child.nodeName)) {
                if (inlineTags.has(child.nodeName)) {
                    hasInlineOrText = true;
                } else {
                    hasBlocks = true;
                }
            }
        }
        
        if (hasBlocks && hasInlineOrText) {
            // Mixed content - process inline runs separately
            let inlineRun = [];
            let inlineRunStart = -1;
            
            for (let i = 0; i < node.childNodes.length; i++) {
                const child = node.childNodes[i];
                carry.seq++;
                
                const isText = child.nodeName === '#text' && child.value.replaceAll(/\s/g,'').length > 0;
                const isInline = !dntTags.has(child.nodeName) && inlineTags.has(child.nodeName);
                const isBlock = !dntTags.has(child.nodeName) && !inlineTags.has(child.nodeName);
                
                if (isText || isInline) {
                    if (inlineRunStart === -1) inlineRunStart = carry.seq;
                    inlineRun.push(child);
                } else {
                    // End of inline run
                    if (inlineRun.length > 0) {
                        const runContent = inlineRun.map(n => {
                            if (n.nodeName === '#text') {
                                return n.value;
                            } else {
                                const serialized = serializeNode(n);
                                return serialized;
                            }
                        }).join('');
                        const replacement = await cb(runContent, inlineRunStart);
                        if (replacement !== undefined) {
                            // Replace the inline run nodes
                            const parsed = parseFragment(replacement);
                            const startIdx = node.childNodes.indexOf(inlineRun[0]);
                            node.childNodes.splice(startIdx, inlineRun.length, ...parsed.childNodes);
                            i = startIdx + parsed.childNodes.length - 1;
                        }
                        inlineRun = [];
                        inlineRunStart = -1;
                    }
                    
                    if (isBlock) {
                        // Process block element
                        await this.#processNodeForSeparateSegments(child, cb, carry, processedNodes);
                    }
                }
            }
            
            // Handle remaining inline run
            if (inlineRun.length > 0) {
                const runContent = inlineRun.map(n => {
                    if (n.nodeName === '#text') {
                        return n.value;
                    } else {
                        const serialized = serializeNode(n);
                        return serialized;
                    }
                }).join('');
                const replacement = await cb(runContent, inlineRunStart);
                if (replacement !== undefined) {
                    const parsed = parseFragment(replacement);
                    const startIdx = node.childNodes.indexOf(inlineRun[0]);
                    node.childNodes.splice(startIdx, inlineRun.length, ...parsed.childNodes);
                }
            }
        } else {
            // Not mixed content - check if this is a leaf node with text
            let hasDirectText = false;
            let hasChildElements = false;
            
            for (const child of node.childNodes) {
                if (child.nodeName === '#text' && child.value.replaceAll(/\s/g,'').length > 0) {
                    hasDirectText = true;
                } else if (!dntTags.has(child.nodeName) && child.nodeName !== '#text') {
                    hasChildElements = true;
                }
            }
            
            if (hasDirectText && !hasChildElements) {
                // Leaf node with text - extract just the text content
                const textNodes = [];
                for (const child of node.childNodes) {
                    if (child.nodeName === '#text') {
                        textNodes.push(child.value);
                    }
                }
                const content = textNodes.join('');
                const replacement = await cb(content, carry.seq);
                if (replacement !== undefined) {
                    // Replace only text nodes
                    const newText = node.ownerDocument ? 
                        node.ownerDocument.createTextNode(replacement) :
                        { nodeName: '#text', value: replacement };
                    node.childNodes = [newText];
                }
            } else if (hasChildElements) {
                if (hasBlocks) {
                    // Has child elements - recurse into them
                    for (const child of node.childNodes) {
                        if (!dntTags.has(child.nodeName) && !inlineTags.has(child.nodeName) && child.nodeName !== '#text') {
                            carry.seq++;
                            await this.#processNodeForSeparateSegments(child, cb, carry, processedNodes);
                        }
                    }
                } else {
                    // It has children, but none are blocks. So it's a container of inlines.
                    const content = serializeNode(node);
                    if (content.trim()) {
                        const replacement = await cb(content, carry.seq);
                        if (replacement !== undefined) {
                            const parsed = parseFragment(replacement);
                            node.childNodes = parsed.childNodes;
                        }
                    }
                }
            } else if (hasInlineOrText) {
                // Pure inline content without blocks
                const content = serializeNode(collapseWhitespace(node));
                const replacement = await cb(content, carry.seq);
                if (replacement !== undefined) {
                    const parsed = parseFragment(replacement);
                    node.childNodes = parsed.childNodes;
                }
            }
        }
    }
    
    async parseResource({ resource }) {
        const htmlAST = parseResource(resource);
        const segments = {}; // we use an object with numbers as keys so that we can keep them in document order
        const sids = new Set();
        await this.#replaceTranslatableStrings(htmlAST, async (str, seq) => {
            const collapsedStr = str.trim().replace(/\s+/g, ' ');
            if (collapsedStr) {
                const sid = utils.generateGuid(collapsedStr);
                if (!sids.has(sid)) {
                    segments[seq] = { sid, str: collapsedStr };
                    sids.add(sid);
                }
            }
        });
        return {
            segments: Object.values(segments), // this is implicitly sorting by the numeric keys
        };
    }

    async translateResource({ resource, translator }) {
        const htmlAST = parseResource(resource);
        await this.#replaceTranslatableStrings(htmlAST, async str => {
            const collapsedStr = str.trim().replace(/\s+/g, ' ');
            if (collapsedStr) {
                const translation = await translator(utils.generateGuid(collapsedStr), collapsedStr);
                return translation;
            }
            return undefined;
        });
        return serialize(htmlAST);
    }
}


