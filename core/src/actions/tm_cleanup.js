/* eslint-disable complexity */
import { consoleLog } from '../l10nContext.js';

/**
 * @typedef {Object} TmCleanupOptions
 * @property {boolean} [commit] - Commit changes
 * @property {string} [lang] - Language pair (srcLang,tgtLang)
 * @property {boolean} [emptyJobs] - Delete empty jobs
 * @property {number | string} [maxRank] - Max rank to keep
 * @property {string | boolean} [quality] - Quality levels to delete
 */

/**
 * CLI action for cleaning up local TM cache.
 * @type {import('../../index.js').L10nAction}
 */
export const tm_cleanup = {
    name: 'tm_cleanup',
    help: {
        description: 'cleans up local TM cache.',
        options: [
            [ '--commit', 'commit making changes (dry-run by default)' ],
            [ '--lang <srcLang,tgtLang>', 'source and target language pair' ],
            [ '--emptyJobs', 'delete empty jobs' ],
            [ '--maxRank <number>', 'maximum number of competing translations to keep' ],
            [ '--quality [q1,q2,...]', 'quality levels to delete' ],
        ],
    },

    async action(monsterManager, options) {
        const opts = /** @type {TmCleanupOptions} */ (options);
        const dryrun = !opts.commit;
        let pairs;
        if (opts.lang) {
            pairs = [ opts.lang.split(',') ];
        } else {
            pairs = await monsterManager.tmm.getAvailableLangPairs();
        }
        if (pairs.length === 0) {
            consoleLog`\nNothing in the local TM Cache`;
            return;
        }
        let changes = false;
        let stats = {};
        for (const [ srcLang, tgtLang ] of pairs) {
            consoleLog`${srcLang} → ${tgtLang}`;
            const tm = await monsterManager.tmm.getTM(srcLang, tgtLang);
            stats[srcLang] ??= {};
            stats[srcLang][tgtLang] ??= {};

            // Accumulate TU keys (guid, jobGuid tuples) to delete from various sources
            // Use Map with composite key for deduplication since tuples can't be compared by value in Set
            const tuKeysToDelete = new Map();
            const maxRank = Number(opts.maxRank);

            // Collect TU keys over maxRank
            if (maxRank > 0) {
                const tuKeys = await tm.tuKeysOverRank(maxRank);
                tuKeys.forEach(([guid, jobGuid]) => tuKeysToDelete.set(`${guid}\0${jobGuid}`, [guid, jobGuid]));
                if (tuKeys.length > 0) {
                    stats[srcLang][tgtLang].overRankCount = tuKeys.length;
                    consoleLog`  ‣ ${tuKeys.length.toLocaleString()} ${[tuKeys.length, 'tu', 'tus']} over rank ${maxRank}`;
                }
            }

            // Show quality distribution if --quality flag is provided without values
            if (opts.quality === true) {
                const qualityDistribution = await tm.getQualityDistribution();
                if (qualityDistribution.length > 0) {
                    stats[srcLang][tgtLang].qualityDistribution = qualityDistribution;
                    consoleLog`  ‣ Quality distribution:`;
                    for (const { q, count } of qualityDistribution) {
                        consoleLog`     ${q}: ${count.toLocaleString()} ${[count, 'tu', 'tus']}`;
                    }
                }
            } else if (opts.quality) {
                // Collect TU keys by quality levels
                const qualities = opts.quality.split(',').map(Number);
                for (const quality of qualities) {
                    const tuKeys = await tm.tuKeysByQuality(quality);
                    tuKeys.forEach(([guid, jobGuid]) => tuKeysToDelete.set(`${guid}\0${jobGuid}`, [guid, jobGuid]));
                    if (tuKeys.length > 0) {
                        stats[srcLang][tgtLang].qualityCount ??= 0;
                        stats[srcLang][tgtLang].qualityCount += tuKeys.length;
                        consoleLog`  ‣ ${tuKeys.length.toLocaleString()} ${[tuKeys.length, 'tu', 'tus']} with quality ${quality}`;
                    }
                }
            }

            // Delete all accumulated TU keys in a single operation
            if (tuKeysToDelete.size > 0) {
                changes = true;
                if (dryrun) {
                    stats[srcLang][tgtLang].tusToDelete = tuKeysToDelete.size;
                    consoleLog`  ‣ ${tuKeysToDelete.size.toLocaleString()} ${[tuKeysToDelete.size, 'tu', 'tus']} would be deleted`;
                } else {
                    const { deletedTusCount, touchedJobsCount } = await tm.deleteTuKeys([...tuKeysToDelete.values()]);
                    stats[srcLang][tgtLang].deletedTusCount = deletedTusCount;
                    stats[srcLang][tgtLang].touchedJobsCount = touchedJobsCount;
                    consoleLog`  ‣ ${deletedTusCount.toLocaleString()} ${[deletedTusCount, 'tu', 'tus']} deleted, ${touchedJobsCount.toLocaleString()} ${[touchedJobsCount, 'job', 'jobs']} touched`;
                }
            }

            // Delete empty jobs (only when --emptyJobs is specified)
            if (opts.emptyJobs) {
                const emptyJobs = await tm.deleteEmptyJobs(dryrun);
                if (emptyJobs > 0) {
                    changes = true;
                    stats[srcLang][tgtLang].emptyJobs = emptyJobs;
                    consoleLog`  ‣ ${emptyJobs.toLocaleString()} empty ${[emptyJobs, 'job', 'jobs']} ${dryrun ? 'would be ' : ''}deleted`;
                }
            }
        }
        if (changes) {
            if (dryrun) {
                consoleLog`\nThis was just a dryrun, no changes were made!`;
            } else {
                consoleLog`\nDone!`;
            }
        } else {
            consoleLog`Nothing to cleanup!`;
        }
        return { dryrun, stats };
    },
};
