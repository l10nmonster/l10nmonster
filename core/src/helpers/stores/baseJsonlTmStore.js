import readline from 'node:readline/promises';
import { Readable } from 'node:stream';
import zlib from 'node:zlib';

import { logInfo, logVerbose } from '../../l10nContext.js';

const providerFilenameRegex = /blocks\/sl=(?<sourceLang>[^/]+)\/tl=(?<targetLang>[^/]+)\/tp=(?<translationProvider>[^/]+)\/block_(?<blockId>[0-9A-Za-z_-]+)\.jsonl/;
const languageFilenameRegex = /blocks\/sl=(?<sourceLang>[^/]+)\/tl=(?<targetLang>[^/]+)\/block_(?<blockId>[0-9A-Za-z_-]+)\.jsonl/;

/**
 * New TM Store using a single job file, streaming read/writes and JSONL format.
 *
 * @class BaseJsonlTmStore
 * @property {string} partitioning - Determines how TM Blocks are partitioned ('job', 'provider', or 'language')
 *
 */
export class BaseJsonlTmStore {
    id;
    access = 'readwrite';
    partitioning = 'job';
    #compressBlocks = false;
    #compressionSuffix = '';

    /**
     * Creates a BaseJsonlTmStore instance
     * @param {Object} delegate - Required file store delegate implementing file operations
     * @param {Object} options - Base store options
     * @param {string} options.id - The logical id of the instance
     * @param {string} options.access? - The store access permissions (readwrite/readonly/writeonly)
     * @param {string} options.partitioning? - Partitioning strategy for TM Blocks (job/provider/language)
     * @param {boolean} options.compressBlocks? - Use Gzip compression
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
                this.partitioning = partitioning;
            }
        }
        if (access) {
            if (['readwrite', 'readonly', 'writeonly'].indexOf(access) === -1) {
                throw new Error(`Unknown access type: ${access}`);
            } else {
                this.access = access;
            }
        }
        if (compressBlocks) {
            this.#compressBlocks = compressBlocks;
            this.#compressionSuffix = '.gz';
        }
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

    async #listAllTmBlocks(sourceLang, targetLang) {
        await this.delegate.ensureBaseDirExists();
        const files = await this.delegate.listAllFiles();
        return files.map(([ fileName ]) => {
            const jobFilenameParts = this.#getGroups(fileName);
            return jobFilenameParts && jobFilenameParts.sourceLang === sourceLang && jobFilenameParts.targetLang === targetLang && [ jobFilenameParts.blockId, fileName ];
        }).filter(Boolean);
    }

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

    async *getTmBlocks(sourceLang, targetLang, blockIds) {
        const toc = await this.getTOC(sourceLang, targetLang);
        for (const blockId of blockIds) {
            const blockName = toc.blocks[blockId]?.blockName;
            if (blockName) {
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
                }
                yield currentJob;
                rl.close();
            } else {
                logInfo`Block not found: ${blockId}`;
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

    async getWriter(sourceLang, targetLang, cb) {
        if (this.access === 'readonly') {
            throw new Error(`Cannot write to readonly TM Store: ${this.id}`);
        }
        const toc = await this.getTOC(sourceLang, targetLang);
        const tocChanges = [];
        await cb(async ({ translationProvider, blockId }, tmBlockIterator) => {
            const jobs = [];
            if (tmBlockIterator) {
                let tuCount = 0;
                const generator = async function *jsonlGenerator () {
                    for await (const job of tmBlockIterator) {
                        const { jobProps, tus } = job;
                        jobs.push([ jobProps.jobGuid, jobProps.updatedAt ]);
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
                            out.push(JSON.stringify(row));
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
                    logVerbose`Saved ${tuCount} ${[tuCount, 'TU', 'TUs']} in block ${blockId} of TM Store ${this.id}`;
                    tocChanges.push([ blockId, { blockName, modified, jobs } ]);
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
