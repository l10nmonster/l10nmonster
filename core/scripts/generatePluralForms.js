#!/usr/bin/env node

import { writeFileSync } from 'fs';
import pluralsData from 'cldr-core/supplemental/plurals.json' with { type: 'json' };

const cardinalPlurals = pluralsData.supplemental['plurals-type-cardinal'];

const pluralForms = {};

for (const [locale, rules] of Object.entries(cardinalPlurals)) {
    const forms = Object.keys(rules)
        .map(key => key.replace('pluralRule-count-', ''))
        .sort((a, b) => {
            // Sort in CLDR canonical order: zero, one, two, few, many, other
            const order = ['zero', 'one', 'two', 'few', 'many', 'other'];
            return order.indexOf(a) - order.indexOf(b);
        });
    pluralForms[locale] = forms;
}

writeFileSync('pluralForms.js', `export const pluralForms = ${JSON.stringify(pluralForms, null, 2)};`, 'utf8');

console.log(`Generated pluralForms.js with ${Object.keys(pluralForms).length} locales`);
