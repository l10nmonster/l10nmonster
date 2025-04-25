import { consoleLog } from '@l10nmonster/core';

export class ops_list {
    static help = {
        description: 'list unfinished translation jobs.',
    };

    static async action(mm, options) {
        const pairs = await mm.tmm.getAvailableLangPairs();
        if (pairs.length === 0) {
            consoleLog`There are no jobs in the local TM Cache`;
        } else {
            consoleLog`Unfinished translation jobs for each language pair:`;
            for (const [ sourceLang, targetLang ] of pairs) {
                consoleLog`  ‣ ${sourceLang} → ${targetLang}`;
                const allJobs = await mm.tmm.getJobStatusByLangPair(sourceLang, targetLang);
                const jobsByStatus = {};
                for (const [ jobGuid, status ] of allJobs) {
                    if (status !== 'done') {
                        jobsByStatus[status] ??= [];
                        jobsByStatus[status].push(jobGuid);
                    }
                }
                if (Object.keys(jobsByStatus).length === 0) {
                    consoleLog`      • No unifished jobs`;
                } else {
                    for (const [ status, jobGuids ] of Object.entries(jobsByStatus)) {
                        consoleLog`      • ${status}: ${jobGuids.join(', ')}`;
                    }
                }
            }
        }
    }
}
