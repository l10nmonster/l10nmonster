/* eslint-disable complexity */
import { writeFileSync } from 'fs';
import { consoleLog, logWarn } from '../l10nContext.js';
import { printRequest } from './shared.js';

/**
 * @typedef {Object} SourceUntranslatedOptions
 * @property {string} [lang] - Language pair (srcLang,tgtLang)
 * @property {string | string[]} [channel] - Channel ID(s)
 * @property {string | string[]} [prj] - Project ID(s)
 * @property {string | string[] | boolean} [provider] - Provider(s)
 * @property {number} [limit] - Segment limit
 * @property {boolean} [push] - Push to providers
 * @property {string} [instructions] - Job instructions
 * @property {string} [statusFile] - Status output file
 * @property {string} [outFile] - Output file
 * @property {string | boolean} [print] - Print verbosity
 */

/**
 * CLI action for identifying untranslated source content.
 * @type {import('../../index.js').L10nAction}
 */
export const source_untranslated = {
    name: 'source_untranslated',
    help: {
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
    },

    async action(mm, options) {
        const opts = /** @type {SourceUntranslatedOptions} */ (options);
        const channels = opts.channel ? (Array.isArray(opts.channel) ? opts.channel : opts.channel.split(',')) : mm.rm.channelIds;
        const prj = opts.prj ? (Array.isArray(opts.prj) ? opts.prj : opts.prj.split(',')) : undefined;
        if (Array.isArray(prj) && channels.length > 1) {
            throw new Error('Cannot specify projects with more than one channel');
        }

        const provider = typeof opts.provider === 'string' ? opts.provider.split(',') : opts.provider; // could be an array or a boolean
        const jobs = [];
        const status = {};
        for (const channelId of channels) {
            consoleLog`Untranslated source content for channel ${channelId}:`;
            const langPairs = opts.lang ? [ opts.lang.split(',') ] : await mm.rm.getDesiredLangPairs(channelId);
            for (const [ sourceLang, targetLang ] of langPairs) {
                status[targetLang] ??= {};
                status[targetLang][sourceLang] ??= {};
                const tm = mm.tmm.getTM(sourceLang, targetLang);
                const tus = await tm.getUntranslatedContent(channelId, { limit: opts.limit ?? 5000, prj });
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
                            const print = Boolean(opts.print) && !(opts.print === 'unassigned' && job.translationProvider);
                            print && printRequest(job, 10, opts.print === 'detailed');
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
        if (opts.statusFile) {
            if (!provider) {
                throw new Error(`\nYou must specify providers to write a status file!`);
            } else {
                writeFileSync(opts.statusFile, JSON.stringify(status, null, '\t'), 'utf8');
                consoleLog`\nStatus file written to ${opts.statusFile}`;
            }
        }
        if (opts.outFile) {
            writeFileSync(opts.outFile, JSON.stringify(jobs, null, '\t'), 'utf8');
            consoleLog`\nJobs written to ${opts.outFile}`;
        }
        if (opts.push) {
            if (!provider) {
                throw new Error(`\nYou must specify providers to push!`);
            } else {
                consoleLog`\nPushing content to providers...`;
                const jobStatus = await mm.dispatcher.startJobs(/** @type {import('../../index.js').Job[]} */ (jobs), { instructions: opts.instructions });
                consoleLog`Pushed ${jobStatus.length} jobs:`;
                for (const { sourceLang, targetLang, jobGuid, translationProvider, status } of jobStatus) {
                    consoleLog`  ${sourceLang} → ${targetLang}: ${translationProvider}(${jobGuid}) → ${status}`;
                }
            }
        }
        return jobs;
    },
};
