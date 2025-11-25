import config from './l10nmonster.config.mjs';

await config.verbose(3).regression(true).run(async ({l10n}) => {
    await l10n.source_untranslated({ push: true, provider: 'Grandfather' });
    await l10n.source_untranslated({ push: true, provider: 'Repetition' });
    await l10n.source_untranslated({ push: true, provider: ['PigLatinizer', 'BritishTranslator', 'XliffBridge'] });
    await l10n.ops_update();
    await l10n.translate();
    await l10n.source_list({ statusFile: 'status.json' });
    await l10n.tm_syncup({ tmStore: 'job', storeAlias: 'tmstore', commit: true });
    await l10n.tm_syncup({ tmStore: 'provider', storeAlias: 'tmstore', commit: true });
    await l10n.tm_syncup({ tmStore: 'language', storeAlias: 'tmstore', commit: true });
});
