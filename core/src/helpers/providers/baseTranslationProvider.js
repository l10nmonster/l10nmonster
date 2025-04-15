export class BaseTranslationProvider {
    supportedPairs;
    quality;
    statusProperties = {
        'created': {
            actions: [ 'start' ],
            description: 'Job ready to be started',
        },
        'pending': {
            actions: [ 'continue' ],
            description: 'Job pending completion',
        },
        'done': {
            actions: [],
            description: 'Job completed',
        },
        'cancelled': {
            actions: [],
            description: 'Job cancelled',
        },
    };
    mm;

    #id;
    #costPerWord;
    #costPerMChar;

    /**
     * Initializes a new instance of the BaseTranslationProvider class.
     * @param {Object} [options] - The parameters for the constructor.
     * @param {string} [options.id] - Global identifier for the provider.
     * @param {number} [options.quality] - The quality of translations provided by the provider.
     * @param {Object} [options.supportedPairs] - Supported pairs for the provider.
     * @param {number} [options.costPerWord] - The estimated cost per word for the provider.
     * @param {number} [options.costPerMChar] - The estimated cost per million characters for the provider.
     */
    constructor({ id, quality, supportedPairs, costPerWord, costPerMChar } = {}) {
        this.#id = id;
        this.quality = quality;
        this.supportedPairs = supportedPairs;
        this.#costPerWord = costPerWord ?? 0;
        this.#costPerMChar = costPerMChar ?? 0;
    }

    get id() {
        return this.#id ?? this.constructor.name;
    }

    async create(job) {
        if (job.status) {
            throw new Error(`Cannot create job as it's already in "${job.status}" state`);
        }
        // by default take any job in the supported pairs and mark it as free
        let acceptedTus = [];
        if (!this.supportedPairs || this.supportedPairs[job.sourceLang]?.includes(job.targetLang)) {
            acceptedTus = this.quality ? job.tus.filter(tu => tu.q <= this.quality) : job.tus;
        }
        const estimatedCost = acceptedTus.reduce((total, tu) => total + (tu.words ?? 0) * this.#costPerWord + ((tu.chars ?? 0) / 1000000) * this.#costPerMChar, 0);
        return { ...job, status: acceptedTus.length > 0 ? 'created' : 'cancelled', tus: acceptedTus, estimatedCost };
    }

    // by default providers are synchronous and they are done once they are started
    async start(job) {
        const statusProperties = this.statusProperties[job.status];
        if (!statusProperties || !statusProperties.actions.includes('start')) {
            throw new Error(`Cannot start jobs that are in the "${job.status}" state`);
        }
        return { ...job, status: 'done' }; // return a shallow copy to be used as a response
    }

    // some providers are asynchronous and require a continuation -- just enforce status transitions in the super
    async continue(job) {
        const statusProperties = this.statusProperties[job.status];
        if (!statusProperties || !statusProperties.actions.includes('continue')) {
            throw new Error(`Cannot continue jobs that are in the "${job.status}" state`);
        }
        return job;
    }

    describe(job) {
        const statusProperties = this.statusProperties[job.status];
        if (!statusProperties) {
            throw new Error(`Cannot describe job ${job.jobGuid} in unsupported "${job.status}" state`);
        }
        return statusProperties;
    }

    async info() {
        return {
            id: this.id,
            type: this.constructor.name,
            quality: this.quality,
            supportedPairs: this.supportedPairs,
            costPerWord: this.#costPerWord,
            costPerMChar: this.#costPerMChar,
            description: [],
        };
    }

    async init(mm) {
        this.mm = mm;
    }
}
