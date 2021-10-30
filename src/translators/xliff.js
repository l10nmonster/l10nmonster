import * as path from 'path';
import {
    existsSync,
} from 'fs';
import * as fs from 'fs/promises';
import createxliff12 from 'xliff/createxliff12';
import xliff12ToJs from 'xliff/xliff12ToJs';

export class XliffBridge {
    constructor({ baseDir, requestPath, completePath, quality }) {
        this.baseDir = baseDir;
        this.requestPath = requestPath;
        this.completePath = completePath;
        this.quality = quality;
    }

    async requestTranslations(job) {
        const notes = {};
        job.tus.forEach(tu => {
            if (tu.notes) {
                notes[tu.guid] = tu.notes;
            }
        });
        // console.dir(notes);
        const xliff = await createxliff12(
            job.sourceLang,
            job.targetLang,
            Object.fromEntries(job.tus.map(tu => [ tu.guid, tu.str ])),
            null,
            'XliffBridge',
            null,
            notes,
        );
        if (xliff) {
            const prjPath = path.join(this.baseDir, this.requestPath(job.targetLang, job.jobId));
            await fs.writeFile(prjPath, xliff, 'utf8');
            job.inflight = Object.values(job.tus).map(tu => tu.guid);
            job.status = 'pending';
        } else {
            job.status = 'error';
        }
        delete job.tus;
        return job;
    }

    async fetchTranslations(jobManifest) {
        const completePath = path.join(this.baseDir, this.completePath(jobManifest.targetLang, jobManifest.jobId));
        if (existsSync(completePath)) {
            const translatedRes = await fs.readFile(completePath, 'utf8');
            const translations = await xliff12ToJs(translatedRes);
            // console.dir(translations);
            const tus = [];
            for (const [guid, xt] of Object.entries(translations.resources.XliffBridge)) {
                if (xt?.target?.length > 0) {
                    tus.push({
                        guid: guid,
                        str: xt.target,
                        q: this.quality || '075-unknown-human',
                    });
                } else {
                    // console.dir(xt);
                }
            }
            if (jobManifest.inflightNum === tus.length) {
                jobManifest.status = 'done';
            }
            if (tus.length > 0) {
                jobManifest.tus = tus;
                return jobManifest;
            }
        }
        return null;
    }
}
