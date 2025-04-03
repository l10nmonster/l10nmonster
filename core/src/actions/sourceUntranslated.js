import { consoleLog } from '@l10nmonster/core';

export class source_untranslated {
    static help = {
        description: 'identifies untranslated source content.',
        options: [
                [ '--push', 'push content to translation vendors' ],
            ]
    };

    static async action(mm, options) {
        consoleLog`Untranslated source content for all language pairs`;
        const jobs = [];
        const langPairs = await mm.rm.getAvailableLangPairs();
        for (const [ sourceLang, targetLang ] of langPairs) {
            const tm = mm.tmm.getTM(sourceLang, targetLang);
            const tus = tm.getUntranslatedContent();
            if (tus.length === 0) {
                consoleLog`  ‣ ${sourceLang} -> ${targetLang}: fully translated`;
            } else {
                consoleLog`  ‣ ${sourceLang} -> ${targetLang}:`;
                const assignedJobs = await mm.dispatcher.createJobs({ sourceLang, targetLang, tus });
                for (const job of assignedJobs) {
                    const formattedCost = job.estimatedCost !== undefined ? mm.currencyFormatter.format(job.estimatedCost) : 'unknown';
                    consoleLog`      • ${job.translationProvider ?? 'No provider available'}: ${job.tus.length.toLocaleString()} ${[job.tus.length, 'segment', 'segments']}, cost: ${formattedCost}`;
                    job.translationProvider && jobs.push(job);
                }
            }
        }
        if (options.push) {
            const jobStatus = await mm.dispatcher.startJobs(jobs);
            consoleLog`Pushed ${jobStatus.length} jobs:`;
            for (const { sourceLang, targetLang, jobGuid, status } of jobStatus) {
                consoleLog`  ${sourceLang} -> ${targetLang}: ${jobGuid}: ${status}`;
            }
        }
    }
}
