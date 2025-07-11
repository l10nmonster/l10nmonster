import { ConfigMancer } from '@l10nmonster/config-mancer';
import { L10nMonsterConfig } from '@l10nmonster/core';
import { iosChannel } from './l10nmonster.config.mjs';

const mancer = await ConfigMancer.create({
    baseUrl: import.meta.url,
    packages: [
        '@l10nmonster/core',
    ],
});
console.dir(mancer.schemaManager.schema, { depth: null });
const config = mancer.serialize(iosChannel);
console.dir(config, { depth: null });

// console.log(mancer.serialize(iosChannel));