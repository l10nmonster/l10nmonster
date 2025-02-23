import vscode from 'vscode';
import * as path from 'path';
import { existsSync } from 'fs';
import { StatusViewProvider } from './statusPanel.js';
import { JobsViewProvider } from './jobsPanel.js';
import { AnalyzeViewProvider } from './analyzePanel.js';
import { logger, withMonsterManager } from './monsterUtils.js';

const printCapabilities = cap => Object.entries(cap).filter(e => e[1]).map(e => e[0]).join(', ');

function getL10nmanagerCommand(configPath) {
    return async function l10nmanagerCommand() {
        const capabilities = await withMonsterManager(configPath, async mm => printCapabilities(mm.capabilities));
        vscode.window.showInformationMessage(capabilities ? `Supported commands: ${capabilities}` : 'Problems initializing L10n Monster');
        capabilities && await vscode.commands.executeCommand('statusView.focus');
    }
}

async function initL10nMonster(context) {
    const configPath = vscode.workspace.workspaceFolders?.length > 0 && path.resolve(vscode.workspace.workspaceFolders[0].uri.fsPath, 'l10nmonster.config.mjs');
    if (configPath && existsSync(configPath)) {
        logger.info(`L10n Monster config found at: ${configPath}`);
        context.subscriptions.push(vscode.commands.registerCommand('l10nmonster.l10nmanager', getL10nmanagerCommand(configPath)));
        return withMonsterManager(configPath, async mm => {
            logger.info(`L10n Monster initialized. Supported commands: ${printCapabilities(mm.capabilities)}`);
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
    logger.error(`Could not find L10n Monster config at: ${configPath}`);
    await vscode.commands.executeCommand('setContext', 'l10nMonsterEnabled', false);
    return false;
}

/**
 * @param {vscode.ExtensionContext} context
 */
export async function activate(context) {
    logger.info(`L10n Monster Manager is now active!`);
    // await vscode.commands.executeCommand('setContext', 'l10nMonsterEnabled', false);
    await initL10nMonster(context);
}

export async function deactivate() {
    logger.info(`L10n Monster Manager was deactivated!`);
    await vscode.commands.executeCommand('setContext', 'l10nMonsterEnabled', false);
}
