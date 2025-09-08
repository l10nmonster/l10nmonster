import { logInfo, getBaseDir } from '@l10nmonster/core';
import path from 'path';

export function setupInfoRoute(router, mm, serverPackage) {
    router.get('/info', async (req, res) => {
        logInfo`/info`;
        res.json({
            version: serverPackage.version,
            description: serverPackage.description,
            baseDir: path.resolve(getBaseDir()),
            providers: mm.dispatcher.providers.map(p => p.id),
            channels: Object.keys(mm.rm.channels),
            tmStores: mm.tmm.getTmStoreIds().map(id => {
                const tmStore = mm.tmm.getTmStore(id);
                return {
                    id: tmStore.id,
                    type: tmStore.constructor.name,
                    access: tmStore.access,
                    partitioning: tmStore.partitioning,
                };
            }),
        });
    });
}
