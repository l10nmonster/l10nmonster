import fastq from 'fastq';
import { consoleLog } from '../l10nContext.js';

export class source_snap {
    static help = {
        description: 'commits a snapshot of sources in the local cache.',
        options: [
            [ '--channel <channelId>', 'limit to the specified channels' ],
            [ '--parallelism <number>', 'number of parallel operations' ],
        ]
    };

    static async action(monsterManager, options) {
        const channels = options.channel ? (Array.isArray(options.channel) ? options.channel : options.channel.split(',')) : monsterManager.rm.channelIds;
        consoleLog`Taking a snapshot of sources... (channels: ${channels.join(', ')})`;
        const snapQueue = fastq.promise(async channelId => monsterManager.rm.snap(channelId), options.parallelism ?? 4);
        const snapPromises = channels.map(channelId => snapQueue.push(channelId));
        const stats = await Promise.all(snapPromises);
        const response = Object.fromEntries(stats.map((stats, index) => [ channels[index], stats ]));
        for (const [ channelId, { resources, segments } ] of Object.entries(response)) {
            consoleLog`Channel ${channelId}: ${resources.toLocaleString()} ${[resources, 'resource', 'resources']}, ${segments.toLocaleString()} ${[segments, 'segment', 'segments']} snapped`;
        }
        return response;
    }
}
