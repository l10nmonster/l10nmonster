import vscode from 'vscode';
import * as path from 'path';
import { existsSync } from 'fs';
import { StatusViewProvider } from './statusPanel.js';
import { JobsViewProvider } from './jobsPanel.js';
import { AnalyzeViewProvider } from './analyzePanel.js';
import { withMonsterManager } from './monsterUtils.js';

async function initL10nMonster(context) {
    const configPath = vscode.workspace.workspaceFolders?.length > 0 && path.resolve(vscode.workspace.workspaceFolders[0].uri.fsPath, 'l10nmonster.cjs');
    if (configPath && existsSync(configPath)) {
        l10nmonster.logger.info(`L10n Monster config found at: ${configPath}`);
        return withMonsterManager(configPath, async mm => {
            const printCapabilities = cap => Object.entries(cap).filter(e => e[1]).map(e => e[0]).join(', ');
            l10nmonster.logger.info(`L10n Monster initialized. Supported commands: ${printCapabilities(mm.capabilities)}`);
            await vscode.commands.executeCommand('setContext', 'l10nMonsterEnabled', true);

            const statusViewProvider = new StatusViewProvider(configPath, context);
            vscode.window.registerTreeDataProvider('statusView', statusViewProvider);

            const jobsViewProvider = new JobsViewProvider(configPath, context);
            vscode.window.registerTreeDataProvider('jobsView', jobsViewProvider);

            const analyzeViewProvider = new AnalyzeViewProvider(configPath, context);
            vscode.window.registerTreeDataProvider('analyzeView', analyzeViewProvider);

            return true;
        });
    }
    l10nmonster.logger.error(`Could not find L10n Monster config at: ${configPath}`);
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
    l10nmonster.logger.info(`L10n Monster Manager is now active!`);
    // await vscode.commands.executeCommand('setContext', 'l10nMonsterEnabled', false);
    context.subscriptions.push(vscode.commands.registerCommand('l10nmonster.l10nmanager', l10nmanagerCommand));
    await initL10nMonster(context);
}

export async function deactivate() {
    l10nmonster.logger.info(`L10n Monster Manager was deactivated!`);
    await vscode.commands.executeCommand('setContext', 'l10nMonsterEnabled', false);
}
