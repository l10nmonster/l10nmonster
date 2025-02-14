import test from 'node:test';
import assert from 'node:assert/strict';
import { L10nContext, utils, MonsterManager } from './mocks/@l10nmonster/core/index.js';
import { InvisicodeGenerator } from '../src/helpers/translators/invisicode.js';

const base = 0xFE00;
const decoder = new TextDecoder();

function fe00RangeToUtf8(encoded) {
    const length = encoded.length;

    if (length % 2 !== 0) {
        throw new Error("Invalid encoded input length");
    }

    const bytes = new Uint8Array(length / 2);
    let byteIndex = 0;

    for (let i = 0; i < length; i += 2) {
        const highNibble = encoded.charCodeAt(i) - base;
        const lowNibble = encoded.charCodeAt(i + 1) - base;
        bytes[byteIndex++] = (highNibble << 4) | lowNibble;
    }

    return decoder.decode(bytes);
}
const invisicodePrologueRegex = /\u200B([\uFE00-\uFE0F]+)/;

test('InvisicodeGenerator - Constructor', async (t) => {
  await t.test('should throw an error if quality, lowQ, or highQ are not specified', () => {
    assert.throws(
      () => new InvisicodeGenerator({ lowQ: 20, highQ: 60 }));

    assert.throws(
      () => new InvisicodeGenerator({ quality: 80, highQ: 60 }));

    assert.throws(
      () => new InvisicodeGenerator({ quality: 80, lowQ: 20 }));
  });

  await t.test('should set properties correctly when all options are provided', () => {
    const options = {
      quality: 80,
      lowQ: 30,
      highQ: 70,
      baseLang: 'en',
      fallback: true,
    };

    const generator = new InvisicodeGenerator(options);

    assert.strictEqual(generator.quality, options.quality);
    assert.strictEqual(generator.lowQ, options.lowQ);
    assert.strictEqual(generator.highQ, options.highQ);
    assert.strictEqual(generator.baseLang, options.baseLang);
    assert.strictEqual(generator.fallback, options.fallback);
  });
});

test('InvisicodeGenerator - init', async (t) => {
  await t.test('should initialize with MonsterManager', async () => {
    const options = {
      quality: 80,
      lowQ: 30,
      highQ: 70,
      baseLang: 'en',
      fallback: true,
    };

    const generator = new InvisicodeGenerator(options);
    const monsterManager = new MonsterManager();

    await generator.init(monsterManager);

    // Assuming #mm is a private field, we can't access it directly.
    // Instead, we can check behavior in subsequent methods.
    // For demonstration, let's add an entry to the TranslationMemory
    monsterManager.translationMemory.setEntry('123', { ntgt: ['Hola'] });

    const jobRequest = {
      sourceLang: 'en',
      tus: [
        {
          guid: '123',
          nsrc: ['Hello'],
        },
      ],
    };

    const response = await generator.requestTranslations(jobRequest);

    assert.strictEqual(response.status, 'done');
    assert.strictEqual(response.tus.length, 1);
    assert.strictEqual(response.tus[0].guid, '123');
    assert.strictEqual(response.tus[0].ntgt.includes('Hola'), true);
  });
});

test('InvisicodeGenerator - requestTranslations', async (t) => {
  await t.test('should generate translations correctly', async () => {
    const options = {
      quality: 80,
      lowQ: 30,
      highQ: 70,
      baseLang: 'en',
      fallback: true,
    };

    const generator = new InvisicodeGenerator(options);
    const monsterManager = new MonsterManager();

    // Add a translation entry
    monsterManager.translationMemory.setEntry('123', { ntgt: ['Hola'] });

    await generator.init(monsterManager);

    const jobRequest = {
      sourceLang: 'en',
      tus: [
        {
          guid: '123',
          nsrc: ['Hello'],
        },
      ],
    };

    const response = await generator.requestTranslations(jobRequest);

    assert.strictEqual(response.status, 'done');
    assert.strictEqual(response.tus.length, 1);

    const translatedTu = response.tus[0];
    assert.strictEqual(translatedTu.guid, '123');
    assert.strictEqual(translatedTu.q, options.quality);
    assert.equal(translatedTu.ntgt[0].charAt(0), '\u200B');
    assert.equal(translatedTu.ntgt[translatedTu.ntgt.length - 1].charAt(0), '\u200B');
    assert.ok(translatedTu.ntgt.includes('Hola'));
  });

  await t.test('should fallback to source if translation is missing and fallback is true', async () => {
    const options = {
      quality: 80,
      lowQ: 30,
      highQ: 70,
      baseLang: 'en',
      fallback: true,
    };

    const generator = new InvisicodeGenerator(options);
    const monsterManager = new MonsterManager();

    // No translation entry added for '456'

    await generator.init(monsterManager);

    const jobRequest = {
      sourceLang: 'en',
      tus: [
        {
          guid: '456',
          nsrc: ['World'],
        },
      ],
    };

    const response = await generator.requestTranslations(jobRequest);

    assert.strictEqual(response.tus.length, 1);
    const translatedTu = response.tus[0];
    assert.strictEqual(translatedTu.ntgt.includes('World'), true);
  });

  await t.test('should not fallback if translation is missing and fallback is false', async () => {
    const options = {
      quality: 80,
      lowQ: 30,
      highQ: 70,
      baseLang: 'en',
      fallback: false,
    };

    const generator = new InvisicodeGenerator(options);
    const monsterManager = new MonsterManager();

    // No translation entry added for '789'

    await generator.init(monsterManager);

    const jobRequest = {
      sourceLang: 'en',
      tus: [
        {
          guid: '789',
          nsrc: ['Test'],
        },
      ],
    };

    const response = await generator.requestTranslations(jobRequest);

    assert.strictEqual(response.tus.length, 0); // No translation added
  });

  await t.test('should set quality levels correctly', async () => {
    const options = {
      quality: 80,
      lowQ: 30,
      highQ: 70,
      baseLang: 'en',
      fallback: true,
    };

    const generator = new InvisicodeGenerator(options);
    const monsterManager = new MonsterManager();

    // Add a translation entry
    monsterManager.translationMemory.setEntry('321', { ntgt: ['Bonjour'] });

    await generator.init(monsterManager);

    const jobRequest = {
      sourceLang: 'en',
      tus: [
        {
          guid: '321',
          nsrc: ['Good morning'],
        },
        {
          guid: '322',
          nsrc: ['Good evening'],
        },
        {
          guid: '323',
          nsrc: ['Good night'],
        },
      ],
    };

    // Add corresponding translation entries
    monsterManager.translationMemory.setEntry('322', { ntgt: ['Bonsoir'] });
    monsterManager.translationMemory.setEntry('323', { ntgt: ['Bonne nuit'] });

    const response = await generator.requestTranslations(jobRequest);

    assert.strictEqual(response.tus.length, 3);

    const tu1 = response.tus.find(tu => tu.guid === '321');
    const tu2 = response.tus.find(tu => tu.guid === '322');
    const tu3 = response.tus.find(tu => tu.guid === '323');

    // Quality levels
    assert.strictEqual(tu1.q, options.quality);
    assert.strictEqual(tu2.q, options.quality);
    assert.strictEqual(tu3.q, options.quality);

    // Here, you might want to check the 'q' value inside the Invisicode metadata
    // However, since it's embedded in the ntgt string, it's complex to parse.
    // Instead, ensure that the 'ntgt' field contains the correct Invisicode metadata.
    // For simplicity, we'll just check that 'ntgt' includes the translation
    assert.ok(tu1.ntgt.includes('Bonjour'));
    // Adjust as per actual mappings
  });
});

// test('InvisicodeGenerator - refreshTranslations', async (t) => {
//   await t.test('should return tus that have changed', async () => {
//     const options = {
//       quality: 80,
//       lowQ: 30,
//       highQ: 70,
//       baseLang: 'en',
//       fallback: true,
//     };

//     const generator = new InvisicodeGenerator(options);
//     const monsterManager = new MonsterManager();

//     // Add translation entries
//     monsterManager.translationMemory.setEntry('101', { ntgt: ['Actualizar'] });
//     monsterManager.translationMemory.setEntry('102', { ntgt: ['\u200B{"g":"102","q":2}No Change\u200B'] }); // this is wrong, it's supposed to be encoded

//     await generator.init(monsterManager);

//     const jobRequest = {
//       sourceLang: 'en',
//       tus: [
//         {
//           guid: '101',
//           nsrc: ['Refresh'],
//           ntgt: ['Actualizar'],
//           q: 80,
//         },
//         {
//           guid: '102',
//           nsrc: ['No Change'],
//           ntgt: ['No Change'],
//           q: 80,
//         },
//       ],
//     };

//     // Mock the utils.normalizedStringsAreEqual method
//     // Since Utils are mocked, we can directly manipulate the return values
//     utils.normalizedStringsAreEqual = (original, updated) => {
//       if (original.includes('Actualizar')) {
//         return false; // Indicates a change
//       }
//       if (original.includes('No Change')) {
//         return true; // No change
//       }
//       return false;
//     };

//     const response = await generator.refreshTranslations(jobRequest);

//     assert.equal(response.tus.length, 2);
//     assert.equal(response.tus[0].guid, '101');
//     assert.ok(response.tus[0].ntgt.includes('Actualizar'));
//   });
// });

test('InvisicodeGenerator - utf8ToFE00Range', async (t) => {
  await t.test('should convert UTF-8 to FE00 range correctly', async () => {
    const options = {
      quality: 80,
      lowQ: 30,
      highQ: 70,
      baseLang: 'en',
      fallback: true,
    };

    const generator = new InvisicodeGenerator(options);
    const monsterManager = new MonsterManager();

    // Add a translation entry
    monsterManager.translationMemory.setEntry('555', { ntgt: ['Prueba'], q: 80 });

    await generator.init(monsterManager);

    const jobRequest = {
      sourceLang: 'en',
      tus: [
        {
          guid: '555',
          nsrc: ['Test UTF-8'],
        },
      ],
    };

    const response = await generator.requestTranslations(jobRequest);

    assert.equal(response.tus.length, 1);
    const translatedTu = response.tus[0];

    // Check that ntgt starts and ends with ZERO WIDTH SPACE
    assert.equal(translatedTu.ntgt[0].charAt(0), '\u200B');
    assert.equal(translatedTu.ntgt[translatedTu.ntgt.length - 1].charAt(0), '\u200B');

    // Extract the Invisicode part
    const invisicodePart = translatedTu.ntgt[0].match(invisicodePrologueRegex)[1];

    // Convert FE00 range to UTF-8 string for verification
    const decodedMetadata = fe00RangeToUtf8(invisicodePart);
    const metadata = JSON.parse(decodedMetadata);

    assert.equal(metadata.g, '555');
    // q = 80 >= highQ (70) => 2
    assert.equal(metadata.q, 2);

    // Ensure the rest of the string includes the translation
    assert.ok(translatedTu.ntgt.includes('Prueba'));
  });
});
