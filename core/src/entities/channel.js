import { L10nContext } from '@l10nmonster/core';
import { ResourceHandle } from './resourceHandle.js';

export class Channel {
    #id;
    #source;
    #formatHandlers;
    #defaultResourceFormat;
    #target;
    #translationPolicyPipeline;

    constructor({ id, source, formatHandlers, defaultResourceFormat, target, translationPolicyPipeline }) {
        this.#id = id;
        this.#source = source;
        this.#formatHandlers = formatHandlers;
        this.#defaultResourceFormat = defaultResourceFormat;
        this.#target = target;
        this.#translationPolicyPipeline = translationPolicyPipeline;
    }

    makeResourceHandleFromHeader(resourceHeader) {
         // sources can provide resources of different formats but we have a default
        const resourceFormat = resourceHeader.resourceFormat ?? this.#defaultResourceFormat;
        const formatHandler = this.#formatHandlers[resourceFormat];
        if (!resourceHeader.sourceLang) {
            throw `Missing sourceLang in resource handle: ${JSON.stringify(resourceHeader)}`;
        }
        return new ResourceHandle({
            channel: this.#id,
            resourceFormat: this.#defaultResourceFormat,
            formatHandler,
            ...resourceHeader,
        });
    }

    async #makeFullResourceWithPolicyApplied(resourceHeader, rawResource) {
        const handle = this.makeResourceHandleFromHeader(resourceHeader);
        await handle.loadResourceFromRaw(rawResource, { isSource: true });
        const targetLangs = new Set();
        const stats = {};
        const getStatsKey = translationPlan => Object.entries(translationPlan).map(([targetLang, q]) => `${targetLang}:${q}`).sort().join(',');
        for (const segment of handle.segments) {
            const policyContext = { plan: {}, seg: segment, res: handle };
            this.#translationPolicyPipeline.forEach(policy => {
                const newPlan = policy(policyContext);
                if (newPlan) {
                    policyContext.plan = newPlan;
                } else {
                    throw new Error(`got nothing from policy ${policy} for resource ${segment.rid} segment ${segment.sid}`);
                }
            });
            segment.plan = policyContext.plan;
            Object.keys(policyContext.plan).forEach(targetLang => targetLangs.add(targetLang));
            const statsKey = getStatsKey(policyContext.plan);
            stats[statsKey] ??= 0;
            stats[statsKey]++;
        }
        const defaultPlanKey = Object.entries(stats).sort((a, b) => b[1] - a[1])[0][0];
        let plan = {};
        for (const segment of handle.segments) {
            const statsKey = getStatsKey(segment.plan);
            if (statsKey === defaultPlanKey) {
                plan = segment.plan;
                delete segment.plan;
            }
        }
        handle.plan = plan;
        handle.targetLangs = Array.from(targetLangs).sort();
        return handle;
    }

    // async getResourceHandles() {
    //     const resStats = await this.#source.fetchResourceStats();
    //     L10nContext.logger.verbose(`Fetched resource handles for channel ${this.#id}`);
    //     return resStats.map(rs => this.makeResourceHandleFromHeader(rs));
    // }

    async *getAllNormalizedResources() {
        if (this.#source.fetchAllResources) { // some sources support batching
            for await (const [resourceHeader, rawResource] of this.#source.fetchAllResources(L10nContext.prj)) {
                yield this.#makeFullResourceWithPolicyApplied(resourceHeader, rawResource);
            }
        } else {
            const resourceHeaders = await this.#source.fetchResourceStats();
            for (const resourceHeader of resourceHeaders) {
                const rawResource = await this.#source.fetchResource(resourceHeader.id);
                yield this.#makeFullResourceWithPolicyApplied(resourceHeader, rawResource);
            }
        }
    }

    // async loadResource(resourceHandle) {
    //     const rawResource = await this.#source.fetchResource(resourceHandle.id);
    //     return resourceHandle.loadResourceFromRaw(rawResource, { isSource: true });
    // }

    async getExistingTranslatedResource(resourceHandle, targetLang) {
        const rawResource = await this.#target.fetchTranslatedResource(targetLang, resourceHandle.id);
        const translatedResource = this.makeResourceHandleFromHeader(resourceHandle);
        return translatedResource.loadResourceFromRaw(rawResource, { isSource: false });
    }

    async commitTranslatedResource(targetLang, resourceId, rawResource) {
        const translatedResourceId = this.#target.translatedResourceId(targetLang, resourceId);
        await this.#target.commitTranslatedResource(targetLang, resourceId, rawResource);
        return translatedResourceId;
    }

}
