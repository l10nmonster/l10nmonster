const path = require('path');
const { adapters } = require('@l10nmonster/helpers');

global.l10nmonster ??= {};
l10nmonster.baseDir = path.resolve('.');
l10nmonster.logger = { info: () => true };

const RESOURCE_ID = "files/values/strings.xml";

describe ('FsSource tests', () =>{
  var source = new adapters.FsSource({
      globs: [ 'files/values/strings.xml' ],
      targetLangs: [ 'fil' ]
  });


  test('fetchResourceStats returns resource object', async () => {
    const resources = await source.fetchResourceStats();
    // expect(resources).toBe(RESOURCE_ID);
    expect(resources[0].id).toBe(RESOURCE_ID);
  });

  test('fetchResource returns string', async () => {
    const output = await source.fetchResource(RESOURCE_ID);
    expect(output.length).toBe(558);
  });

//   test('fetchAllResources returns stats and resource object', async () => {
//     for await (const [resourceStat, rawResource] of source.fetchAllResources()) {
//         expect(resourceStat.id).toBe(RESOURCE_ID);
//         expect(rawResource.length).toBe(558);
//     }
//   });

});

describe ('FsTarget tests', () =>{
  var target = new adapters.FsTarget({
      targetPath: (lang, resourceId) => resourceId.replace('values', `values-${lang}`),
  });
  test('fetchTranslatedResource returns a file', async () => {
    const resources = await target.fetchTranslatedResource("fil", RESOURCE_ID);
    expect(resources.length).toBe(388);
  });

// TODO: test('commitTranslatedResource writes a file', async () => {
//   });

});
