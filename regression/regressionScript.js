import { runL10nMonster } from '../src/l10nCommands.js';

await runL10nMonster('l10nmonster.mjs', { regression: true }, async l10n => {
    await l10n.push({ provider: 'grandfather,repetition,default' });
    await l10n.pull();
    await l10n.translate();
    await l10n.status({ output: 'status.json' });
});
