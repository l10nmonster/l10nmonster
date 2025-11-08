import { z } from 'zod';
import { McpTool } from './BaseMcpTool.js';

/**
 * MCP tool for assembling a health snapshot of the localization system.
 * 
 * This tool chains together functionality from monster, source_list (status mode),
 * and ops_jobs to provide a comprehensive overview including:
 * - Cache warming
 * - Channel statistics
 * - Provider availability
 * - Pending job counts
 * - Translation memory coverage
 * - Overall readiness assessment
 * 
 * Supports optional filtering by:
 * - channel: Filter to specific channel ID
 * - provider: Filter to specific translation provider
 * - sourceLang: Filter to specific source language
 * - targetLang: Filter to specific target language
 * 
 * Ideal for daily check-ins or CI gates that need a yes/no answer on localization readiness.
 */

/**
 * Get channel statistics and warm caches.
 * @param {*} mm MonsterManager instance
 * @param {Object} filters Filter object with optional channel property
 * @returns {Promise<{channelStats: Object, channelIds: string[]}>}
 */
async function getChannelStats(mm, filters) {
    const channelIds = filters.channel ?
        mm.rm.channelIds.filter(id => id === filters.channel) :
        mm.rm.channelIds;
    
    if (filters.channel && channelIds.length === 0) {
        throw new Error(`Channel '${filters.channel}' not found`);
    }
    
    // Warm caches by calling methods that trigger initialization
    const channelStats = {};
    for (const channelId of channelIds) {
        // This call warms the cache
        channelStats[channelId] = await mm.rm.getActiveContentStats(channelId);
    }
    
    return { channelStats, channelIds };
}

/**
 * Get desired language pairs from channels.
 * @param {*} mm MonsterManager instance
 * @param {string[]} channelIds List of channel IDs to process
 * @param {Object} filters Filter object with optional sourceLang and targetLang properties
 * @returns {Promise<{desiredPairs: Object}>}
 */
async function getDesiredLangPairs(mm, channelIds, filters) {
    const desiredPairs = {};
    const allLangPairs = new Set();
    
    for (const channelId of channelIds) {
        const channelLangPairs = await mm.rm.getDesiredLangPairs(channelId);
        for (const [sourceLang, targetLang] of channelLangPairs) {
            // Apply language filters
            if (filters.sourceLang && sourceLang !== filters.sourceLang) continue;
            if (filters.targetLang && targetLang !== filters.targetLang) continue;
            
            const pairKey = `${sourceLang},${targetLang}`;
            if (!allLangPairs.has(pairKey)) {
                allLangPairs.add(pairKey);
                desiredPairs[sourceLang] ??= [];
                desiredPairs[sourceLang].push(targetLang);
            }
        }
    }
    
    return { desiredPairs };
}

/**
 * Get available translation providers with their status.
 * @param {*} mm MonsterManager instance
 * @param {Object} filters Filter object with optional provider property
 * @returns {Promise<Array>} List of provider objects
 */
async function getAvailableProviders(mm, filters) {
    const providers = [];
    
    for (const provider of mm.dispatcher.providers) {
        // Apply provider filter
        if (filters.provider && provider.id !== filters.provider) continue;
        
        try {
            const info = await provider.info();
            providers.push({
                id: info.id,
                type: info.type,
                quality: info.quality ?? 'dynamic',
                costPerWord: info.costPerWord ?? 0,
                costPerMChar: info.costPerMChar ?? 0,
                supportedPairs: info.supportedPairs ?? 'any',
                available: true
            });
        } catch (error) {
            providers.push({
                id: provider.id,
                available: false,
                error: error.message
            });
        }
    }
    
    if (filters.provider && providers.length === 0) {
        throw new Error(`Provider '${filters.provider}' not found`);
    }
    
    return providers;
}

/**
 * Get translation memory statistics for available language pairs.
 * @param {*} mm MonsterManager instance
 * @param {Object} filters Filter object with optional provider, sourceLang, and targetLang properties
 * @returns {Promise<{tmStats: Object, availableLangPairs: Array, withTMBySource: Object}>}
 */
async function getTranslationMemoryStats(mm, filters) {
    const tmStats = {};
    const allAvailableLangPairs = await mm.tmm.getAvailableLangPairs();
    
    // Filter language pairs
    const availableLangPairs = allAvailableLangPairs.filter(([sourceLang, targetLang]) => {
        if (filters.sourceLang && sourceLang !== filters.sourceLang) return false;
        if (filters.targetLang && targetLang !== filters.targetLang) return false;
        return true;
    }).sort();
    
    // Group withTM pairs by source language
    const withTMBySource = {};
    for (const [sourceLang, targetLang] of availableLangPairs) {
        withTMBySource[sourceLang] ??= [];
        withTMBySource[sourceLang].push(targetLang);
        
        const tm = mm.tmm.getTM(sourceLang, targetLang);
        const stats = await tm.getStats();
        const pairKey = `${sourceLang}→${targetLang}`;
        
        // Apply provider filter to TM stats
        const filteredStats = filters.provider ?
            stats.filter(s => s.translationProvider === filters.provider) :
            stats;
        
        tmStats[pairKey] = filteredStats.map(s => ({
            translationProvider: s.translationProvider,
            status: s.status,
            jobCount: s.jobCount,
            tuCount: s.tuCount,
            distinctGuids: s.distinctGuids,
            redundancy: s.distinctGuids > 0 ? (s.tuCount / s.distinctGuids - 1) : 0
        }));
    }
    
    return { tmStats, availableLangPairs, withTMBySource };
}

/**
 * Get translation status filtered by channel and language.
 * @param {*} mm MonsterManager instance
 * @param {Object} filters Filter object with optional channel, sourceLang, and targetLang properties
 * @returns {Promise<{translationStatus: Object}>}
 */
async function getTranslationStatus(mm, filters) {
    // Structure: channelId -> sourceLang -> targetLang -> prj -> { details, pairSummary, pairSummaryByStatus }
    const translationStatusRaw = await mm.getTranslationStatus();
    
    // Transform to sourceLang -> targetLang -> channelId -> prj structure for easier processing
    // Apply filters during transformation
    const translationStatus = {};
    for (const [channelId, channelData] of Object.entries(translationStatusRaw)) {
        // Apply channel filter
        if (filters.channel && channelId !== filters.channel) continue;
        
        for (const [sourceLang, sourceData] of Object.entries(channelData)) {
            // Apply source language filter
            if (filters.sourceLang && sourceLang !== filters.sourceLang) continue;
            
            translationStatus[sourceLang] ??= {};
            for (const [targetLang, targetData] of Object.entries(sourceData)) {
                // Apply target language filter
                if (filters.targetLang && targetLang !== filters.targetLang) continue;
                
                translationStatus[sourceLang][targetLang] ??= {};
                translationStatus[sourceLang][targetLang][channelId] = targetData;
            }
        }
    }
    
    return { translationStatus };
}

/**
 * Compute coverage metrics from translation status.
 * @param {Object} translationStatus Filtered translation status structure
 * @returns {Object} Coverage metrics including overall and by-pair breakdowns
 */
function computeCoverage(translationStatus) {
    let totalSegments = 0;
    let translatedSegments = 0;
    let untranslatedSegments = 0;
    let inFlightSegments = 0;
    let lowQualitySegments = 0;
    
    const coverageByPair = {};
    
    for (const [sourceLang, sourceStatus] of Object.entries(translationStatus)) {
        for (const [targetLang, channelStatus] of Object.entries(sourceStatus)) {
            let pairSegments = 0;
            let pairTranslated = 0;
            let pairUntranslated = 0;
            let pairInFlight = 0;
            let pairLowQuality = 0;
            
            for (const projectStatus of Object.values(channelStatus)) {
                for (const { pairSummary, pairSummaryByStatus } of Object.values(projectStatus)) {
                    pairSegments += pairSummary.segs;
                    pairTranslated += pairSummaryByStatus.translated || 0;
                    pairUntranslated += pairSummaryByStatus.untranslated || 0;
                    pairInFlight += pairSummaryByStatus['in flight'] || 0;
                    pairLowQuality += pairSummaryByStatus['low quality'] || 0;
                }
            }
            
            totalSegments += pairSegments;
            translatedSegments += pairTranslated;
            untranslatedSegments += pairUntranslated;
            inFlightSegments += pairInFlight;
            lowQualitySegments += pairLowQuality;
            
            const coverage = pairSegments > 0 ? pairTranslated / pairSegments : 0;
            const pairKey = `${sourceLang}→${targetLang}`;
            coverageByPair[pairKey] = {
                total: pairSegments,
                translated: pairTranslated,
                untranslated: pairUntranslated,
                inFlight: pairInFlight,
                lowQuality: pairLowQuality,
                coverage
            };
        }
    }
    
    const overallCoverage = totalSegments > 0 ? translatedSegments / totalSegments : 0;
    
    return {
        overall: {
            total: totalSegments,
            translated: translatedSegments,
            untranslated: untranslatedSegments,
            inFlight: inFlightSegments,
            lowQuality: lowQualitySegments,
            coverage: overallCoverage
        },
        byPair: coverageByPair,
        overallCoverage
    };
}

/**
 * Get job summaries including pending and recent jobs.
 * @param {*} mm MonsterManager instance
 * @param {Object} filters Filter object with optional provider property
 * @param {Array} availableLangPairs List of [sourceLang, targetLang] pairs
 * @returns {Promise<{pendingJobs: Array, recentJobs: Array, jobCountsByPair: Object}>}
 */
async function getJobSummaries(mm, filters, availableLangPairs) {
    const pendingJobs = [];
    const recentJobs = [];
    const jobCountsByPair = {};
    
    for (const [sourceLang, targetLang] of availableLangPairs) {
        const allJobs = await mm.tmm.getJobTOCByLangPair(sourceLang, targetLang);
        
        // Apply provider filter to jobs
        const filteredJobs = filters.provider ?
            allJobs.filter(job => job.translationProvider === filters.provider) :
            allJobs;
        
        const unfinished = filteredJobs.filter(job => job.status !== 'done');
        const recent = filteredJobs
            .filter(job => {
                const updatedAt = new Date(job.updatedAt);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return updatedAt >= weekAgo;
            })
            .slice(0, 10);
        
        const pairKey = `${sourceLang}→${targetLang}`;
        jobCountsByPair[pairKey] = {
            total: filteredJobs.length,
            unfinished: unfinished.length,
            recent: recent.length
        };
        
        if (unfinished.length > 0) {
            pendingJobs.push(...unfinished.map(job => ({
                pair: pairKey,
                jobGuid: job.jobGuid,
                status: job.status,
                translationProvider: job.translationProvider,
                updatedAt: job.updatedAt
            })));
        }
        
        if (recent.length > 0) {
            recentJobs.push(...recent.map(job => ({
                pair: pairKey,
                jobGuid: job.jobGuid,
                status: job.status,
                translationProvider: job.translationProvider,
                updatedAt: job.updatedAt
            })));
        }
    }
    
    return { pendingJobs, recentJobs, jobCountsByPair };
}

/**
 * Evaluate system readiness based on providers, coverage, channels, and jobs.
 * @param {Object} params Parameters object
 * @param {Array} params.providers List of provider objects
 * @param {Object} params.coverage Coverage metrics object
 * @param {Object} params.channelStats Channel statistics object
 * @param {Array} params.pendingJobs List of pending job objects
 * @returns {Object} Readiness assessment with isReady flag and issues list
 */
function evaluateReadiness({ providers, coverage, channelStats, pendingJobs }) {
    const readinessIssues = [];
    
    if (providers.length === 0) {
        readinessIssues.push('No translation providers configured');
    } else {
        const unavailableProviders = providers.filter(p => !p.available);
        if (unavailableProviders.length > 0) {
            readinessIssues.push(`${unavailableProviders.length} provider(s) unavailable: ${unavailableProviders.map(p => p.id).join(', ')}`);
        }
    }
    
    if (coverage.overallCoverage < 1.0) {
        readinessIssues.push(`Translation coverage (${(coverage.overallCoverage * 100).toFixed(1)}%) below threshold (100%)`);
    }
    
    if (pendingJobs.length > 0) {
        readinessIssues.push(`${pendingJobs.length} unfinished job(s) pending`);
    }
    
    if (Object.keys(channelStats).length === 0) {
        readinessIssues.push('No channels configured');
    } else {
        const emptyChannels = Object.entries(channelStats)
            .filter(([, stats]) => stats.length === 0)
            .map(([channelId]) => channelId);
        if (emptyChannels.length > 0) {
            readinessIssues.push(`Empty channels: ${emptyChannels.join(', ')}`);
        }
    }
    
    const isReady = readinessIssues.length === 0;
    
    return { isReady, issues: readinessIssues };
}

/**
 * Build the final response object.
 * @param {Object} params Parameters object
 * @param {number} params.startTime Start timestamp
 * @param {Object} params.filters Filter object
 * @param {Object} params.readiness Readiness assessment
 * @param {Object} params.channelStats Channel statistics
 * @param {Object} params.desiredPairs Desired language pairs by source language
 * @param {Object} params.withTMBySource Language pairs with TM by source language
 * @param {Array} params.providers List of providers
 * @param {Object} params.tmStats Translation memory statistics
 * @param {Object} params.coverage Coverage metrics
 * @param {Object} params.jobSummaries Job summaries
 * @param {Object} params.translationStatusRaw Raw translation status
 * @param {boolean} params.withDetails Whether to include detailed information
 * @param {*} params.mm MonsterManager instance
 * @returns {Object} Complete response object
 */
function buildResponse({ startTime, filters, readiness, channelStats, desiredPairs, withTMBySource, providers, tmStats, coverage, jobSummaries, withDetails, mm }) {
    const initializationTime = Date.now() - startTime;
    
    const result = {
        timestamp: new Date().toISOString(),
        initializationTimeMs: initializationTime,
        filters: {
            channel: filters.channel,
            provider: filters.provider,
            sourceLang: filters.sourceLang,
            targetLang: filters.targetLang
        },
        readiness: {
            isReady: readiness.isReady,
            issues: readiness.issues,
            overallCoverage: coverage.overallCoverage,
            minThreshold: filters.minReadinessThreshold
        },
        channels: {
            count: Object.keys(channelStats).length,
            autoSnap: mm.rm.autoSnap,
            stats: Object.entries(channelStats).map(([channelId, stats]) => ({
                channelId,
                projects: stats.map(s => ({
                    project: s.prj ?? 'default',
                    sourceLang: s.sourceLang,
                    targetLangs: s.targetLangs || [],
                    segmentCount: s.segmentCount,
                    resourceCount: s.resCount,
                    lastModified: s.lastModified
                }))
            }))
        },
        languagePairs: {
            desired: Object.fromEntries(Object.entries(desiredPairs).map(([sourceLang, targetLangs]) => [
                sourceLang, 
                targetLangs.join(', ')
            ])),
            withTM: Object.fromEntries(Object.entries(withTMBySource).map(([sourceLang, targetLangs]) => [
                sourceLang,
                targetLangs.join(', ')
            ]))
        },
        providers: {
            count: providers.length,
            available: providers.filter(p => p.available).length,
            list: providers
        },
        translationMemory: {
            languagePairs: Object.keys(tmStats).length,
            stats: tmStats
        },
        coverage: {
            overall: coverage.overall,
            byPair: coverage.byPair
        },
        jobs: {
            pending: {
                count: jobSummaries.pendingJobs.length,
                jobs: withDetails ? jobSummaries.pendingJobs : "available in detailed information"
            },
            recent: {
                count: jobSummaries.recentJobs.length,
                jobs: withDetails ? jobSummaries.recentJobs : "available in detailed information"
            },
            byPair: jobSummaries.jobCountsByPair
        }
    };
    
    
    return result;
}

export class TranslationOverviewTool extends McpTool {
    static metadata = {
        name: 'translation_overview',
        description: `
        Assemble a health snapshot of the translation system.
        Provides a list of supported language pairs, translation provider availability, 
        translation memory coverage, and translation channel status.
        `,
        inputSchema: z.object({
            includeDetailed: z.boolean()
                .default(false)
                .describe('Whether to include detailed breakdowns in the response'),
            channel: z.string()
                .optional()
                .describe('Optional channel ID to filter results'),
            provider: z.string()
                .optional()
                .describe('Optional provider ID to filter results'),
            sourceLang: z.string()
                .optional()
                .describe('Optional source language to filter results'),
            targetLang: z.string()
                .optional()
                .describe('Optional target language to filter results'),
        })
    };

    // Warms Monster caches, reports channel stats, provider availability, pending job counts,
    // and TM coverage. Provides a yes/no answer on localization readiness.
    // This tool internally chains monster, source_list (status mode), and ops_jobs functionality.
    // @param {*} mm MonsterManager instance
    // @param {*} args Validated arguments from Zod schema
    // @returns {Promise<Object>} Health snapshot object
    static async execute(mm, args) {
        const startTime = Date.now();
        const filters = {
            channel: args.channel,
            provider: args.provider,
            sourceLang: args.sourceLang,
            targetLang: args.targetLang,
            minReadinessThreshold: args.minReadinessThreshold
        };
        const withDetails = args.includeDetailed ?? false;
        
        // Gather all data using helper functions
        const { channelStats, channelIds } = await getChannelStats(mm, filters);
        const { desiredPairs } = await getDesiredLangPairs(mm, channelIds, filters);
        const providers = await getAvailableProviders(mm, filters);
        const { tmStats, availableLangPairs, withTMBySource } = await getTranslationMemoryStats(mm, filters);
        const { translationStatus } = await getTranslationStatus(mm, filters);
        const coverage = computeCoverage(translationStatus);
        const jobSummaries = await getJobSummaries(mm, filters, availableLangPairs);
        
        // Evaluate readiness
        const readiness = evaluateReadiness({
            providers,
            coverage,
            channelStats,
            pendingJobs: jobSummaries.pendingJobs
        });
        
        // Build and return response
        return buildResponse({
            startTime,
            filters,
            readiness,
            channelStats,
            desiredPairs,
            withTMBySource,
            providers,
            tmStats,
            coverage,
            jobSummaries,
            withDetails,
            mm
        });
    }
}

