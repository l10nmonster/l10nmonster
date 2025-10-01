import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

import { setRegressionMode } from '@l10nmonster/core';
import { PigLatinizer } from './index.js';

setRegressionMode(true);

suite('pig latinizer translator tests', () => {
    const job = {
        tus: [
            {
                guid: 'app_name',
                nsrc: ['TachiyomiJ2K'],
            },
            {
                guid: 'app_short_name',
                nsrc: ['TachiJ2K'],
            },
            {
                guid: 'str1',
                nsrc: ['Winter is coming'],
            },
            {
                guid: 'move_x_to',
                nsrc: ['Move %1$s to…'],
            },
            {
                guid: 'chapter_x_of_y',
                nsrc: ['Chapter %1$d of %2$d'],
            },
            {
                isSuffixPluralized: true,
                guid: 'chapters_plural_one',
                nsrc: ['%1$d chapter'],
            },
            {
                isSuffixPluralized: true,
                guid: 'chapters_plural_other',
                nsrc: ['%1$d chapters'],
            },
        ],
    };
    const expectedOutput = {
        targetLang: 'fil',
        tus: [
            { guid: 'app_name', ntgt: ['[', 'TachiyomiJ2K', '-fil]'], q: 80, ts: 1 },
            { guid: 'app_short_name', ntgt: ['[', 'TachiJ2K', '-fil]'], q: 80, ts: 1 },
            {
                guid: 'str1',
                ntgt: ['[', 'Interway isyay omingcay', '-fil]'],
                q: 80,
                ts: 1,
            },
            {
                guid: 'move_x_to',
                ntgt: ['[', 'Ovemay %1$s otay…', '-fil]'],
                q: 80,
                ts: 1,
            },
            {
                guid: 'chapter_x_of_y',
                ntgt: ['[', 'Apterchay %1$d ofyay %2$d', '-fil]'],
                q: 80,
                ts: 1,
            },
            {
                guid: 'chapters_plural_one',
                ntgt: ['[', '%1$d apterchay', '-fil]'],
                q: 80,
                ts: 1,
            },
            {
                guid: 'chapters_plural_other',
                ntgt: ['[', '%1$d apterschay', '-fil]'],
                q: 80,
                ts: 1,
            },
        ],
        status: 'done',
        statusDescription: 'Job has been PigLatinized',
    };
    var translator = new PigLatinizer({
        quality: 80,
    });
    job.targetLang = 'fil';

    test('requestTranslations returns jobResponse', async () => {
        const jobResponse = await translator.requestTranslations(job);
        assert.deepEqual(jobResponse, expectedOutput);
    });
});
