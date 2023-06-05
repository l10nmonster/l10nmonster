# Pipelines

L10n Monster employs a variety of pipelines to split up content processing and allow customizations. Here are the most important ones, with examples.

## Push untranslated content to translation vendor

This the most common first step in the translation process where we fetch raw translatable resources, normalize them, and push them to the translation vendor. There are many options in picking content to be sent, but selecting untranslated content is the most common. Multiple components are at play:

1. Loop through all normalized resources
    * If a snapstore is configured, all content is already normalized, so we just ask the snapstore to retrieve all normalized resources (`snapStore.getAllResources()`).
    * Otherwise, loop through all content types (aka `pipeline` in the code snippets below), and for each type ask the source adapter to fetch all raw resources.
        1. Some adapters have an optimized batch method that yields all resources (`pipeline.source.fetchAllResources()`). For those that don't, fetch stats of all resources (`pipeline.source.fetchResourceStats()`) and then yield each resource one at a time (`pipeline.source.fetchResource()`).
            * Some adapters may contain additional configurable steps as part of their resource processing. For example, `FsSource` allows to define a `resDecorator` property with a function that augment the resource metadata (e.g. to determine target languages that otherwise could not be inferred from the file).
        2. Raw resources are converted into normalized lists of segments by resource filters (`pipeline.resourceFilter.parseResource()`).
        3. Returned segments may still contain markup, escapes, and other conventions that a format-specific. A content type can configure a list of decoders (`pipeline.decoders[]`). Each, takes an array (initially an array with the single raw string returned by the source adapter) and returns an array of strings and objects. Strings are meant to be pure (i.e. don't contain an format-specific conventions). Each object represents a placeholder (aka `part`) that cannot be changed in the translation process (i.e. it's code).
        4. The normalized string is used to compute the `guid`, which will be used to uniquely identify the string in that context (i.e. an entry in the TM).
        5. If raw notes are present, special annotations are parsed and a structured `notes` property is created.
2. If the resource contains the desired language as a target language, continue, otherwise skip it.
3. Each content type allows to define a function (`pipeline.segmentDecorator()`) that can modify the normalized segments for the specific target language. For example, some segments may be removed because are not needed in the target language. Or developers' notes could be enriched with language managers' notes.
4. For each segment in each resource, using the `guid` check in the corresponding TM for the desired language pair whether that translation already exists, or it's currently in flight. If it exists with a quality above the desired minimum quality, then skip it. Otherwise include it in a translation job to be submitted to the translation vendor.
5. Select a translation provider for the job. This can be manually specified or automatically determined based on the capabilities and prioritization of each provider (e.g. some providers may be specific to certain languages only).
6. Hand off the job to the translation provider (`translator.requestTranslations()`).
7. Each provider may behave differently, but typically:
    1. Convert normalized segments into a reversible format (i.e. that can be converted back to a normalized format) that is acceptable by the translation vendor (e.g. XLIFF).
    2. Submit content to translation (typically via service API's).
    3. Return either a "done" job if the translation vendor is real-time (e.g. MT), or a "pending" job if the provider takes longer and the job needs to be pulled later.
    4. Provider will eventually create translation units (i.e. `tu`) that are normalized (i.e. `ntgt`).

## Generate translated resources

When translations jobs are completed, we ultimately need to generate translated resources. In that pipeline, we need to go from normalized translated content into format-specific content required by each content type:

1. For each desired target language, fetch all source stats that have that target language so that we know what needs to be generated.
    * If a snapstore is configured, we just ask the snapstore (`snapStore.getResourceStats()`).
    * Otherwise, loop through all content types and for each type ask the source adapter to fetch all stats (`pipeline.source.fetchResourceStats()`).
2. Each resource to generate will be of a certain content type. Each can define a list of functions that convert pure text into text with appropriate escaping and conventions for the format (`pipeline.textEncoders[]`) and one to process placeholders to be inserted in translations (`pipeline.codeEncoders[]` -- this is more rare). Those encoders are invoked in a chain as part of the translation generation.
3. Resource generation is a join effort between translations available in the TM for the required `guid`, encoders to be applied for the content type, and resource filters to create the final translated resource. There are 2 kinds of resource filters that can be configured in a content type:
    * *Transformative filters* take the raw source resource as an input (e.g. English), parse it, and generate an equivalent translated resource (`pipeline.resourceFilter.generateResource()`). These filters are able to generate resources very close to the original (e.g. including non-textual aspects like formatting) at the cost of additional processing.
    * *Generative filters* are able to generate the desired format directly from normalized content (`pipeline.resourceFilter.translateResource()`). These are more efficient as they don't require reading the source again but can only be applicable to a subset of formats.
4. Save translated resource using target adapter (`pipeline.target.commitTranslatedResource()`).
