import { writeFileSync } from 'fs';
import { consoleLog } from '@l10nmonster/core';

export class source_untranslated {
    static help = {
        description: 'identifies untranslated source content.',
        options: [
                [ '--provider <name,...>', 'use the specified providers' ],
                [ '--push', 'push content to translation vendors' ],
                [ '--statusFile <filename>', 'write status to the specified file' ],
                [ '--instructions <instructions>', 'job-specific instructions' ],
            ]
    };

    static async action(mm, options) {
        consoleLog`Untranslated source content for all language pairs`;
        const jobs = [];
        const status = {};
        const langPairs = await mm.rm.getAvailableLangPairs();
        for (const [ sourceLang, targetLang ] of langPairs) {
            status[targetLang] ??= {};
            status[targetLang][sourceLang] = {};
            const tm = mm.tmm.getTM(sourceLang, targetLang);
            const tus = tm.getUntranslatedContent();
            if (tus.length === 0) {
                consoleLog`  ‣ ${sourceLang} -> ${targetLang}: fully translated`;
            } else {
                consoleLog`  ‣ ${sourceLang} -> ${targetLang}:`;
                const providerList = options.provider && (Array.isArray(options.provider) ? options.provider : options.provider.split(','));
                const assignedJobs = await mm.dispatcher.createJobs({ sourceLang, targetLang, tus, providerList });
                for (const job of assignedJobs) {
                    const formattedCost = job.estimatedCost !== undefined ? mm.currencyFormatter.format(job.estimatedCost) : 'unknown';
                    consoleLog`      • ${job.translationProvider ?? 'No provider available'}: ${job.tus.length.toLocaleString()} ${[job.tus.length, 'segment', 'segments']}, cost: ${formattedCost}`;
                    status[targetLang][sourceLang][job.translationProvider] = { segments: job.tus.length, cost: job.estimatedCost };
                    job.translationProvider && jobs.push(job);
                }
            }
        }
        if (options.statusFile) {
            writeFileSync(options.statusFile, JSON.stringify(status, null, '\t'), 'utf8');
        }
        if (options.push) {
            const jobStatus = await mm.dispatcher.startJobs(jobs, { instructions: options.instructions });
            consoleLog`Pushed ${jobStatus.length} jobs:`;
            for (const { sourceLang, targetLang, jobGuid, status } of jobStatus) {
                consoleLog`  ${sourceLang} -> ${targetLang}: ${jobGuid} (${status})`;
            }
        }
    }
}
