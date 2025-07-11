import { consoleLog } from '../l10nContext.js';

export class source_snap {
    static help = {
        description: 'commits a snapshot of sources in the local cache.',
        options: [
            [ '--channel <channelId>', 'limit to the specified channel' ],
            [ '--since <date>', 'limit to resources updated since the specified date' ],
        ]
    };

    static async action(monsterManager, options) {
        consoleLog`Taking a snapshot of sources... (channel: ${options.channel ?? 'all'}, since: ${options.since ?? 'all'})`;
        const stats = await monsterManager.rm.snap({ channelId: options.channel, since: options.since });
        for (const [ prj, { resources, segments, changes } ] of Object.entries(stats)) {
            consoleLog`  ‣ ${prj}: ${resources.toLocaleString()} ${[resources, 'resource', 'resources']}, ${segments.toLocaleString()} ${[segments, 'segment', 'segments']} snapped, ${changes.toLocaleString()} ${[changes, 'segment', 'segments']} updated`;
        }
    }
}
