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

### FS Target Adapter

```js
this.target = new adapters.FsTarget({
    targetPath: (lang, resourceId) => resourceId.replace('values', `values-${lang}`),
});
```

An adapter that writes translated resources to the filesystem. It takes in the object constructor a `targetPath` function that given a language and the resource id of the source, it produces the target resource id.


###  Java Properties Filter

```js
this.resourceFilter = new filters.JavaPropertiesFilter();
```

A filter for properties files used as defined by the Java bundle specification.

* [TODO] it needs configuration to deal with message formats.
* [TODO] it needs an option to make it stricter to deal with technically invalid files.

### iOS Strings Filter

```js
this.resourceFilter = new filters.IosStringsFilter();
```

A filter for strings files used in iOS apps.

* [TODO] it needs configuration to deal with message formats.
* [LIMIT] it doesn't support files encoded in UTF-16.

### Android XML Filter

```js
this.resourceFilter = new filters.AndroidFilter({
    comment: 'pre',
});
```

A filter for XML files used in Android apps. The `comment` property specifies whether developer notes are placed before, after, or on the same line (`pre`, `post`, `right` respectively).

* [TODO] it needs configuration to deal with message formats.
* [BUG] it doesn't honor the `translatable` attribute.

### JSON Filter

A filter for JSON files. It supports annotations as defined by the [ARB spec](https://github.com/google/app-resource-bundle/wiki/ApplicationResourceBundleSpecification). In addition it supports nested keys and plurals as defined by the [i18next JSON v4](https://www.i18next.com/misc/json-format) format.

```js
this.resourceFilter = new filters.JsonFilter({
        enableArbAnnotations: true,
        enablePluralSuffixes: true,
        emitArbAnnotations: true
});
```

### PO Filter

```js
this.resourceFilter = new filters.PoFilter();
```

A filter for PO files.

* [TODO] it needs configuration to deal with message formats.

### Pig Latinizer Translator

```js
this.translationProvider = new translators.PigLatinizer({
    quality: 1
});
```

This is a pseudo-localization helper that converts source into [Pig Latin](https://en.wikipedia.org/wiki/Pig_Latin) to provide visual testing of hard-coded strings, concatenation, and text expansion. By default, quality is set to `1` but it can be overwritten in the constructor by passing the `quality` property.

### XLIFF Translator

```js
this.translationProvider = new translators.XliffBridge({
    requestPath: (lang, prjId) => `xliff/outbox/prj${prjId)}-${lang}.xml`,
    completePath: (lang, prjId) => `xliff/inbox/prj${(prjId)}-${lang}.xml`,
    quality: 80,
});
```

XLIFF is the industry standard for translation exchange. The adapter writes translation requests as XLIFF files that can be manually given to a translation vendor. Once translations are received, the corresponding translated files can be imported and saved.
There are no standard naming conventions for xliff files, so any can be implemented by providing 2 functions in the `requestPath` and `completePath` properties. The functions are given the target language and the project id as parameters from which to form a naming convention. By default, quality is set to `50` but it should be specified by passing the `quality` property.
