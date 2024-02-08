import { snapCmd } from '@l10nmonster/core';

export class snap {
    static help = {
        description: 'commits a snapshot of sources in normalized format.',
        options: [
            [ '--maxSegments <number>', 'threshold to break up snapshots into chunks' ],
        ]
    };

    static async action(monsterManager, options) {
        console.log(`Taking a snapshot of sources...`);
        const numSources = await snapCmd(monsterManager, options);
        console.log(`${numSources} sources committed`);
    }
}
