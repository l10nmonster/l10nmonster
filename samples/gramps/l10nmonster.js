import { FsSource, FsTarget } from '../../adapters/fs.js';
import { PoFilter } from '../../filters/po.js';
import { PigLatinizer } from '../../translators/piglatinizer.js';

export default class GrampsConfig {
    sourceLang = 'en';
    targetLangs = [ 'ja', 'it' ];
    constructor(ctx) {
        this.pipelines = {
            default: {
                source: new FsSource({
                    // TODO: we could have a decorating function that given the resource id provides the custom target lang (e.g. based on a naming convention). Potentially even at the TU level
                    ctx,
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
                    ctx,
                    targetPath: (lang, resourceId) => `artifacts/${lang}.po`,
                }),
            }
        }
    }
};
