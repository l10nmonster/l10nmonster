import * as path from 'path';
import {
    existsSync,
} from 'fs';
import * as fs from 'fs/promises';
import createxliff12 from 'xliff/createxliff12';
import xliff12ToJs from 'xliff/xliff12ToJs';

export class XliffBridge {
    constructor({ requestPath, completePath, quality }) {
        if ((requestPath && completePath && quality) === undefined) {
            throw 'You must specify requestPath, completePath, quality for XliffBridge';
        } else {
            this.requestPath = requestPath;
            this.completePath = completePath;
            this.quality = quality;
        }
    }

    async requestTranslations(jobRequest) {
        // eslint-disable-next-line no-unused-vars
        const { tus, ...jobManifest } = jobRequest;
        const notes = {};
        jobRequest.tus.forEach(tu => {
            if (tu.notes) {
                notes[tu.guid] = tu.notes;
            }
        });
        // console.dir(notes);
        const xliff = await createxliff12(
            jobRequest.sourceLang,
            jobRequest.targetLang,
            Object.fromEntries(jobRequest.tus.map(tu => [ tu.guid, tu.src ])), // TODO: need to deal with nsrc
            null,
            'XliffBridge',
            null,
            notes,
        );
        if (xliff) {
            const prjPath = path.join(this.ctx.baseDir, this.requestPath(jobRequest.targetLang, jobRequest.jobGuid));
            await fs.mkdir(path.dirname(prjPath), {recursive: true});
            await fs.writeFile(prjPath, xliff, 'utf8');
            jobManifest.inflight = Object.values(jobRequest.tus).map(tu => tu.guid);
            jobManifest.status = 'pending';
        } else {
            jobManifest.status = 'error';
        }
        return jobManifest;
    }

    async fetchTranslations(jobManifest) {
        const completePath = path.join(this.ctx.baseDir, this.completePath(jobManifest.targetLang, jobManifest.jobGuid));
        if (existsSync(completePath)) {
            const translatedRes = await fs.readFile(completePath, 'utf8');
            const translations = await xliff12ToJs(translatedRes);
            // console.dir(translations);
            const tus = [];
            for (const [guid, xt] of Object.entries(translations.resources.XliffBridge)) {
                if (xt?.target?.length > 0) {
                    tus.push({
                        guid: guid,
                        tgt: xt.target, // TODO: need to deal with ntgt
                        q: this.quality,
                    });
                } else {
                    // console.dir(xt);
                }
            }
            if (jobManifest.inflight.length === tus.length) {
                jobManifest.status = 'done';
            }
            if (tus.length > 0) {
                jobManifest.ts = 1; // TODO: get it from the XLIFF, possibly from <file date="2002-01-25T21:06:00Z">
                jobManifest.tus = tus;
                return jobManifest;
            }
        }
        return null;
    }
}
