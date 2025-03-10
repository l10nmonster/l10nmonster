import readline from 'node:readline/promises';

import { L10nContext } from '@l10nmonster/core';

const providerFilenameRegex = /blocks\/sl=(?<sourceLang>[^/]+)\/tl=(?<targetLang>[^/]+)\/tp=(?<translationProvider>[^/]+)\/block_(?<blockId>[0-9A-Za-z_-]+)\.jsonl$/;
const languageFilenameRegex = /blocks\/sl=(?<sourceLang>[^/]+)\/tl=(?<targetLang>[^/]+)\/block_(?<blockId>[0-9A-Za-z_-]+)\.jsonl$/;

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

    /**
     * Creates a BaseJsonlTmStore instance
     * @param {Object} delegate - Required file store delegate implementing file operations
     * @param {Object} options - Required file store delegate implementing file operations
     * @param {string} options.id - The logical id of the instance
     * @param {string} options.access? - The store access permissions (readwrite/readonly/writeonly)
     * @param {string} options.partitioning? - Partitioning strategy for TM Blocks
     * @throws {Error} If no delegate is provided or invalid partitioning is specified
     */
    constructor(delegate, { id, partitioning, access }) {
        if (!delegate || !id) {
            throw new Error('A delegate and a id are required to instantiate a LegacyFileBasedTmStore');
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
    }

    #getTmBlockName(blockProperties) {
        if (this.partitioning === 'language') {
            return `blocks/sl=${blockProperties.sourceLang}/tl=${blockProperties.targetLang}/block_${blockProperties.blockId}.jsonl`;
        }
        return `blocks/sl=${blockProperties.sourceLang}/tl=${blockProperties.targetLang}/tp=${blockProperties.translationProvider}/block_${blockProperties.blockId}.jsonl`;
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
                const reader = await this.delegate.getStream(blockName);
                const rl = readline.createInterface({
                    input: reader,
                    crlfDelay: Infinity,
                    terminal: false,
                });
                for await (const line of rl) {
                    const row = JSON.parse(line);
                    const { nsrc, ntgt, notes, tuProps, jobProps, ...otherProps } = row;
                    nsrc && (otherProps.nsrc = JSON.parse(nsrc));
                    ntgt && (otherProps.ntgt = JSON.parse(ntgt));
                    notes && (otherProps.notes = JSON.parse(notes));
                    jobProps && (otherProps.jobProps = JSON.parse(jobProps));
                    const expandedTuProps = tuProps ? JSON.parse(tuProps) : {};
                    yield { ...otherProps, ...expandedTuProps };
                }
            } else {
                L10nContext.logger.info(`Block not found: ${blockId}`);
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
            L10nContext.logger.verbose(`No TOC found for pair ${sourceLang} - ${targetLang}: ${e.message}`);
            toc = { v: 1, sourceLang, targetLang, blocks: {} };
        }
        // ensure integrity: prune blocks in TOC  missing in storage and delete extra blocks in storage missing in TOC
        const storedBlocks = await this.#listAllTmBlocks(sourceLang, targetLang);
        const storedBlocksMap = new Map(storedBlocks);
        for (const [ blockId, blockName ] of storedBlocks) {
            if (!toc.blocks[blockId]) {
                await this.delegate.deleteFiles([ blockName ]);
            }
        }
        for (const blockId of Object.keys(toc.blocks)) {
            if (!storedBlocksMap.has(blockId)) {
                delete toc.blocks[blockId];
            }
        }
        return toc;
    }

    async getWriter(sourceLang, targetLang, cb) {
        if (this.access === 'readonly') {
            throw new Error(`Cannot write to readonly TM Store: ${this.id}`);
        }
        const toc = await this.getTOC(sourceLang, targetLang);
        await cb(async ({ translationProvider, blockId }, tmBlockIterator) => {
            const jobs = [];
            let lastJobGuid;
            if (tmBlockIterator) {
                const generator = async function *jsonlGenerator () {
                    for await (const chunk of tmBlockIterator) {
                        const out = [];
                        for (const tu of chunk) {
                            const { guid, jobGuid, rid, sid, nsrc, ntgt, notes, q, ts, jobProps, ...tuProps } = tu;
                            if (jobProps?.jobGuid && jobProps.jobGuid !== lastJobGuid) {
                                jobs.push([ jobProps.jobGuid, jobProps.updatedAt ]);
                                lastJobGuid = jobProps.jobGuid;
                            }
                            const row = { guid, jobGuid, rid, sid, q, ts };
                            nsrc && (row.nsrc = JSON.stringify(nsrc));
                            ntgt && (row.ntgt = JSON.stringify(ntgt));
                            notes && (row.notes = JSON.stringify(notes));
                            tuProps && (row.tuProps = JSON.stringify(tuProps));
                            jobProps && (row.jobProps = JSON.stringify(jobProps));
                            out.push(JSON.stringify(row));
                        }
                        // eslint-disable-next-line prefer-template
                        yield out.join('\n') + '\n';
                    }
                };
                const blockName = this.#getTmBlockName({ sourceLang, targetLang, translationProvider, blockId });
                const modified = await this.delegate.saveStream(blockName, generator);
                toc.blocks[blockId] = { blockName, modified, jobs };
            } else {
                const blockName = toc.blocks[blockId]?.blockName;
                blockName && await this.delegate.deleteFiles([ blockName ]);
            }
        });
        await this.delegate.saveFile(`TOC-sl=${sourceLang}-tl=${targetLang}.json`, JSON.stringify(toc, null, '\t'));
    }
}
