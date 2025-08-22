import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

import { GCSStoreDelegate } from '../stores/gcsStoreDelegate.js';

// Mock the Google Cloud Storage
class MockStorage {
    bucket(bucketName) {
        return new MockBucket(bucketName);
    }
}

class MockBucket {
    constructor(bucketName) {
        this.bucketName = bucketName;
        this.mockFiles = new Map();
    }

    async getFiles({ prefix }) {
        const files = [];
        for (const [filename, content] of this.mockFiles) {
            if (filename.startsWith(prefix)) {
                files.push({
                    name: filename,
                    generation: 'test-generation'
                });
            }
        }
        return [files];
    }

    file(filename) {
        return {
            name: filename,
            save: async (content) => {
                this.mockFiles.set(filename, content);
            },
            download: async () => {
                return this.mockFiles.get(filename) || '';
            }
        };
    }

    setMockFile(filename, content) {
        this.mockFiles.set(filename, content);
    }
}

suite('GCSStoreDelegate Prefix Logic Tests', () => {
    let mockStorage;
    let mockBucket;

    // Setup mock before each test
    function setupMocks() {
        mockStorage = new MockStorage();
        mockBucket = mockStorage.bucket('test-bucket');
        
        // Mock files with different prefixes
        mockBucket.setMockFile('tm-store/file1.json', 'content1');
        mockBucket.setMockFile('tm-store/file2.json', 'content2');
        mockBucket.setMockFile('tm-store-fancy/file3.json', 'content3');
        mockBucket.setMockFile('tm-store-cool/file4.json', 'content4');
        mockBucket.setMockFile('other-prefix/file5.json', 'content5');
    }

    test('prefix without trailing slash should add one and list only matching files', async () => {
        setupMocks();
        
        const delegate = new GCSStoreDelegate('test-bucket', 'tm-store');
        // Override the storage with our mock
        delegate.storage = mockStorage;
        delegate.bucket = mockBucket;

        const files = await delegate.listAllFiles();
        
        // Should only return files from 'tm-store/' directory, not 'tm-store-fancy' or 'tm-store-cool'
        assert.equal(files.length, 2);
        assert.deepEqual(files.map(f => f[0]).sort(), ['file1.json', 'file2.json']);
    });

    test('prefix with trailing slash should not add another slash', async () => {
        setupMocks();
        
        const delegate = new GCSStoreDelegate('test-bucket', 'tm-store/');
        // Override the storage with our mock
        delegate.storage = mockStorage;
        delegate.bucket = mockBucket;

        const files = await delegate.listAllFiles();
        
        // Should still only return files from 'tm-store/' directory
        assert.equal(files.length, 2);
        assert.deepEqual(files.map(f => f[0]).sort(), ['file1.json', 'file2.json']);
    });

    test('different prefixes should be isolated from each other', async () => {
        setupMocks();
        
        // Test tm-store-fancy prefix
        const fancyDelegate = new GCSStoreDelegate('test-bucket', 'tm-store-fancy');
        fancyDelegate.storage = mockStorage;
        fancyDelegate.bucket = mockBucket;

        const fancyFiles = await fancyDelegate.listAllFiles();
        assert.equal(fancyFiles.length, 1);
        assert.equal(fancyFiles[0][0], 'file3.json');

        // Test tm-store-cool prefix
        const coolDelegate = new GCSStoreDelegate('test-bucket', 'tm-store-cool');
        coolDelegate.storage = mockStorage;
        coolDelegate.bucket = mockBucket;

        const coolFiles = await coolDelegate.listAllFiles();
        assert.equal(coolFiles.length, 1);
        assert.equal(coolFiles[0][0], 'file4.json');
    });

    test('common prefix issue should be resolved', async () => {
        setupMocks();
        
        // This test specifically validates the bug fix
        // Before the fix, 'tm-store' would incorrectly match files from 'tm-store-fancy' and 'tm-store-cool'
        const delegate = new GCSStoreDelegate('test-bucket', 'tm-store');
        delegate.storage = mockStorage;
        delegate.bucket = mockBucket;

        const files = await delegate.listAllFiles();
        
        // Should NOT include files from tm-store-fancy or tm-store-cool
        const filenames = files.map(f => f[0]);
        assert.equal(files.length, 2);
        assert.ok(!filenames.includes('file3.json'), 'Should not include file from tm-store-fancy');
        assert.ok(!filenames.includes('file4.json'), 'Should not include file from tm-store-cool');
        assert.ok(filenames.includes('file1.json'), 'Should include file from tm-store');
        assert.ok(filenames.includes('file2.json'), 'Should include file from tm-store');
    });

    test('empty prefix should work correctly', async () => {
        setupMocks();
        
        const delegate = new GCSStoreDelegate('test-bucket', '');
        delegate.storage = mockStorage;
        delegate.bucket = mockBucket;

        const files = await delegate.listAllFiles();
        
        // Should return all files when prefix is empty (no prefix filtering)
        assert.equal(files.length, 5);
    });

    test('file name replacement should use correct prefix', async () => {
        setupMocks();
        
        // Test with prefix without trailing slash
        const delegate1 = new GCSStoreDelegate('test-bucket', 'tm-store');
        delegate1.storage = mockStorage;
        delegate1.bucket = mockBucket;

        const files1 = await delegate1.listAllFiles();
        const filenames1 = files1.map(f => f[0]);
        assert.ok(filenames1.every(name => !String(name).startsWith('tm-store/')), 
                  'Filenames should have prefix removed');

        const delegate2 = new GCSStoreDelegate('test-bucket', 'tm-store/');
        delegate2.storage = mockStorage;
        delegate2.bucket = mockBucket;

        const files2 = await delegate2.listAllFiles();
        const filenames2 = files2.map(f => f[0]);
        assert.ok(filenames2.every(name => !String(name).startsWith('tm-store/')), 
                  'Filenames should have prefix removed');
        
        assert.deepEqual(filenames1.sort(), filenames2.sort());
    });
});