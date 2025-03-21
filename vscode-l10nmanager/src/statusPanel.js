import vscode from 'vscode';
import { AbstractViewTreeDataProvider, withMonsterManager, getMonsterPage, escapeHtml, renderString } from './monsterUtils.js';

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

const alertIcon = new vscode.ThemeIcon('alert');
const checkIcon = new vscode.ThemeIcon('check');

export class StatusViewProvider extends AbstractViewTreeDataProvider {
    constructor(configPath, context) {
        super(configPath);
        context.subscriptions.push(vscode.commands.registerCommand('l10nmonster.fetchStatusByLanguage', (lang) => this.fetchStatusByLanguage(lang)));
        context.subscriptions.push(vscode.commands.registerCommand('l10nmonster.showUntranslated', (lang, prj) => this.showUntranslated(lang, prj)));
    }

    async dataFetcher(mm) {
        const handles = await mm.rm.getResourceHandles();
        const sourcesStatus = {
            key: 'sources',
            label: `Sources (${handles.length.toLocaleString()})`,
            children: handles.map(s => ({
                key: s.id,
                label: s.id,
                tooltip: `modified: ${s.modified}\n languages: ${s.targetLangs.join(', ')}`,
            })),
        };
        const targetLangs = await mm.getTargetLangs();
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

    async fetchStatusByLanguage(lang) {
        return withMonsterManager(this.configPath, async mm => {
            const status = await mm.status({ limitToLang: lang });
            const langStatus = status.lang[lang];
            const totals = {};
            const prjDetail = [];
            const prjLeverage = Object.entries(langStatus.leverage.prjLeverage).sort((a, b) => (a[0] > b[0] ? 1 : -1));
            for (const [prj, leverage] of prjLeverage) {
                computeTotals(totals, leverage);
                if (leverage.untranslatedWords > 0) {
                    prjDetail.push({
                        key: prj,
                        iconPath: alertIcon,
                        label: `${prj}: ${leverage.untranslatedWords.toLocaleString()} words ${leverage.untranslated.toLocaleString()} strings`,
                        command: {
                            command: 'l10nmonster.showUntranslated',
                            title: '',
                            arguments: [ lang, prj ]
                        }
                    });
                } else {
                    prjDetail.push({
                        key: prj,
                        iconPath: checkIcon,
                        label: `${prj}: fully translated`,
                    });
                }
            }
            prjDetail.length > 1 && prjDetail.push({
                key: 'totals',
                label: `Total: ${totals.untranslatedWords.toLocaleString()} words ${totals.untranslated.toLocaleString()} strings`,
                command: totals.untranslatedWords ?
                    {
                        command: 'l10nmonster.showUntranslated',
                        title: '',
                        arguments: [ lang ] // leave prj undefined to get all projects
                    } :
                    undefined
            });
            return prjDetail;
        });
    }

    async showUntranslated(lang, prj) {
        return withMonsterManager(this.configPath, async mm => {
            const jobBody = await mm.prepareTranslationJob({ targetLang: lang });
            const prjLabel = prj ?? 'All projects';
            const tabName = `${prjLabel} (${lang})`;
            const panel = vscode.window.createWebviewPanel(
                'showUntranslatedView',
                tabName,
                vscode.ViewColumn.One,
                { enableFindWidget: true }
            );
            panel.webview.html = getMonsterPage(tabName, `
                <h2>Untranslated content for project ${prjLabel}, language: ${lang}</h2>
                ${jobBody.tus.length > 0 ?
                    `<table>
                        <tr><th>rid / sid</th><th>Source</th><th>Notes</th></tr>
                        ${jobBody.tus.map(tu => `<tr><td><i>${tu.rid}</i><br /><b>${tu.sid}</b></td><td>${renderString(tu.nsrc)}</td><td>${escapeHtml(tu?.notes?.desc) ?? ''}</td>`).join('\n')}
                    </table>` :
                    '<h4>Nothing found!</h4>'
                }
            `);
        }, prj === 'default' ? undefined : prj);
    }
}
