import { statusCmd } from '@l10nmonster/core';

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
    const translationStatus = {
        key: 'translationStatus',
        label: 'Translation Status',
        children: []
    };
    const status = await statusCmd(mm, {});
    for (const [lang, langStatus] of Object.entries(status.lang)) {
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
        // const totalStrings = totals.translated + totals.pending + totals.untranslated + totals.internalRepetitions;
        translationStatus.children.push({
            key: lang,
            label: `Language ${lang} (words: ${totals.untranslatedWords.toLocaleString()})`, // (TM=${langStatus.leverage.tmSize.toLocaleString()})
            children: prjDetail
        });
    }
    return [ sourcesStatus, translationStatus ];
}
