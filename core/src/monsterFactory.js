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
        throw 'missing configuration';
    }
    const baseDir = path.dirname(configPath);
    const Config = await import(configPath);
    if (typeof Config?.default !== 'function') {
        throw 'Invalid Config. Need to export a class constructor as a default export';
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
        logger.verbose('Initializing config with:');
        logger.verbose(configParams);
        const monsterConfig = new Config.default(configParams);
        logger.verbose('Successfully got config instance:');
        logger.verbose(monsterConfig, { depth: 5 });
        const monsterDir = path.join(baseDir, monsterConfig.monsterDir ?? '.l10nmonster');
        logger.info(`Monster dir: ${monsterDir}`);
        if (!existsSync(monsterDir)) {
            mkdirSync(monsterDir, {recursive: true});
        }
        const mm = new MonsterManager({ monsterDir, monsterConfig, configSeal, defaultAnalyzers });
        helpers.sharedCtx().mm = mm;
        logger.info(`L10n Monster initialized!`);
        return mm;
    } catch(e) {
        throw `l10nmonster.cjs failed to construct: ${e.stack || e}`;
    }
}
