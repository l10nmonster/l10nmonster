/**
 * Central type definitions for @l10nmonster/core
 * This is the single source of truth for all shared interfaces and types.
 */

// ============ Primitive Types ============

/**
 * Represents a placeholder within a normalized string.
 */
export interface PlaceholderPart {
    /** The type of the placeholder (e.g., 'x' for generic, 'ph' for ICU). */
    t: string;
    /** The original value/code of the placeholder. */
    v: string;
    /** A simplified/normalized version of the placeholder for matching. */
    v1?: string;
    /** Sample/example content for the placeholder. */
    s?: string;
    /** Flag set by decoder to identify which decoder processed this part. */
    flag?: string;
}

/**
 * Represents a part of a normalized string - either plain text (string) or a placeholder object.
 */
export type Part = string | PlaceholderPart;

/**
 * A normalized string is an array of parts (text and placeholders).
 */
export type NormalizedString = Part[];

/**
 * Structured notes extracted from description annotations.
 */
export interface StructuredNotes {
    /** Clean description text. */
    desc?: string;
    /** Maximum width constraint. */
    maxWidth?: number;
    /** Screenshot reference. */
    screenshot?: string;
    /** Array of tags. */
    tags?: string[];
    /** Placeholder descriptions. */
    ph?: Record<string, { sample: string; desc?: string }>;
}

/**
 * Represents a translatable segment within a resource.
 */
export interface Segment {
    /** The segment ID (unique within the resource). */
    sid: string;
    /** The translatable string (raw, unnormalized). */
    str: string;
    /** Optional notes associated with the segment for translators. */
    notes?: string;
    /** If the segment is pluralized, this is the form of the plural. */
    pluralForm?: string;
    /** Opaque native ID of the segment in the original storage format. */
    nid?: string;
    /** Message format identifier (e.g., 'icu', 'mf2'). */
    mf?: string;
}

/**
 * A normalized segment with additional properties set by policies.
 */
export interface NormalizedSegment {
    /** Segment ID. */
    sid: string;
    /** Unique identifier for the segment (rid + sid + hash). */
    guid: string;
    /** Normalized string (array of parts). */
    nstr: NormalizedString;
    /** Notes for translators (raw string or structured). */
    notes?: string | StructuredNotes;
    /** Raw notes before processing. */
    rawNotes?: string;
    /** Plural form if applicable. */
    pluralForm?: string;
    /** Message format identifier (e.g., 'icu', 'mf2'). */
    mf?: string;
    /** Native ID in original format. */
    nid?: string;
    /** Flags set during normalization. */
    flags?: string[];
    /** Translation plan per target language. */
    plan?: Record<string, unknown>;
    /** Project identifier (inherited from resource). */
    prj?: string;
    /** Sequence number for compact GUID representation. */
    seq?: number;
}

/**
 * Represents resource metadata returned by source adapters.
 */
export interface ResourceHeader {
    /** Resource identifier (typically file path or unique key). */
    id: string;
    /** Source language code (e.g., 'en-US'). */
    sourceLang: string;
    /** Target language codes for this resource. */
    targetLangs?: string[];
    /** Project name for filtering and organization. */
    prj?: string;
    /** Override the default format handler for this resource. */
    resourceFormat?: string;
    /** Last modified timestamp. */
    modified?: string | number;
}

/**
 * Represents a handle to a localization resource.
 * Contains metadata and parsed content for a resource.
 */
export interface ResourceHandle {
    /** Resource identifier (typically file path or unique key). */
    id: string;
    /** Channel ID this resource belongs to. */
    channel: string;
    /** Last modified timestamp. */
    modified?: string | number;
    /** Format handler ID. */
    resourceFormat: string;
    /** Source language code. */
    sourceLang: string;
    /** Target language codes for this resource. */
    targetLangs: string[];
    /** Translation plan per target language. */
    plan?: TranslationPlan;
    /** Project name for filtering. */
    prj?: string;
    /** Raw resource content. */
    raw?: string;
    /** Parsed normalized segments. */
    segments?: NormalizedSegment[];
    /** Nested subresources. */
    subresources?: Subresource[];

    // Methods
    /** Loads segments and subresources from a normalized resource. */
    loadFromNormalizedResource(normalizedResource: { segments: NormalizedSegment[]; subresources?: Subresource[] }): ResourceHandle;
    /** Loads and normalizes a resource from raw content. */
    loadResourceFromRaw(rawResource: string, options: { isSource?: boolean }): Promise<ResourceHandle>;
    /** Generates translated raw resource content from the current segments and TM. */
    generateTranslatedRawResource(tm: TMInterface): Promise<string | null>;
    /** Applies translation policies to all segments. */
    applyPolicies(translationPolicyPipeline: TranslationPolicy[]): Promise<void>;
}

/**
 * Channel interface for managing localization resources.
 */
export interface Channel {
    /** Get information about this channel's configuration. */
    getInfo(): {
        id: string;
        source: string;
        target: string;
        formatHandlers: unknown[];
        defaultResourceFormat: string;
        translationPolicies: number;
    };
    /** Creates a ResourceHandle from a resource header. */
    makeResourceHandleFromHeader(resourceHeader: ResourceHeader): ResourceHandle;
    /** Fetches all resources from the source, normalizes them, and applies translation policies. */
    getAllNormalizedResources(options?: Record<string, unknown>): AsyncGenerator<ResourceHandle>;
    /** Fetches an existing translated resource. */
    getExistingTranslatedResource(resHandle: ResourceHandle, targetLang: string): Promise<ResourceHandle>;
    /** Commits a translated resource to the target. */
    commitTranslatedResource(targetLang: string, resourceId: string, rawResource: string | null): Promise<string>;
}

// ============ Configuration Types ============

/**
 * Configuration options that can be passed to adapters via setChannelOptions.
 */
export interface ChannelOptions {
    /** Base directory for relative paths. */
    baseDir?: string;
}

// ============ Plugin Interfaces ============

/**
 * Adapts content from a source system for localization processing.
 */
export interface SourceAdapter {
    /**
     * Fetches all resources as [header, rawContent] tuples.
     * @param options - Optional filtering/configuration options.
     * @returns AsyncGenerator yielding [ResourceHeader, string] tuples.
     */
    fetchAllResources(options?: object): AsyncGenerator<[ResourceHeader, string]>;

    /**
     * Optional method to receive channel configuration.
     * @param options - Channel configuration options.
     */
    setChannelOptions?(options: ChannelOptions): void;
}

/**
 * Adapts translated content back to the target system.
 */
export interface TargetAdapter {
    /**
     * Returns the target resource ID given target language and source resource ID.
     * @param targetLang - The target language code.
     * @param sourceResourceId - The source resource identifier.
     * @returns The target resource identifier.
     */
    translatedResourceId(targetLang: string, sourceResourceId: string): string;

    /**
     * Fetches existing translation given target language and resource ID.
     * @param targetLang - The target language code.
     * @param resourceId - The resource identifier.
     * @returns The translated content, or null if not found.
     */
    fetchTranslatedResource(targetLang: string, resourceId: string): Promise<string | null>;

    /**
     * Commits translated content to the target system.
     * @param targetLang - The target language code.
     * @param resourceId - The resource identifier.
     * @param rawContent - The translated raw content (null to delete).
     */
    commitTranslatedResource(targetLang: string, resourceId: string, rawContent: string | null): Promise<void>;

    /**
     * Optional method to receive channel configuration.
     * @param options - Channel configuration options.
     */
    setChannelOptions?(options: ChannelOptions): void;
}

/**
 * Metadata for a TM block within a TOC.
 */
export interface TMStoreBlock {
    /** Full path/name of the block file. */
    blockName: string;
    /** Last modified timestamp string. */
    modified: string;
    /** Array of [jobGuid, updatedAt] tuples for jobs in this block. */
    jobs: Array<[string, string]>;
}

/**
 * Table of contents for a TM store language pair.
 */
export interface TMStoreTOC {
    /** Version number. */
    v: number;
    /** Source language code. */
    sourceLang: string;
    /** Target language code. */
    targetLang: string;
    /** Map of block IDs to block metadata. */
    blocks: Record<string, TMStoreBlock>;
    /** Array of [blockId, fileName] tuples for blocks in storage. */
    storedBlocks: Array<[string, string]>;
}

/**
 * Job properties and TUs pair yielded by TM store operations.
 */
export interface JobPropsTusPair {
    /** Job properties (metadata). */
    jobProps: JobProps;
    /** Translation units in the job. */
    tus: TU[];
}

/**
 * Translation Memory store interface for persisting and querying translation units.
 */
export interface TMStore {
    /** The logical id of this store instance. */
    id: string;

    /** The store access permissions. */
    access: 'readwrite' | 'readonly' | 'writeonly';

    /** The partitioning strategy for TM blocks. */
    partitioning: 'job' | 'provider' | 'language';

    /**
     * Gets available language pairs in the store.
     * @returns Array of [sourceLang, targetLang] tuples.
     */
    getAvailableLangPairs?(): Promise<Array<[string, string]>>;

    /**
     * Gets the table of contents for a language pair.
     * @param sourceLang - Source language code.
     * @param targetLang - Target language code.
     * @returns TOC object with block metadata.
     */
    getTOC?(sourceLang: string, targetLang: string): Promise<TMStoreTOC>;

    /**
     * Gets TM blocks by their IDs.
     * @param sourceLang - Source language code.
     * @param targetLang - Target language code.
     * @param blockIds - Array of block IDs to retrieve.
     * @returns AsyncGenerator yielding job objects with TUs.
     */
    getTmBlocks?(sourceLang: string, targetLang: string, blockIds: string[]): AsyncGenerator<JobPropsTusPair>;

    /**
     * Gets a writer for committing TM data.
     * @param sourceLang - Source language code.
     * @param targetLang - Target language code.
     * @param cb - Callback function for writing blocks.
     */
    getWriter?(sourceLang: string, targetLang: string, cb: Function): Promise<void>;
}

/**
 * Snapshot store interface for persisting source content snapshots.
 */
export interface SnapStore {
    /** The logical id of this store instance. */
    id: string;

    /**
     * Gets the table of contents listing all snapshots.
     * @returns Object mapping channel IDs to arrays of timestamps.
     */
    getTOC?(): Promise<Record<string, number[]>>;

    /**
     * Generates rows from a snapshot.
     * @param ts - Snapshot timestamp.
     * @param channelId - Channel identifier.
     * @param table - Table name ('segments' or 'resources').
     * @returns AsyncGenerator yielding row objects.
     */
    generateRows?(ts: number, channelId: string, table: string): AsyncGenerator<Record<string, unknown>>;

    /**
     * Saves a snapshot from a row generator.
     * @param ts - Snapshot timestamp.
     * @param channelId - Channel identifier.
     * @param rowGenerator - AsyncGenerator providing rows to save.
     * @param table - Table name ('segments' or 'resources').
     * @returns Stats object with count of saved rows.
     */
    saveSnap?(ts: number, channelId: string, rowGenerator: AsyncGenerator<Record<string, unknown>>, table: string): Promise<{ count: number }>;
}

// ============ Resource Processing Interfaces ============

/**
 * Represents a subresource within a parent resource.
 * Subresources are nested resources that use a different format handler.
 */
export interface Subresource {
    /** Format handler identifier for this subresource. */
    resourceFormat: string;
    /** Raw content of the subresource. */
    raw: string;
    /** Resource identifier (added after generation). */
    id?: string;
    /** GUIDs of segments in this subresource (added after parsing). */
    guids?: string[];
}

/**
 * Resource filter function signature - parses raw content into segments.
 */
export interface ResourceFilter {
    /**
     * Parses raw resource content into segments.
     * @param params - Parse parameters including resource content.
     * @returns Object with segments array and optional subresources.
     */
    parseResource(params: {
        resource: string;
        isSource?: boolean;
        sourcePluralForms?: string[];
        targetPluralForms?: string[];
    }): Promise<{ segments: Segment[]; subresources?: Subresource[] }>;

    /**
     * Translates a resource using a translator function.
     * @param params - Translation parameters.
     * @returns Translated resource content.
     */
    translateResource?(params: {
        resource: string;
        translator: (sid: string, str: string) => Promise<string | undefined>;
        sourcePluralForms?: string[];
        targetPluralForms?: string[];
    }): Promise<string | undefined>;
}

/**
 * Parameters for resource generation.
 */
export interface GenerateResourceParams {
    /** Resource identifier. */
    id: string;
    /** Channel identifier. */
    channel?: string;
    /** Source language code. */
    sourceLang: string;
    /** Target language codes. */
    targetLangs?: string[];
    /** Project identifier. */
    prj?: string;
    /** Raw resource content. */
    raw?: string;
    /** Parsed segments. */
    segments?: NormalizedSegment[];
    /** Nested subresources. */
    subresources?: Subresource[];
    /** Format handler identifier. */
    resourceFormat?: string;
    /** Translation plan. */
    plan?: Record<string, number>;
    /** Translator function to get translations for segments (generator style). */
    translator: (seg: NormalizedSegment) => Promise<{ nstr: NormalizedString; str: string; tu: TU } | undefined>;
    /** Source plural forms. */
    sourcePluralForms?: string[];
    /** Target plural forms. */
    targetPluralForms?: string[];
}

/**
 * Resource generator function signature - generates translated content from segments.
 */
export interface ResourceGenerator {
    /**
     * Generates raw content from translated segments.
     * @param params - Generation parameters.
     * @returns Generated raw content.
     */
    generateResource(params: GenerateResourceParams): string | Promise<string | undefined>;
}

// ============ Job & Translation Types ============

/**
 * Job properties without translation units (base type for Job).
 * Used when passing job metadata separately from TUs.
 */
export interface JobProps {
    /** Unique job identifier. */
    jobGuid: string;
    /** Source language code. */
    sourceLang: string;
    /** Target language code. */
    targetLang: string;
    /** Job status. */
    status?: 'created' | 'pending' | 'done' | 'cancelled' | 'blocked';
    /** Human-readable status description. */
    statusDescription?: string;
    /** Provider ID that will handle this job. */
    translationProvider?: string;
    /** Estimated cost for translation. */
    estimatedCost?: number;
    /** Translation instructions for the provider. */
    instructions?: string;
    /** Translation group for routing to specific providers. */
    group?: string;
    /** Minimum quality required for TUs in this job. */
    minQ?: number;
    /** Name of the async task (for resumable jobs). */
    taskName?: string;
    /** Human-readable job name. */
    jobName?: string;
    /** ISO timestamp when job was created. */
    createdAt?: string;
    /** ISO timestamp when job was last updated. */
    updatedAt?: string;
}

/**
 * Translation Unit interface - represents a segment with its translation.
 * Can be a source-only TU, target-only TU, or a complete pair.
 */
export interface TU {
    /** Unique identifier for the TU (hash of rid+sid+source). */
    guid: string;
    /** Resource ID the TU belongs to. */
    rid?: string;
    /** Segment ID within the resource. */
    sid?: string;
    /** Normalized source string. */
    nsrc?: NormalizedString;
    /** Normalized target string (translation). */
    ntgt?: NormalizedString;
    /** Quality score of the translation (0-100). */
    q?: number;
    /** Timestamp when the translation was created (epoch ms). */
    ts?: number;
    /** Minimum quality required for this TU. */
    minQ?: number;
    /** Word count for the source text. */
    words?: number;
    /** Character count for the source text. */
    chars?: number;
    /** Project identifier. */
    prj?: string;
    /** Translation group for routing to specific providers. */
    group?: string;
    /** Plural form (one, other, zero, two, few, many). */
    pluralForm?: string;
    /** Opaque native ID in original storage format. */
    nid?: string;
    /** Sequence number to shorten GUID. */
    seq?: number;
    /** Whether the TU is currently in-flight (submitted, pending translation). */
    inflight?: boolean;
    /** Translation confidence score. */
    tconf?: number;
    /** Translation notes from provider. */
    tnotes?: string;
    /** Job GUID this TU was translated in. */
    jobGuid?: string;
    /** ID of the translation provider. */
    translationProvider?: string;
    /** Notes for translators (raw string or structured). */
    notes?: string | StructuredNotes;
    /** Translation cost (number or array for detailed token breakdown). */
    cost?: number | number[];
    /** QA data from quality checks. */
    qa?: Record<string, unknown>;
    /** Translation hash for detecting vendor-side fixes. */
    th?: string;
    /** Review data (reviewed words and errors found). */
    rev?: { reviewedWords?: number; errorsFound?: number };
    /** Job-specific properties (used for TM export/import). */
    jobProps?: JobProps;
    /** Channel ID (used by grandfather provider). */
    channel?: string;
}

/**
 * Represents a translation job containing work to be done by a provider.
 * Extends JobProps with translation units and in-flight tracking.
 */
export interface Job extends JobProps {
    /** Translation units in the job. */
    tus?: TU[];
    /** GUIDs of TUs that are in-flight. */
    inflight?: string[];
}

/**
 * Job request for creating new jobs - similar to Job but without required jobGuid.
 * Used when requesting job creation before a GUID is assigned.
 */
export interface JobRequest {
    /** Source language code. */
    sourceLang: string;
    /** Target language code. */
    targetLang: string;
    /** Translation units to process. */
    tus: (TU | NormalizedSegment)[];
    /** Optional job GUID (assigned by dispatcher). */
    jobGuid?: string;
    /** Translation instructions. */
    instructions?: string;
    /** Translation group. */
    group?: string;
}

/**
 * Translation plan mapping target languages to minimum quality requirements.
 * Key: target language code, Value: minimum quality score (0-100).
 */
export type TranslationPlan = Record<string, number>;

/**
 * Policy context passed to translation policy functions.
 */
export interface PolicyContext {
    /** Translation plan being built (maps target lang to requirements). */
    plan: TranslationPlan;
    /** The segment being processed. */
    seg: NormalizedSegment;
    /** The resource handle containing the segment. */
    res: ResourceHandle;
    /** Additional properties can be added by policies. */
    [key: string]: unknown;
}

/**
 * Translation policy function signature - processes segments to set translation requirements.
 * @param policyContext - Context containing plan, segment, and resource.
 * @returns Updated policy context (must return something, not undefined).
 */
export type TranslationPolicy = (policyContext: PolicyContext) => Partial<PolicyContext> | PolicyContext;

// ============ Normalizer Function Types ============

/**
 * Flags passed to encoder functions during normalization.
 */
export interface EncodeFlags {
    /** Source language code. */
    sourceLang?: string;
    /** Target language code. */
    targetLang?: string;
    /** Project identifier. */
    prj?: string;
    /** True if encoding the first part. */
    isFirst?: boolean;
    /** True if encoding the last part. */
    isLast?: boolean;
    /** Allow additional custom flags. */
    [key: string]: string | boolean | undefined;
}

/**
 * Decoder function signature - transforms parts array by decoding escaped/encoded content.
 * Used for escapesDecoder, phDecoder, etc.
 */
export type DecoderFunction = (parts: Part[]) => Part[];

/**
 * Text encoder function signature - transforms text for output.
 */
export type TextEncoderFunction = (text: string, flags?: EncodeFlags) => string;

/**
 * Code encoder function signature - transforms placeholders for output.
 * First encoder in chain receives PlaceholderPart, subsequent encoders receive string output from previous.
 */
export type CodeEncoderFunction = (part: PlaceholderPart | string, flags?: EncodeFlags) => string;

/**
 * Part transformer function signature - transforms parts array.
 * Used for spaceCollapser, etc.
 */
export type PartTransformer = (parts: Part[]) => Part[];

// ============ Translation Provider Interface ============

/**
 * Provider status property definition for UI/reporting.
 */
export interface ProviderStatusProperty {
    /** Actions that can trigger this status. */
    actions: string[];
    /** Human-readable description of this status. */
    description: string;
}

// ============ L10n Action Interface ============

/**
 * Help definition for an L10n action.
 */
export interface ActionHelp {
    /** Action description shown in help. */
    description: string;
    /** Short summary for list view. */
    summary?: string;
    /** Array of [flag, description, choices?] tuples for options. */
    options?: Array<[string, string, string[]?]>;
    /** Array of [flag, description] tuples for required options. */
    requiredOptions?: Array<[string, string]>;
    /** Array of [name, description, choices?] tuples for arguments. */
    arguments?: Array<[string, string, string[]?]>;
}

/**
 * L10n action interface - defines contract for all L10n Monster actions.
 * Actions are commands that operate on the MonsterManager.
 *
 * Actions are defined as plain objects. Use `@type {import('@l10nmonster/core').L10nAction}`
 * to type-check action definitions.
 *
 * @example
 * /** @type {import('@l10nmonster/core').L10nAction} *\/
 * export const myAction = {
 *     name: 'myaction',
 *     help: { description: 'Does something' },
 *     async action(mm, options) { ... }
 * };
 */
export interface L10nAction {
    /** Action name (command name). */
    name: string;
    /** Help configuration for this action. */
    help: ActionHelp;
    /** Sub-actions for grouped commands. */
    subActions?: L10nAction[];
    /**
     * Execute the action.
     * @param mm - MonsterManager instance.
     * @param options - Command options and arguments.
     * @returns Action result.
     */
    action?(mm: MonsterManager, options: Record<string, unknown>): Promise<unknown>;
}

/**
 * Type alias for action definitions (backwards compatibility).
 * @deprecated Use L10nAction directly with plain objects instead.
 */
export type L10nActionClass = L10nAction;

// ============ Translation Provider Interface ============

/**
 * Translation provider interface - defines contract for all translation providers.
 */
export interface TranslationProvider {
    /** Provider identifier (readonly). */
    readonly id: string;
    /** Quality score assigned to translations from this provider. */
    quality?: number;
    /** Status property definitions for UI/reporting. */
    statusProperties: Record<string, ProviderStatusProperty>;

    /**
     * Initialize provider with MonsterManager.
     * @param mm - MonsterManager instance.
     */
    init?(mm: MonsterManager): Promise<void>;

    /**
     * Create a job from a job request.
     * @param job - Job request to process.
     * @param options - Optional creation options.
     * @returns Created job with status and metadata.
     */
    create(job: JobRequest | Job, options?: { skipQualityCheck?: boolean; skipGroupCheck?: boolean }): Promise<Job>;

    /**
     * Start a created job (execute translation).
     * @param job - Job to start.
     * @returns Job with updated status and translations.
     */
    start(job: Job): Promise<Job>;

    /**
     * Continue a pending job (for async providers).
     * @param job - Job to continue.
     * @returns Job with updated status.
     */
    continue(job: Job): Promise<Job>;

    /**
     * Get provider information.
     * @returns Provider metadata and capabilities.
     */
    info(): Promise<{
        id: string;
        type: string;
        quality?: number;
        supportedPairs?: Record<string, string[]>;
        costPerWord?: number;
        costPerMChar?: number;
        description: string[];
    }>;
}

// ============ Translation Provider Status Types ============

/**
 * Status property for a job status.
 */
export interface StatusProperty {
    /** Available actions for this status (e.g., 'start', 'continue'). */
    actions: string[];
    /** Human-readable description of this status. */
    description: string;
}

/**
 * Map of job status names to their properties.
 */
export interface StatusProperties {
    created: StatusProperty;
    pending: StatusProperty;
    done: StatusProperty;
    cancelled: StatusProperty;
    [key: string]: StatusProperty;
}

// ============ Chunked Translation Provider Types ============

/**
 * XML representation of a translation unit for chunked providers.
 */
export interface XmlTu {
    /** Bundle/resource identifier. */
    bundle: string;
    /** Key/segment identifier. */
    key: string;
    /** Source text in XML format with placeholders. */
    source: string;
    /** Optional notes for translators. */
    notes?: string;
    /** Optional existing translation. */
    translation?: string;
}

/**
 * Base arguments for chunk translation.
 * Passed to prepareTranslateChunkArgs.
 */
export interface TranslateChunkArgs {
    /** Source language code (potentially mapped). */
    sourceLang: string;
    /** Target language code (potentially mapped). */
    targetLang: string;
    /** Translation units in XML format. */
    xmlTus: XmlTu[];
    /** Job GUID for tracking. */
    jobGuid: string;
    /** Optional translation instructions. */
    instructions?: string;
    /** Chunk number for logging. */
    chunkNumber: number;
}

/**
 * Provider-specific chunk arguments.
 * Returned by prepareTranslateChunkArgs, passed to startTranslateChunk.
 * Subclasses extend this with provider-specific properties.
 */
export interface ProviderTranslateChunkArgs extends TranslateChunkArgs {
    // Provider-specific properties added by subclasses
}

/**
 * Provider-specific raw response from translation API.
 * Returned by startTranslateChunk, passed to convertTranslationResponse.
 * Subclasses define the actual structure based on their API.
 */
export interface ProviderResponseChunk {
    // Provider-specific properties - intentionally empty base
}

/**
 * Normalized translation result from a chunk.
 * Returned by convertTranslationResponse.
 */
export interface TranslatedChunk {
    /** Target translation text. */
    tgt: string;
    /** Optional cost information (number or array for detailed token breakdown). */
    cost?: number | number[];
    /** TU index in the chunk (used by LLM provider). */
    tuIdx?: number;
    /** GUID of the TU (added during processing). */
    guid?: string;
    /** Normalized target string (added during processing). */
    ntgt?: NormalizedString;
}

/**
 * Metadata for a TU within a chunk, used to pair responses with requests.
 */
export interface ChunkTuMeta {
    /** GUID of the translation unit. */
    guid: string;
    /** Placeholder map for reconstructing normalized strings. */
    phMap?: Record<string, PlaceholderPart>;
}

/**
 * Result from startTranslateChunkOp.
 */
export interface TranslateChunkOpResult {
    /** Raw response from the provider (for debugging). */
    raw: ProviderResponseChunk;
    /** Normalized translation results. */
    res: Array<{ guid: string; ntgt: NormalizedString; cost?: number | number[] }>;
}

// ============ Analyzer Interface ============

/**
 * Analysis result structure returned by analyzers.
 */
export interface AnalysisResult {
    /** Column headers for the analysis output. */
    head: string[];
    /** Optional columns to group results by. */
    groupBy?: string[];
    /** Row data for the analysis. */
    body: unknown[][];
}

/**
 * Translation unit data passed to analyzers.
 * Contains the minimum required properties for analysis.
 */
export interface AnalyzerTU {
    /** Unique identifier for the translation unit. */
    guid: string;
    /** Normalized source string. */
    nsrc: NormalizedString;
    /** Normalized target string (translation). */
    ntgt: NormalizedString;
    /** Resource ID the TU belongs to. */
    rid?: string;
    /** String ID within the resource. */
    sid?: string;
}

/**
 * Analyzer interface - defines contract for content analyzers.
 * Analyzers process segments or translation units and produce analysis reports.
 */
export interface Analyzer {
    /**
     * Process a segment during analysis.
     * @param context - Segment context containing rid, prj, and seg.
     */
    processSegment?(context: { rid: string; prj: string; seg: NormalizedSegment }): void;

    /**
     * Process a translation unit during analysis.
     * @param context - TU context containing targetLang and tu.
     */
    processTU?(context: { targetLang: string; tu: AnalyzerTU }): void;

    /**
     * Get the analysis results.
     * @returns Analysis result with headers and data rows.
     */
    getAnalysis?(): AnalysisResult;

    /**
     * Get aggregate analysis results (for multi-language analyzers).
     * @returns Aggregate analysis result.
     */
    getAggregateAnalysis?(): AnalysisResult;
}

/**
 * Analyzer class constructor type with static properties.
 */
export interface AnalyzerClass {
    /** Static help description for the analyzer. */
    help?: string;
    /** Static help parameters for the analyzer. */
    helpParams?: string;
    /** Creates an instance of the analyzer. */
    new (...args: unknown[]): Analyzer;
    /** Prototype for checking method availability. */
    prototype: Analyzer;
}

// ============ MonsterManager Interface ============

/**
 * Resource Manager interface - manages source content and channels.
 * This is a forward declaration for the ResourceManager class.
 */
export interface ResourceManagerInterface {
    /** Array of active channel IDs. */
    readonly channelIds: string[];
    /** Array of snap store IDs. */
    readonly snapStoreIds: string[];
    /** Get desired language pairs for a channel. */
    getDesiredLangPairs(channelId: string): Promise<Array<[string, string]>>;
    /** Get desired target languages for a channel. */
    getDesiredTargetLangs(channelId: string, limitToLang?: string | string[]): Promise<string[]>;
    /** Get channel metadata. */
    getChannelMeta(channelId: string): Promise<ChannelTocRow | undefined>;
    /** Get a channel by ID. */
    getChannel(channelId: string): Channel;
    /** Get active content statistics for a channel. */
    getActiveContentStats(channelId: string): Promise<Array<{ prj: string; sourceLang: string; segmentCount: number; resCount: number; targetLangs: string[]; lastModified?: number }>>;
    /** Get all resources for a channel. */
    getAllResources(channelId: string, options?: Record<string, unknown>): AsyncGenerator<ResourceHandle>;
    /** Get a resource handle by ID. */
    getResourceHandle(channelId: string, rid: string, options?: { keepRaw?: boolean }): Promise<ResourceHandle | undefined>;
    /** Get snap store TOC. */
    getSnapStoreTOC(snapStoreId: string): Promise<Record<string, number[]>>;
    /** Create a snapshot of a channel. */
    snap(channelId: string): Promise<{ resources: number; segments: number }>;
    /** Import from a snapshot. */
    import(ts: number, channelId: string, snapStoreId: string): Promise<void>;
    /** Export content from channels to a snap store. */
    export(channelId: string, snapStoreId: string): Promise<{ ts?: number; resources?: { count: number }; segments?: { count: number } }>;
}

/**
 * TM Manager interface - manages translation memory.
 * This is a forward declaration for the TMManager class.
 */
export interface TMManagerInterface {
    /** Array of TM store IDs. */
    readonly tmStoreIds: string[];
    /** Get a TM instance for a language pair. */
    getTM(sourceLang: string, targetLang: string): TMInterface;
    /** Get a TM store by ID. */
    getTmStore(id: string): TMStore | undefined;
    /** Get TM store TOCs. */
    getTmStoreTOCs(tmStore: TMStore, parallelism?: number): Promise<Array<[string, string, TMStoreTOC]>>;
    /** Get available language pairs from the TM. */
    getAvailableLangPairs(): Promise<Array<[string, string]>>;
    /** Get TM statistics. */
    getStats(): Promise<Array<{ sourceLang: string; targetLang: string; tuCount: number; jobCount: number }>>;
    /** Get job TOC by language pair. */
    getJobTOCByLangPair(sourceLang: string | null, targetLang: string | null): Promise<Array<{ jobGuid: string; status: string; translationProvider: string; updatedAt: string }>>;
    /** Get a job by GUID. */
    getJob(jobGuid: string): Promise<JobProps | undefined>;
    /** Delete a job. */
    deleteJob(jobGuid: string): Promise<void>;
    /** Sync down from a TM store. */
    syncDown(tmStore: TMStore, options: Record<string, unknown>): Promise<Array<{ sourceLang: string; targetLang: string; blocksToStore: string[]; jobsToDelete: string[] }>>;
    /** Sync up to a TM store. */
    syncUp(tmStore: TMStore, options: Record<string, unknown>): Promise<Array<{ sourceLang: string; targetLang: string; blocksToUpdate: [string, string[]][]; jobsToUpdate: string[] }>>;
}

/**
 * TM interface - translation memory operations for a language pair.
 * This is a forward declaration for the TM class.
 */
export interface TMInterface {
    /** Source language code. */
    readonly sourceLang: string;
    /** Target language code. */
    readonly targetLang: string;
    /** Get TU entries by GUIDs. */
    getEntries(guids: string[]): Promise<Record<string, TU>>;
    /** Get exact matches for a normalized source string. */
    getExactMatches(nsrc: NormalizedString): Promise<TU[]>;
    /** Get translation status for translated content in a channel. */
    getTranslatedContentStatus(channelId: string): Promise<Record<string, Array<{ minQ: number; q: number; seg: number; words: number; chars: number }>>>;
    /** Get translation status for untranslated content in a channel. */
    getUntranslatedContentStatus(channelId: string): Promise<Record<string, Record<string, Array<{ seg: number; words: number; chars: number }>>>>;
    /** Get untranslated content for a channel. */
    getUntranslatedContent(channelId: string, options?: { limit?: number; prj?: string | string[] }): Promise<NormalizedSegment[]>;
    /** Query source content with filters. */
    querySource(channelId: string, whereCondition: string): Promise<NormalizedSegment[]>;
    /** Search TUs with filtering and pagination. */
    search(offset: number, limit: number, params?: TuSearchParams): Promise<TU[]>;
    /** Get TM statistics. */
    getStats(): Promise<Array<{ translationProvider: string; status: string; tuCount: number; distinctGuids: number; jobCount: number }>>;
    /** Get quality distribution. */
    getQualityDistribution(): Promise<Array<{ q: number; count: number }>>;
    /** Get TU keys over a certain rank. */
    tuKeysOverRank(maxRank: number): Promise<Array<[string, string]>>;
    /** Get TU keys by quality. */
    tuKeysByQuality(quality: number): Promise<Array<[string, string]>>;
    /** Delete TUs by their keys. */
    deleteTuKeys(tuKeys: Array<[string, string]>): Promise<{ deletedTusCount: number; touchedJobsCount: number }>;
    /** Delete empty jobs. */
    deleteEmptyJobs(dryrun?: boolean): Promise<number>;
}

/**
 * Dispatcher interface - manages translation providers.
 * This is a forward declaration for the Dispatcher class.
 */
export interface DispatcherInterface {
    /** Array of registered providers. */
    readonly providers: TranslationProvider[];
    /** Get provider by ID. */
    getProvider(providerId: string): TranslationProvider | undefined;
    /** Get all providers. */
    getProviders(): TranslationProvider[];
    /** Create jobs from a job request. */
    createJobs(job: JobRequest, options?: Record<string, unknown>): Promise<Job[]>;
    /** Start created jobs. */
    startJobs(jobs: Job[], options?: Record<string, unknown>): Promise<Array<{ sourceLang: string; targetLang: string; jobGuid: string; translationProvider: string; status: string; statusDescription?: string }>>;
    /** Update a pending job. */
    updateJob(jobGuid: string): Promise<Job | undefined>;
}

/**
 * MonsterManager interface - the main entry point for L10n Monster operations.
 * Plugins and actions receive this interface to interact with the system.
 */
export interface MonsterManager {
    /** Resource manager for source content operations. */
    readonly rm: ResourceManagerInterface;
    /** Translation memory manager. */
    readonly tmm: TMManagerInterface;
    /** Translation provider dispatcher. */
    readonly dispatcher: DispatcherInterface;
    /** Whether to save failed jobs. */
    saveFailedJobs: boolean;
    /** Registered action handlers. */
    readonly l10n: Record<string, (opts?: Record<string, unknown>) => Promise<unknown>>;
    /** Registered analyzers. */
    readonly analyzers: Record<string, AnalyzerClass>;
    /** Currency formatter for cost display. */
    readonly currencyFormatter: Intl.NumberFormat;

    /**
     * Initialize the MonsterManager.
     */
    init(): Promise<void>;

    /**
     * Schedule a function to be called during shutdown.
     * @param func - Async cleanup function.
     */
    scheduleForShutdown(func: () => Promise<void>): void;

    /**
     * Run an analyzer on source content or translation memory.
     * @param analyzer - Analyzer name or class.
     * @param params - Parameters for the analyzer.
     * @param limitToLang - Optional language to limit analysis.
     * @returns Analysis results.
     */
    analyze(analyzer: string | Analyzer, params?: string[], limitToLang?: string): Promise<AnalysisResult>;

    /**
     * Get translation status for channels.
     * @param channels - Channel ID(s) or undefined for all.
     * @returns Translation status by channel/source/target/project.
     */
    getTranslationStatus(channels?: string | string[]): Promise<Record<string, Record<string, Record<string, Record<string, unknown>>>>>;

    /**
     * Shutdown the MonsterManager and run cleanup functions.
     */
    shutdown(): Promise<void>;
}

// ============ Operations Store Interface ============

/**
 * Serialized representation of an operation.
 */
export interface SerializedOp {
    /** Operation name. */
    opName: string;
    /** Operation ID. */
    opId: number;
    /** Operation arguments. */
    args: Record<string, unknown>;
    /** IDs of input dependencies. */
    inputOpIds: (number | undefined)[];
    /** Operation state ('pending', 'done', 'error', or custom). */
    state: string;
    /** Operation output. */
    output: unknown;
    /** Last execution timestamp (ISO string). */
    lastRanAt?: string;
}

/**
 * Operations store interface - defines contract for storing operation logs.
 */
export interface OpsStoreInterface {
    /**
     * Save operations for a task.
     * @param taskName - Name/ID of the task.
     * @param opList - List of serialized operations to save.
     */
    saveOps(taskName: string, opList: SerializedOp[]): Promise<void>;

    /**
     * Get operations for a task.
     * @param taskName - Name/ID of the task.
     * @returns Async generator of serialized operation objects.
     */
    getTask(taskName: string): AsyncGenerator<SerializedOp>;
}

// ============ Segment Decorator Interface ============

/**
 * Segment decorator function signature.
 * Decorators transform segments during processing.
 */
export type SegmentDecorator = (seg: Segment) => Segment | undefined;

/**
 * Segment decorator factory interface.
 * Factories create decorator functions and may require initialization.
 */
export interface SegmentDecoratorFactory {
    /**
     * Initialize the factory with MonsterManager.
     * @param mm - MonsterManager instance.
     */
    init?(mm: MonsterManager): Promise<void>;

    /**
     * Get the decorator function.
     * @returns Segment decorator function.
     */
    getDecorator(): SegmentDecorator;
}

// ============ File Store Delegate Interface ============

/**
 * File store delegate interface for TM and snap stores.
 * Provides file operations for external storage backends.
 */
export interface FileStoreDelegate {
    /**
     * Ensures the base directory exists.
     * @returns The created directory path or undefined.
     */
    ensureBaseDirExists(): Promise<string | undefined>;

    /**
     * Lists all files in the store.
     * @returns Array of [filename, metadata] tuples.
     */
    listAllFiles(): Promise<Array<[string, string]>>;

    /**
     * Gets a readable stream for a file.
     * @param filename - File path.
     * @returns Readable stream (may be sync or async depending on implementation).
     */
    getStream(filename: string): NodeJS.ReadableStream | Promise<NodeJS.ReadableStream>;

    /**
     * Gets file contents as string.
     * @param filename - File path.
     * @returns File contents.
     */
    getFile(filename: string): Promise<string>;

    /**
     * Saves string contents to a file.
     * @param filename - File path or path segments.
     * @param contents - File contents.
     * @returns Modified timestamp or path.
     */
    saveFile(filename: string | string[], contents: string): Promise<string>;

    /**
     * Saves a stream to a file.
     * @param filename - File path or path segments.
     * @param readable - Readable stream.
     * @param deleteEmptyFiles - Whether to delete if stream is empty.
     * @returns Modified timestamp, path, or null if deleted.
     */
    saveStream(filename: string | string[], readable: NodeJS.ReadableStream, deleteEmptyFiles?: boolean): Promise<string | null>;

    /**
     * Deletes multiple files.
     * @param filenames - Array of file paths to delete.
     */
    deleteFiles(filenames: string[]): Promise<void>;

    /**
     * String representation of the delegate.
     */
    toString(): string;
}

// ============ Data Access Layer Interface ============

/**
 * Channel metadata for saveChannel operations.
 */
export interface ChannelMeta {
    /** Timestamp for the snapshot. */
    ts: number;
    /** Optional external snap store ID. */
    snapStoreId?: string;
    /** Optional store identifier (derived from snapStoreId in implementation). */
    store?: string;
}

/**
 * Channel table of contents row returned by getChannelMeta.
 */
export interface ChannelTocRow {
    /** Channel identifier. */
    channel: string;
    /** Store identifier. */
    store?: string;
    /** Timestamp of the snapshot. */
    ts?: number;
    /** Number of resources in the channel. */
    resources?: number;
    /** Number of segments in the channel. */
    segments?: number;
}

/**
 * Search parameters for TU DAL search method.
 * All string parameters support SQL LIKE patterns unless noted.
 */
export interface TuSearchParams {
    /** Filter by GUID (supports SQL LIKE patterns). */
    guid?: string;
    /** Filter by NID (supports SQL LIKE patterns). */
    nid?: string;
    /** Filter by job GUID (supports SQL LIKE patterns). */
    jobGuid?: string;
    /** Filter by resource ID (supports SQL LIKE patterns). */
    rid?: string;
    /** Filter by segment ID (supports SQL LIKE patterns). */
    sid?: string;
    /** Filter by channel(s) - array for multi-select (exact match). */
    channel?: string[];
    /** Filter by source text (supports SQL LIKE patterns). */
    nsrc?: string;
    /** Filter by target text (supports SQL LIKE patterns). */
    ntgt?: string;
    /** Filter by notes (supports SQL LIKE patterns). */
    notes?: string;
    /** Filter by translation confidence(s) - array of string representations of integers. */
    tconf?: string[];
    /** Maximum rank to include (1 = only active/best translations). Default: 10. */
    maxRank?: number;
    /** If true, only return TUs with translator notes. */
    onlyTNotes?: boolean;
    /** Filter by quality score(s) - array of string representations of integers. */
    q?: string[];
    /** Minimum timestamp (milliseconds since epoch). */
    minTS?: number;
    /** Maximum timestamp (milliseconds since epoch). */
    maxTS?: number;
    /** Filter by provider(s) - array for multi-select (exact match). */
    translationProvider?: string[];
    /** Filter by TM store(s) - array for multi-select. Use '__null__' for NULL values. */
    tmStore?: string[];
    /** Filter by group(s) - array for multi-select. 'Unknown' and 'Unassigned' are special values. */
    group?: string[];
    /** If true, includes channel and group columns (requires CTE join). */
    includeTechnicalColumns?: boolean;
    /** If true, only return TUs that exist in active segment tables (have a channel). */
    onlyLeveraged?: boolean;
}

// ============ Channel DAL Interface ============

/**
 * Channel Data Access Layer interface.
 * Provides access to channel resources and segments.
 */
export interface ChannelDAL {
    /** Channel identifier. */
    readonly channelId: string;
    /** Name of the resources table for this channel. */
    readonly resourcesTable: string;
    /** Name of the segments table for this channel. */
    readonly segmentsTable: string;

    /**
     * Get channel metadata from the table of contents.
     * @returns Channel metadata or undefined if not found.
     */
    getChannelMeta(): Promise<ChannelTocRow | undefined>;

    /**
     * Save channel data by building temporary tables and atomically swapping them.
     * @param meta - Channel metadata including timestamp and optional snap store ID.
     * @param cb - Callback function that receives save handlers.
     * @returns Statistics about saved resources and segments.
     */
    saveChannel(
        meta: ChannelMeta,
        cb: (handlers: { saveResource: Function; insertResourceRow: Function; insertSegmentRow: Function }) => Promise<void>
    ): Promise<{ resources: number; segments: number }>;

    /**
     * Get a resource by ID.
     * @param rid - Resource identifier.
     * @param options - Optional query options.
     * @returns Resource object or undefined.
     */
    getResource(rid: string, options?: { keepRaw?: boolean }): Promise<ResourceHandle | undefined>;

    /**
     * Get all desired language pairs from channel segments.
     * @returns Array of [sourceLang, targetLang] tuples.
     */
    getDesiredLangPairs(): Promise<Array<[string, string]>>;

    /**
     * Get active content statistics for this channel.
     * @returns Statistics object with segment counts by source language.
     */
    getActiveContentStats(): Promise<Array<{ prj: string; sourceLang: string; targetLangs: string; segmentCount: number; resCount: number; lastModified: string }>>;

    /**
     * Get project table of contents with pagination.
     * @param prj - Project identifier.
     * @param offset - Pagination offset.
     * @param limit - Maximum results.
     * @returns Array of resource TOC entries.
     */
    getProjectTOC(prj: string, offset: number, limit: number): Promise<Array<{ sourceLang: string; rid: string; modifiedAt: string; segmentCount: number }>>;

    /**
     * Iterate over all resources in the channel.
     * @param options - Options for fetching resources.
     * @returns AsyncGenerator yielding normalized resource objects with segments.
     */
    getAllResources(options?: { keepRaw?: boolean; prj?: string | string[] }): AsyncGenerator<ResourceHandle & { segments: NormalizedSegment[] }>;

    /**
     * Get resource row iterator for export.
     * @returns AsyncGenerator yielding raw resource rows.
     */
    getResourceRowIterator(): AsyncGenerator<Record<string, unknown>>;

    /**
     * Get segment row iterator for export.
     * @returns AsyncGenerator yielding raw segment rows.
     */
    getSegmentRowIterator(): AsyncGenerator<Record<string, unknown>>;
}

// ============ TU DAL Interface ============

/**
 * Translation Unit Data Access Layer interface.
 * Provides access to translation memory entries for a language pair.
 */
export interface TuDAL {
    /**
     * Get TU entries by their GUIDs.
     * @param guids - Array of GUIDs to look up.
     * @returns Map of GUID to TU entry.
     */
    getEntries(guids: string[]): Promise<Record<string, TU>>;

    /**
     * Get all TU entries for a job.
     * @param jobGuid - Job GUID.
     * @returns Array of TU entries.
     */
    getEntriesByJobGuid(jobGuid: string): Promise<TU[]>;

    /**
     * Save a job with its translation units.
     * @param jobProps - Job properties.
     * @param tus - Array of translation units.
     * @param tmStoreId - Optional TM store ID.
     */
    saveJob(jobProps: JobProps, tus: TU[], tmStoreId?: string): Promise<void>;

    /**
     * Delete a job and its TUs.
     * @param jobGuid - Job GUID to delete.
     */
    deleteJob(jobGuid: string): Promise<void>;

    /**
     * Get exact matches for a normalized source string.
     * @param nsrc - Normalized source string.
     * @returns Array of matching TU candidates.
     */
    getExactMatches(nsrc: NormalizedString): Promise<TU[]>;

    /**
     * Delete empty jobs (jobs with no TUs).
     * @param dryrun - If true, only report what would be deleted.
     * @returns Count of deleted jobs.
     */
    deleteEmptyJobs(dryrun?: boolean): Promise<number>;

    /**
     * Get TU keys (guid, jobGuid) for TUs over a certain rank.
     * @param maxRank - Maximum rank threshold.
     * @returns Array of TU keys.
     */
    tuKeysOverRank(maxRank: number): Promise<Array<[string, string]>>;

    /**
     * Get TU keys for TUs at a specific quality level.
     * @param quality - Quality score to match.
     * @returns Array of TU keys.
     */
    tuKeysByQuality(quality: number): Promise<Array<[string, string]>>;

    /**
     * Delete TUs by their keys.
     * @param tuKeys - Array of TU keys to delete.
     */
    deleteTuKeys(tuKeys: Array<[string, string]>): Promise<{ deletedTusCount: number; touchedJobsCount: number }>;

    /**
     * Get statistics for this language pair's TM.
     * @returns Statistics object.
     */
    getStats(): Promise<{ tuCount: number; jobCount: number; minQ: number; maxQ: number; minTs: number; maxTs: number }>;

    /**
     * Get translated content status for a channel.
     * @param channelDAL - Channel DAL instance.
     * @returns Status by project and source language.
     */
    getTranslatedContentStatus(channelDAL: ChannelDAL): Promise<Array<{ prj: string; minQ: number; q: number; res: number; seg: number; words: number; chars: number }>>;

    /**
     * Get untranslated content status for a channel.
     * @param channelDAL - Channel DAL instance.
     * @returns Status by project and source language.
     */
    getUntranslatedContentStatus(channelDAL: ChannelDAL): Promise<Array<{ prj: string; group: string; minQ: number; seg: number; words: number; chars: number }>>;

    /**
     * Get untranslated content for a channel.
     * @param channelDAL - Channel DAL instance.
     * @param options - Query options.
     * @returns Array of untranslated segments.
     */
    getUntranslatedContent(channelDAL: ChannelDAL, options?: { limit?: number; prj?: string | string[] }): Promise<NormalizedSegment[]>;

    /**
     * Query source content with a WHERE condition.
     * @param channelDAL - Channel DAL instance.
     * @param whereCondition - SQL WHERE condition.
     * @returns Array of matching segments.
     */
    querySource(channelDAL: ChannelDAL, whereCondition: string): Promise<NormalizedSegment[]>;

    /**
     * Query TUs by their GUIDs with optional channel context.
     * @param guids - Array of GUIDs to query.
     * @param channelDAL - Optional channel DAL for context.
     * @returns Array of TU entries.
     */
    queryByGuids(guids: string[], channelDAL?: ChannelDAL): Promise<TU[]>;

    /**
     * Search TUs with filtering and pagination.
     * @param offset - Pagination offset.
     * @param limit - Maximum results.
     * @param params - Search filter parameters.
     * @returns Array of matching TUs.
     */
    search(offset: number, limit: number, params: TuSearchParams): Promise<TU[]>;

    /**
     * Look up TUs by exact conditions.
     * @param conditions - Lookup conditions.
     * @returns Array of matching TUs.
     */
    lookup(conditions: { guid?: string; nid?: string; rid?: string; sid?: string }): Promise<TU[]>;

    /**
     * Get available values for low-cardinality filter columns.
     * @returns Object with arrays of available values per column.
     */
    getLowCardinalityColumns(): Promise<Record<string, string[]>>;

    /**
     * Get quality score distribution.
     * @returns Array of quality levels with counts.
     */
    getQualityDistribution(): Promise<Array<{ q: number; count: number }>>;
}

// ============ Job DAL Interface ============

/**
 * Job Data Access Layer interface.
 * Provides access to job metadata.
 */
export interface JobDAL {
    /**
     * Get all available language pairs that have jobs.
     * @returns Array of [sourceLang, targetLang] tuples.
     */
    getAvailableLangPairs(): Promise<Array<[string, string]>>;

    /**
     * Get job statistics grouped by language pair and TM store.
     * @returns Array of statistics objects.
     */
    getStats(): Promise<Array<{ sourceLang: string; targetLang: string; tmStore: string; jobCount: number; lastUpdatedAt: string }>>;

    /**
     * Get job table of contents for a language pair.
     * @param sourceLang - Source language code (null for all).
     * @param targetLang - Target language code (null for all).
     * @returns Array of job TOC entries.
     */
    getJobTOCByLangPair(sourceLang: string | null, targetLang: string | null): Promise<Array<{ jobGuid: string; status: string; translationProvider: string; updatedAt: string }>>;

    /**
     * Set the TM store for a job.
     * @param jobGuid - Job GUID.
     * @param tmStoreId - TM store identifier.
     */
    setJobTmStore(jobGuid: string, tmStoreId: string): Promise<void>;

    /**
     * Get a job by its GUID.
     * @param jobGuid - Job GUID.
     * @returns Job object or undefined.
     */
    getJob(jobGuid: string): Promise<JobProps | undefined>;

    /**
     * Get total job count.
     * @returns Number of jobs.
     */
    getJobCount(): Promise<number>;

    /**
     * Get job deltas between local DB and remote TOC.
     * @param sourceLang - Source language code.
     * @param targetLang - Target language code.
     * @param toc - Remote table of contents.
     * @param storeId - TM store ID.
     * @returns Array of delta entries.
     */
    getJobDeltas(sourceLang: string, targetLang: string, toc: TMStoreTOC, storeId: string): Promise<Array<{
        tmStore: string;
        blockId: string;
        localJobGuid: string | null;
        remoteJobGuid: string | null;
        localUpdatedAt: string | null;
        remoteUpdatedAt: string | null;
    }>>;

    /**
     * Get valid job IDs for a block.
     * @param sourceLang - Source language code.
     * @param targetLang - Target language code.
     * @param toc - Table of contents.
     * @param blockId - Block identifier.
     * @param storeId - TM store ID.
     * @returns Array of job GUIDs.
     */
    getValidJobIds(sourceLang: string, targetLang: string, toc: TMStoreTOC, blockId: string, storeId: string): Promise<string[]>;
}

// ============ DAL Manager Interface ============

/**
 * Data Access Layer manager interface.
 * Provides access to channel, TU, and job DALs.
 */
export interface DALManager {
    /** Active channel IDs. */
    activeChannels: Set<string>;

    /**
     * Initialize the DAL manager.
     * @param mm - MonsterManager instance.
     */
    init(mm: MonsterManager): Promise<void>;

    /**
     * Get a channel DAL by ID.
     * @param channelId - Channel identifier.
     * @returns Channel DAL instance.
     */
    channel(channelId: string): ChannelDAL;

    /**
     * Get a TU DAL for a language pair.
     * @param sourceLang - Source language code.
     * @param targetLang - Target language code.
     * @returns TU DAL instance.
     */
    tu(sourceLang: string, targetLang: string): TuDAL;

    /**
     * Get the job DAL.
     */
    readonly job: JobDAL;

    /**
     * Shutdown the DAL manager.
     */
    shutdown(): Promise<void>;
}
