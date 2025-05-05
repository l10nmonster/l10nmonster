import { consoleLog } from '@l10nmonster/core';

export class source_snap {
    static help = {
        description: 'commits a snapshot of sources in the local cache.',
        options: [
            [ '--channel <channelId>', 'limit to the specified channel' ],
        ]
    };

    static async action(monsterManager, options) {
        consoleLog`Taking a snapshot of sources...`;
        const stats = await monsterManager.rm.snap({ channelId: options.channel });
        for (const [ prj, { resources, segments, changes } ] of Object.entries(stats)) {
            consoleLog`  ‣ ${prj}: ${resources.toLocaleString()} ${[resources, 'resource', 'resources']}, ${segments.toLocaleString()} ${[segments, 'segment', 'segments']} snapped, ${changes.toLocaleString()} ${[segments, 'segment', 'segments']} updated`;
        }
    }
}
