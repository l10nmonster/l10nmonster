import fastq from 'fastq';
import { consoleLog } from '../l10nContext.js';

/**
 * @typedef {Object} SourceSnapOptions
 * @property {string | string[]} [channel] - Channel ID(s)
 * @property {number} [parallelism] - Number of parallel operations
 */

/**
 * CLI action for snapping sources.
 * @type {import('../../index.js').L10nAction}
 */
export const source_snap = {
    name: 'source_snap',
    help: {
        description: 'commits a snapshot of sources in the local cache.',
        options: [
            [ '--channel <channelId>', 'limit to the specified channels' ],
            [ '--parallelism <number>', 'number of parallel operations' ],
        ]
    },

    async action(monsterManager, options) {
        const opts = /** @type {SourceSnapOptions} */ (options);
        const channels = opts.channel ? (Array.isArray(opts.channel) ? opts.channel : opts.channel.split(',')) : monsterManager.rm.channelIds;
        consoleLog`Taking a snapshot of sources... (channels: ${channels.join(', ')})`;
        const snapQueue = fastq.promise(async channelId => monsterManager.rm.snap(channelId), opts.parallelism ?? 4);
        const snapPromises = channels.map(channelId => snapQueue.push(channelId));
        const stats = await Promise.all(snapPromises);
        const response = Object.fromEntries(stats.map((stats, index) => [ channels[index], stats ]));
        for (const [ channelId, { resources, segments } ] of Object.entries(response)) {
            consoleLog`Channel ${channelId}: ${resources.toLocaleString()} ${[resources, 'resource', 'resources']}, ${segments.toLocaleString()} ${[segments, 'segment', 'segments']} snapped`;
        }
        return response;
    },
};
