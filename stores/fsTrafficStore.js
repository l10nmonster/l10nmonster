import * as path from 'path';
import {
    existsSync,
    mkdirSync,
} from 'fs';
import * as fs from 'fs/promises';
import os from 'os';

export class FSTrafficStore {
    constructor(params) {
        this.trafficDir = path.join(this.ctx.baseDir, params?.trafficDir ?? 'debugTraffic');
        if (!existsSync(this.trafficDir)) {
            mkdirSync(this.trafficDir, {recursive: true});
        }
    }

    async logRequest(op, request) {
        return fs.writeFile(path.join(this.trafficDir, `${new Date().toISOString()}-${os.hostname()}-req-${op}.json`), JSON.stringify(request, null, '\t'), 'utf8');
    }

    async logResponse(status, response) {
        return fs.writeFile(path.join(this.trafficDir, `${new Date().toISOString()}-${os.hostname()}-res-${status}.json`), JSON.stringify(response, null, '\t'), 'utf8');
    }
}
