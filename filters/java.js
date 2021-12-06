import { parseToEntries, stringifyFromEntries } from '@js.properties/properties';

export class JavaPropertiesFilter {
    async parseResource({ resource }) {
        const parsedResource = parseToEntries(resource, { sep: true, eol: true, all: true, original: true });
        const translationUnits = [];
        let previousComment;
        for (const e of parsedResource) {
            if (e.key) {
                const tu = {
                    sid: e.key,
                    str: e.element,
                };
                if (previousComment) {
                    tu.notes = previousComment;
                    previousComment = null;
                }
                translationUnits.push(tu);
            } else {
                previousComment = e.original;
            }
        }
        return {
            translationUnits,
        };
    }

    async generateTranslatedResource({ resourceId, resource, lang, translator }) {
        const parsedResource = parseToEntries(resource, { sep: true, eol: true, all: true, original: true });
        const translations = await Promise.all(parsedResource.map(async e => e.key && translator(resourceId, e.key, e.element)));
        const translatedEntries = parsedResource.map((e, i) => {
            const { original, element, ...rest } = e;
            if (e.key) {
                return {
                    ...rest,
                    element: translations[i],
                };
            } else {
                return {
                    ...rest,
                    original,
                };
            }
        });
        return stringifyFromEntries(translatedEntries);
    }
}