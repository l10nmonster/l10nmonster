import * as path from 'path';
import {
    readFile,
    writeFile,
} from 'node:fs/promises';
import { L10nContext } from '@l10nmonster/core';

export class SequenceGenerator {
    constructor(seqMapFile, seqThreshold = 7) {
        if (!seqMapFile) {
            throw 'A seqMapFile is required';
        }
        this.seqMapPath = seqMapFile && path.join(L10nContext.baseDir, seqMapFile);
        this.seqThreshold = seqThreshold;
    }

    async init(mm) {
        try {
            this.seqMap = JSON.parse(await readFile(this.seqMapPath, 'utf8'));
            let max = 0,
                min = Number.MAX_SAFE_INTEGER;
            Object.values(this.seqMap).forEach(s => {
                s > max && (max = s);
                s < min && (min = s);
            });
            this.maxSeq = max;
            this.minSeq = min;
        } catch (e) {
            L10nContext.logger.info(`SequenceGenerator: ${e} - creating new file`);
            this.seqMap = {};
            this.maxSeq = 32 * 32 - 1;
            this.minSeq = 32 * 32;
        }
        mm.scheduleForShutdown(this.save.bind(this));
    }

    // produce at least a 2-char label and try to assign shorter numbers to shorter strings
    getDecorator() {
        return function addSeqToSegment(seg) {
            let seq = this.seqMap[seg.guid];
            if (!seq) {
                // eslint-disable-next-line no-nested-ternary
                const sl = (seg.nstr.map(e => (typeof e === 'string' ? e : (e.t === 'x' ? '1234567' : ''))).join('')).length;
                seq = sl <= this.seqThreshold && this.minSeq > 32 ? --this.minSeq : ++this.maxSeq;
                this.seqMap[seg.guid] = seq;
            }
            seg.seq = seq;
            return seg;
        }.bind(this);
    }

    async save() {
        return writeFile(this.seqMapPath, JSON.stringify(this.seqMap, null, '\t'), 'utf8');
    }
}
