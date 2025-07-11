import { writeFileSync } from 'fs';
import { consoleLog } from '../l10nContext.js';
import { printRequest } from './shared.js';

export class source_untranslated {
    static help = {
        description: 'identifies untranslated source content.',
        options: [
            [ '--lang <srcLang,tgtLang>', 'source and target language pair' ],
            [ '--provider [name,...]', 'use the specified providers' ],
            [ '--push', 'push content to providers' ],
            [ '--instructions <instructions>', 'job-specific instructions' ],
            [ '--statusFile <filename>', 'write status to the specified file' ],
            [ '--outFile <filename>', 'write output to the specified file' ],
            [ '--print', 'print jobs to console' ],
        ]
    };

    static async action(mm, options) {
        const provider = typeof options.provider === 'string' ? options.provider.split(',') : options.provider; // could be an array or a boolean
        consoleLog`Untranslated source content:`;
        const jobs = [];
        const status = {};
        const langPairs = options.lang ? [ options.lang.split(',') ] : await mm.rm.getAvailableLangPairs();
        for (const [ sourceLang, targetLang ] of langPairs) {
            status[targetLang] ??= {};
            status[targetLang][sourceLang] = {};
            const tm = mm.tmm.getTM(sourceLang, targetLang);
            const tus = tm.getUntranslatedContent();
            if (tus.length === 0) {
                consoleLog`  ‣ ${sourceLang} → ${targetLang}: fully translated`;
            } else {
                if (provider) {
                    consoleLog`  ‣ ${sourceLang} → ${targetLang}:`;
                    const assignedJobs = await mm.dispatcher.createJobs({ sourceLang, targetLang, tus, providerList: provider === true ? undefined : provider });
                    for (const job of assignedJobs) {
                        const formattedCost = job.estimatedCost !== undefined ? mm.currencyFormatter.format(job.estimatedCost) : 'unknown';
                        // TODO: show strings/words/chars totals
                        consoleLog`      • ${job.translationProvider ?? 'No provider available'}: ${job.tus.length.toLocaleString()} ${[job.tus.length, 'segment', 'segments']}, cost: ${formattedCost}`;
                        status[targetLang][sourceLang][job.translationProvider] = { segments: job.tus.length, cost: job.estimatedCost };
                        job.translationProvider && jobs.push(job);
                        options.print && printRequest(job);
                    }
                } else {
                    jobs.push({ sourceLang, targetLang, tus });
                    consoleLog`  ‣ ${sourceLang} → ${targetLang}: ${tus.length.toLocaleString()} ${[tus.length, 'segment', 'segments']}`;
                    // TODO: show strings/words/chars totals
                    // TODO: add option to show breakdown by channel/prj
                }
            }
        }
        if (options.statusFile) {
            if (!provider) {
                throw new Error(`\nYou must specify providers to write a status file!`);
            } else {
                writeFileSync(options.statusFile, JSON.stringify(status, null, '\t'), 'utf8');
                consoleLog`\nStatus file written to ${options.statusFile}`;
            }
        }
        if (options.outFile) {
            writeFileSync(options.outFile, JSON.stringify(jobs, null, '\t'), 'utf8');
            consoleLog`\nJobs written to ${options.outFile}`;
        }
        if (options.push) {
            if (!provider) {
                throw new Error(`\nYou must specify providers to push!`);
            } else {
                consoleLog`\nPushing content to providers...`;
                const jobStatus = await mm.dispatcher.startJobs(jobs, { instructions: options.instructions });
                consoleLog`Pushed ${jobStatus.length} jobs:`;
                for (const { sourceLang, targetLang, jobGuid, translationProvider, status } of jobStatus) {
                    consoleLog`  ${sourceLang} → ${targetLang}: ${translationProvider}(${jobGuid}) → ${status}`;
                }
            }
        }
        return jobs;
    }
}
