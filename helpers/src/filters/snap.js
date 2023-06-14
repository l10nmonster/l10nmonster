// A generator-compatible filter producing translated snaps similar to the format produced by FsSnapStore
export class SnapFilter {
    async parseResource({ resource }) {
        return JSON.parse(resource);
    }

    // takes a raw resource
    async translateResource({ resource, translator }) {
        return this.generateResource({ resource: JSON.parse(resource), translator })
    }

    // takes a normalized resource
    async generateResource(resourceTranslation) {
        return JSON.stringify(resourceTranslation, null, '\t');
    }
}
