import { parseToEntries, stringifyFromEntries } from '@js.properties/properties';

export class JavaPropertiesFilter {
    async parseResource({ resource }) {
        const parsedResource = parseToEntries(resource, { sep: true, eol: true, all: true, original: true, location: true });
        const segments = [];
        let previousComments = [];
        for (const e of parsedResource) {
            if (e.key && e.sep.trim() === '=') {
                const location = {startLine: e.location.start.line, endLine: e.location.end.line}
                const seg = {
                    sid: e.key,
                    str: e.element,
                    location
                };

                if (previousComments.length > 0) {
                    const notes = previousComments.join('\n');
                    if (notes.indexOf('DO_NOT_TRANSLATE') === -1) {
                        segments.push({
                            ...seg,
                            notes,
                        });
                    }
                    previousComments = [];
                } else {
                    segments.push(seg);
                }
            } else {
                e.original.trim().length > 0 && previousComments.push(e.original);
            }
        }
        return {
            segments,
        };
    }

    async translateResource({ resource, translator }) {
        const parsedResource = parseToEntries(resource, { sep: true, eol: true, all: true, original: true });
        const translatedEntries = [];
        for (const entry of parsedResource) {
            if (entry.key) {
                const translation = await translator(entry.key, entry.element);
                if (translation !== undefined) {
                    // eslint-disable-next-line no-unused-vars
                    const { original, element, ...rest } = entry;
                    translatedEntries.push({
                        ...rest,
                        element: translation,
                    })
                }
            }
        }
        return stringifyFromEntries(translatedEntries);
    }
}
