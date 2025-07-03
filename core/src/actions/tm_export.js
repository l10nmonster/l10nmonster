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
        const tmStore = new FsJsonlTmStore({
            id: 'tmexport',
            jobsDir: options.jobsDir,
            partitioning: options.partitioning ?? 'language',
        });
        let jobsWritten = 0;
        const exportPair = async (srcLang, tgtLang) => {
            const syncUpStats = await monsterManager.tmm.prepareSyncUp(tmStore, srcLang, tgtLang);
            jobsWritten += syncUpStats.jobsToUpdate.length;
            await monsterManager.tmm.syncUp(tmStore, syncUpStats);
        };
        if (options.lang) {
            const [ srcLang, tgtLang ] = options.lang.split(',');
            await exportPair(srcLang, tgtLang);
        } else {
            const pairs = await monsterManager.tmm.getAvailableLangPairs();
            for (const [ srcLang, tgtLang ] of pairs) {
                await exportPair(srcLang, tgtLang);
            }
        }
        consoleLog`\nExport done. Jobs written: ${jobsWritten}`;
    }
}
