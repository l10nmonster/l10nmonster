import { consoleLog } from '../l10nContext.js';

/**
 * @typedef {Object} TmBootstrapOptions
 * @property {string} tmStore - TM store ID
 * @property {boolean} [commit] - Commit changes
 * @property {string} [lang] - Language pair
 * @property {number} [parallelism] - Parallel operations
 */

/**
 * CLI action for bootstrapping a fresh TM database from a TM store.
 * This is a DESTRUCTIVE operation that wipes all existing TM data.
 * @type {import('../../index.js').L10nAction}
 */
export const tm_bootstrap = {
    name: 'tm_bootstrap',
    help: {
        description: 'initializes a fresh TM database from a TM store (DESTRUCTIVE - wipes all existing TM data).',
        arguments: [
            [ '<tmStore>', 'id of the TM Store to bootstrap from' ],
        ],
        options: [
            [ '--commit', 'commit making changes (dry-run by default, required to actually delete data)' ],
            [ '--lang <srcLang,tgtLang>', 'specific language pair to bootstrap' ],
            [ '--parallelism <number>', 'number of parallel operations' ],
        ],
    },

    async action(monsterManager, options) {
        const opts = /** @type {TmBootstrapOptions} */ (options);
        const dryrun = !opts.commit;
        const tmStore = monsterManager.tmm.getTmStore(opts.tmStore);
        if (tmStore.access === 'writeonly') {
            throw new Error(`TM Store ${tmStore.id} is write-only!`);
        }
        let sourceLang, targetLang;
        opts.lang && ([ sourceLang, targetLang ] = opts.lang.split(','));

        consoleLog`\nWARNING: This operation will DELETE ALL existing TM data!`;
        consoleLog`Bootstrapping from ${tmStore.id} store...`;

        const result = await monsterManager.tmm.bootstrap(tmStore, {
            dryrun,
            sourceLang,
            targetLang,
            parallelism: opts.parallelism,
        });

        if (dryrun) {
            consoleLog`\nLanguage pairs to be loaded:`;
            for (const [srcLang, tgtLang] of result.pairs) {
                consoleLog`  - ${srcLang} -> ${tgtLang}`;
            }
            consoleLog`\nThis was just a dryrun, no changes were made!`;
            consoleLog`Use --commit to actually wipe the TM database and load data.`;
        } else {
            consoleLog`\nBootstrap complete:`;
            let totalJobs = 0;
            let totalTus = 0;
            for (const stat of result.stats) {
                consoleLog`  - ${stat.sourceLang} -> ${stat.targetLang}: ${stat.jobCount.toLocaleString()} jobs, ${stat.tuCount.toLocaleString()} TUs`;
                totalJobs += stat.jobCount;
                totalTus += stat.tuCount;
            }
            consoleLog`\nTotal: ${totalJobs.toLocaleString()} jobs, ${totalTus.toLocaleString()} TUs`;
        }

        return result;
    },
};
