import * as java from "../../src/filters/java";
import { readFileSync } from 'fs';

describe("java parseResource", () => {
    const resourceFilter = new java.JavaPropertiesFilter();
    const resourceId = 'tests/files/values/messages.properties';
    const resource = readFileSync(resourceId, 'utf8');


    test('basic parsing logic', async () => {
        const messages = await resourceFilter.parseResource({resource});
        expect(messages)
            .toMatchObject({
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
