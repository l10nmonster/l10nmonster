/* eslint-disable no-invalid-this */
import vscode from 'vscode';
import { withMonsterManager, getMonsterPage, renderString } from './monsterUtils.js';

export async function fetchJobsPanel(mm) {
    const jobsPanel = [];
    const targetLangs = await mm.getTargetLangs();
    for (const lang of targetLangs) {
        const jobStats = (await mm.jobStore.getJobStatusByLangPair(mm.sourceLang, lang));
        if (jobStats.length > 0) {
            const jobsSection = [[],[]];
            for (const [jobGuid, stats] of jobStats) {
                const sectionIdx = stats.status === 'done' ? 1 : 0;
                jobsSection[sectionIdx].push({
                    key: jobGuid,
                    iconPath: vscode.ThemeIcon.File,
                    label: `${jobGuid} (${stats.status})`,
                    command: {
                        command: 'l10nmonster.viewJob',
                        title: '',
                        arguments: [ jobGuid, ['pending', 'done'].includes(stats.status) ]
                    }
                });
            }
            const languagePanel = {
                key: lang,
                label: `Language ${lang} (${jobsSection[1].length}/${jobsSection[0].length + jobsSection[1].length})`,
                children: []
            }
            jobsSection[0].length > 0 && languagePanel.children.push({
                key: 'unfinishedJobs',
                label: `Unfinished Jobs (${jobsSection[0].length})`,
                children: jobsSection[0]
            });
            jobsSection[1].length > 0 && languagePanel.children.push({
                key: 'completedJobs',
                label: `Completed Jobs (${jobsSection[1].length})`,
                children: jobsSection[1]
            });
            jobsPanel.push(languagePanel);
        }
    }
    return jobsPanel;
}

// note: this will run as a method of the provider class, so `this` will point to that instance
export async function viewJob(jobGuid, hasRes) {
    return withMonsterManager(this.configPath, async mm => {
        const req = await mm.jobStore.getJobRequest(jobGuid);
        const res = hasRes && await mm.jobStore.getJob(jobGuid);
        const translations = (res?.tus && Object.fromEntries(res.tus.map(tu => [tu.guid, tu]))) ?? {};
        const inflight = (res?.inflight && Object.fromEntries(res.inflight.map(guid => [guid, true]))) ?? {};
        const panel = vscode.window.createWebviewPanel(
            'jobView',
            `Job: ${jobGuid}`,
            vscode.ViewColumn.One,
            { enableFindWidget: true }
        );
        panel.webview.html = getMonsterPage(`Job: ${jobGuid}`, `
            <h2>${req.translationProvider} → ${jobGuid}</h2>
            <h4> Created on ${new Date(req.updatedAt)}</h4>
            ${res && `<h4> Last updated on ${new Date(res.updatedAt)}</h4>`}
            <table>
                <tr><th>Id</th><th>Source (${req.sourceLang})</th><th>Translation (${req.targetLang})</th></th>
                ${req.tus.map(tu => `<tr>
                    <td>${tu.sid}</td>
                    <td>${renderString(tu?.src, tu?.nsrc)}</td>
                    <td>${renderString(translations[tu.guid]?.tgt, translations[tu.guid]?.ntgt, inflight[tu.guid])}</td>
                </tr>`).join('\n')}
            </table>
        `);
    });
}
