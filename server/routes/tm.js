export function setupTmRoutes(router, mm) {
    router.get('/tm/stats', async (req, res) => {
        const tmInfo = {};
        const availableLangPairs = (await mm.tmm.getAvailableLangPairs()).sort();
        for (const [sourceLang, targetLang] of availableLangPairs) {
            const tm = mm.tmm.getTM(sourceLang, targetLang);
            tmInfo[sourceLang] ??= {};
            tmInfo[sourceLang][targetLang] = tm.getStats();
        }
        res.json(tmInfo);
    });
}
