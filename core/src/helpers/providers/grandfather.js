import { TU, utils, logVerbose } from '@l10nmonster/core';
import { BaseTranslationProvider } from './baseTranslationProvider.js';

/**
 * This provider implements reuse of exact matches against the TM and other segments in the same request (aka internal leverage).
 * It supports a penalty factor based on matching the same id (aka qualified) or not (aka unqualified) and whether the notes match.
 * The assigned quality of the reused string is equal to the original one minus the corresponding penalty.
 */
export class Grandfather extends BaseTranslationProvider {
    /**
     * Initializes a new instance of the Grandfather class.
     * @param {Object} options - The parameters for the constructor.
     * @param {string} [options.id] - Global identifier for the provider.
     * @param {Object} [options.supportedPairs] - Supported pairs for the provider.
     * @param {number} options.quality - The quality to assign grandfathered translations.
     */
    constructor(options) {
        if (!options.quality) {
            throw new Error('You must specify quality for Grandfather');
        }
        super(options);
    }

    async create(job) {
        logVerbose`Grandfather provider creating job`;
        job = await super.create(job);
        if (job.status === 'created' && job.tus.length > 0) {
            const matchedTus = [];
            const txCache = {};
            const resourceHandles = [];
            for (const tu of job.tus) {
                resourceHandles[tu.rid] ??= await this.mm.rm.getResourceHandle(tu.rid);
                const resHandle = resourceHandles[tu.rid];
                if (!txCache[tu.rid]) {
                    if (resHandle) {
                        try {
                            const resourceToGrandfather = await this.mm.rm.getChannel(resHandle.channel).getExistingTranslatedResource(resHandle, job.targetLang);
                            txCache[tu.rid] = Object.fromEntries(resourceToGrandfather.segments.map(seg => [ seg.sid, seg ]));
                        } catch (e) {
                            logVerbose`Couldn't fetch translated resource: ${e}`;
                            txCache[tu.rid] = {};
                        }
                    }
                }
                const previousTranslation = txCache[tu.rid][tu.sid];
                if (previousTranslation !== undefined) {
                    const previousTU = TU.fromSegment(resHandle, previousTranslation);
                    if (utils.sourceAndTargetAreCompatible(tu.nsrc, previousTU.nsrc)) {
                        const modified = new Date(resHandle.modified).getTime();
                        const ts = isNaN(modified) ? 1 : modified; // regression mode may cause date to be NaN
                        matchedTus.push({
                            ...tu,
                            guid: tu.guid,
                            ntgt: previousTU.nsrc,
                            ts,
                            q: this.quality,
                        });
                    } else {
                        logVerbose`Grandfather: could not reuse previous ${job.targetLang} translation ${tu.rid} - ${tu.sid} as it's incompatible`;
                    }
                }
            }
            return { ...job, status: matchedTus.length > 0 ? 'created' : 'cancelled', tus: matchedTus };
        }
        return job;
    }
}
