import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateGuid,
  consolidateDecodedParts,
  normalizedStringsAreEqual,
  integerToLabel,
  fixCaseInsensitiveKey,
  decodeNormalizedString,
  getNormalizedString,
  flattenNormalizedSourceToOrdinal,
  flattenNormalizedSourceV1,
  extractNormalizedPartsV1,
  flattenNormalizedSourceToXmlV1,
  extractNormalizedPartsFromXmlV1,
  phMatcherMaker,
  sourceAndTargetAreCompatible,
  getTUMaps,
  extractStructuredNotes,
} from '../src/helpers/utils.js';

// Example test for generateGuid
test('generateGuid should produce a consistent hash for the same input', () => {
  const input = 'test-string';
  const guid1 = generateGuid(input);
  const guid2 = generateGuid(input);
  assert.strictEqual(guid1, guid2, 'GUIDs should match for the same input');
  assert.strictEqual(guid1.length, 43, 'GUID should be 43 characters long');
  // Ensure it only contains URL-safe base64 characters
  assert.match(guid1, /^[A-Za-z0-9_-]{43}$/, 'GUID should contain only URL-safe base64 characters');
});

// // Example test for consolidateDecodedParts
// test('consolidateDecodedParts should merge consecutive strings and handle flags', () => {
//   const parts = [
//     { t: 's', v: 'Hello ' },
//     { t: 's', v: 'World', flag: 'greeting' },
//     { t: 'x', v: 'PLACEHOLDER' },
//     '!',
//     { t: 'x', v: 'ANOTHER_PLACEHOLDER', flag: 'exclamation' }
//   ];
//   const flags = {};
//   const result = consolidateDecodedParts(parts, flags, false);

//   const expected = [
//     { t: 's', v: 'Hello World' },
//     { t: 'x', v: 'PLACEHOLDER' },
//     { t: 's', v: '!' },
//     { t: 'x', v: 'ANOTHER_PLACEHOLDER' }
//   ];

//   assert.deepEqual(result, expected, 'Consolidated parts should merge strings correctly');
//   assert.deepEqual(flags, { greeting: true, exclamation: true }, 'Flags should be set correctly');
// });

// // Example test for normalizedStringsAreEqual
// test('normalizedStringsAreEqual should correctly compare normalized strings with compatible placeholders', () => {
//   const s1 = [
//     'Hello ',
//     { t: 'x', v: 'NAME' },
//     '! Welcome to ',
//     { t: 'x', v: 'PLACE' },
//     '.'
//   ];

//   const s2 = [
//     'Hello ',
//     { t: 'x', v: 'NAME' },
//     '! Welcome to ',
//     { t: 'x', v: 'PLACE' },
//     '.'
//   ];

//   const s3 = [
//     'Hello ',
//     { t: 'x', v: 'USERNAME' },
//     '! Welcome to ',
//     { t: 'x', v: 'LOCATION' },
//     '.'
//   ];

//   assert.strictEqual(normalizedStringsAreEqual(s1, s2), true, 'Identical normalized strings should be equal');
//   assert.strictEqual(normalizedStringsAreEqual(s1, s3), false, 'Different normalized strings should not be equal');
// });

// // Example test for integerToLabel
// test('integerToLabel should correctly convert integers to base32 labels', () => {
//   const testCases = [
//     { input: 1, expected: 'A' },
//     { input: 31, expected: '9' },
//     { input: 32, expected: 'BA' },
//     { input: 0, expected: '' },
//     { input: 1024, expected: 'CAA' },
//     { input: 100000, expected: 'G8A8' }
//   ];

//   for (const { input, expected } of testCases) {
//     const result = integerToLabel(input);
//     assert.strictEqual(result, expected, `integerToLabel(${input}) should be "${expected}"`);
//   }
// });

// // Example test for fixCaseInsensitiveKey
// test('fixCaseInsensitiveKey should find keys case-insensitively', () => {
//   const obj = {
//     Name: 'Alice',
//     AGE: 30,
//     'Address': 'Wonderland'
//   };

//   assert.strictEqual(fixCaseInsensitiveKey(obj, 'name'), 'Name');
//   assert.strictEqual(fixCaseInsensitiveKey(obj, 'AGE'), 'AGE');
//   assert.strictEqual(fixCaseInsensitiveKey(obj, 'address'), 'Address');
//   assert.strictEqual(fixCaseInsensitiveKey(obj, 'unknown'), undefined);
// });

// /**
//  * Tests for decodeNormalizedString
//  */
// test('decodeNormalizedString should return the original string when no decoders are provided', () => {
//   const nstr = [{ t: 's', v: 'Hello ' }, { t: 'x', v: 'NAME' }, { t: 's', v: '!' }];
//   const result = decodeNormalizedString(nstr, null, false);
//   const expected = [{ t: 's', v: 'Hello ' }, { t: 'x', v: 'NAME' }, { t: 's', v: '!' }];
//   assert.deepEqual(result, expected, 'Should return the original normalized parts without decoders');
// });

// test('decodeNormalizedString should apply decoders sequentially', () => {
//   // Define mock decoders
//   const decoder1 = (parts) => parts.map(part => {
//     if (typeof part === 'string') return part.toUpperCase();
//     if (part.t === 's') return { ...part, v: part.v.toUpperCase() };
//     return part;
//   });

//   const decoder2 = (parts) => parts.map(part => {
//     if (typeof part === 'object' && part.t === 'x') {
//       return { ...part, v: part.v + '_DECODED' };
//     }
//     return part;
//   });

//   const nstr = [{ t: 's', v: 'Hello ' }, { t: 'x', v: 'NAME' }, { t: 's', v: '!' }];
//   const result = decodeNormalizedString(nstr, [decoder1, decoder2], false);
//   const expected = [
//     { t: 's', v: 'HELLO ' },
//     { t: 'x', v: 'NAME_DECODED' },
//     { t: 's', v: '!' }
//   ];
//   assert.deepEqual(result, expected, 'Should apply decoders in order');
// });

// /**
//  * Tests for getNormalizedString
//  */
// test('getNormalizedString should return array with original string when no decoders are provided', () => {
//   const str = 'Hello, World!';
//   const result = getNormalizedString(str, null, {});
//   const expected = ['Hello, World!'];
//   assert.deepEqual(result, expected, 'Should return array containing the original string');
// });

// test('getNormalizedString should normalize the string and apply decoders when provided', () => {
//   // Define a mock decoder that splits the string into words
//   const decoder = (parts) => parts.flatMap(part => {
//     if (typeof part === 'string') {
//       return part.split(' ').map(word => ({ t: 's', v: word + ' ' }));
//     }
//     return part;
//   });

//   const str = 'Hello World!';
//   const result = getNormalizedString(str, [decoder], {});
//   const expected = ['Hello ', 'World! '];
//   assert.deepEqual(result, expected, 'Should split the string into words with trailing spaces');
// });

// /**
//  * Tests for flattenNormalizedSourceToOrdinal
//  */
// test('flattenNormalizedSourceToOrdinal should correctly flatten normalized source without placeholders', () => {
//   const nsrc = ['Hello, World!'];
//   const result = flattenNormalizedSourceToOrdinal(nsrc);
//   const expected = 'Hello, World!';
//   assert.strictEqual(result, expected, 'Should return the original string when no placeholders are present');
// });

// test('flattenNormalizedSourceToOrdinal should correctly flatten normalized source with placeholders', () => {
//   const nsrc = [
//     'Hello, ',
//     { t: 'x', v: 'NAME' },
//     '! Welcome to ',
//     { t: 'x', v: 'PLACE' },
//     '.'
//   ];
//   const result = flattenNormalizedSourceToOrdinal(nsrc);
//   const expected = 'Hello, {{x}}{{x}}.';
//   assert.strictEqual(result, expected, 'Should replace placeholders with ordinal {{x}}');
// });

// /**
//  * Tests for flattenNormalizedSourceV1
//  */
// test('flattenNormalizedSourceV1 should correctly flatten normalized source and generate phMap', () => {
//   const nsrc = [
//     'Hello, ',
//     { t: 'x', v: 'NAME' },
//     '! Welcome to ',
//     { t: 'bx', v: 'PLACE' },
//     { t: 'ex', v: 'PLACE' },
//     '.'
//   ];

//   const [flattenedStr, phMap] = flattenNormalizedSourceV1(nsrc);

//   // Expected flattened string with v1 placeholders
//   const expectedStr = 'Hello, {{a_x_NAME}}! Welcome to {{b_a_PLACE}}</b_a_PLACE}}.';
//   // Note: The exact format depends on the implementation. Adjust expectations accordingly.

//   // Instead, let's verify the flattened string contains expected placeholder formats
//   assert.match(flattenedStr, /^Hello, \{\{a_x_NAME\}\}! Welcome to \{\{b_a_PLACE\}\}\.\.$/, 'Flattened string should contain correctly formatted v1 placeholders');

//   // Verify phMap has correct entries
//   assert.deepEqual(Object.keys(phMap).sort(), ['a_x_NAME', 'b_a_PLACE'].sort(), 'phMap should contain correct placeholders');
// });

// test('flattenNormalizedSourceV1 should handle multiple placeholders correctly', () => {
//   const nsrc = [
//     'Start ',
//     { t: 'x', v: 'FIRST' },
//     ' middle ',
//     { t: 'x', v: 'SECOND' },
//     ' end.'
//   ];

//   const [flattenedStr, phMap] = flattenNormalizedSourceV1(nsrc);

//   // Example expectation:
//   // 'Start {{a_x_FIRST}} middle {{b_x_SECOND}} end.'

//   assert.match(flattenedStr, /^Start \{\{a_x_FIRST\}\} middle \{\{b_x_SECOND\}\} end\.$/, 'Flattened string should correctly map multiple placeholders');
//   assert.deepEqual(Object.keys(phMap), ['a_x_FIRST', 'b_x_SECOND'], 'phMap should have correct placeholder mappings');
// });

// /**
//  * Tests for extractNormalizedPartsV1
//  */
// test('extractNormalizedPartsV1 should correctly extract normalized parts from flattened string', () => {
//   const flattenedStr = 'Hello, {{a_x_NAME}}! Welcome to {{b_x_PLACE}}.';
//   const phMap = {
//     'a_x_NAME': { t: 'x', v: 'NAME', v1: 'a_x_NAME' },
//     'b_x_PLACE': { t: 'x', v: 'PLACE', v1: 'b_x_PLACE' }
//   };

//   const normalizedParts = extractNormalizedPartsV1(flattenedStr, phMap);

//   const expected = [
//     'Hello, ',
//     { t: 'x', v: 'NAME', v1: 'a_x_NAME' },
//     '! Welcome to ',
//     { t: 'x', v: 'PLACE', v1: 'b_x_PLACE' },
//     '.'
//   ];

//   assert.deepEqual(normalizedParts, expected, 'Should correctly extract normalized parts from flattened string');
// });

// test('extractNormalizedPartsV1 should handle unknown placeholders gracefully', () => {
//   const flattenedStr = 'Hello, {{unknown_ph}}!';
//   const phMap = {
//     'a_x_NAME': { t: 'x', v: 'NAME', v1: 'a_x_NAME' }
//   };

//   const normalizedParts = extractNormalizedPartsV1(flattenedStr, phMap);

//   const expected = [
//     'Hello, {{unknown_ph}}!',
//   ];

//   assert.deepEqual(normalizedParts, expected, 'Should leave unknown placeholders as plain strings');
// });

// /**
//  * Tests for flattenNormalizedSourceToXmlV1
//  */
// test('flattenNormalizedSourceToXmlV1 should correctly flatten normalized source to XML-compatible string and generate phMap', () => {
//   const nsrc = [
//     'Click ',
//     { t: 'bx', v: 'OPEN_LINK' },
//     'here',
//     { t: 'ex', v: 'OPEN_LINK' },
//     ' to continue.'
//   ];

//   const [flattenedStr, phMap] = flattenNormalizedSourceToXmlV1(nsrc);

//   // Expected flattened string example:
//   // 'Click <x1>here</x1> to continue.'

//   assert.match(flattenedStr, /^Click <x1>here<\/x1> to continue\.$/, 'Flattened XML string should correctly map placeholders');
//   assert.deepEqual(Object.keys(phMap), ['x1'], 'phMap should have correct placeholder mappings');
// });

// test('flattenNormalizedSourceToXmlV1 should handle self-closing placeholders and samples', () => {
//   const nsrc = [
//     'Image: ',
//     { t: 'x', v: 'IMAGE', s: 'alt text' },
//     '.'
//   ];

//   const [flattenedStr, phMap] = flattenNormalizedSourceToXmlV1(nsrc);

//   // Expected flattened string example:
//   // 'Image: <x1>alt text</x1>.'

//   assert.match(flattenedStr, /^Image: <x1>alt text<\/x1>\.$/, 'Flattened XML string should include sample text in placeholders');
//   assert.deepEqual(phMap, {
//     'x1': { t: 'x', v: 'IMAGE', s: 'alt text', v1: 'x1_OPEN_LINK' } // Adjust based on actual mangledPh
//   }, 'phMap should include placeholder with sample text');
// });

// /**
//  * Tests for extractNormalizedPartsFromXmlV1
//  */
// test('extractNormalizedPartsFromXmlV1 should correctly extract normalized parts from XML-flattened string', () => {
//   const xmlStr = 'Click <x1>here</x1> to continue.';
//   const phMap = {
//     'x1': { t: 'x', v: 'HERE', v1: 'x1' }
//   };

//   const normalizedParts = extractNormalizedPartsFromXmlV1(xmlStr, phMap);

//   const expected = [
//     'Click ',
//     { t: 'x', v: 'HERE', v1: 'x1' },
//     ' to continue.'
//   ];

//   assert.deepEqual(normalizedParts, expected, 'Should correctly extract normalized parts from XML string');
// });

// test('extractNormalizedPartsFromXmlV1 should handle unknown XML placeholders gracefully', () => {
//   const xmlStr = 'Unknown <x99/> placeholder.';
//   const phMap = {
//     'x1': { t: 'x', v: 'KNOWN', v1: 'x1' }
//   };

//   const normalizedParts = extractNormalizedPartsFromXmlV1(xmlStr, phMap);

//   const expected = [
//     'Unknown ',
//     '<x99/>',
//     ' placeholder.'
//   ];

//   assert.deepEqual(normalizedParts, expected, 'Should leave unknown XML placeholders as plain strings');
// });

// /**
//  * Tests for phMatcherMaker
//  */
// test('phMatcherMaker should correctly match compatible placeholders', () => {
//   const nsrc = [
//     'Hello, ',
//     { t: 'x', v: 'NAME' },
//     '! Welcome to ',
//     { t: 'x', v: 'PLACE' },
//     '.'
//   ];

//   const phMatcher = phMatcherMaker(nsrc);

//   const targetPart1 = { t: 'x', v: 'NAME', v1: 'a_x_NAME' };
//   const targetPart2 = { t: 'x', v: 'UNKNOWN', v1: 'b_x_UNKNOWN' };

//   assert.deepEqual(phMatcher(targetPart1), { t: 'x', v: 'NAME', v1: 'a_x_NAME' }, 'Should match compatible placeholder');
//   assert.strictEqual(phMatcher(targetPart2), undefined, 'Should not match incompatible placeholder');
// });

// test('phMatcherMaker should handle minimized v1 placeholders', () => {
//   const nsrc = [
//     'Order ',
//     { t: 'x', v: 'ITEM' },
//     ': ',
//     { t: 'x', v: 'QUANTITY' }
//   ];

//   const phMatcher = phMatcherMaker(nsrc);

//   const targetPart = { t: 'x', v: 'ITEM', v1: 'a_x_ITEM_EXTRA_INFO' }; // Extra info should be stripped

//   assert.deepEqual(phMatcher(targetPart), { t: 'x', v: 'ITEM', v1: 'a_x_ITEM_EXTRA_INFO' }, 'Should match after minifying v1 placeholder');
// });

// /**
//  * Tests for sourceAndTargetAreCompatible
//  */
// test('sourceAndTargetAreCompatible should return true for compatible sources and targets', () => {
//   const nsrc = [
//     'Hello, ',
//     { t: 'x', v: 'NAME' },
//     '! Welcome to ',
//     { t: 'x', v: 'PLACE' },
//     '.'
//   ];

//   const ntgt = [
//     'Hola, ',
//     { t: 'x', v: 'NAME' },
//     '! Bienvenido a ',
//     { t: 'x', v: 'PLACE' },
//     '.'
//   ];

//   const result = sourceAndTargetAreCompatible(nsrc, ntgt);
//   assert.strictEqual(result, true, 'Compatible source and target should return true');
// });

// test('sourceAndTargetAreCompatible should return false for incompatible sources and targets', () => {
//   const nsrc = [
//     'Hello, ',
//     { t: 'x', v: 'NAME' },
//     '! Welcome to ',
//     { t: 'x', v: 'PLACE' },
//     '.'
//   ];

//   const ntgt = [
//     'Hola, ',
//     { t: 'x', v: 'USERNAME' }, // Different placeholder
//     '! Bienvenido a ',
//     { t: 'x', v: 'PLACE' },
//     '.'
//   ];

//   const result = sourceAndTargetAreCompatible(nsrc, ntgt);
//   assert.strictEqual(result, false, 'Incompatible source and target should return false');
// });

// test('sourceAndTargetAreCompatible should return false if target has extra placeholders', () => {
//   const nsrc = [
//     'Hello, ',
//     { t: 'x', v: 'NAME' },
//     '! Welcome to ',
//     { t: 'x', v: 'PLACE' },
//     '.'
//   ];

//   const ntgt = [
//     'Hola, ',
//     { t: 'x', v: 'NAME' },
//     '! Bienvenido a ',
//     { t: 'x', v: 'PLACE' },
//     ' en ',
//     { t: 'x', v: 'CITY' },
//     '.'
//   ];

//   const result = sourceAndTargetAreCompatible(nsrc, ntgt);
//   assert.strictEqual(result, false, 'Target with extra placeholders should be incompatible');
// });

// /**
//  * Tests for getTUMaps
//  */
// test('getTUMaps should correctly generate contentMap, tuMeta, and phNotes from TUs', () => {
//   const tus = [
//     {
//       guid: '1',
//       nsrc: [
//         'Hello, ',
//         { t: 'x', v: 'NAME' },
//         '!'
//       ],
//       notes: {
//         ph: {
//           'NAME': { sample: 'Alice', desc: 'User name' }
//         }
//       }
//     },
//     {
//       guid: '2',
//       nsrc: [
//         'Welcome to ',
//         { t: 'x', v: 'PLACE' },
//         '.'
//       ],
//       ntgt: [
//         'Bienvenue à ',
//         { t: 'x', v: 'PLACE' },
//         '.'
//       ]
//     }
//   ];

//   const { contentMap, tuMeta, phNotes } = getTUMaps(tus);

//   // Verify contentMap
//   const expectedContentMap = {
//     '1': 'Hello, {{a_x_NAME}}!',
//     '2': 'Welcome to {{a_x_PLACE}}.'
//   };
//   assert.deepEqual(contentMap, expectedContentMap, 'contentMap should correctly map GUIDs to flattened strings');

//   // Verify tuMeta
//   assert.deepEqual(Object.keys(tuMeta), ['1'], 'tuMeta should contain entries for TUs with placeholders');

//   // Verify phNotes for GUID '1'
//   assert.match(phNotes['1'], /ph:.*a_x_NAME → NAME → Alice → User name/, 'phNotes should correctly format placeholder notes');

//   // Verify phNotes for GUID '2' (no notes)
//   assert.match(phNotes['2'], /ph:/, 'phNotes should handle TUs without placeholder notes');
// });

// test('getTUMaps should handle TUs without placeholders correctly', () => {
//   const tus = [
//     {
//       guid: '3',
//       nsrc: ['Just a simple string without placeholders.']
//     }
//   ];

//   const { contentMap, tuMeta, phNotes } = getTUMaps(tus);

//   // Verify contentMap
//   const expectedContentMap = {
//     '3': 'Just a simple string without placeholders.'
//   };
//   assert.deepEqual(contentMap, expectedContentMap, 'contentMap should correctly map GUIDs to flattened strings');

//   // Verify tuMeta and phNotes are empty
//   assert.deepEqual(tuMeta, {}, 'tuMeta should be empty for TUs without placeholders');
//   assert.deepEqual(phNotes, {}, 'phNotes should be empty for TUs without placeholders');
// });

// /**
//  * Tests for extractStructuredNotes
//  */
// test('extractStructuredNotes should correctly parse PH annotations', () => {
//   const notes = 'This is a sample note. PH(NAME|Alice|User name) PH(PLACE|Wonderland|Location).';

//   const expected = {
//     ph: {
//       'NAME': { sample: 'Alice', desc: 'User name' },
//       'PLACE': { sample: 'Wonderland', desc: 'Location' }
//     },
//     desc: 'This is a sample note.  .'
//   };

//   const result = extractStructuredNotes(notes);
//   assert.deepEqual(result, expected, 'Should correctly extract PH annotations and clean description');
// });

// test('extractStructuredNotes should correctly parse MAXWIDTH, SCREENSHOT, and TAG annotations', () => {
//   const notes = 'Ensure the text fits. MAXWIDTH(50) SCREENSHOT(image.png) TAG(translatable, important)';

//   const expected = {
//     maxWidth: 50,
//     screenshot: 'image.png',
//     tags: ['translatable', 'important'],
//     desc: 'Ensure the text fits.  '
//   };

//   const result = extractStructuredNotes(notes);
//   assert.deepEqual(result, expected, 'Should correctly extract MAXWIDTH, SCREENSHOT, TAG annotations and clean description');
// });

// test('extractStructuredNotes should handle mixed annotations and text', () => {
//   const notes = 'PH(USER|Bob) Some description. MAXWIDTH(100) TAG(ui) More text. SCREENSHOT(ui.png)';

//   const expected = {
//     ph: {
//       'USER': { sample: 'Bob' }
//     },
//     maxWidth: 100,
//     tags: ['ui'],
//     screenshot: 'ui.png',
//     desc: ' Some description.  More text. '
//   };

//   const result = extractStructuredNotes(notes);
//   assert.deepEqual(result, expected, 'Should correctly extract mixed annotations and clean description');
// });

// test('extractStructuredNotes should handle missing optional fields', () => {
//   const notes = 'PH(TOKEN|12345) Only a sample. PH(FLAG)';

//   const expected = {
//     ph: {
//       'TOKEN': { sample: '12345' },
//       'FLAG': {}
//     },
//     desc: ' Only a sample. '
//   };

//   const result = extractStructuredNotes(notes);
//   assert.deepEqual(result, expected, 'Should handle annotations with missing optional fields');
// });

// /**
//  * Additional Tests for Other Functions (Included for Completeness)
//  */

// // Test for normalizedStringsAreEqual (Included previously)
// test('normalizedStringsAreEqual should correctly compare normalized strings with compatible placeholders', () => {
//   const s1 = [
//     'Hello ',
//     { t: 'x', v: 'NAME' },
//     '! Welcome to ',
//     { t: 'x', v: 'PLACE' },
//     '.'
//   ];

//   const s2 = [
//     'Hello ',
//     { t: 'x', v: 'NAME' },
//     '! Welcome to ',
//     { t: 'x', v: 'PLACE' },
//     '.'
//   ];

//   const s3 = [
//     'Hello ',
//     { t: 'x', v: 'USERNAME' },
//     '! Welcome to ',
//     { t: 'x', v: 'LOCATION' },
//     '.'
//   ];

//   assert.strictEqual(normalizedStringsAreEqual(s1, s2), true, 'Identical normalized strings should be equal');
//   assert.strictEqual(normalizedStringsAreEqual(s1, s3), false, 'Different normalized strings should not be equal');
// });

// /**
//  * Test for integerToLabel (Included previously)
//  */
// test('integerToLabel should correctly convert integers to base32 labels', () => {
//   const testCases = [
//     { input: 1, expected: 'A' },
//     { input: 31, expected: '9' },
//     { input: 32, expected: 'BA' },
//     { input: 0, expected: '' },
//     { input: 1024, expected: 'CAI' }, // 1024 / 32 = 32, mod 32 = 0 (A), etc.
//     { input: 100000, expected: 'GBEB' } // Example, adjust based on actual implementation
//   ];

//   for (const { input, expected } of testCases) {
//     const result = integerToLabel(input);
//     assert.strictEqual(result, expected, `integerToLabel(${input}) should be "${expected}"`);
//   }
// });

// /**
//  * Test for fixCaseInsensitiveKey (Included previously)
//  */
// test('fixCaseInsensitiveKey should find keys case-insensitively', () => {
//   const obj = {
//     Name: 'Alice',
//     AGE: 30,
//     'Address': 'Wonderland'
//   };

//   assert.strictEqual(fixCaseInsensitiveKey(obj, 'name'), 'Name');
//   assert.strictEqual(fixCaseInsensitiveKey(obj, 'AGE'), 'AGE');
//   assert.strictEqual(fixCaseInsensitiveKey(obj, 'address'), 'Address');
//   assert.strictEqual(fixCaseInsensitiveKey(obj, 'unknown'), undefined);
// });
