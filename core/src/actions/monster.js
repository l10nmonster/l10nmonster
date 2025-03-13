import { consoleLog } from '@l10nmonster/core';

export class monster {
    static help = {
        description: 'test configuration and warm up caches',
        options: [
            [ '-l, --lang <language>', 'target languages to warm up' ],
        ]
    };

    static async action(mm, options) {
        // ascii art lifted from https://www.asciiart.eu/mythology/monsters
        // eslint-disable-next-line function-paren-newline
        console.log(
            '            _.------.                        .----.__\n' +
            '           /         \\_.       ._           /---.__  \\\n' +
            '          |  O    O   |\\\\___  //|          /       `\\ |\n' +
            '          |  .vvvvv.  | )   `(/ |         | o     o  \\|\n' +
            '          /  |     |  |/      \\ |  /|   ./| .vvvvv.  |\\\n' +
            "         /   `^^^^^'  / _   _  `|_ ||  / /| |     |  | \\\n" +
            "       ./  /|         | O)  O   ) \\|| //' | `^vvvv'  |/\\\\\n" +
            '      /   / |         \\        /  | | ~   \\          |  \\\\\n' +
            "      \\  /  |        / \\ Y   /'   | \\     |          |   ~\n" +
            "       `'   |  _     |  `._/' |   |  \\     7        /\n" +
            "         _.-'-' `-'-'|  |`-._/   /    \\ _ /    .    |\n" +
            "    __.-'            \\  \\   .   / \\_.  \\ -|_/\\/ `--.|_\n" +
            " --'                  \\  \\ |   /    |  |              `-\n" +
            '                       \\uU \\UU/     |  /   :F_P:');
        console.time('Initialization time');
        const resourceHandles = await mm.rm.getResourceHandles();
        const targetLangs = mm.getTargetLangs(options.lang);
        consoleLog`Resources: ${resourceHandles.length}`;
        consoleLog`Possible languages: ${targetLangs.join(', ')}`;
        consoleLog`Translation Memories:`;
        const availableLangPairs = (await mm.tmm.getAvailableLangPairs()).sort();
        for (const [sourceLang, targetLang] of availableLangPairs) {
            const tm = mm.tmm.getTM(sourceLang, targetLang);
            consoleLog`  - ${sourceLang} / ${targetLang}`;
            const tmStats = tm.getStats();
            for (const stats of tmStats) {
                consoleLog`      * ${stats.translationProvider}(${stats.status}): ${stats.jobCount.toLocaleString()} ${[stats.jobCount, 'job', 'jobs']}, ${stats.tuCount.toLocaleString()} ${[stats.tuCount, 'tu', 'tus']}, ${stats.distinctGuids.toLocaleString()} ${[stats.distinctGuids, 'guid', 'guids']}`;
            }
        }
        console.timeEnd('Initialization time');
        // eslint-disable-next-line no-unused-vars
        const printCapabilities = cap => Object.entries(cap).filter(([cmd, available]) => available).map(([cmd]) => cmd).join(' ');
        consoleLog`\nYour config allows the following commands: ${printCapabilities(mm.capabilities)}`;
        if (Object.keys(mm.capabilitiesByChannel).length > 1) {
            Object.entries(mm.capabilitiesByChannel).forEach(([channel, cap]) => consoleLog`  - ${channel}: ${printCapabilities(cap)}`);
        }
    }
}
