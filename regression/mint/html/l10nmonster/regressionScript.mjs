import config from './l10nmonster.config.mjs';

await config.run({ regression: true, verbose: 3 }, async l10n => {
    await l10n.push();
    await l10n.pull();
    await l10n.translate();
    await l10n.status({ output: 'status.json' });
    await l10n.tmexport();
});
