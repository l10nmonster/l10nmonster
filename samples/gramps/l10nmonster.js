import { L10nConfig } from '../../src/l10nConfig.js';
import { FsSource, FsTarget } from '../../src/adapters/fs.js';
import { PoFilter } from '../../src/filters/po.js';
import { PigLatinizer } from '../../src/translators/piglatinizer.js';

export default class GrampsConfig extends L10nConfig {
    constructor(ctx) {
        super(ctx);
        this.targetLangs = [ 'ja', 'it' ];
        this.pipelines = {
            default: {
                source: new FsSource({
                    // TODO: we could have a decorating function that given the resource id provides the custom target lang (e.g. based on a naming convention). Potentially even at the TU level
                    baseDir: ctx.baseDir,
                    globs: [
                        'artifacts/*.pot',
                    ]
                }),
                // TODO: add hooks to allow to manipulate content before/after processing (see https://serge.io/docs/modular-architecture/)
                resourceFilter: new PoFilter(
                    // TODO: add configuration for baseline message format (e.g. HTML on top of the "flag" format)
                ),
                translationProvider: new PigLatinizer(),
                target: new FsTarget({
                    baseDir: ctx.baseDir,
                    targetPath: (lang, resourceId) => `artifacts/${lang}.po`,
                }),
            }
        }
    }
};
