# L10n Monster

Do you want to set up continuous localization for your project but don't have a whole team to look after it? Do you know how `git` works? Have you set up a build like `webpack` before? You've come to the right place and you'll feel like at home!

L10n Monster is a tool to push source content out to translation and to pull translations back in. No more no less. It doesn't try to tell you how to consume content or delivery it to production. There are a bunch of those libraries already for every platform, and some of them are really good. It doesn't give you tools to perform translations yourself. There are plenty of agencies and professionals that do this for a living, you should use them!

## Getting started

### Installation

Get a binary for your platform and put it in your path. That's it.

### Configuration

At the root of your project there should be a file named `l10nmonster.js`. You can create it by hand, or you can use `l10nmonster init` and use one of the configurators to get up and running in no time.

## Operation

`l10nmonster push` will re-read all your source content, figure out what has changed, and send it to your translator.

`l10nmonster pull` will check if there are new translations available and fetch them.

`l10nmonster translate` will generate translated files based on the latest sources and translations.

`l10nmonster status` will give you an overview of the state of translation of your project.

## Advanced

### Monster files

L10n Monster maintains its working files in a hidden `.l10nmonster` directory where the `l10nmonster.js` file is located. Working files are source-control friendly (json files with newlines) and can be checked in, or they can be destroyed and recreated if a remote repository is configured.

### Pipelines

You can configure multiple pipelines that leverage different sources or translators based on your needs. For example, in the same repository you may have code and documentation to translate. Or you may have different translation processes based on the development cycle (e.g. machine translation early on, human translation before shipping).

### Grandfathering

`l10nmonster grandfather` will extract translations from the current translated files and import them assuming they're faithful translations of the current source. This is probably only used at the beginning, in order to establish a baseline. Afterwards, translated files are always recreated and overwritten.