import { logInfo, logVerbose, logWarn } from '@l10nmonster/core';

/** @typedef {import('@l10nmonster/core').MonsterManager} MonsterManager */

/**
 * Creates LQABoss route handlers for the server extension mechanism.
 * @param {MonsterManager} mm - MonsterManager instance.
 * @returns {Array<[string, string, Function]>} Route definitions.
 */
export function createLQABossRoutes(mm) {
    return [
        ['post', '/lookup', async (req, res) => {
            logInfo`LQABossRoute:/lookup`;
            try {
                const { sourceLang, targetLang, segments } = req.body;
                const tm = mm.tmm.getTM(sourceLang, targetLang);
                const guids = new Set(segments.map(segment => segment.g));
                let tus = [];
                if (guids.size > 0) {
                    tus = await tm.queryByGuids(Array.from(guids));
                }
                const guidMap = new Map(tus.map(tu => [ tu.guid, tu ]));
                const results = segments.map(segment => guidMap.get(segment.g) ?? {});
                logVerbose`Matched ${tus.length} segments out of ${guids.size}`;
                res.json({ results });
            } catch (error) {
                logWarn`Error in LQABossRoute:/lookup: ${error.message}`;
                res.status(500).json({
                    error: 'Failed to lookup translation memory',
                    message: error.message
                });
            }
        }]
    ]
}
