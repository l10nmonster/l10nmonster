/* eslint-disable complexity */
import { writeFileSync } from 'fs';
import { consoleLog, logWarn } from '../l10nContext.js';
import { printRequest } from './shared.js';

export class source_untranslated {
    static help = {
        description: 'identifies untranslated source content.',
        options: [
            [ '--lang <srcLang,tgtLang>', 'source and target language pair' ],
            [ '--channel <channel1,...>', 'limit translations to specified channels' ],
            [ '--prj <prj1,...>', 'limit translations to specified projects' ],
            [ '--provider [name,...]', 'use the specified providers' ],
            [ '--limit <limit>', 'limit the number of untranslated segments to fetch (5000 by default)' ],
            [ '--push', 'push content to providers' ],
            [ '--instructions <instructions>', 'job-specific instructions' ],
            [ '--statusFile <filename>', 'write status to the specified file' ],
            [ '--outFile <filename>', 'write output to the specified file' ],
            [ '--print [verbosity]', 'print jobs to console (basic, detailed, unassigned)', [ 'basic', 'detailed', 'unassigned' ] ],
        ]
    };

    static async action(mm, options) {
        const channels = options.channel ? (Array.isArray(options.channel) ? options.channel : options.channel.split(',')) : mm.rm.channelIds;
        const prj = options.prj ? (Array.isArray(options.prj) ? options.prj : options.prj.split(',')) : undefined;
        if (Array.isArray(prj) && channels.length > 1) {
            throw new Error('Cannot specify projects with more than one channel');
        }

        const provider = typeof options.provider === 'string' ? options.provider.split(',') : options.provider; // could be an array or a boolean
        const jobs = [];
        const status = {};
        for (const channelId of channels) {
            consoleLog`Untranslated source content for channel ${channelId}:`;
            const langPairs = options.lang ? [ options.lang.split(',') ] : await mm.rm.getDesiredLangPairs(channelId);            
            for (const [ sourceLang, targetLang ] of langPairs) {
                status[targetLang] ??= {};
                status[targetLang][sourceLang] ??= {};
                const tm = mm.tmm.getTM(sourceLang, targetLang);
                const tus = await tm.getUntranslatedContent(channelId, { limit: options.limit ?? 5000, prj });
                if (tus.length === 0) {
                    consoleLog`  ‣ ${sourceLang} → ${targetLang}: fully translated`;
                } else {
                    if (provider) {
                        consoleLog`  ‣ ${sourceLang} → ${targetLang}:`;
                        const assignedJobs = await mm.dispatcher.createJobs({ sourceLang, targetLang, tus }, { providerList: provider === true ? undefined : provider });
                        for (const job of assignedJobs) {
                            const formattedCost = job.estimatedCost !== undefined ? mm.currencyFormatter.format(job.estimatedCost) : 'unknown';
                            // TODO: show strings/words/chars totals
                            consoleLog`      • ${job.translationProvider ?? 'No provider available'}: ${job.tus.length.toLocaleString()} ${[job.tus.length, 'segment', 'segments']}, cost: ${formattedCost}`;
                            status[targetLang][sourceLang][job.translationProvider] ??= { segments: 0, cost: 0 };
                            status[targetLang][sourceLang][job.translationProvider].segments += job.tus.length;
                            status[targetLang][sourceLang][job.translationProvider].cost += job.estimatedCost;
                            if (job.translationProvider) {
                                jobs.push(job);
                            } else {
                                logWarn`${job.tus.length.toLocaleString()} ${[job.tus.length, 'segment', 'segments']} have no provider available for ${sourceLang} → ${targetLang} translation`;
                            }
                            const print = Boolean(options.print) && !(options.print === 'unassigned' && job.translationProvider);
                            print && printRequest(job, 10, options.print === 'detailed');
                        }
                    } else {
                        jobs.push({ sourceLang, targetLang, tus });
                        consoleLog`  ‣ ${sourceLang} → ${targetLang}: ${tus.length.toLocaleString()} ${[tus.length, 'segment', 'segments']}`;
                        // TODO: show strings/words/chars totals
                        // TODO: add option to show breakdown by channel/prj
                    }
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
