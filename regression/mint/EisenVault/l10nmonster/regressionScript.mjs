import config from './l10nmonster.config.mjs';

await config.verbose(3).regression(true).run(async ({l10n}) => {
    await l10n.source_untranslated({ push: true, provider: 'Grandfather' });
    await l10n.source_untranslated({ push: true, provider: ['Repetition', 'PigLatinizer'] });
    await l10n.translate();
    await l10n.source_list({ statusFile: 'status.json' });
    await l10n.tm_export({ jobsDir: 'tmexport' });
});
