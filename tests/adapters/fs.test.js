import * as adapters from '../../adapters/fs';
import * as path from 'path';

const ctx = {
  baseDir: path.resolve('.'),
  env: process.env,
  logger: { info: () => true },
};
adapters.FsSource.prototype.ctx = ctx;
adapters.FsTarget.prototype.ctx = ctx;
const RESOURCE_ID = "tests/files/values/strings.xml";

describe ('FsSource tests', () =>{
  var source = new adapters.FsSource({
      globs: [ 'tests/files/values/strings.xml' ],
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

})

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
