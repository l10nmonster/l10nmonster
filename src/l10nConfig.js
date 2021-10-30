// this is not yet useful but it lays the foundation to be able to add more
// base functionality later on without adding too much complexity and verbosity

export class L10nConfig {
    debug = {};
    sourceLang = 'en';
    targetLangs = [];
    pipelines = {};

    constructor(ctx) {
        this.ctx = ctx;
    }
}
