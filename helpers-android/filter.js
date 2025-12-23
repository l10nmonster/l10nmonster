// Check https://developer.android.com/guide/topics/resources/string-resource#FormattingAndStyling
// Currently XML parsing is disabled for <string> and <item>. This is to make it easier to inject translations
// and preserve the source but the downside is that we miss automatic CDATA handling, whitespace trimming, entity management.
// TODO: double quotes are meant to preserve newlines but we treat double quotes like CDATA (which doesn't)

import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { default as formatXml } from 'xml-formatter';
import { logVerbose } from '@l10nmonster/core';

/** @typedef {import('@l10nmonster/core').ResourceFilter} ResourceFilter */

function collapseTextNodes(node) {
    return node.map(e => e['#text']).join('').trim();
}

const resourceReferenceRegex=/^@(?:[0-9A-Za-z_$]+:)?[0-9A-Za-z_$]+\/[0-9A-Za-z_$]+$/;

function isTranslatableNode(resNode, str) {
    return resNode[':@'].translatable !== 'false' && !resNode[':@']['/'] && !resourceReferenceRegex.test(str);
}

/**
 * Class representing an AndroidFilter for parsing and translating Android resource files.
 * @implements {ResourceFilter}
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
     * @param {string[]} [params.targetPluralForms] - Array of plural forms required for target languages.
     * @returns {Promise<Object>} An object containing the extracted segments.
     */
    async parseResource({ resource, targetPluralForms }) {
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
                        const pluralName = resNode[':@'].name;
                        const pluralForms = new Map(); // quantity -> { seg, notes }
                        let pluralComment = lastComment;

                        // Collect existing plural forms
                        for (const itemNode of resNode.plurals) {
                            if ('#comment' in itemNode) {
                                pluralComment = itemNode['#comment'].map(e => e['#text']).join('').trim();
                            } else if ('item' in itemNode) {
                                const quantity = itemNode[':@'].quantity;
                                const seg = {
                                    sid: `${pluralName}_${quantity}`,
                                    pluralForm: quantity,
                                    str: collapseTextNodes(itemNode.item)
                                };
                                pluralComment && (seg.notes = pluralComment);
                                pluralForms.set(quantity, seg);
                            }
                        }

                        // Android <plurals> element explicitly defines plural rules
                        // Expansion can happen as long as 'other' form is present
                        const otherForm = pluralForms.get('other');

                        // Add forms in natural plural order (existing or generated from 'other')
                        for (const form of targetPluralForms) {
                            if (pluralForms.has(form)) {
                                segments.push(pluralForms.get(form));
                            } else if (otherForm) {
                                // Generate missing form from 'other'
                                segments.push({
                                    sid: `${pluralName}_${form}`,
                                    pluralForm: form,
                                    str: otherForm.str,
                                    ...(otherForm.notes && { notes: otherForm.notes })
                                });
                            }
                        }
                        lastComment = null;
                    } else {
                        logVerbose`Unexpected child node in resources`;
                        logVerbose`${JSON.stringify(resNode)}`;
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
     * @param {string[]} [params.targetPluralForms] - Array of plural forms required for the target language.
     * @returns {Promise<string|null>} The translated XML content, or null if no translations were made.
     */
    async translateResource({ resource, translator, targetPluralForms }) {
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
                    } else if ('plurals' in resNode) {
                        const pluralName = resNode[':@'].name;

                        // Collect source plural forms
                        const sourceForms = new Map(); // quantity -> { text, itemNode }
                        for (const itemNode of resNode.plurals) {
                            if ('item' in itemNode) {
                                sourceForms.set(itemNode[':@'].quantity, {
                                    text: collapseTextNodes(itemNode.item),
                                    itemNode
                                });
                            }
                        }

                        // Get 'other' form for generating missing target forms
                        // Android <plurals> is explicitly a plural, so we can expand as long as 'other' exists
                        const otherForm = sourceForms.get('other');

                        // Build new plurals node with only required target forms in CLDR order
                        const newPluralItems = [];
                        let dropPlural = false;

                        for (const form of targetPluralForms) {
                            const sourceForm = sourceForms.get(form) ?? otherForm;
                            if (!sourceForm) {
                                // Can't generate this required form - no source and no fallback
                                dropPlural = true;
                                break;
                            }
                            const translation = await translator(`${pluralName}_${form}`, sourceForm.text);
                            if (translation === undefined) {
                                dropPlural = true;
                                break;
                            }
                            newPluralItems.push({
                                item: [{ '#text': translation }],
                                ':@': { quantity: form }
                            });
                        }

                        if (dropPlural || newPluralItems.length === 0) {
                            nodesToDelete.push(resNode);
                        } else {
                            // Replace plurals with new items containing only target forms
                            resNode.plurals = newPluralItems;
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
         
        // @ts-ignore - xml-formatter types don't match actual module export
        return `${formatXml(roughXML, { collapseContent: true, indentation: this.indentation, lineSeparator: '\n' })}\n`;
    }
}
