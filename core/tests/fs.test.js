import { strict as assert } from 'assert';
import { test, beforeEach, afterEach } from 'node:test';
import { FsSource, FsTarget } from '../src/helpers/adapters/fs.js';
import { writeFileSync, readFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import * as path from 'path';
import { setBaseDir } from '../src/l10nContext.js';

const TEST_BASE_DIR = path.resolve('test_base');

beforeEach(() => {
    // Set up the test base directory
    if (!existsSync(TEST_BASE_DIR)) {
        mkdirSync(TEST_BASE_DIR, { recursive: true });
    }
    // Set the L10nContext baseDir to the test directory for proper path resolution
    setBaseDir(TEST_BASE_DIR);
});

afterEach(() => {
    // Clean up the test base directory
    if (existsSync(TEST_BASE_DIR)) {
        rmSync(TEST_BASE_DIR, { recursive: true });
    }
});

test('FsSource: fetchAllResources retrieves metadata', async () => {
    const testFilePath = path.join(TEST_BASE_DIR, 'testFile.json');
    writeFileSync(testFilePath, '{"key": "value"}');

    const fsSource = new FsSource({
        baseDir: '.',
        sourceLang: 'en',
        globs: ['**/*.json'],
        idFromPath: (id) => id.replace(/\\/g, '/'), // Normalize path for consistent ID
    });

    let count = 0;
    for await (const [resourceStat] of fsSource.fetchAllResources()) {
        assert.equal(resourceStat.id, 'testFile.json', 'Resource ID should match');
        assert.ok(resourceStat.modified, 'Resource metadata should include modified date');
        assert.equal(resourceStat.sourceLang, 'en', 'Resource sourceLang should match');
        count++;
    }
    assert.equal(count, 1, 'It should find one resource');
});

test('FsSource: fetchAllResources retrieves file content', async () => {
    const testFilePath = path.join(TEST_BASE_DIR, 'testFile.json');
    const fileContent = '{"key": "value"}';
    writeFileSync(testFilePath, fileContent);

    const fsSource = new FsSource({
        baseDir: '.',
        sourceLang: 'en',
        globs: ['**/*.json'],
        idFromPath: (id) => id.replace(/\\/g, '/'), // Normalize path for consistent ID
    });

    let count = 0;
    for await (const [, rawResource] of fsSource.fetchAllResources()) {
        assert.equal(rawResource, fileContent, 'The retrieved content should match the file content');
        count++;
    }
    assert.equal(count, 1, 'It should find one resource');
});

test('FsSource: fetchAllResources yields complete resource data for multiple files', async () => {
    const file1Path = path.join(TEST_BASE_DIR, 'file1.txt');
    const file1Content = 'Content of file1';
    writeFileSync(file1Path, file1Content);

    const subDir = path.join(TEST_BASE_DIR, 'subdir');
    mkdirSync(subDir, { recursive: true });
    const file2Path = path.join(subDir, 'file2.md');
    const file2Content = '# Content of file2';
    writeFileSync(file2Path, file2Content);

    const fsSource = new FsSource({
        baseDir: '.',
        sourceLang: 'en',
        globs: ['**/*.txt', '**/*.md'],
        idFromPath: (id) => id.replace(/\\/g, '/'), // Normalize path for consistent ID
    });

    const results = [];
    for await (const resourcePair of fsSource.fetchAllResources()) {
        results.push(resourcePair);
    }

    assert.equal(results.length, 2, 'Should find two resources');

    const file1Data = results.find(r => r[0].id === 'file1.txt');
    assert.ok(file1Data, 'file1.txt should be found');
    assert.equal(file1Data[0].id, 'file1.txt');
    assert.ok(file1Data[0].modified);
    assert.equal(file1Data[0].sourceLang, 'en');
    assert.equal(file1Data[1], file1Content);

    const file2Data = results.find(r => r[0].id === 'subdir/file2.md');
    assert.ok(file2Data, 'subdir/file2.md should be found');
    assert.equal(file2Data[0].id, 'subdir/file2.md');
    assert.ok(file2Data[0].modified);
    assert.equal(file2Data[0].sourceLang, 'en');
    assert.equal(file2Data[1], file2Content);
});

test('FsTarget: commitTranslatedResource writes or deletes files', async () => {
    const fsTarget = new FsTarget({
        baseDir: '.',
        targetPath: (lang, resourceId) => `${lang}/${resourceId}`,
        deleteEmpty: true,
    });

    const lang = 'en';
    const resourceId = 'testFile.json';
    const translatedContent = '{"key": "translatedValue"}';
    const targetPath = fsTarget.translatedResourceId(lang, resourceId);

    // Save translated resource
    await fsTarget.commitTranslatedResource(lang, resourceId, translatedContent);
    assert.ok(existsSync(targetPath), 'The translated file should exist after saving');
    assert.equal(
        readFileSync(targetPath, 'utf8'),
        translatedContent,
        'The content of the translated file should match'
    );

    // Delete the translated resource
    await fsTarget.commitTranslatedResource(lang, resourceId, null);
    assert.ok(!existsSync(targetPath), 'The translated file should be deleted');
});

test('FsTarget: fetchTranslatedResource retrieves file content', async () => {
    const fsTarget = new FsTarget({
        baseDir: '.',
        targetPath: (lang, resourceId) => `${lang}/${resourceId}`,
    });

    const lang = 'en';
    const resourceId = 'testFile.json';
    const translatedContent = '{"key": "translatedValue"}';
    const targetPath = fsTarget.translatedResourceId(lang, resourceId);

    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, translatedContent);

    const content = await fsTarget.fetchTranslatedResource(lang, resourceId);
    assert.equal(content, translatedContent, 'The content should match the translated file');
});
