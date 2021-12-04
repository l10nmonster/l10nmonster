import * as path from 'path';
import TachiyomiConfig from './tachiyomi-j2k/l10nmonster.mjs';
import GrampsConfig from './gramps/l10nmonster.mjs';

const configs = {
    'tachiyomi-j2k': TachiyomiConfig,
    gramps: GrampsConfig,
};

export default class AggregatedConfig {
    constructor({ ctx, ...other }) {
        const Cfg = configs[ctx.arg];
        if (Cfg) {
            ctx.baseDir = path.join(ctx.baseDir, ctx.arg);
            const cfg = new Cfg({ ctx, ...other });
            cfg.monsterDir = path.join('caches', ctx.arg);
            return cfg;
        } else {
            throw 'You have to specify a config name as a -a argument';
        }
    }
}
