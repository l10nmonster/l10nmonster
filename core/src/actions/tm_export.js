import { consoleLog } from '../l10nContext.js';
import { FsJsonlTmStore } from '../helpers/stores/fsTmStores.js';

// eslint-disable-next-line camelcase
export class tm_export {
    static help = {
        description: 'exports jobs to jsonl files.',
        arguments: [
            [ '<jobsDir>', 'directory to export jobs to' ],
        ],
        options: [
            [ '--partitioning <mode>', 'one file per job, provider, or language', [ 'job', 'provider', 'language' ] ],
            [ '--lang <srcLang,tgtLang>', 'source and target language pair' ],
        ],
    };

    static async action(monsterManager, options) {
        let sourceLang, targetLang;
        options.lang && ([ sourceLang, targetLang ] = options.lang.split(','));
        const tmStore = new FsJsonlTmStore({
            id: 'tmexport',
            jobsDir: options.jobsDir,
            partitioning: options.partitioning ?? 'language',
        });
        const syncUpStats = await monsterManager.tmm.syncUp(tmStore, { dryrun: false, sourceLang, targetLang });
        consoleLog`\nExport done`;
        for (const { sourceLang, targetLang, jobsToUpdate } of syncUpStats) {
            consoleLog`  ‣ ${sourceLang} → ${targetLang} ${jobsToUpdate.length} ${[jobsToUpdate.length, 'job', 'jobs']} exported`;
        }
    }
}
