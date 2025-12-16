import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

import { providers } from '../index.js';

const { Repetition } = providers;

// Mock TM that returns exact matches for sources
class MockTM {
    constructor(matches = [], matchesBySource = null) {
        this.matches = matches;
        this.matchesBySource = matchesBySource;
    }

    async getExactMatches(nsrc) {
        if (this.matchesBySource) {
            const key = JSON.stringify(nsrc);
            return this.matchesBySource[key] || [];
        }
        return this.matches;
    }
}

// Mock MonsterManager with a mock TM
function createMockMM(tmMatches = [], matchesBySource = null) {
    return {
        tmm: {
            getTM: () => new MockTM(tmMatches, matchesBySource),
        },
    };
}

suite('Repetition provider tests', () => {
    test('accepts non-pluralized TUs with matching TM entries', async () => {
        const repetition = new Repetition({});
        const tmMatches = [
            { sid: 'test-sid', ntgt: ['translated text'], q: 100, ts: Date.now(), guid: 'match-guid' }
        ];
        repetition.mm = createMockMM(tmMatches);

        const job = {
            sourceLang: 'en',
            targetLang: 'de',
            tus: [
                { sid: 'test-sid', nsrc: ['source text'], minQ: 50 }
            ]
        };

        const acceptedTus = await repetition.getAcceptedTus(job);
        assert.equal(acceptedTus.length, 1);
        assert.deepEqual(acceptedTus[0].ntgt, ['translated text']);
    });

    test('rejects pluralized TUs', async () => {
        const repetition = new Repetition({});
        const tmMatches = [
            { sid: 'test-sid', ntgt: ['translated text'], q: 100, ts: Date.now(), guid: 'match-guid' }
        ];
        repetition.mm = createMockMM(tmMatches);

        const job = {
            sourceLang: 'en',
            targetLang: 'de',
            tus: [
                { sid: 'test-sid', nsrc: ['source text'], minQ: 50, pluralForm: 'one' },
                { sid: 'test-sid-2', nsrc: ['source text 2'], minQ: 50, pluralForm: 'other' }
            ]
        };

        const acceptedTus = await repetition.getAcceptedTus(job);
        assert.equal(acceptedTus.length, 0);
    });

    test('accepts non-pluralized TUs while rejecting pluralized ones in mixed job', async () => {
        const repetition = new Repetition({});
        const tmMatches = [
            { sid: 'test-sid', ntgt: ['translated text'], q: 100, ts: Date.now(), guid: 'match-guid' }
        ];
        repetition.mm = createMockMM(tmMatches);

        const job = {
            sourceLang: 'en',
            targetLang: 'de',
            tus: [
                { sid: 'test-sid', nsrc: ['source text'], minQ: 50 },
                { sid: 'test-sid-plural', nsrc: ['source text'], minQ: 50, pluralForm: 'one' }
            ]
        };

        const acceptedTus = await repetition.getAcceptedTus(job);
        assert.equal(acceptedTus.length, 1);
        assert.equal(acceptedTus[0].sid, 'test-sid');
    });
});

suite('Repetition provider holdInternalLeverage tests', () => {
    test('throws error when holdInternalLeverage is true but expectedQuality is not provided', () => {
        assert.throws(() => {
            // eslint-disable-next-line no-new
            new Repetition({ holdInternalLeverage: true });
        }, /expectedQuality is required when holdInternalLeverage is true/);
    });

    test('holds back identical TUs with same sid when penalty allows leverage', async () => {
        const repetition = new Repetition({
            holdInternalLeverage: true,
            expectedQuality: 80,
            qualifiedPenalty: 0,
            unqualifiedPenalty: 10,
        });
        repetition.mm = createMockMM([]);

        const job = {
            sourceLang: 'en',
            targetLang: 'de',
            tus: [
                { guid: 'tu1', sid: 'same-sid', nsrc: ['same text'], minQ: 50 },
                { guid: 'tu2', sid: 'same-sid', nsrc: ['same text'], minQ: 50 },
                { guid: 'tu3', sid: 'same-sid', nsrc: ['same text'], minQ: 50 },
            ]
        };

        const acceptedTus = await repetition.getAcceptedTus(job);
        // With same sid and qualifiedPenalty=0, all can share from one translation
        // So 2 should be held back (1 sent for translation)
        assert.equal(acceptedTus.length, 2);
        assert.ok(acceptedTus.every(tu => tu.inflight === true));
        assert.ok(acceptedTus.every(tu => tu.q === 80)); // expectedQuality - qualifiedPenalty(0)
    });

    test('sends multiple TUs for translation when unqualifiedPenalty prevents leverage', async () => {
        const repetition = new Repetition({
            holdInternalLeverage: true,
            expectedQuality: 80,
            qualifiedPenalty: 0,
            unqualifiedPenalty: 40, // High penalty
        });
        repetition.mm = createMockMM([]);

        const job = {
            sourceLang: 'en',
            targetLang: 'de',
            tus: [
                { guid: 'tu1', sid: 'sid-a', nsrc: ['same text'], minQ: 50 },
                { guid: 'tu2', sid: 'sid-b', nsrc: ['same text'], minQ: 50 },
                { guid: 'tu3', sid: 'sid-c', nsrc: ['same text'], minQ: 50 },
            ]
        };

        const acceptedTus = await repetition.getAcceptedTus(job);
        // With different sids and unqualifiedPenalty=40, 80-40=40 < minQ(50)
        // So none can leverage from another, all must be translated
        // Therefore no holdouts
        assert.equal(acceptedTus.length, 0);
    });

    test('minimizes translations when some TUs can leverage but not all', async () => {
        const repetition = new Repetition({
            holdInternalLeverage: true,
            expectedQuality: 80,
            qualifiedPenalty: 0,
            unqualifiedPenalty: 20,
        });
        repetition.mm = createMockMM([]);

        const job = {
            sourceLang: 'en',
            targetLang: 'de',
            tus: [
                { guid: 'tu1', sid: 'sid-a', nsrc: ['same text'], minQ: 50 },
                { guid: 'tu2', sid: 'sid-a', nsrc: ['same text'], minQ: 50 },
                { guid: 'tu3', sid: 'sid-b', nsrc: ['same text'], minQ: 50 },
            ]
        };

        const acceptedTus = await repetition.getAcceptedTus(job);
        // tu1 and tu2 have same sid, qualifiedPenalty=0, so one can leverage from other
        // tu3 has different sid, 80-20=60 >= 50, so it can leverage from tu1 or tu2
        // Best case: 1 translation covers all 3
        // So 2 should be held back
        assert.equal(acceptedTus.length, 2);
    });

    test('respects minQ constraints when determining coverage', async () => {
        const repetition = new Repetition({
            holdInternalLeverage: true,
            expectedQuality: 80,
            qualifiedPenalty: 0,
            unqualifiedPenalty: 25,
        });
        repetition.mm = createMockMM([]);

        const job = {
            sourceLang: 'en',
            targetLang: 'de',
            tus: [
                { guid: 'tu1', sid: 'sid-a', nsrc: ['same text'], minQ: 50 },
                { guid: 'tu2', sid: 'sid-b', nsrc: ['same text'], minQ: 60 }, // Higher minQ
            ]
        };

        const acceptedTus = await repetition.getAcceptedTus(job);
        // tu1 with sid-a: can cover tu2? 80-25=55 < 60 (tu2.minQ) -> NO
        // tu2 with sid-b: can cover tu1? 80-25=55 >= 50 (tu1.minQ) -> YES
        // So tu2 should be the translator, tu1 can be held back
        assert.equal(acceptedTus.length, 1);
        assert.equal(acceptedTus[0].guid, 'tu1');
        assert.equal(acceptedTus[0].parentGuid, 'tu2');
        assert.equal(acceptedTus[0].q, 55); // 80 - 25
    });

    test('applies notesMismatchPenalty correctly', async () => {
        const repetition = new Repetition({
            holdInternalLeverage: true,
            expectedQuality: 80,
            qualifiedPenalty: 0,
            unqualifiedPenalty: 0,
            notesMismatchPenalty: 35,
        });
        repetition.mm = createMockMM([]);

        const job = {
            sourceLang: 'en',
            targetLang: 'de',
            tus: [
                { guid: 'tu1', sid: 'sid-a', nsrc: ['same text'], minQ: 50, notes: { desc: 'note A' } },
                { guid: 'tu2', sid: 'sid-a', nsrc: ['same text'], minQ: 50, notes: { desc: 'note B' } },
            ]
        };

        const acceptedTus = await repetition.getAcceptedTus(job);
        // Same sid but different notes: penalty = 0 + 35 = 35
        // 80 - 35 = 45 < 50 (minQ), so they can't leverage from each other
        // Both must be translated, no holdouts
        assert.equal(acceptedTus.length, 0);
    });

    test('does not hold back pluralized TUs', async () => {
        const repetition = new Repetition({
            holdInternalLeverage: true,
            expectedQuality: 80,
            qualifiedPenalty: 0,
            unqualifiedPenalty: 0,
        });
        repetition.mm = createMockMM([]);

        const job = {
            sourceLang: 'en',
            targetLang: 'de',
            tus: [
                { guid: 'tu1', sid: 'sid-a', nsrc: ['same text'], minQ: 50, pluralForm: 'one' },
                { guid: 'tu2', sid: 'sid-a', nsrc: ['same text'], minQ: 50, pluralForm: 'other' },
            ]
        };

        const acceptedTus = await repetition.getAcceptedTus(job);
        // Pluralized TUs should be skipped
        assert.equal(acceptedTus.length, 0);
    });

    test('combines holdInternalLeverage with TM lookup', async () => {
        const repetition = new Repetition({
            holdInternalLeverage: true,
            expectedQuality: 80,
            qualifiedPenalty: 0,
            unqualifiedPenalty: 0,
        });
        // Only the unique text has a TM match
        const matchesBySource = {
            '["unique text"]': [
                { sid: 'unique-sid', ntgt: ['translated'], q: 90, ts: Date.now(), guid: 'tm-guid' }
            ]
        };
        repetition.mm = createMockMM([], matchesBySource);

        const job = {
            sourceLang: 'en',
            targetLang: 'de',
            tus: [
                // These two have same source, one will be held back
                { guid: 'tu1', sid: 'dup-sid', nsrc: ['duplicate text'], minQ: 50 },
                { guid: 'tu2', sid: 'dup-sid', nsrc: ['duplicate text'], minQ: 50 },
                // This one has TM match
                { guid: 'tu3', sid: 'unique-sid', nsrc: ['unique text'], minQ: 50 },
            ]
        };

        const acceptedTus = await repetition.getAcceptedTus(job);
        // 1 holdout from internal leverage + 1 from TM match = 2
        assert.equal(acceptedTus.length, 2);

        const holdout = acceptedTus.find(tu => tu.inflight === true);
        assert.ok(holdout);
        assert.ok(['tu1', 'tu2'].includes(holdout.guid));

        const tmMatch = acceptedTus.find(tu => tu.ntgt);
        assert.ok(tmMatch);
        assert.equal(tmMatch.guid, 'tu3');
    });

    test('applies groupPenalty correctly for internal leverage', async () => {
        const repetition = new Repetition({
            holdInternalLeverage: true,
            expectedQuality: 80,
            qualifiedPenalty: 0,
            unqualifiedPenalty: 0,
            groupPenalty: 35,
        });
        repetition.mm = createMockMM([]);

        const job = {
            sourceLang: 'en',
            targetLang: 'de',
            tus: [
                { guid: 'tu1', sid: 'sid-a', nsrc: ['same text'], minQ: 50, group: 'group-A' },
                { guid: 'tu2', sid: 'sid-a', nsrc: ['same text'], minQ: 50, group: 'group-B' },
            ]
        };

        const acceptedTus = await repetition.getAcceptedTus(job);
        // Same sid but different groups: penalty = 0 + 35 = 35
        // 80 - 35 = 45 < 50 (minQ), so they can't leverage from each other
        // Both must be translated, no holdouts
        assert.equal(acceptedTus.length, 0);
    });

    test('allows leverage when groups match', async () => {
        const repetition = new Repetition({
            holdInternalLeverage: true,
            expectedQuality: 80,
            qualifiedPenalty: 0,
            unqualifiedPenalty: 0,
            groupPenalty: 35,
        });
        repetition.mm = createMockMM([]);

        const job = {
            sourceLang: 'en',
            targetLang: 'de',
            tus: [
                { guid: 'tu1', sid: 'sid-a', nsrc: ['same text'], minQ: 50, group: 'same-group' },
                { guid: 'tu2', sid: 'sid-a', nsrc: ['same text'], minQ: 50, group: 'same-group' },
            ]
        };

        const acceptedTus = await repetition.getAcceptedTus(job);
        // Same sid and same group: penalty = 0
        // 80 - 0 = 80 >= 50 (minQ), so one can leverage from other
        // 1 should be held back
        assert.equal(acceptedTus.length, 1);
        assert.equal(acceptedTus[0].q, 80);
    });

    test('combines groupPenalty with other penalties', async () => {
        const repetition = new Repetition({
            holdInternalLeverage: true,
            expectedQuality: 100,
            qualifiedPenalty: 0,
            unqualifiedPenalty: 20,
            notesMismatchPenalty: 10,
            groupPenalty: 15,
        });
        repetition.mm = createMockMM([]);

        const job = {
            sourceLang: 'en',
            targetLang: 'de',
            tus: [
                { guid: 'tu1', sid: 'sid-a', nsrc: ['same text'], minQ: 50, notes: { desc: 'note A' }, group: 'group-A' },
                { guid: 'tu2', sid: 'sid-b', nsrc: ['same text'], minQ: 50, notes: { desc: 'note B' }, group: 'group-B' },
            ]
        };

        const acceptedTus = await repetition.getAcceptedTus(job);
        // Different sid (20) + different notes (10) + different group (15) = 45 penalty
        // 100 - 45 = 55 >= 50 (minQ), so one can leverage from other
        assert.equal(acceptedTus.length, 1);
        assert.equal(acceptedTus[0].q, 55);
    });
});

suite('Repetition provider TM groupPenalty tests', () => {
    test('applies groupPenalty for TM matches', async () => {
        const repetition = new Repetition({
            groupPenalty: 30,
        });
        const tmMatches = [
            { sid: 'test-sid', ntgt: ['translated text'], q: 100, ts: Date.now(), guid: 'match-guid', group: 'tm-group' }
        ];
        repetition.mm = createMockMM(tmMatches);

        const job = {
            sourceLang: 'en',
            targetLang: 'de',
            tus: [
                { sid: 'test-sid', nsrc: ['source text'], minQ: 50, group: 'different-group' }
            ]
        };

        const acceptedTus = await repetition.getAcceptedTus(job);
        assert.equal(acceptedTus.length, 1);
        // Quality should be 100 - 30 = 70 (group mismatch penalty)
        assert.equal(acceptedTus[0].q, 70);
    });

    test('does not apply groupPenalty when groups match', async () => {
        const repetition = new Repetition({
            groupPenalty: 30,
        });
        const tmMatches = [
            { sid: 'test-sid', ntgt: ['translated text'], q: 100, ts: Date.now(), guid: 'match-guid', group: 'same-group' }
        ];
        repetition.mm = createMockMM(tmMatches);

        const job = {
            sourceLang: 'en',
            targetLang: 'de',
            tus: [
                { sid: 'test-sid', nsrc: ['source text'], minQ: 50, group: 'same-group' }
            ]
        };

        const acceptedTus = await repetition.getAcceptedTus(job);
        assert.equal(acceptedTus.length, 1);
        // Quality should be 100 (no penalty for matching groups)
        assert.equal(acceptedTus[0].q, 100);
    });

    test('rejects TM match when groupPenalty causes quality to fall below minQ', async () => {
        const repetition = new Repetition({
            groupPenalty: 60,
        });
        const tmMatches = [
            { sid: 'test-sid', ntgt: ['translated text'], q: 100, ts: Date.now(), guid: 'match-guid', group: 'tm-group' }
        ];
        repetition.mm = createMockMM(tmMatches);

        const job = {
            sourceLang: 'en',
            targetLang: 'de',
            tus: [
                { sid: 'test-sid', nsrc: ['source text'], minQ: 50, group: 'different-group' }
            ]
        };

        const acceptedTus = await repetition.getAcceptedTus(job);
        // 100 - 60 = 40 < minQ(50), so match should be rejected
        assert.equal(acceptedTus.length, 0);
    });
});
