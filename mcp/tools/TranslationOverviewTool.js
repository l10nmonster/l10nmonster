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
 * Ideal for daily check-ins or CI gates that need a yes/no answer on localization readiness.
 */
export class TranslationOverviewTool extends McpTool {
    static metadata = {
        name: 'translation_overview',
        description: `Assemble a health snapshot of the localization system. 
        
Warms Monster caches, reports channel stats, provider availability, pending job counts, 
and TM coverage. Provides a yes/no answer on localization readiness.

This tool internally chains monster, source_list (status mode), and ops_jobs functionality.`,
        inputSchema: z.object({
            includeDetailed: z.boolean()
                .optional()
                .default(false)
                .describe('Whether to include detailed breakdowns in the response'),
            minReadinessThreshold: z.number()
                .optional()
                .default(0.8)
                .describe('Minimum translation coverage threshold (0-1) for readiness assessment')
        })
    };

    static async execute(mm, args) {
        const startTime = Date.now();
        
        // Warm caches by calling methods that trigger initialization
        // This mirrors what the monster action does
        const channelStats = {};
        const channelCapabilities = {};
        for (const channelId of Object.keys(mm.rm.channels)) {
            // This call warms the cache
            channelStats[channelId] = await mm.rm.getActiveContentStats(channelId);
            channelCapabilities[channelId] = mm.capabilitiesByChannel[channelId];
        }

        // Get desired language pairs (warms cache)
        const desiredPairs = {};
        const langPairs = await mm.rm.getAvailableLangPairs();
        for (const [sourceLang, targetLang] of langPairs) {
            desiredPairs[sourceLang] ??= [];
            desiredPairs[sourceLang].push(targetLang);
        }

        // Get provider availability
        const providers = [];
        for (const provider of mm.dispatcher.providers) {
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

        // Get TM stats (warms cache)
        const tmStats = [];
        const availableLangPairs = (await mm.tmm.getAvailableLangPairs()).sort();
        for (const [sourceLang, targetLang] of availableLangPairs) {
            const tm = mm.tmm.getTM(sourceLang, targetLang);
            const stats = tm.getStats();
            tmStats.push({
                sourceLang,
                targetLang,
                stats: stats.map(s => ({
                    translationProvider: s.translationProvider,
                    status: s.status,
                    jobCount: s.jobCount,
                    tuCount: s.tuCount,
                    distinctGuids: s.distinctGuids,
                    redundancy: s.distinctGuids > 0 ? (s.tuCount / s.distinctGuids - 1) : 0
                }))
            });
        }

        // Get translation status (source_list status mode)
        const translationStatus = await mm.getTranslationStatus();
        
        // Calculate coverage metrics
        let totalSegments = 0;
        let translatedSegments = 0;
        let untranslatedSegments = 0;
        let inFlightSegments = 0;
        let lowQualitySegments = 0;
        
        const coverageByPair = [];
        
        for (const [sourceLang, sourceStatus] of Object.entries(translationStatus)) {
            for (const [targetLang, channelStatus] of Object.entries(sourceStatus)) {
                let pairSegments = 0;
                let pairTranslated = 0;
                let pairUntranslated = 0;
                let pairInFlight = 0;
                let pairLowQuality = 0;
                
                for (const [channelId, projectStatus] of Object.entries(channelStatus)) {
                    for (const [prj, { pairSummary, pairSummaryByStatus }] of Object.entries(projectStatus)) {
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
                coverageByPair.push({
                    sourceLang,
                    targetLang,
                    totalSegments: pairSegments,
                    translated: pairTranslated,
                    untranslated: pairUntranslated,
                    inFlight: pairInFlight,
                    lowQuality: pairLowQuality,
                    coverage
                });
            }
        }

        const overallCoverage = totalSegments > 0 ? translatedSegments / totalSegments : 0;

        // Get pending job counts (ops_jobs functionality)
        const pendingJobs = [];
        const recentJobs = [];
        const jobCountsByPair = [];
        
        for (const [sourceLang, targetLang] of availableLangPairs) {
            const allJobs = await mm.tmm.getJobTOCByLangPair(sourceLang, targetLang);
            const unfinished = allJobs.filter(job => job.status !== 'done');
            const recent = allJobs
                .filter(job => {
                    const updatedAt = new Date(job.updatedAt);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return updatedAt >= weekAgo;
                })
                .slice(0, 10);
            
            jobCountsByPair.push({
                sourceLang,
                targetLang,
                total: allJobs.length,
                unfinished: unfinished.length,
                recent: recent.length
            });
            
            if (unfinished.length > 0) {
                pendingJobs.push(...unfinished.map(job => ({
                    sourceLang,
                    targetLang,
                    jobGuid: job.jobGuid,
                    status: job.status,
                    translationProvider: job.translationProvider,
                    updatedAt: job.updatedAt
                })));
            }
            
            if (recent.length > 0) {
                recentJobs.push(...recent.map(job => ({
                    sourceLang,
                    targetLang,
                    jobGuid: job.jobGuid,
                    status: job.status,
                    translationProvider: job.translationProvider,
                    updatedAt: job.updatedAt
                })));
            }
        }

        // Assess readiness
        const readinessIssues = [];
        
        if (providers.length === 0) {
            readinessIssues.push('No translation providers configured');
        } else {
            const unavailableProviders = providers.filter(p => !p.available);
            if (unavailableProviders.length > 0) {
                readinessIssues.push(`${unavailableProviders.length} provider(s) unavailable: ${unavailableProviders.map(p => p.id).join(', ')}`);
            }
        }
        
        if (overallCoverage < args.minReadinessThreshold) {
            readinessIssues.push(`Translation coverage (${(overallCoverage * 100).toFixed(1)}%) below threshold (${(args.minReadinessThreshold * 100).toFixed(0)}%)`);
        }
        
        if (pendingJobs.length > 0) {
            readinessIssues.push(`${pendingJobs.length} unfinished job(s) pending`);
        }
        
        if (Object.keys(channelStats).length === 0) {
            readinessIssues.push('No channels configured');
        } else {
            const emptyChannels = Object.entries(channelStats)
                .filter(([_, stats]) => stats.length === 0)
                .map(([channelId]) => channelId);
            if (emptyChannels.length > 0) {
                readinessIssues.push(`Empty channels: ${emptyChannels.join(', ')}`);
            }
        }

        const isReady = readinessIssues.length === 0;
        const initializationTime = Date.now() - startTime;

        // Build response
        const result = {
            timestamp: new Date().toISOString(),
            initializationTimeMs: initializationTime,
            readiness: {
                isReady,
                issues: readinessIssues,
                overallCoverage,
                minThreshold: args.minReadinessThreshold
            },
            channels: {
                count: Object.keys(channelStats).length,
                autoSnap: mm.rm.autoSnap,
                stats: Object.entries(channelStats).map(([channelId, stats]) => ({
                    channelId,
                    capabilities: Object.entries(channelCapabilities[channelId])
                        .filter(([_, available]) => available)
                        .map(([cmd]) => cmd),
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
                desired: Object.entries(desiredPairs).map(([sourceLang, targetLangs]) => ({
                    sourceLang,
                    targetLangs
                })),
                withTM: availableLangPairs.map(([sourceLang, targetLang]) => ({
                    sourceLang,
                    targetLang
                }))
            },
            providers: {
                count: providers.length,
                available: providers.filter(p => p.available).length,
                list: providers
            },
            translationMemory: {
                languagePairs: tmStats.length,
                stats: tmStats
            },
            coverage: {
                overall: {
                    totalSegments,
                    translated: translatedSegments,
                    untranslated: untranslatedSegments,
                    inFlight: inFlightSegments,
                    lowQuality: lowQualitySegments,
                    coverage: overallCoverage
                },
                byPair: coverageByPair
            },
            jobs: {
                pending: {
                    count: pendingJobs.length,
                    jobs: args.includeDetailed ? pendingJobs : undefined
                },
                recent: {
                    count: recentJobs.length,
                    jobs: args.includeDetailed ? recentJobs : undefined
                },
                byPair: jobCountsByPair
            }
        };

        // Add detailed status if requested
        if (args.includeDetailed) {
            result.detailedStatus = translationStatus;
        }

        return result;
    }
}

