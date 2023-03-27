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
                      },
                      {
                        "sid": "test.greet",
                        "str": "Greetings {0} on {1,date}",
                      },
                      {
                        "sid": "test.params",
                        "str": "Param 1 {0}, Param 2 {1,date}, Param 3 {2,time}, Param 4 {3,number,integer}, Param 5 {4,number,currency}",
                      },
                      {
                        "sid": "test.1paramWithApostrophe",
                        "str": "Param's value: {0}", 
                      }
                    ]
            });
    });
});
