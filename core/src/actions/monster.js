import { consoleLog } from '../l10nContext.js';

export class monster {
    static help = {
        description: 'test configuration and warm up caches',
        // options: [
        //     [ '-l, --lang <language>', 'target languages to warm up' ],
        // ]
    };

    static async action(mm) {
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
            } else {
                channelStats.forEach(({ prj, sourceLang, segmentCount, resCount }) => consoleLog`      • Project ${prj ?? 'default'} (source ${sourceLang}): ${segmentCount.toLocaleString()} ${[segmentCount, 'segment', 'segments']} in ${resCount.toLocaleString()} ${[resCount, 'resource', 'resources']}`);
            }
        }

        consoleLog`\n${mm.dispatcher.providers.length || 'No'} providers configured: ${mm.dispatcher.providers.map(provider => provider.id).join(', ')}`;

        const availableLangPairs = (await mm.tmm.getAvailableLangPairs()).sort();
        if (availableLangPairs.length > 0) {
            consoleLog`\nTranslation Memories:`;
            for (const [sourceLang, targetLang] of availableLangPairs) {
                const tm = mm.tmm.getTM(sourceLang, targetLang);
                consoleLog`  ‣ ${sourceLang} → ${targetLang}`;
                const tmStats = await tm.getStats();
                for (const stats of tmStats) {
                    consoleLog`      • ${stats.translationProvider}(${stats.status}): ${stats.jobCount.toLocaleString()} ${[stats.jobCount, 'job', 'jobs']}, ${stats.tuCount.toLocaleString()} ${[stats.tuCount, 'tu', 'tus']}, ${stats.distinctGuids.toLocaleString()} ${[stats.distinctGuids, 'guid', 'guids']}`;
                }
            }
        } else {
            consoleLog`\nNo translation memories found!`;
        }
        console.timeEnd('Initialization time');
    }
}
