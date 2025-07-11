import { getRegressionMode, logInfo, logVerbose, logError } from '../../l10nContext.js';

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
            throw new Error('You must specify urlMap and sourceLang in HttpSource');
        } else {
            this.urlMap = urlMap;
            this.sourceLang = sourceLang;
            this.prj = prj;
            this.filter = filter;
            this.resDecorator = resDecorator;
        }
    }

    /**
     * Fetches all resources defined in the urlMap.
     * Yields an array for each resource: [resourceMeta, resourceContent].
     * The `modified` date in resourceMeta is a placeholder as HTTP servers
     * don't reliably provide this information in a standardized way for this context.
     * @returns {AsyncGenerator<[Object, string]>} An async generator yielding resource metadata and content.
     */
    async *fetchAllResources() {
        logInfo`HttpSource: Fetching all resources from urlMap`;
        for (const [id, url] of Object.entries(this.urlMap)) {
            if (this.filter && !this.filter(id)) {
                logVerbose`HttpSource: Filtered out resource ${id} (URL: ${url}) due to filter function`;
                continue;
            }

            let resMeta = {
                id,
                sourceLang: this.sourceLang,
                // This remains a placeholder, as HTTP headers like Last-Modified or ETag
                // are not consistently available or easily parsed into a simple timestamp here.
                modified: getRegressionMode() ? 1 : new Date().toISOString(),
            };
            this.prj && (resMeta.prj = this.prj);
            if (typeof this.resDecorator === 'function') {
                resMeta = this.resDecorator(resMeta);
            }

            try {
                logVerbose`HttpSource: Fetching ${url} for resource ID ${id}`;
                const response = await fetch(url);
                if (response.ok) {
                    const content = await response.text();
                    yield [resMeta, content];
                    logVerbose`HttpSource: Yielded resource ${id} from ${url}`;
                } else {
                    const errorText = await response.text();
                    logError`HttpSource: Failed to fetch ${url} (ID: ${id}) - ${response.status} ${response.statusText}: ${errorText}`;
                    // Optionally, rethrow or yield an error object
                    // For now, logging and skipping to the next resource
                }
            } catch (error) {
                logError`HttpSource: Network or other error fetching ${url} (ID: ${id}): ${error.message}`;
                // Optionally, rethrow or yield an error object
            }
        }
        logInfo`HttpSource: Finished fetching all resources from urlMap`;
    }
}
