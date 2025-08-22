import { BigQuery } from '@google-cloud/bigquery';
import { logInfo, logVerbose } from '@l10nmonster/core';

function decodeSqlResponse(segmentOrSubresource) {
    if (segmentOrSubresource.notes === null) {
        delete segmentOrSubresource.notes;
    }
    Object.keys(segmentOrSubresource).filter(k => k.endsWith('_objEntries')).forEach(k => {
        const parsedValue = segmentOrSubresource[k] && JSON.parse(segmentOrSubresource[k]);
        parsedValue && (segmentOrSubresource[k.substring(0, k.length - 11)] = Object.fromEntries(parsedValue));
        delete segmentOrSubresource[k];
    });
}

export class BQSource {
    #projectId;
    #query;
    #location;
    #resourceFormat;
    #bundleDecorator;

    /**
     * Initializes a new instance of the BQSource class.
     * @param {Object} options - BQSource filter options.
     * @param {string} options.projectId - GCP project ID.
     * @param {function} options.query - The SQL query template returning MNFv1-compliant bundles.
     * @param {string} [options.location] - GCP datacenter location (US by default).
     * @param {function} [options.bundleDecorator] - Optional manipulator of bundles returned by query.
     * @param {string} [options.resourceFormat] - The resource format (MNFv1 by default)
     */
    constructor({projectId, query, bundleDecorator, resourceFormat, location }) {
        if (!query) {
            throw new Error('You must specify query for BQSource');
        }
        this.#projectId = projectId;
        this.#query = query;
        this.#location = location ?? 'US';
        this.#resourceFormat = resourceFormat ?? 'MNFv1';
        this.#bundleDecorator = bundleDecorator;
    }

    /**
    * @param {Object} [options] - The parameters for the constructor.
    * @param {Array|string} [options.prj] - Only fetch the specified projects.
    * @param {string} [options.since] - Only fetch resources last modified since.
     */
    async *fetchAllResources({ since } = {}) {
        logInfo`\nFetching resources from BQ...`;
        const options = this.#projectId ? { projectId: this.#projectId } : {};
        const bigquery = new BigQuery(options);
        const query = this.#query({ since });
        const [ job ] = await bigquery.createQueryJob({ query, location: this.#location });
        logInfo`BQ Job ${job.id} started (principal: ${job.metadata.principal_subject}) -- ${job.metadata?.status?.state}`;

        let bundleCount = 0;
        for await (let bundle of job.getQueryResultsStream()) {
            bundleCount++;
            bundleCount % 500 === 1 && logVerbose`bundle #${bundleCount} fetched`;
            this.#bundleDecorator && (bundle = this.#bundleDecorator(bundle));
            const { segments, subresources, ...header } = bundle;
            segments && segments.forEach(decodeSqlResponse);
            subresources && subresources.forEach(decodeSqlResponse);
            header.resourceFormat ??= this.#resourceFormat;
            yield [ header, JSON.stringify({ segments, subresources }) ];
        }
    }
}
