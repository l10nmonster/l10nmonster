import fs from 'node:fs';
import path from 'node:path';
import config from './l10nmonster.config.mjs';

await config.verbose(3).regression(true).run(async ({l10n}) => {
    // Step 1: Snap source content to create initial state
    await l10n.source_snap({});

    // Step 2: Export the channel to snap store
    await l10n.source_export({ snapStore: 'local' });

    // Step 3: Delete the source DB to simulate fresh install
    const dbPath = path.join(import.meta.dirname, 'l10nmonsterSource.db');
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
    }
    // Also delete WAL files if they exist
    for (const suffix of ['-wal', '-shm']) {
        const walPath = dbPath + suffix;
        if (fs.existsSync(walPath)) {
            fs.unlinkSync(walPath);
        }
    }
});

// Step 4: Re-run with import to restore from snap store
await config.verbose(3).regression(true).run(async ({l10n}) => {
    await l10n.source_import({ snapStore: 'local' });

    // Step 5: List resources to verify data was restored
    await l10n.source_list({ statusFile: 'status.json' });
});

// Clean up snapshots directory (timestamps change every run)
const snapshotsDir = path.join(import.meta.dirname, 'snapshots');
fs.rmSync(snapshotsDir, { recursive: true, force: true });
