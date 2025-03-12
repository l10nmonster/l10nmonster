import { consoleLog } from '@l10nmonster/core';

export class snap {
    static help = {
        description: 'commits a snapshot of sources in normalized format.',
        options: [
            [ '--maxSegments <number>', 'threshold to break up snapshots into chunks' ],
        ]
    };

    static async action(monsterManager, options) {
        consoleLog`Taking a snapshot of sources...`;
        const numSources = await monsterManager.snap(options);
        consoleLog`${numSources} sources committed`;
    }
}
