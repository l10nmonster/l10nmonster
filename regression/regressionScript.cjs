const { runL10nMonster } = require('@l10nmonster/cli');

(async () => await runL10nMonster('l10nmonster.cjs', { regression: true }, async l10n => {
    await l10n.push({ provider: 'grandfather,repetition,default' });
    await l10n.pull();
    await l10n.translate();
    await l10n.status({ output: 'status.json' });
    await l10n.tmexport();
}))();
