import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

import { PropertiesFilter } from '../index.js';
import fs from 'fs';

suite("java parseResource", () => {
    const resourceFilter = new PropertiesFilter();
    const resourceId = 'tests/artifacts/messages.properties';
    const resource = fs.readFileSync(resourceId, 'utf8');


    test('basic parsing logic', async () => {
        const messages = await resourceFilter.parseResource({resource});
        assert.deepEqual(messages, {
              segments: [
                {
                  "sid": "test.hello",
                  "str": "Hello",
                  "location": {"startLine": 1,"endLine": 1}
                },
                {
                  "sid": "test.withComment",
                  "str": "Comment",
                  "notes": "# Some multi-line\n# comment",
                  "location": {"startLine": 4,"endLine": 4}
                },
                {
                  "sid": "test.params",
                  "str": "Greetings {0} on {1,date}",
                  "location": {"startLine": 6,"endLine": 6}
                },
                {
                  "sid": "test.1paramWithApostrophe",
                  "str": "Param's value: {0}",
                  "location": {"startLine": 7,"endLine": 7}
                }
              ]
            });
    });
});
