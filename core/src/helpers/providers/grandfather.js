import { logVerbose, logWarn } from '../../l10nContext.js';
import { TU } from '../../entities/tu.js';
import { utils } from '../index.js';
import { BaseTranslationProvider } from './baseTranslationProvider.js';

/**
 * @typedef {import('../../interfaces.js').Job} Job
 * @typedef {import('../../interfaces.js').TU} TUType
 */

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
     * @param {Record<string, string[]>} [options.supportedPairs] - Supported pairs for the provider.
     * @param {number} options.quality - The quality to assign grandfathered translations.
     */
    constructor(options) {
        if (!options.quality) {
            throw new Error('You must specify quality for Grandfather');
        }
        super(options);
    }

    /**
     * Gets TUs that can be grandfathered from existing translations.
     * @param {Job} job - The job to process.
     * @returns {Promise<TUType[]>} Array of matched TUs with grandfathered translations.
     */
    async getAcceptedTus(job) {
        const matchedTus = [];
        const txCache = {};
        const resourceHandles = [];
        for (const tu of job.tus) {
            const channelId = tu.channel;
            if (!channelId) {
                logWarn`Grandfather: tu ${tu.guid} has no channel so it can't be looked up`;
                continue;
            }
            resourceHandles[tu.rid] ??= await this.mm.rm.getResourceHandle(channelId, tu.rid);
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
        return matchedTus;
    }
}
