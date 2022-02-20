/* eslint-disable no-useless-escape */
import * as android from '../../filters/android';
import { readFileSync } from 'fs';

describe ('android filter tests', () =>{

  var resourceFilter = new android.AndroidFilter({comment: 'test'});
  const resourceId = "tests/files/values/strings.xml";

  test('parseResource returns resource object', async () => {
    const expectedOutput = {
      "segments": [{
        "sid": "cdata",
        "str": "gotta 'love' this!"
      }, {
        "sid": "quotes",
        "str": "it's magic"
      }, {
        "sid": "str1",
        "str": "Winter is coming"
      }, {
        "sid": "move_x_to",
        "str": "Move %1$s to…"
      }, {
        "sid": "chapter_x_of_y",
        "str": "Chapter %1$d of %2$d"
      }, {
        "isSuffixPluralized": true,
        "sid": "chapters_plural_one",
        "str": "%1$d chapter"
      }, {
        "isSuffixPluralized": true,
        "sid": "chapters_plural_other",
        "str": "%1$d chapters"
      }]
    };
    const resource = readFileSync(resourceId,'utf8');
    const output = await resourceFilter.parseResource({resource: resource, isSource: true});
    expect(output).toMatchObject(expectedOutput);
  });

  var translator = async function translate(sid, str) {
    return sid === 'str1' ? undefined : `${resourceId} ${sid} ${str} - **Translation**`;
  }
  test('generateTranslatedResource returns string', async () => {
    const expectedOutput = readFileSync('tests/files/values/strings_t9n.xml', 'utf8');
    const resource = readFileSync(resourceId,'utf8');
    const lang = 'fil';
    const translatedRes = await resourceFilter.generateTranslatedResource({ resourceId, resource, lang, translator });
    expect(translatedRes).toBe(expectedOutput);
  });

});
