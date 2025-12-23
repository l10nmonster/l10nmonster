import fastq from 'fastq';
import { consoleLog, logVerbose } from '../l10nContext.js';

/**
 * @typedef {Object} SourceImportOptions
 * @property {string} [snapStore] - Snap store ID
 * @property {string | string[]} [channel] - Channel ID(s)
 */

/**
 * CLI action for importing a snapshot of sources.
 * @type {import('../../index.js').L10nAction}
 */
export const source_import = {
    name: 'source_import',
    help: {
        description: 'imports a snapshot of sources in the local cache.',
        arguments: [
            [ '[snapStore]', 'id of the snap store' ],
        ],
        options: [
            [ '--channel <channelId>', 'limit to the specified channels' ],
        ]
    },

    async action(mm, options) {
        const { snapStore, channel } = /** @type {SourceImportOptions} */ (options);
        const channels = channel ? (Array.isArray(channel) ? channel : channel.split(',')) : mm.rm.channelIds;
        if (snapStore) {
            const toc = await mm.rm.getSnapStoreTOC(snapStore);
            const channelsToImport = [];
            for (const channelId of channels) {
                const { store, ts } = await mm.rm.getChannelMeta(channelId);
                if (toc[channelId]) {
                    if (ts === toc[channelId][0]) {
                        logVerbose`Skipping channel ${channelId} as it already contains the same snapshot ${store ? `from store ${store}` : 'directly from the source'}`;
                    } else {
                            channelsToImport.push(channelId);
                        }
                } else {
                    logVerbose`Channel ${channelId} not found in ${snapStore}, skipping`;
                }
            }
            if (channelsToImport.length === 0) {
                consoleLog`No channels to import.`;
                return;
            }
            consoleLog`Importing snapshot from ${snapStore}... (channels: ${channelsToImport.join(', ')})`;
            const exportQueue = fastq.promise(async ({ channelId, snapStore }) => mm.rm.import(toc[channelId][0], channelId, snapStore), 1); // currently it can only be run sequentially because you can't run 2 sqlite iterate in parallel
            const exportPromises = channelsToImport.map(channelId => exportQueue.push({ channelId, snapStore: snapStore }));
            const stats = await Promise.all(exportPromises);
            const response = Object.fromEntries(stats.map((stats, index) => [ channelsToImport[index], stats ]));
            for (const [ channelId, { resources, segments } ] of Object.entries(response)) {
                consoleLog`Channel: ${channelId} ${resources.toLocaleString()} ${[resources, 'resource', 'resources']}, ${segments.toLocaleString()} ${[segments, 'segment', 'segments']}, ts=${toc[channelId][0]}`;
            }
            return response;
        }
        const snapStoreIds = mm.rm.snapStoreIds;
        if (snapStoreIds.length === 0) {
            consoleLog`No snap stores found. You have to configure a snap store.`;
        } else {
            const tocList = await Promise.all(snapStoreIds.map(snapStoreId => mm.rm.getSnapStoreTOC(snapStoreId)));
            const tocMap = Object.fromEntries(snapStoreIds.map((snapStoreId, index) => [ snapStoreId, tocList[index] ]));
            for (const channelId of channels) {
                const { store, ts } = await mm.rm.getChannelMeta(channelId);
                consoleLog`Channel ${channelId}: ${ts ? `last updated at ${new Date(ts).toLocaleString()} ${store ? `from store ${store}` : 'directly from the source'}` : 'never updated'}`;
                for (const snapStoreId of snapStoreIds) {
                    const storeTs = tocMap[snapStoreId][channelId]?.[0]; // only compare the most recent snapshot
                    consoleLog`  SnapStore ${snapStoreId}: ${storeTs ? `${storeTs === ts ? 'same snapshot' : `updated at ${new Date(storeTs).toLocaleString()}`}` : 'not found'}`;
                }
            }
        }
    },
};
