import fastq from 'fastq';
import { consoleLog } from '../l10nContext.js';

export class source_snap {
    static help = {
        description: 'commits a snapshot of sources in the local cache.',
        options: [
            [ '--channel <channelId>', 'limit to the specified channels' ],
            [ '--since <date>', 'limit to resources updated since the specified date' ],
            [ '--parallelism <number>', 'number of parallel operations' ],
        ]
    };

    static async action(monsterManager, options) {
        // eslint-disable-next-line no-nested-ternary
        const channels = options.channel ? (Array.isArray(options.channel) ? options.channel : options.channel.split(',')) : monsterManager.rm.channelIds;
        consoleLog`Taking a snapshot of sources... (channels: ${channels.join(', ')}, since: ${options.since ?? 'all'})`;
        const snapQueue = fastq.promise(monsterManager.rm, monsterManager.rm.snap, options.parallelism ?? 4);
        const snapPromises = channels.map(channelId => snapQueue.push({ channelId, since: options.since }));
        const stats = await Promise.all(snapPromises);
        const response = Object.fromEntries(stats.map((stats, index) => [ channels[index], stats ]));
        for (const [ channelId, stats ] of Object.entries(response)) {
            consoleLog`Channel: ${channelId}`;
            for (const [ prj, { resources, segments, changes } ] of Object.entries(stats)) {
                consoleLog`  ‣ ${prj}: ${resources.toLocaleString()} ${[resources, 'resource', 'resources']}, ${segments.toLocaleString()} ${[segments, 'segment', 'segments']} snapped, ${changes.toLocaleString()} ${[changes, 'segment', 'segments']} updated`;
            }
        }
        return response;
    }
}
