// Check https://developer.android.com/guide/topics/resources/string-resource#FormattingAndStyling
// Currently XML parsing is disabled for <string> and <item>. This is to make it easier to inject translations
// and preserve the source but the downside is that we miss automatic CDATA handling, whitespace trimming, entity management.
// TODO: per Android rules we don't handle keeping as-is strings surrounded by double quotes.

import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import xmlFormatter from 'xml-formatter';
import { xmlCDataDecoder, xmlEntityDecoder, androidEscapesDecoder, androidEscapesEncoder,
    xmlEntityEncoder } from '../normalizers/regex.js';

function collapseTextNodesAndDecode(node) {
    const collapsedText = node.map(e => e['#text']).join('');
    const afterStrippingCData = xmlCDataDecoder([ collapsedText ]).join('');
    const afterXmlEntities = xmlEntityDecoder([ afterStrippingCData ]).join('');
    const afterSpaceCollapse = afterXmlEntities.replaceAll(/[ \f\n\r\t\v\u2028\u2029]+/g, ' ');
    return androidEscapesDecoder([ afterSpaceCollapse ]).join('');
}

export class AndroidFilter {
    constructor({ indentation }) {
        this.indentation = indentation || '\t';
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
                        lastComment = collapseTextNodesAndDecode(resNode['#comment']).trim();
                    } else if ('string' in resNode && resNode[':@'].translatable !== 'false' && !resNode[':@']['/']) {
                        // resNode[':@'].name === 'app_short_name' && console.dir(resNode.string, { depth: null })
                        const seg = {
                            sid: resNode[':@'].name,
                            str: collapseTextNodesAndDecode(resNode.string)
                        };
                        lastComment && (seg.notes = lastComment);
                        // resNode[':@'].name === 'app_short_name' && console.dir(seg)
                        segments.push(seg);
                    } else if ('plurals' in resNode) {
                        for (const itemNode of resNode.plurals) {
                            const seg = {
                                sid: `${resNode[':@'].name}_${itemNode[':@'].quantity}`,
                                isSuffixPluralized: true,
                                str: collapseTextNodesAndDecode(itemNode.item)
                            };
                            lastComment && (seg.notes = lastComment);
                            segments.push(seg);
                        }
                    } else if (!('string' in resNode) && this?.ctx?.verbose) {
                        console.log(`Unexpected child node in resources`);
                        console.dir(resNode, { depth: null });
                    }
                }
            }
        }
        return {
            segments,
        };
    }

    async generateTranslatedResource({ resource, translator }) {
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
        let translated = 0;
        for (const rootNode of parsedResource) {
            if ('resources' in rootNode) {
                for (const resNode of rootNode.resources) {
                    if ('string' in resNode && resNode[':@'].translatable !== 'false' && !resNode[':@']['/']) {
                        const translation = await translator(resNode[':@'].name, collapseTextNodesAndDecode(resNode.string));
                        // eslint-disable-next-line no-negated-condition
                        if (resNode[':@'].translatable !== 'false' && translation !== undefined && !resNode[':@']['/']) {
                            translated++;
                            resNode.string = [ { '#text': xmlEntityEncoder(androidEscapesEncoder(translation)) } ];
                        } else {
                            nodesToDelete.push(resNode);
                        }
                    } else if ('plurals' in resNode) { // TODO: deal with plurals of the target language, not the source
                        let dropPlural = false;
                        for (const itemNode of resNode.plurals) {
                            const translation = await translator(`${resNode[':@'].name}_${itemNode[':@'].quantity}`, collapseTextNodesAndDecode(itemNode.item));
                            if (translation === undefined) {
                                dropPlural = true;
                            } else {
                                itemNode.item = [ { '#text': xmlEntityEncoder(androidEscapesEncoder(translation)) } ];
                            }
                        }
                        if (dropPlural) {
                            nodesToDelete.push(resNode);
                        } else {
                            translated++;
                        }
                    } else {
                        nodesToDelete.push(resNode); // drop other nodes because of https://github.com/NaturalIntelligence/fast-xml-parser/issues/435
                    }
                }
                rootNode.resources = rootNode.resources.filter(n => !nodesToDelete.includes(n));
            }
        }
        if (translated === 0) {
            return null;
        }
        const builder = new XMLBuilder(parsingOptions);
        const roughXML = builder.build(parsedResource);
        // eslint-disable-next-line prefer-template
        return xmlFormatter(roughXML, { collapseContent: true, indentation: this.indentation, lineSeparator: '\n' }) + '\n';
    }
}
