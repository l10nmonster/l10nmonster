# L10n Monster JSON Helpers

### JSON Filter

A filter for JSON files. It supports annotations as defined by the [ARB spec](https://github.com/google/app-resource-bundle/wiki/ApplicationResourceBundleSpecification). In addition it supports nested keys and plurals as defined by the [i18next JSON v4](https://www.i18next.com/misc/json-format) format.

```js
this.resourceFilter = new filters.JsonFilter({
        enableArbAnnotations: true,
        enablePluralSuffixes: true,
        emitArbAnnotations: true
});
```
