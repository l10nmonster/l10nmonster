export default class StubbedSource {
    #stubbedResources;

    constructor(stubbedResources) {
        this.#stubbedResources = stubbedResources;
    }

    async *fetchAllResources() {
        for (const resource of this.#stubbedResources) {
            // eslint-disable-next-line no-unused-vars
            const { segments, ...stats } = resource; // Extract stats similar to old fetchResourceStats
            // The second element is the stringified full resource, similar to old fetchResource
            yield [ stats, JSON.stringify(resource) ];
        }
    }
}
