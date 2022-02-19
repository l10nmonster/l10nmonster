// TODO: lots of limitations to fix.
// Check https://developer.android.com/guide/topics/resources/string-resource#FormattingAndStyling

// Currently XML parsing is disabled for <string> and <item>. This is to make it easier to inject translations
// but the downside is that we're missing CDATA handling, whitespace trimming, entity management from XML.

import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import xmlFormatter from 'xml-formatter';

function collapseTextNodes(node) {
    return node.map(e => e['#text']).join('');
}

export class AndroidFilter {
    constructor({ comment }) {
        this.comment = comment || 'pre';
    }

    async parseResource({ resource }) {
        const segments = [];
        const parsingOptions = {
            ignoreAttributes: false,
            processEntities: true,
            htmlEntities: true,
            allowBooleanAttributes: true,
            alwaysCreateTextNode: true,
            attributeNamePrefix : '',
            commentPropName: "#comment",
            preserveOrder: true,
            stopNodes: ["*.string", "*.item"],
            parseTagValue: false,
            trimValues: true,
        };
        const parser = new XMLParser(parsingOptions);
        for (const rootNode of parser.parse(resource)) {
            if ('resources' in rootNode) {
                let lastComment;
                for (const resNode of rootNode.resources) {
                    if ('#comment' in resNode) {
                        lastComment = collapseTextNodes(resNode['#comment']).trim();
                    } else if ('string' in resNode && resNode[':@'].translatable !== 'false') {
                        // resNode[':@'].name === 'app_name' && console.dir(resNode.string, { depth: null })
                        const seg = {
                            sid: resNode[':@'].name,
                            str: collapseTextNodes(resNode.string)
                        };
                        lastComment && (seg.notes = lastComment);
                        // resNode[':@'].name === 'app_name' && console.dir(seg)
                        segments.push(seg);
                    } else if ('plurals' in resNode) {
                        for (const itemNode of resNode.plurals) {
                            const seg = {
                                sid: `${resNode[':@'].name}_${itemNode[':@'].quantity}`,
                                isSuffixPluralized: true,
                                str: collapseTextNodes(itemNode.item)
                            };
                            lastComment && (seg.notes = lastComment);
                            segments.push(seg);
                        }
                    }
                }
            }
        }
        return {
            segments,
        };
    }

    async generateTranslatedResource({ resourceId, resource, translator }) {
        const parsingOptions = {
            ignoreAttributes: false,
            processEntities: true,
            htmlEntities: true,
            allowBooleanAttributes: true,
            alwaysCreateTextNode: true,
            attributeNamePrefix : '',
            commentPropName: "#comment",
            preserveOrder: true,
            stopNodes: ["*.string", "*.item"],
            parseTagValue: false,
            trimValues: true,
        };
        const parser = new XMLParser(parsingOptions);
        const parsedResource = parser.parse(resource);
        const nodesToDelete = [];
        for (const rootNode of parsedResource) {
            if ('resources' in rootNode) {
                for (const resNode of rootNode.resources) {
                    if ('string' in resNode) {
                        const translation = await translator(resourceId, resNode[':@'].name, collapseTextNodes(resNode.string));
                        // eslint-disable-next-line no-negated-condition
                        if (resNode[':@'].translatable !== 'false' && translation !== undefined) {
                            resNode.string = [ { '#text': translation } ];
                        } else {
                            nodesToDelete.push(resNode);
                        }
                    } else if ('plurals' in resNode) { // TODO: deal with plurals of the target language, not the source
                        for (const itemNode of resNode.plurals) {
                            const translation = await translator(resourceId, `${resNode[':@'].name}_${itemNode[':@'].quantity}`, collapseTextNodes(itemNode.item));
                            itemNode.item = [ { '#text': translation } ];
                        }
                    }
                }
                rootNode.resources = rootNode.resources.filter(n => !nodesToDelete.includes(n));
            }
        }
        const builder = new XMLBuilder(parsingOptions);
        const roughXML = builder.build(parsedResource);
        return xmlFormatter(roughXML, { collapseContent: true, indentation: '\t', lineSeparator: '\n' });
    }
}
