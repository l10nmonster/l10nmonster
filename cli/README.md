## Getting started

### Installation

```sh
git clone git@github.com:l10nmonster/l10nmonster.git
cd l10nmonster
npm i
npm link
```

Eventually there will be a binary for each platform, but this is still under heavy development.

## Basic Operation

```sh
l10n push
```
It will re-read all your source content, figure out what needs translation, and send it to your translator.

```sh
l10n status
```
It will give you an overview of the state of translation of your project.

```sh
l10n analyze
```
It will analyze your sources and report insights like repeated content in different files and keys.

```sh
l10n grandfather -q 80
```
TODO: update to Grandfather provider. For all missing translations, it will extract translations from the current translated files and, if present, import them at the specified quality level. This assume translations are faithful translations of the current source (i.e. they didn't become outdated if the source has changed). This is probably only used at the beginning, in order to establish a baseline. Afterwards, translated files are always recreated from the TM and overwritten.

```sh
l10n leverage -q 70 -u 60
```
TODO: update to Repetition provider. For all missing translations, it will look into the TM for translations of the exact same source text but in different resources, while matching or not the string id (called respectively qualified and unqualified repetition). Since reusing translations may lead to a loss of quality, you can choose what quality levels to assign to your specific content. Leveraging can be done on a regular basis before pushing content to translation, or never if it's not safe to do so.

```sh
l10n pull
```
If there are pending translations, it will check if they became available and it will fetch them.

```sh
l10n translate
```
It will generate translated files based on the latest sources and translations in the TM.

### Working files

L10n Monster maintains its working files in a hidden `.l10nmonster` directory at the root of the project. Working files are source-control friendly (json files with newlines) and can be checked in. On the other hand, they can also be destroyed and recreated on the fly if all you want to preserve is translations in your current files.

## Demo

![Demo screen](tty.gif)

## Basic Configuration

At the root of your project there should be a file named `l10nmonster.cjs`. You can create it by hand, or you can use `l10n init` and use one of the configurators to get up and running in no time. Well, that's the plan, it's not implemented yet!

The configuration must export a class that once instantiated provides the following properties:

* `sourceLang`: the default source language
* `minimumQuality`: this is the minimum required quality for a string to be considered translated (anything below  triggers a request to translate)
* `source`: a source adapter to read input resources from
* `resourceFilter`: a filter to process the specific resource format
* `translationProvider`: a connector to the translation vendor
* `target`: a target adapter to write translated resources to
* `adapters`, `filters`, `translators`: built-in helpers (see below)
* TODO: add the other properties that can be defined

## Advanced CLI

The CLI support additional options to control its behavior:

* `-a, --arg <string>`: this is a user-defined argument that allows to customize the user config behavior
* `-v, --verbose`: output additional debug information

Some commands also allow additional options. For more information type `l10n help <command>`.

## Advanced Configuration

There is also additional functionality in the configuration that can be useful, especially in environments with larger teams.

The the following properties can optionally be defined:

* `jobStore`: a durable persistence adapter to store translations
* `translationProvider`: this can also be a function that given a job request returns the desired vendor (e.g. `(job) => job.targetLang === 'piggy' ? piggyTranslator : xliffTranslator`)
* TODO: add the other properties that can be defined

### JSON Job Store

```js
this.jobStore = new stores.JsonJobStore({
    jobsDir: 'translationJobs',
});
```

The JSON job store is appropriate for small dev teams where all translations are managed by a single person and there little possibility of conflicts among members. Translation jobs are stored locally in JSON file in a specified folder.

* `jobsDir` is the directory containing translation jobs. It should be kept (e.g. checked into git) as it is needed to regenerate translated resources in a reliable way.
