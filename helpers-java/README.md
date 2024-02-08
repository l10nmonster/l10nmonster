# L10n Monster Java Helpers

|Module|Export|Description|
|---|---|---|
|`helpers-java`|`escapesDecoder`|Decoder for escaped chars like `\n` and `\u00a0`.|
|`helpers-java`|`MFQuotesDecoder`|Decoder for dealing with quotes in MessageFormat strings.|
|`helpers-java`|`escapesEncoder`|Encoder for escaped chars like `\n`.|
|`helpers-java`|`MFQuotesEncoder`|Encoder for dealing with quotes in MessageFormat strings.|

###  Java Properties Filter

```js
this.resourceFilter = new filters.JavaPropertiesFilter();
```

A filter for properties files used as defined by the Java resource bundle specification.

* [TODO] it needs an option to make it stricter to deal with technically invalid files.
