import fastq from 'fastq';
import { consoleLog } from '../l10nContext.js';

export class source_export {
    static help = {
        description: 'exports sources to a snap store.',
        arguments: [
            [ '[snapStore]', 'id of the snap store' ],
        ],
        options: [
            [ '--channel <channelId>', 'limit to the specified channels' ],
        ]
    };

    static async action(mm, { snapStore, channel }) {
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
    }
}
