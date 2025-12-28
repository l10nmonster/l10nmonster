import { consoleLog } from '../l10nContext.js';

/**
 * CLI action for testing configuration and warming up caches.
 * @type {import('../../index.js').L10nAction}
 */
export const monster = {
    name: 'monster',
    help: {
        description: 'test configuration and warm up caches',
        options: [
            [ '--detailed', 'show detailed output' ],
        ]
    },

    async action(mm, options) {
        console.log(`
██╗     ███╗   ██████╗ ███╗   ██╗
██║    ████║  ██╔═████╗████╗  ██║
██║     ╚██║  ██║██╔██║██╔██╗ ██║
██║      ██║  ████╔╝██║██║╚██╗██║
███████╗ ██║  ╚██████╔╝██║ ╚████║
╚══════╝ ╚═╝   ╚═════╝ ╚═╝  ╚═══╝

███╗   ███╗ ██████╗ ███╗   ██╗███████╗████████╗███████╗██████╗     ██╗   ██╗██████╗ 
████╗ ████║██╔═══██╗████╗  ██║██╔════╝╚══██╔══╝██╔════╝██╔══██╗    ██║   ██║╚════██╗
██╔████╔██║██║   ██║██╔██╗ ██║███████╗   ██║   █████╗  ██████╔╝    ██║   ██║ █████╔╝
██║╚██╔╝██║██║   ██║██║╚██╗██║╚════██║   ██║   ██╔══╝  ██╔══██╗    ╚██╗ ██╔╝ ╚═══██╗
██║ ╚═╝ ██║╚██████╔╝██║ ╚████║███████║   ██║   ███████╗██║  ██║     ╚████╔╝ ██████╔╝
╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝      ╚═══╝  ╚═════╝ 
`);
        console.time('Initialization time');

        consoleLog`\nResource Channels:`;
        for (const channelId of mm.rm.channelIds) {
            const channelStats = await mm.rm.getActiveContentStats(channelId);
            const desiredLangPairs = await mm.rm.getDesiredLangPairs(channelId);
            consoleLog`  ‣ ${channelId}: ${desiredLangPairs.map(([ sourceLang, targetLang ]) => `${sourceLang} → ${targetLang}`).join(', ')}`;
            if (channelStats.length === 0) {
                consoleLog`      • No resources in this channel!`;
            } else if (options.detailed) {
                channelStats.forEach(({ prj, sourceLang, segmentCount, resCount }) => consoleLog`      • Project ${prj ?? 'default'} (source ${sourceLang}): ${segmentCount.toLocaleString()} ${[segmentCount, 'segment', 'segments']} in ${resCount.toLocaleString()} ${[resCount, 'resource', 'resources']}`);
            } else {
                const totalSegments = channelStats.reduce((acc, { segmentCount }) => acc + segmentCount, 0);
                const totalResources = channelStats.reduce((acc, { resCount }) => acc + resCount, 0);
                consoleLog`      • ${totalSegments.toLocaleString()} ${[totalSegments, 'segment', 'segments']} in ${totalResources.toLocaleString()} ${[totalResources, 'resource', 'resources']}`;
            }
        }

        consoleLog`\n${mm.dispatcher.providers.length || 'No'} providers configured: ${mm.dispatcher.providers.map(provider => provider.id).join(', ')}`;

        const availableLangPairs = (await mm.tmm.getAvailableLangPairs()).sort();
        if (availableLangPairs.length > 0) {
            consoleLog`\nTranslation Memories:`;
            for (const [sourceLang, targetLang] of availableLangPairs) {
                const tm = mm.tmm.getTM(sourceLang, targetLang);
                const tmStats = await tm.getStats();
                if (options.detailed) {
                    consoleLog`  ‣ ${sourceLang} → ${targetLang}`;
                    for (const stats of tmStats) {
                        consoleLog`      • ${stats.translationProvider}(${stats.status}): ${stats.jobCount.toLocaleString()} ${[stats.jobCount, 'job', 'jobs']}, ${stats.tuCount.toLocaleString()} ${[stats.tuCount, 'tu', 'tus']}, ${stats.distinctGuids.toLocaleString()} ${[stats.distinctGuids, 'guid', 'guids']}`;
                    }
                } else {
                    const totalJobs = tmStats.reduce((acc, { jobCount }) => acc + jobCount, 0);
                    const totalTus = tmStats.reduce((acc, { tuCount }) => acc + tuCount, 0);
                    consoleLog`  ‣ ${sourceLang} → ${targetLang}: ${totalJobs.toLocaleString()} ${[totalJobs, 'job', 'jobs']}, ${totalTus.toLocaleString()} ${[totalTus, 'tu', 'tus']}`;
                }
            }
        } else {
            consoleLog`\nNo translation memories found!`;
        }
        console.timeEnd('Initialization time');
    },
};
