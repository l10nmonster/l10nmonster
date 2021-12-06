import * as piggyTranslator from '../../translators/piglatinizer';

describe ('pig latinizer translator tests', () =>{

  const job = {
    "tus": [{
      "guid": "app_name",
      "str": "TachiyomiJ2K"
    }, {
      "guid": "app_short_name",
      "str": "TachiJ2K"
    }, {
      "guid": "str1",
      "str": "Winter is coming"
    }, {
      "guid": "move_x_to",
      "str": "Move %1$s to…"
    }, {
      "guid": "chapter_x_of_y",
      "str": "Chapter %1$d of %2$d"
    }, {
      "isSuffixPluralized": true,
      "guid": "chapters_plural_one",
      "str": "%1$d chapter"
    }, {
      "isSuffixPluralized": true,
      "guid": "chapters_plural_other",
      "str": "%1$d chapters"
    }]
  };
  const expectedOutput = {
      targetLang: 'fil',
      tus: [
        { guid: 'app_name', str: '[TachiyomiJ2K-fil]', q: 80 },
        { guid: 'app_short_name', str: '[TachiJ2K-fil]', q: 80 },
        { guid: 'str1', str: '[Interway isyay omingcay-fil]', q: 80 },
        { guid: 'move_x_to', str: '[Ovemay %1$s otay…-fil]', q: 80 },
        {
          guid: 'chapter_x_of_y',
          str: '[Apterchay %1$d ofyay %2$d-fil]',
          q: 80
        },
        { guid: 'chapters_plural_one', str: '[%1$d apterchay-fil]', q: 80 },
        {
          guid: 'chapters_plural_other',
          str: '[%1$d apterschay-fil]',
          q: 80
        }
      ],
      status: 'done'
    }
    var translator = new piggyTranslator.PigLatinizer({
        quality: 80
    });
    job.targetLang = 'fil';

  test('requestTranslations returns jobResponse', async () => {
    const jobResponse = await translator.requestTranslations(job);
    expect(jobResponse).toMatchObject(expectedOutput);
  });

  test('fetchTranslations returns jobResponse', async () => {
    const jobResponse = await translator.fetchTranslations(job);
    expect(jobResponse).toBeNull();
  });

});
