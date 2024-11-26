export async function snapCmd(mm, { maxSegments } = {}) {
    if (mm.rm.snapStore) {
        maxSegments ??= 1000;
        let resourceCount = 0;
        l10nmonster.logger.info(`Starting snapshot of all resources chunking at max ${maxSegments} segments...`);
        await mm.rm.snapStore.startSnapshot();
        const chunkNumber = {};
        let accumulatedSegments = 0;
        let accumulatedPrj;
        let accumulatedResources = {};
        for await (const res of mm.rm.getAllResources({ ignoreSnapStore: true })) {
            const currentPrj = res.prj ?? 'default';
            chunkNumber[currentPrj] ??= 0;
            if (accumulatedPrj !== currentPrj || accumulatedSegments >= maxSegments) {
                if (Object.keys(accumulatedResources).length > 0) {
                    await mm.rm.snapStore.commitResources(accumulatedPrj, chunkNumber[accumulatedPrj], accumulatedResources);
                    l10nmonster.logger.verbose(`Committed chunk ${chunkNumber[accumulatedPrj]} of project ${accumulatedPrj}`);
                    chunkNumber[accumulatedPrj]++;
                    accumulatedResources = {};
                    accumulatedSegments = 0;
                }
                accumulatedPrj = currentPrj;
            }
            accumulatedResources[res.id] = res;
            accumulatedSegments += res.segments.length;
            resourceCount++;
        }
        if (Object.keys(accumulatedResources).length > 0) {
            await mm.rm.snapStore.commitResources(accumulatedPrj, chunkNumber[accumulatedPrj], accumulatedResources);
            l10nmonster.logger.verbose(`Committed chunk ${chunkNumber[accumulatedPrj]} of project ${accumulatedPrj}`);
        }
        await mm.rm.snapStore.endSnapshot();
        l10nmonster.logger.info(`End of snapshot of ${resourceCount} resources in ${Object.keys(chunkNumber).length} projects`);
        return resourceCount;
    } else {
        throw `Snap store not configured`;
    }
}
