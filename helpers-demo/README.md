# L10n Monster Demo Helpers

|Module|Export|Description|
|---|---|---|
|`helpers-demo`|`PigLatinizer`|✅|❌|✅|✅|Translator into pig latin for demo and pseudo-localization.


### Pig Latinizer Translator

```js
this.translationProvider = new demo.PigLatinizer({
    quality: 1
});
```

This is a pseudo-localization helper that converts source into [Pig Latin](https://en.wikipedia.org/wiki/Pig_Latin) to provide visual testing of hard-coded strings, concatenation, and text expansion. By default, quality is set to `1` but it can be overwritten in the constructor by passing the `quality` property.
