import * as path from 'path';
import {
    readFile,
    writeFile,
} from 'node:fs/promises';
import { getBaseDir, logInfo } from '../../l10nContext.js';

/**
 * @typedef {import('../../interfaces.js').SegmentDecoratorFactory} SegmentDecoratorFactory
 * @typedef {import('../../interfaces.js').SegmentDecorator} SegmentDecorator
 * @typedef {import('../../interfaces.js').MonsterManager} MonsterManager
 */

/**
 * Generates sequence numbers for segments and persists them.
 * @implements {SegmentDecoratorFactory}
 */
export class SequenceGenerator {

    /** @type {string} */
    seqMapPath;

    /** @type {number} */
    seqThreshold;

    /** @type {Record<string, number>} */
    seqMap;

    /** @type {number} */
    maxSeq;

    /** @type {number} */
    minSeq;

    /**
     * Creates a new SequenceGenerator instance.
     * @param {string} seqMapFile - Path to the sequence map file.
     * @param {number} [seqThreshold=7] - Threshold for short string optimization.
     */
    constructor(seqMapFile, seqThreshold = 7) {
        if (!seqMapFile) {
            throw new Error('A seqMapFile is required');
        }
        this.seqMapPath = seqMapFile && path.join(getBaseDir(), seqMapFile);
        this.seqThreshold = seqThreshold;
    }

    /**
     * Initializes the sequence generator and loads existing sequence map.
     * @param {MonsterManager} mm - MonsterManager instance.
     * @returns {Promise<void>}
     */
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
            logInfo`SequenceGenerator: ${e} - creating new file`;
            this.seqMap = {};
            this.maxSeq = 32 * 32 - 1;
            this.minSeq = 32 * 32;
        }
        mm.scheduleForShutdown(this.save.bind(this));
    }

    /**
     * Gets the segment decorator function.
     * Produces at least a 2-char label and tries to assign shorter numbers to shorter strings.
     * @returns {SegmentDecorator} The decorator function.
     */
    getDecorator() {
        return function addSeqToSegment(seg) {
            let seq = this.seqMap[seg.guid];
            if (!seq) {
                const sl = (seg.nstr.map(e => (typeof e === 'string' ? e : (e.t === 'x' ? '1234567' : ''))).join('')).length;
                seq = sl <= this.seqThreshold && this.minSeq > 32 ? --this.minSeq : ++this.maxSeq;
                this.seqMap[seg.guid] = seq;
            }
            seg.seq = seq;
            return seg;
        }.bind(this);
    }

    /**
     * Saves the sequence map to disk.
     * @returns {Promise<void>}
     */
    async save() {
        return writeFile(this.seqMapPath, JSON.stringify(this.seqMap, null, '\t'), 'utf8');
    }
}
