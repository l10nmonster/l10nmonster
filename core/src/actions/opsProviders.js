import { consoleLog } from '../l10nContext.js';

export class ops_providers {
    static help = {
        description: 'list of available providers.',
    };

    static async action(mm) {
        if (mm.dispatcher.providers.length === 0) {
            consoleLog`  ‣ No providers configured`;
        } else {
            for (const provider of mm.dispatcher.providers) {
                const info = await provider.info();
                consoleLog`  ‣ id:${info.id} type: ${info.type} q: ${info.quality ?? 'dynamic' } cost/word: ${info.costPerWord ?? 0} cost/MB: ${info.costPerMChar ?? 0}`;
                consoleLog`      • Supported pairs: ${JSON.stringify(info.supportedPairs) ?? 'any'}`;
                info.description.forEach(line => consoleLog`      • ${line}`);
                consoleLog``;
            }
        }
    }
}
