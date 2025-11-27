import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

import { providers } from '../index.js';

const { Repetition } = providers;

// Mock TM that returns exact matches for any source
class MockTM {
    constructor(matches = []) {
        this.matches = matches;
    }

    async getExactMatches() {
        return this.matches;
    }
}

// Mock MonsterManager with a mock TM
function createMockMM(tmMatches = []) {
    return {
        tmm: {
            getTM: () => new MockTM(tmMatches),
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
