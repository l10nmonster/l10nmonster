import readline from 'node:readline/promises';
import { Readable } from 'node:stream';
import zlib from 'node:zlib';

import { logError, logVerbose, logWarn } from '../../l10nContext.js';

const providerFilenameRegex = /blocks\/sl=(?<sourceLang>[^/]+)\/tl=(?<targetLang>[^/]+)\/tp=(?<translationProvider>[^/]+)\/block_(?<blockId>[0-9A-Za-z_-]+)\.jsonl/;
const languageFilenameRegex = /blocks\/sl=(?<sourceLang>[^/]+)\/tl=(?<targetLang>[^/]+)\/block_(?<blockId>[0-9A-Za-z_-]+)\.jsonl/;

/**
 * @typedef {import('../../interfaces.js').TMStore} TMStore
 * @typedef {import('../../interfaces.js').TMStoreTOC} TMStoreTOC
 * @typedef {import('../../interfaces.js').JobPropsTusPair} JobPropsTusPair
 * @typedef {import('../../interfaces.js').FileStoreDelegate} _FileStoreDelegate
 */

/**
 * New TM Store using a single job file, streaming read/writes and JSONL format.
 *
 * @class BaseJsonlTmStore
 * @implements {TMStore}
 * @property {string} partitioning - Determines how TM Blocks are partitioned ('job', 'provider', or 'language')
 */
export class BaseJsonlTmStore {
    id;

    /** @type {'readwrite' | 'readonly' | 'writeonly'} */
    access = 'readwrite';

    /** @type {'job' | 'provider' | 'language'} */
    partitioning = 'job';
    #compressBlocks = false;
    #compressionSuffix = '';

    /** @type {_FileStoreDelegate} */
    delegate;

    /**
     * Creates a BaseJsonlTmStore instance
     * @param {_FileStoreDelegate} delegate - Required file store delegate implementing file operations
     * @param {Object} options - Base store options
     * @param {string} options.id - The logical id of the instance
     * @param {'readwrite' | 'readonly' | 'writeonly'} [options.access] - The store access permissions
     * @param {'job' | 'provider' | 'language'} [options.partitioning] - Partitioning strategy for TM Blocks
     * @param {boolean} [options.compressBlocks] - Use Gzip compression
     * @throws {Error} If no delegate is provided or invalid partitioning is specified
     */
    constructor(delegate, { id, partitioning, access, compressBlocks }) {
        if (!delegate || !id) {
            throw new Error(`A delegate and a id are required to instantiate a BaseJsonlTmStore`);
        }
        this.delegate = delegate;
        this.id = id;
        if (partitioning) {
            if (['job', 'provider', 'language'].indexOf(partitioning) === -1) {
                throw new Error(`Unknown partitioning type: ${partitioning}`);
            } else {
                this.partitioning = /** @type {'job' | 'provider' | 'language'} */ (partitioning);
            }
        }
        if (access) {
            if (['readwrite', 'readonly', 'writeonly'].indexOf(access) === -1) {
                throw new Error(`Unknown access type: ${access}`);
            } else {
                this.access = /** @type {'readwrite' | 'readonly' | 'writeonly'} */ (access);
            }
        }
        if (compressBlocks) {
            this.#compressBlocks = Boolean(compressBlocks);
            this.#compressionSuffix = '.gz';
        }
        logVerbose`${this.constructor.name} ${this.id} created with delegate: ${this.delegate.toString()} partitioning: ${this.partitioning} access: ${this.access} compressBlocks: ${this.#compressBlocks}`;
    }

    #getTmBlockName(blockProperties) {
        if (this.partitioning === 'language') {
            return `blocks/sl=${blockProperties.sourceLang}/tl=${blockProperties.targetLang}/block_${blockProperties.blockId}.jsonl${this.#compressionSuffix}`;
        }
        return `blocks/sl=${blockProperties.sourceLang}/tl=${blockProperties.targetLang}/tp=${blockProperties.translationProvider}/block_${blockProperties.blockId}.jsonl${this.#compressionSuffix}`;
    }

    #getGroups(fileName) {
        if (this.partitioning === 'language') {
            return fileName.match(languageFilenameRegex)?.groups;
        }
        return fileName.match(providerFilenameRegex)?.groups;
    }

    /**
     * @param {string} sourceLang
     * @param {string} targetLang
     * @returns {Promise<Array<[string, string]>>} Array of [blockId, fileName] tuples.
     */
    async #listAllTmBlocks(sourceLang, targetLang) {
        await this.delegate.ensureBaseDirExists();
        const files = await this.delegate.listAllFiles();
        return /** @type {Array<[string, string]>} */ (files.map(([ fileName ]) => {
            const jobFilenameParts = this.#getGroups(fileName);
            return jobFilenameParts && jobFilenameParts.sourceLang === sourceLang && jobFilenameParts.targetLang === targetLang && [ jobFilenameParts.blockId, fileName ];
        }).filter(Boolean));
    }

    /**
     * Gets available language pairs in the store.
     * @returns {Promise<Array<[string, string]>>} Array of [sourceLang, targetLang] tuples.
     */
    async getAvailableLangPairs() {
        const pairs = {};
        await this.delegate.ensureBaseDirExists();
        for (const [ fileName ] of await this.delegate.listAllFiles()) {
            const jobFilenameParts = this.#getGroups(fileName);
            if (jobFilenameParts) {
                pairs[`${jobFilenameParts.sourceLang}#${jobFilenameParts.targetLang}`] ??= [ jobFilenameParts.sourceLang, jobFilenameParts.targetLang ];
            }
        }
        return Object.values(pairs);
    }

    /**
     * Gets TM blocks by their IDs.
     * @param {string} sourceLang - Source language code.
     * @param {string} targetLang - Target language code.
     * @param {string[]} blockIds - Array of block IDs to retrieve.
     * @returns {AsyncGenerator<JobPropsTusPair>} AsyncGenerator yielding job objects with TUs.
     */
    async *getTmBlocks(sourceLang, targetLang, blockIds) {
        const toc = await this.getTOC(sourceLang, targetLang);
        for (const blockId of blockIds) {
            const blockName = toc.blocks[blockId]?.blockName;
            if (blockName) {
                // logVerbose`Getting block ${blockId} from ${blockName} in TM Store ${this.id}`;
                let reader = await this.delegate.getStream(blockName);
                if (this.#compressBlocks) {
                    reader = reader.pipe(zlib.createGunzip());
                }
                const rl = readline.createInterface({
                    input: reader,
                    crlfDelay: Infinity,
                    terminal: false,
                });

                let currentJob;
                for await (const line of rl) {
                    try {
                        const row = JSON.parse(line);
                        const { nsrc, ntgt, notes, tuProps, jobProps, ...otherProps } = row;
                        if (jobProps) {
                            const parsedJobProps = JSON.parse(jobProps);
                            if (currentJob?.jobProps?.jobGuid !== parsedJobProps.jobGuid) {
                                if (currentJob) {
                                    yield currentJob;
                                }
                                currentJob = { jobProps: { sourceLang, targetLang, ...parsedJobProps }, tus: [] }; // add sourceLang and targetLang as they were stripped
                            }
                        }
                        nsrc && (otherProps.nsrc = JSON.parse(nsrc));
                        ntgt && (otherProps.ntgt = JSON.parse(ntgt));
                        notes && (otherProps.notes = JSON.parse(notes));
                        const expandedTuProps = tuProps ? JSON.parse(tuProps) : {};
                        currentJob.tus.push({ ...otherProps, ...expandedTuProps, jobGuid: currentJob.jobProps.jobGuid });
                    } catch (e) {
                        logError`${this.constructor.name} ${this.id} error parsing block ${blockId}: ${e.message}\n"""\n${line}\n"""`;
                    }
                }
                yield currentJob;
                rl.close();
            } else {
                logWarn`Block not found: ${blockId}`;
            }
        }
    }

    // const TOC = {
    //         v: 1,
    //         sourceLang: 'en',
    //         targetLang: 'it',
    //         blocks: {
    //             'FvJK4zYuGNYlid2DykHfB': {
    //                 blockName: 'sl=en/tl=en-GB/tp=BritishTranslator/FvJK4zYuGNYlid2DykHfB.jsonl',
    //                 modified: 'TS1738542028426.8364',
    //                 jobs: [
    //                     [ 'FvJK4zYuGNYlid2DykHfB', '2025-02-03T00:20:20.276Z' ],
    //                 ]
    //             }
    //         }
    // }

    /**
     * Gets the table of contents for a language pair.
     * @param {string} sourceLang - Source language code.
     * @param {string} targetLang - Target language code.
     * @returns {Promise<TMStoreTOC>} TOC object with block metadata.
     */
    async getTOC(sourceLang, targetLang) {
        let toc;
        try {
            toc = JSON.parse(await this.delegate.getFile(`TOC-sl=${sourceLang}-tl=${targetLang}.json`));
        } catch (e) {
            logVerbose`No TOC found for pair ${sourceLang} - ${targetLang}: ${e.message}`;
            toc = { v: 1, sourceLang, targetLang, blocks: {} };
        }
        // ensure integrity of TOC by pruning blocks in TOC if file missing in storage or it has no jobs
        const storedBlocks = await this.#listAllTmBlocks(sourceLang, targetLang);
        const storedBlocksMap = new Map(storedBlocks);
        for (const blockId of Object.keys(toc.blocks)) {
            if (!storedBlocksMap.has(blockId) || toc.blocks[blockId].jobs.length === 0) {
                delete toc.blocks[blockId];
            }
        }
        return { ...toc, storedBlocks };
    }

    // this is private because not all stores can write the TOC
    async #writeTOC(sourceLang, targetLang, tocChanges) {
        const { storedBlocks, ...toc } = await this.getTOC(sourceLang, targetLang);
        // apply changes to TOC
        for (const [ blockId, block ] of tocChanges) {
            if (block) {
                toc.blocks[blockId] = block;
            } else {
                delete toc.blocks[blockId];
            }
        }
        // delete blocks in storage missing in TOC by comparing the TOC with the list of blocks in storage
        for (const [ blockId, blockName ] of storedBlocks) {
            if (!toc.blocks[blockId]) {
                await this.delegate.deleteFiles([ blockName ]);
            }
        }
        await this.delegate.saveFile(`TOC-sl=${sourceLang}-tl=${targetLang}.json`, JSON.stringify(toc, null, '\t'));
    }

    /**
     * Gets a writer for committing TM data.
     * @param {string} sourceLang - Source language code.
     * @param {string} targetLang - Target language code.
     * @param {Function} cb - Callback function for writing blocks.
     * @returns {Promise<void>}
     */
    async getWriter(sourceLang, targetLang, cb) {
        if (this.access === 'readonly') {
            throw new Error(`Cannot write to readonly TM Store: ${this.id}`);
        }
        const toc = await this.getTOC(sourceLang, targetLang);
        const tocChanges = [];
        await cb(async ({ translationProvider, blockId }, tmBlockIterator) => {
            const jobs = {}; // prevent duplicate jobs in the same block
            if (tmBlockIterator) {
                let tuCount = 0;
                const generator = async function *jsonlGenerator () {
                    for await (const job of tmBlockIterator) {
                        const { jobProps, tus } = job;
                        jobs[jobProps.jobGuid] = jobProps.updatedAt;
                        // eslint-disable-next-line no-unused-vars
                        const { sourceLang, targetLang, ...otherJobProps } = jobProps; // remove sourceLang and targetLang from jobProps as they are already in the path
                        const out = [];
                        tus.forEach((tu, idx) => {
                            const { guid, jobGuid, rid, sid, nsrc, ntgt, notes, q, ts, ...tuProps } = tu;
                            const row = { jobGuid, guid, rid, sid, q, ts };
                            nsrc && (row.nsrc = JSON.stringify(nsrc));
                            ntgt && (row.ntgt = JSON.stringify(ntgt));
                            notes && (row.notes = JSON.stringify(notes));
                            tuProps && (row.tuProps = JSON.stringify(tuProps));
                            idx === 0 && otherJobProps && (row.jobProps = JSON.stringify(otherJobProps));
                            // Node v24 readline treats \n, \r, \u2028, \u2029 as line breaks
                            const jsonlRow = JSON.stringify(row).replaceAll('\n', '\\n').replaceAll('\r', '\\r').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
                            out.push(jsonlRow);
                        });
                        if (out.length > 0) {
                            tuCount += out.length;
                            // eslint-disable-next-line prefer-template
                            yield out.join('\n') + '\n';
                        }
                    }
                };
                let readable = Readable.from(generator());
                if (this.#compressBlocks) {
                    readable = readable.pipe(zlib.createGzip());
                }
                const blockName = toc.blocks[blockId]?.blockName ?? this.#getTmBlockName({ sourceLang, targetLang, translationProvider, blockId });
                const modified = await this.delegate.saveStream(blockName, readable);
                if (tuCount > 0) {
                    logVerbose`Saved ${tuCount.toLocaleString()} ${[tuCount, 'TU', 'TUs']} in block ${blockId} of TM Store ${this.id} (${sourceLang} → ${targetLang})`;
                    tocChanges.push([ blockId, { blockName, modified, jobs: Object.entries(jobs) } ]);
                } else {
                    logVerbose`Deleting empty block ${blockId} from TM Store ${this.id}`;
                    await this.delegate.deleteFiles([ blockName ]);
                    tocChanges.push([ blockId, null ]);
                }
            } else {
                const blockName = toc.blocks[blockId]?.blockName;
                if (blockName) {
                    logVerbose`Deleting block ${blockId} from TM Store ${this.id}`;
                    await this.delegate.deleteFiles([ blockName ]);
                    tocChanges.push([ blockId, null ]);
                } else {
                    logVerbose`Couldn't delete block ${blockId} from TM Store ${this.id} because it was not found`;
                }
            }
        });
        await this.#writeTOC(sourceLang, targetLang, tocChanges);
    }
}
