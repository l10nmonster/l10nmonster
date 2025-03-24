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
     * @param {string} params.sourceLang - The source languages for the resources.
     * @param {string} [params.prj] - The project identifier associated with the resources.
     * @param {Function} [params.filter] - A function to filter resources based on their IDs.
     * @param {Function} [params.resDecorator] - A function to decorate resource metadata.
     * @throws {string} Throws an error if `urlMap` or `sourceLang` (directly or via `resDecorator`) is not provided.
     */
    constructor({ urlMap, sourceLang, prj, filter, resDecorator }) {
        if (urlMap === undefined || sourceLang === undefined) {
            throw 'You must specify urlMap and sourceLang in HttpSource';
        } else {
            this.urlMap = urlMap;
            this.sourceLang = sourceLang;
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
                    sourceLang: this.sourceLang,
                    modified: L10nContext.regression ? 1 : new Date().toISOString(),
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
