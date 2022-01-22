/* eslint-disable no-useless-escape */
import * as android from '../../filters/android';
import * as fs from 'fs/promises';


describe ('android filter tests', () =>{

  var resourceFilter = new android.AndroidFilter({comment: 'test'});
  const resourceId = "tests/files/values/strings.xml";

  test('parseResource returns resource object', async () => {
    const expectedOutput = {
      "segments": [{
        "sid": "app_name",
        "str": "TachiyomiJ2K"
      }, {
        "sid": "app_short_name",
        "str": "TachiJ2K"
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
    const resource = await fs.readFile(resourceId,'utf8');
    const output = await resourceFilter.parseResource({resource: resource, isSource: true});
    expect(output).toMatchObject(expectedOutput);
  });

  var translator = async function translate(resourceId, sid, str) {
    return sid === 'str1' ? undefined : `${resourceId} ${sid} ${str} - **Translation**`;
  }
  test('generateTranslatedResource returns string', async () => {
    const expectedOutput = `<?xml version=\"1.0\" encoding=\"utf-8\"?>
<resources>
  <string name=\"app_name\">tests/files/values/strings.xml app_name TachiyomiJ2K - **Translation**</string>
  <string name=\"app_short_name\">tests/files/values/strings.xml app_short_name TachiJ2K - **Translation**</string>
  <string name=\"move_x_to\">tests/files/values/strings.xml move_x_to Move %1$s to… - **Translation**</string>
  <string name=\"chapter_x_of_y\">tests/files/values/strings.xml chapter_x_of_y Chapter %1$d of %2$d - **Translation**</string>
  <plurals name=\"chapters_plural\">
    <item quantity=\"one\">tests/files/values/strings.xml chapters_plural_one %1$d chapter - **Translation**</item>
    <item quantity=\"other\">tests/files/values/strings.xml chapters_plural_other %1$d chapters - **Translation**</item>
  </plurals>
</resources>`;
    const resource = await fs.readFile(resourceId,'utf8');
    const lang = 'fil';
    const translatedRes = await resourceFilter.generateTranslatedResource({ resourceId, resource, lang, translator });
    expect(translatedRes).toBe(expectedOutput);
  });

});
