export async function snapCmd(mm, { maxSegments } = {}) {
    if (mm.rm.snapStore) {
        maxSegments ??= 1000;
        let resourceCount = 0;
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
        }
        await mm.rm.snapStore.endSnapshot();
        return resourceCount;
    } else {
        throw `Snap store not configured`;
    }
}
