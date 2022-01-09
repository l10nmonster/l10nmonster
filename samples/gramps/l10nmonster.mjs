export default class GrampsConfig {
    sourceLang = 'en';
    targetLangs = [ 'ja', 'it' ];
    constructor({ ctx, stores, adapters, filters, translators }) {
        this.minimumQuality = ctx.build === 'prod' ? 95 : 0; // only push production builds
        const dbConfig = {
            org: 'test1',
            prj: 'gramps',
            client: 'mysql2',
            host: ctx.env.l10nmonster_host,
            port: ctx.env.l10nmonster_port,
            user: ctx.env.l10nmonster_user,
            password: ctx.env.l10nmonster_password,
            database: ctx.env.l10nmonster_database,
            cert: '/etc/ssl/cert.pem',
        };
        this.jobStore = new stores.SqlJobStore(dbConfig);
        this.stateStore = new stores.SqlStateStore({
            ...dbConfig,
            saveContent: true,
        });
        this.source = new adapters.FsSource({
            // TODO: we could have a decorating function that given the resource id provides the custom target lang (e.g. based on a naming convention). Potentially even at the TU level
            globs: [
                'artifacts/*.pot',
            ]
        });
        // TODO: add hooks to allow to manipulate content before/after processing (see https://serge.io/docs/modular-architecture/)
        this.resourceFilter = new filters.PoFilter({
            // TODO: add configuration for baseline message format (e.g. HTML on top of the "flag" format)
        });
        this.translationProvider = new translators.PigLatinizer({
            quality: 2
        });
        this.target = new adapters.FsTarget({
            targetPath: (lang) => `artifacts/${lang}.po`,
        });
    }
}
