#!/usr/bin/env node

/**
 * Generates .d.ts files for each .js entry point.
 * Since all entry points just re-export from @l10nmonster packages,
 * the .d.ts content is identical to the .js content.
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const srcDir = join(import.meta.dirname, '..', 'src');

// Get all .js files except cli.js (which has its own .d.ts)
const jsFiles = readdirSync(srcDir)
    .filter(f => f.endsWith('.js') && f !== 'cli.js');

let updated = 0;

for (const jsFile of jsFiles) {
    const dtsFile = jsFile.replace('.js', '.d.ts');
    const jsPath = join(srcDir, jsFile);
    const dtsPath = join(srcDir, dtsFile);

    const jsContent = readFileSync(jsPath, 'utf8');

    // Check if .d.ts exists and matches
    let existingDts = '';
    try {
        existingDts = readFileSync(dtsPath, 'utf8');
    } catch {
        // File doesn't exist
    }

    if (existingDts !== jsContent) {
        writeFileSync(dtsPath, jsContent);
        console.log(`Generated ${dtsFile}`);
        updated++;
    }
}

if (updated === 0) {
    console.log('All .d.ts files are up to date');
} else {
    console.log(`\nUpdated ${updated} .d.ts files`);
}
