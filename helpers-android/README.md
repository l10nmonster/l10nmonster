# L10n Monster Android Helpers

|Module|Export|Description|
|---|---|---|
|`helpers-android`|`Filter`|Filter for Android xml files.|
|`helpers-android`|`escapesDecoder`|Decoder for escaped chars like `\n` and `\u00a0`.|
|`helpers-android`|`spaceCollapser`|Decoder to convert multiple whitespace into a single space.|
|`helpers-android`|`phDecoder`|Decoder for `%d` style placeholders.|
|`helpers-android`|`escapesEncoder`|Encoder for escaped chars as required by Android.|


```js
this.resourceFilter = new android.Filter({
    comment: 'pre',
});
```

A filter for XML files used in Android apps. The `comment` property specifies whether developer notes are placed before, after, or on the same line (`pre`, `post`, `right` respectively).
