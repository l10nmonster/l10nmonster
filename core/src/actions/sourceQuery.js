import { writeFileSync } from 'fs';
import { consoleLog } from '../l10nContext.js';
import { printRequest } from './shared.js';

export class source_query {
    static help = {
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
            [ '--channel <channelId>', 'channel id' ],
            [ '--lang <srcLang,tgtLang>', 'source and target language pair' ],
        ],
        options: [
            [ '--provider <name,...>', 'use the specified providers' ],
            [ '--push', 'push content to providers' ],
            [ '--skipQualityCheck', 'skip quality check' ],
            [ '--skipGroupCheck', 'skip group check' ],
            [ '--instructions <instructions>', 'job-specific instructions' ],
            [ '--outFile <filename>', 'write output to the specified file' ],
            [ '--print', 'print jobs to console' ],
        ]
    };

    static async action(mm, options) {
        const [ sourceLang, targetLang ] = options.lang.split(',');
        consoleLog`Custom query of source content and associated ${sourceLang} → ${targetLang} translations...\n### WARNING: because of potential sql injection attacks, don't use this unless you know what you're doing! ###`;
        if (!targetLang) {
            throw new Error('Missing target language');
        }
        const channelId = options.channel;
        if (!channelId) {
            throw new Error('Missing channel id');
        }
        const jobs = [];
        const tm = mm.tmm.getTM(sourceLang, targetLang);
        const tus = await tm.querySource(channelId, options.whereCondition ?? 'true');
        if (tus.length === 0) {
            consoleLog`No content returned`;
        } else {
            consoleLog`  ‣ ${sourceLang} → ${targetLang}:`;
            const providerList = options.provider && (Array.isArray(options.provider) ? options.provider : options.provider.split(','));
            const assignedJobs = await mm.dispatcher.createJobs({ sourceLang, targetLang, tus }, { providerList, skipQualityCheck: options.skipQualityCheck, skipGroupCheck: options.skipGroupCheck });
            for (const job of assignedJobs) {
                const formattedCost = job.estimatedCost !== undefined ? mm.currencyFormatter.format(job.estimatedCost) : 'unknown';
                consoleLog`      • ${job.translationProvider ?? 'No provider available'}: ${job.tus.length.toLocaleString()} ${[job.tus.length, 'segment', 'segments']}, cost: ${formattedCost}`;
                job.translationProvider && jobs.push(job);
                options.print && printRequest(job);
            }
        }
        if (options.outFile) {
            writeFileSync(options.outFile, JSON.stringify(jobs, null, '\t'), 'utf8');
            consoleLog`\nJobs written to ${options.outFile}`;
        }
        if (options.push) {
            consoleLog`\nPushing content to providers...`;
            const jobStatus = await mm.dispatcher.startJobs(jobs, { instructions: options.instructions });
            consoleLog`Pushed ${jobStatus.length} jobs:`;
            for (const { sourceLang, targetLang, jobGuid, translationProvider, status } of jobStatus) {
                consoleLog`  ${sourceLang} → ${targetLang}: ${translationProvider}(${jobGuid}) → ${status}`;
            }
    }
    }
}
