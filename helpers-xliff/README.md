# L10n Monster PO Helpers

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
