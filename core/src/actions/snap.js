import { consoleLog } from '@l10nmonster/core';

export class snap {
    static help = {
        description: 'commits a snapshot of sources in the local cache.',
        options: [
        ]
    };

    static async action(monsterManager) {
        consoleLog`Taking a snapshot of sources...`;
        const stats = await monsterManager.rm.snap();
        for (const [ prj, { resources, segments, changes } ] of Object.entries(stats)) {
            consoleLog`  ‣ ${prj}: ${resources.toLocaleString()} ${[resources, 'resource', 'resources']}, ${segments.toLocaleString()} ${[segments, 'segment', 'segments']} snapped, ${changes.toLocaleString()} ${[segments, 'segment', 'segments']} updated`;
        }
    }
}
