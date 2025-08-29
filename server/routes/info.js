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
        });
    });
}
