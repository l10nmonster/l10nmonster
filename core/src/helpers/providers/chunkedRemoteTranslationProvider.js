import { L10nContext, providers, logVerbose, logInfo, utils, OpsManager } from '@l10nmonster/core';

const MAX_CHAR_LENGTH = 9900;
const MAX_CHUNK_SIZE = 125;

export class ChunkedRemoteTranslationProvider extends providers.BaseTranslationProvider {
    synchProvider = true;

    languageMapper;
    #opNames = {};

    /**
     * Initializes a new instance of the ChunkedRemoteTranslationProvider class.
     * @param {Object} options - The parameters for the constructor.
     * @param {string} [options.id] - Global identifier for the provider.
     * @param {Object} [options.supportedPairs] - Supported pairs for the provider.
     * @param {number} [options.costPerWord] - The estimated cost per word for the provider.
     * @param {number} [options.costPerMChar] - The estimated cost per million characters for the provider.
     * @param {number} options.quality - The quality to assign translations.
     * @param {number} [options.maxCharLength] - The maximum character length of a segment.
     * @param {number} [options.maxChunkSize] - The maximum number of segments in a chunk.
     * @param {function(string): string} [options.languageMapper] - A function to convert language codes for the provider.
     */
    constructor({ maxCharLength, maxChunkSize, languageMapper, ...options }) {
        if (options.quality === undefined) {
            throw new Error('You must specify quality for ChunkedRemoteTranslationProvider');
        }
        super(options);
        this.maxCharLength = maxCharLength ?? MAX_CHAR_LENGTH;
        this.maxChunkSize = maxChunkSize ?? MAX_CHUNK_SIZE;
        this.languageMapper = languageMapper;
        this.#opNames.synchTranslateChunk = `${this.id}.synchTranslateChunk`;
        this.#opNames.mergeTranslatedChunks = `${this.id}.mergeTranslatedChunks`;
        this.#opNames.asynchTranslateChunk = `${this.id}.asynchTranslateChunk`;
        this.#opNames.asynchWaitSubmissions = `${this.id}.asynchWaitSubmissions`;
        this.#opNames.asynchFetchChunk = `${this.id}.asynchFetchChunk`;
        OpsManager.registerOp(this.synchTranslateChunk.bind(this), { opName: this.#opNames.synchTranslateChunk, idempotent: false });
        OpsManager.registerOp(this.mergeTranslatedChunks.bind(this), { opName: this.#opNames.mergeTranslatedChunks, idempotent: true });
        OpsManager.registerOp(this.asynchTranslateChunk.bind(this), { opName: this.#opNames.asynchTranslateChunk, idempotent: false });
        OpsManager.registerOp(this.asynchWaitSubmissions.bind(this), { opName: this.#opNames.asynchWaitSubmissions, idempotent: true });
        OpsManager.registerOp(this.asynchFetchChunk.bind(this), { opName: this.#opNames.asynchFetchChunk, idempotent: true });
    }

    async start(job) {
        logVerbose`ChunkedRemoteTranslationProvider provider starting job ${job.jobGuid}`;
        const { tus, ...jobResponse } = await super.start(job);
        const sourceLang = this.languageMapper ? this.languageMapper(job.sourceLang) : job.sourceLang;
        const targetLang = this.languageMapper ? this.languageMapper(job.targetLang) : job.targetLang;
        const tuMeta = {};
        const payload = tus.map((tu, idx) => {
            const [source, phMap ] = utils.flattenNormalizedSourceToXmlV1(tu.nsrc);
            if (Object.keys(phMap).length > 0) {
                tuMeta[idx] = phMap;
            }
            const xmlTu = {};
            tu.notes?.desc && (xmlTu.notes = tu.notes.desc);
            xmlTu.source = source; // adding source second so that LLMs see notes first
            return xmlTu;
        });
        const requestTranslationsTask = OpsManager.createTask(this.id);
        const chunkOps = [];
        const chunkSizes = [];
        for (let currentIdx = 0; currentIdx < payload.length;) {
            const xmlTus = [];
            let currentTotalLength = 0;
            while (currentIdx < payload.length && xmlTus.length < this.maxChunkSize && payload[currentIdx].source.length + currentTotalLength < this.maxCharLength) {
                currentTotalLength += payload[currentIdx].source.length;
                xmlTus.push(payload[currentIdx]);
                currentIdx++;
            }
            if (xmlTus.length === 0) {
                throw new Error(`String at index ${currentIdx} exceeds ${this.maxCharLength} max char length`);
            }
            logInfo`Preparing chunked translation with ${xmlTus.length} ${[xmlTus.length, 'string', 'strings']}, total char length: ${currentTotalLength}`;
            chunkSizes.push(xmlTus.length);
            chunkOps.push(requestTranslationsTask.enqueue(this.synchProvider ? this.#opNames.synchTranslateChunk : this.#opNames.asynchTranslateChunk,
                { sourceLang, targetLang, xmlTus, jobGuid: job.jobGuid, instructions: job.instructions, chunk: chunkOps.length }));
        }
        const receivedTus = await requestTranslationsTask.execute(this.synchProvider ? this.#opNames.mergeTranslatedChunks : this.#opNames.asynchWaitSubmissions, {
            guids: tus.map(tu => tu.guid),
            tuMeta,
            quality: this.quality,
            ts: L10nContext.regression ? 1 : new Date().getTime(),
            chunkSizes,
        }, chunkOps);
        jobResponse.taskName = L10nContext.regression ? 'x' : requestTranslationsTask.taskName;
        if (this.synchProvider) {
            jobResponse.tus = receivedTus;
        } else {
            jobResponse.inflight = tus.map(tu => tu.guid);
            jobResponse.envelope = { chunkSizes, tuMeta };
            jobResponse.status = 'pending';
        }
        return jobResponse;
    }

    synchTranslateChunk(op) {
        throw new Error(`synchTranslateChunk not implemented in ${this.constructor.name}`);
    }

    async mergeTranslatedChunks(op) {
        const { guids, tuMeta, quality, ts, chunkSizes } = op.args;
        const convertedChuncks = op.inputs.map(input => this.convertTranslationResponse(input));
        convertedChuncks.forEach((convertedChunk, idx) => {
            if (convertedChunk.length !== chunkSizes[idx]) {
                throw new Error(`Expected chunk ${idx} to have ${chunkSizes[idx]} translations but got ${convertedChunk.length}`);
            }
        });
        const translations = convertedChuncks.flat(1);
        return guids.map((guid, idx) => {
            const { tgt, ...tu } = translations[idx] || {};
            tu.guid = guid
            tu.ts = ts;
            tu.q = quality;
            tu.ntgt = utils.extractNormalizedPartsFromXmlV1(tgt, tuMeta[idx] || {});
            return tu;
        });
    }

    convertTranslationResponse(chunk) {
        throw new Error(`convertTranslationResponse not implemented in ${this.constructor.name}`);
    }

    async continue(job) {
        logVerbose`ChunkedRemoteTranslationProvider provider updating job ${job.jobGuid}`;
        const { inflight, ...jobResponse } = await super.continue(job);
        try {
            const requestTranslationsTask = OpsManager.createTask();
            const chunkOps = [];
            job.envelope.chunkSizes.forEach(async (chunkSize, chunk) => {
                L10nContext.logger.info(`Enqueue chunk fetcher for job: ${job.jobGuid} chunk:${chunk} chunkSize:${chunkSize}`);
                chunkOps.push(requestTranslationsTask.enqueue(this.#opNames.asynchFetchChunk, {
                    jobGuid: job.jobGuid,
                    chunk,
                    chunkSize,
                }));
            });
            const receivedTus = await requestTranslationsTask.execute(this.#opNames.mergeTranslatedChunks, {
                guids: inflight,
                tuMeta: job.envelope.tuMeta,
                quality: this.quality,
                ts: L10nContext.regression ? 1 : new Date().getTime(),
                chunkSizes: job.envelope.chunkSizes,
            }, chunkOps);
            jobResponse.tus = receivedTus;
            jobResponse.taskName = L10nContext.regression ? 'x' : requestTranslationsTask.taskName;
            return jobResponse;
        // eslint-disable-next-line no-unused-vars
        } catch (error) {
            return job; // getting errors is expected, just leave the job pending
        }
    }

    asynchTranslateChunk(op) {
        throw new Error(`asynchTranslateChunk not implemented in ${this.constructor.name}`);
    }

    async asynchWaitSubmissions(op) {
        op.inputs.forEach((response, idx) => L10nContext.logger.verbose(`Chunk ${idx} enqueued: ${response}`));
    }

    asynchFetchChunk(op) {
        throw new Error(`asynchFetchChunk not implemented in ${this.constructor.name}`);
    }
}
