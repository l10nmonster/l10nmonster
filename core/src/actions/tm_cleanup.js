/* eslint-disable complexity */
import { consoleLog } from '../l10nContext.js';

export class tm_cleanup {
    static help = {
        description: 'cleans up local TM cache.',
        options: [
            [ '--commit', 'commit making changes (dry-run by default)' ],
            [ '--lang <srcLang,tgtLang>', 'source and target language pair' ],
            [ '--maxRank <number>', 'maximum number of competing translations to keep' ],
            [ '--quality [q1,q2,...]', 'quality levels to delete' ],
        ],
    };

    static async action(monsterManager, options) {
        const dryrun = !options.commit;
        let pairs;
        if (options.lang) {
            pairs = [ options.lang.split(',') ];
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
            const emptyJobs = await tm.deleteEmptyJobs(dryrun);
            if (emptyJobs > 0) {
                changes = true;
                stats[srcLang][tgtLang].emptyJobs = emptyJobs;
                consoleLog`  ‣ ${emptyJobs.toLocaleString()} ${[emptyJobs, 'job', 'jobs']} ${dryrun ? 'would be ' : ''}deleted`;
            }
            const maxRank = Number(options.maxRank);
            if (maxRank > 0) {
                const overRank = await tm.deleteOverRank(dryrun, maxRank);
                if (overRank > 0) {
                    changes = true;
                    stats[srcLang][tgtLang].overRank = overRank;
                    consoleLog`  ‣ ${overRank.toLocaleString()} ${[overRank, 'tu', 'tus']} ${dryrun ? 'would be ' : ''}deleted as rank is over ${maxRank}`;
                }
            }
            if (options.quality === true) {
                const qualityDistribution = await tm.getQualityDistribution();
                if (qualityDistribution.length > 0) {
                    stats[srcLang][tgtLang].qualityDistribution = qualityDistribution;
                    consoleLog`  ‣ Quality distribution:`;
                    for (const { q, count } of qualityDistribution) {
                        consoleLog`     ${q}: ${count.toLocaleString()} ${[count, 'tu', 'tus']}`;
                    }
                }
            } else if (options.quality) {
                const qualities = options.quality.split(',').map(Number);
                for (const quality of qualities) {
                    const byQuality = await tm.deleteByQuality(dryrun, quality);
                    if (byQuality > 0) {
                        changes = true;
                        stats[srcLang][tgtLang].byQuality ??= 0;
                        stats[srcLang][tgtLang].byQuality += byQuality;
                        consoleLog`  ‣ ${byQuality.toLocaleString()} ${[byQuality, 'tu', 'tus']} ${dryrun ? 'would be ' : ''}deleted as quality is ${quality}`;
                    }
                }
            }
            if (changes && !dryrun) {
                const emptyJobs = await tm.deleteEmptyJobs(false);
                if (emptyJobs > 0) {
                    stats[srcLang][tgtLang].cleanupEmptyJobs = emptyJobs;
                    consoleLog`  ‣ ${emptyJobs.toLocaleString()} ${[emptyJobs, 'job', 'jobs']} deleted after cleanup`;
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
    }
}
