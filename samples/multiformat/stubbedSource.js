module.exports = class StubbedSource {
    #stubbedResources;

    constructor(stubbedResources, enableFetchAll) {
        this.#stubbedResources = stubbedResources;
        enableFetchAll && (this.fetchAllResources = async function *() {
            for (res of stubbedResources) {
                yield [ res, JSON.stringify(res)];
            }
        });
    }

    async fetchResourceStats() {
        return this.#stubbedResources.map(res => {
            const { segments, ...stats } = res;
            return stats;
        });
    }

    async fetchResource(resourceId) {
        return JSON.stringify(this.#stubbedResources.find(res => res.id === resourceId));
    }
}
