import { suite, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { TuDAL } from '../src/DAL/tu.js';

suite('TM Store Mismatch Tests', () => {
    let db;
    let tuDAL;

    beforeEach(() => {
        db = new Database(':memory:');
        db.pragma('journal_mode = WAL');
        // Create a mock DAL manager with empty activeChannels
        const mockDAL = {
            activeChannels: new Set(),
            channel: () => { throw new Error('No channels in test'); }
        };
        tuDAL = new TuDAL(db, 'en', 'es', mockDAL);
    });

    afterEach(() => {
        db.close();
    });

    function insertJob(jobGuid, sourceLang, targetLang, tmStore, updatedAt) {
        db.prepare(/* sql */`
            INSERT INTO jobs (jobGuid, sourceLang, targetLang, translationProvider, status, updatedAt, jobProps, tmStore)
            VALUES (?, ?, ?, 'TestProvider', 'done', ?, '{}', ?)
        `).run(jobGuid, sourceLang, targetLang, updatedAt, tmStore);
    }

    suite('getJobDeltas', () => {
        test('includes jobs with TM store mismatch even with matching timestamps', async () => {
            const jobGuid = 'job1';
            const timestamp = '2025-01-01T00:00:00.000Z';

            // Insert a job assigned to storeA
            insertJob(jobGuid, 'en', 'es', 'storeA', timestamp);

            // Create a TOC that includes the same job with matching timestamp
            const toc = {
                v: 1,
                sourceLang: 'en',
                targetLang: 'es',
                blocks: {
                    'block1': {
                        modified: 'TS123',
                        jobs: [[jobGuid, timestamp]]
                    }
                }
            };

            // Call getJobDeltas with storeId = 'storeB' (different store)
            const deltas = await tuDAL.getJobDeltas(toc, 'storeB');

            // Job should appear in deltas due to TM store mismatch
            assert.equal(deltas.length, 1);
            assert.equal(deltas[0].localJobGuid, jobGuid);
            assert.equal(deltas[0].tmStore, 'storeA');
        });

        test('excludes jobs with matching timestamps and same TM store', async () => {
            const jobGuid = 'job1';
            const timestamp = '2025-01-01T00:00:00.000Z';

            // Insert a job assigned to storeA
            insertJob(jobGuid, 'en', 'es', 'storeA', timestamp);

            // Create a TOC with matching timestamp
            const toc = {
                v: 1,
                sourceLang: 'en',
                targetLang: 'es',
                blocks: {
                    'block1': {
                        modified: 'TS123',
                        jobs: [[jobGuid, timestamp]]
                    }
                }
            };

            // Call getJobDeltas with storeId = 'storeA' (same store)
            const deltas = await tuDAL.getJobDeltas(toc, 'storeA');

            // Job should NOT appear in deltas (timestamps match, same store)
            assert.equal(deltas.length, 0);
        });

        test('includes jobs with different timestamps regardless of TM store', async () => {
            const jobGuid = 'job1';
            const localTimestamp = '2025-01-01T00:00:00.000Z';
            const remoteTimestamp = '2024-12-01T00:00:00.000Z';

            insertJob(jobGuid, 'en', 'es', 'storeA', localTimestamp);

            const toc = {
                v: 1,
                sourceLang: 'en',
                targetLang: 'es',
                blocks: {
                    'block1': {
                        modified: 'TS123',
                        jobs: [[jobGuid, remoteTimestamp]] // Different timestamp
                    }
                }
            };

            const deltas = await tuDAL.getJobDeltas(toc, 'storeA');

            // Job should appear because timestamps differ
            assert.equal(deltas.length, 1);
            assert.equal(deltas[0].localJobGuid, jobGuid);
        });

        test('includes remote-only jobs (missing locally)', async () => {
            const toc = {
                v: 1,
                sourceLang: 'en',
                targetLang: 'es',
                blocks: {
                    'block1': {
                        modified: 'TS123',
                        jobs: [['remoteOnlyJob', '2025-01-01T00:00:00.000Z']]
                    }
                }
            };

            const deltas = await tuDAL.getJobDeltas(toc, 'storeA');

            assert.equal(deltas.length, 1);
            assert.equal(deltas[0].remoteJobGuid, 'remoteOnlyJob');
            assert.equal(deltas[0].localJobGuid, null);
        });

        test('includes local-only jobs (missing remotely)', async () => {
            insertJob('localOnlyJob', 'en', 'es', 'storeA', '2025-01-01T00:00:00.000Z');

            const toc = {
                v: 1,
                sourceLang: 'en',
                targetLang: 'es',
                blocks: {}
            };

            const deltas = await tuDAL.getJobDeltas(toc, 'storeA');

            assert.equal(deltas.length, 1);
            assert.equal(deltas[0].localJobGuid, 'localOnlyJob');
            assert.equal(deltas[0].remoteJobGuid, null);
        });
    });

    suite('getValidJobIds', () => {
        test('returns only jobs assigned to the target TM store', async () => {
            const timestamp = '2025-01-01T00:00:00.000Z';

            // Insert jobs with different TM stores
            insertJob('jobA', 'en', 'es', 'storeA', timestamp);
            insertJob('jobB', 'en', 'es', 'storeB', timestamp);
            insertJob('jobC', 'en', 'es', 'storeA', timestamp);

            const toc = {
                v: 1,
                sourceLang: 'en',
                targetLang: 'es',
                blocks: {
                    'block1': {
                        modified: 'TS123',
                        jobs: [
                            ['jobA', timestamp],
                            ['jobB', timestamp],
                            ['jobC', timestamp]
                        ]
                    }
                }
            };

            const validIds = await tuDAL.getValidJobIds(toc, 'block1', 'storeA');

            // Should only return jobs assigned to storeA
            assert.equal(validIds.length, 2);
            assert.ok(validIds.includes('jobA'));
            assert.ok(validIds.includes('jobC'));
            assert.ok(!validIds.includes('jobB'));
        });

        test('excludes jobs with NULL tmStore', async () => {
            const timestamp = '2025-01-01T00:00:00.000Z';

            insertJob('jobAssigned', 'en', 'es', 'storeA', timestamp);
            insertJob('jobUnassigned', 'en', 'es', null, timestamp);

            const toc = {
                v: 1,
                sourceLang: 'en',
                targetLang: 'es',
                blocks: {
                    'block1': {
                        modified: 'TS123',
                        jobs: [
                            ['jobAssigned', timestamp],
                            ['jobUnassigned', timestamp]
                        ]
                    }
                }
            };

            const validIds = await tuDAL.getValidJobIds(toc, 'block1', 'storeA');

            // Should only return assigned job, exclude NULL tmStore
            assert.equal(validIds.length, 1);
            assert.ok(validIds.includes('jobAssigned'));
            assert.ok(!validIds.includes('jobUnassigned'));
        });

        test('returns empty array when no jobs match the TM store', async () => {
            const timestamp = '2025-01-01T00:00:00.000Z';

            insertJob('jobB', 'en', 'es', 'storeB', timestamp);

            const toc = {
                v: 1,
                sourceLang: 'en',
                targetLang: 'es',
                blocks: {
                    'block1': {
                        modified: 'TS123',
                        jobs: [['jobB', timestamp]]
                    }
                }
            };

            const validIds = await tuDAL.getValidJobIds(toc, 'block1', 'storeA');

            // No jobs assigned to storeA
            assert.equal(validIds.length, 0);
        });
    });
});
