#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const rootDir = process.cwd();
const packages = [
    'helpers-android', 'helpers-anthropic', 'helpers-deepl', 'helpers-demo',
    'helpers-googlecloud', 'helpers-html', 'helpers-ios', 'helpers-java',
    'helpers-json', 'helpers-lqaboss', 'helpers-openai', 'helpers-po',
    'helpers-translated', 'helpers-xliff', 'cli', 'mcp', 'server'
];

for (const pkg of packages) {
    const pkgPath = join(rootDir, pkg, 'package.json');
    try {
        const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf8'));
        pkgJson.scripts = pkgJson.scripts || {};
        if (!pkgJson.scripts.typecheck) {
            pkgJson.scripts.typecheck = 'tsc --noEmit';
            writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 4) + '\n');
            console.log(`Added typecheck to ${pkg}/package.json`);
        } else {
            console.log(`typecheck already exists in ${pkg}/package.json`);
        }
    } catch (e) {
        console.log(`Skipped ${pkg}: ${e.message}`);
    }
}
