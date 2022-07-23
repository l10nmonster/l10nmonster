# CardboardSDK

This is a sample of a possible enterprise setup for translating an iOS project.

In the context of a centralized translation team that aggregates content from different teams, it may be beneficial to split ownership of project-specific details from translation concerns.
For example, details like file formats, encodings, directory structures / naming conventions, project-specific custom treatments like DNT and refined target languages, could be owned and maintained by each team owning the content. At the same time those teams may not be concerned with what vendor to use and may not need to have access to api tokens required for integration.

In this sample, the CardboardSDK folder is hypothetically owned by the iOS team, while the CardboardSDK-t9n folder is owned by the translation team.
The configuration in CardboardSDK specifies source/filter/decoders/target specific to iOS and a snapStore to hold a snapshot of the source in a normalized format.
The configuration in CardboardSDK-t9n is configured to read from the CardboardSDK snapshot and eventually produces complete translation jobs in its own store. At the same time, CardboardSDK is configured to read from the job store in CardboardSDK-t9n so that it can generate the translated files.

A typical decoupled translation cycle may look like this:
1. CardboardSDK runs `l10n snap` to populate the "snap" folder from the iOS sources.
2. The "snap" folder is made available to CardboardSDK-t9n through any method of copying/sharing files.
3. CardboardSDK-t9n runs `l10n push` / `l10n pull` using a copy of "snap" as a source (with no filter/decoders necessary).
4. The "translationJobs" folder is made available to CardboardSDK through any method of copying/sharing files.
5. CardboardSDK runs `l10n translate` to generate translated iOS resources.
