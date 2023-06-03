import vscode from 'vscode';
import * as path from 'path';
import { existsSync } from 'fs';
import { fetchStatusPanel, fetchStatusByLanguage } from './statusPanel.js';
import { fetchJobsPanel, viewJob } from './jobsPanel.js';
import { fetchAnalyzePanel, runAnalyzer } from './analyzePanel.js';
import { withMonsterManager, L10nMonsterViewTreeDataProvider, logger } from './monsterUtils.js';

async function initL10nMonster(context) {
    const configPath = vscode.workspace.workspaceFolders?.length > 0 && path.resolve(vscode.workspace.workspaceFolders[0].uri.fsPath, 'l10nmonster.cjs');
    if (configPath && existsSync(configPath)) {
        logger.info(`L10n Monster config found at: ${configPath}`);
        return withMonsterManager(configPath, async mm => {
            const printCapabilities = cap => Object.entries(cap).filter(e => e[1]).map(e => e[0]).join(', ');
            logger.info(`L10n Monster initialized. Supported commands: ${printCapabilities(mm.capabilities)}`);
            await vscode.commands.executeCommand('setContext', 'l10nMonsterEnabled', true);

            const statusViewProvider = new L10nMonsterViewTreeDataProvider(configPath, fetchStatusPanel);
            context.subscriptions.push(vscode.commands.registerCommand('l10nmonster.fetchStatusByLanguage', (lang) => statusViewProvider.fetchStatusByLanguage(lang)));
            vscode.window.registerTreeDataProvider('statusView', statusViewProvider);
            statusViewProvider.fetchStatusByLanguage = fetchStatusByLanguage;

            const jobsViewProvider = new L10nMonsterViewTreeDataProvider(configPath, fetchJobsPanel);
            jobsViewProvider.viewJob = viewJob;
            context.subscriptions.push(vscode.commands.registerCommand('l10nmonster.viewJob', (jobGuid, hasRes) => jobsViewProvider.viewJob(jobGuid, hasRes)));
            vscode.window.registerTreeDataProvider('jobsView', jobsViewProvider);

            const analyzeViewProvider = new L10nMonsterViewTreeDataProvider(configPath, fetchAnalyzePanel);
            analyzeViewProvider.runAnalyzer = runAnalyzer;
            context.subscriptions.push(vscode.commands.registerCommand('l10nmonster.runAnalyzer', (name, helpParams) => analyzeViewProvider.runAnalyzer(name, helpParams)));
            vscode.window.registerTreeDataProvider('analyzeView', analyzeViewProvider);

            return true;
        });
    }
    logger.error(`Could not find L10n Monster config at: ${configPath}`);
    await vscode.commands.executeCommand('setContext', 'l10nMonsterEnabled', false);
    return false;
}

async function l10nmanagerCommand(context) {
    const status = await initL10nMonster(context);
    vscode.window.showInformationMessage(status ? 'L10n Monster re-initialized' : 'Problems initializing L10n Monster');
    status && await vscode.commands.executeCommand('statusView.focus');
}

/**
 * @param {vscode.ExtensionContext} context
 */
export async function activate(context) {
    logger.info(`L10n Monster Manager is now active!`);
    // await vscode.commands.executeCommand('setContext', 'l10nMonsterEnabled', false);
    context.subscriptions.push(vscode.commands.registerCommand('l10nmonster.l10nmanager', l10nmanagerCommand));
    await initL10nMonster(context);
}

export async function deactivate() {
    logger.info(`L10n Monster Manager was deactivated!`);
    await vscode.commands.executeCommand('setContext', 'l10nMonsterEnabled', false);
}
