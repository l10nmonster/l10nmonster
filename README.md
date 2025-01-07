# L10n Monster

Do you want to set up continuous localization for your project but don't have a whole team to look after it? Do you know how `git` works? Have you set up a build like `esbuild` before? You've come to the right place and you'll feel right at home!

L10n Monster is the first headless and server-less TMS in the industry! It's born in a world of continuous integration and deployment. It is a solution to manage translation vendors, not translators. It pushes source content out to translation vendors and pulls translations back in. No more no less. It doesn't try to tell you how to consume content or deliver it to production. It doesn't deal with formatting and other internationalization concerns. There are plenty of i18n libraries to deal with that.

# Philosophy

Localization is messy. Full of exceptions and bending backwards. As much as we want to provide an easy-to-use out-of-the-box solution by offering an opinionated implementation with reasonable defaults, the main goal should be to make solving of edge cases and advanced scenarios possible. To do this we try to componentize every aspect of localization with utilities, helpers, abstractions and then put them together into a simplified toolchain (e.g. the command-line interface). When more advanced tools are needed, just write your own with (hopefully) simple Node.js scripts built on top of the framework.

While L10n Monster is written in JS and it's more naturally extended and scripted in JS, it's built to process a variety of file formats and infrastructure scenarios that span from a single-app indie developer to enterprises with hundreds of services and million of strings to translate.

# Components

To help manage dependencies and allow the variety of integrations required by the localization industry, there are a lot of packages to choose from and it's very easy to create your own extensions.

1. `@l10nmonster/core`: the foundational classes where most of the functionality lives.
2. `@l10nmonster/cli`: a thin wrapper to invoke functions from the shell. Suitable for batch jobs.
3. `@l10nmonster/vscode-l10nmanager`: a VS Code extension to provide a more intuitive UI than the CLI.
4. `@l10nmonster/helpers-*`: optional configuration components with additional dependencies to deal with different formats and platforms.

See the overall [System Design (OUTDATED)](architecture.md#system-design) to get a better idea. Also, a deep dive of the various [pipelines](pipelines.md).

## Channels

A channel represents a logical connection from where source content comes from and translations need to go to. It is configured and implemented respectively with source and target adapters.

### Source Adapters

Sources are *adapters* used to interface with a source of content. They only deal with transport concerns and not format. They return a raw string with the content of resources and metadata associated to them. Extracted resource can declare their *format* sot that they can be parsed correctly.

<details>
<summary>List of provided sources:</summary>

|Module|Export|Description|
|---|---|---|
|`helpers`|`adapters.FsSource`|Read from file-system-like sources.
|`helpers`|`adapters.HttpSource`|Read from url sources.

</details>

### Target Adapters

Targets are *adapters* used to interface with a content store. They may or may not go hand-in-hand with their source counterpart. Typically you want to read and write into the same store and structure, but you could also read from one structure and write into a different one in more sophisticated setups. They take a raw string with the content of translated resources in the correct format already and commit it to storage.

<details>
<summary>List of provided targets:</summary>

|Module|Export|Description|
|---|---|---|
|`helpers`|`adapters.FsTarget`|Write to file-system-like sources.

</details>

## Formats

To deal with the multitude of variations of how content is captured, encoding and decoding of translatable resources is split into 2 parts:
1. Parsing resource files into array of messages and back is handled by `Resource Filters`.
2. Parsing message strings including their placeholders and escaping rules into a normalized message format and back is handled by `Normalizers`. Normalizers can be composed from `decoders` and `encoders`.

### Resource Filters

Filters are used to convert raw strings returned by sources into segments that are suitable for translation (ideally not too small that they can't be translated, and not too long that prevent translation reuse). They can be configured in content types as a single `resourceFilter` property.

<details>
<summary>List of provided filters:</summary>

|Module|Export|Description|
|---|---|---|
|`helpers`|`filters.SnapFilter`|Filter for normalized resources in snap store.
|`helpers-android`|`Filter`|Filter for Android xml files.|
|`helpers-html`|`Filter`|Filter for HTML files.|
|`helpers-ios`|`StringsFilter`|Filter for .strings files.|
|`helpers-java`|`PropertiesFilter`|Filter for Java properties files.|
|`helpers-json`|`i18next.Filter`|Filter for ARB-like JSON files used by [i18next v4](https://www.i18next.com/misc/json-format).|
|`helpers-po`|`Filter`|Filter for PO files.|

</details>

### Decoders

Decoders are used to convert strings with specific formats into either pure strings or placeholders. They can be configured in content types as a chain of decoders via the `decoders` property.

<details>
<summary>List of provided decoders:</summary>

|Module|Export|Description|
|---|---|---|
|`helpers`|`normalizers.namedDecoder`|Generic wrapper to rename a decoder.|
|`helpers`|`normalizers.doublePercentDecoder`|Decoder for `%%` escaping.|
|`helpers`|`normalizers.bracePHDecoder`|Decoder for `{param}` style placeholders.|
|`helpers`|`normalizers.keywordTranslatorMaker`|Decoder/encoder pair to protect/replace keywords.|
|`helpers`|`regex.decoderMaker(flag, regex, partDecoder)`|Internal utility to create decoders.|
|`helpers`|`xml.entityDecoder`|Decoder for XML entities.|
|`helpers`|`xml.CDataDecoder`|Decoder for XML CData.|
|`helpers`|`xml.tagDecoder`|Decoder for XML tags.|
|`helpers-android`|`escapesDecoder`|Decoder for escaped chars like `\n` and `\u00a0`.|
|`helpers-android`|`spaceCollapser`|Decoder to convert multiple whitespace into a single space.|
|`helpers-android`|`phDecoder`|Decoder for `%d` style placeholders.|
|`helpers-ios`|`escapesDecoder`|Decoder for escaped chars like `\n` and `\U00a0`.|
|`helpers-ios`|`phDecoder`|Decoder for `%d` style placeholders.|
|`helpers-java`|`escapesDecoder`|Decoder for escaped chars like `\n` and `\u00a0`.|
|`helpers-java`|`MFQuotesDecoder`|Decoder for dealing with quotes in MessageFormat strings.|
|`helpers-json`|`i18next.phDecoder`|Decoder for `{{param}}` and `$t(key)` style placeholders.|

</details>

### Encoders

Encoders are used to convert pure strings and placeholders back to their original format. They can be configured in content types as a chain of encoders via the `textEncoders` and `codeEncoders` properties.

<details>
<summary>List of provided encoders:</summary>

|Module|Export|Description|
|---|---|---|
|`helpers`|`normalizers.gatedEncoder`|Generic flag-based encoder execution.|
|`helpers`|`normalizers.doublePercentEncoder`|Encoder for `%%` escaping.|
|`helpers`|`regex.encoderMaker(name, regex, matchMap)`|Internal utility to create encoders.|
|`helpers`|`xml.entityEncoder`|Encoder for XML entities.|
|`helpers-android`|`escapesEncoder`|Encoder for escaped chars as required by Android.|
|`helpers-ios`|`escapesEncoder`|Encoder for escaped chars like `\n`.|
|`helpers-java`|`escapesEncoder`|Encoder for escaped chars like `\n`.|
|`helpers-java`|`MFQuotesEncoder`|Encoder for dealing with quotes in MessageFormat strings.|

</details>

## Translation Providers

Translation providers are used to interface with the translation process. There are 2 kinds of providers and 2 modes of operation. Synchronous providers return translations right away. Typically these are machine translation engines that respond in real-time.
Jobs submitted to synchronous providers will go from `req` state to `done` state upon a push. Asynchronous providers will take longer to return translations (e.g. days for human translation). Jobs submitted to asynchronous providers will go from `req` state to `pending` to `done` state upon a push.
Providers can also support a `translation` push as opposed to a `refresh` push. The former meant for new submissions and the latter to pick up changes from previous submissions (e.g. translation bug fixes). A refresh push is always synchronous and generates a `done` job only if it produces differences (if all translations are unchanged then the job is cancelled).

<details>
<summary>List of provided translators:</summary>

|Module|Export|Async|Sync|Translation|Refresh|Description|
|---|---|:---:|:---:|:---:|:---:|---|
|`helpers`|`translators.Grandfather`|❌|✅|✅|✅|Create translations based on existing translated resources.
|`helpers`|`translators.Repetitions`|❌|✅|✅|✅|Create translations based on leverage of 100% text matches.
|`helpers`|`translators.Visicode`|❌|✅|✅|✅|Pseudo-localization with visual identification of string id's.
|`helpers-deepl`|`DeepL`|✅|❌|✅|💰|DeepL translation [API](https://www.deepl.com/docs-api).
|`helpers-demo`|`PigLatinizer`|✅|❌|✅|✅|Translator into pig latin for demo and pseudo-localization.
|`helpers-googlecloud`|`GoogleCloudTranslateV3`|✅|❌|✅|💰|Google Translate V3 [API](https://cloud.google.com/translate/docs).
|`helpers-translated`|`ModernMT`|✅|✅|✅|💰|Modern MT translation [API](https://www.modernmt.com/api/#introduction) (both realtime and batch).
|`helpers-translated`|`TranslationOS`|✅|❌|✅|✅|TOS human translation [API](https://api.translated.com/v2).
|`helpers-xliff`|`BridgeTranslator`|✅|❌|✅|❌|Translator via XLIFF files in filesystem.

</details>

## Operations

Running localization operations requires additional tools to support processes. The following additional components can be used:
1. **Job Stores**: provide persistence of past translation jobs (so that they can be reused in the future).
2. **Snap Stores**: provide persistence of normalized source content (in case accessing sources is expensive or impractical).
3. **Analyzers**: generate report over source content and translations. Some are provided ouf of the box and custom ones can be added.
4. **Actions**: effectively pieces of the localization process. Some are provided ouf of the box and custom ones can be added.

<details>
<summary>List of provided stores:</summary>

|Module|Export|Description|
|------|---|---|
|`helpers`|`stores.JsonJobStore`|Job store based on JSON files in the filesystem.|
|`helpers`|`stores.FileBasedJobStore`|Abstract job store based on JSON files in a blob store.|
|`helpers`|`stores.FsSnapStore`|Snap store based on JSON files in the filesystem.|
|`helpers`|`stores.FileBasedSnapStore`|Abstract snap store based on JSON files in a blob store.|
|`helpers-googlecloud`|`stores.GCSJobStore`|Job store based on JSON files in GCS.|
|`helpers-googlecloud`|`stores.GCSSnapStore`|Snap store based on JSON files in GCS.|

</details>


# Testing

Unit testing is performed centrally rather than module by module. Run `npm test` from /tests.

Regression testing is a suite of tests from the command line (both from zsh and node). Run `zsh test.zsh` from /regression.
