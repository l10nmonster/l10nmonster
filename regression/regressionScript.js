import * as path from 'path';
import { createMonsterManager } from '../src/defaultMonster.js';
import * as cli from '../src/cli.js';

(async () => {
    let monsterManager;
    try {
        const baseDir = path.resolve('.');
        const configModule = await import(`${baseDir}/l10nmonster.mjs`);
        const globalOps = { regression: true, verbose: 1 };
        monsterManager = await createMonsterManager(baseDir, configModule, 'x', globalOps);
        await cli.push(monsterManager, { ...globalOps, provider: 'grandfather,repetition,default' });
        await cli.pull(monsterManager, globalOps);
        await cli.translate(monsterManager, globalOps);
        await cli.status(monsterManager, { ...globalOps, output: 'status.json' });
    } catch(e) {
        console.error(`Unable to operate: ${e.stack || e}`);
    } finally {
        monsterManager && (await monsterManager.shutdown());
    }
})();
