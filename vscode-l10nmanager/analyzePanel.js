/* eslint-disable no-nested-ternary */
/* eslint-disable no-invalid-this */
import vscode from 'vscode';
import { withMonsterManager, getMonsterPage } from './monsterUtils.js';
import { analyzeCmd } from '@l10nmonster/core';

export async function fetchAnalyzePanel(mm) {
    const analyzePanel = Object.entries(mm.analyzers).map(([name, analyzer]) => ({
        key: name,
        iconPath: vscode.ThemeIcon.File,
        label: `${name} ${typeof analyzer.prototype.processSegment === 'function' ? '(src)' : '(tm)'}`,
        tooltip: `${analyzer.help}`,
        command: {
            command: 'l10nmonster.runAnalyzer',
            title: '',
            arguments: [ name, analyzer.helpParams ]
        }
    }));
    return analyzePanel;
}

export async function runAnalyzer(name, helpParams) {
    return withMonsterManager(this.configPath, async mm => {
        const Analyzer = mm.analyzers[name];
        let params;
        if ((helpParams && (params = await vscode.window.showInputBox({ placeHolder: helpParams }))) || !helpParams) {
            // TODO: don't split by space, call input box for each param
            // TODO: support picking a tu filter (maybe have a separate panel or tree item with a radio button?)
            const analysis = await analyzeCmd(mm, Analyzer, params?.split(' ') || []);
            // TODO: implement groupBy
            // TODO: if tu analyzer, group by language automatically
            const panel = vscode.window.createWebviewPanel(
                'analyzerView',
                `${name} ${params ?? ''}`,
                vscode.ViewColumn.One,
                { enableFindWidget: true }
            );
            panel.webview.html = getMonsterPage(name, `
                <h2>Analyzer: ${name} ${helpParams ? params : ''}</h2>
                ${analysis.head ?
                    analysis.body.length > 0 ?
                        `<table>
                        <tr>${analysis.head.map(col => `<th>${col}</th>`).join('\n')}</tr>
                        ${analysis.body.map(row => `<tr>${row.map(col => `<td>${col}</td>`).join('')}</tr>`).join('\n')}
                        </table>` :
                        '<h4>Nothing found!</h4>' :
                    `<pre>${analysis.body}</pre>`
                }
            `);
        }
    });
}
