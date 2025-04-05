import config from './l10nmonster.config.mjs';

await config.run({ regression: true, verbose: 3 }, async l10n => {
    await l10n.source_untranslated({ push: true });
    await l10n.translate();
    await l10n.status({ output: 'status.json' });
    await l10n.tmexport();
});
