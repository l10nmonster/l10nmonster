import got from 'got';

export class HttpSource {
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
                    modified: this.ctx.regression ? 1 : new Date().toISOString(),
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
        this.ctx.logger.verbose(`Fetching ${url}`);
        return got.get(url).text();
    }
}
