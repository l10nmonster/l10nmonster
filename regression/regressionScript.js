import * as path from 'path';
import { createMonsterManager } from '../src/defaultMonster.js';
import * as l10n from '../src/l10nCommands.js';

(async () => {
    const globalOptions = { regression: true };
    await createMonsterManager(path.resolve('.', 'l10nmonster.mjs'), globalOptions, async mm => {
        await l10n.push(mm, { ...globalOptions, provider: 'grandfather,repetition,default' });
        await l10n.pull(mm, globalOptions);
        await l10n.translate(mm, globalOptions);
        await l10n.status(mm, { ...globalOptions, output: 'status.json' });
    });
})();
