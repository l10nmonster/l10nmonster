# Architecture

## Basic assumptions

The system is designed with modern translation principles in mind. Specifically:

* The translation process is composed of a pipeline of steps that starts from reading the source content and ends in writing corresponding translated resources.
* Source content is split into translation units, each with a guid that identifies them. Two translation units with the same guid would get the same identical translation.
* The guid is derived from the resource id, the logical string id, and the source text. This is the most strict guid generation logic and allows extreme contextual customization.
* Translations of the same source text can be reused in different string id's and/or resource id's but quality may suffer because sometimes context changes translations. Users can configure, based on their use cases, how much quality is degraded and whether reuse is acceptable or not.
* Translated resources are never source of record and can be re-generated / overwritten at any time.
* Translations are organized in translation jobs typically sent to translation vendors. Completed translation jobs are saved and constitute the source of record.
* Translation processes may yield different levels of quality (e.g. machine translation vs. single-pass human translation vs. human translation with review). Each translation unit carries a level of quality.
* Based on the collection of translation jobs and simple aggregation rules (e.g. latest highest quality translation wins) we can generate a translation memory that maps a guid into a string in the target language.
* The latest source content mapped through the latest translation memory yield the best available translated resources.
* Layered areas of concern and ownership. Localization gets very messy very fast because of a lack of standardization. For example, you may look at an "iOS strings" file but then you realize placeholders used are not `%@` or that it contains HTML. For this reason, there must be sufficient modularity and pluggability to support non-standard use cases (in the example, the message format parser should be decoupled from the file format serializer/deserializer).

## Design

The translation pipeline is composed of 4 successive modules:

1. Source Adapter: reads source content from its storage medium (e.g. file system or DB) into in-memory resources.
2. Format Filter: converts resources of a specific format into a series of translation units in a normalized format.
3. Translator: submits source content for translation and retrieves translated content when complete.
4. Target Adapter: takes translated resources and commits them in their storage medium (which may or may not be the same as the source).

In addition to configurable modular pipelines, the system also supports pluggable job stores to capture translations in durable storage.

### Source Adapter

* `async fetchResourceStats()` -> `[ { id, modified } ]` - list all source resources
* `async fetchResource(resourceId)` -> `string` - fetch the specific resource as a string

### Format Filter

* `async parseResource({ resource, isSource })` -> `{ translationUnits }` - convert a raw resource into a normalized list of translation units, each as `{ sid, str, notes, msgFmt, isSuffixPluralized }`
* `generateTranslatedResource({ resourceId, resource, lang, translator })` -> `string` - generate the translated version of a raw resource

### Translator

* `async requestTranslations(jobRequest)` -> `jobResponse` - submit a translation job to a provider
* `async fetchTranslations(jobManifest)` -> `jobResponse` - fetch in-flight translation units

### Target Adapter

* `async fetchTranslatedResource(lang, resourceId)` -> `string` - fetch the specific translated resource as a string
* `async commitTranslatedResource(lang, resourceId, translatedRes)` - write the specific translated resource

### TM Design

The collection of all translation jobs, yields internally to a translation memory that is the source of truth of all translations. Each entry in the TM has a structure as follows:

```json
"tu": {
    "bRBL1Isi3Xj28gXDOAgjrQfgd3j4u+evwXScOaysjwk=": {
        "guid": "7Yg93c458EbHxMIJHNXXG77jF5ZnrMzxv8ScSU0oCyQ",
        "rid": "dashlets/activity-list.get_en.properties",
        "sid": "title.generic",
        "src": "New Activity",
        "tgt": "Nuova attività",
        "q": 80,
        "ts": 12324543654,
        "jobId": 1
    }
```

The first hash used as the key in the `tu` object is based on the normalized source string, ignoring placeholder literals and only preserving positions (this is done so that, for example, iOS and Android strings can be shared if they have the same text even though they use different placeholder syntax).


## System Design

The goal is to support simple single-developer use cases in a simple way, while at the same time supporting enterprise scenarios with thousands of developers and a localization team managing translations. For this reason, the system is decomposed in 3 major sub-systems.

### L10n Monster
This is the core module and the only one that is strictly required as it could be run independently. Its main responsibility is to interface with the source of truth of translatable content and manage its transformation into a standardized format that can be translated. When translations are complete, it would also generate translated resources.

It is designed as a simple CLI tool called `l10n`, similar to GIT or NPM in principle and operation.

A project is considered onboarded with the tool if it has a configuration file called `l10nmonster.mjs` at the base of the project directory (this is similar in principle to NPM leveraging `package.json` to designate a module). The configuration file sets up a translation pipeline with the desired modules. While everything is decoupled to give flexibility, it can also be aggregated into easy-to-use configuration helpers. For example, common standardize "iOS" or "Android" projects could be configured with a simple config class that encapsulates moving parts and exposes what needs to be parametrized. These parameters could be exposed to a configurator (e.g. `l10n init`) that generates a config files based on user answers. That way users don't even need to know JS or know that's what's under the hood.

Once `l10n` is invoked, it will search for a `l10nmonster.mjs` file in the current directory or its ancestors. Once found it will create a `.l10nmonster` folder where it will store its metadata and caches. This folder can be safely deleted and placed in the `.gitignore` list (although keeping it would obviously speed up operations and could be used to help troubleshooting).

### L10n Manager
This is a desktop app intended to be used in an enterprise environment where there is a separate localization team in charge of managing translation requests. In this case, the l10n monster CLI would not send translation requests directly to a vendor but place them in a central storage for them to be reviewed, approved and sent. The benefit of this architecture is that the l10n manager only has to deal with standardized formats, as everything has already been adapted by the l10n monster.

### L10n Agent
This is a recurring automated batch job in charge of automatic operations. For example, automatically sending to translation approved or pre-approved requests (aka "continuous localization"), or generating reports, dashboards, and notifications for intended stakeholders.
