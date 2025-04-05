import { consoleLog } from '@l10nmonster/core';

export class jobs_update {
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
                const allJobs = await mm.tmm.getJobStatusByLangPair(sourceLang, targetLang);
                const pendingJobs = allJobs.filter(entry => entry[1] === 'pending').map(entry => entry[0]);
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
