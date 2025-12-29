// Core Interfaces - imported from single source of truth
/**
 * @typedef {import('./src/interfaces.js').Segment} Segment
 * @typedef {import('./src/interfaces.js').Part} Part
 * @typedef {import('./src/interfaces.js').PlaceholderPart} PlaceholderPart
 * @typedef {import('./src/interfaces.js').NormalizedString} NormalizedString
 * @typedef {import('./src/interfaces.js').StructuredNotes} StructuredNotes
 * @typedef {import('./src/interfaces.js').ResourceHeader} ResourceHeader
 * @typedef {import('./src/interfaces.js').ChannelOptions} ChannelOptions
 * @typedef {import('./src/interfaces.js').SourceAdapter} SourceAdapter
 * @typedef {import('./src/interfaces.js').TargetAdapter} TargetAdapter
 * @typedef {import('./src/interfaces.js').TMStore} TMStore
 * @typedef {import('./src/interfaces.js').TMStoreTOC} TMStoreTOC
 * @typedef {import('./src/interfaces.js').TMStoreBlock} TMStoreBlock
 * @typedef {import('./src/interfaces.js').JobPropsTusPair} JobPropsTusPair
 * @typedef {import('./src/interfaces.js').SnapStore} SnapStore
 * @typedef {import('./src/interfaces.js').JobProps} JobProps
 * @typedef {import('./src/interfaces.js').Job} Job
 * @typedef {import('./src/interfaces.js').TranslationPolicy} TranslationPolicy
 * @typedef {import('./src/interfaces.js').ResourceFilter} ResourceFilter
 * @typedef {import('./src/interfaces.js').ResourceGenerator} ResourceGenerator
 * @typedef {import('./src/interfaces.js').GenerateResourceParams} GenerateResourceParams
 * @typedef {import('./src/interfaces.js').Subresource} Subresource
 * @typedef {import('./src/interfaces.js').EncodeFlags} EncodeFlags
 * @typedef {import('./src/interfaces.js').DecoderFunction} DecoderFunction
 * @typedef {import('./src/interfaces.js').TextEncoderFunction} TextEncoderFunction
 * @typedef {import('./src/interfaces.js').CodeEncoderFunction} CodeEncoderFunction
 * @typedef {import('./src/interfaces.js').PartTransformer} PartTransformer
 * @typedef {import('./src/interfaces.js').TranslationProvider} TranslationProvider
 * @typedef {import('./src/interfaces.js').StatusProperty} StatusProperty
 * @typedef {import('./src/interfaces.js').StatusProperties} StatusProperties
 * @typedef {import('./src/interfaces.js').XmlTu} XmlTu
 * @typedef {import('./src/interfaces.js').TranslateChunkArgs} TranslateChunkArgs
 * @typedef {import('./src/interfaces.js').ProviderTranslateChunkArgs} ProviderTranslateChunkArgs
 * @typedef {import('./src/interfaces.js').ProviderResponseChunk} ProviderResponseChunk
 * @typedef {import('./src/interfaces.js').TranslatedChunk} TranslatedChunk
 * @typedef {import('./src/interfaces.js').ChunkTuMeta} ChunkTuMeta
 * @typedef {import('./src/interfaces.js').TranslateChunkOpResult} TranslateChunkOpResult
 * @typedef {import('./src/interfaces.js').ActionHelp} ActionHelp
 * @typedef {import('./src/interfaces.js').L10nAction} L10nAction
 * @typedef {import('./src/interfaces.js').L10nActionClass} L10nActionClass
 * @typedef {import('./src/interfaces.js').AnalysisResult} AnalysisResult
 * @typedef {import('./src/interfaces.js').Analyzer} Analyzer
 * @typedef {import('./src/interfaces.js').AnalyzerTU} AnalyzerTU
 * @typedef {import('./src/interfaces.js').OpsStoreInterface} OpsStoreInterface
 * @typedef {import('./src/interfaces.js').SegmentDecorator} SegmentDecorator
 * @typedef {import('./src/interfaces.js').SegmentDecoratorFactory} SegmentDecoratorFactory
 * @typedef {import('./src/interfaces.js').NormalizedSegment} NormalizedSegment
 * @typedef {import('./src/interfaces.js').FileStoreDelegate} FileStoreDelegate
 * @typedef {import('./src/interfaces.js').DALManager} DALManager
 * @typedef {import('./src/interfaces.js').TranslationPlan} TranslationPlan
 * @typedef {import('./src/interfaces.js').PolicyContext} PolicyContext
 */

/**
 * @typedef {import('./src/entities/channel.js').Channel} Channel
 */

/**
 * @typedef {import('./src/entities/formatHandler.js').FormatHandler} FormatHandler
 */

/**
 * @typedef {import('./src/entities/normalizer.js').Normalizer} Normalizer
 */

/**
 * @typedef {import('./src/entities/resourceHandle.js').ResourceHandle} ResourceHandle
 */

export { consoleLog, logError, logWarn, logInfo, logVerbose, styleString, setVerbosity, getVerbosity, setRegressionMode, getRegressionMode, setBaseDir, getBaseDir } from './src/l10nContext.js';
export { TU } from './src/entities/tu.js';
export { L10nMonsterConfig, ChannelConfig, ResourceFormatConfig, MessageFormatConfig, config } from './src/l10nMonsterConfig.js';
export { MonsterManager } from './src/monsterManager/index.js';
export { default as SQLiteDALManager } from './src/DAL/index.js';
export * as opsManager from './src/opsManager/index.js';

export * from './src/helpers/index.js';
export * as actions from './src/actions/index.js';

export { requiredSourcePluralForms, requiredTargetPluralForms } from './src/requiredPluralForms.js';

// Version exports - generated from package.json by scripts/generate-version.js
export { l10nMonsterPackage, l10nMonsterVersion, l10nMonsterDescription } from './src/version.js';
// Legacy alias for backwards compatibility
export { l10nMonsterVersion as coreVersion } from './src/version.js';
