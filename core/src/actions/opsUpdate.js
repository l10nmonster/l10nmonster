import { consoleLog } from '../l10nContext.js';

export class ops_update {
    static help = {
        description: 'update pending translation jobs.',
    };

    static async action(mm, options) {
        const pairs = await mm.tmm.getAvailableLangPairs();
        if (pairs.length === 0) {
            consoleLog`There are no jobs in the local TM Cache`;
        } else {
            consoleLog`Updating pending translation jobs:`;
            for (const [ sourceLang, targetLang ] of pairs) {
                consoleLog`  ‣ ${sourceLang} → ${targetLang}`;
                const allJobs = await mm.tmm.getJobTOCByLangPair(sourceLang, targetLang);
                const pendingJobs = allJobs.filter(({ status }) => status === 'pending').map(({ jobGuid }) => jobGuid);
                if (pendingJobs.length === 0) {
                    consoleLog`      • No pending jobs`;
                } else {
                    for (const jobGuid of pendingJobs) {
                        const job = await mm.dispatcher.updateJob(jobGuid);
                        consoleLog`      • Job ${jobGuid} (${job.translationProvider}): ${job.status}`;
                    }
                }
            }
        }
    }
}
