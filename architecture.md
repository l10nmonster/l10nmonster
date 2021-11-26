# Architecture

## Basic assumptions

The system is designed with modern translation principles in mind. Specifically:

* The translation process is composed of a pipeline of steps that starts from reading the source content and ends in writing corresponding translated resources.
* Source content is split into translation units, each with a guid that identifies them. Two translation units with the same guid would get the same identical translation.
* By default the guid is derived from the resource id, the logical string id (if present), and the source text. This is the most strict guid generation logic and allow extreme contextual customization but prevents reuse. When translation reuse is desirable and it's safe to do so, it's possible to override guid generation to relax the uniqueness logic.
* Translated resources are never source of record and can be re-generated / overwritten at any time.
* Translations are organized in translation jobs typically sent to translation vendors. Completed translation jobs are saved and constitute the source of record.
* Translation processes may yield different levels of quality (e.g. machine translation vs. single-pass human translation vs. human translation with review). Each translation unit carries a level of quality.
* Based on the collection of translation jobs and simple aggregation rules (e.g. latest highest quality translation wins) we can generate a translation memory that maps a guid into a string in the target language.
* The latest source content mapped through the latest translation memory yield the best available translated resources.

## Design

The translation pipeline is composed of 4 successive modules:

1. Source Adapter: reads source content from its storage medium (e.g. file system or DB) into in-memory resources.
2. Format Filter: converts resources of a specific format into a series of translation units in a normalized format.
3. Translator: submits source content for translation and retrieves translated content when complete.
4. Target Adapter: takes translated resources and commits them in their storage medium (which may or may not be the same as the source).
