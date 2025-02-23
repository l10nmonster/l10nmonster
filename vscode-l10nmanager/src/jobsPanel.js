import vscode from 'vscode';
import {
    AbstractViewTreeDataProvider,
    withMonsterManager,
    getMonsterPage,
    renderString,
} from './monsterUtils.js';

export class JobsViewProvider extends AbstractViewTreeDataProvider {
    constructor(configPath, context) {
        super(configPath);
        context.subscriptions.push(vscode.commands.registerCommand('l10nmonster.fetchJobsByLanguagePair', (sourceLang, targetLang) => this.fetchJobsByLanguagePair(sourceLang, targetLang)));
        context.subscriptions.push(vscode.commands.registerCommand('l10nmonster.viewJob', (jobGuid, hasRes) => this.viewJob(jobGuid, hasRes)));
    }

    async dataFetcher(mm) {
        const jobsPanel = [];
        const availableLangPairs = (await mm.tmm.getAvailableLangPairs()).sort();
        for (const [sourceLang, targetLang] of availableLangPairs) {
            jobsPanel.push({
                key: `${sourceLang}-${targetLang}`,
                label: `${sourceLang} → ${targetLang}`,
                lazyChildren: {
                    command: 'l10nmonster.fetchJobsByLanguagePair',
                    arguments: [ sourceLang, targetLang ]
                }
            });
        }
        return jobsPanel;
    }

    async fetchJobsByLanguagePair(sourceLang, targetLang) {
        return withMonsterManager(this.configPath, async mm => {
            const languagePanel = [];
            // TODO: refactor with new TMM
            // const tm = mm.tmm.getTM(sourceLang, targetLang);
            // const jobsMetaEntries = Object.entries(tm.getJobsMeta())
            //     .sort((a, b) => new Date(b[1].updatedAt) - new Date(a[1].updatedAt));
            // const jobsSection = [[],[]];
            // const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short'});
            // for (const [jobGuid, meta] of jobsMetaEntries) {
            //     const sectionIdx = meta.status === 'done' ? 1 : 0;
            //     jobsSection[sectionIdx].push({
            //         key: jobGuid,
            //         iconPath: vscode.ThemeIcon.File,
            //         label: `${dateFormatter.format(new Date(meta.updatedAt))} (${meta.units} ${meta.status})`,
            //         description: meta.translationProvider,
            //         tooltip: jobGuid,
            //         command: {
            //             command: 'l10nmonster.viewJob',
            //             title: '',
            //             arguments: [ jobGuid, ['pending', 'done'].includes(meta.status) ]
            //         }
            //     });
            // }
            // jobsSection[0].length > 0 && languagePanel.push({
            //     key: 'unfinishedJobs',
            //     label: `Unfinished Jobs (${jobsSection[0].length})`,
            //     children: jobsSection[0]
            // });
            // jobsSection[1].length > 0 && languagePanel.push({
            //     key: 'completedJobs',
            //     label: `Completed Jobs (${jobsSection[1].length})`,
            //     children: jobsSection[1]
            // });
            return languagePanel;
        });
    }

    async viewJob(jobGuid, hasRes) {
        return withMonsterManager(this.configPath, async mm => {
            const job = hasRes && await mm.tmm.getJob(jobGuid);
            const translations = (job?.tus && Object.fromEntries(job.tus.map(tu => [tu.guid, tu]))) ?? {};
            const inflight = (job?.inflight && Object.fromEntries(job.inflight.map(guid => [guid, true]))) ?? {};
            const panel = vscode.window.createWebviewPanel(
                'jobView',
                `Job: ${jobGuid}`,
                vscode.ViewColumn.One,
                { enableFindWidget: true }
            );
            panel.webview.html = getMonsterPage(`Job: ${jobGuid}`, `
                <h2>${job.translationProvider} → ${jobGuid}</h2>
                <h4> Created on ${new Date(job.updatedAt)}</h4>
                ${job && `<h4> Last updated on ${new Date(job.updatedAt)}</h4>`}
                <table>
                    <tr><th>Id</th><th>Source (${job.sourceLang})</th><th>Translation (${job.targetLang})</th></th>
                    ${job.tus.map(tu => `<tr>
                        <td>${tu.sid}</td>
                        <td>${renderString(tu?.nsrc)}</td>
                        <td>${renderString(translations[tu.guid]?.ntgt, inflight[tu.guid])}</td>
                    </tr>`).join('\n')}
                </table>
            `);
        });
    }
}
