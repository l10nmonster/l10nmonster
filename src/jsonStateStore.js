import * as path from 'path';
import {
    existsSync,
    mkdirSync,
} from 'fs';
import * as fs from 'fs/promises';

export class JsonStateStore {
    constructor({ org, prj, stateFileName }) {
        this.org = org;
        this.prj = prj;
        this.stateFileName = path.join(this.ctx.baseDir, stateFileName);
        mkdirSync(path.dirname(this.stateFileName), {recursive: true});
    }

    async updateBuildState(build, release, targetLang, job) {
        const { tus, ...jobState } = job;
        const state = existsSync(this.stateFileName) ?
            JSON.parse(await fs.readFile(this.stateFileName, 'utf8')) :
            {}
        ;
        state[this.org] = state[this.org] || {};
        state[this.org][this.prj] = state[this.org][this.prj] || {};
        state[this.org][this.prj][build] = state[this.org][this.prj][build] || {};
        state[this.org][this.prj][build][release] = state[this.org][this.prj][build][release] || {};
        state[this.org][this.prj][build][release][targetLang] = jobState;

        await fs.writeFile(this.stateFileName, JSON.stringify(state, null, '\t'), 'utf8');
        // TODO: maybe optionally also generate an SVG to include in the README
    }
}
