/* eslint-disable no-invalid-this */
import { statusCmd } from '@l10nmonster/core';
import { withMonsterManager } from './monsterUtils.js';

function computeTotals(totals, partial) {
    for (const [ k, v ] of Object.entries(partial)) {
        if (typeof v === 'object') {
            totals[k] ??= {};
            computeTotals(totals[k], v);
        } else {
            totals[k] ??= 0;
            totals[k] += v;
        }
    }
}

export async function fetchStatusPanel(mm) {
    const stats = await mm.source.getResourceStats();
    const sourcesStatus = {
        key: 'sources',
        label: `Sources (${stats.length.toLocaleString()})`,
        children: stats.map(s => ({
            key: s.id,
            label: s.id,
            tooltip: `modified: ${s.modified}\n languages: ${s.targetLangs.join(', ')}`,
        })),
    };
    const targetLangs = await mm.getTargetLangs(false, true);
    const translationStatus = {
        key: 'translationStatus',
        label: 'Translation Status',
        children: targetLangs.map(lang => ({
            key: lang,
            label: `Language ${lang}`,
            lazyChildren: {
                command: 'l10nmonster.fetchStatusByLanguage',
                arguments: [ lang ]
            }
        })),
    };
    return [ sourcesStatus, translationStatus ];
}

// note: this will run as a method of the provider class, so `this` will point to that instance
export async function fetchStatusByLanguage(lang) {
    return withMonsterManager(this.configPath, async mm => {
        const status = await statusCmd(mm, {lang});
        const langStatus = status.lang[lang];
        const totals = {};
        const prjDetail = [];
        const prjLeverage = Object.entries(langStatus.leverage.prjLeverage).sort((a, b) => (a[0] > b[0] ? 1 : -1));
        for (const [prj, leverage] of prjLeverage) {
            computeTotals(totals, leverage);
            prjDetail.push({
                key: prj,
                label: `${prj}: ${leverage.untranslatedWords.toLocaleString()} words ${leverage.untranslated.toLocaleString()} strings`,
            });
        }
        prjDetail.push({
            key: 'totals',
            label: `Total: ${totals.untranslatedWords.toLocaleString()} words ${totals.untranslated.toLocaleString()} strings`,
        });
        return prjDetail;
    });
}
