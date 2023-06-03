import * as path from 'path';
import {
    existsSync,
    statSync,
    mkdirSync,
} from 'fs';

import {
    MonsterManager,
    helpers,
    OpsMgr,
    JsonJobStore, FsSnapStore, FsSource, FsTarget,
    SnapFilter,
    Grandfather, Repetition, Visicode,
    defaultAnalyzers,
} from './core.js';

export async function createMonsterManager({ configPath, options, logger, env }) {
    if (!configPath) {
        throw 'Cannot create l10n monster: missing configuration';
    }
    const baseDir = path.dirname(configPath);
    logger.verbose(`Requiring config: ${configPath}`);
    const Config = require(configPath); // VS Code chokes on import() so we use require() until it grows up
    if (typeof Config !== 'function') {
        throw 'Invalid Config. Need to export a class constructor as a CJS module.exports';
    }
    const configSeal = statSync(configPath).mtime.toISOString();
    const regression = options.regression;
    let prj = options.prj;
    prj && (prj = prj.split(','));
    const opsMgr = Config.opsDir ? new OpsMgr({ opsDir: path.join(baseDir, Config.opsDir), logger }) : new OpsMgr({ logger });
    helpers.mergeProps({
        baseDir,
        opsMgr,
        env: env ?? {},
        arg: options.arg,
        logger: logger ?? { verbose: () => false, info: () => false, warn: () => false, error: () => false },
        regression,
        prj,
    });

    try {
        const configParams = {
            helpers,
            stores: { JsonJobStore, FsSnapStore },
            adapters: { FsSource, FsTarget },
            filters: { SnapFilter },
            translators: { Grandfather, Repetition, Visicode },
        };
        const monsterConfig = new Config(configParams);
        const monsterDir = path.join(baseDir, monsterConfig.monsterDir ?? '.l10nmonster');
        logger.verbose(`Monster cache dir: ${monsterDir}`);
        if (!existsSync(monsterDir)) {
            mkdirSync(monsterDir, {recursive: true});
        }
        const mm = new MonsterManager({ monsterDir, monsterConfig, configSeal, defaultAnalyzers });
        helpers.sharedCtx().mm = mm;
        logger.verbose(`L10n Monster factory-initialized!`);
        return mm;
    } catch(e) {
        throw `l10nmonster.cjs failed to construct: ${e.stack || e}`;
    }
}
