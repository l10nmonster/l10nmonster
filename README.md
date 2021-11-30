# L10n Monster

Do you want to set up continuous localization for your project but don't have a whole team to look after it? Do you know how `git` works? Have you set up a build like `webpack` before? You've come to the right place and you'll feel like at home!

L10n Monster is a tool to push source content out to translation vendors and to pull translations back in. No more no less.
It doesn't try to tell you how to consume content or deliver it to production. It doesn't deal with formatting, pluralization, and other internationalization concerns. There are a plenty of libraries to do that already, and some of them are really good.
It also, doesn't expect you and your friends to translate content yourself. There are plenty of agencies and professionals that do this for a living, you should use them!

## Getting started

### Installation

```sh
npm install @l10nmonster/l10nmonster -g
```

Eventually there will be a binary for each platform, but it is not implemented yet.

### Configuration

At the root of your project there should be a file named `l10nmonster.js`. You can create it by hand, or you can use `l10n init` and use one of the configurators to get up and running in no time (this is not implemented yet).

### Working files

L10n Monster maintains its working files in a hidden `.l10nmonster` directory where the `l10nmonster.js` file is located. Working files are source-control friendly (json files with newlines) and can be checked in, or they can be destroyed and recreated.

## Operation

`l10n push` will re-read all your source content, figure out what has changed, and send it to your translator.

`l10n pull` will check if there are new translations available and fetch them.

`l10n translate` will generate translated files based on the latest sources and translations.

`l10n status` will give you an overview of the state of translation of your project.

`l10n grandfather` will extract translations from the current translated files and import them assuming they're faithful translations of the current source. This is probably only used at the beginning, in order to establish a baseline. Afterwards, translated files are always recreated and overwritten.

## Configuration

The `l10nmonster.js` configuration must export a default class that once instantiated provides the following properties:

* `jobStore`: a durable persistence adapter to store translations
* `sourceLang`: the default source language
* `targetLangs`: a array of languages to translate to 
* `source`: a source adapter to read input resources from
* `resourceFilter`: a format filter to process the specific resource format
* `translationProvider`: a connector to the translation vendor. This can either be an instance of a provider, or a function that given a job request returns the desired vendor (e.g. `(job) => job.targetLang === 'piggy' ? piggyTranslator : xliffTranslator`)
* `target`: a target adapter to write translated resources to

The constructor is invoked with an object with the following properties:
* `ctx`: the context object with the following properties:
    * `baseDir`: the directory where `l10nmonster.js` lives
    * `env`: environment variables from the shell
* `jobStores`, `adapters`, `filters`, `translators`: built-in helpers

### JSON Job Store

```js
new jobStores.JsonJobStore({
    jobsDir: 'translationJobs',
    logRequests: true,
})
```

The JSON job store is appropriate for small dev teams where all translations are managed by a single person and there little possibility of conflicts among members. Translation jobs are stored locally in JSON file in a specified folder.

* `jobsDir` is the directory containing translation jobs. It should be kept (e.g. checked into git) as it is needed to regenerate translated resources in a reliable way.
* `logRequests` can optionally be specified to store translation requests to vendor. This is mostly used for debugging.

### SQL Job Store

```js
new jobStores.SqlJobStore({
    org: 'xxx',
    prj: 'yyy',
    client: 'mysql2',
    host: ctx.env.l10nmonster_host,
    port: ctx.env.l10nmonster_port,
    user: ctx.env.l10nmonster_user,
    password: ctx.env.l10nmonster_password,
    database: ctx.env.l10nmonster_database,
    cert: '/etc/ssl/cert.pem',
})
```

The SQL job store is the preferred method for larger use cases where translations can submitted concurrently by multiple teams and leveraged in multiple branches and multiple CI jobs.
The same DB can be shared across multiple organization (using the `org` property) and multiple projects (`prj` property). Currently, only MySQL is supported. It is recommended that connection credentials are not hard-coded and environment variables are used instead.

### FS Source Adapter

```js
new adapters.FsSource({
    globs: [ '**/values/strings.xml' ],
})
```

An adapter that reads sources from the filesystem. The `globs` array can specify wildcard patterns relative to the base directory where the `l10nmonster.js` is placed.

### FS Target Adapter

```js
new adapters.FsTarget({
    targetPath: (lang, resourceId) => resourceId.replace('values', `values-${lang}`),
})
```

An adapter that writes translated resources to the filesystem. It takes in the object constructor a `targetPath` function that given a language and the resource id of the source, it produces the target resource id.


### Android Filter

```js
new filters.AndroidFilter({
    comment: 'pre',
})
```

A filter for XML files used in Android apps. The `comment` property specifies whether developer notes are placed before, after, or on the same line (`pre`, `post`, `right` respectively).

* [TODO] it needs configuration to deal with message formats.
* [BUG] it doesn't honor the `translatable` attribute.

### PO Filter

```js
new filters.PoFilter()
```

A filter for PO files.

* [TODO] it needs configuration to deal with message formats.

### Pig Latinizer Translator

```js
new translators.PigLatinizer({
    quality: 1
});
```

This is a pseudo-localization helper that converts source into [Pig Latin](https://en.wikipedia.org/wiki/Pig_Latin) to provide visual testing of hard-coded strings, concatenation, and text expansion. By default, quality is set to `1` but it can be overwritten in the constructor by passing the `quality` property.

### XLIFF Translator

```js
new translators.XliffBridge({
    requestPath: (lang, prjId) => `xliff/outbox/prj${prjId)}-${lang}.xml`,
    completePath: (lang, prjId) => `xliff/inbox/prj${(prjId)}-${lang}.xml`,
    quality: 80,
})
```

XLIFF is the industry standard for translation exchange. The adapter writes translation requests as XLIFF files that can be manually given to a translation vendor. Once translations are received, the corresponding translated files can be imported and saved.
There are no standard naming conventions for xliff files, so any can be implemented by providing 2 functions in the `requestPath` and `completePath` properties. The functions are given the target language and the project id as parameters from which to form a naming convention. By default, quality is set to `50` but it should be specified by passing the `quality` property.

### GUID Customization

The system by default supports potentially a different translation for the same source text in different context (identified by a resource id + a string id). This allows for perfect translation for those cases that require changing translation based on the usage of the string. However it also makes translations more expensive and potentially more inconsistent.
When you are absolutely sure about reuse rules, you can implement them by providing a function in the `guidGenerator` property of your configuration. For example, setting that property to the function `(rid, sid, str) => str` would effectively ignore context and allow to only provide one translation per source string.
The logic can be arbitrarily complicated but beware that translations are tied to guids, so changing guids of existing translations would make them unavailable and require them to be migrated.