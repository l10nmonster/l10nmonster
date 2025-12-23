import { consoleLog } from '../l10nContext.js';

/**
 * CLI action for listing available providers.
 * @type {import('../../index.js').L10nAction}
 */
export const ops_providers = {
    name: 'ops_providers',
    help: {
        description: 'list of available providers.',
    },

    async action(mm) {
        if (mm.dispatcher.providers.length === 0) {
            consoleLog`  ‣ No providers configured`;
        } else {
            for (const provider of mm.dispatcher.providers) {
                const info = await provider.info();
                consoleLog`  ‣ id:${info.id} type: ${info.type} q: ${info.quality ?? 'dynamic'} cost/word: ${info.costPerWord ?? 0} cost/MB: ${info.costPerMChar ?? 0}`;
                consoleLog`      • Supported pairs: ${JSON.stringify(info.supportedPairs ?? 'any')}`;
                info.description.forEach(line => consoleLog`      • ${line}`);
                consoleLog``;
            }
        }
    },
};
