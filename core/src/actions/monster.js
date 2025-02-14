import { consoleColor } from './shared.js';

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
        console.log(`Resources: ${resourceHandles.length}`);
        console.log(`Possible languages: ${targetLangs.join(', ')}`);
        console.log('Translation Memories:')
        const availableLangPairs = (await mm.tmm.getAvailableLangPairs()).sort();
        for (const [sourceLang, targetLang] of availableLangPairs) {
            const tm = mm.tmm.getTM(sourceLang, targetLang);
            console.log(`  - ${sourceLang} / ${targetLang} (${tm.guids.length} entries)`);
        }
        console.timeEnd('Initialization time');
        const printCapabilities = cap => `${Object.entries(cap).map(([cmd, available]) => `${available ? consoleColor.green : consoleColor.red}${cmd}`).join(' ')}${consoleColor.reset}`;
        console.log(`\nYour config allows the following commands: ${printCapabilities(mm.capabilities)}`);
        if (Object.keys(mm.capabilitiesByChannel).length > 1) {
            Object.entries(mm.capabilitiesByChannel).forEach(([channel, cap]) => console.log(`  - ${channel}: ${printCapabilities(cap)}`));
        }
    }
}
