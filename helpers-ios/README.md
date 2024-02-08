# L10n Monster iOS Helpers

|Module|Export|Description|
|---|---|---|
|`helpers-ios`|`StringsFilter`|Filter for .strings files.|
|`helpers-ios`|`escapesDecoder`|Decoder for escaped chars like `\n` and `\U00a0`.|
|`helpers-ios`|`phDecoder`|Decoder for `%d` style placeholders.|
|`helpers-ios`|`escapesEncoder`|Encoder for escaped chars like `\n`.|

### iOS Strings Filter

```js
this.resourceFilter = new ios.StringsFilter();
```

A filter for strings files used in iOS apps.

* [LIMITATION] it doesn't support files encoded in UTF-16.
