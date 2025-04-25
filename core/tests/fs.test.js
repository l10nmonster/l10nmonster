// import { suite, test } from 'node:test';
// import assert from 'node:assert/strict';

// import * as path from 'path';
// import { L10nContext, adapters } from '../index.js';

// L10nContext.baseDir = path.resolve('.');

// const RESOURCE_ID = "artifacts/messages.properties";

// suite('FsSource tests', () => {
//   const source = new adapters.FsSource({
//       globs: [ RESOURCE_ID ],
//       targetLangs: [ 'fil' ]
//   });


//   test('fetchResourceStats returns resource object', async () => {
//     const resources = await source.fetchResourceStats();
//     // assert.equal(resources, RESOURCE_ID);
//     assert.equal(resources[0].id, RESOURCE_ID);
//   });

//   test('fetchResource returns string', async () => {
//     const output = await source.fetchResource(RESOURCE_ID);
//     assert.equal(output.length, 207);
//   });

// //   test('fetchAllResources returns stats and resource object', async () => {
// //     for await (const [resourceStat, rawResource] of source.fetchAllResources()) {
// //         assert.equal(resourceStat.id, RESOURCE_ID);
// //         assert.equal(rawResource.length, 558);
// //     }
// //   });

// });

// suite('FsTarget tests', () => {
//   const target = new adapters.FsTarget({
//       targetPath: (lang, resourceId) => resourceId.replace('values', `values-${lang}`),
//   });
//   test('fetchTranslatedResource returns a file', async () => {
//     const resources = await target.fetchTranslatedResource("fil", RESOURCE_ID);
//     assert.equal(resources.length, 207);
//   });

// // TODO: test('commitTranslatedResource writes a file', async () => {
// //   });

// });

// DeepSeek
// import { describe, it, before, after } from 'node:test';
// import assert from 'node:assert';
// import * as path from 'path';
// import { mkdirSync, writeFileSync, unlinkSync, rmSync, readFileSync } from 'fs';
// import { FsSource, FsTarget } from '../src/helpers/adapters/fs.js';

// describe('FsSource', () => {
//     const baseDir = path.resolve('./test-fs-source');
//     const testFile = path.join(baseDir, 'test.txt');
//     const testContent = 'Hello, World!';

//     before(() => {
//         mkdirSync(baseDir, { recursive: true });
//         writeFileSync(testFile, testContent, 'utf8');
//     });

//     after(() => {
//         unlinkSync(testFile);
//         rmSync(baseDir, { recursive: true, force: true });
//     });

//     it('should fetch resource stats', async () => {
//         const fsSource = new FsSource({
//             baseDir,
//             globs: ['**/*.txt'],
//         });

//         const resources = await fsSource.fetchResourceStats();
//         assert.strictEqual(resources.length, 1);
//         assert.strictEqual(resources[0].id, 'test.txt');
//         assert.ok(resources[0].modified);
//     });

//     it('should fetch resource content', async () => {
//         const fsSource = new FsSource({
//             baseDir,
//             globs: ['**/*.txt'],
//         });

//         const content = await fsSource.fetchResource('test.txt');
//         assert.strictEqual(content, testContent);
//     });
// });

// describe('FsTarget', () => {
//     const baseDir = path.resolve('./test-fs-target');
//     const lang = 'en';
//     const resourceId = 'test.txt';
//     const translatedContent = 'Translated Content';

//     before(() => {
//         mkdirSync(baseDir, { recursive: true });
//     });

//     after(() => {
//         rmSync(baseDir, { recursive: true, force: true });
//     });

//     it('should save translated resource', async () => {
//         const fsTarget = new FsTarget({
//             baseDir,
//             targetPath: (lang, resourceId) => path.join(lang, resourceId),
//         });

//         await fsTarget.commitTranslatedResource(lang, resourceId, translatedContent);
//         const translatedPath = fsTarget.translatedResourceId(lang, resourceId);
//         const content = readFileSync(translatedPath, 'utf8');
//         assert.strictEqual(content, translatedContent);
//     });

//     it('should delete translated resource if content is null', async () => {
//         const fsTarget = new FsTarget({
//             baseDir,
//             targetPath: (lang, resourceId) => path.join(lang, resourceId),
//             deleteEmpty: true,
//         });

//         const translatedPath = fsTarget.translatedResourceId(lang, resourceId);
//         writeFileSync(translatedPath, translatedContent, 'utf8');

//         await fsTarget.commitTranslatedResource(lang, resourceId, null);
//         assert.throws(() => readFileSync(translatedPath, 'utf8'), /ENOENT/);
//     });
// });

// GPT-4o
import { strict as assert } from 'assert';
import { test, beforeEach, afterEach } from 'node:test';
import { FsSource, FsTarget } from '../src/helpers/adapters/fs.js';
import { writeFileSync, readFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import * as path from 'path';

const TEST_BASE_DIR = path.resolve('test_base');

beforeEach(() => {
    // Set up the test base directory
    if (!existsSync(TEST_BASE_DIR)) {
        mkdirSync(TEST_BASE_DIR, { recursive: true });
    }
});

afterEach(() => {
    // Clean up the test base directory
    if (existsSync(TEST_BASE_DIR)) {
        rmSync(TEST_BASE_DIR, { recursive: true });
    }
});

test('FsSource: fetchResourceStats retrieves metadata', async () => {
    const testFilePath = path.join(TEST_BASE_DIR, 'testFile.json');
    writeFileSync(testFilePath, '{"key": "value"}');

    const fsSource = new FsSource({
        baseDir: TEST_BASE_DIR,
        sourceLang: 'en',
        globs: ['**/*.json'],
        idFromPath: (id) => id.replace(/\\/g, '/'),
    });

    const resourceStats = await fsSource.fetchResourceStats();

    assert.equal(resourceStats.length, 1, 'It should find one resource metadata');
    assert.equal(resourceStats[0].id, 'testFile.json');
    assert.ok(resourceStats[0].modified, 'Resource metadata should include modified date');
});

test('FsSource: fetchResource retrieves file content', async () => {
    const testFilePath = path.join(TEST_BASE_DIR, 'testFile.json');
    const fileContent = '{"key": "value"}';
    writeFileSync(testFilePath, fileContent);

    const fsSource = new FsSource({
        baseDir: TEST_BASE_DIR,
        sourceLang: 'en',
        globs: ['**/*.json'],
    });

    const content = await fsSource.fetchResource('testFile.json');
    assert.equal(content, fileContent, 'The retrieved content should match the file content');
});

test('FsTarget: commitTranslatedResource writes or deletes files', async () => {
    const fsTarget = new FsTarget({
        baseDir: TEST_BASE_DIR,
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
        baseDir: TEST_BASE_DIR,
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
