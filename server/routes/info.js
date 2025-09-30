import { logInfo, getBaseDir } from '@l10nmonster/core';
import path from 'path';

export function setupInfoRoute(router, mm, serverPackage) {
    router.get('/info', async (req, res) => {
        logInfo`/info`;
        try {
            res.json({
                version: serverPackage.version,
                description: serverPackage.description,
                baseDir: path.resolve(getBaseDir()),
                providers: mm.dispatcher.providers.map(p => ({id: p.id, type: p.constructor.name})),
                channels: mm.rm.channelIds.map(id => mm.rm.getChannel(id).getInfo()),
                tmStores: mm.tmm.tmStoreIds.map(id => mm.tmm.getTmStoreInfo(id)),
                snapStores: mm.rm.snapStoreIds.map(id => mm.rm.getSnapStoreInfo(id)),
            });
        } catch (error) {
            logInfo`Error in /info: ${error.message}`;
            res.status(500).json({
                error: 'Failed to get system info',
                message: error.message
            });
        }
    });
}
