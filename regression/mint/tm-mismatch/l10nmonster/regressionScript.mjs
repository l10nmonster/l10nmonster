import config from './l10nmonster.config.mjs';
import Database from 'better-sqlite3';

await config.verbose(3).regression(true).run(async ({l10n}) => {
    // Step 1: Create translations and sync up to storeA
    await l10n.source_untranslated({ push: true, provider: true });
    await l10n.translate();
    await l10n.tm_syncup({ tmStore: 'storeA', commit: true, includeUnassigned: true });

    // Step 2: Verify storeA has jobs (via status)
    await l10n.source_list({ statusFile: 'status-before.json' });

    // Step 3: Reassign one job to storeB by directly modifying the local DB
    // This simulates the scenario where a job is assigned to a different store
    const db = new Database('./l10nmonsterTM.db');

    // Get the first job and reassign it to storeB
    const job = db.prepare('SELECT jobGuid FROM jobs LIMIT 1').get();
    if (job) {
        console.log(`Reassigning job ${job.jobGuid} from storeA to storeB`);
        db.prepare('UPDATE jobs SET tmStore = ? WHERE jobGuid = ?').run('storeB', job.jobGuid);
    }
    db.close();

    // Step 4: Sync up to storeA again with delete=true
    // The reassigned job should be removed from storeA's blocks
    // Note: deleteEmptyBlocks controls whether mismatched jobs trigger block updates
    await l10n.tm_syncup({ tmStore: 'storeA', commit: true, delete: true });

    // Step 5: Export final status
    await l10n.source_list({ statusFile: 'status.json' });
    await l10n.translate();
});
