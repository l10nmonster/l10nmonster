import { writeFileSync } from 'fs';
import { consoleLog } from '../l10nContext.js';
import { printRequest } from './shared.js';

/**
 * @typedef {Object} SourceQueryOptions
 * @property {string} lang - Language pair (srcLang,tgtLang)
 * @property {string | string[]} [channel] - Channel ID(s)
 * @property {string | string[]} [provider] - Provider name(s)
 * @property {boolean} [push] - Push to providers
 * @property {boolean} [skipQualityCheck] - Skip quality check
 * @property {boolean} [skipGroupCheck] - Skip group check
 * @property {string} [instructions] - Job instructions
 * @property {string} [outFile] - Output filename
 * @property {boolean} [print] - Print to console
 * @property {string} [whereCondition] - SQL where condition
 */

/**
 * CLI action for querying sources.
 * @type {import('../../index.js').L10nAction}
 */
export const source_query = {
    name: 'source_query',
    help: {
        summary: `query sources in the local cache.`,
        description: `query sources in the local cache.

You can write your own where conditions against the following columns:
  - prj          Project id
  - rid          Resource id
  - sid          Segment id
  - guid         Segment guid
  - nsrc         Normalized source
  - minQ         Desired minimum quality
  - ntgt         Normalized translation (if available)
  - q            Quality score (if translation is available)
  - notes        Notes object (if any)
  - mf           Message format id
  - segProps     Non-standard segment properties object (if any)
  - words        Word count
  - chars        Character count`,
        arguments: [
            [ '[whereCondition]', 'where condition against sources' ],
        ],
        requiredOptions: [
            [ '--lang <srcLang,tgtLang>', 'source and target language pair' ],
        ],
        options: [
            [ '--channel <channel1,...>', 'limit to specified channels' ],
            [ '--provider <name,...>', 'use the specified providers' ],
            [ '--push', 'push content to providers' ],
            [ '--skipQualityCheck', 'skip quality check' ],
            [ '--skipGroupCheck', 'skip group check' ],
            [ '--instructions <instructions>', 'job-specific instructions' ],
            [ '--outFile <filename>', 'write output to the specified file' ],
            [ '--print', 'print jobs to console' ],
        ]
    },

    async action(mm, options) {
        const opts = /** @type {SourceQueryOptions} */ (options);
        const [ sourceLang, targetLang ] = opts.lang.split(',');
        consoleLog`Custom query of source content and associated ${sourceLang} → ${targetLang} translations...\n### WARNING: because of potential sql injection attacks, don't use this unless you know what you're doing! ###`;
        if (!targetLang) {
            throw new Error('Missing target language');
        }
        const channels = opts.channel ? (Array.isArray(opts.channel) ? opts.channel : opts.channel.split(',')) : mm.rm.channelIds;
        const jobs = [];
        const tm = mm.tmm.getTM(sourceLang, targetLang);
        const tus = [];
        for (const channelId of channels) {
            const channelTus = await tm.querySource(channelId, opts.whereCondition ?? 'true');
            tus.push(...channelTus);
        }
        if (tus.length === 0) {
            consoleLog`No content returned`;
        } else {
            consoleLog`  ‣ ${sourceLang} → ${targetLang}:`;
            const providerList = opts.provider && (Array.isArray(opts.provider) ? opts.provider : opts.provider.split(','));
            const assignedJobs = await mm.dispatcher.createJobs({ sourceLang, targetLang, tus }, { providerList, skipQualityCheck: opts.skipQualityCheck, skipGroupCheck: opts.skipGroupCheck });
            for (const job of assignedJobs) {
                const formattedCost = job.estimatedCost !== undefined ? mm.currencyFormatter.format(job.estimatedCost) : 'unknown';
                consoleLog`      • ${job.translationProvider ?? 'No provider available'}: ${job.tus.length.toLocaleString()} ${[job.tus.length, 'segment', 'segments']}, cost: ${formattedCost}`;
                job.translationProvider && jobs.push(job);
                opts.print && printRequest(job, 10, true);
            }
        }
        if (opts.outFile) {
            writeFileSync(opts.outFile, JSON.stringify(jobs, null, '\t'), 'utf8');
            consoleLog`\nJobs written to ${opts.outFile}`;
        }
        if (opts.push) {
            consoleLog`\nPushing content to providers...`;
            const jobStatus = await mm.dispatcher.startJobs(jobs, { instructions: opts.instructions });
            consoleLog`Pushed ${jobStatus.length} jobs:`;
            for (const { sourceLang, targetLang, jobGuid, translationProvider, status } of jobStatus) {
                consoleLog`  ${sourceLang} → ${targetLang}: ${translationProvider}(${jobGuid}) → ${status}`;
            }
    }
    },
};
