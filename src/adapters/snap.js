/* eslint-disable no-constructor-return */
import { FsSource } from './fs.js';

export class SnapSource {
    constructor({ baseDir, filter, targetLangs, prj, resDecorator }) {
        if (baseDir === undefined) {
            throw 'a baseDir property is required in SnapSource';
        } else {
            return new FsSource({
                baseDir,
                globs: [ '*.json' ],
                filter,
                targetLangs,
                prj,
                resDecorator,
                idFromPath: path => path.replaceAll('$', '/').slice(0, -5),
                pathFromId: id => `${id.replaceAll('/', '$')}.json`,
            });
        }
    }
}
