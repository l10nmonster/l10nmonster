// import * as path from 'path';
// import {
//     existsSync,
//     mkdirSync,
// } from 'fs';
// import * as fs from 'fs/promises';

// export class JsonStateStore {
//     constructor({ org, stateFileName }) {
//         this.org = org;
//         this.stateFileName = path.join(sharedCtx().baseDir, stateFileName);
//         mkdirSync(path.dirname(this.stateFileName), {recursive: true});
//     }

//     async updateBuildState(build, release, targetLang, leverage) {
//         const state = existsSync(this.stateFileName) ?
//             JSON.parse(await fs.readFile(this.stateFileName, 'utf8')) :
//             {}
//         ;
//         const prjLeverage = leverage.prjLeverage || {};
//         for (const [ prj, leverage ] of Object.entries(prjLeverage)) {
//             state[this.org] ??= {};
//             state[this.org][prj] ??= {};
//             state[this.org][prj][build] ??= {};
//             state[this.org][prj][build][release] ??= {};
//             state[this.org][prj][build][release][targetLang] = leverage;
//         }
//         await fs.writeFile(this.stateFileName, JSON.stringify(state, null, '\t'), 'utf8');
//         // TODO: maybe optionally also generate an SVG to include in the README
//     }
// }
