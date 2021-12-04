import { parseToEntries, stringifyFromEntries } from '@js.properties/properties';

export class JavaPropertiesFilter {
    async parseResource({ resource }) {
        const parsedResource = parseToEntries(resource);
        const translationUnits = parsedResource.map(e => ({
            sid: e.key,
            str: e.element,
        }));
        return {
            translationUnits,
        };
    }

    async generateTranslatedResource({ resourceId, resource, lang, translator }) {
        const parsedResource = parseToEntries(resource);
        const translatedEntries = parsedResource.map(async e => ({
            key: e.key,
            element: await translator(resourceId, e.key, e.element),
        }));
        return stringifyFromEntries(translatedEntries);
    }
}