import { L10nContext } from '@l10nmonster/core';

/**
 *
 * A channel adapter for fetching resources over HTTP.
 * @class
 */
export class HttpSource {

    /**
     * Creates an instance of HttpSource.
     * @constructor
     * @param {Object} params - The parameters for initializing the HttpSource.
     * @param {Object} params.urlMap - A map of resource IDs to their corresponding URLs.
     * @param {Array<string>} [params.targetLangs] - The target languages for the resources.
     * @param {string} [params.prj] - The project identifier associated with the resources.
     * @param {Function} [params.filter] - A function to filter resources based on their IDs.
     * @param {Function} [params.resDecorator] - A function to decorate resource metadata.
     * @throws {string} Throws an error if `urlMap` or `targetLangs` (directly or via `resDecorator`) is not provided.
     */
    constructor({ urlMap, targetLangs, prj, filter, resDecorator }) {
        if (urlMap === undefined || (targetLangs || resDecorator) === undefined) {
            throw 'You must specify urlMap, targetLangs (directly or via resDecorator) in HttpSource';
        } else {
            this.urlMap = urlMap;
            this.targetLangs = targetLangs;
            this.prj = prj;
            this.filter = filter;
            this.resDecorator = resDecorator;
        }
    }

    // this is fake, as there's no guarantee the http server would return the modified date or etag
    async fetchResourceStats() {
        const resources = [];
        for (const id of Object.keys(this.urlMap)) {
            if (!this.filter || this.filter(id)) {
                let resMeta = {
                    id,
                    modified: L10nContext.regression ? 1 : new Date().toISOString(),
                    targetLangs: this.targetLangs,
                };
                this.prj && (resMeta.prj = this.prj);
                if (typeof this.resDecorator === 'function') {
                    resMeta = this.resDecorator(resMeta);
                }
                resources.push(resMeta);
            }
        }
        return resources;
    }

    async fetchResource(resourceId) {
        const url = this.urlMap[resourceId];
        L10nContext.logger.verbose(`Fetching ${url}`);
        const response = await fetch(url);
        if (response.ok) {
            return response.text();
        }
        throw `${response.status} ${response.statusText}: ${await response.text()}`;
    }
}
