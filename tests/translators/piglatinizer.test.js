import { PigLatinizer } from '../../src/translators/piglatinizer';

describe ('pig latinizer translator tests', () =>{

  const job = {
    "tus": [{
      "guid": "app_name",
      "src": "TachiyomiJ2K"
    }, {
      "guid": "app_short_name",
      "src": "TachiJ2K"
    }, {
      "guid": "str1",
      "src": "Winter is coming"
    }, {
      "guid": "move_x_to",
      "src": "Move %1$s to…"
    }, {
      "guid": "chapter_x_of_y",
      "src": "Chapter %1$d of %2$d"
    }, {
      "isSuffixPluralized": true,
      "guid": "chapters_plural_one",
      "src": "%1$d chapter"
    }, {
      "isSuffixPluralized": true,
      "guid": "chapters_plural_other",
      "src": "%1$d chapters"
    }]
  };
  const expectedOutput = {
      targetLang: 'fil',
      tus: [
        { guid: 'app_name', tgt: '[TachiyomiJ2K-fil]', q: 80 },
        { guid: 'app_short_name', tgt: '[TachiJ2K-fil]', q: 80 },
        { guid: 'str1', tgt: '[Interway isyay omingcay-fil]', q: 80 },
        { guid: 'move_x_to', tgt: '[Ovemay %1$s otay…-fil]', q: 80 },
        {
          guid: 'chapter_x_of_y',
          tgt: '[Apterchay %1$d ofyay %2$d-fil]',
          q: 80
        },
        { guid: 'chapters_plural_one', tgt: '[%1$d apterchay-fil]', q: 80 },
        {
          guid: 'chapters_plural_other',
          tgt: '[%1$d apterschay-fil]',
          q: 80
        }
      ],
      status: 'done'
    }
    PigLatinizer.prototype.ctx = { regression: false };
    var translator = new PigLatinizer({
        quality: 80
    });
    job.targetLang = 'fil';

  test('requestTranslations returns jobResponse', async () => {
    const jobResponse = await translator.requestTranslations(job);
    expect(jobResponse).toMatchObject(expectedOutput);
  });

});
