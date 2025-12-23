import fastq from 'fastq';
import { consoleLog } from '../l10nContext.js';

/**
 * @typedef {Object} SourceExportOptions
 * @property {string} [snapStore] - Snap store ID
 * @property {string | string[]} [channel] - Channel ID(s)
 */

/**
 * CLI action for exporting sources to a snap store.
 * @type {import('../../index.js').L10nAction}
 */
export const source_export = {
    name: 'source_export',
    help: {
        description: 'exports sources to a snap store.',
        arguments: [
            [ '[snapStore]', 'id of the snap store' ],
        ],
        options: [
            [ '--channel <channelId>', 'limit to the specified channels' ],
        ]
    },

    async action(mm, options) {
        const { snapStore, channel } = /** @type {SourceExportOptions} */ (options);
        if (snapStore) {
            const channels = channel ? (Array.isArray(channel) ? channel : channel.split(',')) : mm.rm.channelIds;
            consoleLog`Exporting sources to ${snapStore}... (channels: ${channels.join(', ')})`;
            const exportQueue = fastq.promise(async ({ channelId, snapStore }) => mm.rm.export(channelId, snapStore), 1); // currently it can only be run in serial because you can't run 2 sqlite iterate in parallel
            const exportPromises = channels.map(channelId => exportQueue.push({ channelId, snapStore: snapStore }));
            const stats = await Promise.all(exportPromises);
            const response = Object.fromEntries(stats.map((stats, index) => [ channels[index], stats ]));
            for (const [ channelId, { ts, resources, segments } ] of Object.entries(response)) {
                if (ts) {
                    consoleLog`  ‣ Channel ${channelId}: ${resources.count.toLocaleString()} ${[resources.count, 'resource', 'resources']}, ${segments.count.toLocaleString()} ${[segments.count, 'segment', 'segments']}, ts=${ts}`;
                } else {
                    consoleLog`  ‣ Channel ${channelId} skipped`;
                }
            }
            return response;
        }
        const snapStoreIds = mm.rm.snapStoreIds;
        if (snapStoreIds.length === 0) {
            consoleLog`No snap stores found. You have to configure a snap store.`;
        } else {
            consoleLog`You have to specify a snap store. Available snap store ids: ${snapStoreIds.join(', ')}`;
        }
    },
};
