## @l10nmonster/core [3.2.1](https://github.com/l10nmonster/l10nmonster/compare/@l10nmonster/core@3.2.0...@l10nmonster/core@3.2.1) (2026-01-06)


### Bug Fixes

* **core:** Export fails with non-existent channel ([ef60851](https://github.com/l10nmonster/l10nmonster/commit/ef608511ae817ab12ffdd1ed507eaade4695f314))

# @l10nmonster/core [3.2.0](https://public-github/l10nmonster/l10nmonster/compare/@l10nmonster/core@3.1.1...@l10nmonster/core@3.2.0) (2026-01-03)


### Bug Fixes

* **core:** Ensure SQLite databases are properly closed even with errors ([194c4be](https://public-github/l10nmonster/l10nmonster/commit/194c4be0137af2a717a0452d94c059f9aff7a8d9))
* **core:** Fix types ([4ff88a4](https://public-github/l10nmonster/l10nmonster/commit/4ff88a47ef2efeb629da0cae7e794512f961becf))
* **core:** Improve DAL type checks ([0e383bd](https://public-github/l10nmonster/l10nmonster/commit/0e383bdee771e14a510363e1c59b8fb2593e53d1))
* **core:** Make default monster command more summarized ([eb84d3d](https://public-github/l10nmonster/l10nmonster/commit/eb84d3dd0235a9f43271c62ad643edbac50f3755))
* **core:** Make TM indexes lazy and increase transaction sizes ([91a9673](https://public-github/l10nmonster/l10nmonster/commit/91a967396d57d331dc376ecadc19b591eb3f6064))
* **core:** More performance optimizations ([44a25ee](https://public-github/l10nmonster/l10nmonster/commit/44a25eea6ab6de16ee888c42e758133e53e4d952))
* **core:** Remove JobDAL ([b3a19a6](https://public-github/l10nmonster/l10nmonster/commit/b3a19a6459573326135a82119a2356d20c55e92a))
* **core:** Source import broken ([5ef42e3](https://public-github/l10nmonster/l10nmonster/commit/5ef42e3c0dc1e3f21f6d0c3c253e005127641c5f))


### Features

* **core:** First iteration of sharded externalized SQLiteDALManager ([5083a7f](https://public-github/l10nmonster/l10nmonster/commit/5083a7fc671e104a103b43ec6a3a0dfd539215a4))
* **core:** Implement workers for sqlite ([5460c17](https://public-github/l10nmonster/l10nmonster/commit/5460c177d07aac46380607f3f2859b027845c178))
* **core:** New tm bootstrap action ([4f98899](https://public-github/l10nmonster/l10nmonster/commit/4f9889951ddc88f7028f4e9d4b659d44fc4c775c))
* **helpers-pgsql:** Unified schema version ([f13bfa1](https://public-github/l10nmonster/l10nmonster/commit/f13bfa19d2f9aef3c5e10b7ab90b6725c0a21b03))

## @l10nmonster/core [3.1.1](https://public-github/l10nmonster/l10nmonster/compare/@l10nmonster/core@3.1.0...@l10nmonster/core@3.1.1) (2025-12-23)


### Bug Fixes

* **core:** Job table missing in some cases ([fad6012](https://public-github/l10nmonster/l10nmonster/commit/fad60128b5a926eebb85f731c11f6afa77da6777))
* Improve type definitions and checks ([826b412](https://public-github/l10nmonster/l10nmonster/commit/826b412f0f7e761d404165a243b0c2b26c416ac1))

# [3.1.0](https://public-github/l10nmonster/l10nmonster/compare/@l10nmonster/core@3.0.0...@l10nmonster/core@3.1.0) (2025-12-20)


### Bug Fixes

* Active filter not working ([f1c5e85](https://public-github/l10nmonster/l10nmonster/commit/f1c5e85dedcd197b4ec94d48b90c43c67ceb824a))
* Add proper pluralization expansion support ([3d062bb](https://public-github/l10nmonster/l10nmonster/commit/3d062bbb3272c61e969b419a56a7a5e347ab96c6))
* Add support for async functions for secrets ([5d9d0a9](https://public-github/l10nmonster/l10nmonster/commit/5d9d0a99f45e1f4f16a30a634bea4259b106d74a))
* Calibrate log severities ([2b3350a](https://public-github/l10nmonster/l10nmonster/commit/2b3350a3123abb91e7f91a9c1864daeb6275c3ad))
* **core:** Add a translationGroups property to all providers ([2020d1a](https://public-github/l10nmonster/l10nmonster/commit/2020d1a0c6eac912fcb80b8af8bb9c8cb78af7c4))
* **core:** Add group index ([eb19031](https://public-github/l10nmonster/l10nmonster/commit/eb190310d3921cc73b12157e3f2a015f9ce37cb7))
* **core:** Add guard for nullish jobs ([776fb25](https://public-github/l10nmonster/l10nmonster/commit/776fb25f26978bf25eac2585e89590e079c06191))
* **core:** Add jobGuid to exported jsonl in stores ([2390d1b](https://public-github/l10nmonster/l10nmonster/commit/2390d1bd05796b56207abad43468f7067e16599b))
* **core:** Add qa as a supported tu object ([56e5266](https://public-github/l10nmonster/l10nmonster/commit/56e52663495a36c6dc964828cb41b757601d0b49))
* **core:** Alpha 13 regression fixes ([13c43d3](https://public-github/l10nmonster/l10nmonster/commit/13c43d3ab0793cae0da62eb8017fee191ec79042))
* **core:** Also allow translationGroups to be specified as a comma-separated string ([d862973](https://public-github/l10nmonster/l10nmonster/commit/d862973da907bf4251890fc18ff900ba180ecbe9))
* **core:** Better management of multiple TM Stores ([a66d4ed](https://public-github/l10nmonster/l10nmonster/commit/a66d4ed6079e53a01fec231775a74e18b4c5e0d2))
* **core:** Deprecate storing gstr ([8ff5655](https://public-github/l10nmonster/l10nmonster/commit/8ff56553a815e3ff565921fc85581bcdb30031f6))
* **core:** Don't show resource counts in source list ([ef76270](https://public-github/l10nmonster/l10nmonster/commit/ef76270dd5e3b2ad2f5af30a3cecc903740fb7b9))
* **core:** Don't syncup jobs that have been have been updated already ([0ef6e18](https://public-github/l10nmonster/l10nmonster/commit/0ef6e18bfe7d78bc4583a87c5d934733cf11eee3))
* **core:** Drop internal holdout tus from repetition response ([df35055](https://public-github/l10nmonster/l10nmonster/commit/df350550de1e2d98fa588150c66d5c2f196768ab))
* **core:** ensure TOC integrity on write and not on read ([106ab19](https://public-github/l10nmonster/l10nmonster/commit/106ab1923a37a47433335d3b3122dc662bc5a699))
* **core:** Escape all newlines in JSONL ([ed80fbe](https://public-github/l10nmonster/l10nmonster/commit/ed80fbef6713c79dd8dd6b42f4ef6444f8f4c80e))
* **core:** Handle better empty jobs and blocks ([186ff83](https://public-github/l10nmonster/l10nmonster/commit/186ff836fefbe686f08654c562cae4d2f7e14920))
* **core:** Hide mm property in providers ([830e018](https://public-github/l10nmonster/l10nmonster/commit/830e0189de7d6aa9217952a5537fe93ff6e99a44))
* **core:** Honor prj option in source untranslated ([85cf9bf](https://public-github/l10nmonster/l10nmonster/commit/85cf9bfef7c809fedbccaffca2f36cec72dd98e0))
* **core:** Improve LLMTranslationProvider retry condition ([a1f7d55](https://public-github/l10nmonster/l10nmonster/commit/a1f7d55cfe5046ddc0cc4118b7c64c369ced7a63))
* **core:** Improve tm list presentation and defaults ([e1b4742](https://public-github/l10nmonster/l10nmonster/commit/e1b4742ed616202efcbb9f175562bae872a6ab61))
* **core:** Jobs not deleted in tm store when there is a store mismatch ([228fc6a](https://public-github/l10nmonster/l10nmonster/commit/228fc6a9f9b5ce5d79bf0d7a1d72f4dd4ba952aa))
* **core:** Make sure actions return a response ([838bfeb](https://public-github/l10nmonster/l10nmonster/commit/838bfebee870a92c19e82bd901737e9e97bce287))
* **core:** Move internal leverage to Repetition provider ([c933726](https://public-github/l10nmonster/l10nmonster/commit/c933726c7f1690bd7e8ab91437045017b06cc0b3))
* **core:** Move summary status logic to mm ([8707ab6](https://public-github/l10nmonster/l10nmonster/commit/8707ab6cf755182eb72d4cfd321dcf781b148edd))
* **core:** Need to sanitize TOC on read (in memory) ([d14fbc4](https://public-github/l10nmonster/l10nmonster/commit/d14fbc4cb8272f3a1b368a3f7faeeff8b81a2c72))
* **core:** Optimize performance of TU search queries ([5ae7459](https://public-github/l10nmonster/l10nmonster/commit/5ae7459a78ee5e0f43453b2edef53229b9078f37))
* **core:** Optimize source page performance ([b791186](https://public-github/l10nmonster/l10nmonster/commit/b79118647b1d4c0236dd5f2718bb12ec1d6a52ff))
* **core:** Performance improvements ([09dbd9d](https://public-github/l10nmonster/l10nmonster/commit/09dbd9db8bd494c2a5698af39547462fd0a853bc))
* **core:** Prevent duplicate jobs in the same block ([bac1efb](https://public-github/l10nmonster/l10nmonster/commit/bac1efb40496615a38743b8bfe1933733870ff84))
* **core:** Return highest quality first in lookups ([f4ce6d6](https://public-github/l10nmonster/l10nmonster/commit/f4ce6d6c53cc284800022e9ff61e024d3ba4d0fc))
* **core:** Skip pluralized entries in Repetition provider ([2763834](https://public-github/l10nmonster/l10nmonster/commit/276383400ec288657c895eff2fa6e3285aa7e120))
* **core:** Snap store chokes on empty channels ([232d034](https://public-github/l10nmonster/l10nmonster/commit/232d034db97ed511d20424256363b8b2b59b4b17))
* **core:** Source query print indentation ([ffc6867](https://public-github/l10nmonster/l10nmonster/commit/ffc6867aba5a43ed993b1974d10f98f03919f330))
* **core:** Source untranslated not working multi-channel ([589cf91](https://public-github/l10nmonster/l10nmonster/commit/589cf91c4d80e7c02305b81e5a81bee872792ac3))
* **core:** Streamline logging ([d17c2aa](https://public-github/l10nmonster/l10nmonster/commit/d17c2aaf467c90f1a2840f9cc12e3607924ee0e5))
* **core:** Support dynamic baseLang in InvisicodeProvider ([559a82b](https://public-github/l10nmonster/l10nmonster/commit/559a82b89ea55a64c6b21da0d2b812f28a812727))
* **core:** Tm cleanup doesn't bump job date ([cfe5860](https://public-github/l10nmonster/l10nmonster/commit/cfe5860930ff6d98945930e136d262a94914df2b))
* **core:** Turn on WAL mode in sqlite ([4672f7a](https://public-github/l10nmonster/l10nmonster/commit/4672f7a561ab8c648ccce7c903be12defb966ef6))
* **core:** Validate channel id in DAL ([bb83a8b](https://public-github/l10nmonster/l10nmonster/commit/bb83a8bbaae85638355c434142c3d60a694e2fd4))
* dependency version bump ([728fa9c](https://public-github/l10nmonster/l10nmonster/commit/728fa9c52cee8a2f5c7cb351319687ddc6a43672))
* Don't save cancelled jobs ([2c821e3](https://public-github/l10nmonster/l10nmonster/commit/2c821e387df2d54bdebb4454d33745372efbb640))
* **helpers-googlecloud:** Ensure prefix is always treated as a directory ([#45](https://public-github/l10nmonster/l10nmonster/issues/45)) ([68033ae](https://public-github/l10nmonster/l10nmonster/commit/68033ae98a6b7844287df20f0e3d37cc5f2f1e7f))
* **helpers-lqaboss:** Fix typo ([209dd07](https://public-github/l10nmonster/l10nmonster/commit/209dd071724c6f15464a1be0ebf140f23efc3f56))
* **helpers-lqaboss:** Move lqaboss ingestion to tm syncdown ([ebda63f](https://public-github/l10nmonster/l10nmonster/commit/ebda63f3b1651b44265ba62ce0f4ff876e9c97ed))
* **helpers-lqaboss:** Relax LQABossTmStore glob to allow for custom flow names ([5568c81](https://public-github/l10nmonster/l10nmonster/commit/5568c81d55f07c95d4af337904bc0367f5f71d68))
* **helpers-lqaboss:** Support old jobs without updatedAt property ([7c8cf75](https://public-github/l10nmonster/l10nmonster/commit/7c8cf759dfe9df379f537ef8a278b76949c19783))
* **helpers-translated:** Remove content type from Lara ([3664fe2](https://public-github/l10nmonster/l10nmonster/commit/3664fe2f1312d27cdbfbe587e817aa14480de496))
* **lqaboss:** Support new response type ([ecaec02](https://public-github/l10nmonster/l10nmonster/commit/ecaec029b509d88267ac66374c5993c1537737c0))
* Make source query channel optional ([1addc68](https://public-github/l10nmonster/l10nmonster/commit/1addc68d009794a92588a28b816d7e9edbab6b47))
* **openai:** add reasoningEffort option ([0388d87](https://public-github/l10nmonster/l10nmonster/commit/0388d873085cf4b3cb1ed99c640a7ea8af07cb79))
* **openai:** downgrade to zod 3 ([9837916](https://public-github/l10nmonster/l10nmonster/commit/9837916e19b8819331009f5591a59e24d3d05866))
* Pluralization improvements ([5964250](https://public-github/l10nmonster/l10nmonster/commit/596425092c425cc8d6c312ef58509c4c3c537431))
* **server:** Add project filtering to status pages ([89177fe](https://public-github/l10nmonster/l10nmonster/commit/89177feceae34c5fecb942c8e31406356f573479))
* **server:** Fix cart cleanup ([9bbcab9](https://public-github/l10nmonster/l10nmonster/commit/9bbcab93e1fd20aeb09f59c828665159f091f37c))
* **server:** Fix drop downs and alerts ([af9450c](https://public-github/l10nmonster/l10nmonster/commit/af9450c7faa6debf23edc2e215b92c7000fc574b))
* **server:** Fix unit test ([bace95e](https://public-github/l10nmonster/l10nmonster/commit/bace95e20a621425febb03e1c729f4507c453168))
* **server:** home page improvements ([afe9264](https://public-github/l10nmonster/l10nmonster/commit/afe9264fa54cb4440559b6eb3dfcaa8b66f9238d))
* **server:** Improve error handling ([e635adf](https://public-github/l10nmonster/l10nmonster/commit/e635adf499410da8b85cad91e61202abad642549))
* **server:** Improve TM Detail performance ([836bebf](https://public-github/l10nmonster/l10nmonster/commit/836bebf45aceafd0ee0887aa4689bf41affbbcab))
* **server:** Improve UI ([9b18a83](https://public-github/l10nmonster/l10nmonster/commit/9b18a83d7f1d831eff4b91a5b4e323175b233855))
* **server:** Migrate from Material UI to Chakra UI 3.0 ([f02f0b3](https://public-github/l10nmonster/l10nmonster/commit/f02f0b39487a993fe0ba8cea7ccdd25981ced149))
* **server:** More Status page optimizations ([1b37177](https://public-github/l10nmonster/l10nmonster/commit/1b3717708780767296e0e81e3b3cb43404dbf874))
* **server:** Move only leveraged filter server side plus optimizations ([c3a7525](https://public-github/l10nmonster/l10nmonster/commit/c3a7525f819a866f60e9ef52e2b0e38f8263e069))
* **server:** UI tweaks ([0ad528e](https://public-github/l10nmonster/l10nmonster/commit/0ad528eaaa01dd5deffd2b6443a752dda310ccc8))
* throwing when resources are empty ([e0fb9fe](https://public-github/l10nmonster/l10nmonster/commit/e0fb9fe273cdf47e3236a4d671ad2fe4c3d53e17))
* Version bumps ([d3030bd](https://public-github/l10nmonster/l10nmonster/commit/d3030bdd0af6ddbc79b3076af7427111ca9b04d0))


### Features

* Add includeTranslations to chunked providers ([656ce08](https://public-github/l10nmonster/l10nmonster/commit/656ce0805c687f98719d75d64d3666d0f7348569))
* **config-mancer:** Support CUE schema generation ([e2e027d](https://public-github/l10nmonster/l10nmonster/commit/e2e027d447f6ef108969d63a3fda4de63fbb9c7a))
* **config-mancer:** Support yaml files ([b0df161](https://public-github/l10nmonster/l10nmonster/commit/b0df16198eeda6a8d7d8931b3b238ff9e02cff96))
* **core:** Add in-memory log ([54b3e8f](https://public-github/l10nmonster/l10nmonster/commit/54b3e8ff92ea9d98161b2f14a740ad3f117d9bd5))
* **core:** Add options to skip quality and group checks on job creation ([e1f62e1](https://public-github/l10nmonster/l10nmonster/commit/e1f62e1688d29fe4b816a40a07de566965ec981f))
* **core:** Add package version to logs ([05c0a0f](https://public-github/l10nmonster/l10nmonster/commit/05c0a0f0f4da37d3267e7143ea5f8dda4d4b91c9))
* **core:** Add paginated TM search ([26a9930](https://public-github/l10nmonster/l10nmonster/commit/26a9930c618b263c42adf9ec49f8f0f8ba825c7f))
* **core:** Add print verbosity options to source_untranslated ([2106394](https://public-github/l10nmonster/l10nmonster/commit/2106394309f6176947f76bb69c21caa6c6b91597))
* **core:** Add tm cleanup action ([eeaebaa](https://public-github/l10nmonster/l10nmonster/commit/eeaebaacde16216b0afa36d4180131f8cbbcaa13))
* **core:** Major refactor ([6992ee4](https://public-github/l10nmonster/l10nmonster/commit/6992ee4d74ad2e25afef6220f92f2e72dfd02457))
* **helpers-googlecloud:** Add support for grounding tools ([2f4ec02](https://public-github/l10nmonster/l10nmonster/commit/2f4ec0273eae9d8e1cacf16a20bb93ee020dee7b))
* **helpers-googlecloud:** allow specifying projectID for BigQuery ([#46](https://public-github/l10nmonster/l10nmonster/issues/46)) ([5ee8a36](https://public-github/l10nmonster/l10nmonster/commit/5ee8a3641628c69a1b1ab1213ceba0f493b3ae10))
* implement an approach for mcp extensibility ([#50](https://public-github/l10nmonster/l10nmonster/issues/50)) ([5fcc89b](https://public-github/l10nmonster/l10nmonster/commit/5fcc89bef8c8af01d88f35dece8290989d04e4d5))
* Improve LQA Boss ([fcb0818](https://public-github/l10nmonster/l10nmonster/commit/fcb0818181f1a7bd46764596c9d2b8d8f362375c))
* **lqaboss:** Support for new Chrome extension ([dc6f86f](https://public-github/l10nmonster/l10nmonster/commit/dc6f86f417dde5e5942bdad2c81c0fbbac59fb80))
* **providers:** Support promises for secrets ([3ac66dc](https://public-github/l10nmonster/l10nmonster/commit/3ac66dc13761f671a85f7f3b3df0539d021366dd))
* Refactor TM TOC page for performance ([0088b3c](https://public-github/l10nmonster/l10nmonster/commit/0088b3c2b69cdd00bc27697f50c892429f113f80))
* **server:** Add group to TMDetail page ([9d7ff6d](https://public-github/l10nmonster/l10nmonster/commit/9d7ff6d9ebf15747e7e345edd0e38f92ec7afe36))
* **server:** Add job page ([5014b8e](https://public-github/l10nmonster/l10nmonster/commit/5014b8e40accfe007281e5a744c8b714f4c34676))
* **server:** Add translation status to Sources page ([b73d4ec](https://public-github/l10nmonster/l10nmonster/commit/b73d4ec043ef37fc78ae2b548e7623aeb07c1ec1))
* **server:** Break down untranslated content by group ([7544c98](https://public-github/l10nmonster/l10nmonster/commit/7544c98e1c1beadf2f0b939eb29f527a7f11101d))
* **server:** Major improvements ([c8f9c2e](https://public-github/l10nmonster/l10nmonster/commit/c8f9c2e2fdf236a58df31ef1b9f22b626ccd35d8))
* **server:** New features and improvements ([1d18c14](https://public-github/l10nmonster/l10nmonster/commit/1d18c14037ba4838fda6090f120529b09ff9bfa9))
* **server:** Support for route extensions ([6e42ca0](https://public-github/l10nmonster/l10nmonster/commit/6e42ca0fa18af279fa152dfe447155b7951f8ff3))
* **server:** Support multi-select drop downs in TMDetail ([872c529](https://public-github/l10nmonster/l10nmonster/commit/872c529c621a9f5561b842658248d0aa41a13996))
* **translated:** Add glossary options to MMT ([39eb5d0](https://public-github/l10nmonster/l10nmonster/commit/39eb5d0e6d611539b6b59d986ebf725bfd561a70))

## v.2.0.0

This is the third major refactor, from v0 that was a monolyth, to v1 that tried to decomponetize everything and support older versions of Node with CJS (mostly to support the VS Code extension). These are the major architecural changes:
* Move away from a paradigm of a global `l10n` command (with its own dependencies) that required a config that brought additional dependencies. That effectively forced Node to use 2 parallel search trees for node_modules causing potential version mismatches. It also required to spin out helpers as a separate module and a global object to make parallel modules communicate.
* Now the paradigm is that you start from your config, add all required dependencies, and if you need the `l10n` command you can install it as part of your config. This allows multiple versions to co-exist (one version per config) and there's a single dependency to `core` from every module.
* All l10nmonster files (config, node_modules, cache) should now be all contained in their own explicit directory rather than hiding them under .l10nmonster.
* Require Node 20 and remove support for CJS. This means that complex interrelated esbuild on multiple packages is no longer required.
* Introduce TypeScript declarations to provide better validation by eslint and autocompletion in VS Code.
* The main access point to l10n monster is now `L10nMonsterConfig`. From the config, you can `run()` a request session and execute either "actions" (equivalent to CLI commands, exposed through an `l10n` object) or have access to `MonsterManager` and its direct methods methods or convenience functions that take an instance of MonsterManager as a parameter.

### Jobstore refactor

* Multiple job stores can be configured but none of them are the source of truth anymore. Source of truth is the local DB and syncronization to and from job stores is optional and relegated to the new `l10n tm` command and `syncup/syncdown` actions.
* The job store interface is no longer public and it's now consumed only by the TM manager. Equivalent functionality is exposed through the TM manager (against the local DB) for commands to use.
* The old job store interface has changed to a streaming one so that job file sizes are not limited by memory anymore (e.g. tm exports can be quite large). This introduced a new "TM Store" interface.
* TM stores are no longer limited to storing "jobs" (i.e. unit of work that go in and out translation providers) but can aggregate multiple TU's that span multiple jobs.
