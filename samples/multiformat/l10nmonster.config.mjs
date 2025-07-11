import { L10nMonsterConfig, ChannelConfig, policies, adapters, filters, xml, normalizers } from '@l10nmonster/core';
import * as ios from '@l10nmonster/helpers-ios';
import * as android from '@l10nmonster/helpers-android';
import * as html from '@l10nmonster/helpers-html';
import * as demo from '@l10nmonster/helpers-demo';

import StubbedSource from './stubbedSource.js';
import channel1 from './channel1.json' assert { type: 'json' };
// import channel2 from './channel2.json' assert { type: 'json' };

export default new L10nMonsterConfig(import.meta.dirname)
    .channel(new ChannelConfig('channel1')
        .source(new StubbedSource(channel1))
        .resourceFilter(new filters.MNFv1())
        .decoders([
            ios.phDecoder,
            ios.escapesDecoder,
            xml.entityDecoder,
            xml.CDataDecoder,
            android.spaceCollapser,
            android.escapesDecoder,
            android.phDecoder,
            normalizers.doublePercentDecoder
        ])
        .policy(policies.allTargets(50))
        .target(new adapters.FsTarget({
            targetPath: (lang, resourceId) => `${resourceId}-${lang}.json`,
        })))
    .provider(new demo.providers.PigLatinizer({ quality: 2 }));
