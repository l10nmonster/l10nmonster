import { pushCmd } from '../commands/push.js';
import { consoleColor, printRequest } from './shared.js';

export class push {
    static help = {
        description: 'push source content upstream (send to translation).',
        options: [
            [ '-l, --lang <language>', 'target language to push' ],
            [ '--filter <filter>', 'use the specified tu filter' ],
            [ '--driver <untranslated|source|tm|job:jobGuid>', 'driver of translations need to be pushed (default: untranslated)' ],
            [ '--leverage', 'eliminate internal repetitions from untranslated driver' ],
            [ '--refresh', 'refresh existing translations without requesting new ones' ],
            [ '--provider <name,...>', 'use the specified translation providers' ],
            [ '--instructions <instructions>', 'send the specified translation instructions' ],
            [ '--dryrun', 'simulate translating and compare with existing translations' ],
        ]
    };

    static async action(monsterManager, options) {
        const limitToLang = options.lang;
        const tuFilter = options.filter;
        const driverOption = options.driver ?? 'untranslated';
        const driver = {};
        if (driverOption.indexOf('job:') === 0) {
            driver.jobGuid = driverOption.split(':')[1];
        } else if ([ 'untranslated', 'source', 'tm' ].includes(driverOption)) {
            driver[driverOption] = true;
        } else {
            throw `invalid ${driverOption} driver`;
        }
        const refresh = options.refresh;
        const leverage = options.leverage;
        const dryRun = options.dryrun;
        const instructions = options.instructions;
        console.log(`Pushing content upstream...${dryRun ? ' (dry run)' : ''}`);
        try {
            if (dryRun) {
                const status = await pushCmd(monsterManager, { limitToLang, tuFilter, driver, refresh, leverage, dryRun, instructions });
                for (const langStatus of status) {
                    console.log(`\nDry run of ${langStatus.sourceLang} -> ${langStatus.targetLang} push:`);
                    printRequest(langStatus);
                }
            } else {
                const providerList = (options.provider ?? 'default').split(',');
                for (const provider of providerList) {
                    const translationProviderName = provider.toLowerCase() === 'default' ? undefined : provider;
                    const status = await pushCmd(monsterManager, { limitToLang, tuFilter, driver, refresh, translationProviderName, leverage, dryRun, instructions });
                    if (status.length > 0) {
                        for (const ls of status) {
                            if (ls.minimumJobSize === undefined) {
                                console.log(`job ${ls.jobGuid} with ${ls.num.toLocaleString()} translations received for language ${consoleColor.bright}${ls.targetLang}${consoleColor.reset} from provider ${consoleColor.bright}${ls.provider}${consoleColor.reset} -> status: ${consoleColor.bright}${ls.status}${consoleColor.reset}`);
                            } else {
                                console.log(`${ls.num.toLocaleString()} translations units for language ${ls.targetLang} not sent to provider ${consoleColor.bright}${ls.provider}${consoleColor.reset} because you need at least ${ls.minimumJobSize}`);
                            }
                        }
                    } else {
                        console.log('Nothing to push!');
                        break;
                    }
                }
            }
        } catch (e) {
            console.error(`Failed to push: ${e.stack || e}`);
        }
    }
}
