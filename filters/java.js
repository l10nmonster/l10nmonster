import { parseToEntries, stringifyFromEntries } from '@js.properties/properties';

export class JavaPropertiesFilter {
    async parseResource({ resource }) {
        const parsedResource = parseToEntries(resource, { sep: true, eol: true, all: true, original: true });
        const segments = [];
        let previousComment;
        for (const e of parsedResource) {
            if (e.key) {
                const seg = {
                    sid: e.key,
                    str: e.element,
                };
                if (previousComment) {
                    seg.notes = previousComment;
                    previousComment = null;
                }
                segments.push(seg);
            } else {
                previousComment = e.original;
            }
        }
        return {
            segments,
        };
    }

    async generateTranslatedResource({ resourceId, resource, translator }) {
        const parsedResource = parseToEntries(resource, { sep: true, eol: true, all: true, original: true });
        const translations = await Promise.all(parsedResource.map(async e => e.key && translator(resourceId, e.key, e.element)));
        const translatedEntries = parsedResource.map((e, i) => {
            // eslint-disable-next-line no-unused-vars
            const { original, element, ...rest } = e;
            if (e.key && translations[i] !== undefined) {
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
