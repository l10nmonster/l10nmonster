# L10n Monster

Do you want to set up continuous localization for your project but don't have a whole team to look after it? Do you know how `git` works? Have you set up a build like `webpack` before? You've come to the right place and you'll feel right at home!

L10n Monster is the first headless and server-less TMS in the industry!

Why have the whole translation UI and capabilities when you don’t have any translators to manage yourself? Why maintain a system for your vendor to log in when they already have one they’re familiar with?
L10n Monster is also a solution to manage translation vendors, not translators. It pushes source content out to translation vendors and pulls translations back in. No more no less. It doesn't try to tell you how to consume content or deliver it to production. It doesn't deal with formatting and other internationalization concerns.

# Components

To help manage dependencies and allow the variety of integrations required by the localization industry, the are a lot of packages to choose from and it's very easy to create your own extensions.

1. Core: the foundational classes where most of the functionality lives. Written as ESM and built into CJS.
2. CLI: the main command-line utility to invoke from the shell or from Node.js scripts. Suitable for batch jobs. Written as ESM, built into CJS, and potentially compiled to a binary.
3. VS Code L10n Manager: a VS Code extension to provide a more intuitive UI than the CLI. Written as ESM and built into CJS.
4. Helpers: common utilities and configuration components with minimal or no dependencies. Written as ESM and built into CJS.
5. Helpers-*: optional specific configuration components with additional dependencies. Written as CJS.

See the overall [System Design (OUTDATED)](architecture.md#system-design) to get a better idea. Also, a deep dive of the various [pipelines](pipelines.md).

# Testing

Unit testing is performed centrally rather than module by module. Run `npm test` from /tests.

Regression testing is a suite of tests from the command line (both from zsh and node). Run `zsh test.zsh` from /regression. By default it tests using a node script. By passing an argument it tests the shell version.

# Helpers

Translation pipelines are highly customizable, so all stages are componentized and configured separately.

## Sources

Sources are *adapters* used to interface with a source of content. They only deal with transport concerns and not format. They return a raw string with the content of resources and metadata associated to them. They can be configured in content types as a single `source` property.

|Module|Export|Description|
|---|---|---|
|`helpers`|`adapters.FsSource`|Read from file-system-like sources.
|`helpers-http`|`Source`|Read from url sources.

## Resource Filters

Filters are used to convert raw strings returned by sources into segments that are suitable for translation (ideally not too small that they can't be translated, and not too long that prevent translation reuse). They can be configured in content types as a single `resourceFilter` property.

|Module|Export|Description|
|---|---|---|
|`helpers`|`filters.SnapFilter`|Filter for normalized resources in snap store.
|`helpers-android`|`Filter`|Filter for Android xml files.|
|`helpers-html`|`Filter`|Filter for HTML files.|
|`helpers-ios`|`StringsFilter`|Filter for .strings files.|
|`helpers-java`|`PropertiesFilter`|Filter for Java properties files.|
|`helpers-json`|`i18next.Filter`|Filter for ARB-like JSON files used by [i18next v4](https://www.i18next.com/misc/json-format).|
|`helpers-po`|`Filter`|Filter for PO files.|

## Decoders

Decoders are used to convert strings with specific formats into either pure strings or placeholders. They can be configured in content types as a chain of decoders via the `decoders` property.

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

## Encoders

Encoders are used to convert pure strings and placeholders back to their original format. They can be configured in content types as a chain of encoders via the `textEncoders` and `codeEncoders` properties.

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

## Targets

Targets are *adapters* used to interface with a content store. They may or may not go hand-in-hand with their source counterpart. Typically you want to read and write into the same store and structure, but you could also read from one structure and write into a different one in more sophisticated setups. They take a raw string with the content of translated resources and commit it to storage.

|Module|Export|Description|
|---|---|---|
|`helpers`|`adapters.FsTarget`|Write to file-system-like sources.

## Translation Providers

Translation providers are used to interface with the translation process. There are 2 kinds of providers and 2 modes of operation. Synchronous providers return translations right away. Typically these are machine translation engines that respond in real-time. Jobs submitted to synchronous providers will go from `req` state to `done` state upon a push. Asynchronous providers will take longer to return translations (e.g. days for human translation). Jobs submitted to asynchronous providers will go from `req` state to `pending` to `done` state upon a push.
Providers can also support a `translation` push as opposed to a `refresh` push. The former meant for new submissions and the latter to pick up changes from previous submissions (e.g. translation bug fixes). A refresh push is always synchronous and generates a `done` job only if it produces differences (if all translations are unchanged then the job is cancelled).

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

## Other

|Module|Export|Description|
|------|---|---|
|`helpers`|`utils.*`|Internal utilities. No stable interface. Use at your own risk.|
|`helpers`|`analyzers.*`|Miscellaneous analyzers.|
|`helpers`|`stores.JsonJobStore`|Job store based on JSON files in the filesystem.|
|`helpers`|`stores.FileBasedJobStore`|Abstract job store based on JSON files in a blob store.|
|`helpers`|`stores.FsSnapStore`|Snap store based on JSON files in the filesystem.|
|`helpers`|`stores.FileBasedSnapStore`|Abstract snap store based on JSON files in a blob store.|
|`helpers`|`stores.FsStoreDelegate`|Delegate helper for `FileBasedJobStore` and `FileBasedSnapStore` to use the filesystem.|

### Dependencies

Typically, all helpers depend on a shared context for things like access to a logger. This is provided via a global `l10nmonster` object.

# Philosophy

Localization is messy. Full of exceptions and bending backwards. As much as we want to provide an easy-to-use out-of-the-box solution by offering an opinionated implementation with reasonable defaults, the main goal should be to make solving of edge cases and advanced scenarios possible.
To do this we try to componentize every aspect of localization with utilities, helpers, abstractions and then put them together into a simplified toolchain (e.g. the command-line interface). When more advanced toolchains are needed, just write your own with (hopefully) simple Node.js scripts that can be launched directly or as extensions of the CLI.
