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

        // eslint-disable-next-line no-unused-vars
        const printCapabilities = cap => Object.entries(cap).filter(([cmd, available]) => available).map(([cmd]) => cmd).join(' ');
        consoleLog`\nResource Channels and available commands: [autoSnap ${mm.rm.autoSnap ? 'on' : 'off'}]`;
        for (const channelId of Object.keys(mm.rm.channels)) {
            const channelStats = await mm.rm.getActiveContentStats(channelId);
            consoleLog`  ‣ ${channelId}: ${printCapabilities(mm.capabilitiesByChannel[channelId])}`;
            if (channelStats.length === 0) {
                consoleLog`      • No resources in this channel!`;
            } else {
                channelStats.forEach(({ prj, sourceLang, segmentCount, resCount }) => consoleLog`      • Project ${prj ?? 'default'} (source ${sourceLang}): ${segmentCount.toLocaleString()} ${[segmentCount, 'segment', 'segments']} in ${resCount.toLocaleString()} ${[resCount, 'resource', 'resources']}`);
            }
        }

        const desiredPairs = {};
        for (const [sourceLang, targetLang] of await mm.rm.getAvailableLangPairs()) {
            desiredPairs[sourceLang] ??= [];
            desiredPairs[sourceLang].push(targetLang);
        }
        consoleLog`\nDesired language pairs:`;
        for (const [sourceLang, targetLangs] of Object.entries(desiredPairs)) {
            consoleLog`  ‣ ${sourceLang} → ${targetLangs.join(', ')}`;
        }

        consoleLog`\n${mm.dispatcher.providers.length || 'No'} providers configured: ${mm.dispatcher.providers.map(provider => provider.id).join(', ')}`;

        consoleLog`\nTranslation Memories:`;
        const availableLangPairs = (await mm.tmm.getAvailableLangPairs()).sort();
        for (const [sourceLang, targetLang] of availableLangPairs) {
            const tm = mm.tmm.getTM(sourceLang, targetLang);
            consoleLog`  ‣ ${sourceLang} → ${targetLang}`;
            const tmStats = tm.getStats();
            for (const stats of tmStats) {
                consoleLog`      • ${stats.translationProvider}(${stats.status}): ${stats.jobCount.toLocaleString()} ${[stats.jobCount, 'job', 'jobs']}, ${stats.tuCount.toLocaleString()} ${[stats.tuCount, 'tu', 'tus']}, ${stats.distinctGuids.toLocaleString()} ${[stats.distinctGuids, 'guid', 'guids']}`;
            }
        }
        console.timeEnd('Initialization time');
    }
}
