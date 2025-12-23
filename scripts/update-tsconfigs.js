#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const rootDir = process.cwd();
const packages = [
    'helpers-android', 'helpers-anthropic', 'helpers-deepl', 'helpers-demo',
    'helpers-googlecloud', 'helpers-html', 'helpers-ios', 'helpers-java',
    'helpers-json', 'helpers-lqaboss', 'helpers-openai', 'helpers-po',
    'helpers-translated', 'helpers-xliff', 'cli', 'mcp', 'server'
];

const tsconfigContent = {
    extends: "../tsconfig.base.json",
    include: ["*.js", "**/*.js"],
    exclude: [
        "node_modules",
        "**/node_modules",
        "test/**",
        "tests/**",
        "**/*.test.js",
        "**/*.spec.js",
        "dist/**",
        "ui/**",
        "types/**"
    ]
};

for (const pkg of packages) {
    const tsconfigPath = join(rootDir, pkg, 'tsconfig.json');
    try {
        writeFileSync(tsconfigPath, JSON.stringify(tsconfigContent, null, 2) + '\n');
        console.log(`Updated ${pkg}/tsconfig.json`);
    } catch (e) {
        console.log(`Skipped ${pkg}: ${e.message}`);
    }
}
