import config from './l10nmonster.config.mjs';

await config.run({ regression: true, verbose: 3 }, async l10n => {
    await l10n.tm_syncdown({ tmStore: 'legacy', commit: true });
    await l10n.source_untranslated({ push: true, provider: true });
    await l10n.translate();
    await l10n.source_list({ statusFile: 'status.json' });
    await l10n.tm_export({ jobsDir: 'tmexport' });
    await l10n.tm_syncup({ tmStore: 'default', commit: true });
});
