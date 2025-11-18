import test from 'node:test';
import assert from 'node:assert/strict';
import { MonsterManager } from './mocks/@l10nmonster/core/index.js';
import { InvisicodeProvider } from '../src/helpers/providers/invisicode.js';

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

test('InvisicodeProvider - Constructor', async (t) => {
  await t.test('should throw an error if quality is not specified in options', () => {
    assert.throws(
      // @ts-ignore
      () => new InvisicodeProvider({ baseLang: 'en', fallback: false, includeQ: false }), // quality is missing from options
      /You must specify quality for InvisicodeProvider/
    );
  });

  await t.test('should not throw if quality is specified', () => {
    assert.doesNotThrow(
      () => new InvisicodeProvider({ baseLang: 'en', fallback: false, includeQ: false, quality: 80 })
    );
  });

  await t.test('should set quality property correctly when provided', () => {
    const qualityValue = 90;
    const generator = new InvisicodeProvider({
      quality: qualityValue,
      baseLang: 'en',
      fallback: true,
      includeQ: true,
    });

    assert.strictEqual(generator.quality, qualityValue);
    // Private fields #baseLang, #fallback, #includeQ are not directly testable by property access.
    // Their correct initialization and effect are tested via requestTranslations behavior.
  });
});

test('InvisicodeProvider - init', async (t) => {
  await t.test('should initialize with MonsterManager', async () => {
    const qualityValue = 80;
    const generator = new InvisicodeProvider({
      quality: qualityValue,
      baseLang: 'en',
      fallback: true,
      includeQ: false, // Default or explicit false for this test
    });
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

    const tus = await generator.getTranslatedTus(jobRequest); // Renamed and not async

    assert.strictEqual(tus.length, 1);
    assert.strictEqual(tus[0].guid, '123');
    assert.ok(tus[0].ntgt.includes('Hola')); // ntgt is an array
  });
});

test('InvisicodeProvider - getTranslatedTus', async (t) => { // Renamed test suite
  await t.test('should generate translations correctly', async () => {
    const qualityValue = 80;
    const generator = new InvisicodeProvider({
      quality: qualityValue,
      baseLang: 'en',
      fallback: true,
      includeQ: false, // Test with includeQ false
    });
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

    const tus = await generator.getTranslatedTus(jobRequest); // Renamed and not async

    assert.strictEqual(tus.length, 1);

    const translatedTu = tus[0];
    assert.strictEqual(translatedTu.guid, '123');
    assert.strictEqual(translatedTu.q, qualityValue);
    assert.equal(translatedTu.ntgt[0].charAt(0), '\u200B');
    assert.equal(translatedTu.ntgt[translatedTu.ntgt.length - 1].charAt(0), '\u200C');
    assert.ok(translatedTu.ntgt.includes('Hola'));

    // Check metadata does NOT contain 'q' when includeQ is false
    const meta_encoded = translatedTu.ntgt[0].match(invisicodePrologueRegex)[1];
    const meta_decoded = JSON.parse(fe00RangeToUtf8(meta_encoded));
    assert.strictEqual(meta_decoded.g, '123');
    assert.strictEqual(meta_decoded.q, undefined);
  });

  await t.test('should fallback to source if translation is missing and fallback is true', async () => {
    const qualityValue = 80;
    const generator = new InvisicodeProvider({
      quality: qualityValue,
      baseLang: 'en',
      fallback: true,
      includeQ: false,
    });
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

    const tus = await generator.getTranslatedTus(jobRequest); // Renamed and not async

    assert.strictEqual(tus.length, 1);
    const translatedTu = tus[0];
    assert.strictEqual(translatedTu.ntgt.includes('World'), true);
  });

  await t.test('should not fallback if translation is missing and fallback is false', async () => {
    const qualityValue = 80;
    const generator = new InvisicodeProvider({
      quality: qualityValue,
      baseLang: 'en',
      fallback: false,
      includeQ: false,
    });
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

    const tus = await generator.getTranslatedTus(jobRequest); // Renamed and not async

    assert.strictEqual(tus.length, 0); // No translation added
  });

  await t.test('should set TU quality and encode TM quality in metadata when includeQ is true', async () => {
    const jobQuality = 80;
    const generator = new InvisicodeProvider({
      quality: jobQuality,
      baseLang: 'en',
      fallback: true,
      includeQ: true, // Enable quality in metadata
    });

    const monsterManager = new MonsterManager();

    monsterManager.translationMemory.setEntry('321', { ntgt: ['Bonjour'], q: 75 });
    monsterManager.translationMemory.setEntry('322', { ntgt: ['Bonsoir'], q: 50 });
    monsterManager.translationMemory.setEntry('323', { ntgt: ['Bonne nuit'] }); // TM q will default to 0

    await generator.init(monsterManager);

    const jobRequest = {
      sourceLang: 'en',
      tus: [
        { guid: '321', nsrc: ['Good morning'] },
        { guid: '322', nsrc: ['Good evening'] },
        { guid: '323', nsrc: ['Good night'] },
      ],
    };

    const tus = await generator.getTranslatedTus(jobRequest); // Renamed and not async

    assert.strictEqual(tus.length, 3);

    const tu1 = tus.find(tu => tu.guid === '321');
    const tu2 = tus.find(tu => tu.guid === '322');
    const tu3 = tus.find(tu => tu.guid === '323');

    assert.strictEqual(tu1.q, jobQuality);
    assert.strictEqual(tu2.q, jobQuality);
    assert.strictEqual(tu3.q, jobQuality);

    const meta1_encoded = tu1.ntgt[0].match(invisicodePrologueRegex)[1];
    const meta1_decoded = JSON.parse(fe00RangeToUtf8(meta1_encoded));
    assert.strictEqual(meta1_decoded.g, '321');
    assert.strictEqual(meta1_decoded.q, 75);

    const meta2_encoded = tu2.ntgt[0].match(invisicodePrologueRegex)[1];
    const meta2_decoded = JSON.parse(fe00RangeToUtf8(meta2_encoded));
    assert.strictEqual(meta2_decoded.g, '322');
    assert.strictEqual(meta2_decoded.q, 50);

    const meta3_encoded = tu3.ntgt[0].match(invisicodePrologueRegex)[1];
    const meta3_decoded = JSON.parse(fe00RangeToUtf8(meta3_encoded));
    assert.strictEqual(meta3_decoded.g, '323');
    assert.strictEqual(meta3_decoded.q, 0);

    assert.ok(tu1.ntgt.includes('Bonjour'));
    assert.ok(tu2.ntgt.includes('Bonsoir'));
    assert.ok(tu3.ntgt.includes('Bonne nuit'));
  });

  await t.test('should not include TM quality in metadata when includeQ is false', async () => {
    const jobQuality = 90;
    const generator = new InvisicodeProvider({
      quality: jobQuality,
      baseLang: 'en',
      fallback: true,
      includeQ: false, // Explicitly false
    });
    const monsterManager = new MonsterManager();
    monsterManager.translationMemory.setEntry('777', { ntgt: ['Servus'], q: 65 });
    await generator.init(monsterManager);
    const jobRequest = {
      sourceLang: 'en',
      tus: [ { guid: '777', nsrc: ['Hallo'] } ],
    };
    const tus = await generator.getTranslatedTus(jobRequest); // Renamed and not async
    assert.strictEqual(tus.length, 1);
    const translatedTu = tus[0];
    assert.strictEqual(translatedTu.q, jobQuality);
    const meta_encoded = translatedTu.ntgt[0].match(invisicodePrologueRegex)[1];
    const meta_decoded = JSON.parse(fe00RangeToUtf8(meta_encoded));
    assert.strictEqual(meta_decoded.g, '777');
    assert.strictEqual(meta_decoded.q, undefined, "Metadata quality should be undefined when includeQ is false");
    assert.ok(translatedTu.ntgt.includes('Servus'));
  });
});

// test('InvisicodeProvider - refreshTranslations', async (t) => {
//   await t.test('should return tus that have changed', async () => {
//     const options = {
//       quality: 80,
//       lowQ: 30,
//       highQ: 70,
//       baseLang: 'en',
//       fallback: true,
//     };

//     const generator = new InvisicodeProvider(options);
//     const monsterManager = new MonsterManager();

//     // Add translation entries
//     monsterManager.translationMemory.setEntry('101', { ntgt: ['Actualizar'] });
//     monsterManager.translationMemory.setEntry('102', { ntgt: ['\u200B{"g":"102","q":2}No Change\u200B'] }); // this is wrong, it's supposed to be encoded

    // @ts-ignore
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

test('InvisicodeProvider - baseLang as function', async (t) => {
  await t.test('should accept baseLang as a function and call it with targetLang', async () => {
    const qualityValue = 80;
    let capturedTargetLang;
    
    const baseLangFunction = (targetLang) => {
      capturedTargetLang = targetLang;
      return 'en'; // Return 'en' as the base language
    };

    const generator = new InvisicodeProvider({
      quality: qualityValue,
      baseLang: baseLangFunction,
      fallback: true,
      includeQ: false,
    });
    const monsterManager = new MonsterManager();
    monsterManager.translationMemory.setEntry('123', { ntgt: ['Hola'] });
    await generator.init(monsterManager);

    const jobRequest = {
      sourceLang: 'en',
      targetLang: 'es',
      tus: [
        {
          guid: '123',
          nsrc: ['Hello'],
        },
      ],
    };

    const tus = await generator.getTranslatedTus(jobRequest);

    assert.strictEqual(capturedTargetLang, 'es', 'baseLang function should be called with targetLang');
    assert.strictEqual(tus.length, 1);
    assert.strictEqual(tus[0].guid, '123');
    assert.ok(tus[0].ntgt.includes('Hola'));
  });

  await t.test('should support dynamic baseLang selection based on targetLang', async () => {
    const qualityValue = 80;
    
    // Function that returns different base languages for different target languages
    const baseLangFunction = (targetLang) => {
      if (targetLang === 'es-MX') return 'es';
      if (targetLang === 'pt-BR') return 'pt';
      if (targetLang === 'zh-CN') return 'zh';
      return 'en';
    };

    const generator = new InvisicodeProvider({
      quality: qualityValue,
      baseLang: baseLangFunction,
      fallback: false,
      includeQ: false,
    });
    const monsterManager = new MonsterManager();
    
    // Add translations for different base languages
    monsterManager.translationMemory.setEntry('456', { ntgt: ['Hola desde España'] });
    
    await generator.init(monsterManager);

    const jobRequest = {
      sourceLang: 'en',
      targetLang: 'es-MX',
      tus: [
        {
          guid: '456',
          nsrc: ['Hello from Spain'],
        },
      ],
    };

    const tus = await generator.getTranslatedTus(jobRequest);

    assert.strictEqual(tus.length, 1);
    assert.ok(tus[0].ntgt.includes('Hola desde España'));
  });

  await t.test('should fallback to source when baseLang function returns null/undefined', async () => {
    const qualityValue = 80;
    
    const baseLangFunction = (targetLang) => {
      return undefined; // Return undefined
    };

    const generator = new InvisicodeProvider({
      quality: qualityValue,
      baseLang: baseLangFunction,
      fallback: true,
      includeQ: false,
    });
    const monsterManager = new MonsterManager();
    await generator.init(monsterManager);

    const jobRequest = {
      sourceLang: 'en',
      targetLang: 'fr',
      tus: [
        {
          guid: '789',
          nsrc: ['Source text'],
        },
      ],
    };

    const tus = await generator.getTranslatedTus(jobRequest);

    // When baseLang function returns undefined, it should use source text
    assert.strictEqual(tus.length, 1);
    assert.ok(tus[0].ntgt.includes('Source text'));
  });
});

test('InvisicodeProvider - getTranslatedTus metadata encoding', async (t) => { // Renamed test suite
  await t.test('should correctly encode guid and TM quality in metadata when includeQ is true', async () => {
    const jobQuality = 80;
    const generator = new InvisicodeProvider({
      quality: jobQuality,
      baseLang: 'en',
      fallback: true,
      includeQ: true, // Ensure metadata quality is included
    });
    const monsterManager = new MonsterManager();

    // Add a translation entry
    monsterManager.translationMemory.setEntry('555', { ntgt: ['Prueba'], q: 85 }); // TM quality is 85
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

    const tus = await generator.getTranslatedTus(jobRequest); // Renamed and not async

    assert.equal(tus.length, 1);
    const translatedTu = tus[0];

    // Check that ntgt starts with ZERO WIDTH SPACE and ends with ZERO WIDTH NON-JOINER
    assert.equal(translatedTu.ntgt[0].charAt(0), '\u200B');
    assert.equal(translatedTu.ntgt[translatedTu.ntgt.length - 1].charAt(0), '\u200C');

    // Extract the Invisicode part
    const invisicodePart = translatedTu.ntgt[0].match(invisicodePrologueRegex)[1];

    // Convert FE00 range to UTF-8 string for verification
    const decodedMetadata = fe00RangeToUtf8(invisicodePart);
    const metadata = JSON.parse(decodedMetadata);

    assert.equal(metadata.g, '555');
    assert.equal(metadata.q, 85); // Should be the quality from the TM entry (85)
    assert.ok(translatedTu.ntgt.includes('Prueba'));
  });

  await t.test('should correctly encode guid and omit TM quality in metadata when includeQ is false', async () => {
    const jobQuality = 70;
    const generator = new InvisicodeProvider({
        quality: jobQuality,
        baseLang: 'en',
        fallback: true,
        includeQ: false, // Ensure metadata quality is NOT included
    });
    const monsterManager = new MonsterManager();
    monsterManager.translationMemory.setEntry('666', { ntgt: ['Testomit'], q: 95 }); // TM quality is 95
    await generator.init(monsterManager);
    const jobRequest = {
        sourceLang: 'en',
        tus: [ { guid: '666', nsrc: ['Test UTF-8 Omit'] } ],
    };
    const tus = await generator.getTranslatedTus(jobRequest); // Renamed and not async
    assert.equal(tus.length, 1);
    const translatedTu = tus[0];
    const invisicodePart = translatedTu.ntgt[0].match(invisicodePrologueRegex)[1];
    const decodedMetadata = fe00RangeToUtf8(invisicodePart);
    const metadata = JSON.parse(decodedMetadata);
    assert.equal(metadata.g, '666');
    assert.strictEqual(metadata.q, undefined); // Quality should not be in metadata
    assert.ok(translatedTu.ntgt.includes('Testomit'));
  });
});
