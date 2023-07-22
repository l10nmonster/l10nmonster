# L10n Monster Basic Helpers

## Sources

### FS Source Adapter

```js
this.source = new adapters.FsSource({
    globs: [ '**/values/strings.xml' ],
    filter: (resourceId) => (resourceId.indexOf('dont_translate.properties') === -1),
    targetLangs: [ 'it', 'ja' ],
    resDecorator: (resMeta) => (resMeta.resourceId.indexOf('DNT') === -1 ? resMeta : { ...resMeta, targetLangs: [] }),
});
```

An adapter that reads sources from the filesystem.

* The `globs` array (mandatory) can specify wildcard patterns relative to the base directory where the `l10nmonster.cjs` is placed.
* The optional `filter` function can further filter out what's returned by the glob patterns.
* `targetLangs` is an array of languages to translate to
* The optional `resDecorator` function can modify the resource metadata

## Resource Filters

Filters are used to convert raw strings returned by sources into segments that are suitable for translation (ideally not too small that they can't be translated, and not too long that prevent translation reuse). They can be configured in content types as a single `resourceFilter` property.

|Module|Export|Description|
|---|---|---|
|`helpers`|`filters.SnapFilter`|Filter for normalized resources in snap store.

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

## Encoders

Encoders are used to convert pure strings and placeholders back to their original format. They can be configured in content types as a chain of encoders via the `textEncoders` and `codeEncoders` properties.

|Module|Export|Description|
|---|---|---|
|`helpers`|`normalizers.gatedEncoder`|Generic flag-based encoder execution.|
|`helpers`|`normalizers.doublePercentEncoder`|Encoder for `%%` escaping.|
|`helpers`|`regex.encoderMaker(name, regex, matchMap)`|Internal utility to create encoders.|
|`helpers`|`xml.entityEncoder`|Encoder for XML entities.|

## Targets

### FS Target Adapter

```js
this.target = new adapters.FsTarget({
    targetPath: (lang, resourceId) => resourceId.replace('values', `values-${lang}`),
});
```

An adapter that writes translated resources to the filesystem. It takes in the object constructor a `targetPath` function that given a language and the resource id of the source, it produces the target resource id.

## Translation Providers

Translation providers are used to interface with the translation process.

|Module|Export|Async|Sync|Translation|Refresh|Description|
|---|---|:---:|:---:|:---:|:---:|---|
|`helpers`|`translators.Grandfather`|❌|✅|✅|✅|Create translations based on existing translated resources.
|`helpers`|`translators.Repetitions`|❌|✅|✅|✅|Create translations based on leverage of 100% text matches.
|`helpers`|`translators.Visicode`|❌|✅|✅|✅|Pseudo-localization with visual identification of string id's.

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
