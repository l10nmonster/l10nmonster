// Check https://developer.android.com/guide/topics/resources/string-resource#FormattingAndStyling
// Currently XML parsing is disabled for <string> and <item>. This is to make it easier to inject translations
// and preserve the source but the downside is that we miss automatic CDATA handling, whitespace trimming, entity management.
// TODO: double quotes are meant to preserve newlines but we treat double quotes like CDATA (which doesn't)

import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { default as formatXml } from 'xml-formatter';
import { L10nContext } from '@l10nmonster/core';

function collapseTextNodes(node) {
    return node.map(e => e['#text']).join('').trim();
}

const resourceReferenceRegex=/^@(?:[0-9A-Za-z_$]+:)?[0-9A-Za-z_$]+\/[0-9A-Za-z_$]+$/;

function isTranslatableNode(resNode, str) {
    return resNode[':@'].translatable !== 'false' && !resNode[':@']['/'] && !resourceReferenceRegex.test(str);
}

/**
 * Class representing an AndroidFilter for parsing and translating Android resource files.
 */
export class AndroidXMLFilter {

    /**
     * Create an AndroidXMLFilter.
     * @param {Object} [options] - Configuration options for the filter.
     * @param {string} [options.indentation='\t'] - The indentation character(s) to use in the output XML.
     */
    constructor({ indentation } = {}) {
        this.indentation = indentation || '\t';
    }

    /**
     * Parse an Android resource file and extract translatable segments.
     * @param {Object} params - Parameters for parsing the resource.
     * @param {string} params.resource - The XML content of the Android resource file.
     * @returns {Promise<Object>} An object containing the extracted segments.
     */
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
                        lastComment = resNode['#comment'].map(e => e['#text']).join('').trim();
                    } else if ('string' in resNode) {
                        const str = collapseTextNodes(resNode.string);
                        if (isTranslatableNode(resNode, str)) {
                            const seg = {
                                sid: resNode[':@'].name,
                                str,
                            };
                            lastComment && (seg.notes = lastComment);
                            segments.push(seg);
                            lastComment = null;
                        }
                    } else if ('plurals' in resNode) { // TODO: support string-array
                        for (const itemNode of resNode.plurals) {
                            if ('#comment' in itemNode) {
                                lastComment = itemNode['#comment'].map(e => e['#text']).join('').trim();
                            } else if ('item' in itemNode) {
                                const seg = {
                                    sid: `${resNode[':@'].name}_${itemNode[':@'].quantity}`,
                                    isSuffixPluralized: true,
                                    str: collapseTextNodes(itemNode.item)
                                };
                                lastComment && (seg.notes = lastComment);
                                segments.push(seg);
                            }
                        }
                        lastComment = null;
                    } else {
                        L10nContext.logger.verbose(`Unexpected child node in resources`);
                        L10nContext.logger.verbose(JSON.stringify(resNode));
                    }
                }
            }
        }
        return {
            segments,
        };
    }

    /**
     * Translate an Android resource file using the provided translator function.
     * @param {Object} params - Parameters for translating the resource.
     * @param {string} params.resource - The XML content of the Android resource file.
     * @param {Function} params.translator - A function that translates a string given its ID and source text.
     * @returns {Promise<string|null>} The translated XML content, or null if no translations were made.
     */
    async translateResource({ resource, translator }) {
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
                    if ('string' in resNode) {
                        const str = collapseTextNodes(resNode.string);
                        if (isTranslatableNode(resNode, str)) {
                            const translation = await translator(resNode[':@'].name, str);
                            if (translation === undefined) {
                                nodesToDelete.push(resNode);
                            } else {
                                translated++;
                                resNode.string = [ { '#text': translation } ];
                            }
                        } else {
                            nodesToDelete.push(resNode);
                        }
                    } else if ('plurals' in resNode) { // TODO: deal with plurals of the target language, not the source
                        let dropPlural = false;
                        const itemNodesToDelete = []
                        for (const itemNode of resNode.plurals) {
                            if ('#comment' in itemNode) {
                                itemNodesToDelete.push(itemNode)
                                // eslint-disable-next-line no-continue
                                continue;
                            }
                            const translation = await translator(`${resNode[':@'].name}_${itemNode[':@'].quantity}`, collapseTextNodes(itemNode.item));
                            if (translation === undefined) {
                                dropPlural = true;
                            } else {
                                itemNode.item = [ { '#text': translation } ];
                            }
                        }
                        resNode.plurals = resNode.plurals.filter(n => !itemNodesToDelete.includes(n))
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
        return formatXml(roughXML, { collapseContent: true, indentation: this.indentation, lineSeparator: '\n' }) + '\n';
    }
}
