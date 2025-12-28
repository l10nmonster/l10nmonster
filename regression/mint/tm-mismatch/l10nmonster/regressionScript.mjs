import config from './l10nmonster.config.mjs';

await config.verbose(3).regression(true).run(async ({l10n}) => {
    // Step 1: Sync down from storeA - jobs get assigned tmStore=storeA
    // storeA already has jobs for sharedJob with greeting, farewell, thanks
    await l10n.tm_syncdown({ tmStore: 'storeA', commit: true });

    // Step 2: Sync down from storeB - jobs already exist with tmStore=storeA, so they won't be overwritten
    // storeB also has the same jobs (same jobGuid = sharedJob)
    await l10n.tm_syncdown({ tmStore: 'storeB', commit: true });

    // Step 3: Export status before syncup to see current state
    await l10n.source_list({ statusFile: 'status-before.json' });

    // Step 4: Sync up to storeB with delete=true
    // Since jobs exist in storeB remotely but have tmStore=storeA locally,
    // they should be identified as mismatched and removed from storeB
    await l10n.tm_syncup({ tmStore: 'storeB', commit: true, delete: true });

    // Step 5: Export final status
    await l10n.source_list({ statusFile: 'status.json' });

    // Step 6: Bootstrap from storeA - wipes entire TM database and reloads from storeA
    await l10n.tm_bootstrap({ tmStore: 'storeA', commit: true });

    // Step 7: Export status after bootstrap to verify
    await l10n.source_list({ statusFile: 'status-after-bootstrap.json' });
});
