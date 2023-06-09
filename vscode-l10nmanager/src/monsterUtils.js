import vscode from 'vscode';
import { createMonsterManager } from '@l10nmonster/core';

const monsterOutput = vscode.window.createOutputChannel('L10n Monster', { log: true });

global.l10nmonster ??= {};
l10nmonster.logger = {
    verbose: (msg) => monsterOutput.debug(msg),
    info: (msg) => monsterOutput.info(msg),
    warn: (msg) => monsterOutput.warn(msg),
    error: (msg) => monsterOutput.error(msg),
};

export function withMonsterManager(configPath, cb, limitToPrj) {
    const l10nmonsterCfg = vscode.workspace.getConfiguration('l10nmonster');
    l10nmonster.env = l10nmonsterCfg.get('env');
    let prj = limitToPrj ?? l10nmonsterCfg.get('prj');
    prj.length === 0 && (prj = undefined);
    const arg = l10nmonsterCfg.get('arg') || undefined;
    return (async () => {
        let result;
        try {
            const mm = await createMonsterManager(configPath, { prj, arg });
            if (mm) {
                result = await cb(mm);
                await mm.shutdown();
            }
        } catch (e) {
            l10nmonster.logger.error(`Unable to initialize l10n monster: ${e.stack ?? e}`);
            return false;
        }
        return result;
    })();
}

const escapeKey = key => key.replaceAll('.', '_');

function enumerateKeys(siblings, parentKey) {
    const getPrefix = (element) => (element.parentKey ? `${element.parentKey}.` : '');
    siblings.forEach(element => {
        element.parentKey = parentKey;
        element.fqKey = `${getPrefix(element)}${escapeKey(element.key)}`;
    });
    return siblings.map(element => `${getPrefix(element)}${escapeKey(element.key)}`);
}

function getElementByKey(siblings, keyparts) {
    const [baseKey, ...childKeys] = keyparts;
    let element;
    for (const e of siblings) {
        if (escapeKey(e.key) === baseKey) {
            element = e;
            break;
        }
    }
    if (element) {
        if (childKeys.length > 0) {
            return getElementByKey(element.children, childKeys);
        } else {
            return element;
        }
    }
    l10nmonster.logger.error(`Could not find ${baseKey} among siblings`);
    return undefined;
}

// Must provide a `dataFetcher` method
export class AbstractViewTreeDataProvider {
    constructor(configPath) {
        this.configPath = configPath;
    }

    async getChildren(key) {
        if (!key) { // root
            if (!this.cachedStatus) {
                return withMonsterManager(this.configPath, async mm => {
                    this.cachedStatus = await this.dataFetcher(mm);
                    return enumerateKeys(this.cachedStatus);
                });
            }
            l10nmonster.logger.warn('Somehow root was fetched again')
            return Promise.resolve(enumerateKeys(this.cachedStatus));
        }
        const element = getElementByKey(this.cachedStatus, key.split('.'));
        if (element.lazyChildren) { // lazily fetched children
            element.children = await vscode.commands.executeCommand(element.lazyChildren.command, ...element.lazyChildren.arguments);
        }
        if (element.children) { // inner collapsable
            return Promise.resolve(enumerateKeys(element.children, element.fqKey));
        } else {
            l10nmonster.logger.error(`Somehow a leaf was collapsed at key: ${key}`);
            return Promise.resolve([]);
        }
    }

    getTreeItem(key) {
        const element = getElementByKey(this.cachedStatus, key.split('.'));
        const item = new vscode.TreeItem(element.label, (element.children || element.lazyChildren) ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        element.command && (item.command = element.command);
        element.description && (item.description = element.description);
        element.tooltip && (item.tooltip = element.tooltip);
        element.iconPath && (item.iconPath = element.iconPath);
        element.icon && (item.icon = element.icon);
        return item;
    }
}

export const escapeHtml = str => (str ? str.replaceAll('&', '&amp;').replaceAll('<', '&lt;') : '');

export function renderString(str, inflight) {
    if (Array.isArray(str)) {
        return str
            .map(part => (typeof part === 'string' ? escapeHtml(part) : `<code><b>${escapeHtml(part.v)}</b></code>`))
            .join('');
    } else if (str === undefined) {
        return inflight ? '🚀' : '❌';
    } else {
        return escapeHtml(str);
    }
}

export function getMonsterPage(title, body) {
    return `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
                body {
                    font-family: Arial, Helvetica, sans-serif;
                    border-collapse: collapse;
                    width: 100%;
                }
                td, th {
                    font-family: Arial, Helvetica, sans-serif;
                    border: 1px solid #ddd;
                    padding: 8px;
                }

                tr:nth-child(even){background-color: #f2f2f2;}

                tr:hover {background-color: #ddd;}

                th {
                    padding-top: 12px;
                    padding-bottom: 12px;
                    text-align: left;
                    background-color: #04AA6D;
                    color: white;
                }
            </style>
        </head>
        <body>${body}</body>
    </html>`;
}
